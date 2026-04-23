import type { SerializableRunSpec } from '@/services/executionSpec/types';

export function serializeRunSpec(spec: SerializableRunSpec): string {
  return JSON.stringify(spec);
}

export function deserializeRunSpec(serializedSpec: string): SerializableRunSpec {
  return JSON.parse(serializedSpec) as SerializableRunSpec;
}
