/**
 * Version History — isomorphic-git wrapper for client-side Git.
 *
 * Provides project-scoped versioning using Git under the hood.
 * All operations happen in-browser using lightning-fs (IndexedDB).
 *
 * Each project gets its own git repo at `/projects/{projectId}` inside
 * a shared virtual filesystem. Histories are fully isolated: commits to
 * project A never appear in project B's history.
 */

import { Buffer } from 'buffer';
import git from 'isomorphic-git';
import LightningFS from '@isomorphic-git/lightning-fs';
import type { ProjectData } from '@/types/project';
import type { VersionEntry } from '@/types/project';
import { serializeProjectSnapshot } from '@/services/storage/projectSnapshot';

const FS_NAME = 'aura-project-fs';
const PROJECTS_ROOT = '/projects';
const AUTHOR = { name: 'Aura', email: 'aura@local' };
const globalWithBuffer = globalThis as typeof globalThis & { Buffer?: typeof Buffer };

if (!globalWithBuffer.Buffer) {
  globalWithBuffer.Buffer = Buffer;
}

// Singleton filesystem instance (shared across all projects)
let _fs: InstanceType<typeof LightningFS> | null = null;

function getFs(): InstanceType<typeof LightningFS> {
  if (!_fs) {
    _fs = new LightningFS(FS_NAME);
  }
  return _fs;
}

function repoDir(projectId: string): string {
  const trimmedProjectId = projectId.trim();
  if (!trimmedProjectId) {
    throw new Error('Project id is required for version history.');
  }
  const safeProjectId = encodeURIComponent(trimmedProjectId).replace(/\./g, '%2E');
  return `${PROJECTS_ROOT}/${safeProjectId}`;
}

/** Returns the virtual filesystem repo path for a given project. Exposed for testing. */
export function getRepoDirForProject(projectId: string): string {
  return repoDir(projectId);
}

/** Ensure the git repo exists for the given project */
async function ensureRepo(projectId: string): Promise<void> {
  const fs = getFs();
  const dir = repoDir(projectId);
  try {
    await git.resolveRef({ fs, dir, ref: 'HEAD' });
  } catch {
    // Not yet initialised — create the repo
    await fs.promises.mkdir(PROJECTS_ROOT).catch(() => { /* already exists */ });
    await fs.promises.mkdir(dir).catch(() => { /* already exists */ });
    await git.init({ fs, dir });
  }
}

/** Write snapshot files to the virtual FS for the given project */
async function writeSnapshotFiles(projectId: string, project: ProjectData): Promise<void> {
  const fs = getFs();
  const dir = repoDir(projectId);
  const snapshot = serializeProjectSnapshot(project);

  const topLevelKeys = [
    'manifest.json',
    'chat-history.json',
    'project-rules.md',
    'context-policy.json',
    'workflow-presets.json',
    'media.json',
    'memory.json',
  ] as const;

  for (const key of topLevelKeys) {
    await fs.promises.writeFile(`${dir}/${key}`, snapshot[key]);
  }

  // Ensure documents directory exists
  await fs.promises.mkdir(`${dir}/documents`).catch(() => { /* already exists */ });

  // Remove document files that are no longer in the project
  let existingDocFiles: string[] = [];
  try {
    existingDocFiles = await fs.promises.readdir(`${dir}/documents`) as string[];
  } catch { /* directory not yet created — nothing to clean */ }

  const expectedDocNames = new Set(Object.keys(snapshot.documents));
  for (const existing of existingDocFiles) {
    if (!expectedDocNames.has(existing)) {
      await fs.promises.unlink(`${dir}/documents/${existing}`).catch(() => {});
      await git.remove({ fs, dir, filepath: `documents/${existing}` }).catch(() => {});
    }
  }

  for (const [filename, content] of Object.entries(snapshot.documents)) {
    await fs.promises.writeFile(`${dir}/documents/${filename}`, content);
  }
}

/** Stage all files and create a commit; returns null if nothing changed */
async function stageAndCommit(projectId: string, message: string): Promise<string | null> {
  const fs = getFs();
  const dir = repoDir(projectId);

  await git.add({ fs, dir, filepath: '.' });

  // Skip no-op commits when HEAD already exists
  let hasHead = true;
  try {
    await git.resolveRef({ fs, dir, ref: 'HEAD' });
  } catch {
    hasHead = false;
  }

  if (hasHead) {
    const statusMatrix = await git.statusMatrix({ fs, dir });
    // Each row: [filepath, HEAD, workdir, stage] — stage === 1 means identical to HEAD
    const hasChanges = statusMatrix.some(([, , , stage]) => stage !== 1);
    if (!hasChanges) return null;
  }

  const hash = await git.commit({
    fs,
    dir,
    author: AUTHOR,
    message,
  });
  return hash;
}

// ── Public API ─────────────────────────────────────────────

/**
 * Record a new version of the project with a commit message.
 * Uses project.id to determine the repo path.
 * Returns the commit hash on success or null on failure/no-op.
 */
export async function commitVersion(
  project: ProjectData,
  message: string,
): Promise<string | null> {
  try {
    await ensureRepo(project.id);
    await writeSnapshotFiles(project.id, project);
    const hash = await stageAndCommit(project.id, message);
    return hash;
  } catch (err) {
    console.warn('[VersionHistory] commit failed:', err);
    return null;
  }
}

/**
 * List all commits for a project in reverse chronological order.
 */
export async function listVersions(projectId: string): Promise<VersionEntry[]> {
  try {
    await ensureRepo(projectId);
    const fs = getFs();
    const commits = await git.log({ fs, dir: repoDir(projectId), depth: 50 });
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
 * Read the project snapshot at a specific commit hash for a given project.
 */
export async function readVersionSnapshot(
  projectId: string,
  hash: string,
): Promise<{
  manifest: string;
  documents: Record<string, string>;
  chatHistory: string;
  projectRules: string;
  contextPolicy: string;
  workflowPresets: string;
  media: string;
  memory: string;
} | null> {
  try {
    const fs = getFs();
    const dir = repoDir(projectId);

    const readBlob = async (path: string): Promise<string> => {
      const { blob } = await git.readBlob({ fs, dir, oid: hash, filepath: path });
      return new TextDecoder().decode(blob);
    };

    const { tree } = await git.readTree({ fs, dir, oid: hash, filepath: 'documents' }).catch(() => ({ tree: [] }));
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
      memory: await readBlob('memory.json').catch(() => 'null'),
    };
  } catch (err) {
    console.warn('[VersionHistory] readSnapshot failed:', err);
    return null;
  }
}

/**
 * Wipe all version history (all projects). Used in tests.
 */
export async function clearAllVersionHistory(): Promise<void> {
  _fs = null;
  _fs = new LightningFS(FS_NAME, { wipe: true });
}
