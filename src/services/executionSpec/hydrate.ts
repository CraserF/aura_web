import type { ProviderConfig } from '@/types';

import type { ExecutionMode, RunProjectSnapshot } from '@/services/runs/types';
import type { ResolvedIntent } from '@/services/ai/intent/types';
import type { AppliedWorkflowPreset } from '@/services/presets/types';
import type { SerializableContextSnapshot, SerializableRulesSnapshot, SerializableRunSpec } from '@/services/executionSpec/types';

export interface HydratedRunSpec {
  runId: string;
  mode: ExecutionMode;
  intent: ResolvedIntent;
  projectSnapshot: RunProjectSnapshot;
  contextSnapshot: SerializableContextSnapshot;
  rulesSnapshot: SerializableRulesSnapshot;
  selectedPresetId?: string;
  appliedPreset?: AppliedWorkflowPreset;
  providerConfig: ProviderConfig;
  targeting: SerializableRunSpec['targeting'];
}

export function hydrateRunSpec(
  spec: SerializableRunSpec,
  providerConfigOverride?: Partial<ProviderConfig>,
): HydratedRunSpec {
  return {
    runId: spec.runId,
    mode: spec.mode,
    intent: spec.intent,
    projectSnapshot: spec.projectSnapshot,
    contextSnapshot: spec.contextSnapshot,
    rulesSnapshot: spec.rulesSnapshot,
    ...(spec.preset?.id ? { selectedPresetId: spec.preset.id } : {}),
    ...(spec.preset ? { appliedPreset: spec.preset } : {}),
    providerConfig: {
      id: spec.providerRef.providerId as ProviderConfig['id'],
      name: spec.providerRef.providerId,
      apiKey: '',
      model: spec.providerRef.model,
      baseUrl: spec.providerRef.baseUrl,
      ...providerConfigOverride,
    },
    targeting: spec.targeting,
  };
}
