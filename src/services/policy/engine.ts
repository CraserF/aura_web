import { DEFAULT_POLICY_ACTIONS } from '@/services/policy/defaultRules';
import type { PolicyEvaluationInput, PolicyEvaluationResult } from '@/services/policy/types';

export function evaluatePolicy(input: PolicyEvaluationInput): PolicyEvaluationResult {
  return {
    checkpoint: input.checkpoint,
    conditions: input.conditions,
    actions: Array.from(
      new Set(input.conditions.flatMap((condition) => DEFAULT_POLICY_ACTIONS[condition] ?? [])),
    ),
  };
}

// TODO(phase-8): Expand policy evaluation with richer run/request context.
