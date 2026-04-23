/**
 * Project File Format — .aura zip for projects with multiple documents.
 *
 * Structure:
 *   manifest.json             — project metadata
 *   chat-history.json         — project-level chat
 *   documents/
 *     {id}.html               — document or presentation HTML
 *     {id}.css                — theme CSS (presentations)
 *     {id}.meta.json          — document metadata
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { ProjectData, ProjectDocument, ProjectManifest } from '@/types/project';
import type { ChatMessage } from '@/types';
import { sanitizeFilename } from '@/lib/sanitizeFilename';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { resolveStandaloneHtml } from '@/services/export/standalone';
import { exportMemoryTree, hasArchivedMemory, importMemoryTree } from '@/services/memory';
import { normalizeProjectData } from '@/services/projectRules/load';
import { exportSheetParquet, importSheetParquet } from '@/services/spreadsheet/workbook';

const FORMAT_VERSION = '2.4';

function parseOptionalJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Pack a full project into a .aura zip and trigger download */
export async function downloadProjectFile(project: ProjectData): Promise<void> {
  const zip = new JSZip();

  const manifest: ProjectManifest = {
    version: FORMAT_VERSION,
    schemaType: 'project',
    id: project.id,
    title: project.title,
    description: project.description,
    documentCount: project.documents.length,
    activeDocumentId: project.activeDocumentId,
    visibility: project.visibility,
    createdAt: project.createdAt,
    updatedAt: Date.now(),
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('chat-history.json', JSON.stringify(project.chatHistory, null, 2));
  zip.file('project-rules.md', project.projectRules?.markdown ?? '');
  zip.file('context-policy.json', JSON.stringify(project.contextPolicy ?? {}, null, 2));
  zip.file('workflow-presets.json', JSON.stringify(project.workflowPresets ?? {}, null, 2));

  const mediaFolder = zip.folder('media');
  if (mediaFolder && (project.media?.length ?? 0) > 0) {
    mediaFolder.file('manifest.json', JSON.stringify(project.media, null, 2));
    for (const asset of project.media ?? []) {
      const base64 = asset.dataUrl.match(/^data:[^;]+;base64,(.+)$/)?.[1];
      if (base64) {
        zip.file(asset.relativePath, base64, { base64: true });
      }
    }
  }

  if (project.memoryTree) {
    for (const entry of exportMemoryTree(project.memoryTree)) {
      zip.file(entry.path, entry.content);
    }
  }

  const docsFolder = zip.folder('documents')!;
  for (const doc of project.documents) {
    const resolvedHtml = resolveStandaloneHtml(doc.contentHtml, project.media ?? [], 'relative').html;
    const meta = {
      id: doc.id,
      title: doc.title,
      type: doc.type,
      slideCount: doc.slideCount,
      order: doc.order,
      description: doc.description,
      starterRef: doc.starterRef,
      parentId: doc.parentId,
      sourceMarkdown: doc.sourceMarkdown,
      pagesEnabled: doc.pagesEnabled,
      chartSpecs: doc.chartSpecs,
      workbook: doc.workbook,
      linkedTableRefs: doc.linkedTableRefs,
      lifecycleState: doc.lifecycleState,
      lastValidationProfileId: doc.lastValidationProfileId,
      lastSuccessfulPresetId: doc.lastSuccessfulPresetId,
      staleReason: doc.staleReason,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    docsFolder.file(`${doc.id}.meta.json`, JSON.stringify(meta, null, 2));
    docsFolder.file(`${doc.id}.html`, resolvedHtml);
    if (doc.themeCss) {
      docsFolder.file(`${doc.id}.css`, doc.themeCss);
    }
    if (doc.type === 'spreadsheet' && doc.workbook) {
      for (const sheet of doc.workbook.sheets) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('DuckDB export timeout')), 5000),
          );
          const parquet = await Promise.race([exportSheetParquet(sheet.tableName), timeoutPromise]);
          docsFolder.file(`${doc.id}.${sheet.id}.parquet`, parquet);
        } catch {
          // Keep save resilient if a sheet table is not initialized or DuckDB is unavailable.
        }
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `${sanitizeFilename(project.title)}.aura`;
  saveAs(blob, filename);
}

/** Read and unpack a project .aura zip */
export async function openProjectFile(file: File): Promise<ProjectData> {
  const zip = await JSZip.loadAsync(file);

  const manifestJson = await zip.file('manifest.json')?.async('string');
  if (!manifestJson) throw new Error('Invalid .aura file: missing manifest.json');

  const manifest = JSON.parse(manifestJson) as ProjectManifest;

  // Support both v1 (presentation-only) and v2 (project) formats
  if (manifest.schemaType !== 'project') {
    return upgradeV1ToProject(zip, manifest as unknown as Record<string, unknown>);
  }

  const chatHistoryJson =
    (await zip.file('chat-history.json')?.async('string')) ?? '[]';
  const chatHistory = JSON.parse(chatHistoryJson) as ChatMessage[];
  const projectRulesMarkdown =
    (await zip.file('project-rules.md')?.async('string')) ?? '';
  const contextPolicyJson =
    (await zip.file('context-policy.json')?.async('string')) ?? 'null';
  const workflowPresetsJson =
    (await zip.file('workflow-presets.json')?.async('string')) ?? 'null';
  const mediaManifestJson =
    (await zip.file('media/manifest.json')?.async('string')) ?? '[]';
  const mediaManifest = parseOptionalJson<ProjectData['media']>(mediaManifestJson) ?? [];
  const media = await Promise.all(
    mediaManifest.map(async (asset) => {
      const bytes = await zip.file(asset.relativePath)?.async('uint8array');
      if (!bytes) {
        return asset;
      }

      const base64 = btoa(String.fromCharCode(...bytes));
      return {
        ...asset,
        dataUrl: `data:${asset.mimeType};base64,${base64}`,
      };
    }),
  );

  const documents: ProjectDocument[] = [];
  const docsFolder = zip.folder('documents');

  if (docsFolder) {
    // Find all meta files
    const metaFiles = Object.keys(zip.files).filter(
      (f) => f.startsWith('documents/') && f.endsWith('.meta.json'),
    );

    for (const metaPath of metaFiles) {
      const metaJson = await zip.file(metaPath)?.async('string');
      if (!metaJson) continue;

      const meta = JSON.parse(metaJson) as ProjectDocument;
      const docId = meta.id;

      const storedHtml =
        (await zip.file(`documents/${docId}.html`)?.async('string')) ?? '';
      const contentHtml = resolveStandaloneHtml(storedHtml, media, 'inline').html;
      const themeCss =
        (await zip.file(`documents/${docId}.css`)?.async('string')) ?? '';

      documents.push({
        ...meta,
        contentHtml,
        themeCss,
      });

      if (meta.type === 'spreadsheet' && meta.workbook?.sheets?.length) {
        for (const sheet of meta.workbook.sheets) {
          const parquetPath = `documents/${docId}.${sheet.id}.parquet`;
          const parquetBytes = await zip.file(parquetPath)?.async('uint8array');
          if (parquetBytes) {
            try {
              await importSheetParquet(sheet.tableName, parquetBytes);
            } catch {
              // Keep load resilient when parquet artifacts are invalid.
            }
          }
        }
      }
    }

    // Sort by order
    documents.sort((a, b) => a.order - b.order);
  }

  const restoredActiveDocumentId =
    manifest.activeDocumentId && documents.some((d) => d.id === manifest.activeDocumentId)
      ? manifest.activeDocumentId
      : (documents[0]?.id ?? null);

  const memoryPaths = Object.keys(zip.files).filter(
    (filePath) => filePath.startsWith('memory/') && filePath.endsWith('.md'),
  );
  const memoryEntries = await Promise.all(
    memoryPaths.map(async (path) => ({
      path,
      content: ((await zip.file(path)?.async('string')) as string | undefined) ?? '',
    })),
  );
  const memoryTree = hasArchivedMemory(memoryEntries)
    ? importMemoryTree(memoryEntries.filter((entry) => entry.content))
    : undefined;

  return normalizeProjectData({
    id: manifest.id,
    title: manifest.title,
    description: manifest.description,
    visibility: manifest.visibility ?? 'private',
    documents,
    activeDocumentId: restoredActiveDocumentId,
    chatHistory,
    memoryTree,
    media,
    projectRules: {
      markdown: projectRulesMarkdown,
      updatedAt: manifest.updatedAt,
    },
    contextPolicy: parseOptionalJson<ProjectData['contextPolicy']>(contextPolicyJson) ?? undefined,
    workflowPresets: parseOptionalJson<ProjectData['workflowPresets']>(workflowPresetsJson) ?? undefined,
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
  });
}

/** Upgrade a v1 presentation .aura file to the v2 project format */
async function upgradeV1ToProject(
  zip: JSZip,
  v1Manifest: Record<string, unknown>,
): Promise<ProjectData> {
  const slidesHtml = (await zip.file('slides.html')?.async('string')) ?? '';
  const themeCss = (await zip.file('theme.css')?.async('string')) ?? '';
  const chatHistoryJson =
    (await zip.file('chat-history.json')?.async('string')) ?? '[]';
  const chatHistory = JSON.parse(chatHistoryJson) as ChatMessage[];

  const docId = crypto.randomUUID();
  const now = Date.now();
  const title = (v1Manifest.title as string) ?? 'Untitled Presentation';

  const doc: ProjectDocument = {
    id: docId,
    title,
    type: 'presentation',
    contentHtml: slidesHtml,
    themeCss,
    slideCount: (v1Manifest.slideCount as number) ?? 0,
    chartSpecs: extractChartSpecsFromHtml(slidesHtml),
    order: 0,
    createdAt: (v1Manifest.createdAt as number) ?? now,
    updatedAt: (v1Manifest.updatedAt as number) ?? now,
  };

  return normalizeProjectData({
    id: crypto.randomUUID(),
    title,
    visibility: 'private',
    documents: [doc],
    activeDocumentId: docId,
    chatHistory,
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: (v1Manifest.createdAt as number) ?? now,
    updatedAt: (v1Manifest.updatedAt as number) ?? now,
  });
}
