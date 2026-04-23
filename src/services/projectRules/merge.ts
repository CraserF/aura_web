import type { ContextPolicy, ContextPolicyOverride } from '@/types/project';

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
