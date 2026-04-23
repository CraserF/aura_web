import type { ProjectDocument } from '@/types/project';

import type { ResolvedIntent } from '@/services/ai/intent/types';
import type { ResolvedTarget } from '@/services/editing/types';

export interface ResolveTargetsInput {
  prompt: string;
  intent: ResolvedIntent;
  activeDocument: ProjectDocument | null;
}

export function resolveTargets(_input: ResolveTargetsInput): ResolvedTarget[] {
  // TODO(phase-4): Resolve bounded edit targets across documents,
  // presentations, and spreadsheets.
  return [];
}
