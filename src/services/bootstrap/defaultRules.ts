import type { ContextPolicyOverride, WorkflowPresetCollection } from '@/types/project';

const STARTER_KIT_RULES: Record<string, string> = {
  'executive-briefing': `# Project rules

- Keep outputs concise, executive-ready, and decision-oriented.
- Prefer clear recommendations, owner/date metadata, and high-signal KPI summaries.
- Use premium but restrained tone and layout choices over verbose explanation.`,
  'research-pack': `# Project rules

- Preserve evidence quality and separate findings from interpretation.
- Prefer methodology, observations, and implications over unsupported conclusions.
- Keep tables and summaries scannable for synthesis work.`,
  'launch-plan': `# Project rules

- Organize work around milestones, ownership, and launch-readiness checkpoints.
- Prefer practical rollout sequencing and visible next steps over generic strategy language.
- Keep outputs aligned across plan, tracker, and presentation artifacts.`,
};

const STARTER_KIT_CONTEXT_POLICY: Record<string, ContextPolicyOverride> = {
  'executive-briefing': {
    maxChatMessages: 10,
    maxRelatedDocuments: 4,
  },
  'research-pack': {
    includeRelatedDocuments: true,
    maxChatMessages: 14,
    maxRelatedDocuments: 8,
  },
  'launch-plan': {
    includeProjectChat: true,
    maxChatMessages: 14,
    maxRelatedDocuments: 6,
  },
};

const STARTER_KIT_WORKFLOW_PRESETS: Record<string, WorkflowPresetCollection> = {
  'executive-briefing': {
    version: 1,
    presets: [{
      id: 'executive-doc-default',
      name: 'Executive Document Default',
      artifactType: 'document',
      rulesAppendix: 'Favor concise leadership-ready summaries and explicit recommendation blocks.',
      documentStylePreset: 'executive',
      enabled: true,
    }],
    defaultPresetByArtifact: {
      document: 'executive-doc-default',
    },
  },
  'research-pack': {
    version: 1,
    presets: [{
      id: 'research-doc-default',
      name: 'Research Document Default',
      artifactType: 'document',
      rulesAppendix: 'Keep evidence, methodology, and implication visibly separated.',
      documentStylePreset: 'research',
      enabled: true,
    }],
    defaultPresetByArtifact: {
      document: 'research-doc-default',
    },
  },
  'launch-plan': {
    version: 1,
    presets: [{
      id: 'launch-doc-default',
      name: 'Launch Document Default',
      artifactType: 'document',
      rulesAppendix: 'Prefer milestone-driven plans with explicit owners and launch criteria.',
      documentStylePreset: 'proposal',
      enabled: true,
    }],
    defaultPresetByArtifact: {
      document: 'launch-doc-default',
    },
  },
};

export function getStarterKitRulesMarkdown(starterKitId: string): string {
  return STARTER_KIT_RULES[starterKitId] ?? '';
}

export function getStarterKitContextPolicyOverrides(
  starterKitId: string,
): ContextPolicyOverride | undefined {
  return STARTER_KIT_CONTEXT_POLICY[starterKitId];
}

export function getStarterKitWorkflowPresets(
  starterKitId: string,
): WorkflowPresetCollection | undefined {
  return STARTER_KIT_WORKFLOW_PRESETS[starterKitId];
}
