import type { DocumentType, WorkflowPresetCollection } from '@/types/project';

import type { AppliedWorkflowPreset, ResolvedWorkflowPresetState } from '@/services/presets/types';
import { loadPresetCollection } from '@/services/presets/storage';

function toAppliedPreset(
  preset: WorkflowPresetCollection['presets'][number] | undefined,
): AppliedWorkflowPreset | undefined {
  if (!preset) return undefined;

  return {
    id: preset.id,
    name: preset.name,
    artifactType: preset.artifactType,
    rulesAppendix: preset.rulesAppendix,
  };
}

export function resolveWorkflowPresetState(
  value: WorkflowPresetCollection | undefined,
  artifactType: DocumentType,
  selectedPresetId?: string,
): ResolvedWorkflowPresetState {
  const presets = loadPresetCollection(value);
  const defaultPresetId = presets.defaultPresetByArtifact[artifactType];
  const defaultPreset = presets.presets.find((preset) => preset.enabled && preset.id === defaultPresetId);
  const selectedPreset = selectedPresetId
    ? presets.presets.find((preset) => preset.enabled && preset.id === selectedPresetId)
    : undefined;
  const appliedPreset = toAppliedPreset(selectedPreset ?? defaultPreset);

  return {
    presets,
    defaultPreset,
    selectedPreset,
    appliedPreset,
  };
}

// TODO(phase-8): Merge project rules/context policy through this service.
