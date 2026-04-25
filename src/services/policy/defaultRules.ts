import type { PolicyAction, PolicyCondition } from '@/services/policy/types';

export const DEFAULT_POLICY_ACTIONS: Record<PolicyCondition, PolicyAction[]> = {
  'context-budget-exceeded': ['compact-context'],
  'validation-blocked': ['block-publish'],
  'artifact-stale': ['mark-stale'],
  'dependency-broken': ['mark-stale', 'recommend-doctor'],
  'retry-limit-exceeded': ['request-clarification'],
  'export-unavailable': ['block-publish'],
  'preset-mismatch': ['narrow-scope'],
};
