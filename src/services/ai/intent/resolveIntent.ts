import { detectWorkflowType } from '@/lib/workflowType';
import type { ProjectData, ProjectDocument } from '@/types/project';
import { detectSheetAction } from '@/services/spreadsheet/actions';

import { buildIntentClarification } from '@/services/ai/intent/clarify';
import type { IntentScope, ResolvedIntent } from '@/services/ai/intent/types';
import type { ClarifyOption } from '@/types';
import type { EditStrategy, TargetSelector } from '@/services/editing/types';
import { resolveTargets } from '@/services/editing/resolveTargets';

const CHART_INTENT_RE = /\b(chart|graph|visuali[sz]e|plot|diagram)\b/i;
const SPREADSHEET_ACTION_HINT_RE =
  /\b(sort|filter|rename|remove|delete|drop|add\s+(?:a\s+)?column|append|insert|summari[sz]e|analy[sz]e)\b/i;
const FULL_REGENERATE_RE = /\b(rewrite|rebuild|regenerate|redo|start over|from scratch|replace everything)\b/i;
const STYLE_ONLY_RE = /\b(style|theme|color|palette|font|typography|spacing|layout|visual|design|look)\b/i;

function extractQuotedTarget(prompt: string): string | undefined {
  return prompt.match(/["“]([^"”]+)["”]/)?.[1]?.trim();
}

function buildTargetSelectors(prompt: string, activeDocument: ProjectDocument | null): TargetSelector[] {
  if (!activeDocument) {
    return [];
  }

  const quotedTarget = extractQuotedTarget(prompt);

  if (activeDocument.type === 'presentation') {
    const slideNumber = prompt.match(/\bslide\s+(\d+)\b/i)?.[1];
    if (slideNumber) {
      return [{ type: 'slide-number', value: slideNumber, label: `Slide ${slideNumber}` }];
    }
    if (/\btitle slide\b/i.test(prompt)) {
      return [{ type: 'slide-number', value: '1', label: 'Title slide' }];
    }
    if (quotedTarget && /\bslide|title|heading|card\b/i.test(prompt)) {
      return [{ type: 'slide-title', value: quotedTarget, label: `Slide matching "${quotedTarget}"` }];
    }
    if (STYLE_ONLY_RE.test(prompt) && !/\btext|copy|content|title|heading|bullet|message\b/i.test(prompt)) {
      return [{ type: 'deck-style', label: 'Deck style tokens' }];
    }
    return [{ type: 'current-slide', label: 'Current slide' }];
  }

  if (activeDocument.type === 'document') {
    const sectionMatch = prompt.match(/\b(?:section|heading|chapter)\s+["“]?([^"”.,\n]+)["”]?/i)?.[1]?.trim() || quotedTarget;
    if (/\bcallout|card|quote|highlight\b/i.test(prompt)) {
      return [{ type: 'callout-block', value: sectionMatch, label: sectionMatch ? `Callout "${sectionMatch}"` : 'Callout block' }];
    }
    if (/\btable\b/i.test(prompt)) {
      return [{ type: 'table-block', value: sectionMatch, label: sectionMatch ? `Table "${sectionMatch}"` : 'Table block' }];
    }
    if (/\bchart|graph|visual\b/i.test(prompt)) {
      return [{ type: 'chart-block', value: sectionMatch, label: sectionMatch ? `Chart "${sectionMatch}"` : 'Chart block' }];
    }
    if (/\bmetadata|summary band|overview band|kpi\b/i.test(prompt)) {
      return [{ type: 'metadata-band', value: sectionMatch, label: sectionMatch ? `Metadata "${sectionMatch}"` : 'Metadata band' }];
    }
    if (STYLE_ONLY_RE.test(prompt) && !/\bparagraph|sentence|rewrite|condense|expand|section|heading\b/i.test(prompt)) {
      return [{ type: 'document-block', label: 'Document style surface' }];
    }
    if (sectionMatch) {
      return [{ type: 'heading-section', value: sectionMatch, label: `Section "${sectionMatch}"` }];
    }
    if (/\bparagraph|sentence|copy|text|summary|condense|tighten|shorten|expand\b/i.test(prompt)) {
      return [{ type: 'paragraph-cluster', label: 'Best matching text block' }];
    }
    return [{ type: 'document-block', label: 'Best matching document block' }];
  }

  const range = prompt.match(/\b([A-Z]+\d+:[A-Z]+\d+)\b/)?.[1];
  const sheetName = prompt.match(/\bsheet\s+["“]?([^"”.,\n]+)["”]?/i)?.[1]?.trim();
  const column = prompt.match(/\b(?:column|by)\s+["“]?([A-Za-z][A-Za-z0-9 _-]*)["”]?(?:\s+(?:ascending|descending|asc|desc))?\b/i)?.[1]?.trim();

  if (sheetName) {
    return [{ type: 'sheet-name', value: sheetName, label: `Sheet "${sheetName}"` }];
  }
  if (range) {
    return [{ type: 'range', value: range, label: `Range ${range}` }];
  }
  if (/\bformula\b/i.test(prompt) && column) {
    return [{ type: 'formula-column', value: column, label: `Formula column ${column}` }];
  }
  if (/\bfilter\b/i.test(prompt)) {
    return [{ type: 'filter-state', value: column, label: column ? `Filter ${column}` : 'Filter state' }];
  }
  if (/\bsort\b/i.test(prompt)) {
    return [{ type: 'sort-state', value: column, label: column ? `Sort ${column}` : 'Sort state' }];
  }
  if (column) {
    return [{ type: 'column', value: column, label: `Column ${column}` }];
  }
  return [{ type: 'active-sheet', label: 'Active sheet' }];
}

function chooseEditStrategy(prompt: string, activeDocument: ProjectDocument | null): EditStrategy | undefined {
  if (!activeDocument) {
    return undefined;
  }

  if (FULL_REGENERATE_RE.test(prompt)) {
    return 'full-regenerate';
  }

  if (activeDocument.type === 'spreadsheet') {
    return 'sheet-action';
  }

  if (activeDocument.type === 'presentation') {
    return 'search-replace';
  }

  if (STYLE_ONLY_RE.test(prompt) && !/\bparagraph|sentence|copy|rewrite|condense|expand|summary\b/i.test(prompt)) {
    return 'style-token';
  }

  return 'block-replace';
}

function buildTargetClarificationOptions(targetLabels: string[]): ClarifyOption[] {
  return targetLabels.slice(0, 3).map((label) => ({
    label,
    value: `Focus only on ${label}.`,
  }));
}

export interface ResolveIntentInput {
  prompt: string;
  activeDocument: ProjectDocument | null;
  project: ProjectData;
  scope: IntentScope;
  allowClarification?: boolean;
}

export function resolveIntent(input: ResolveIntentInput): ResolvedIntent {
  const { prompt, activeDocument, scope, allowClarification = true } = input;
  const artifactType = activeDocument?.type ?? detectWorkflowType(prompt);
  const targetSelectors = buildTargetSelectors(prompt, activeDocument);
  const editStrategyHint = chooseEditStrategy(prompt, activeDocument);
  const allowFullRegeneration = editStrategyHint === 'full-regenerate';
  const targetSheetId =
    activeDocument?.type === 'spreadsheet'
      ? activeDocument.workbook?.sheets[activeDocument.workbook.activeSheetIndex]?.id
      : undefined;

  if (artifactType === 'spreadsheet') {
    const activeSheet =
      activeDocument?.type === 'spreadsheet'
        ? activeDocument.workbook?.sheets[activeDocument.workbook.activeSheetIndex]
        : undefined;
    const isActionPrompt = (!!activeSheet && !!detectSheetAction(prompt, activeSheet.schema))
      || SPREADSHEET_ACTION_HINT_RE.test(prompt);
    const isChartPrompt = CHART_INTENT_RE.test(prompt);
    const operation = (activeDocument && (isActionPrompt || isChartPrompt)) ? 'action' : activeDocument ? 'edit' : 'create';
    const reason = activeDocument
      ? isActionPrompt
        ? 'active spreadsheet with deterministic sheet action'
        : isChartPrompt
          ? 'active spreadsheet with chart request'
          : 'active spreadsheet is authoritative'
      : 'workflow keyword fallback selected spreadsheet';

    return {
      artifactType,
      operation,
      scope,
      targetDocumentId: activeDocument?.id,
      targetSheetId,
      targetSelectors,
      editStrategyHint,
      allowFullRegeneration,
      confidence: activeDocument ? 0.98 : 0.78,
      needsClarification: false,
      reason,
    };
  }

  const operation = activeDocument ? 'edit' : 'create';
  const baseIntent: ResolvedIntent = {
    artifactType,
    operation,
    scope,
    targetDocumentId: activeDocument?.id,
    targetSelectors,
    editStrategyHint,
    allowFullRegeneration,
    confidence: activeDocument ? 0.99 : 0.8,
    needsClarification: false,
    reason: activeDocument
      ? 'active document type is authoritative'
      : 'workflow keyword fallback selected artifact type',
  };
  const clarification =
    artifactType === 'presentation' && operation === 'create' && allowClarification
      ? buildIntentClarification(prompt)
      : null;
  const targetMatches = activeDocument && operation === 'edit'
    ? resolveTargets({
        prompt,
        intent: baseIntent,
        activeDocument,
      })
    : [];
  const editClarification =
    allowClarification
    && activeDocument
    && operation === 'edit'
    && !allowFullRegeneration
    && targetSelectors.length > 0
    && targetMatches.length > 1
      ? {
          required: true,
          question: 'Quick question: which target should I edit?',
          options: buildTargetClarificationOptions(targetMatches.map((target) => target.label)),
        }
      : null;

  return {
    ...baseIntent,
    needsClarification: !!(clarification || editClarification),
    ...(clarification ? { clarification } : editClarification ? { clarification: editClarification } : {}),
  };
}
