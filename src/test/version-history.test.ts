/**
 * Version history and project snapshot tests.
 *
 * Tests cover:
 * 1. serializeProjectSnapshot / deserializeProjectSnapshot round-trip
 * 2. Deleted documents are excluded from the snapshot
 * 3. Project-scoped repo paths (A and B use different dirs)
 * 4. Document field coverage through snapshot
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const versionHistoryMock = vi.hoisted(() => {
  interface CommitRecord {
    oid: string;
    message: string;
    timestamp: number;
    files: Map<string, string | Uint8Array>;
  }

  const files = new Map<string, string | Uint8Array>();
  const dirs = new Set<string>(['/']);
  const commitsByDir = new Map<string, CommitRecord[]>();
  let commitCounter = 0;

  const filesForDir = (dir: string) => {
    const prefix = `${dir}/`;
    const result = new Map<string, string | Uint8Array>();
    for (const [path, content] of files.entries()) {
      if (path.startsWith(prefix)) {
        result.set(path.slice(prefix.length), content);
      }
    }
    return result;
  };

  const latestCommit = (dir: string) => commitsByDir.get(dir)?.[0] ?? null;
  const findCommit = (dir: string, oid: string) =>
    commitsByDir.get(dir)?.find((commit) => commit.oid === oid) ?? null;

  const reset = () => {
    files.clear();
    dirs.clear();
    dirs.add('/');
    commitsByDir.clear();
    commitCounter = 0;
  };

  const git = {
    resolveRef: vi.fn(async ({ dir }: { dir: string }) => {
      if (!latestCommit(dir)) throw new Error('HEAD not found');
      return latestCommit(dir)!.oid;
    }),
    init: vi.fn(async ({ dir }: { dir: string }) => {
      dirs.add(dir);
      commitsByDir.set(dir, commitsByDir.get(dir) ?? []);
    }),
    add: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    statusMatrix: vi.fn(async ({ dir }: { dir: string }) => {
      const current = filesForDir(dir);
      const committed = latestCommit(dir)?.files ?? new Map<string, string>();
      const paths = new Set([...current.keys(), ...committed.keys()]);
      return Array.from(paths).map((path) => [
        path,
        committed.has(path) ? 1 : 0,
        current.has(path) ? 1 : 0,
        current.get(path) === committed.get(path) ? 1 : 2,
      ]);
    }),
    commit: vi.fn(async ({ dir, message }: { dir: string; message: string }) => {
      const oid = `hash-${++commitCounter}`;
      const commit: CommitRecord = {
        oid,
        message,
        timestamp: commitCounter,
        files: filesForDir(dir),
      };
      commitsByDir.set(dir, [commit, ...(commitsByDir.get(dir) ?? [])]);
      return oid;
    }),
    log: vi.fn(async ({ dir }: { dir: string }) =>
      (commitsByDir.get(dir) ?? []).map((commit) => ({
        oid: commit.oid,
        commit: {
          message: commit.message,
          author: {
            timestamp: commit.timestamp,
            name: 'Aura',
          },
        },
      })),
    ),
    readBlob: vi.fn(async ({ dir, oid, filepath }: { dir: string; oid: string; filepath: string }) => {
      const content = findCommit(dir, oid)?.files.get(filepath);
      if (content === undefined) throw new Error(`Blob not found: ${filepath}`);
      return { blob: typeof content === 'string' ? new TextEncoder().encode(content) : content };
    }),
    readTree: vi.fn(async ({ dir, oid, filepath }: { dir: string; oid: string; filepath: string }) => {
      const commit = findCommit(dir, oid);
      if (!commit) throw new Error(`Commit not found: ${oid}`);
      const prefix = `${filepath}/`;
      return {
        tree: Array.from(commit.files.keys())
          .filter((path) => path.startsWith(prefix))
          .map((path) => ({
            type: 'blob',
            path: path.slice(prefix.length),
          })),
      };
    }),
  };

  class MockLightningFS {
    promises = {
      mkdir: async (path: string) => {
        dirs.add(path);
      },
      writeFile: async (path: string, content: unknown) => {
        const value = ArrayBuffer.isView(content)
          ? new Uint8Array(content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength))
          : String(content);
        files.set(path, value);
      },
      readFile: async (path: string) => {
        const content = files.get(path);
        if (content === undefined) throw new Error(`File not found: ${path}`);
        return content;
      },
      readdir: async (path: string) => {
        const prefix = `${path}/`;
        const entries = new Set<string>();
        for (const dirPath of dirs) {
          if (dirPath.startsWith(prefix)) {
            const rest = dirPath.slice(prefix.length);
            const [entry] = rest.split('/');
            if (entry) entries.add(entry);
          }
        }
        for (const filePath of files.keys()) {
          if (filePath.startsWith(prefix)) {
            const rest = filePath.slice(prefix.length);
            const [entry] = rest.split('/');
            if (entry) entries.add(entry);
          }
        }
        return Array.from(entries);
      },
      stat: async (path: string) => {
        if (dirs.has(path)) {
          return { isDirectory: () => true };
        }
        if (files.has(path)) {
          return { isDirectory: () => false };
        }
        const prefix = `${path}/`;
        if ([...dirs].some((dirPath) => dirPath.startsWith(prefix)) || [...files.keys()].some((filePath) => filePath.startsWith(prefix))) {
          return { isDirectory: () => true };
        }
        throw new Error(`Path not found: ${path}`);
      },
      unlink: async (path: string) => {
        files.delete(path);
      },
      rmdir: async (path: string) => {
        dirs.delete(path);
      },
    };

    constructor(_name: string, options?: { wipe?: boolean }) {
      if (options?.wipe) reset();
    }
  }

  return {
    git,
    MockLightningFS,
    reset,
  };
});

vi.mock('isomorphic-git', () => ({
  default: versionHistoryMock.git,
}));

vi.mock('@isomorphic-git/lightning-fs', () => ({
  default: versionHistoryMock.MockLightningFS,
}));
import { serializeProjectSnapshot, deserializeProjectSnapshot } from '@/services/storage/projectSnapshot';
import {
  clearAllVersionHistory,
  commitVersion,
  exportProjectGit,
  getRepoDirForProject,
  importProjectGit,
  listVersions,
  readVersionSnapshot,
  validateGitEntryPath,
} from '@/services/storage/versionHistory';
import type { ProjectData } from '@/types/project';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<ProjectData> = {}): ProjectData {
  const id = overrides.id ?? 'proj-test-1';
  return {
    id,
    title: 'Test Project',
    description: '',
    visibility: 'private',
    documents: [],
    activeDocumentId: null,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

function makeDocument(id: string, title = 'Doc') {
  return {
    id,
    title,
    type: 'document' as const,
    contentHtml: `<p>${title}</p>`,
    themeCss: '',
    slideCount: 0,
    order: 0,
    createdAt: 1000,
    updatedAt: 2000,
  };
}

// ── Path isolation tests ──────────────────────────────────────────────────

describe('versionHistory — project-scoped paths', () => {
  beforeEach(async () => {
    await clearAllVersionHistory();
  });

  it('uses /projects/{projectId} as repo directory', () => {
    expect(getRepoDirForProject('proj-aaa')).toBe('/projects/proj-aaa');
    expect(getRepoDirForProject('proj-bbb')).toBe('/projects/proj-bbb');
  });

  it('generates distinct paths for different project IDs', () => {
    const pathA = getRepoDirForProject('proj-alpha');
    const pathB = getRepoDirForProject('proj-beta');
    expect(pathA).not.toBe(pathB);
  });

  it('embeds the project ID verbatim in the path', () => {
    const id = 'a1b2-c3d4-e5f6';
    expect(getRepoDirForProject(id)).toContain(id);
  });

  it('escapes unsafe project IDs before using them as repo paths', () => {
    const dir = getRepoDirForProject('../evil/project');
    const segment = dir.replace('/projects/', '');

    expect(dir.startsWith('/projects/')).toBe(true);
    expect(segment).not.toContain('/');
    expect(segment).not.toContain('..');
  });

  it('keeps commit history isolated per project', async () => {
    const projectA = makeProject({
      id: 'proj-a',
      documents: [makeDocument('doc-a', 'Alpha')],
    });
    const projectB = makeProject({
      id: 'proj-b',
      documents: [makeDocument('doc-b', 'Beta')],
    });

    await commitVersion(projectA, 'Create project A');
    await commitVersion(projectB, 'Create project B');

    const versionsA = await listVersions(projectA.id);
    const versionsB = await listVersions(projectB.id);

    expect(versionsA).toHaveLength(1);
    expect(versionsB).toHaveLength(1);
    expect(versionsA[0]?.message).toBe('Create project A');
    expect(versionsB[0]?.message).toBe('Create project B');
  });

  it('skips no-op commits for an unchanged project snapshot', async () => {
    const project = makeProject({
      id: 'proj-noop',
      documents: [makeDocument('doc-a', 'Alpha')],
    });

    const firstHash = await commitVersion(project, 'Initial project');
    const secondHash = await commitVersion(project, 'No changes');
    const versions = await listVersions(project.id);

    expect(firstHash).toBeTruthy();
    expect(secondHash).toBeNull();
    expect(versions).toHaveLength(1);
  });

  it('removes deleted document files from later snapshots', async () => {
    const firstProject = makeProject({
      id: 'proj-delete',
      documents: [makeDocument('doc-keep', 'Keep'), makeDocument('doc-gone', 'Gone')],
    });
    const secondProject = makeProject({
      ...firstProject,
      documents: [makeDocument('doc-keep', 'Keep')],
      updatedAt: 3000,
    });

    await commitVersion(firstProject, 'Initial documents');
    const latestHash = await commitVersion(secondProject, 'Delete stale document');
    const snapshot = latestHash ? await readVersionSnapshot(firstProject.id, latestHash) : null;

    expect(snapshot).not.toBeNull();
    expect(Object.keys(snapshot?.documents ?? {})).toEqual(['doc-keep.json']);
  });
});

// ── serializeProjectSnapshot tests ───────────────────────────────────────

describe('serializeProjectSnapshot', () => {
  it('produces all expected top-level keys', () => {
    const project = makeProject();
    const snapshot = serializeProjectSnapshot(project);

    expect(Object.keys(snapshot)).toEqual(
      expect.arrayContaining([
        'manifest.json',
        'chat-history.json',
        'project-rules.md',
        'context-policy.json',
        'workflow-presets.json',
        'media.json',
        'memory.json',
      ]),
    );
    expect(snapshot.documents).toBeDefined();
  });

  it('includes one document file per project document', () => {
    const project = makeProject({
      documents: [makeDocument('doc-a', 'Alpha'), makeDocument('doc-b', 'Beta')],
    });
    const snapshot = serializeProjectSnapshot(project);

    expect(Object.keys(snapshot.documents)).toEqual(
      expect.arrayContaining(['doc-a.json', 'doc-b.json']),
    );
  });

  it('excludes deleted documents — only current documents are present', () => {
    const project = makeProject({ documents: [makeDocument('doc-keep')] });
    const snapshot = serializeProjectSnapshot(project);

    expect(Object.keys(snapshot.documents)).toEqual(['doc-keep.json']);
    expect(snapshot.documents['doc-gone.json']).toBeUndefined();
  });

  it('escapes unsafe document IDs before using them as snapshot filenames', () => {
    const project = makeProject({ documents: [makeDocument('../unsafe/doc.name', 'Unsafe')] });
    const snapshot = serializeProjectSnapshot(project);
    const [filename] = Object.keys(snapshot.documents);

    expect(filename).toBe('%2E%2E%2Funsafe%2Fdoc%2Ename.json');
    expect(filename).not.toContain('/');
    expect(filename).not.toContain('..');
  });

  it('encodes project metadata in manifest.json', () => {
    const project = makeProject({
      id: 'proj-abc',
      title: 'My Project',
      description: 'Snapshot coverage',
      sections: { drafts: ['doc-1'], main: [], suggestions: [], issues: [] },
    });
    const snapshot = serializeProjectSnapshot(project);
    const manifest = JSON.parse(snapshot['manifest.json']);

    expect(manifest.id).toBe('proj-abc');
    expect(manifest.title).toBe('My Project');
    expect(manifest.description).toBe('Snapshot coverage');
    expect(manifest.sections.drafts).toEqual(['doc-1']);
  });

  it('encodes project rules markdown', () => {
    const project = makeProject({
      projectRules: { markdown: '# Rules\n- Be good', updatedAt: 1000 },
    });
    const snapshot = serializeProjectSnapshot(project);

    expect(snapshot['project-rules.md']).toBe('# Rules\n- Be good');
  });

  it('produces valid JSON in all JSON files', () => {
    const project = makeProject({ documents: [makeDocument('d1')] });
    const snapshot = serializeProjectSnapshot(project);

    expect(() => JSON.parse(snapshot['manifest.json'])).not.toThrow();
    expect(() => JSON.parse(snapshot['chat-history.json'])).not.toThrow();
    expect(() => JSON.parse(snapshot['context-policy.json'])).not.toThrow();
    expect(() => JSON.parse(snapshot['workflow-presets.json'])).not.toThrow();
    expect(() => JSON.parse(snapshot['media.json'])).not.toThrow();
    expect(() => JSON.parse(snapshot['memory.json'])).not.toThrow();
    expect(() => JSON.parse(snapshot.documents['d1.json']!)).not.toThrow();
  });

  it('preserves artifact pack metadata and source payload in document snapshots', () => {
    const doc = {
      ...makeDocument('deck-1', 'Pack Deck'),
      type: 'presentation' as const,
      artifactManifest: {
        packId: 'presentation/editorial-stage-v1',
        packVersion: '1.0.0',
        designDirectionId: 'editorial-magazine',
        sourcePayloadVersion: 1,
        renderer: 'presentation' as const,
        validationStatus: 'passed' as const,
        updatedAt: 123,
      },
      artifactSourcePayload: {
        schemaVersion: 1,
        packId: 'presentation/editorial-stage-v1',
        packVersion: '1.0.0',
        slides: [{ slideId: 'slide-1', slots: { title: 'Keep source' } }],
      },
    };
    const snapshot = serializeProjectSnapshot(makeProject({ documents: [doc] }));
    const result = deserializeProjectSnapshot(snapshot);

    expect(result.documents[0]?.artifactManifest).toEqual(expect.objectContaining({
      packId: 'presentation/editorial-stage-v1',
      packVersion: '1.0.0',
      renderer: 'presentation',
    }));
    expect(result.documents[0]?.artifactSourcePayload).toEqual(expect.objectContaining({
      schemaVersion: 1,
      packId: 'presentation/editorial-stage-v1',
    }));
  });

  it('preserves runtime artifact preview pointers and preview media in snapshots', () => {
    const doc = {
      ...makeDocument('deck-preview', 'Preview Deck'),
      type: 'presentation' as const,
      artifactPreview: {
        assetId: 'preview-deck-preview',
        relativePath: 'media/artifacts/deck-preview/artifact.preview.png',
        mimeType: 'image/png',
        width: 1280,
        height: 720,
        generatedAt: 3000,
        sourceUpdatedAt: 2000,
        validationProfileId: 'presentation:v1',
      },
    };
    const snapshot = serializeProjectSnapshot(makeProject({
      documents: [doc],
      media: [{
        id: 'preview-deck-preview',
        filename: 'artifact.preview.png',
        mimeType: 'image/png',
        relativePath: 'media/artifacts/deck-preview/artifact.preview.png',
        dataUrl: 'data:image/png;base64,preview',
      }],
    }));
    const result = deserializeProjectSnapshot(snapshot);

    expect(result.documents[0]?.artifactPreview).toEqual(expect.objectContaining({
      assetId: 'preview-deck-preview',
      relativePath: 'media/artifacts/deck-preview/artifact.preview.png',
      mimeType: 'image/png',
      width: 1280,
      height: 720,
      generatedAt: 3000,
      sourceUpdatedAt: 2000,
    }));
    expect(result.media?.[0]).toEqual(expect.objectContaining({
      id: 'preview-deck-preview',
      relativePath: 'media/artifacts/deck-preview/artifact.preview.png',
      dataUrl: 'data:image/png;base64,preview',
    }));
  });
});

// ── deserializeProjectSnapshot tests ─────────────────────────────────────

describe('deserializeProjectSnapshot', () => {
  it('round-trips a project through serialize → deserialize', () => {
    const doc = makeDocument('doc-round', 'Round trip');
    const project = makeProject({ documents: [doc], title: 'Round Trip Project' });
    const snapshot = serializeProjectSnapshot(project);
    const result = deserializeProjectSnapshot(snapshot);

    expect(result.manifest.id).toBe(project.id);
    expect(result.manifest.title).toBe('Round Trip Project');
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.id).toBe('doc-round');
    expect(result.documents[0]?.title).toBe('Round trip');
  });

  it('round-trips memory tree and project metadata', () => {
    const memoryTree = {
      path: 'memory',
      files: [],
      subdirs: [{ path: 'context', files: [], subdirs: [] }],
    };
    const project = makeProject({
      description: 'Important project',
      visibility: 'public',
      sections: { drafts: [], main: ['doc-main'], suggestions: [], issues: [] },
      memoryTree,
    });
    const result = deserializeProjectSnapshot(serializeProjectSnapshot(project));

    expect(result.manifest.description).toBe('Important project');
    expect(result.manifest.visibility).toBe('public');
    expect(result.manifest.sections?.main).toEqual(['doc-main']);
    expect(result.memoryTree?.subdirs[0]?.path).toBe('context');
  });

  it('returns empty documents array when no documents were serialized', () => {
    const project = makeProject();
    const snapshot = serializeProjectSnapshot(project);
    const result = deserializeProjectSnapshot(snapshot);

    expect(result.documents).toHaveLength(0);
  });

  it('returns empty chat history for empty project', () => {
    const project = makeProject();
    const snapshot = serializeProjectSnapshot(project);
    const result = deserializeProjectSnapshot(snapshot);

    expect(result.chatHistory).toEqual([]);
  });

  it('restores all documents when multiple are present', () => {
    const project = makeProject({
      documents: [makeDocument('d1'), makeDocument('d2'), makeDocument('d3')],
    });
    const snapshot = serializeProjectSnapshot(project);
    const result = deserializeProjectSnapshot(snapshot);

    expect(result.documents).toHaveLength(3);
    const ids = result.documents.map((d) => d.id);
    expect(ids).toContain('d1');
    expect(ids).toContain('d2');
    expect(ids).toContain('d3');
  });
});

// ── snapshot document field coverage ─────────────────────────────────────

describe('snapshot document field coverage', () => {
  it('preserves type, contentHtml, lifecycleState, order, chartSpecs on documents', () => {
    const doc = {
      ...makeDocument('doc-rich', 'Rich Doc'),
      type: 'presentation' as const,
      contentHtml: '<section>slide</section>',
      lifecycleState: 'published' as const,
      order: 3,
    };
    const project = makeProject({ documents: [doc] });
    const snapshot = serializeProjectSnapshot(project);
    const result = deserializeProjectSnapshot(snapshot);
    const restored = result.documents[0]!;

    expect(restored.type).toBe('presentation');
    expect(restored.contentHtml).toBe('<section>slide</section>');
    expect(restored.lifecycleState).toBe('published');
    expect(restored.order).toBe(3);
  });

  it('preserves document createdAt and updatedAt timestamps', () => {
    const doc = { ...makeDocument('doc-ts'), createdAt: 111, updatedAt: 222 };
    const project = makeProject({ documents: [doc] });
    const result = deserializeProjectSnapshot(serializeProjectSnapshot(project));

    expect(result.documents[0]?.createdAt).toBe(111);
    expect(result.documents[0]?.updatedAt).toBe(222);
  });
});

// ── W6: validateGitEntryPath ──────────────────────────────────────────────

describe('validateGitEntryPath', () => {
  it('accepts normal relative paths', () => {
    expect(validateGitEntryPath('HEAD')).toBe(true);
    expect(validateGitEntryPath('objects/ab/cdef1234')).toBe(true);
    expect(validateGitEntryPath('refs/heads/main')).toBe(true);
    expect(validateGitEntryPath('packed-refs')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateGitEntryPath('')).toBe(false);
  });

  it('rejects absolute paths', () => {
    expect(validateGitEntryPath('/etc/passwd')).toBe(false);
    expect(validateGitEntryPath('/objects/foo')).toBe(false);
  });

  it('rejects directory traversal with ..', () => {
    expect(validateGitEntryPath('../etc/passwd')).toBe(false);
    expect(validateGitEntryPath('objects/../../etc/passwd')).toBe(false);
    expect(validateGitEntryPath('refs/../../../secret')).toBe(false);
  });

  it('rejects paths with . segments', () => {
    expect(validateGitEntryPath('./HEAD')).toBe(false);
    expect(validateGitEntryPath('objects/./foo')).toBe(false);
  });

  it('rejects backslashes, empty segments, and null bytes', () => {
    expect(validateGitEntryPath('objects\\aa\\bbbb')).toBe(false);
    expect(validateGitEntryPath('objects//bbbb')).toBe(false);
    expect(validateGitEntryPath('objects/aa/\0bbbb')).toBe(false);
  });
});

// ── W6: git history import/export ─────────────────────────────────────────

describe('project git history import/export', () => {
  beforeEach(async () => {
    await clearAllVersionHistory();
  });

  it('rejects unsafe git paths during import instead of silently filtering them', async () => {
    await expect(importProjectGit('history-project', [
      { path: 'HEAD', content: new TextEncoder().encode('ref: refs/heads/main\n') },
      { path: '../outside', content: new Uint8Array([1]) },
    ])).rejects.toThrow('Invalid git history path');
  });

  it('rejects empty git history imports', async () => {
    await expect(importProjectGit('history-project', [])).rejects.toThrow('Cannot import empty git history');
  });

  it('replaces an existing repo when importing history for the same project id', async () => {
    await importProjectGit('history-project', [
      { path: 'HEAD', content: new TextEncoder().encode('ref: refs/heads/main\n') },
      { path: 'objects/aa/stale', content: new Uint8Array([1]) },
    ]);

    await importProjectGit('history-project', [
      { path: 'HEAD', content: new TextEncoder().encode('ref: refs/heads/restored\n') },
    ]);

    const entries = await exportProjectGit('history-project');
    expect(entries.map((entry) => entry.path).sort()).toEqual(['HEAD']);
    expect(new TextDecoder().decode(entries[0]?.content)).toBe('ref: refs/heads/restored\n');
  });
});

// ── W6: hasHistory manifest flag ──────────────────────────────────────────

describe('hasHistory manifest flag', () => {
  it('serializeProjectSnapshot does not include hasHistory (that is a .aura manifest concern)', () => {
    const project = makeProject();
    const snapshot = serializeProjectSnapshot(project);
    const manifest = JSON.parse(snapshot['manifest.json']) as Record<string, unknown>;
    // The git snapshot manifest is separate from the .aura ProjectManifest
    // so hasHistory should not appear in the snapshot manifest
    expect(manifest).not.toHaveProperty('hasHistory');
  });

  it('deserializeProjectSnapshot round-trip is unaffected by hasHistory being absent', () => {
    const project = makeProject({ title: 'No History Project' });
    const snapshot = serializeProjectSnapshot(project);
    const result = deserializeProjectSnapshot(snapshot);
    expect(result.manifest.title).toBe('No History Project');
  });
});
