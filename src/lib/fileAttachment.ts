/**
 * File attachment utilities — reading uploaded files into FileAttachment objects.
 *
 * Supported kinds:
 *  - image/*           → base64 data URI (forwarded to the AI as an image part)
 *  - text/plain | text/markdown | text/csv | application/json | application/xml
 *                      → raw text content (injected into the prompt)
 */

import type { FileAttachment } from '@/types';

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
  const textAttachments = attachments.filter((a) => a.kind === 'text');
  if (textAttachments.length === 0) return '';

  const blocks = textAttachments.map((a) => {
    const header = `--- Attached file: ${a.name} ---`;
    const footer = `--- End of ${a.name} ---`;
    return `${header}\n${a.content}\n${footer}`;
  });

  return `\n\nAttached files:\n${blocks.join('\n\n')}`;
}
