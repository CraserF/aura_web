import { detectWorkflowType } from '@/lib/workflowType';
import type { ProjectData, ProjectDocument } from '@/types/project';
import { detectSheetAction } from '@/services/spreadsheet/actions';

import { buildIntentClarification } from '@/services/ai/intent/clarify';
import type { IntentScope, ResolvedIntent } from '@/services/ai/intent/types';

const CHART_INTENT_RE = /\b(chart|graph|visuali[sz]e|plot|diagram)\b/i;
const SPREADSHEET_ACTION_HINT_RE =
  /\b(sort|filter|rename|remove|delete|drop|add\s+(?:a\s+)?column|append|insert|summari[sz]e|analy[sz]e)\b/i;

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
      confidence: activeDocument ? 0.98 : 0.78,
      needsClarification: false,
      reason,
    };
  }

  const operation = activeDocument ? 'edit' : 'create';
  const clarification =
    artifactType === 'presentation' && operation === 'create' && allowClarification
      ? buildIntentClarification(prompt)
      : null;

  return {
    artifactType,
    operation,
    scope,
    targetDocumentId: activeDocument?.id,
    confidence: activeDocument ? 0.99 : 0.8,
    needsClarification: !!clarification,
    reason: activeDocument
      ? 'active document type is authoritative'
      : 'workflow keyword fallback selected artifact type',
    ...(clarification ? { clarification } : {}),
  };
}
