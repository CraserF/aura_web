import type {
  ContextPolicy,
} from '@/types/project';

export interface ResolvedProjectRulesSnapshot {
  markdown: string;
  promptBlock: string;
  contextPolicy: ContextPolicy;
  activePresetId?: string;
  diagnostics: import('@/services/configValidate/types').ConfigDiagnostic[];
}
