/**
 * Spreadsheet workflow handler — all spreadsheet-specific chat logic.
 *
 * Extracted from ChatBar so that spreadsheet logic is identifiable,
 * testable, and does not mix with presentation or document workflows.
 *
 * Three sub-paths (tried in order):
 *   1. Chart-from-spreadsheet  — user asks to visualize existing sheet data
 *   2. Sheet action             — deterministic operations (sort, filter, add col, etc.)
 *   3. Spreadsheet creation     — create/populate a sheet from a natural-language prompt
 */

import type { ProjectDocument, WorkbookMeta, SheetMeta } from '@/types/project';
import type { ChatMessage as ChatMessageType, GenerationStatus } from '@/types';
import { createDefaultSheet, replaceSheetData } from '@/services/spreadsheet/workbook';
import { canCreateSpreadsheetFromPrompt, planSpreadsheetStarter } from '@/services/spreadsheet/starter';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { commitVersion } from '@/services/storage/versionHistory';
import { useProjectStore } from '@/stores/projectStore';

const CHART_INTENT_RE = /\b(chart|graph|visuali[sz]e|plot|diagram)\b/i;

function isDefaultSheet(sheet: SheetMeta | undefined): boolean {
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

function isDefaultSpreadsheetDoc(doc: ProjectDocument | null): boolean {
  const sheet = doc?.workbook?.sheets[doc.workbook.activeSheetIndex];
  return isDefaultSheet(sheet);
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
    prompt, promptWithContext, activeDocument, projectDocumentCount, scopedDocumentId, messageScope,
    addMessage, addDocument, updateDocument, setStatus, setStreamingContent,
  } = ctx;

  const isChartIntent = CHART_INTENT_RE.test(promptWithContext);
  const isCreateIntent = canCreateSpreadsheetFromPrompt(promptWithContext);
  const activeWorkbook = activeDocument?.type === 'spreadsheet' ? activeDocument.workbook : null;
  const activeSheetIsPopulated = !!activeWorkbook && !isDefaultSpreadsheetDoc(activeDocument);

  // ─── 1. Chart-from-spreadsheet ──────────────────────────────────────────────
  if (isChartIntent && activeSheetIsPopulated && activeWorkbook) {
    setStatus({ state: 'generating', startedAt: Date.now(), step: 'Building chart from spreadsheet data…', pct: 30 });
    setStreamingContent('');

    try {
      const sheet = activeWorkbook.sheets[activeWorkbook.activeSheetIndex];
      if (!sheet) throw new Error('No active sheet found.');

      const { describeTable, buildChartSpecFromTable, suggestChartConfig } = await import('@/services/data');
      const tableDesc = await describeTable(sheet.tableName);

      if (tableDesc.rowCount === 0) {
        addMessage({
          id: crypto.randomUUID(), role: 'assistant',
          content: 'The sheet has no rows yet. Add some data first, then ask me to create a chart.',
          timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope,
        });
        setStatus({ state: 'idle' });
        setStreamingContent('');
        return;
      }

      const chartConfig = suggestChartConfig(tableDesc);
      if (!chartConfig) {
        addMessage({
          id: crypto.randomUUID(), role: 'assistant',
          content: 'I couldn\'t auto-detect chartable columns in this sheet. Ensure you have at least one text column (for labels) and one numeric column (for values).',
          timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope,
        });
        setStatus({ state: 'idle' });
        setStreamingContent('');
        return;
      }

      const { spec } = await buildChartSpecFromTable({
        tableName: sheet.tableName,
        sqlFragment: chartConfig.sqlFragment,
        labelColumn: chartConfig.labelColumn,
        valueColumns: chartConfig.valueColumns,
        title: `${sheet.name} Chart`,
        sourceDocumentId: activeDocument!.id,
      });

      const chartHtml = `<script type="application/json" data-aura-chart-spec>${JSON.stringify(spec)}<\/script>\n<div data-aura-chart="${spec.id}" style="width:100%; max-width:720px; aspect-ratio:2; margin:24px auto;"></div>`;
      const updatedContentHtml = (activeDocument!.contentHtml || '') + '\n' + chartHtml;
      const chartSpecs = extractChartSpecsFromHtml(updatedContentHtml);
      updateDocument(activeDocument!.id, { contentHtml: updatedContentHtml, chartSpecs });

      addMessage({
        id: crypto.randomUUID(), role: 'assistant',
        content: `Created a ${spec.type} chart from "${sheet.name}" with ${tableDesc.rowCount} rows.`,
        timestamp: Date.now(), documentId: activeDocument!.id, scope: messageScope,
      });

      const updatedProject = useProjectStore.getState().project;
      commitVersion(updatedProject, `Created chart from spreadsheet: ${sheet.name}`).catch(
        (e) => console.warn('[VersionHistory] commit failed:', e),
      );
      setStatus({ state: 'idle' });
      setStreamingContent('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chart generation failed';
      setStatus({ state: 'error', message });
      setStreamingContent('');
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message}`, timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope });
    }
    return;
  }

  // ─── 2. Sheet action (sort / filter / add-col / rename / remove) ─────────────
  if (activeSheetIsPopulated && activeWorkbook) {
    const sheet = activeWorkbook.sheets[activeWorkbook.activeSheetIndex];
    if (sheet) {
      const { detectSheetAction, executeSheetAction } = await import('@/services/spreadsheet/actions');
      const detectedAction = detectSheetAction(promptWithContext, sheet.schema);
      if (detectedAction) {
        setStatus({ state: 'generating', startedAt: Date.now(), step: 'Updating sheet…', pct: 50 });
        try {
          const result = await executeSheetAction(detectedAction, sheet);
          const updatedSheets = activeWorkbook.sheets.map((s, i) => {
            if (i !== activeWorkbook.activeSheetIndex) return s;
            return {
              ...s,
              ...(result.updatedSchema ? { schema: result.updatedSchema } : {}),
              ...(Object.prototype.hasOwnProperty.call(result, 'sortState') ? { sortState: result.sortState } : {}),
              ...(Object.prototype.hasOwnProperty.call(result, 'filterState') ? { filterState: result.filterState } : {}),
            };
          });
          updateDocument(activeDocument!.id, {
            workbook: { ...activeWorkbook, sheets: updatedSheets },
          });
          addMessage({
            id: crypto.randomUUID(), role: 'assistant',
            content: result.userMessage,
            timestamp: Date.now(), documentId: activeDocument!.id, scope: messageScope,
          });
          setStatus({ state: 'idle' });
          setStreamingContent('');
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Action failed';
          setStatus({ state: 'error', message });
          setStreamingContent('');
          addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message}`, timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope });
        }
        return;
      }
    }
  }

  // ─── 3. Spreadsheet creation ──────────────────────────────────────────────────
  if (!isCreateIntent) {
    addMessage({
      id: crypto.randomUUID(), role: 'assistant',
      content: 'I can create new sheets and seed them with data. Try: "create a budget tracker", "make a sales table with sample data", or "design a table with columns name, amount, status". To chart existing data, try "graph this" or "create a chart". Or try editing your active sheet: "sort by Amount", "add a column called Notes", "rename Status to Stage", "remove the Notes column", "filter where country = France".',
      timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope,
    });
    setStatus({ state: 'idle' });
    setStreamingContent('');
    return;
  }

  try {
    const plan = planSpreadsheetStarter(promptWithContext);

    let targetDocument = activeDocument?.type === 'spreadsheet' ? activeDocument : null;

    if (!targetDocument) {
      const newSheet = createDefaultSheet(plan.sheetName);
      targetDocument = {
        id: crypto.randomUUID(),
        title: plan.workbookTitle,
        type: 'spreadsheet',
        contentHtml: '',
        themeCss: '',
        slideCount: 0,
        chartSpecs: {},
        workbook: {
          sheets: [newSheet],
          activeSheetIndex: 0,
        },
        order: projectDocumentCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addDocument(targetDocument);
    }

    const workbook = targetDocument.workbook as WorkbookMeta;
    const shouldReuseActiveSheet = isDefaultSpreadsheetDoc(targetDocument);
    const activeSheetIndex = workbook.activeSheetIndex;
    const targetSheet = shouldReuseActiveSheet
      ? workbook.sheets[activeSheetIndex]
      : createDefaultSheet(plan.sheetName);

    if (!targetSheet) throw new Error('Spreadsheet sheet is unavailable.');

    const appliedSchema = await replaceSheetData(targetSheet, plan.schema, plan.rows);
    const nextSheet = { ...targetSheet, name: plan.sheetName, schema: appliedSchema };

    const nextSheets = shouldReuseActiveSheet
      ? workbook.sheets.map((s, i) => (i === activeSheetIndex ? nextSheet : s))
      : [...workbook.sheets, nextSheet];

    const nextWorkbook: WorkbookMeta = {
      ...workbook,
      sheets: nextSheets,
      activeSheetIndex: shouldReuseActiveSheet ? activeSheetIndex : nextSheets.length - 1,
    };

    const shouldRenameDocument = !activeDocument || activeDocument.title === 'New Spreadsheet';
    updateDocument(targetDocument.id, {
      title: shouldRenameDocument ? plan.workbookTitle : targetDocument.title,
      workbook: nextWorkbook,
    });

    addMessage({
      id: crypto.randomUUID(), role: 'assistant',
      content: plan.chartHint ? `${plan.summary} ${plan.chartHint}` : plan.summary,
      timestamp: Date.now(), documentId: targetDocument.id, scope: messageScope,
    });

    const updatedProject = useProjectStore.getState().project;
    commitVersion(updatedProject, `Created spreadsheet starter: ${prompt.slice(0, 60)}`).catch(
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
