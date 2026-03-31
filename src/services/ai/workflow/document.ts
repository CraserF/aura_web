/**
 * Document Workflow — Generates beautiful, rich HTML documents.
 *
 * Flow:
 *   CREATE: Plan → Generate HTML document → Sanitize → Return
 *   EDIT:   Plan → Update document HTML → Sanitize → Return
 *
 * Documents are full HTML pages rendered as beautiful articles/notes/reports
 * with rich typography, colors, and visual hierarchy.
 */

import type { LanguageModel, ModelMessage } from 'ai';
import { streamText } from 'ai';
import { createModel } from './engine';
import { withDefaults } from '../middleware';
import { sanitizeHtml } from '@/services/html/sanitizer';
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

const DOCUMENT_SYSTEM_PROMPT = `You are a professional document designer and writer. Create beautiful, richly styled HTML documents.

## Output Format
Produce a COMPLETE HTML document body (no <html>/<head>/<body> tags — just the inner content starting with a styled wrapper div).

## Design Requirements
- Use inline <style> blocks for all CSS — no external stylesheets
- Create visually stunning documents with:
  - Beautiful color palettes (vibrant but readable)
  - Rich typography with font-size hierarchy
  - Generous spacing and padding
  - Cards, callout boxes, and visual sections
  - Color-coded headings and accents
  - Tasteful gradients and backgrounds
  - Icons using Unicode emoji or CSS shapes
- Make it look like a premium Notion page or beautiful Medium article

## Content Requirements
- Structure content with clear headings (h1, h2, h3)
- Use lists, tables, and visual elements liberally
- Add emoji for visual interest where appropriate
- Write substantive, informative content

## Technical Requirements
- ALL styles must be inline (in a <style> tag at the top of the document body)
- NO external links, NO JavaScript, NO event handlers
- Use only relative links for cross-document navigation
- Image placeholders: use CSS background gradients or Unicode icons
- The document must look beautiful when rendered in an iframe

## Color Palette Guide
Choose a cohesive palette for the document. Examples:
- Ocean: #0f4c81 primary, #e8f4f8 bg, #00b4d8 accent
- Forest: #2d6a4f primary, #f0f4e8 bg, #52b788 accent  
- Sunset: #c77dff primary, #f8f0ff bg, #ff6b6b accent
- Professional: #1a1a2e primary, #f8f9fa bg, #e94560 accent
- Warm: #e76f51 primary, #fdf4f0 bg, #f4a261 accent

Output ONLY the HTML content, starting with a <style> tag or a wrapper <div>.`;

const EDIT_DOCUMENT_SYSTEM_PROMPT = `You are a professional document editor. Modify existing HTML documents based on user instructions.

## Task
You will receive existing document HTML and instructions for what to change.
Return the COMPLETE updated document HTML (not just the changed parts).

## Requirements
- Preserve the overall design style unless asked to change it
- Make precise edits while maintaining document coherence
- All styles inline (in <style> tags)
- No external links, no JavaScript
- Output ONLY the HTML content`;

function buildCreatePrompt(input: DocumentInput): string {
  const typeHint = input.documentType ? `Document type: ${input.documentType}\n` : '';
  return `${typeHint}Create a document: ${input.prompt}`;
}

function buildEditPrompt(input: DocumentInput): string {
  return `Here is the existing document HTML:

\`\`\`html
${input.existingHtml}
\`\`\`

User instruction: ${input.prompt}

Return the complete updated document HTML.`;
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

  const baseModel: LanguageModel = createModel(llmConfig);
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

    const stream = streamText({
      model,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: 'user', content: userPrompt },
      ],
      abortSignal: signal,
    });

    for await (const chunk of stream.textStream) {
      if (signal?.aborted) break;
      accumulated += chunk;
      onEvent({ type: 'streaming', stepId: 'generate', chunk });
    }

    onEvent({ type: 'progress', message: 'Sanitizing content…', pct: 80 });

    // Sanitize the HTML for security
    const rawHtml = extractDocumentHtml(accumulated);
    const sanitized = sanitizeHtml(rawHtml);

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

/** Extract document HTML from LLM response (may be wrapped in code fences) */
function extractDocumentHtml(raw: string): string {
  // Strip markdown code fences
  const fenceMatch = raw.match(/```html?\n?([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  // If it starts with <style> or <div, it's already raw HTML
  const trimmed = raw.trim();
  if (trimmed.startsWith('<style') || trimmed.startsWith('<div') || trimmed.startsWith('<h1')) {
    return trimmed;
  }

  return trimmed;
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
  // Take first ~50 chars, capitalize first word
  const clean = prompt.replace(/['"]/g, '').trim();
  const words = clean.split(/\s+/).slice(0, 6).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
