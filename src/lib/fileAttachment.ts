/**
 * File attachment utilities — reading uploaded files into FileAttachment objects.
 *
 * Supported kinds:
 *  - image/*           → base64 data URI (forwarded to the AI as an image part)
 *  - text/plain | text/markdown | text/csv | application/json | application/xml
 *                      → raw text content (injected into the prompt)
 */

import type { FileAttachment } from '@/types';
import type { ProjectData, ProjectMediaAsset } from '@/types/project';
import { sanitizeFilename } from '@/lib/sanitizeFilename';

/** MIME types treated as plain text for prompt injection */
const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/xml',
  'application/json',
  'application/xml',
]);

/** Maximum size for text files (100 KB) */
const MAX_TEXT_BYTES = 100 * 1024;

/** Maximum size for image files (5 MB) */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Read a File and return a FileAttachment, or null if the file type is unsupported */
export async function readFileAsAttachment(file: File): Promise<FileAttachment | null> {
  const { type: mimeType } = file;

  if (mimeType.startsWith('image/')) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`Image "${file.name}" is too large (max 5 MB).`);
    }
    const content = await readAsDataUrl(file);
    return {
      id: crypto.randomUUID(),
      name: file.name,
      mimeType,
      kind: 'image',
      content,
      channel: 'render',
    };
  }

  // Check text MIME types or fall back to extension-based detection
  const isText =
    TEXT_MIME_TYPES.has(mimeType) ||
    /\.(txt|md|csv|json|xml|html|htm|yaml|yml|toml|ini|log)$/i.test(file.name);

  if (isText) {
    if (file.size > MAX_TEXT_BYTES) {
      throw new Error(`File "${file.name}" is too large for text extraction (max 100 KB).`);
    }
    const content = await readAsText(file);
    return {
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: mimeType || 'text/plain',
      kind: 'text',
      content,
      channel: 'context',
    };
  }

  return null; // Unsupported type
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}"`));
    reader.readAsText(file);
  });
}

/**
 * Build a text block describing text attachments so they can be injected into
 * the prompt alongside the user's message.
 */
export function buildAttachmentContext(attachments: FileAttachment[]): string {
  const textAttachments = attachments.filter((a) => a.kind === 'text' && resolveAttachmentChannel(a) === 'context');
  if (textAttachments.length === 0) return '';

  const blocks = textAttachments.map((a) => {
    const header = `--- Attached file: ${a.name} ---`;
    const footer = `--- End of ${a.name} ---`;
    return `${header}\n${a.content}\n${footer}`;
  });

  return `\n\nAttached files:\n${blocks.join('\n\n')}`;
}

export function resolveAttachmentChannel(attachment: FileAttachment): 'context' | 'render' {
  return attachment.channel ?? 'context';
}

function nextRelativePath(filename: string, existingPaths: Set<string>): string {
  const trimmed = filename.trim() || 'image';
  const dotIndex = trimmed.lastIndexOf('.');
  const rawBase = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  const rawExt = dotIndex > 0 ? trimmed.slice(dotIndex + 1) : '';
  const base = sanitizeFilename(rawBase || 'image') || 'image';
  const ext = rawExt ? `.${sanitizeFilename(rawExt) || 'bin'}` : '';

  let suffix = 0;
  while (true) {
    const candidate = `media/${base}${suffix > 0 ? `-${suffix}` : ''}${ext}`;
    if (!existingPaths.has(candidate)) {
      return candidate;
    }
    suffix += 1;
  }
}

function attachmentToProjectMediaAsset(
  attachment: FileAttachment,
  existingPaths: Set<string>,
): ProjectMediaAsset {
  const relativePath = nextRelativePath(attachment.name, existingPaths);
  existingPaths.add(relativePath);

  return {
    id: crypto.randomUUID(),
    filename: attachment.name,
    mimeType: attachment.mimeType,
    relativePath,
    dataUrl: attachment.content,
  };
}

export function materializeRenderAttachments(
  project: ProjectData,
  attachments: FileAttachment[],
): { project: ProjectData; addedAssets: ProjectMediaAsset[] } {
  const renderAttachments = attachments.filter((attachment) =>
    attachment.kind === 'image' && resolveAttachmentChannel(attachment) === 'render',
  );

  if (renderAttachments.length === 0) {
    return { project, addedAssets: [] };
  }

  const existingMedia = project.media ?? [];
  const existingDataUrls = new Set(existingMedia.map((asset) => asset.dataUrl));
  const existingPaths = new Set(existingMedia.map((asset) => asset.relativePath));
  const addedAssets = renderAttachments
    .filter((attachment) => !existingDataUrls.has(attachment.content))
    .map((attachment) => attachmentToProjectMediaAsset(attachment, existingPaths));

  if (addedAssets.length === 0) {
    return { project, addedAssets: [] };
  }

  return {
    project: {
      ...project,
      media: [...existingMedia, ...addedAssets],
      updatedAt: Date.now(),
    },
    addedAssets,
  };
}
