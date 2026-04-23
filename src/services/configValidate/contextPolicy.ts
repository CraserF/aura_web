import type { ConfigDiagnostic } from '@/services/configValidate/types';
import type { ContextPolicy } from '@/services/projectRules/types';

export function validateContextPolicy(_policy: ContextPolicy): ConfigDiagnostic[] {
  return [];
}
