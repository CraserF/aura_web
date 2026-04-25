import type {
  ContextPolicy,
  ContextPolicyOverride,
  DocumentType,
  WorkflowPreset,
  WorkflowPresetCollection,
} from '@/types/project';

import type { AppliedWorkflowPreset, ResolvedWorkflowPresetState } from '@/services/presets/types';
import { loadPresetCollection } from '@/services/presets/storage';
import { mergeContextPolicy } from '@/services/projectRules/merge';

function toAppliedPreset(
  preset: WorkflowPresetCollection['presets'][number] | undefined,
): AppliedWorkflowPreset | undefined {
  if (!preset) return undefined;

  return {
    id: preset.id,
    name: preset.name,
    artifactType: preset.artifactType,
    rulesAppendix: preset.rulesAppendix,
    documentStylePreset: preset.documentStylePreset,
    contextPolicyOverrides: preset.contextPolicyOverrides,
  };
}

function matchesArtifactType(preset: WorkflowPreset, artifactType: DocumentType): boolean {
  return !preset.artifactType || preset.artifactType === artifactType;
}

export function resolveWorkflowPresetState(
  value: WorkflowPresetCollection | undefined,
  artifactType: DocumentType,
  selectedPresetId?: string,
): ResolvedWorkflowPresetState {
  const presets = loadPresetCollection(value);
  const defaultPresetId = presets.defaultPresetByArtifact[artifactType];
  const defaultPreset = presets.presets.find(
    (preset) => preset.enabled && preset.id === defaultPresetId && matchesArtifactType(preset, artifactType),
  );
  const selectedPreset = selectedPresetId
    ? presets.presets.find(
        (preset) => preset.enabled && preset.id === selectedPresetId && matchesArtifactType(preset, artifactType),
      )
    : undefined;
  const appliedPreset = toAppliedPreset(selectedPreset ?? defaultPreset);

  return {
    presets,
    defaultPreset,
    selectedPreset,
    appliedPreset,
  };
}

export function mergePresetContextPolicy(
  base: ContextPolicy,
  defaultPreset?: WorkflowPreset,
  selectedPreset?: WorkflowPreset,
): ContextPolicy {
  let nextPolicy = base;

  if (defaultPreset?.contextPolicyOverrides) {
    nextPolicy = mergeContextPolicy(nextPolicy, defaultPreset.contextPolicyOverrides);
  }

  if (selectedPreset?.id !== defaultPreset?.id && selectedPreset?.contextPolicyOverrides) {
    nextPolicy = mergeContextPolicy(nextPolicy, selectedPreset.contextPolicyOverrides);
  }

  return nextPolicy;
}

export function buildPresetRulesAppendix(
  defaultPreset?: WorkflowPreset,
  selectedPreset?: WorkflowPreset,
): string | undefined {
  const parts = [
    defaultPreset?.rulesAppendix?.trim(),
    selectedPreset?.id !== defaultPreset?.id ? selectedPreset?.rulesAppendix?.trim() : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

export function diffContextPolicyOverride(
  base: ContextPolicy,
  next: ContextPolicy,
): ContextPolicyOverride | undefined {
  const override: ContextPolicyOverride = {};
  const keys: Array<keyof ContextPolicyOverride> = [
    'includeProjectChat',
    'includeMemory',
    'includeAttachments',
    'includeRelatedDocuments',
    'maxChatMessages',
    'maxMemoryTokens',
    'maxRelatedDocuments',
    'maxAttachmentChars',
  ];

  for (const key of keys) {
    if (base[key] !== next[key]) {
      (override as Record<string, unknown>)[key] = next[key];
    }
  }

  return Object.keys(override).length > 0 ? override : undefined;
}

// TODO(phase-8): Merge project rules/context policy through this service.
