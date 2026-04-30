import type {
  DeckRhythmEntry,
  PresentationExportIntent,
  PresentationScaffold,
  PresentationScaffoldDirectionId,
  ScaffoldCompileResult,
  ScaffoldDensity,
  ScaffoldMood,
  ScaffoldTheme,
  SlideSkeleton,
  SlideSlotDefinition,
  SlideSlotPayload,
} from './types';

export interface CompileScaffoldSlideInput {
  scaffold: PresentationScaffold;
  theme: ScaffoldTheme;
  skeleton: SlideSkeleton;
  payload: SlideSlotPayload;
  rhythmEntry: DeckRhythmEntry;
  totalSlides: number;
}

export interface AssembleScaffoldDeckInput {
  scaffold: PresentationScaffold;
  theme: ScaffoldTheme;
  directionId: PresentationScaffoldDirectionId;
  exportIntent: PresentationExportIntent;
  sections: string[];
}

export interface ScaffoldSlotInventoryEntry {
  slideIndex: number;
  skeletonId: string;
  slotId: string;
  value: string;
}

export interface ScaffoldSlotPatch {
  slideIndex: number;
  slotId: string;
  value: string;
}

const INLINE_TAG_PLACEHOLDER = '%%AURA_INLINE_TAG_';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeInlineTag(tag: string): string {
  const lower = tag.toLowerCase();
  if (/^<br\s*\/?>$/.test(lower)) return '<br>';
  const closing = /^<\//.test(lower) ? '/' : '';
  const tagName = lower.match(/^<\/?\s*(strong|em|b|i)\b/)?.[1] ?? '';
  return tagName ? `<${closing}${tagName}>` : '';
}

function sanitizeSlotValue(slot: SlideSlotDefinition, rawValue: string | undefined): string {
  const trimmed = (rawValue ?? '').trim();
  const clipped = trimmed.length > slot.maxLength
    ? trimmed.slice(0, slot.maxLength).trim()
    : trimmed;

  if (!slot.allowInlineSemanticTags) {
    return escapeHtml(stripTags(clipped));
  }

  const allowedTags: string[] = [];
  const withoutTags = clipped.replace(/<\/?\s*(?:strong|em|b|i|br)\b[^>]*>/gi, (tag) => {
    const normalized = normalizeInlineTag(tag);
    if (!normalized) return '';
    const index = allowedTags.push(normalized) - 1;
    return `${INLINE_TAG_PLACEHOLDER}${index}%%`;
  });
  const escaped = escapeHtml(stripTags(withoutTags));
  return escaped.replace(new RegExp(`${INLINE_TAG_PLACEHOLDER}(\\d+)%%`, 'g'), (_match, index: string) => {
    return allowedTags[Number(index)] ?? '';
  });
}

function replaceCssVariables(styleCss: string, theme: ScaffoldTheme): string {
  const tokenText = Object.entries(theme.tokens)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  if (/:root\s*\{/i.test(styleCss)) {
    return styleCss.replace(/:root\s*\{/i, (match) => `${match}\n${tokenText}`);
  }

  return `:root {\n${tokenText}\n}\n\n${styleCss}`;
}

export function buildScaffoldStyleBlock(scaffold: PresentationScaffold, theme: ScaffoldTheme): string {
  return `<style data-aura-style-system="${scaffold.id}" data-scaffold-theme="${theme.id}">\n${replaceCssVariables(scaffold.styleCss, theme).trim()}\n</style>`;
}

function moodClass(mood: ScaffoldMood): string {
  return `pes-mood-${mood}`;
}

function densityClass(density: ScaffoldDensity): string {
  return `pes-density-${density}`;
}

function replaceSkeletonTokens(input: {
  html: string;
  theme: ScaffoldTheme;
  rhythmEntry: DeckRhythmEntry;
  totalSlides: number;
}): string {
  const { html, theme, rhythmEntry, totalSlides } = input;
  const background = rhythmEntry.mood === 'hero-dark' || rhythmEntry.mood === 'dark'
    ? theme.tokens['--pes-hero-bg'] ?? theme.backgroundColor
    : theme.backgroundColor;

  return html
    .replace(/\{\{background\}\}/g, background)
    .replace(/\{\{moodClass\}\}/g, moodClass(rhythmEntry.mood))
    .replace(/\{\{densityClass\}\}/g, densityClass(rhythmEntry.density))
    .replace(/\{\{slideNumber\}\}/g, String(rhythmEntry.slideIndex))
    .replace(/\{\{totalSlides\}\}/g, String(totalSlides));
}

function replaceSlotElement(
  html: string,
  slot: SlideSlotDefinition,
  value: string,
  hidden: boolean,
): string {
  const slotName = escapeRegExp(slot.id);
  const elementPattern = new RegExp(
    `<([a-z][a-z0-9-]*)([^>]*\\bdata-slot=["']${slotName}["'][^>]*)>[\\s\\S]*?<\\/\\1>`,
    'i',
  );

  if ((hidden || value.length === 0) && !slot.required) {
    return html.replace(elementPattern, '');
  }

  return html.replace(elementPattern, (_match, tagName: string, attrs: string) =>
    `<${tagName}${attrs}>${value}</${tagName}>`);
}

export function compileScaffoldSlide(input: CompileScaffoldSlideInput): string {
  const { skeleton, payload, theme, rhythmEntry, totalSlides } = input;
  const hiddenSlots = new Set(payload.hiddenSlots ?? []);
  let html = replaceSkeletonTokens({
    html: skeleton.template,
    theme,
    rhythmEntry,
    totalSlides,
  });

  for (const slot of skeleton.slots) {
    const rawValue = payload.slots[slot.id] ?? slot.placeholder ?? '';
    const value = sanitizeSlotValue(slot, rawValue);
    html = replaceSlotElement(html, slot, value, hiddenSlots.has(slot.id));
  }

  return html
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '>\n<')
    .trim();
}

export function assembleScaffoldDeck(input: AssembleScaffoldDeckInput): ScaffoldCompileResult {
  const styleBlock = buildScaffoldStyleBlock(input.scaffold, input.theme);
  const sections = input.sections.map((section) => section.trim()).filter(Boolean);
  return {
    scaffoldId: input.scaffold.id,
    themeId: input.theme.id,
    directionId: input.directionId,
    exportIntent: input.exportIntent,
    styleBlock,
    sections,
    slideCount: sections.length,
    html: [styleBlock, ...sections].join('\n'),
  };
}

export function extractScaffoldSections(html: string): string[] {
  return html.match(/<section\b[\s\S]*?<\/section>/gi) ?? [];
}

export function extractScaffoldSlotInventory(html: string): ScaffoldSlotInventoryEntry[] {
  return extractScaffoldSections(html).flatMap((section, sectionIndex) => {
    const skeletonId = section.match(/\bdata-skeleton=["']([^"']+)["']/i)?.[1] ?? 'unknown';
    return Array.from(section.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bdata-slot=["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi))
      .map((match) => ({
        slideIndex: sectionIndex + 1,
        skeletonId,
        slotId: match[2] ?? '',
        value: stripTags(match[3] ?? ''),
      }))
      .filter((entry) => entry.slotId);
  });
}

function patchSlotInSection(section: string, slotId: string, value: string): string {
  const slotName = escapeRegExp(slotId);
  const elementPattern = new RegExp(
    `<([a-z][a-z0-9-]*)([^>]*\\bdata-slot=["']${slotName}["'][^>]*)>[\\s\\S]*?<\\/\\1>`,
    'i',
  );

  return section.replace(elementPattern, (_match, tagName: string, attrs: string) =>
    `<${tagName}${attrs}>${escapeHtml(stripTags(value))}</${tagName}>`);
}

export function patchScaffoldSlotsInHtml(html: string, patches: ScaffoldSlotPatch[]): string {
  if (patches.length === 0) return html;

  const styleBlocks = html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? [];
  const sections = extractScaffoldSections(html);
  const nextSections = sections.map((section, sectionIndex) => {
    const slidePatches = patches.filter((patch) => patch.slideIndex === sectionIndex + 1);
    return slidePatches.reduce((next, patch) => patchSlotInSection(next, patch.slotId, patch.value), section);
  });

  return [...styleBlocks.slice(0, 1), ...nextSections].filter(Boolean).join('\n');
}
