/**
 * Document Workflow — Generates polished documents via a markdown-first flow.
 *
 * Flow:
 *   CREATE: Prompt for structured markdown → render into premium HTML → sanitize → return
 *   EDIT:   Summarize existing document → update markdown → render → sanitize → return
 */

import type { LanguageModel, ModelMessage } from 'ai';
import { streamText } from 'ai';
import { createModel } from './engine';
import { withDefaults } from '../middleware';
import { sanitizeHtml } from '@/services/html/sanitizer';
import { CACHE_CONTROL } from './engine';
import { aiDebugLog, logPromptMetrics } from '../debug';
import type {
  LLMConfig,
  EventListener,
} from './types';
import type { AIMessage } from '../types';
import { toModelMessages } from './engine';

export interface DocumentInput {
  prompt: string;
  existingHtml?: string;
  chatHistory: AIMessage[];
  documentType?: string; // hints like "report", "notes", "wiki", "readme"
}

export interface DocumentOutput {
  html: string;
  title: string;
}

type ResolvedDocumentType = 'report' | 'brief' | 'proposal' | 'notes' | 'wiki' | 'readme' | 'article';

const DOCUMENT_SYSTEM_PROMPT = `You are a professional editorial writer and information designer.
Create polished, presentation-quality documents as STRUCTURED MARKDOWN, not raw HTML.
Aura will render your markdown into a premium HTML document shell automatically.

## Output Format
Return MARKDOWN ONLY.
Do not return HTML unless the user explicitly asks for raw HTML.
Do not wrap the response in explanations.

## Default structure
# Document Title
> One-sentence executive summary / lead

## Section Heading
Short paragraph introducing the section.
- Key point
- Key point
- Key point

### Optional subsection
Use numbered steps, checklists, blockquotes, or tables when useful.

## Writing style
- Elegant, concise, highly scannable
- Short paragraphs (2-4 sentences max)
- Clear headings and subheadings
- Prefer bullets, numbered lists, and compact tables over long prose
- Sound like a premium brief, memo, report, wiki page, or proposal
- Make the content feel well-structured and intentional, like a document equivalent of a well-designed deck

## Content rules
- Start with a strong title and a short lead summary
- Use 3-6 major sections unless the user asks for something shorter or longer
- Keep headings concrete and informative
- Use quotes / callouts / tables only when they improve clarity
- No filler, no generic fluff, no walls of text

## Technical rules
- Markdown only
- No raw HTML unless explicitly requested
- No JavaScript
- Relative links only if links are necessary`;

const EDIT_DOCUMENT_SYSTEM_PROMPT = `You are a professional document editor.
You will receive a concise outline of the current document and a requested change.
Return the COMPLETE updated document as STRUCTURED MARKDOWN.

## Rules
- Preserve the document's tone and information hierarchy unless explicitly asked to change them
- APPEND by default when the user adds new material
- Prefer tightening and clarifying over rewriting everything
- Keep the result highly scannable with strong headings, bullets, callouts, and short paragraphs
- Return markdown only`;

interface DocumentTheme {
  name: string;
  label: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  primary: string;
  accent: string;
  text: string;
  muted: string;
}

function inferDocumentType(prompt: string): ResolvedDocumentType {
  const normalized = prompt.toLowerCase();
  if (/\b(readme|setup guide|developer guide|installation)\b/.test(normalized)) return 'readme';
  if (/\b(wiki|knowledge base|reference|documentation)\b/.test(normalized)) return 'wiki';
  if (/\b(notes?|meeting notes?|minutes|summary notes)\b/.test(normalized)) return 'notes';
  if (/\b(proposal|pitch|plan|roadmap)\b/.test(normalized)) return 'proposal';
  if (/\b(brief|one-pager|memo|overview)\b/.test(normalized)) return 'brief';
  if (/\b(report|analysis|findings|assessment|review)\b/.test(normalized)) return 'report';
  return 'article';
}

function resolveDocumentType(input: DocumentInput): ResolvedDocumentType {
  const hinted = input.documentType?.trim().toLowerCase();
  switch (hinted) {
    case 'report':
    case 'brief':
    case 'proposal':
    case 'notes':
    case 'wiki':
    case 'readme':
    case 'article':
      return hinted;
    default:
      return inferDocumentType(input.prompt);
  }
}

function buildCreatePrompt(input: DocumentInput): string {
  const documentType = resolveDocumentType(input);
  return `Document type: ${documentType}

${getDocumentStructureGuide(documentType)}

User request: ${input.prompt}

Return MARKDOWN ONLY.`;
}

function buildEditPrompt(input: DocumentInput): string {
  const documentType = resolveDocumentType(input);
  const existingSummary = summarizeExistingDocument(input.existingHtml ?? '');

  return `Document type: ${documentType}

Existing document outline:
\`\`\`markdown
${existingSummary}
\`\`\`

User instruction: ${input.prompt}

IMPORTANT:
- Append new sections by default unless the user asked to rewrite or replace content
- Preserve the document's structure and tone where possible
- Return the COMPLETE updated document as MARKDOWN ONLY.`;
}

function getDocumentStructureGuide(documentType: ResolvedDocumentType): string {
  switch (documentType) {
    case 'report':
      return `Suggested structure:
- # Title
- > Executive summary
- ## Key findings
- ## Analysis
- ## Recommendations / next steps
Use bullets and compact tables where useful.`;
    case 'proposal':
      return `Suggested structure:
- # Title
- > Short value proposition
- ## Context / problem
- ## Proposed approach
- ## Benefits / outcomes
- ## Next steps`;
    case 'brief':
      return `Suggested structure:
- # Title
- > One-paragraph overview
- ## Context
- ## Key points
- ## Recommended action`;
    case 'notes':
      return `Suggested structure:
- # Title
- > Short summary
- ## Highlights
- ## Decisions / takeaways
- ## Action items`;
    case 'wiki':
    case 'readme':
      return `Suggested structure:
- # Title
- > Quick overview
- ## Overview / purpose
- ## Key sections or steps
- ## Reference details
Use numbered lists and code fences where helpful.`;
    default:
      return `Suggested structure:
- # Title
- > Lead summary
- ## Main sections with concise paragraphs and bullets
- ## Closing takeaway or next steps`;
  }
}

function pickDocumentTheme(prompt: string, documentType: ResolvedDocumentType): DocumentTheme {
  const normalized = prompt.toLowerCase();

  if (/\b(health|care|climate|sustainab|nature|education|community)\b/.test(normalized)) {
    return {
      name: 'forest',
      label: 'Field Notes',
      bg: '#f3f8f4',
      surface: '#ffffff',
      surfaceAlt: '#eef7f0',
      border: '#d7e7db',
      primary: '#2d6a4f',
      accent: '#52b788',
      text: '#183024',
      muted: '#587164',
    };
  }

  if (/\b(product|design|creative|brand|marketing|story)\b/.test(normalized)) {
    return {
      name: 'studio',
      label: 'Studio Brief',
      bg: '#faf7ff',
      surface: '#ffffff',
      surfaceAlt: '#f4eeff',
      border: '#e7ddff',
      primary: '#6d4aff',
      accent: '#ff6b9a',
      text: '#261b44',
      muted: '#6c6289',
    };
  }

  if (documentType === 'notes' || documentType === 'wiki' || documentType === 'readme') {
    return {
      name: 'slate',
      label: 'Structured Notes',
      bg: '#f6f8fb',
      surface: '#ffffff',
      surfaceAlt: '#eef2f8',
      border: '#dbe4f0',
      primary: '#2457a6',
      accent: '#0ea5e9',
      text: '#182536',
      muted: '#5d6d82',
    };
  }

  return {
    name: 'professional',
    label: 'Executive Document',
    bg: '#f7f9fc',
    surface: '#ffffff',
    surfaceAlt: '#eef3f9',
    border: '#dbe5f0',
    primary: '#1f4b99',
    accent: '#0ea5e9',
    text: '#162235',
    muted: '#617287',
  };
}

export interface RunDocumentWorkflowOptions {
  input: DocumentInput;
  llmConfig: LLMConfig;
  onEvent: EventListener;
  signal?: AbortSignal;
}

/**
 * Run the document generation workflow.
 */
export async function runDocumentWorkflow(
  opts: RunDocumentWorkflowOptions,
): Promise<DocumentOutput> {
  const { input, llmConfig, onEvent, signal } = opts;
  const isEdit = !!input.existingHtml;

  const baseModel: LanguageModel = await createModel(llmConfig);
  const model = withDefaults(baseModel);

  try {
    onEvent({ type: 'step-start', stepId: 'generate', label: isEdit ? 'Updating document…' : 'Writing document…' });
    onEvent({ type: 'progress', message: isEdit ? 'Applying changes…' : 'Crafting your document…', pct: 20 });

    const systemPrompt = isEdit ? EDIT_DOCUMENT_SYSTEM_PROMPT : DOCUMENT_SYSTEM_PROMPT;
    const userPrompt = isEdit ? buildEditPrompt(input) : buildCreatePrompt(input);

    const historyMessages: ModelMessage[] = toModelMessages(
      input.chatHistory.slice(-6), // Keep last 6 messages for context
    );

    let accumulated = '';

    const requestMessages: ModelMessage[] = [
      { role: 'system', content: systemPrompt, providerOptions: CACHE_CONTROL } as ModelMessage,
      ...historyMessages,
      { role: 'user', content: userPrompt },
    ];

    logPromptMetrics('document', requestMessages, {
      isEdit,
      documentType: resolveDocumentType(input),
    });

    const stream = streamText({
      model,
      messages: requestMessages,
      maxOutputTokens: 16384,
      abortSignal: signal,
    });

    for await (const chunk of stream.textStream) {
      if (signal?.aborted) break;
      accumulated += chunk;
      onEvent({ type: 'streaming', stepId: 'generate', chunk });
    }

    onEvent({ type: 'progress', message: 'Structuring document…', pct: 72 });

    const rawContent = extractDocumentSource(accumulated);
    const renderedHtml = renderDocumentContent(rawContent, input);
    aiDebugLog('document', 'document render mode', {
      mode: looksLikeHtml(rawContent) ? 'html' : 'markdown',
      rawChars: rawContent.length,
      renderedChars: renderedHtml.length,
    });

    onEvent({ type: 'progress', message: 'Sanitizing content…', pct: 84 });

    // Sanitize the HTML for security
    const sanitized = sanitizeHtml(renderedHtml);

    onEvent({ type: 'step-done', stepId: 'generate', label: isEdit ? 'Updating document…' : 'Writing document…' });
    onEvent({ type: 'progress', message: 'Done!', pct: 100 });

    const title = extractDocumentTitle(sanitized) || extractTitleFromPrompt(input.prompt);

    const output: DocumentOutput = {
      html: sanitized,
      title,
    };

    onEvent({ type: 'complete', result: output });
    return output;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    const message = err instanceof Error ? err.message : String(err);
    onEvent({ type: 'step-error', stepId: 'generate', error: message });
    throw err;
  }
}

/** Extract document content from LLM response (markdown or html, optionally fenced) */
function extractDocumentSource(raw: string): string {
  const fenceMatch = raw.match(/```(?:html|markdown|md)?\n?([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  return raw.trim();
}

function looksLikeHtml(content: string): boolean {
  const trimmed = content.trim().toLowerCase();
  return trimmed.startsWith('<style')
    || trimmed.startsWith('<div')
    || trimmed.startsWith('<article')
    || trimmed.startsWith('<section')
    || trimmed.startsWith('<h1')
    || trimmed.startsWith('<p');
}

function renderDocumentContent(rawContent: string, input: DocumentInput): string {
  if (!rawContent.trim()) return '<div></div>';
  if (looksLikeHtml(rawContent)) return rawContent;

  const documentType = resolveDocumentType(input);
  const theme = pickDocumentTheme(input.prompt, documentType);
  return renderMarkdownDocument(rawContent, theme, documentType);
}

function renderMarkdownDocument(
  markdown: string,
  theme: DocumentTheme,
  documentType: ResolvedDocumentType,
): string {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  const titleMatch = normalized.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || 'Document';
  const withoutTitle = normalized.replace(/^#\s+.+$(\n)?/m, '').trim();

  const firstH2Index = withoutTitle.search(/^##\s+/m);
  const lead = firstH2Index >= 0 ? withoutTitle.slice(0, firstH2Index).trim() : withoutTitle;
  const sections = firstH2Index >= 0
    ? withoutTitle.slice(firstH2Index).split(/\n(?=##\s+)/g).filter(Boolean)
    : [];

  const leadHtml = lead ? renderMarkdownBlocks(lead, { lead: true }) : '';
  const sectionHtml = sections.length > 0
    ? sections.map((section) => renderMarkdownSection(section)).join('\n')
    : `<section class="doc-section">${renderMarkdownBlocks(withoutTitle)}</section>`;

  return `<style>
.doc-shell {
  --doc-bg: ${theme.bg};
  --doc-surface: ${theme.surface};
  --doc-surface-alt: ${theme.surfaceAlt};
  --doc-border: ${theme.border};
  --doc-primary: ${theme.primary};
  --doc-accent: ${theme.accent};
  --doc-text: ${theme.text};
  --doc-muted: ${theme.muted};
  color: var(--doc-text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.doc-shell * { box-sizing: border-box; }
.doc-shell {
  max-width: 920px;
  margin: 0 auto;
  padding: 28px 24px 48px;
}
.doc-prose {
  display: grid;
  gap: 18px;
}
.doc-header {
  padding: 24px 26px;
  border-radius: 20px;
  border: 1px solid var(--doc-border);
  background: linear-gradient(135deg, var(--doc-surface) 0%, var(--doc-surface-alt) 100%);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}
.doc-eyebrow {
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--doc-primary);
}
.doc-shell h1 {
  margin: 0;
  font-size: 38px;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: var(--doc-text);
}
.doc-shell h2 {
  margin: 0 0 12px;
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--doc-text);
}
.doc-shell h3 {
  margin: 18px 0 8px;
  font-size: 16px;
  line-height: 1.35;
  color: var(--doc-text);
}
.doc-lead {
  margin: 0;
  font-size: 17px;
  line-height: 1.7;
  color: var(--doc-muted);
}
.doc-section {
  padding: 20px 22px;
  border-radius: 18px;
  border: 1px solid var(--doc-border);
  background: var(--doc-surface);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}
.doc-shell p {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--doc-text);
}
.doc-shell ul,
.doc-shell ol {
  margin: 0 0 14px;
  padding-left: 1.2rem;
}
.doc-shell li {
  margin: 0.35rem 0;
  line-height: 1.6;
}
.doc-shell blockquote {
  margin: 14px 0;
  padding: 12px 14px;
  border-left: 4px solid var(--doc-primary);
  border-radius: 12px;
  background: var(--doc-surface-alt);
  color: var(--doc-muted);
}
.doc-shell code {
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.06);
  font-family: 'SFMono-Regular', 'SF Mono', Menlo, monospace;
  font-size: 0.92em;
}
.doc-shell pre {
  margin: 14px 0;
  padding: 14px 16px;
  border-radius: 12px;
  overflow: auto;
  background: #0f172a;
  color: #e2e8f0;
}
.doc-shell pre code {
  padding: 0;
  background: transparent;
  color: inherit;
}
.doc-shell table {
  width: 100%;
  margin: 12px 0 16px;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 12px;
}
.doc-shell th,
.doc-shell td {
  padding: 10px 12px;
  border: 1px solid var(--doc-border);
  text-align: left;
  vertical-align: top;
}
.doc-shell th {
  background: var(--doc-surface-alt);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--doc-muted);
}
.doc-shell hr {
  margin: 16px 0;
  border: none;
  border-top: 1px solid var(--doc-border);
}
.doc-shell a {
  color: var(--doc-primary);
  text-decoration: none;
}
</style>
<article class="doc-shell">
  <div class="doc-prose">
    <header class="doc-header">
      <div class="doc-eyebrow">${theme.label} · ${documentType}</div>
      <h1>${escapeHtml(title)}</h1>
    </header>
    ${leadHtml}
    ${sectionHtml}
  </div>
</article>`;
}

function renderMarkdownSection(sectionMarkdown: string): string {
  const lines = sectionMarkdown.trim().split('\n');
  const headingLine = lines.shift() ?? '## Section';
  const heading = headingLine.replace(/^##\s+/, '').trim();
  return `<section class="doc-section"><h2>${renderInlineMarkdown(heading)}</h2>${renderMarkdownBlocks(lines.join('\n'))}</section>`;
}

function renderMarkdownBlocks(markdown: string, options?: { lead?: boolean }): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeLines: string[] = [];

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = renderInlineMarkdown(paragraph.join(' '));
    const className = options?.lead ? ' class="doc-lead"' : '';
    html.push(`<p${className}>${text}</p>`);
    paragraph = [];
    if (options) options.lead = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const line = rawLine.trimEnd();

    if (inCode) {
      if (/^```/.test(line.trim())) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLines = [];
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }

    if (/^```/.test(line.trim())) {
      flushParagraph();
      closeLists();
      inCode = true;
      codeLines = [];
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeLists();
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) {
      flushParagraph();
      closeLists();
      const { tableHtml, nextIndex } = consumeMarkdownTable(lines, i);
      html.push(tableHtml);
      i = nextIndex;
      continue;
    }

    if (/^###\s+/.test(line.trim())) {
      flushParagraph();
      closeLists();
      html.push(`<h3>${renderInlineMarkdown(line.trim().replace(/^###\s+/, ''))}</h3>`);
      continue;
    }

    if (/^>\s?/.test(line.trim())) {
      flushParagraph();
      closeLists();
      const quoteLines = [line.trim().replace(/^>\s?/, '')];
      while (i + 1 < lines.length && /^>\s?/.test((lines[i + 1] ?? '').trim())) {
        i += 1;
        quoteLines.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
      }
      html.push(`<blockquote>${renderInlineMarkdown(quoteLines.join(' '))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      if (!inUl) {
        if (inOl) {
          html.push('</ol>');
          inOl = false;
        }
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${renderInlineMarkdown(normalizeTaskMarkup(line.replace(/^\s*[-*]\s+/, '')))}</li>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph();
      if (!inOl) {
        if (inUl) {
          html.push('</ul>');
          inUl = false;
        }
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${renderInlineMarkdown(line.replace(/^\s*\d+\.\s+/, ''))}</li>`);
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      html.push('<hr>');
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeLists();
  return html.join('\n');
}

function consumeMarkdownTable(lines: string[], startIndex: number): { tableHtml: string; nextIndex: number } {
  const headerLine = lines[startIndex] ?? '';
  const rows: string[] = [headerLine];
  let i = startIndex + 2; // skip the separator row

  while (i < lines.length && (lines[i] ?? '').includes('|')) {
    rows.push(lines[i] ?? '');
    i += 1;
  }

  const cells = rows.map((row) => row.split('|').map((cell) => cell.trim()).filter(Boolean));
  const headers = cells[0] ?? [];
  const bodyRows = cells.slice(1);

  const tableHtml = `<table><thead><tr>${headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  return { tableHtml, nextIndex: i - 1 };
}

function summarizeExistingDocument(html: string, maxChars: number = 4000): string {
  if (!html.trim()) return '# Untitled Document';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const lines: string[] = [];

  doc.body.querySelectorAll('h1, h2, h3, p, li, blockquote').forEach((el) => {
    const text = el.textContent?.replace(/\s+/g, ' ').trim();
    if (!text) return;

    switch (el.tagName.toLowerCase()) {
      case 'h1':
        lines.push(`# ${text}`);
        break;
      case 'h2':
        lines.push(`## ${text}`);
        break;
      case 'h3':
        lines.push(`### ${text}`);
        break;
      case 'li':
        lines.push(`- ${text}`);
        break;
      case 'blockquote':
        lines.push(`> ${text}`);
        break;
      default:
        lines.push(text);
        break;
    }
  });

  const summary = lines.join('\n').trim() || '# Untitled Document';
  return summary.length > maxChars ? `${summary.slice(0, maxChars)}\n…` : summary;
}

function normalizeTaskMarkup(text: string): string {
  return text
    .replace(/^\[x\]\s*/i, '✅ ')
    .replace(/^\[ \]\s*/i, '⬜ ');
}

function renderInlineMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Extract the title from the document's first h1 or title-like element */
function extractDocumentTitle(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const h1 = doc.querySelector('h1');
  if (h1?.textContent?.trim()) return h1.textContent.trim();

  const title = doc.querySelector('title');
  if (title?.textContent?.trim()) return title.textContent.trim();

  return '';
}

/** Fall back to extracting a title from the user prompt */
function extractTitleFromPrompt(prompt: string): string {
  const clean = prompt.replace(/['"]/g, '').trim();
  const words = clean.split(/\s+/).slice(0, 6).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
