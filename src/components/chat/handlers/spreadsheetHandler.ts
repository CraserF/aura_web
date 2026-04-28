/**
 * Spreadsheet workflow handler — thin adapter between ChatBar and the orchestrator.
 *
 * Calls runSpreadsheetWorkflow() to get a typed result, then applies that result
 * to the React store via callbacks. No business logic here.
 */

import type { ProjectDocument, WorkbookMeta } from '@/types/project';
import type { GenerationStatus, WorkflowStep } from '@/types';
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
import { workflowStepUpdateFromRuntimeEvent } from '@/services/chat/workflowProgress';
import { validateArtifactAgainstProfile } from '@/services/validation';
import { summarizeValidationResult } from '@/services/validation/profiles';
import { deriveLifecycleFromValidation } from '@/services/lifecycle/state';
import {
  finalizeSpreadsheetRuntimeResult,
} from '@/services/artifactRuntime';
import type { ArtifactRuntimeTelemetry, WorkflowEvent } from '@/services/ai/workflow/types';

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
  workflowStepsRef: { current: WorkflowStep[] };
  // Store mutations
  addDocument: (doc: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;
  setStatus: (s: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
  updateStepStatus: (stepId: string, stepStatus: WorkflowStep['status'], label?: string) => void;
}

export async function handleSpreadsheetWorkflow(ctx: SpreadsheetHandlerContext): Promise<RunResult> {
  const {
    runRequest,
    workflowStepsRef,
    addDocument, updateDocument, setStatus, setStreamingContent, updateStepStatus,
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
  const targetSummary = editing?.targetSummary ?? (resolvedTargets.length > 0
    ? resolvedTargets.map((target) => target.label)
    : intent.targetSelectors.map((selector) => selector.label ?? selector.type));

  const activeWorkbook = activeDocument?.type === 'spreadsheet' ? activeDocument.workbook ?? null : null;
  const docIsDefaultSheet = isDefaultSheet(activeDocument);

  logContextMetrics('spreadsheet-handler', context.metrics);

  workflowStepsRef.current = [
    { id: 'plan', label: 'Planning', status: 'done' },
    { id: 'validation', label: 'Checking quality', status: 'pending' },
    { id: 'finalize', label: 'Finishing', status: 'pending' },
  ];

  setStatus({
    state: 'generating',
    startedAt: Date.now(),
    step: 'Planning',
    pct: 20,
    steps: workflowStepsRef.current,
  });
  setStreamingContent('');
  const onRuntimeEvent = (event: WorkflowEvent) => {
    const workflowStepUpdate = workflowStepUpdateFromRuntimeEvent(event);
    if (workflowStepUpdate) {
      updateStepStatus(
        workflowStepUpdate.stepId,
        workflowStepUpdate.status,
        workflowStepUpdate.label,
      );
    }

    switch (event.type) {
      case 'progress':
        setStatus({
          state: 'generating',
          startedAt: Date.now(),
          step: workflowStepUpdate?.label ?? event.message,
          pct: event.pct,
          steps: [...workflowStepsRef.current],
        });
        break;
      case 'step-start':
      case 'step-done':
      case 'step-update':
        setStatus({
          state: 'generating',
          startedAt: Date.now(),
          step: workflowStepUpdate?.label ?? event.label,
          steps: [...workflowStepsRef.current],
        });
        break;
      case 'step-error':
        setStatus({
          state: 'generating',
          startedAt: Date.now(),
          step: event.error,
          steps: [...workflowStepsRef.current],
        });
        break;
    }
  };

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
  let runtimeTelemetry: ArtifactRuntimeTelemetry | undefined;
  const buildEnvelope = (
    changedTargets: RunResult['changedTargets'],
    validation: RunResult['validation'],
    spreadsheet: Record<string, unknown> = {},
  ) => ({
    artifactType: 'spreadsheet' as const,
    mode: runRequest.mode,
    targetSummary,
    changedTargets,
    validation,
    runtimePlan: runRequest.artifactRunPlan,
    spreadsheet: {
      artifactType: 'spreadsheet' as const,
      ...(runtimeTelemetry ? { runtime: runtimeTelemetry } : {}),
      ...spreadsheet,
    },
  });

  try {
    const workflowStart = performance.now();
    const result = await runSpreadsheetWorkflow({
      prompt: promptWithContext,
      activeWorkbook,
      activeDocumentId: activeDocument?.id ?? null,
      projectDocumentCount: context.data.projectDocumentCount,
      isDefaultSheet: docIsDefaultSheet,
      artifactRunPlan: runRequest.artifactRunPlan,
    });
    const runtimeResult = finalizeSpreadsheetRuntimeResult({
      runPlan: runRequest.artifactRunPlan,
      result,
      totalRuntimeMs: Math.round(performance.now() - workflowStart),
      onEvent: onRuntimeEvent,
    });
    runtimeTelemetry = runtimeResult.runtime;
    const { advancedDiagnostics } = runtimeResult;

    if (result.kind === 'clarification-needed') {
      return {
        runId,
        status: 'blocked',
        intent,
        outputs: {
          envelope: buildEnvelope(
            [{
              documentId: activeDocument?.id,
              action: 'none',
            }],
            {
              passed: false,
              summary: result.message,
            },
            {
              kind: result.kind,
              ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
              ...(editing ? { editing } : {}),
            },
          ),
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
          ...(advancedDiagnostics.length > 0 ? { advancedDiagnostics } : {}),
        },
      };
    }

    if (result.kind === 'blocked') {
      return {
        runId,
        status: 'blocked',
        intent,
        outputs: {
          envelope: buildEnvelope(
            [{
              documentId: activeDocument?.id,
              action: 'none',
            }],
            {
              passed: false,
              summary: result.message,
            },
            {
              kind: result.kind,
              ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
              ...(editing ? { editing } : {}),
            },
          ),
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
          ...(advancedDiagnostics.length > 0 ? { advancedDiagnostics } : {}),
        },
      };
    }

    if (result.kind === 'no-intent') {
      return {
        runId,
        status: 'blocked',
        intent,
        outputs: {
          envelope: buildEnvelope(
            [{
              documentId: activeDocument?.id,
              action: 'none',
            }],
            {
              passed: true,
              summary: 'Spreadsheet workflow exited without applying changes.',
            },
            {
              kind: result.kind,
              ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
              ...(editing ? { editing } : {}),
            },
          ),
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
          ...(advancedDiagnostics.length > 0 ? { advancedDiagnostics } : {}),
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
      const validation = artifactValidation
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
          };
      const changedTargets = [{
        documentId: activeDocument!.id,
        action: 'updated',
      }] as const;
      const publish = artifactValidation
        ? {
            profileId: artifactValidation.profileId,
            artifactValidation,
            exportBlocked: !artifactValidation.passed,
            overrideRequired: !artifactValidation.passed,
          }
        : undefined;
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          envelope: buildEnvelope(
            [...changedTargets],
            validation,
            {
              kind: result.kind,
              chartHtml: result.chartHtml,
              chartType: result.chartType,
              rowCount: result.rowCount,
              ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
              ...(editing ? { editing } : {}),
              ...(publish ? { publish } : {}),
            },
          ),
          kind: result.kind,
          chartHtml: result.chartHtml,
          chartType: result.chartType,
          rowCount: result.rowCount,
          ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
          ...(editing ? { editing } : {}),
          ...(publish ? { publish } : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation,
        warnings: [...configWarnings, ...contextWarnings, ...validationWarnings],
        changedTargets: [...changedTargets],
        structuredStatus: {
          title: 'Spreadsheet chart created',
          detail: result.message,
          ...(advancedDiagnostics.length > 0 ? { advancedDiagnostics } : {}),
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
      const validation = artifactValidation
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
          };
      const changedTargets = [{
        documentId: activeDocument!.id,
        action: 'updated',
      }] as const;
      const publish = artifactValidation
        ? {
            profileId: artifactValidation.profileId,
            artifactValidation,
            exportBlocked: !artifactValidation.passed,
            overrideRequired: !artifactValidation.passed,
          }
        : undefined;
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          envelope: buildEnvelope(
            [...changedTargets],
            validation,
            {
              kind: result.kind,
              updatedSheets: result.updatedSheets,
              spreadsheet: spreadsheetSummary,
              ...(editing ? { editing } : {}),
              ...(publish ? { publish } : {}),
            },
          ),
          kind: result.kind,
          updatedSheets: result.updatedSheets,
          spreadsheet: spreadsheetSummary,
          ...(editing ? { editing } : {}),
          ...(publish ? { publish } : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation,
        warnings: [...configWarnings, ...contextWarnings, ...validationWarnings],
        changedTargets: [...changedTargets],
        structuredStatus: {
          title: 'Spreadsheet updated',
          detail: result.message,
          ...(advancedDiagnostics.length > 0 ? { advancedDiagnostics } : {}),
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
      const validation = artifactValidation
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
          };
      const changedTargets = [{
        documentId: activeDocument!.id,
        sheetId: result.kind === 'query-view-created' ? result.targetSheetId : activeWorkbook!.sheets[activeWorkbook!.activeSheetIndex]!.id,
        action: 'updated',
      }] as const;
      const publish = artifactValidation
        ? {
            profileId: artifactValidation.profileId,
            artifactValidation,
            exportBlocked: !artifactValidation.passed,
            overrideRequired: !artifactValidation.passed,
          }
        : undefined;
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          envelope: buildEnvelope(
            [...changedTargets],
            validation,
            {
              kind: result.kind,
              updatedSheets: result.updatedSheets,
              spreadsheet: spreadsheetSummary,
              ...(editing ? { editing } : {}),
              ...(publish ? { publish } : {}),
            },
          ),
          kind: result.kind,
          updatedSheets: result.updatedSheets,
          spreadsheet: spreadsheetSummary,
          ...(editing ? { editing } : {}),
          ...(publish ? { publish } : {}),
        },
        assistantMessage: {
          content: result.message,
        },
        validation,
        warnings: [...configWarnings, ...contextWarnings, ...validationWarnings],
        changedTargets: [...changedTargets],
        structuredStatus: {
          title: result.kind === 'query-view-created' ? 'Spreadsheet query view created' : 'Spreadsheet formula applied',
          detail: result.message,
          ...(advancedDiagnostics.length > 0 ? { advancedDiagnostics } : {}),
        },
      };
    }

    if (result.kind === 'sheet-summarized') {
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          envelope: buildEnvelope(
            [{
              documentId: activeDocument?.id,
              action: 'none',
            }],
            {
              passed: true,
              summary: 'Spreadsheet summary generated successfully.',
            },
            {
              kind: result.kind,
              ...(result.planSummary ? { spreadsheet: result.planSummary } : {}),
              ...(editing ? { editing } : {}),
            },
          ),
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
          ...(advancedDiagnostics.length > 0 ? { advancedDiagnostics } : {}),
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
    const validation = artifactValidation
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
        };
    const changedTargets = [{
      documentId: targetDocument.id,
      action: activeDocument?.type === 'spreadsheet' ? 'updated' : 'created',
    }] as const;
    const publish = artifactValidation
      ? {
          profileId: artifactValidation.profileId,
          artifactValidation,
          exportBlocked: !artifactValidation.passed,
          overrideRequired: !artifactValidation.passed,
        }
      : undefined;
    return {
      runId,
      status: 'completed',
      intent,
        outputs: {
          envelope: buildEnvelope(
            [...changedTargets],
            validation,
            {
              kind: result.kind,
              workbookTitle: result.workbookTitle,
              sheetName: result.sheetName,
              updatedSheets: result.updatedSheets,
              spreadsheet: spreadsheetSummary,
              ...(editing ? { editing } : {}),
              ...(publish ? { publish } : {}),
            },
          ),
          kind: result.kind,
          workbookTitle: result.workbookTitle,
          sheetName: result.sheetName,
          updatedSheets: result.updatedSheets,
          spreadsheet: spreadsheetSummary,
          ...(editing ? { editing } : {}),
          ...(publish ? { publish } : {}),
        },
      assistantMessage: {
        content: result.summary,
      },
      validation,
      warnings: [...configWarnings, ...contextWarnings, ...validationWarnings],
      changedTargets: [...changedTargets],
      structuredStatus: {
        title: activeDocument?.type === 'spreadsheet' ? 'Spreadsheet updated' : 'Spreadsheet created',
        detail: result.summary,
        ...(advancedDiagnostics.length > 0 ? { advancedDiagnostics } : {}),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Spreadsheet generation failed';
    return {
      runId,
      status: 'failed',
      intent,
      outputs: {
        envelope: buildEnvelope(
          [],
          {
            passed: false,
            summary: 'Spreadsheet workflow failed.',
          },
        ),
      },
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
