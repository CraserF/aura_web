import type { DocumentType, ProjectData, WorkflowPreset } from '@/types/project';
import { validateContextPolicy } from '@/services/configValidate/contextPolicy';
import { validateProjectRules } from '@/services/configValidate/projectRules';
import { validateWorkflowPresets } from '@/services/configValidate/presets';
import { loadContextPolicy, loadProjectRulesDocument, loadWorkflowPresets } from '@/services/projectRules/load';
import { mergeContextPolicy } from '@/services/projectRules/merge';
import { buildProjectRulesPromptBlock } from '@/services/projectRules/promptContext';
import type { ResolvedProjectRulesSnapshot } from '@/services/projectRules/types';

function resolveActivePreset(
  artifactType: DocumentType,
  presets: ProjectData['workflowPresets'],
): WorkflowPreset | undefined {
  const defaultPresetId = presets?.defaultPresetByArtifact?.[artifactType];
  if (!defaultPresetId) return undefined;

  const preset = presets?.presets.find((entry) => entry.id === defaultPresetId && entry.enabled);
  return preset && (!preset.artifactType || preset.artifactType === artifactType) ? preset : undefined;
}

export function resolveProjectRulesSnapshot(
  project: ProjectData,
  artifactType: DocumentType,
): ResolvedProjectRulesSnapshot {
  const projectRules = loadProjectRulesDocument(project.projectRules);
  const baseContextPolicy = loadContextPolicy(project.contextPolicy);
  const workflowPresets = loadWorkflowPresets(project.workflowPresets);
  const activePreset = resolveActivePreset(artifactType, workflowPresets);
  const artifactOverride = baseContextPolicy.artifactOverrides?.[artifactType];
  const contextPolicy = mergeContextPolicy(
    mergeContextPolicy(baseContextPolicy, artifactOverride),
    activePreset?.contextPolicyOverrides,
  );

  return {
    markdown: projectRules.markdown,
    promptBlock: buildProjectRulesPromptBlock(projectRules.markdown, activePreset?.rulesAppendix),
    contextPolicy,
    activePresetId: activePreset?.id,
    diagnostics: [
      ...validateProjectRules(project.projectRules),
      ...validateContextPolicy(project.contextPolicy),
      ...validateWorkflowPresets(project.workflowPresets),
    ],
  };
}
