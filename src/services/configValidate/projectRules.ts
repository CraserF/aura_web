import type { ConfigDiagnostic } from '@/services/configValidate/types';
import type { ProjectRulesDocument } from '@/services/projectRules/types';

export function validateProjectRules(_rules: ProjectRulesDocument): ConfigDiagnostic[] {
  return [];
}
