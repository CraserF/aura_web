/**
 * Spreadsheet workflow handler — thin adapter between ChatBar and the orchestrator.
 *
 * Calls runSpreadsheetWorkflow() to get a typed result, then applies that result
 * to the React store via callbacks. No business logic here.
 */

import type { ProjectDocument, WorkbookMeta } from '@/types/project';
import type { ChatMessage as ChatMessageType, GenerationStatus } from '@/types';
import { countTextChars, logContextMetrics } from '@/services/ai/debug';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { commitVersion } from '@/services/storage/versionHistory';
import { runSpreadsheetWorkflow } from '@/services/ai/workflow/spreadsheet';
import { useProjectStore } from '@/stores/projectStore';
import { createDefaultSheet } from '@/services/spreadsheet/workbook';

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
  prompt: string;
  promptWithContext: string;
  activeDocument: ProjectDocument | null;
  projectDocumentCount: number;
  projectId: string;
  scopedDocumentId: string | undefined;
  messageScope: 'project' | 'document';
  // Store mutations
  addMessage: (msg: ChatMessageType) => void;
  addDocument: (doc: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;
  setStatus: (s: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
}

export async function handleSpreadsheetWorkflow(ctx: SpreadsheetHandlerContext): Promise<void> {
  const {
    promptWithContext, activeDocument, projectDocumentCount, scopedDocumentId, messageScope,
    addMessage, addDocument, updateDocument, setStatus, setStreamingContent,
  } = ctx;

  const activeWorkbook = activeDocument?.type === 'spreadsheet' ? activeDocument.workbook ?? null : null;
  const docIsDefaultSheet = isDefaultSheet(activeDocument);
  const workbookSnapshot = activeWorkbook ? JSON.stringify(activeWorkbook) : '';

  logContextMetrics('spreadsheet-handler', {
    promptChars: countTextChars(ctx.prompt),
    promptWithContextChars: countTextChars(promptWithContext),
    attachmentContextChars: Math.max(0, promptWithContext.length - ctx.prompt.length),
    artifactContextChars: countTextChars(workbookSnapshot),
  });

  setStatus({ state: 'generating', startedAt: Date.now(), step: 'Working on spreadsheet…', pct: 20 });
  setStreamingContent('');

  try {
    const result = await runSpreadsheetWorkflow({
      prompt: promptWithContext,
      activeWorkbook,
      activeDocumentId: activeDocument?.id ?? null,
      projectDocumentCount,
      isDefaultSheet: docIsDefaultSheet,
    });

    if (result.kind === 'no-intent') {
      addMessage({
        id: crypto.randomUUID(), role: 'assistant',
        content: result.message,
        timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope,
      });
      setStatus({ state: 'idle' });
      setStreamingContent('');
      return;
    }

    if (result.kind === 'chart-created') {
      const updatedContentHtml = (activeDocument!.contentHtml || '') + '\n' + result.chartHtml;
      const chartSpecs = extractChartSpecsFromHtml(updatedContentHtml);
      updateDocument(activeDocument!.id, { contentHtml: updatedContentHtml, chartSpecs });
      addMessage({
        id: crypto.randomUUID(), role: 'assistant',
        content: result.message,
        timestamp: Date.now(), documentId: activeDocument!.id, scope: messageScope,
      });
      const updatedProject = useProjectStore.getState().project;
      commitVersion(updatedProject, `Created chart from spreadsheet`).catch(
        (e) => console.warn('[VersionHistory] commit failed:', e),
      );
      setStatus({ state: 'idle' });
      setStreamingContent('');
      return;
    }

    if (result.kind === 'action-executed') {
      updateDocument(activeDocument!.id, {
        workbook: { ...activeWorkbook!, sheets: result.updatedSheets },
      });
      addMessage({
        id: crypto.randomUUID(), role: 'assistant',
        content: result.message,
        timestamp: Date.now(), documentId: activeDocument!.id, scope: messageScope,
      });
      setStatus({ state: 'idle' });
      setStreamingContent('');
      return;
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
        order: projectDocumentCount,
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

    addMessage({
      id: crypto.randomUUID(), role: 'assistant',
      content: result.summary,
      timestamp: Date.now(), documentId: targetDocument.id, scope: messageScope,
    });

    const updatedProject = useProjectStore.getState().project;
    commitVersion(updatedProject, `Created spreadsheet: ${ctx.prompt.slice(0, 60)}`).catch(
      (e) => console.warn('[VersionHistory] commit failed:', e),
    );
    setStatus({ state: 'idle' });
    setStreamingContent('');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Spreadsheet generation failed';
    setStatus({ state: 'error', message });
    setStreamingContent('');
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message}`, timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope });
  }
}
