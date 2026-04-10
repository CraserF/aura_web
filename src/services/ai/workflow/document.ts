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
import { getKnowledge } from '../knowledge';
import { validateDocument } from './agents/document-qa';
import type {
  LLMConfig,
  EventListener,
} from './types';
import type { AIMessage } from '../types';
import { toModelMessages } from './engine';

export interface DocumentInput {
  prompt: string;
  existingHtml?: string;
  existingMarkdown?: string;
  chatHistory: AIMessage[];
  documentType?: string; // hints like "report", "notes", "wiki", "readme"
}

export interface DocumentOutput {
  html: string;
  markdown: string;
  title: string;
}

type ResolvedDocumentType = 'report' | 'brief' | 'proposal' | 'notes' | 'wiki' | 'readme' | 'article';
type ArtDirection = 'clean' | 'polished' | 'editorial';

const DOCUMENT_SYSTEM_PROMPT = `You are a professional editorial designer and writer.
Create polished, beautiful documents where the visual reading experience is the highest priority.

## Preferred output
Return a COMPLETE document body as rich HTML (no <html>, <head>, or <body> tags).
Use semantic HTML and include an inline <style> block at the top when needed.

Structured markdown is acceptable only as a fallback if HTML is genuinely unnecessary.
Prefer premium HTML when it improves beauty and scannability.

## Design goals
- Make it feel like a premium brief, report, memo, proposal, or editorial article
- Strong typography hierarchy
- Beautiful spacing and readable margins
- Clear section rhythm with cards, dividers, quotes, highlights, or stat blocks where appropriate
- Tasteful color accents and polished surfaces
- Visually intentional, not plain text dumped into a page

## Writing rules
- Concise, elegant, highly scannable
- Strong title and short lead summary
- Clear section headings and subheadings
- Short paragraphs, bullets, and compact tables where useful
- No filler, no generic fluff, no walls of text

## Technical rules
- No JavaScript
- No external assets, remote fonts, or external stylesheets
- Use only inline CSS inside a <style> block when styling is needed
- Relative links only if necessary
- Output only the document HTML body or, if truly needed, structured markdown`;

const EDIT_DOCUMENT_SYSTEM_PROMPT = `You are a professional document editor and designer.
You will receive the current document outline and a requested change.
Return the COMPLETE updated document, preserving or improving its beauty and structure.

## Preferred output
Return rich HTML with inline styling when that best preserves quality.
Structured markdown is acceptable only as a fallback.

## Rules
- Preserve the document's tone and information hierarchy unless explicitly asked to change them
- APPEND by default when the user adds new material
- Prefer tightening and clarifying over flattening or simplifying the design
- Keep the result visually polished and highly scannable
- Output only the updated document content`;

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
  shellBg?: string;
  glow?: string;
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

export function deriveDocumentTextSource(html: string): string {
  return summarizeExistingDocument(html);
}

export function renderDocumentFromSource(opts: {
  text: string;
  titleHint?: string;
  prompt?: string;
  documentType?: string;
}): DocumentOutput {
  const prompt = opts.prompt?.trim() || opts.titleHint?.trim() || 'Document';
  const input: DocumentInput = {
    prompt,
    chatHistory: [],
    documentType: opts.documentType,
  };

  const rawContent = opts.text.trim();
  const renderedHtml = renderDocumentContent(rawContent, input);
  const sanitized = sanitizeHtml(renderedHtml);
  const title = extractDocumentTitle(sanitized) || extractTitleFromPrompt(opts.titleHint || prompt);
  const markdown = looksLikeHtml(rawContent)
    ? summarizeExistingDocument(sanitized)
    : rawContent;

  return {
    html: sanitized,
    markdown,
    title,
  };
}

export function renderDocumentTextEdits(opts: {
  existingHtml?: string;
  text: string;
  titleHint?: string;
  prompt?: string;
  documentType?: string;
}): DocumentOutput {
  const fallback = renderDocumentFromSource(opts);
  const existingHtml = opts.existingHtml?.trim();

  if (!existingHtml || !looksLikeHtml(existingHtml)) {
    return fallback;
  }

  try {
    const parser = new DOMParser();
    const existingDoc = parser.parseFromString(existingHtml, 'text/html');
    const updatedDoc = parser.parseFromString(fallback.html, 'text/html');

    const selectors = 'h1, h2, h3, p, li, blockquote, td, th';
    const targetNodes = Array.from(existingDoc.body.querySelectorAll<HTMLElement>(selectors));
    const sourceNodes = Array.from(updatedDoc.body.querySelectorAll<HTMLElement>(selectors));

    if (targetNodes.length === 0 || sourceNodes.length === 0) {
      return fallback;
    }

    const nodeDelta = Math.abs(targetNodes.length - sourceNodes.length);
    if (nodeDelta > Math.max(4, Math.floor(sourceNodes.length * 0.45))) {
      return fallback;
    }

    const limit = Math.min(targetNodes.length, sourceNodes.length);
    for (let index = 0; index < limit; index += 1) {
      const nextText = sourceNodes[index]?.textContent?.trim();
      const targetNode = targetNodes[index];
      if (nextText && targetNode) {
        targetNode.textContent = nextText;
      }
    }

    const prompt = opts.prompt?.trim() || opts.titleHint?.trim() || fallback.title;
    const theme = pickDocumentTheme(prompt, inferDocumentType(prompt));
    const preservedHtml = enhanceDocumentHtml(existingDoc.body.innerHTML, theme);
    const sanitized = sanitizeHtml(preservedHtml);
    const title = extractDocumentTitle(sanitized) || fallback.title;

    return {
      html: sanitized,
      markdown: fallback.markdown,
      title,
    };
  } catch {
    return fallback;
  }
}

function inferArtDirection(documentType: ResolvedDocumentType): ArtDirection {
  switch (documentType) {
    case 'wiki':
    case 'readme':
    case 'notes':
      return 'clean';
    case 'report':
    case 'brief':
    case 'proposal':
      return 'polished';
    case 'article':
    default:
      return 'editorial';
  }
}

function getArtDirectionGuidance(tier: ArtDirection): string {
  switch (tier) {
    case 'clean':
      return `## Art Direction: Clean
- Minimal surface treatment — focus on clarity and scanability
- 2 component types max (e.g. header + callout or simple list)
- Monochrome palette with one accent colour
- No gradients on title, no pull quotes
- Feels like: a clean wiki page or README`;
    case 'polished':
      return `## Art Direction: Polished
- Surface cards with subtle gradients, stat rows, comparison tables
- 3–4 different component types
- Professional but not flashy
- Full palette with primary + accent colours
- Feels like: a consulting brief or quarterly report`;
    case 'editorial':
      return `## Art Direction: Editorial
- Gradient title, hero header, pull quotes, feature grids
- 4–5 different component types — magazine-quality layout
- Rich palette, intentional white space, typographic contrast
- Use the most visually dynamic components available
- Feels like: a premium editorial article or investor pitch`;
  }
}

async function buildCreatePrompt(input: DocumentInput): Promise<string> {
  const documentType = resolveDocumentType(input);
  const theme = pickDocumentTheme(input.prompt, documentType);
  const artDirection = inferArtDirection(documentType);

  const sections: string[] = [];

  // 1. Document type and visual tone
  sections.push(`Document type: ${documentType}
Visual tone: ${theme.label}`);

  // 2. Art direction tier
  sections.push(getArtDirectionGuidance(artDirection));

  // 3. Structure guide
  sections.push(getDocumentStructureGuide(documentType));

  // 4. Design rules (condensed from knowledge base)
  try {
    const designRules = await getKnowledge('document-design-rules');
    sections.push(`## Design Rules Reference\n${designRules}`);
  } catch { /* knowledge optional */ }

  // 5. Component recipes (condensed from knowledge base)
  try {
    const components = await getKnowledge('document-components');
    sections.push(`## Available Document Components\nUse these HTML/CSS patterns as building blocks. Pick 3–5 that fit the content:\n${components}`);
  } catch { /* knowledge optional */ }

  // 6. Exemplar excerpt
  try {
    const exemplar = await getKnowledge('example-document');
    // Truncate to keep prompt manageable
    const excerpt = exemplar.length > 3000 ? exemplar.slice(0, 3000) + '\n<!-- truncated -->' : exemplar;
    sections.push(`## Reference: Premium Document Example\nStudy this example for quality, structure, and style. Match this level of polish:\n\`\`\`html\n${excerpt}\n\`\`\``);
  } catch { /* knowledge optional */ }

  // 7. Theme CSS variables for inline use
  sections.push(`## Theme Palette (use these CSS custom properties)
\`\`\`css
--doc-primary: ${theme.primary};
--doc-accent: ${theme.accent};
--doc-text: ${theme.text};
--doc-muted: ${theme.muted};
--doc-bg: ${theme.bg};
--doc-surface: ${theme.surface};
--doc-surface-alt: ${theme.surfaceAlt};
--doc-border: ${theme.border};
\`\`\``);

  // 8. User request
  sections.push(`## User Request\n${input.prompt}`);

  // 9. Final reminders
  sections.push(`## Important
- Design and visual polish come first
- Prefer elegant HTML with beautiful layout and spacing
- Use CSS custom properties (--doc-*) in your <style> block
- Use markdown only if a simpler text-first response is clearly better
- Every document MUST have a <style> block with custom properties
- No walls of text: break up content with components
- Choose specific, descriptive headings — never "Introduction" or "Conclusion"
- Vary your component choices: don't repeat the same component type back-to-back`);

  return sections.join('\n\n');
}

async function buildEditPrompt(input: DocumentInput): Promise<string> {
  const documentType = resolveDocumentType(input);
  const existingSummary = input.existingMarkdown?.trim() || summarizeExistingDocument(input.existingHtml ?? '');
  const theme = pickDocumentTheme(input.prompt, documentType);
  const artDirection = inferArtDirection(documentType);

  const sections: string[] = [];

  sections.push(`Document type: ${documentType}
Visual tone: ${theme.label}`);

  sections.push(getArtDirectionGuidance(artDirection));

  sections.push(`## Existing Document
\`\`\`markdown
${existingSummary}
\`\`\``);

  // Include component recipes for edits too
  try {
    const components = await getKnowledge('document-components');
    sections.push(`## Available Document Components\nUse these patterns when adding new sections:\n${components}`);
  } catch { /* knowledge optional */ }

  sections.push(`## Theme Palette
\`\`\`css
--doc-primary: ${theme.primary};
--doc-accent: ${theme.accent};
--doc-text: ${theme.text};
--doc-muted: ${theme.muted};
--doc-bg: ${theme.bg};
--doc-surface: ${theme.surface};
--doc-surface-alt: ${theme.surfaceAlt};
--doc-border: ${theme.border};
\`\`\``);

  sections.push(`## User Instruction\n${input.prompt}`);

  sections.push(`## Important
- Append new sections by default unless the user asked to rewrite or replace content
- Preserve the document's structure, polish, and tone where possible
- Prefer a visually rich HTML result if that best maintains beauty and readability
- Use CSS custom properties (--doc-*) for colour consistency
- Vary component types — don't repeat the same pattern back-to-back`);

  return sections.join('\n\n');
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

  // --- Topic-based matching ---

  if (/\b(health|care|climate|sustainab|nature|education|community|environment|green|eco)\b/.test(normalized)) {
    return {
      name: 'forest',
      label: 'Field Notes',
      bg: '#f3f8f4',
      surface: 'rgba(45, 106, 79, 0.05)',
      surfaceAlt: 'rgba(82, 183, 136, 0.10)',
      border: 'rgba(45, 106, 79, 0.14)',
      primary: '#2d6a4f',
      accent: '#52b788',
      text: '#183024',
      muted: '#587164',
      shellBg: 'rgba(255,255,255,0.92)',
      glow: 'rgba(82, 183, 136, 0.16)',
    };
  }

  if (/\b(product|design|creative|brand|marketing|story|campaign|launch)\b/.test(normalized)) {
    return {
      name: 'studio',
      label: 'Studio Brief',
      bg: '#faf7ff',
      surface: 'rgba(109, 74, 255, 0.05)',
      surfaceAlt: 'rgba(255, 107, 154, 0.10)',
      border: 'rgba(109, 74, 255, 0.14)',
      primary: '#6d4aff',
      accent: '#ff6b9a',
      text: '#261b44',
      muted: '#6c6289',
      shellBg: 'rgba(255,255,255,0.94)',
      glow: 'rgba(109, 74, 255, 0.14)',
    };
  }

  if (/\b(finance|invest|fund|revenue|budget|quarter|fiscal|portfolio|banking)\b/.test(normalized)) {
    return {
      name: 'vault',
      label: 'Executive Finance',
      bg: '#f4f6f8',
      surface: 'rgba(15, 32, 65, 0.04)',
      surfaceAlt: 'rgba(37, 99, 235, 0.08)',
      border: 'rgba(15, 32, 65, 0.12)',
      primary: '#0f2041',
      accent: '#2563eb',
      text: '#0f172a',
      muted: '#475569',
      shellBg: 'rgba(255,255,255,0.96)',
      glow: 'rgba(37, 99, 235, 0.10)',
    };
  }

  if (/\b(tech|engineer|develop|code|api|platform|infrastructure|devops|software|system)\b/.test(normalized)) {
    return {
      name: 'terminal',
      label: 'Engineering Brief',
      bg: '#f5f7fa',
      surface: 'rgba(51, 65, 85, 0.04)',
      surfaceAlt: 'rgba(6, 182, 212, 0.08)',
      border: 'rgba(51, 65, 85, 0.12)',
      primary: '#334155',
      accent: '#06b6d4',
      text: '#0f172a',
      muted: '#64748b',
      shellBg: 'rgba(255,255,255,0.95)',
      glow: 'rgba(6, 182, 212, 0.12)',
    };
  }

  if (/\b(research|science|data|study|hypothesis|experiment|academic|journal|paper)\b/.test(normalized)) {
    return {
      name: 'scholar',
      label: 'Research Paper',
      bg: '#f8f7f4',
      surface: 'rgba(120, 85, 43, 0.04)',
      surfaceAlt: 'rgba(217, 119, 6, 0.08)',
      border: 'rgba(120, 85, 43, 0.12)',
      primary: '#78552b',
      accent: '#d97706',
      text: '#1c1917',
      muted: '#78716c',
      shellBg: 'rgba(255,255,255,0.95)',
      glow: 'rgba(217, 119, 6, 0.10)',
    };
  }

  if (/\b(startup|venture|pitch|seed|series|growth|disrupt|innovate|mvp)\b/.test(normalized)) {
    return {
      name: 'neon',
      label: 'Startup Pitch',
      bg: '#fafafa',
      surface: 'rgba(99, 102, 241, 0.04)',
      surfaceAlt: 'rgba(168, 85, 247, 0.08)',
      border: 'rgba(99, 102, 241, 0.12)',
      primary: '#4f46e5',
      accent: '#a855f7',
      text: '#1e1b4b',
      muted: '#6366f1',
      shellBg: 'rgba(255,255,255,0.95)',
      glow: 'rgba(168, 85, 247, 0.12)',
    };
  }

  if (/\b(legal|compliance|policy|regulation|governance|audit|contract|terms)\b/.test(normalized)) {
    return {
      name: 'counsel',
      label: 'Legal Document',
      bg: '#f7f8f9',
      surface: 'rgba(30, 41, 59, 0.03)',
      surfaceAlt: 'rgba(100, 116, 139, 0.06)',
      border: 'rgba(30, 41, 59, 0.12)',
      primary: '#1e293b',
      accent: '#475569',
      text: '#0f172a',
      muted: '#64748b',
      shellBg: 'rgba(255,255,255,0.96)',
      glow: 'rgba(30, 41, 59, 0.06)',
    };
  }

  if (/\b(hr|people|team|culture|hiring|onboard|employee|talent|org)\b/.test(normalized)) {
    return {
      name: 'coral',
      label: 'People & Culture',
      bg: '#fef7f4',
      surface: 'rgba(239, 68, 68, 0.04)',
      surfaceAlt: 'rgba(251, 146, 60, 0.08)',
      border: 'rgba(239, 68, 68, 0.10)',
      primary: '#dc2626',
      accent: '#f97316',
      text: '#1c1917',
      muted: '#78716c',
      shellBg: 'rgba(255,255,255,0.95)',
      glow: 'rgba(251, 146, 60, 0.12)',
    };
  }

  // --- Doc-type fallbacks ---

  if (documentType === 'notes' || documentType === 'wiki' || documentType === 'readme') {
    return {
      name: 'slate',
      label: 'Structured Notes',
      bg: '#f6f8fb',
      surface: 'rgba(36, 87, 166, 0.045)',
      surfaceAlt: 'rgba(14, 165, 233, 0.10)',
      border: 'rgba(36, 87, 166, 0.14)',
      primary: '#2457a6',
      accent: '#0ea5e9',
      text: '#182536',
      muted: '#5d6d82',
      shellBg: 'rgba(255,255,255,0.94)',
      glow: 'rgba(14, 165, 233, 0.14)',
    };
  }

  // Default
  return {
    name: 'professional',
    label: 'Executive Document',
    bg: '#f7f9fc',
    surface: 'rgba(31, 75, 153, 0.045)',
    surfaceAlt: 'rgba(14, 165, 233, 0.09)',
    border: 'rgba(31, 75, 153, 0.14)',
    primary: '#1f4b99',
    accent: '#0ea5e9',
    text: '#162235',
    muted: '#617287',
    shellBg: 'rgba(255,255,255,0.94)',
    glow: 'rgba(31, 75, 153, 0.12)',
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
    const userPrompt = isEdit ? await buildEditPrompt(input) : await buildCreatePrompt(input);

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

    const sourceMarkdown = looksLikeHtml(rawContent)
      ? summarizeExistingDocument(renderedHtml)
      : rawContent.trim();

    // Sanitize the HTML for security
    const sanitized = sanitizeHtml(renderedHtml);

    // Run QA validation (advisory only — does not block)
    const qaResult = validateDocument(sanitized);
    aiDebugLog('document', 'document QA', {
      passed: qaResult.passed,
      score: qaResult.score,
      violations: qaResult.violations.length,
      details: qaResult.violations.map(v => `[${v.severity}] ${v.rule}: ${v.detail}`),
    });

    onEvent({ type: 'step-done', stepId: 'generate', label: isEdit ? 'Updating document…' : 'Writing document…' });
    onEvent({ type: 'progress', message: 'Done!', pct: 100 });

    const title = extractDocumentTitle(sanitized) || extractTitleFromPrompt(input.prompt);

    const output: DocumentOutput = {
      html: sanitized,
      markdown: sourceMarkdown,
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

  const documentType = resolveDocumentType(input);
  const theme = pickDocumentTheme(input.prompt, documentType);

  if (looksLikeHtml(rawContent)) {
    return enhanceDocumentHtml(rawContent, theme);
  }

  return renderMarkdownDocument(rawContent, theme, documentType);
}

function enhanceDocumentHtml(html: string, theme: DocumentTheme): string {
  const trimmed = html.trim();
  const leadingStyleMatch = trimmed.match(/^((?:\s*<style[\s\S]*?<\/style>\s*)+)/i);
  const leadingStyles = leadingStyleMatch?.[1] ?? '';
  const bodyHtml = leadingStyles ? trimmed.slice(leadingStyles.length).trim() : trimmed;

  // If the AI already provided complete styling, use minimal shell
  const hasOwnStyle = !!leadingStyles;
  const shellCss = hasOwnStyle
    ? buildDocumentShellVars(theme)
    : buildDocumentShellStyle(theme);

  if (/class=["']doc-shell["']/i.test(bodyHtml)) {
    return `${shellCss}
${leadingStyles}
${bodyHtml}`;
  }

  return `${shellCss}
${leadingStyles}
<article class="doc-shell">
  <div class="doc-prose">
    ${bodyHtml}
  </div>
</article>`;
}

/** Minimal: only inject CSS custom properties so AI-authored styles can reference them */
function buildDocumentShellVars(theme: DocumentTheme): string {
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
  --doc-shell-bg: ${theme.shellBg ?? 'rgba(255,255,255,0.94)'};
  --doc-glow: ${theme.glow ?? 'rgba(15, 23, 42, 0.08)'};
  color: var(--doc-text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 920px;
  margin: 0 auto;
  padding: clamp(20px, 3vw, 34px) clamp(18px, 3vw, 28px) clamp(28px, 4vw, 42px);
}
.doc-shell * { box-sizing: border-box; }
</style>`;
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
    : (lead ? '' : `<section class="doc-section">${renderMarkdownBlocks(withoutTitle)}</section>`);

  return `${buildDocumentShellStyle(theme)}
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

function buildDocumentShellStyle(theme: DocumentTheme): string {
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
  --doc-shell-bg: ${theme.shellBg ?? 'rgba(255,255,255,0.94)'};
  --doc-glow: ${theme.glow ?? 'rgba(15, 23, 42, 0.08)'};
  color: var(--doc-text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.doc-shell * { box-sizing: border-box; }
.doc-shell {
  max-width: 920px;
  margin: 0 auto;
  padding: clamp(20px, 3vw, 34px) clamp(18px, 3vw, 28px) clamp(28px, 4vw, 42px);
  border-radius: clamp(20px, 2vw, 24px);
  background:
    radial-gradient(circle at top right, var(--doc-glow) 0%, transparent 34%),
    linear-gradient(180deg, var(--doc-shell-bg) 0%, rgba(255,255,255,0.98) 100%);
  border: 1px solid var(--doc-border);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
}
.doc-prose,
.doc-shell .aura-doc {
  display: grid;
  gap: clamp(14px, 1.6vw, 22px);
}
.doc-header,
.doc-section,
.doc-shell .section-card,
.doc-shell .module-card,
.doc-shell .benefit-item,
.doc-shell .callout {
  padding: clamp(16px, 2vw, 24px) clamp(16px, 2.2vw, 26px);
  border-radius: clamp(14px, 1.5vw, 18px);
  border: 1px solid var(--doc-border);
  background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, var(--doc-surface) 100%);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
}
.doc-header {
  background: linear-gradient(135deg, var(--doc-surface-alt) 0%, rgba(255,255,255,0.95) 100%);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
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
  font-size: clamp(2rem, 3.3vw, 2.45rem);
  line-height: 1.04;
  letter-spacing: -0.035em;
  color: var(--doc-text);
}
.doc-shell h2 {
  margin: 0 0 12px;
  padding-left: 12px;
  border-left: 4px solid color-mix(in srgb, var(--doc-primary) 70%, white);
  font-size: clamp(1.25rem, 2vw, 1.5rem);
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--doc-text);
}
.doc-shell h3,
.doc-shell h4 {
  margin: 18px 0 8px;
  font-size: clamp(1rem, 1.6vw, 1.15rem);
  line-height: 1.35;
  color: color-mix(in srgb, var(--doc-text) 88%, var(--doc-primary));
}
.doc-lead,
.doc-shell .value-prop {
  margin: 0;
  font-size: clamp(1rem, 1.5vw, 1.08rem);
  line-height: 1.75;
  color: var(--doc-muted);
}
.doc-shell p {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.72;
  color: var(--doc-text);
}
.doc-shell p:last-child,
.doc-shell li:last-child,
.doc-shell blockquote:last-child,
.doc-shell .section-card > :last-child,
.doc-shell .module-card > :last-child,
.doc-shell .benefit-item > :last-child,
.doc-shell .callout > :last-child,
.doc-shell .doc-section > :last-child {
  margin-bottom: 0;
}
.doc-shell ul,
.doc-shell ol {
  margin: 0 0 14px;
  padding-left: 1.2rem;
}
.doc-shell li {
  margin: 0.35rem 0;
  line-height: 1.65;
}
.doc-shell blockquote,
.doc-shell .callout {
  border-left: 4px solid var(--doc-primary);
  background: linear-gradient(135deg, var(--doc-surface-alt) 0%, rgba(255,255,255,0.96) 100%);
  color: var(--doc-muted);
}
.doc-shell .callout strong,
.doc-shell blockquote strong {
  color: var(--doc-primary);
}
.doc-shell .module-grid,
.doc-shell .grid-benefits,
.doc-shell .stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.doc-shell .benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.doc-shell .icon {
  flex: none;
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
  background: color-mix(in srgb, var(--doc-surfaceAlt) 70%, white);
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
.doc-shell img,
.doc-shell svg {
  max-width: 100%;
  height: auto;
}
</style>`;
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
