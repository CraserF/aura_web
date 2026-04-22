/**
 * Chat workflow utilities — helpers for routing chat messages to the
 * correct AI workflow (document vs. presentation vs. spreadsheet).
 */

/**
 * Detect whether a user prompt should trigger the document, presentation, or
 * spreadsheet workflow.
 *
 * If `activeDocType` is provided (i.e. the user has a document open and
 * `userLockedDocType` is true), it is returned immediately — keyword detection
 * is skipped. This preserves the user's explicit document-type selection.
 */
export function detectWorkflowType(
  prompt: string,
  activeDocType?: 'document' | 'presentation' | 'spreadsheet',
): 'document' | 'presentation' | 'spreadsheet' {
  if (activeDocType) return activeDocType;
  const p = prompt.toLowerCase();

  const spreadsheetKeywords = [
    'spreadsheet', 'sheet', 'table', 'csv', 'xlsx', 'excel', 'rows', 'columns',
  ];
  if (spreadsheetKeywords.some((k) => p.includes(k))) return 'spreadsheet';

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

  return 'presentation';
}
