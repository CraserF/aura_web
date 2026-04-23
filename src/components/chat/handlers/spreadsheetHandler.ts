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
import { commitVersion } from '@/services/storage/versionHistory';
import { runSpreadsheetWorkflow } from '@/services/ai/workflow/spreadsheet';
import { useProjectStore } from '@/stores/projectStore';
import { createDefaultSheet } from '@/services/spreadsheet/workbook';
import type { RunRequest } from '@/services/runs/types';
import type { RunResult } from '@/services/contracts/runResult';

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

  const activeWorkbook = activeDocument?.type === 'spreadsheet' ? activeDocument.workbook ?? null : null;
  const docIsDefaultSheet = isDefaultSheet(activeDocument);

  logContextMetrics('spreadsheet-handler', context.metrics);

  setStatus({ state: 'generating', startedAt: Date.now(), step: 'Working on spreadsheet…', pct: 20 });
  setStreamingContent('');

  try {
    const result = await runSpreadsheetWorkflow({
      prompt: promptWithContext,
      activeWorkbook,
      activeDocumentId: activeDocument?.id ?? null,
      projectDocumentCount: context.data.projectDocumentCount,
      isDefaultSheet: docIsDefaultSheet,
    });

    if (result.kind === 'no-intent') {
      return {
        runId,
        status: 'blocked',
        intent,
        outputs: {
          kind: result.kind,
        },
        assistantMessage: {
          content: result.message,
        },
        validation: {
          passed: true,
          summary: 'Spreadsheet workflow exited without applying changes.',
        },
        warnings: configWarnings,
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
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          kind: result.kind,
          chartHtml: result.chartHtml,
          chartType: result.chartType,
          rowCount: result.rowCount,
        },
        assistantMessage: {
          content: result.message,
        },
        validation: {
          passed: true,
          summary: 'Spreadsheet chart created successfully.',
        },
        warnings: configWarnings,
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
      return {
        runId,
        status: 'completed',
        intent,
        outputs: {
          kind: result.kind,
          updatedSheets: result.updatedSheets,
        },
        assistantMessage: {
          content: result.message,
        },
        validation: {
          passed: true,
          summary: 'Spreadsheet action executed successfully.',
        },
        warnings: configWarnings,
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
        order: context.data.projectDocumentCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addDocument(targetDocument);
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
    return {
      runId,
      status: 'completed',
      intent,
      outputs: {
        kind: result.kind,
        workbookTitle: result.workbookTitle,
        sheetName: result.sheetName,
        updatedSheets: result.updatedSheets,
      },
      assistantMessage: {
        content: result.summary,
      },
      validation: {
        passed: true,
        summary: 'Spreadsheet created successfully.',
      },
      warnings: configWarnings,
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
