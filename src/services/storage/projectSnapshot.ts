/**
 * Project Snapshot — canonical serializer for version history and export.
 *
 * Converts a ProjectData into a flat map of named file contents (plain strings).
 * Used by versionHistory.ts when writing to the git-backed virtual filesystem.
 */

import type { ProjectData, ProjectDocument, ColorTheme } from '@/types/project';

export interface ProjectSnapshotFiles {
  'manifest.json': string;
  'chat-history.json': string;
  'project-rules.md': string;
  'context-policy.json': string;
  'workflow-presets.json': string;
  'media.json': string;
  'memory.json': string;
  /** Maps "{id}.json" to the serialized document JSON */
  documents: Record<string, string>;
}

function snapshotFilename(id: string): string {
  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new Error('Document id is required for project snapshots.');
  }
  return `${encodeURIComponent(trimmedId).replace(/\./g, '%2E')}.json`;
}

/** Serialize a ProjectData into snapshot files (all as plain strings). */
export function serializeProjectSnapshot(project: ProjectData): ProjectSnapshotFiles {
  const manifest = {
    id: project.id,
    title: project.title,
    description: project.description,
    visibility: project.visibility,
    activeDocumentId: project.activeDocumentId,
    visualVariantId: project.visualVariantId,
    colorTheme: project.colorTheme,
    sections: project.sections,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };

  const documents: Record<string, string> = {};
  for (const doc of project.documents) {
    const docObj = {
      id: doc.id,
      title: doc.title,
      type: doc.type,
      contentHtml: doc.contentHtml,
      sourceMarkdown: doc.sourceMarkdown,
      themeCss: doc.themeCss,
      slideCount: doc.slideCount,
      description: doc.description,
      starterRef: doc.starterRef,
      artifactManifest: doc.artifactManifest,
      artifactSourcePayload: doc.artifactSourcePayload,
      parentId: doc.parentId,
      pagesEnabled: doc.pagesEnabled,
      chartSpecs: doc.chartSpecs,
      workbook: doc.workbook,
      linkedTableRefs: doc.linkedTableRefs,
      lifecycleState: doc.lifecycleState,
      lastValidationProfileId: doc.lastValidationProfileId,
      lastSuccessfulPresetId: doc.lastSuccessfulPresetId,
      staleReason: doc.staleReason,
      order: doc.order,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    documents[snapshotFilename(doc.id)] = JSON.stringify(docObj, null, 2);
  }

  return {
    'manifest.json': JSON.stringify(manifest, null, 2),
    'chat-history.json': JSON.stringify(project.chatHistory, null, 2),
    'project-rules.md': project.projectRules?.markdown ?? '',
    'context-policy.json': JSON.stringify(project.contextPolicy ?? {}, null, 2),
    'workflow-presets.json': JSON.stringify(project.workflowPresets ?? {}, null, 2),
    'media.json': JSON.stringify(project.media ?? [], null, 2),
    'memory.json': JSON.stringify(project.memoryTree ?? null, null, 2),
    documents,
  };
}

export interface SnapshotManifest {
  id: string;
  title: string;
  description?: string;
  visibility?: ProjectData['visibility'];
  activeDocumentId?: string | null;
  visualVariantId?: string;
  colorTheme?: ColorTheme;
  sections?: ProjectData['sections'];
  createdAt?: number;
  updatedAt: number;
}

/** Deserialize snapshot files back into partial ProjectData fields. */
export function deserializeProjectSnapshot(files: ProjectSnapshotFiles): {
  manifest: SnapshotManifest;
  documents: ProjectDocument[];
  chatHistory: ProjectData['chatHistory'];
  projectRulesMarkdown: string;
  contextPolicy: ProjectData['contextPolicy'];
  workflowPresets: ProjectData['workflowPresets'];
  media: ProjectData['media'];
  memoryTree: ProjectData['memoryTree'];
} {
  const manifest = JSON.parse(files['manifest.json']) as SnapshotManifest;
  const documents = Object.values(files.documents).map(
    (raw) => JSON.parse(raw) as ProjectDocument,
  );
  const chatHistory = JSON.parse(files['chat-history.json']) as ProjectData['chatHistory'];
  const projectRulesMarkdown = files['project-rules.md'];
  const contextPolicy = parseOptionalJson<ProjectData['contextPolicy']>(files['context-policy.json']);
  const workflowPresets = parseOptionalJson<ProjectData['workflowPresets']>(files['workflow-presets.json']);
  const media = parseOptionalJson<ProjectData['media']>(files['media.json']) ?? [];
  const memoryTree = parseOptionalJson<ProjectData['memoryTree']>(files['memory.json']);

  return {
    manifest,
    documents,
    chatHistory,
    projectRulesMarkdown,
    contextPolicy: contextPolicy ?? undefined,
    workflowPresets: workflowPresets ?? undefined,
    media,
    memoryTree: memoryTree ?? undefined,
  };
}

function parseOptionalJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
