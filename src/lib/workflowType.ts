/**
 * Chat workflow utilities — helpers for routing chat messages to the
 * correct AI workflow (document vs. presentation vs. spreadsheet).
 */

/**
 * Detect whether a user prompt should trigger the document, presentation, or
 * spreadsheet workflow, based on keyword detection alone.
 *
 * The caller is responsible for bypassing this when the user has manually
 * locked to a specific document type — see `userLockedDocType` in projectStore.
 */
export function detectWorkflowType(
  prompt: string,
): 'document' | 'presentation' | 'spreadsheet' {
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
