import { describe, it, expect } from 'vitest';
import { buildAttachmentContext, materializeRenderAttachments, readFileAsAttachment, resolveAttachmentChannel } from '@/lib/fileAttachment';
import type { FileAttachment } from '@/types';
import type { ProjectData } from '@/types/project';

// ─── buildAttachmentContext ────────────────────────────────────────────────

describe('buildAttachmentContext', () => {
  it('returns empty string when there are no attachments', () => {
    expect(buildAttachmentContext([])).toBe('');
  });

  it('returns empty string when there are only image attachments', () => {
    const imageAttachment: FileAttachment = {
      id: '1',
      name: 'photo.png',
      mimeType: 'image/png',
      kind: 'image',
      content: 'data:image/png;base64,abc',
      channel: 'render',
    };
    expect(buildAttachmentContext([imageAttachment])).toBe('');
  });

  it('includes text attachment content in context', () => {
    const textAttachment: FileAttachment = {
      id: '2',
      name: 'notes.txt',
      mimeType: 'text/plain',
      kind: 'text',
      content: 'Here are my notes.',
      channel: 'context',
    };
    const context = buildAttachmentContext([textAttachment]);
    expect(context).toContain('notes.txt');
    expect(context).toContain('Here are my notes.');
  });

  it('includes multiple text attachments', () => {
    const attachments: FileAttachment[] = [
      { id: '1', name: 'a.txt', mimeType: 'text/plain', kind: 'text', content: 'content A', channel: 'context' },
      { id: '2', name: 'b.csv', mimeType: 'text/csv', kind: 'text', content: 'col1,col2', channel: 'context' },
    ];
    const context = buildAttachmentContext(attachments);
    expect(context).toContain('a.txt');
    expect(context).toContain('content A');
    expect(context).toContain('b.csv');
    expect(context).toContain('col1,col2');
  });
});

// ─── readFileAsAttachment ──────────────────────────────────────────────────

describe('readFileAsAttachment', () => {
  it('returns null for unsupported file types', async () => {
    const file = new File(['binary'], 'file.exe', { type: 'application/octet-stream' });
    const result = await readFileAsAttachment(file);
    expect(result).toBeNull();
  });

  it('reads a text file as text kind', async () => {
    const file = new File(['hello world'], 'readme.txt', { type: 'text/plain' });
    const result = await readFileAsAttachment(file);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('text');
    expect(result!.channel).toBe('context');
    expect(result!.content).toBe('hello world');
    expect(result!.name).toBe('readme.txt');
  });

  it('reads a JSON file as text kind', async () => {
    const json = JSON.stringify({ key: 'value' });
    const file = new File([json], 'data.json', { type: 'application/json' });
    const result = await readFileAsAttachment(file);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('text');
    expect(result!.channel).toBe('context');
    expect(result!.content).toContain('"key"');
  });

  it('detects text files by extension when MIME type is missing', async () => {
    const file = new File(['name,age\nAlice,30'], 'data.csv', { type: '' });
    const result = await readFileAsAttachment(file);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('text');
    expect(result!.channel).toBe('context');
  });

  it('throws an error when a text file exceeds the size limit', async () => {
    const bigContent = 'x'.repeat(101 * 1024); // 101 KB
    const file = new File([bigContent], 'big.txt', { type: 'text/plain' });
    await expect(readFileAsAttachment(file)).rejects.toThrow(/too large/);
  });
});

describe('render attachment materialization', () => {
  const baseProject: ProjectData = {
    id: 'project-1',
    title: 'Project',
    visibility: 'private',
    documents: [],
    activeDocumentId: null,
    chatHistory: [],
    media: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };

  it('defaults missing channels to context', () => {
    expect(resolveAttachmentChannel({
      id: 'a1',
      name: 'legacy.txt',
      mimeType: 'text/plain',
      kind: 'text',
      content: 'legacy',
    })).toBe('context');
  });

  it('materializes render-channel images into project media and skips text attachments', () => {
    const { project, addedAssets } = materializeRenderAttachments(baseProject, [
      {
        id: 'a1',
        name: 'hero.png',
        mimeType: 'image/png',
        kind: 'image',
        content: 'data:image/png;base64,abc',
        channel: 'render',
      },
      {
        id: 'a2',
        name: 'notes.txt',
        mimeType: 'text/plain',
        kind: 'text',
        content: 'notes',
        channel: 'context',
      },
    ]);

    expect(addedAssets).toHaveLength(1);
    expect(project.media).toHaveLength(1);
    expect(project.media?.[0]?.relativePath).toBe('media/hero.png');
  });
});
