import type { DocumentType, ProjectData } from '@/types/project';
import { validateContextPolicy } from '@/services/configValidate/contextPolicy';
import { validateProjectRules } from '@/services/configValidate/projectRules';
import { validateWorkflowPresets } from '@/services/configValidate/presets';
import { loadContextPolicy, loadProjectRulesDocument, loadWorkflowPresets } from '@/services/projectRules/load';
import { mergeContextPolicy } from '@/services/projectRules/merge';
import { buildProjectRulesPromptBlock } from '@/services/projectRules/promptContext';
import type { ResolvedProjectRulesSnapshot } from '@/services/projectRules/types';
import {
  buildPresetRulesAppendix,
  mergePresetContextPolicy,
  resolveWorkflowPresetState,
} from '@/services/presets/apply';

export function resolveProjectRulesSnapshot(
  project: ProjectData,
  artifactType: DocumentType,
  selectedPresetId?: string,
): ResolvedProjectRulesSnapshot {
  const projectRules = loadProjectRulesDocument(project.projectRules);
  const baseContextPolicy = loadContextPolicy(project.contextPolicy);
  const workflowPresets = loadWorkflowPresets(project.workflowPresets);
  const presetState = resolveWorkflowPresetState(workflowPresets, artifactType, selectedPresetId);
  const artifactOverride = baseContextPolicy.artifactOverrides?.[artifactType];
  const contextPolicy = mergePresetContextPolicy(
    mergeContextPolicy(baseContextPolicy, artifactOverride),
    presetState.defaultPreset,
    presetState.selectedPreset,
  );
  const presetRulesAppendix = buildPresetRulesAppendix(
    presetState.defaultPreset,
    presetState.selectedPreset,
  );

  return {
    markdown: projectRules.markdown,
    promptBlock: buildProjectRulesPromptBlock(projectRules.markdown, presetRulesAppendix),
    contextPolicy,
    activePresetId: presetState.appliedPreset?.id,
    activePresetName: presetState.appliedPreset?.name,
    appliedPreset: presetState.appliedPreset,
    diagnostics: [
      ...validateProjectRules(project.projectRules),
      ...validateContextPolicy(project.contextPolicy),
      ...validateWorkflowPresets(project.workflowPresets),
    ],
  };
}
