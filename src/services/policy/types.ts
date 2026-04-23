export type PolicyCheckpoint =
  | 'before-run'
  | 'after-context-assembly'
  | 'after-validation'
  | 'after-lifecycle-refresh';

export type PolicyCondition =
  | 'context-budget-exceeded'
  | 'validation-blocked'
  | 'artifact-stale'
  | 'dependency-broken'
  | 'retry-limit-exceeded'
  | 'export-unavailable'
  | 'preset-mismatch';

export type PolicyAction =
  | 'compact-context'
  | 'narrow-scope'
  | 'retry-once'
  | 'request-clarification'
  | 'mark-stale'
  | 'block-publish'
  | 'downgrade-to-draft'
  | 'recommend-doctor';

export interface PolicyEvaluationInput {
  checkpoint: PolicyCheckpoint;
  conditions: PolicyCondition[];
}

export interface PolicyEvaluationResult {
  checkpoint: PolicyCheckpoint;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
}
