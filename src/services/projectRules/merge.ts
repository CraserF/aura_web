import type { ContextPolicy, ContextPolicyOverride } from '@/services/projectRules/types';

export function mergeContextPolicy(
  base: ContextPolicy,
  override?: ContextPolicyOverride | null,
): ContextPolicy {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    artifactOverrides: base.artifactOverrides,
  };
}
