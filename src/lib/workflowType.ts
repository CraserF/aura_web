/**
 * Chat workflow utilities — helpers for routing chat messages to the
 * correct AI workflow (document vs. presentation).
 */

import type { DocumentType } from '@/types/project';

/**
 * Detect whether a user prompt should trigger the document or presentation workflow.
 *
 * Priority order:
 * 1. Explicit presentation keywords → presentation
 * 2. Explicit document keywords → document
 * 3. Active document type (for edits) → that type
 * 4. Default → presentation (preserves prior behaviour)
 */
export function detectWorkflowType(
  prompt: string,
  activeDocType: DocumentType | undefined,
): 'document' | 'presentation' {
  const p = prompt.toLowerCase();

  const presentationKeywords = [
    'slide', 'presentation', 'deck', 'slideshow',
    'pitch', 'keynote', 'powerpoint',
  ];
  if (presentationKeywords.some((k) => p.includes(k))) return 'presentation';

  const documentKeywords = [
    'document', 'doc', 'article', 'report', 'essay', 'note',
    'wiki', 'readme', 'page', 'write', 'draft', 'blog',
  ];
  if (documentKeywords.some((k) => p.includes(k))) return 'document';

  if (activeDocType) return activeDocType;

  return 'presentation';
}
