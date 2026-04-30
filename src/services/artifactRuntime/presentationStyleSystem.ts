import type { ColorTheme } from '@/types/project';
import {
  getTemplateHtml,
  toProductionPresentationTemplate,
  type TemplateId,
} from '@/services/ai/templates';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';
import type { ArtifactRunPlan, TemplateGuidanceProfile } from '@/services/artifactRuntime/types';

export interface PresentationStyleSystemInput {
  planResult?: Pick<PlanResult, 'selectedTemplate'>;
  runPlan?: ArtifactRunPlan;
  guidanceProfile?: TemplateGuidanceProfile;
  projectRulesBlock?: string;
  colorTheme?: ColorTheme;
  visualVariantId?: string;
}

export interface PresentationStyleSystemResult {
  templateId: TemplateId;
  colorTheme?: ColorTheme;
  styleBlock: string;
}

const FALLBACK_TEMPLATE_ID: TemplateId = 'executive-briefing-light';

const TEMPLATE_BY_VISUAL_VARIANT: Record<string, TemplateId> = {
  executive: 'executive-briefing-light',
  launch: 'launch-narrative-light',
  editorial: 'editorial-light',
  research: 'finance-grid-light',
  teaching: 'stage-setting-light',
};

const FALLBACK_STYLE_TEXT = `
:root {
  --bg: #ffffff;
  --surface: #ffffff;
  --text: #171512;
  --muted: #5c6570;
  --primary: #245c5f;
  --accent: #2f8f73;
  --line: #d9e2e7;
  --shadow: 0 18px 44px rgba(17, 24, 39, 0.12);
  --font-display: "Arial Narrow", "Aptos Display", system-ui, sans-serif;
  --font-body: "Aptos", "Inter", system-ui, sans-serif;
}

.aura-slide {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 56px 68px;
  color: var(--text);
  font-family: var(--font-body);
  background: linear-gradient(135deg, var(--surface), var(--bg));
}

.aura-slide h1,
.aura-slide h2 {
  margin: 0;
  font-family: var(--font-display);
  color: var(--text);
}

.aura-slide h1 { font-size: 86px; line-height: 0.92; }
.aura-slide h2 { font-size: 56px; line-height: 0.98; }
.aura-slide p,
.aura-slide li { font-size: 26px; line-height: 1.28; color: var(--muted); }
.aura-slide svg { max-width: 100%; height: auto; }

.aura-title-lockup {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: center;
  gap: 18px;
  height: 100%;
}

.aura-kicker {
  color: var(--primary);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.aura-proof-card {
  border: 1px solid var(--line);
  border-radius: 24px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  box-shadow: var(--shadow);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`.trim();

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(value: string | undefined): { r: number; g: number; b: number } | null {
  const raw = value?.trim().replace('#', '');
  if (!raw || !/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return null;
  const hex = raw.length === 3
    ? raw.split('').map((char) => `${char}${char}`).join('')
    : raw;
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function toHex(color: { r: number; g: number; b: number }): string {
  const part = (value: number) => clamp(value).toString(16).padStart(2, '0');
  return `#${part(color.r)}${part(color.g)}${part(color.b)}`;
}

function mixHex(a: string, b: string, amount: number): string {
  const left = parseHexColor(a);
  const right = parseHexColor(b);
  if (!left || !right) return a;
  return toHex({
    r: left.r + ((right.r - left.r) * amount),
    g: left.g + ((right.g - left.g) * amount),
    b: left.b + ((right.b - left.b) * amount),
  });
}

function relativeLuminance(hex: string): number {
  const color = parseHexColor(hex);
  if (!color) return 1;
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (0.2126 * channel(color.r)) + (0.7152 * channel(color.g)) + (0.0722 * channel(color.b));
}

function readableTextColor(background: string): string {
  return relativeLuminance(background) > 0.48 ? '#171512' : '#f8fafc';
}

export function parseColorThemeFromRulesBlock(projectRulesBlock?: string): ColorTheme | undefined {
  if (!projectRulesBlock) return undefined;
  const match = projectRulesBlock.match(/Color palette\s*-\s*background:\s*(#[0-9a-f]{3,6})\s*;\s*primary:\s*(#[0-9a-f]{3,6})\s*;\s*accent:\s*(#[0-9a-f]{3,6})/i);
  if (!match) return undefined;
  const [, background, primary, accent] = match;
  if (!background || !primary || !accent) return undefined;
  return { background, primary, accent };
}

export function parseVisualVariantIdFromRulesBlock(projectRulesBlock?: string): string | undefined {
  if (!projectRulesBlock) return undefined;
  const match = projectRulesBlock.match(/(?:^|\n)\s*##\s*Visual Direction\s*:\s*([^\n]+)/i)
    ?? projectRulesBlock.match(/\bVisual Direction\s*:\s*([^\n;]+)/i);
  const raw = match?.[1]?.trim().toLowerCase();
  if (!raw) return undefined;

  for (const variantId of Object.keys(TEMPLATE_BY_VISUAL_VARIANT)) {
    if (raw === variantId || raw.startsWith(`${variantId} `) || raw.includes(` ${variantId} `)) {
      return variantId;
    }
  }

  return undefined;
}

export function extractPresentationStyleBlocks(html: string): string[] {
  return html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? [];
}

export function extractPresentationStyleText(html: string): string {
  return extractPresentationStyleBlocks(html)
    .map((block) => block.replace(/<\/?style[^>]*>/gi, '').trim())
    .filter(Boolean)
    .join('\n\n');
}

export function extractPresentationSectionFragments(html: string): string[] {
  return html.match(/<section\b[\s\S]*?<\/section>/gi) ?? [];
}

export function hasUsablePresentationStyleSystem(html: string): boolean {
  const styleBlocks = extractPresentationStyleBlocks(html);
  if (styleBlocks.length !== 1) return false;
  const styleText = extractPresentationStyleText(html);
  return styleText.length >= 120
    && /:(?:root|scope)\s*\{/i.test(styleText)
    && /--[a-z0-9-]+\s*:/i.test(styleText)
    && /\.[a-z0-9_-]+\s*[{,]/i.test(styleText);
}

function resolveTemplateId(input: PresentationStyleSystemInput = {}): TemplateId {
  const explicitVisualVariantId = input.visualVariantId ?? parseVisualVariantIdFromRulesBlock(input.projectRulesBlock);
  const visualTemplateId = explicitVisualVariantId ? TEMPLATE_BY_VISUAL_VARIANT[explicitVisualVariantId] : undefined;
  if (visualTemplateId) {
    return toProductionPresentationTemplate(visualTemplateId);
  }

  const explicit =
    input.runPlan?.designManifest.templateId ??
    input.runPlan?.templateGuidance.selectedTemplateId ??
    input.guidanceProfile?.selectedTemplateId ??
    input.planResult?.selectedTemplate;

  return toProductionPresentationTemplate((explicit ?? FALLBACK_TEMPLATE_ID) as TemplateId);
}

function extractFirstStyleText(html: string): string {
  return html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)?.[1]?.trim() ?? '';
}

function replaceCssVariable(styleText: string, variablePattern: RegExp, value: string): string {
  return styleText.replace(variablePattern, (_match, prefix: string) => `${prefix}${value};`);
}

export function applyColorThemeToStyleText(styleText: string, colorTheme?: ColorTheme): string {
  if (!colorTheme) return styleText;

  const background = colorTheme.background;
  const primary = colorTheme.primary;
  const accent = colorTheme.accent;
  const text = readableTextColor(background);
  const surface = relativeLuminance(background) > 0.48
    ? mixHex(background, '#ffffff', 0.72)
    : mixHex(background, '#ffffff', 0.12);
  const muted = mixHex(text, background, 0.38);
  const line = mixHex(primary, background, 0.78);
  const softPrimary = mixHex(background, primary, 0.14);
  const softAccent = mixHex(background, accent, 0.14);

  let next = styleText;
  next = replaceCssVariable(next, /(--(?:[a-z0-9-]+-)?(?:bg|background)\s*:\s*)#[0-9a-f]{3,8}\s*;/gi, background);
  next = replaceCssVariable(next, /(--(?:[a-z0-9-]+-)?(?:paper|surface)\s*:\s*)#[0-9a-f]{3,8}\s*;/gi, surface);
  next = replaceCssVariable(next, /(--(?:[a-z0-9-]+-)?(?:soft|left)\s*:\s*)#[0-9a-f]{3,8}\s*;/gi, softPrimary);
  next = replaceCssVariable(next, /(--(?:[a-z0-9-]+-)?right\s*:\s*)#[0-9a-f]{3,8}\s*;/gi, softAccent);
  next = replaceCssVariable(next, /(--(?:[a-z0-9-]+-)?(?:ink|text|text-primary)\s*:\s*)#[0-9a-f]{3,8}\s*;/gi, text);
  next = replaceCssVariable(next, /(--(?:[a-z0-9-]+-)?muted\s*:\s*)#[0-9a-f]{3,8}\s*;/gi, muted);
  next = replaceCssVariable(next, /(--(?:[a-z0-9-]+-)?primary\s*:\s*)#[0-9a-f]{3,8}\s*;/gi, primary);
  next = replaceCssVariable(next, /(--(?:[a-z0-9-]+-)?accent\s*:\s*)#[0-9a-f]{3,8}\s*;/gi, accent);
  next = replaceCssVariable(next, /(--(?:[a-z0-9-]+-)?(?:line|border)\s*:\s*)#[0-9a-f]{3,8}\s*;/gi, line);

  if (/--aura-project-bg\s*:/i.test(next)) {
    return next;
  }

  const aliases = [
    `--aura-project-bg: ${background};`,
    `--aura-project-primary: ${primary};`,
    `--aura-project-accent: ${accent};`,
    `--bg: ${background};`,
    `--surface: ${surface};`,
    `--text: ${text};`,
    `--muted: ${muted};`,
    `--primary: ${primary};`,
    `--accent: ${accent};`,
    `--line: ${line};`,
  ].join('\n    ');

  if (/:root\s*\{/i.test(next)) {
    return next.replace(/:root\s*\{/i, (match) => `${match}\n    ${aliases}`);
  }
  if (/:scope\s*\{/i.test(next)) {
    return next.replace(/:scope\s*\{/i, (match) => `${match}\n    ${aliases}`);
  }

  return `:root {\n    ${aliases}\n}\n\n${next}`;
}

function ensureReducedMotion(styleText: string): string {
  if (!/\b(?:animation\s*:|@keyframes\b)/i.test(styleText) || /prefers-reduced-motion/i.test(styleText)) {
    return styleText;
  }

  return `${styleText}\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { animation: none !important; transition: none !important; }\n}`;
}

export function buildPresentationStyleBlock(styleText: string, templateId?: string): string {
  const dataAttr = templateId ? ` data-aura-style-system="${templateId}"` : ' data-aura-style-system="deterministic"';
  return `<style${dataAttr}>\n${ensureReducedMotion(styleText).trim()}\n</style>`;
}

export async function resolvePresentationStyleSystem(
  input: PresentationStyleSystemInput = {},
): Promise<PresentationStyleSystemResult> {
  const templateId = resolveTemplateId(input);
  const theme = input.colorTheme ?? parseColorThemeFromRulesBlock(input.projectRulesBlock);
  let styleText = '';

  try {
    styleText = extractFirstStyleText(await getTemplateHtml(templateId));
  } catch {
    styleText = FALLBACK_STYLE_TEXT;
  }

  if (!styleText.trim()) {
    styleText = FALLBACK_STYLE_TEXT;
  }

  const themedStyleText = applyColorThemeToStyleText(styleText, theme);
  return {
    templateId,
    ...(theme ? { colorTheme: theme } : {}),
    styleBlock: buildPresentationStyleBlock(themedStyleText, templateId),
  };
}

export function assemblePresentationWithSingleStyle(
  styleBlock: string,
  sections: string[],
): string {
  return [styleBlock, ...sections.map((section) => section.trim()).filter(Boolean)]
    .filter(Boolean)
    .join('\n');
}

export function applyStyleBlockToPresentationHtml(html: string, styleBlock: string): string {
  return assemblePresentationWithSingleStyle(styleBlock, extractPresentationSectionFragments(html));
}

export function updatePresentationSectionBackgrounds(html: string, background: string | undefined): string {
  if (!background) return html;
  return html.replace(/<section\b([^>]*)>/gi, (match, attrs: string) => {
    if (/data-background-color=/i.test(attrs)) {
      return match.replace(/data-background-color=["'][^"']*["']/i, `data-background-color="${background}"`);
    }
    return `<section${attrs} data-background-color="${background}">`;
  });
}

export async function applyProjectColorsToPresentationHtml(input: {
  html: string;
  colorTheme: ColorTheme;
  visualVariantId?: string;
  templateId?: TemplateId;
}): Promise<{ html: string; changed: boolean; styleBlock: string }> {
  const existingStyleText = hasUsablePresentationStyleSystem(input.html)
    ? applyColorThemeToStyleText(extractPresentationStyleText(input.html), input.colorTheme)
    : '';
  const styleBlock = existingStyleText
    ? buildPresentationStyleBlock(existingStyleText, input.templateId)
    : (await resolvePresentationStyleSystem({
        colorTheme: input.colorTheme,
        visualVariantId: input.visualVariantId,
      })).styleBlock;

  const withSingleStyle = applyStyleBlockToPresentationHtml(input.html, styleBlock);
  const html = updatePresentationSectionBackgrounds(withSingleStyle, input.colorTheme.background);

  return {
    html,
    changed: html.trim() !== input.html.trim(),
    styleBlock,
  };
}
