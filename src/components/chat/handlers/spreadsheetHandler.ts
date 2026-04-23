/**
 * Spreadsheet workflow handler — thin adapter between ChatBar and the orchestrator.
 *
 * Calls runSpreadsheetWorkflow() to get a typed result, then applies that result
 * to the React store via callbacks. No business logic here.
 */

import type { ProjectDocument, WorkbookMeta } from '@/types/project';
import type { GenerationStatus } from '@/types';
import { logContextMetrics } from '@/services/ai/debug';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { getCompressionBudget } from '@/services/context/compressionBudget';
import { commitVersion } from '@/services/storage/versionHistory';
import { runSpreadsheetWorkflow } from '@/services/ai/workflow/spreadsheet';
import { summarizeSpreadsheetAugmentationImpact } from '@/services/ai/workflow/agents/spreadsheet-augmenter';
import { useProjectStore } from '@/stores/projectStore';
import { createDefaultSheet } from '@/services/spreadsheet/workbook';
import type { RunRequest } from '@/services/runs/types';
import type { RunResult } from '@/services/contracts/runResult';
import { resolveTargets } from '@/services/editing/resolveTargets';
import { validateArtifactAgainstProfile } from '@/services/validation';
import { summarizeValidationResult } from '@/services/validation/profiles';
import { deriveLifecycleFromValidation } from '@/services/lifecycle/state';

function isDefaultSheet(doc: ProjectDocument | null): boolean {
  const sheet = doc?.workbook?.sheets[doc.workbook?.activeSheetIndex ?? 0];
  if (!sheet) return false;
  return (
    sheet.name === 'Sheet 1' &&
    sheet.schema.length === 3 &&
    sheet.schema.map((c) => c.name).join(',') === 'A,B,C' &&
    sheet.formulas.length === 0 &&
    !sheet.sortState &&
    !sheet.filterState
  );
}

export interface SpreadsheetHandlerContext {
  runRequest: RunRequest;
  // Store mutations
  addDocument: (doc: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;
  setStatus: (s: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
}

export async function handleSpreadsheetWorkflow(ctx: SpreadsheetHandlerContext): Promise<RunResult> {
  const {
    runRequest,
    addDocument, updateDocument, setStatus, setStreamingContent,
  } = ctx;
  const { context, activeArtifacts, intent, runId } = runRequest;
  const prompt = context.conversation.prompt;
  const promptWithContext = context.conversation.promptWithContext;
  const activeDocument = activeArtifacts.activeDocument;
  const configWarnings = runRequest.projectRulesSnapshot.diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnostic.message,
  }));
  const contextWarnings = [
    ...(context.compaction.compactedSourceIds.length > 0
      ? [{
          code: 'context-compacted',
          message: `Context compaction summarized ${context.compaction.compactedSourceIds.length} source(s) before generation.`,
        }]
      : []),
    ...((context.compaction.afterTokens > getCompressionBudget())
      && context.sources.some((source) => source.kind === 'memory' && source.pinned)
      ? [{
          code: 'pinned-context-over-budget',
          message: 'Pinned memory exceeded the target context budget and was kept in the run.',
        }]
      : []),
  ];
  const resolvedTargets = activeDocument?.type === 'spreadsheet'
    ? resolveTargets({
        prompt,
        intent,
        activeDocument,
      })
    : [];
  const editing = intent.operation === 'action'
    ? {
        strategyUsed: intent.editStrategyHint ?? 'sheet-action',
        fallbackUsed: false,
        targetSummary: (resolvedTargets.length > 0
          ? resolvedTargets.map((target) => target.label)
          : intent.targetSelectors.map((selector) => selector.label ?? selector.type)),
        dryRunFailures: [],
      }
    : undefined;

  const activeWorkbook = activeDocument?.type === 'spreadsheet' ? activeDocument.workbook ?? null : null;
  const docIsDefaultSheet = isDefaultSheet(activeDocument);

  logContextMetrics('spreadsheet-handler', context.metrics);

  setStatus({ state: 'generating', startedAt: Date.now(), step: 'Working on spreadsheet…', pct: 20 });
  setStreamingContent('');

  const buildValidationState = (documentId?: string) => {
    const persistedDocument = documentId
      ? useProjectStore.getState().project.documents.find((document) => document.id === documentId)
      : undefined;
    const artifactValidation = persistedDocument
      ? validateArtifactAgainstProfile(persistedDocument)
      : undefined;
    if (persistedDocument && artifactValidation) {
      updateDocument(persistedDocument.id, {
        ...deriveLifecycleFromValidation(artifactValidation),
        ...(artifactValidation.passed ? { lastSuccessfulPresetId: runRequest.appliedPreset?.id } : {}),
      });
    }
    const validationWarnings = artifactValidation
      ? [...artifactValidation.blockingIssues, ...artifactValidation.warnings].map((issue) => ({
          code: issue.code,
          message: issue.message,
        }))
      : [];
    return { artifactValidation, validationWarnings };
  };

  try {
    const result = await runSpreadsheetWorkflow({
      prompt: promptWithContext,
      activeWorkbook,
      activeDocumentId: activeDocument?.id ?? null,
      projectDocumentCount: context.data.projectDocumentCount,
      isDefaultSheet: docIsDefaultSheet,
    });

    if (result.kind === 'clarification-needed') {
      return {
        runId,
        status: 'blocked',
        intent,
        outputs: {
          kind: result.kind,
          ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
          ...(editing ? { editing } : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation: {
          passed: false,
          summary: result.message,
        },
        warnings: [...configWarnings, ...contextWarnings, ...(result.planValidation?.issues ?? []).map((issue) => ({
          code: issue.code,
          message: issue.message,
        }))],
        changedTargets: [{
          documentId: activeDocument?.id,
          action: 'none',
        }],
        structuredStatus: {
          title: 'Spreadsheet clarification needed',
          detail: result.message,
        },
      };
    }

    if (result.kind === 'blocked') {
      return {
        runId,
        status: 'blocked',
        intent,
        outputs: {
          kind: result.kind,
          ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
          ...(editing ? { editing } : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation: {
          passed: false,
          summary: result.message,
        },
        warnings: [...configWarnings, ...contextWarnings, ...(result.planValidation?.issues ?? []).map((issue) => ({
          code: issue.code,
          message: issue.message,
        }))],
        changedTargets: [{
          documentId: activeDocument?.id,
          action: 'none',
        }],
        structuredStatus: {
          title: 'Spreadsheet request blocked',
          detail: result.message,
        },
      };
    }

    if (result.kind === 'no-intent') {
      return {
        runId,
        status: 'blocked',
        intent,
        outputs: {
          kind: result.kind,
          ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
          ...(editing ? { editing } : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation: {
          passed: true,
          summary: 'Spreadsheet workflow exited without applying changes.',
        },
        warnings: [...configWarnings, ...contextWarnings],
        changedTargets: [{
          documentId: activeDocument?.id,
          action: 'none',
        }],
        structuredStatus: {
          title: 'No spreadsheet action taken',
          detail: result.message,
        },
      };
    }

    if (result.kind === 'chart-created') {
      const updatedContentHtml = (activeDocument!.contentHtml || '') + '\n' + result.chartHtml;
      const chartSpecs = extractChartSpecsFromHtml(updatedContentHtml);
      updateDocument(activeDocument!.id, { contentHtml: updatedContentHtml, chartSpecs });
      const updatedProject = useProjectStore.getState().project;
      commitVersion(updatedProject, `Created chart from spreadsheet`).catch(
        (e) => console.warn('[VersionHistory] commit failed:', e),
      );
      const { artifactValidation, validationWarnings } = buildValidationState(activeDocument!.id);
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          kind: result.kind,
          chartHtml: result.chartHtml,
          chartType: result.chartType,
          rowCount: result.rowCount,
          ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
          ...(editing ? { editing } : {}),
          ...(artifactValidation
            ? {
                publish: {
                  profileId: artifactValidation.profileId,
                  artifactValidation,
                  exportBlocked: !artifactValidation.passed,
                  overrideRequired: !artifactValidation.passed,
                },
              }
            : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation: artifactValidation
          ? {
              passed: artifactValidation.passed,
              summary: summarizeValidationResult(artifactValidation),
              profileId: artifactValidation.profileId,
              score: artifactValidation.score,
              blockingIssues: artifactValidation.blockingIssues,
              warnings: artifactValidation.warnings,
            }
          : {
              passed: true,
              summary: 'Spreadsheet chart created successfully.',
            },
        warnings: [...configWarnings, ...contextWarnings, ...validationWarnings],
        changedTargets: [{
          documentId: activeDocument!.id,
          action: 'updated',
        }],
        structuredStatus: {
          title: 'Spreadsheet chart created',
          detail: result.message,
        },
      };
    }

    if (result.kind === 'action-executed') {
      updateDocument(activeDocument!.id, {
        workbook: { ...activeWorkbook!, sheets: result.updatedSheets },
      });
      const spreadsheetSummary = summarizeSpreadsheetAugmentationImpact({
        project: useProjectStore.getState().project,
        spreadsheetDocumentId: activeDocument!.id,
        affectedSheetIds: [activeWorkbook!.sheets[activeWorkbook!.activeSheetIndex]!.id],
        affectedTableNames: [activeWorkbook!.sheets[activeWorkbook!.activeSheetIndex]!.tableName],
        refreshedSheetIds: result.refreshedSheetIds,
        plan: result.plan!,
      });
      const { artifactValidation, validationWarnings } = buildValidationState(activeDocument!.id);
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          kind: result.kind,
          updatedSheets: result.updatedSheets,
          spreadsheet: spreadsheetSummary,
          ...(editing ? { editing } : {}),
          ...(artifactValidation
            ? {
                publish: {
                  profileId: artifactValidation.profileId,
                  artifactValidation,
                  exportBlocked: !artifactValidation.passed,
                  overrideRequired: !artifactValidation.passed,
                },
              }
            : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation: artifactValidation
          ? {
              passed: artifactValidation.passed,
              summary: summarizeValidationResult(artifactValidation),
              profileId: artifactValidation.profileId,
              score: artifactValidation.score,
              blockingIssues: artifactValidation.blockingIssues,
              warnings: artifactValidation.warnings,
            }
          : {
              passed: true,
              summary: 'Spreadsheet action executed successfully.',
            },
        warnings: [...configWarnings, ...contextWarnings, ...validationWarnings],
        changedTargets: [{
          documentId: activeDocument!.id,
          action: 'updated',
        }],
        structuredStatus: {
          title: 'Spreadsheet updated',
          detail: result.message,
        },
      };
    }

    if (result.kind === 'formula-column-created' || result.kind === 'query-view-created') {
      updateDocument(activeDocument!.id, {
        workbook: { ...activeWorkbook!, sheets: result.updatedSheets },
      });
      const spreadsheetSummary = summarizeSpreadsheetAugmentationImpact({
        project: useProjectStore.getState().project,
        spreadsheetDocumentId: activeDocument!.id,
        affectedSheetIds: result.kind === 'query-view-created'
          ? [result.targetSheetId]
          : [activeWorkbook!.sheets[activeWorkbook!.activeSheetIndex]!.id],
        affectedTableNames: result.kind === 'query-view-created'
          ? result.updatedSheets.filter((sheet) => sheet.id === result.targetSheetId).map((sheet) => sheet.tableName)
          : [activeWorkbook!.sheets[activeWorkbook!.activeSheetIndex]!.tableName],
        refreshedSheetIds: result.kind === 'formula-column-created' ? result.refreshedSheetIds : undefined,
        plan: result.plan!,
      });
      const { artifactValidation, validationWarnings } = buildValidationState(activeDocument!.id);
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          kind: result.kind,
          updatedSheets: result.updatedSheets,
          spreadsheet: spreadsheetSummary,
          ...(editing ? { editing } : {}),
          ...(artifactValidation
            ? {
                publish: {
                  profileId: artifactValidation.profileId,
                  artifactValidation,
                  exportBlocked: !artifactValidation.passed,
                  overrideRequired: !artifactValidation.passed,
                },
              }
            : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation: artifactValidation
          ? {
              passed: artifactValidation.passed,
              summary: summarizeValidationResult(artifactValidation),
              profileId: artifactValidation.profileId,
              score: artifactValidation.score,
              blockingIssues: artifactValidation.blockingIssues,
              warnings: artifactValidation.warnings,
            }
          : {
              passed: true,
              summary: 'Spreadsheet operation executed successfully.',
            },
        warnings: [...configWarnings, ...contextWarnings, ...validationWarnings],
        changedTargets: [{
          documentId: activeDocument!.id,
          sheetId: result.kind === 'query-view-created' ? result.targetSheetId : activeWorkbook!.sheets[activeWorkbook!.activeSheetIndex]!.id,
          action: 'updated',
        }],
        structuredStatus: {
          title: result.kind === 'query-view-created' ? 'Spreadsheet query view created' : 'Spreadsheet formula applied',
          detail: result.message,
        },
      };
    }

    if (result.kind === 'sheet-summarized') {
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          kind: result.kind,
          ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
          ...(editing ? { editing } : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation: {
          passed: true,
          summary: 'Spreadsheet summary generated successfully.',
        },
        warnings: [...configWarnings, ...contextWarnings],
        changedTargets: [{
          documentId: activeDocument?.id,
          action: 'none',
        }],
        structuredStatus: {
          title: 'Spreadsheet summary generated',
          detail: result.message,
        },
      };
    }

    // kind === 'spreadsheet-created'
    let targetDocument = activeDocument?.type === 'spreadsheet' ? activeDocument : null;

    if (!targetDocument) {
      const newSheet = createDefaultSheet(result.sheetName);
      targetDocument = {
        id: crypto.randomUUID(),
        title: result.workbookTitle,
        type: 'spreadsheet',
        contentHtml: '',
        themeCss: '',
        slideCount: 0,
        chartSpecs: {},
        workbook: { sheets: [newSheet], activeSheetIndex: 0 },
        lifecycleState: 'draft',
        order: context.data.projectDocumentCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addDocument(targetDocument);
    }

    if (!targetDocument) {
      throw new Error('Spreadsheet target document was not created.');
    }

    const existingWorkbook = targetDocument.workbook as WorkbookMeta;
    const nextWorkbook: WorkbookMeta = {
      ...existingWorkbook,
      sheets: result.updatedSheets,
      activeSheetIndex: result.newActiveSheetIndex,
    };

    const shouldRename = !activeDocument || activeDocument.title === 'New Spreadsheet';
    updateDocument(targetDocument.id, {
      title: shouldRename ? result.workbookTitle : targetDocument.title,
      workbook: nextWorkbook,
    });

    const updatedProject = useProjectStore.getState().project;
    commitVersion(updatedProject, `Created spreadsheet: ${prompt.slice(0, 60)}`).catch(
      (e) => console.warn('[VersionHistory] commit failed:', e),
    );
    const { artifactValidation, validationWarnings } = buildValidationState(targetDocument.id);
    const spreadsheetSummary = summarizeSpreadsheetAugmentationImpact({
      project: useProjectStore.getState().project,
      spreadsheetDocumentId: targetDocument.id,
      affectedSheetIds: [result.updatedSheets[result.newActiveSheetIndex]?.id].filter(Boolean) as string[],
      affectedTableNames: [result.updatedSheets[result.newActiveSheetIndex]?.tableName].filter(Boolean) as string[],
      plan: result.plan!,
    });
    return {
      runId,
      status: 'completed',
      intent,
        outputs: {
          kind: result.kind,
          workbookTitle: result.workbookTitle,
          sheetName: result.sheetName,
          updatedSheets: result.updatedSheets,
          spreadsheet: spreadsheetSummary,
          ...(editing ? { editing } : {}),
          ...(artifactValidation
            ? {
                publish: {
                  profileId: artifactValidation.profileId,
                  artifactValidation,
                  exportBlocked: !artifactValidation.passed,
                  overrideRequired: !artifactValidation.passed,
                },
              }
            : {}),
        },
      assistantMessage: {
        content: result.summary,
      },
      validation: artifactValidation
        ? {
            passed: artifactValidation.passed,
            summary: summarizeValidationResult(artifactValidation),
            profileId: artifactValidation.profileId,
            score: artifactValidation.score,
            blockingIssues: artifactValidation.blockingIssues,
            warnings: artifactValidation.warnings,
          }
        : {
            passed: true,
            summary: 'Spreadsheet created successfully.',
          },
      warnings: [...configWarnings, ...contextWarnings, ...validationWarnings],
      changedTargets: [{
        documentId: targetDocument.id,
        action: activeDocument?.type === 'spreadsheet' ? 'updated' : 'created',
      }],
      structuredStatus: {
        title: activeDocument?.type === 'spreadsheet' ? 'Spreadsheet updated' : 'Spreadsheet created',
        detail: result.summary,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Spreadsheet generation failed';
    return {
      runId,
      status: 'failed',
      intent,
      outputs: {},
      assistantMessage: {
        content: `Error: ${message}`,
      },
      validation: {
        passed: false,
        summary: 'Spreadsheet workflow failed.',
      },
      warnings: configWarnings,
      changedTargets: [],
      structuredStatus: {
        title: 'Spreadsheet workflow failed',
        detail: message,
      },
    };
  }
}
