import type { ConfigDiagnostic } from '@/services/configValidate/types';
import type { WorkflowPresetCollection } from '@/services/projectRules/types';

export function validateWorkflowPresets(_presets: WorkflowPresetCollection): ConfigDiagnostic[] {
  return [];
}
