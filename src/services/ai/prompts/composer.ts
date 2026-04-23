/**
 * PromptComposer — Modular prompt builder for standalone HTML slide generation.
 *
 * Each section is independently testable and can be included/excluded
 * based on the template, animation level, and generation context.
 */
import type { ExemplarPackId, TemplateId, TemplatePalette, TemplateBlueprint } from '../templates';
import { buildBaseSection } from './sections/base';
import { buildTypographySection } from './sections/typography';
import { buildLayoutSection } from './sections/layout';
import { buildDecorativeSection } from './sections/decorative';
import { buildSvgSection } from './sections/svg';
import { buildAnimationSection } from './sections/animation';
import { buildNarrativeSection } from './sections/narrative';
import { buildQualitySection } from './sections/quality';
import { buildAntiPatternsSection, buildCondensedAntiPatterns } from './sections/anti-patterns';
import { buildTemplateExamplesSection } from './sections/template-examples';
import { buildModernPatternsSection } from './sections/modern-patterns';
import { buildChartGuidanceSection } from './sections/charts';

export class PromptComposer {
  private sections: string[] = [];
  private _palette?: TemplatePalette;
  private _animLevel: 1 | 2 | 3 | 4 = 2;
  private _slideCount?: number;

  /** Start with base section (identity, philosophy, output format, rules) */
  addBase(palette?: TemplatePalette): this {
    this._palette = palette;
    this.sections.push(buildBaseSection(palette));
    return this;
  }

  /** Add typography scale guidance */
  addTypography(): this {
    this.sections.push(buildTypographySection());
    return this;
  }

  /** Add layout system and glassmorphism patterns */
  addLayout(): this {
    this.sections.push(buildLayoutSection(this._palette));
    return this;
  }

  /** Add modern CSS patterns (mode-aware card recipes, layout recipes) */
  addModernPatterns(): this {
    const mode = this._palette?.mode ?? 'dark';
    this.sections.push(buildModernPatternsSection(mode));
    return this;
  }

  /** Add decorative element recipes (gradient text, SVG icons, etc.) */
  addDecorative(): this {
    this.sections.push(buildDecorativeSection(this._palette));
    return this;
  }

  /** Add animation framework with level-specific guidance */
  addAnimation(level: 1 | 2 | 3 | 4): this {
    this._animLevel = level;
    this.sections.push(buildAnimationSection(level));
    return this;
  }

  /** Add SVG drawing skills and Bootstrap Icons guidance (gated by animation level) */
  addSvg(): this {
    const section = buildSvgSection(this._palette, this._animLevel);
    if (section) this.sections.push(section);
    return this;
  }

  /** Add slide composition guidance */
  addNarrative(slideCount?: number): this {
    this._slideCount = slideCount;
    this.sections.push(buildNarrativeSection(slideCount));
    return this;
  }

  /** Add structured chart placeholder guidance */
  addCharts(): this {
    this.sections.push(buildChartGuidanceSection());
    return this;
  }

  /** Add quality checklist and response format */
  addQuality(): this {
    this.sections.push(buildQualitySection(this._slideCount));
    return this;
  }

  /** Add design anti-patterns */
  addAntiPatterns(): this {
    this.sections.push(buildAntiPatternsSection());
    return this;
  }

  /** Add a prebuilt template examples section */
  addTemplateExamples(section: string): this {
    if (section.trim()) this.sections.push(section);
    return this;
  }

  /** Add preloaded knowledge-base docs */
  addKnowledge(docs: string[]): this {
    if (docs.length > 0) {
      const section = `## ADDITIONAL REFERENCE MATERIAL\n\n${docs.join('\n\n---\n\n')}`;
      this.sections.push(section);
    }
    return this;
  }

  /** Add a custom section */
  addCustom(content: string): this {
    if (content.trim()) this.sections.push(content);
    return this;
  }

  /** Repeat the most critical format rules verbatim at the end of the prompt.
   * LLMs weight recency heavily — rules buried early get forgotten; rules at
   * the very end are reliably followed. Call this last, immediately before build(). */
  addPostRules(): this {
    this.sections.push(`## ⚑ POST_RULES — FINAL FORMAT CHECKLIST (read this last, follow it exactly)

These rules are repeated here because recency matters. Violating any of them produces a broken slide.

1. **All CSS must live in the \`<style>\` block.** No \`style="…"\` attributes on individual HTML elements — not even for colors, font sizes, or widths. Use CSS classes.
2. **\`submitFinalSlide\` is the ONLY valid completion signal.** Never stop, truncate, or output a code block without calling \`submitFinalSlide\`. Every generation MUST end with a \`submitFinalSlide\` tool call.
3. **\`data-background-color\` must be a concrete hex value.** Never set it to a CSS variable like \`var(--bg)\` or a CSS color name — always a literal \`#rrggbb\` hex code.
4. **No external image URLs.** Do not use \`src="https://…"\` on \`<img>\` elements or \`background-image: url(https://…)\` in CSS. Use Bootstrap Icons, emoji, or inline \`<svg>\` only.
5. **Output structure is exactly: \`<link>\` (if fonts needed) + \`<style>\` block + \`<section>\` element(s) — nothing else.** No \`<!DOCTYPE>\`, no \`<html>\`, no \`<body>\`, no markdown prose outside the code block.`);
    return this;
  }

  /** Build the final prompt string */
  build(): string {
    return this.sections.join('\n\n');
  }
}

/**
 * Build the full designer prompt for single-slide generation.
 * This is the primary entry point for creating a new slide.
 */
export async function buildDesignerPrompt(
  blueprint: TemplateBlueprint,
  templateId: TemplateId,
  exemplarPackId: ExemplarPackId,
  animLevel: 1 | 2 | 3 | 4,
  _slideCount?: number,
  projectRulesBlock?: string,
): Promise<string> {
  const composer = new PromptComposer()
    .addBase(blueprint.palette)
    .addTypography()
    .addLayout()
    .addAnimation(animLevel)
    .addSvg()
    .addCharts()
    .addCustom(buildCondensedAntiPatterns())
    .addCustom(`## DECK SYSTEM FOUNDATION

You are designing the first slide as the reusable foundation for future slides in the same deck.

Requirements:
- define a coherent style system in the <style> block using reusable CSS variables and semantic component classes
- prefer deck-level class names such as wrappers, grids, cards, metric rows, labels, dividers, media panes, and callouts over one-off hero-only class names
- establish reusable type, spacing, border-radius, shadow, and motion tokens so later slides can be appended with minimal additional CSS
- make the hero slide beautiful, but do not spend all the design complexity on a composition that cannot be extended to agenda/content/closing slides
- use the chosen recipe and one targeted exemplar as the main source of visual truth instead of inventing new layout families`);

  const templateExamplesSection = await buildTemplateExamplesSection(
    templateId,
    exemplarPackId,
    blueprint.exampleSlides,
  );

  return composer
    .addTemplateExamples(templateExamplesSection)
    .addCustom(projectRulesBlock ?? '')
    .addQuality()
    .addPostRules()
    .build();
}

/**
 * Build a system prompt for the revision step.
 * Includes palette, layout, anti-patterns, and SVG guidance but
 * excludes narrative, template examples, and knowledge docs.
 */
export function buildRevisionSystemPrompt(
  palette: TemplatePalette | undefined,
  _animLevel: 1 | 2 | 3 | 4,
  projectRulesBlock?: string,
): string {
  return new PromptComposer()
    .addBase(palette)
    .addAntiPatterns()
    .addCustom(projectRulesBlock ?? '')
    .addCustom(`## YOUR TASK — SURGICAL REVISION

You are making MINIMAL, TARGETED fixes to a specific list of design errors in an existing slide.

**STRICT RULES — read every one before writing a single character:**
1. Fix ONLY the explicitly listed errors. Touch NOTHING else.
2. Do NOT rewrite, refactor, or modernize CSS that is not directly related to a listed error.
3. Do NOT change the CSS unit system — if the existing slide uses \`clamp()\`, keep \`clamp()\`. If it uses \`px\`, keep \`px\`. Never convert between unit systems.
4. Do NOT add or change \`font-size\` on wrapper or container elements unless a font-size error is explicitly listed.
5. Do NOT change \`padding\` values unless a padding error is explicitly listed.
6. Do NOT remove or alter \`@keyframes\`, background SVG layers, z-index layering, or CSS custom-property definitions.
7. Do NOT alter \`<section style="padding:0; overflow:hidden;">\` unless a layout error on that element is explicitly listed.
8. Copy the existing \`<style>\` block AS-IS and change ONLY the specific property values that fix the listed errors.
9. Output the COMPLETE corrected HTML — \`<link>\` (if present), \`<style>\`, and all \`<section>\` elements.`)
    .build();
}

/**
 * Build a compact prompt for edit operations.
 * Used for modify/refine_style/add_slides intents.
 */
export function buildEditDesignerPrompt(
  palette: TemplatePalette | undefined,
  animLevel: 1 | 2 | 3 | 4,
  projectRulesBlock?: string,
): string {
  return new PromptComposer()
    .addBase(palette)
    .addAnimation(animLevel)
    .addSvg()
    .addCharts()
    .addCustom(buildCondensedAntiPatterns())
    .addCustom(projectRulesBlock ?? '')
    .addCustom(`## YOUR TASK — EDIT MODE

You are modifying existing slide(s) based on a user request.

**CRITICAL RULES:**
- Make ONLY the minimum changes required to satisfy the user request. Do NOT rewrite unrelated CSS.
- Do NOT change the CSS unit system — if existing CSS uses \`clamp()\`, keep \`clamp()\`. Never convert \`px\` → \`em\`, \`rem\` → \`px\`, etc.
- Do NOT add \`font-size\` to wrapper elements (e.g. \`.slide-wrap\`) unless the user explicitly asked to change font size.
- Do NOT change \`padding\` on the wrapper unless the user explicitly asked to change padding.
- Keep the exact same CSS architecture, palette, fonts, animation patterns, and variable definitions.
- If the request is to add slides, treat existing slides as immutable unless the user explicitly requested edits to specific existing slides.
- For add-slide requests, append new slide sections and keep existing \`<style>\` and \`<section>\` elements unchanged.
- No external image URLs. Use Bootstrap Icons, emoji, or inline SVG.
- Output the COMPLETE slide(s) in a single code block. NOTHING else.

**PREFERRED OUTPUT FORMAT — SEARCH/REPLACE patches:**
For targeted edits (title changes, color adjustments, text updates, layout tweaks), output ONLY the changed parts using this format:

<<<<<<< FIND
<exact existing HTML substring to replace>
=======
<replacement HTML>
>>>>>>> REPLACE

Rules for patches:
- Each FIND block must be a UNIQUE, exact substring of the existing HTML (copy verbatim, no paraphrasing)
- Use multiple patch blocks for multiple changes
- FIND blocks must not overlap
- If the change is too large to patch cleanly (e.g., full layout restructure), output the complete HTML instead (no patch blocks)
- Do NOT output both patches AND full HTML — pick one format`)
    .addPostRules()
    .build();
}

/**
 * Build the prompt for a single slide within a batch generation queue.
 * Slide 1 gets the full enhanced prompt.
 * Slides 2-N get an abbreviated prompt referencing the shared style from slide 1.
 */
export function buildBatchSlidePrompt(
  baseEnhancedPrompt: string,
  brief: { index: number; title: string; contentGuidance: string; visualGuidance?: string },
  totalSlides: number,
  sharedStyleBlock?: string,
): string {
  const slideInstruction = `\n\n---\nBATCH SLIDE ${brief.index} of ${totalSlides}\nTitle: ${brief.title}\nContent guidance: ${brief.contentGuidance}${brief.visualGuidance ? `\nVisual guidance: ${brief.visualGuidance}` : ''}\n\nThis is slide ${brief.index} in a ${totalSlides}-slide deck. Generate ONE <section> only.`;

  if (brief.index === 1 || !sharedStyleBlock) {
    // Full prompt for slide 1
    return baseEnhancedPrompt + slideInstruction;
  }

  // Abbreviated prompt for slides 2-N: reference shared style
  return `You are generating slide ${brief.index} of ${totalSlides} in a batch deck.

SHARED STYLE (from slide 1 — reuse these exact CSS variables and class names):
${sharedStyleBlock}

Do NOT redefine the CSS variables or @keyframes from above. Output ONLY:
- A <section> element with data-background-color matching the palette
- Any NEW CSS classes needed for this slide's unique layout (in a <style> block that EXTENDS the shared style, not replaces it)
- The section content using the established class names from the shared style

${slideInstruction}`;
}
