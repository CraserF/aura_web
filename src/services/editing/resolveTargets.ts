import type { ProjectDocument } from '@/types/project';

import type { ResolvedIntent } from '@/services/ai/intent/types';
import type { ResolvedTarget } from '@/services/editing/types';
import { resolveDocumentTargets } from '@/services/editing/patchDocument';
import { resolvePresentationTargets } from '@/services/editing/patchPresentation';
import { resolveSpreadsheetTargets } from '@/services/editing/patchSpreadsheet';

export interface ResolveTargetsInput {
  prompt: string;
  intent: ResolvedIntent;
  activeDocument: ProjectDocument | null;
}

export function resolveTargets(_input: ResolveTargetsInput): ResolvedTarget[] {
  const { prompt, intent, activeDocument } = _input;
  if (!activeDocument || intent.targetSelectors.length === 0) {
    return [];
  }

  if (activeDocument.type === 'document') {
    return resolveDocumentTargets(activeDocument.contentHtml, intent.targetSelectors, prompt);
  }

  if (activeDocument.type === 'presentation') {
    return resolvePresentationTargets(activeDocument, intent.targetSelectors);
  }

  if (activeDocument.type === 'spreadsheet') {
    return resolveSpreadsheetTargets(activeDocument, intent.targetSelectors);
  }

  return [];
}
