import type {
  ContextPolicy,
} from '@/types/project';
import type { AppliedWorkflowPreset } from '@/services/presets/types';

export interface ResolvedProjectRulesSnapshot {
  markdown: string;
  promptBlock: string;
  contextPolicy: ContextPolicy;
  activePresetId?: string;
  activePresetName?: string;
  appliedPreset?: AppliedWorkflowPreset;
  diagnostics: import('@/services/configValidate/types').ConfigDiagnostic[];
}
