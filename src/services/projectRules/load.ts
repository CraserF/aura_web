import type {
  ContextPolicy,
  ContextPolicyOverride,
  ProjectData,
  ProjectMediaAsset,
  ProjectRulesDocument,
  WorkflowPreset,
  WorkflowPresetCollection,
} from '@/types/project';
import {
  defaultContextPolicy,
  defaultProjectRules,
  defaultWorkflowPresets,
} from '@/services/projectRules/defaults';
import { normalizeDocumentLifecycle } from '@/services/lifecycle/state';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function loadProjectMediaAsset(value: unknown): ProjectMediaAsset | null {
  if (!isRecord(value)) return null;

  if (
    typeof value.id !== 'string'
    || typeof value.filename !== 'string'
    || typeof value.mimeType !== 'string'
    || typeof value.relativePath !== 'string'
    || typeof value.dataUrl !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    filename: value.filename,
    mimeType: value.mimeType,
    relativePath: value.relativePath,
    dataUrl: value.dataUrl,
  };
}

export function loadProjectMedia(value?: unknown): ProjectMediaAsset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(loadProjectMediaAsset)
    .filter((asset): asset is ProjectMediaAsset => !!asset);
}

function normalizeContextPolicyOverride(
  value: unknown,
  fallback: ContextPolicyOverride = {},
  preservePartial = false,
): ContextPolicyOverride {
  const source = isRecord(value) ? value : {};

  if (preservePartial) {
    return {
      ...(source.includeProjectChat !== undefined && typeof source.includeProjectChat === 'boolean'
        ? { includeProjectChat: source.includeProjectChat }
        : {}),
      ...(source.includeMemory !== undefined && typeof source.includeMemory === 'boolean'
        ? { includeMemory: source.includeMemory }
        : {}),
      ...(source.includeAttachments !== undefined && typeof source.includeAttachments === 'boolean'
        ? { includeAttachments: source.includeAttachments }
        : {}),
      ...(source.includeRelatedDocuments !== undefined && typeof source.includeRelatedDocuments === 'boolean'
        ? { includeRelatedDocuments: source.includeRelatedDocuments }
        : {}),
      ...(source.maxChatMessages !== undefined && typeof source.maxChatMessages === 'number' && Number.isFinite(source.maxChatMessages) && source.maxChatMessages >= 0
        ? { maxChatMessages: source.maxChatMessages }
        : {}),
      ...(source.maxMemoryTokens !== undefined && typeof source.maxMemoryTokens === 'number' && Number.isFinite(source.maxMemoryTokens) && source.maxMemoryTokens >= 0
        ? { maxMemoryTokens: source.maxMemoryTokens }
        : {}),
      ...(source.maxRelatedDocuments !== undefined && typeof source.maxRelatedDocuments === 'number' && Number.isFinite(source.maxRelatedDocuments) && source.maxRelatedDocuments >= 0
        ? { maxRelatedDocuments: source.maxRelatedDocuments }
        : {}),
      ...(source.maxAttachmentChars !== undefined && typeof source.maxAttachmentChars === 'number' && Number.isFinite(source.maxAttachmentChars) && source.maxAttachmentChars >= 0
        ? { maxAttachmentChars: source.maxAttachmentChars }
        : {}),
    };
  }

  return {
    includeProjectChat: asBoolean(source.includeProjectChat, fallback.includeProjectChat ?? true),
    includeMemory: asBoolean(source.includeMemory, fallback.includeMemory ?? true),
    includeAttachments: asBoolean(source.includeAttachments, fallback.includeAttachments ?? true),
    includeRelatedDocuments: asBoolean(source.includeRelatedDocuments, fallback.includeRelatedDocuments ?? true),
    maxChatMessages: asPositiveNumber(source.maxChatMessages, fallback.maxChatMessages ?? 12),
    maxMemoryTokens: asPositiveNumber(source.maxMemoryTokens, fallback.maxMemoryTokens ?? 1200),
    maxRelatedDocuments: asPositiveNumber(source.maxRelatedDocuments, fallback.maxRelatedDocuments ?? 6),
    maxAttachmentChars: asPositiveNumber(source.maxAttachmentChars, fallback.maxAttachmentChars ?? 12000),
  };
}

export function loadProjectRulesDocument(value?: unknown): ProjectRulesDocument {
  const fallback = defaultProjectRules();
  if (!isRecord(value)) return fallback;

  return {
    markdown: typeof value.markdown === 'string' ? value.markdown : fallback.markdown,
    updatedAt: asPositiveNumber(value.updatedAt, fallback.updatedAt),
  };
}

export function loadContextPolicy(value?: unknown): ContextPolicy {
  const fallback = defaultContextPolicy();
  if (!isRecord(value)) return fallback;

  const artifactOverridesSource = isRecord(value.artifactOverrides) ? value.artifactOverrides : {};
  const artifactOverrides = Object.fromEntries(
    Object.entries(artifactOverridesSource)
      .filter(([key]) => key === 'document' || key === 'presentation' || key === 'spreadsheet')
      .map(([key, override]) => [
        key,
        normalizeContextPolicyOverride(
          override,
          fallback.artifactOverrides?.[key as keyof typeof fallback.artifactOverrides],
          true,
        ),
      ]),
  ) as ContextPolicy['artifactOverrides'];

  return {
    version: asPositiveNumber(value.version, fallback.version),
    ...normalizeContextPolicyOverride(value, fallback),
    artifactOverrides,
  };
}

function loadWorkflowPreset(value: unknown): WorkflowPreset | null {
  if (!isRecord(value)) return null;

  return {
    id: typeof value.id === 'string' ? value.id : '',
    name: typeof value.name === 'string' ? value.name : '',
    artifactType:
      value.artifactType === 'document' || value.artifactType === 'presentation' || value.artifactType === 'spreadsheet'
        ? value.artifactType
        : undefined,
    rulesAppendix: typeof value.rulesAppendix === 'string' ? value.rulesAppendix : undefined,
    contextPolicyOverrides: isRecord(value.contextPolicyOverrides)
      ? normalizeContextPolicyOverride(value.contextPolicyOverrides, {}, true)
      : undefined,
    documentStylePreset: typeof value.documentStylePreset === 'string' ? value.documentStylePreset : undefined,
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
  };
}

export function loadWorkflowPresets(value?: unknown): WorkflowPresetCollection {
  const fallback = defaultWorkflowPresets();
  if (!isRecord(value)) return fallback;

  const presets = Array.isArray(value.presets)
    ? value.presets.map(loadWorkflowPreset).filter((preset): preset is WorkflowPreset => !!preset)
    : fallback.presets;

  const defaultPresetByArtifactSource = isRecord(value.defaultPresetByArtifact)
    ? value.defaultPresetByArtifact
    : {};

  return {
    version: asPositiveNumber(value.version, fallback.version),
    presets,
    defaultPresetByArtifact: {
      ...(typeof defaultPresetByArtifactSource.document === 'string'
        ? { document: defaultPresetByArtifactSource.document }
        : {}),
      ...(typeof defaultPresetByArtifactSource.presentation === 'string'
        ? { presentation: defaultPresetByArtifactSource.presentation }
        : {}),
      ...(typeof defaultPresetByArtifactSource.spreadsheet === 'string'
        ? { spreadsheet: defaultPresetByArtifactSource.spreadsheet }
        : {}),
    },
  };
}

export function normalizeProjectData(project: ProjectData): ProjectData {
  return {
    ...project,
    documents: project.documents.map((document) => normalizeDocumentLifecycle(document)),
    media: loadProjectMedia(project.media),
    projectRules: loadProjectRulesDocument(project.projectRules),
    contextPolicy: loadContextPolicy(project.contextPolicy),
    workflowPresets: loadWorkflowPresets(project.workflowPresets),
  };
}
