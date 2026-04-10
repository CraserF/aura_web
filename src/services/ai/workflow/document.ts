/**
 * Document Workflow — Generates polished documents via a lean HTML-first flow.
 *
 * Flow:
 *   CREATE: plan → generate HTML/markdown → render → QA → sanitize → return
 *   EDIT:   plan → update markdown/HTML → render → QA → sanitize → return
 */

import type { LanguageModel, ModelMessage } from 'ai';
import { streamText } from 'ai';
import { createModel } from './engine';
import { withDefaults } from '../middleware';
import { sanitizeHtml } from '@/services/html/sanitizer';
import { CACHE_CONTROL } from './engine';
import { aiDebugLog, logPromptMetrics } from '../debug';
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

const DOCUMENT_SYSTEM_PROMPT = `You are a professional document designer and writer.
Return a complete document body as polished HTML with semantic structure and a compact inline <style> block.
Prefer HTML when it improves readability; markdown is allowed only when the request is clearly text-first.

Rules:
- prioritize clarity, hierarchy, and scannability
- use strong headings, concise paragraphs, and tasteful visual rhythm
- no JavaScript, remote assets, or external stylesheets
- output only the document content`; 

const EDIT_DOCUMENT_SYSTEM_PROMPT = `You are a professional document editor.
Return the complete updated document while preserving the existing layout quality and hierarchy.
Prefer the smallest necessary change, append by default, and output only the updated content.`;

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
      const nextHtml = sourceNodes[index]?.innerHTML;
      const targetNode = targetNodes[index];
      if (typeof nextHtml === 'string' && targetNode) {
        targetNode.innerHTML = nextHtml;
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

interface DocumentPlan {
  documentType: ResolvedDocumentType;
  theme: DocumentTheme;
  artDirection: ArtDirection;
  isEdit: boolean;
}

function planDocumentRequest(input: DocumentInput): DocumentPlan {
  const documentType = resolveDocumentType(input);
  return {
    documentType,
    theme: pickDocumentTheme(input.prompt, documentType),
    artDirection: inferArtDirection(documentType),
    isEdit: !!input.existingHtml,
  };
}

function getArtDirectionGuidance(tier: ArtDirection): string {
  switch (tier) {
    case 'clean':
      return 'Clean: minimal, reference-friendly, strong hierarchy, very light surfaces.';
    case 'polished':
      return 'Polished: subtle cards, callouts, stats, tables, and professional spacing.';
    case 'editorial':
      return 'Editorial: premium hero header, pull quote or feature grid, richer contrast, and magazine-style rhythm.';
  }
}

function getComponentHints(documentType: ResolvedDocumentType, tier: ArtDirection): string[] {
  if (documentType === 'readme' || documentType === 'wiki') {
    return [
      'Use a clean header + quick overview block.',
      'Prefer numbered steps, tidy lists, and one info callout when needed.',
      'Keep surfaces subtle; do not over-decorate reference content.',
    ];
  }

  if (documentType === 'notes') {
    return [
      'Use a summary block followed by highlights, decisions, and action items.',
      'One compact callout or divider is enough for visual rhythm.',
    ];
  }

  if (documentType === 'report' || documentType === 'brief' || documentType === 'proposal') {
    return [
      'Use a strong title + lead, then one stat row or key-metrics block if numbers exist.',
      'Use a callout for the most important recommendation or risk.',
      'Prefer one comparison table or two-column section over long prose.',
    ];
  }

  return tier === 'editorial'
    ? [
        'Open with a premium hero header and short lead paragraph.',
        'Use one feature grid, pull quote, or timeline to break up long prose.',
        'Keep paragraphs short and use visual rhythm every 2–3 sections.',
      ]
    : [
        'Use a clean header, concise sections, and one visual break element.',
      ];
}

function getExampleSnippet(documentType: ResolvedDocumentType, tier: ArtDirection): string {
  if (tier === 'clean') {
    return `<header class="doc-header"><div class="doc-eyebrow">Reference</div><h1>Setup Guide</h1><p class="doc-lead">Quick orientation and the few steps that matter most.</p></header>`;
  }

  if (documentType === 'report' || documentType === 'brief' || documentType === 'proposal') {
    return `<header class="doc-header"><div class="doc-eyebrow">Quarterly Report</div><h1>Operational Performance Summary</h1><p class="doc-lead">The three trends, risks, and decisions leadership should focus on this month.</p></header><div class="doc-callout"><strong>Recommendation:</strong><p>Prioritize onboarding automation to remove the current fulfillment bottleneck.</p></div>`;
  }

  return `<header class="doc-header"><div class="doc-eyebrow">Editorial Brief</div><h1 class="doc-title-gradient">The Future of Distributed Systems</h1><p class="doc-lead">A concise, high-signal narrative with strong hierarchy and visual breathing room.</p></header><figure class="doc-pullquote"><blockquote>“Architecture quality shows up first in readability.”</blockquote></figure>`;
}

class DocumentPromptComposer {
  private sections: string[] = [];

  addBase(plan: DocumentPlan): this {
    this.sections.push(`## Document Brief
Type: ${plan.documentType}
Visual tone: ${plan.theme.label}
Art direction: ${getArtDirectionGuidance(plan.artDirection)}`);
    return this;
  }

  addStructure(documentType: ResolvedDocumentType): this {
    this.sections.push(getDocumentStructureGuide(documentType));
    return this;
  }

  addComponentHints(documentType: ResolvedDocumentType, tier: ArtDirection): this {
    const hints = getComponentHints(documentType, tier);
    if (hints.length > 0) {
      this.sections.push(`## Visual Pattern Hints\n- ${hints.join('\n- ')}`);
    }
    return this;
  }

  addPalette(theme: DocumentTheme): this {
    this.sections.push(`## Theme Palette
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
    return this;
  }

  addExample(documentType: ResolvedDocumentType, tier: ArtDirection, includeExample: boolean): this {
    if (!includeExample) return this;
    this.sections.push(`## Compact Example\n\`\`\`html\n${getExampleSnippet(documentType, tier)}\n\`\`\``);
    return this;
  }

  addExistingDocument(summary: string): this {
    this.sections.push(`## Existing Document\n\`\`\`markdown
${summary}
\`\`\``);
    return this;
  }

  addRequest(label: 'User Request' | 'User Instruction', value: string): this {
    this.sections.push(`## ${label}\n${value}`);
    return this;
  }

  addRules(isEdit: boolean): this {
    this.sections.push(`## Rules
- Return a complete document body in HTML when styling matters; use markdown only for very plain notes/readmes
- Keep a compact inline <style> block with reusable classes and --doc-* variables
- Use short paragraphs, descriptive headings, and at least one visual rhythm element when the content is longer than a simple memo
- ${isEdit ? 'Preserve the existing structure and make the smallest necessary change.' : 'Prefer polished structure over decorative excess.'}
- Avoid walls of text, generic headings, and repeated identical component blocks`);
    return this;
  }

  build(): string {
    return this.sections.join('\n\n');
  }
}

async function buildCreatePrompt(input: DocumentInput, plan: DocumentPlan): Promise<string> {
  const includeExample = plan.artDirection !== 'clean';

  return new DocumentPromptComposer()
    .addBase(plan)
    .addStructure(plan.documentType)
    .addComponentHints(plan.documentType, plan.artDirection)
    .addPalette(plan.theme)
    .addExample(plan.documentType, plan.artDirection, includeExample)
    .addRequest('User Request', input.prompt)
    .addRules(false)
    .build();
}

async function buildEditPrompt(input: DocumentInput, plan: DocumentPlan): Promise<string> {
  const existingSummary = input.existingMarkdown?.trim() || summarizeExistingDocument(input.existingHtml ?? '');
  const shouldIncludeExample = /restyle|redesign|make it look|polish|visual/i.test(input.prompt);

  return new DocumentPromptComposer()
    .addBase(plan)
    .addExistingDocument(existingSummary)
    .addComponentHints(plan.documentType, plan.artDirection)
    .addPalette(plan.theme)
    .addExample(plan.documentType, plan.artDirection, shouldIncludeExample)
    .addRequest('User Instruction', input.prompt)
    .addRules(true)
    .build();
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
    onEvent({ type: 'step-start', stepId: 'plan', label: 'Planning document…' });
    onEvent({ type: 'progress', message: 'Understanding the document request…', pct: 8 });

    const planResult = planDocumentRequest(input);

    onEvent({
      type: 'progress',
      message: `Using ${planResult.artDirection} ${planResult.documentType} styling`,
      pct: 16,
    });
    onEvent({ type: 'step-done', stepId: 'plan', label: 'Planning document…' });

    onEvent({ type: 'step-start', stepId: 'generate', label: isEdit ? 'Updating document…' : 'Writing document…' });
    onEvent({ type: 'progress', message: isEdit ? 'Applying changes…' : 'Crafting your document…', pct: 28 });

    const systemPrompt = isEdit ? EDIT_DOCUMENT_SYSTEM_PROMPT : DOCUMENT_SYSTEM_PROMPT;
    const userPrompt = isEdit ? await buildEditPrompt(input, planResult) : await buildCreatePrompt(input, planResult);

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
      documentType: planResult.documentType,
      artDirection: planResult.artDirection,
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
    onEvent({ type: 'step-done', stepId: 'generate', label: isEdit ? 'Updating document…' : 'Writing document…' });

    onEvent({ type: 'step-start', stepId: 'qa', label: 'Checking document quality…' });
    const qaResult = validateDocument(sanitized);
    aiDebugLog('document', 'document QA', {
      passed: qaResult.passed,
      score: qaResult.score,
      violations: qaResult.violations.length,
      details: qaResult.violations.map((v) => `[${v.severity}] ${v.rule}: ${v.detail}`),
    });
    onEvent({
      type: 'progress',
      message: qaResult.passed ? `QA passed (score ${qaResult.score})` : `QA warnings detected (score ${qaResult.score})`,
      pct: 88,
    });
    onEvent({ type: 'step-done', stepId: 'qa', label: 'Checking document quality…' });

    onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing document…' });
    const title = extractDocumentTitle(sanitized) || extractTitleFromPrompt(input.prompt);

    const output: DocumentOutput = {
      html: sanitized,
      markdown: sourceMarkdown,
      title,
    };

    onEvent({ type: 'step-done', stepId: 'finalize', label: 'Finalizing document…' });
    onEvent({ type: 'progress', message: 'Done!', pct: 100 });
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

  for (const el of Array.from(doc.body.querySelectorAll('h1, h2, h3, p, li, blockquote, pre, table'))) {
    const tag = el.tagName.toLowerCase();

    if (tag === 'li' && el.parentElement?.tagName.toLowerCase() === 'ul') {
      const item = toInlineMarkdown(el).trim();
      if (item) lines.push(`- ${item}`);
      continue;
    }

    if (tag === 'li' && el.parentElement?.tagName.toLowerCase() === 'ol') {
      const item = toInlineMarkdown(el).trim();
      if (item) lines.push(`1. ${item}`);
      continue;
    }

    if (tag === 'pre') {
      const code = el.textContent?.trim();
      if (code) lines.push(`\`\`\`\n${code}\n\`\`\``);
      continue;
    }

    if (tag === 'table') {
      const tableMarkdown = tableToMarkdown(el as HTMLTableElement);
      if (tableMarkdown) lines.push(tableMarkdown);
      continue;
    }

    const text = toInlineMarkdown(el).trim();
    if (!text) continue;

    switch (tag) {
      case 'h1':
        lines.push(`# ${text}`);
        break;
      case 'h2':
        lines.push(`## ${text}`);
        break;
      case 'h3':
        lines.push(`### ${text}`);
        break;
      case 'blockquote':
        lines.push(`> ${text}`);
        break;
      default:
        lines.push(text);
        break;
    }
  }

  const summary = lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() || '# Untitled Document';
  return summary.length > maxChars ? `${summary.slice(0, maxChars)}\n…` : summary;
}

function toInlineMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const content = Array.from(node.childNodes).map((child) => toInlineMarkdown(child)).join('');
  const normalized = content.replace(/\s+/g, ' ').trim();

  switch (node.tagName.toLowerCase()) {
    case 'strong':
    case 'b':
      return normalized ? `**${normalized}**` : '';
    case 'em':
    case 'i':
      return normalized ? `*${normalized}*` : '';
    case 'code':
      return normalized ? `\`${normalized}\`` : '';
    case 'a': {
      const href = node.getAttribute('href')?.trim();
      return href && normalized ? `[${normalized}](${href})` : normalized;
    }
    case 'br':
      return '\n';
    default:
      return content;
  }
}

function tableToMarkdown(table: HTMLTableElement): string {
  const rows = Array.from(table.querySelectorAll('tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) => toInlineMarkdown(cell).trim()),
  ).filter((row) => row.length > 0);

  if (rows.length === 0) return '';

  const [headerRow = [], ...bodyRows] = rows;
  const header = `| ${headerRow.join(' | ')} |`;
  const separator = `| ${headerRow.map(() => '---').join(' | ')} |`;
  const body = bodyRows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return [header, separator, body].filter(Boolean).join('\n');
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
