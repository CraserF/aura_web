/**
 * Version History — isomorphic-git wrapper for client-side Git.
 *
 * Provides automatic project versioning using Git under the hood.
 * All operations happen in-browser using lightning-fs (IndexedDB).
 *
 * The repo is stored under a virtual filesystem path "/aura-project".
 * Each AI generation commit is created automatically by the agent workflow.
 * Users can browse history and restore to any past commit.
 */

import { Buffer } from 'buffer';
import git from 'isomorphic-git';
import LightningFS from '@isomorphic-git/lightning-fs';
import type { ProjectData } from '@/types/project';
import type { VersionEntry } from '@/types/project';

const FS_NAME = 'aura-project-fs';
const REPO_DIR = '/project';
const AUTHOR = { name: 'Aura', email: 'aura@local' };
const globalWithBuffer = globalThis as typeof globalThis & { Buffer?: typeof Buffer };

if (!globalWithBuffer.Buffer) {
  globalWithBuffer.Buffer = Buffer;
}

// Singleton filesystem instance
let _fs: InstanceType<typeof LightningFS> | null = null;

function getFs(): InstanceType<typeof LightningFS> {
  if (!_fs) {
    _fs = new LightningFS(FS_NAME);
  }
  return _fs;
}

/** Ensure the git repo is initialised */
async function ensureRepo(): Promise<void> {
  const fs = getFs();
  try {
    await git.resolveRef({ fs, dir: REPO_DIR, ref: 'HEAD' });
  } catch {
    // Not yet initialised — create the repo
    await fs.promises.mkdir(REPO_DIR).catch(() => { /* directory already exists — ignore */ });
    await git.init({ fs, dir: REPO_DIR });
  }
}

/** Serialise the project data to files in the virtual FS */
async function writeProjectFiles(project: ProjectData): Promise<void> {
  const fs = getFs();

  // Write manifest
  await fs.promises.writeFile(
    `${REPO_DIR}/manifest.json`,
    JSON.stringify(
      {
        id: project.id,
        title: project.title,
        activeDocumentId: project.activeDocumentId,
        updatedAt: project.updatedAt,
      },
      null,
      2,
    ),
  );

  // Write each document
    await fs.promises.mkdir(`${REPO_DIR}/documents`).catch(() => { /* directory already exists — ignore */ });
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
      parentId: doc.parentId,
      pagesEnabled: doc.pagesEnabled,
      chartSpecs: doc.chartSpecs,
      workbook: doc.workbook,
      linkedTableRefs: doc.linkedTableRefs,
      order: doc.order,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    await fs.promises.writeFile(
      `${REPO_DIR}/documents/${doc.id}.json`,
      JSON.stringify(docObj, null, 2),
    );
  }

  // Write chat history
  await fs.promises.writeFile(
    `${REPO_DIR}/chat-history.json`,
    JSON.stringify(project.chatHistory, null, 2),
  );

  await fs.promises.writeFile(
    `${REPO_DIR}/project-rules.md`,
    project.projectRules?.markdown ?? '',
  );
  await fs.promises.writeFile(
    `${REPO_DIR}/context-policy.json`,
    JSON.stringify(project.contextPolicy ?? {}, null, 2),
  );
  await fs.promises.writeFile(
    `${REPO_DIR}/workflow-presets.json`,
    JSON.stringify(project.workflowPresets ?? {}, null, 2),
  );
  await fs.promises.writeFile(
    `${REPO_DIR}/media.json`,
    JSON.stringify(project.media ?? [], null, 2),
  );
}

/** Stage all files and create a commit */
async function stageAndCommit(message: string): Promise<string> {
  const fs = getFs();

  await git.add({ fs, dir: REPO_DIR, filepath: '.' });
  const hash = await git.commit({
    fs,
    dir: REPO_DIR,
    author: AUTHOR,
    message,
  });
  return hash;
}

// ── Public API ─────────────────────────────────────────────

/**
 * Record a new version of the project with a commit message.
 * Called automatically after each AI generation.
 */
export async function commitVersion(
  project: ProjectData,
  message: string,
): Promise<string> {
  try {
    await ensureRepo();
    await writeProjectFiles(project);
    const hash = await stageAndCommit(message);
    return hash;
  } catch (err) {
    console.warn('[VersionHistory] commit failed:', err);
    return '';
  }
}

/**
 * List all commits in reverse chronological order.
 */
export async function listVersions(): Promise<VersionEntry[]> {
  try {
    await ensureRepo();
    const fs = getFs();
    const commits = await git.log({ fs, dir: REPO_DIR, depth: 50 });
    return commits.map((c) => ({
      hash: c.oid,
      message: c.commit.message.trim(),
      timestamp: c.commit.author.timestamp * 1000,
      author: c.commit.author.name,
    }));
  } catch {
    return [];
  }
}

/**
 * Read the project snapshot at a specific commit hash.
 * Returns raw JSON strings for the caller to parse.
 */
export async function readVersionSnapshot(hash: string): Promise<{
  manifest: string;
  documents: Record<string, string>;
  chatHistory: string;
  projectRules: string;
  contextPolicy: string;
  workflowPresets: string;
  media: string;
} | null> {
  try {
    const fs = getFs();

    const readBlob = async (path: string): Promise<string> => {
      const { blob } = await git.readBlob({ fs, dir: REPO_DIR, oid: hash, filepath: path });
      return new TextDecoder().decode(blob);
    };

    // List document files from the commit tree
    const { tree } = await git.readTree({ fs, dir: REPO_DIR, oid: hash, filepath: 'documents' }).catch(() => ({ tree: [] }));
    const documentEntries: Record<string, string> = {};
    for (const entry of tree) {
      if (entry.type === 'blob' && entry.path.endsWith('.json')) {
        const content = await readBlob(`documents/${entry.path}`);
        documentEntries[entry.path] = content;
      }
    }

    return {
      manifest: await readBlob('manifest.json'),
      documents: documentEntries,
      chatHistory: await readBlob('chat-history.json').catch(() => '[]'),
      projectRules: await readBlob('project-rules.md').catch(() => ''),
      contextPolicy: await readBlob('context-policy.json').catch(() => 'null'),
      workflowPresets: await readBlob('workflow-presets.json').catch(() => 'null'),
      media: await readBlob('media.json').catch(() => '[]'),
    };
  } catch (err) {
    console.warn('[VersionHistory] readSnapshot failed:', err);
    return null;
  }
}

/**
 * Reset the virtual FS (useful for testing or project reset).
 */
export async function clearVersionHistory(): Promise<void> {
  _fs = null;
  const newFs = new LightningFS(FS_NAME, { wipe: true });
  _fs = newFs;
}
