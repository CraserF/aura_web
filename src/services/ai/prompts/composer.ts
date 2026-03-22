/**
 * PromptComposer — Modular prompt builder with chainable methods.
 * Replaces the monolithic buildSystemPrompt() with composable sections.
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
import { getRelevantKnowledge } from '../knowledge';

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

  /** Add slide structure / narrative arc with optional planned slide count */
  addNarrative(slideCount?: number): this {
    this._slideCount = slideCount;
    this.sections.push(buildNarrativeSection(slideCount));
    return this;
  }

  /** Add quality checklist and response format with optional planned slide count */
  addQuality(): this {
    this.sections.push(buildQualitySection(this._slideCount));
    return this;
  }

  /** Add design anti-patterns (previously only in review — now in generation too) */
  addAntiPatterns(): this {
    this.sections.push(buildAntiPatternsSection());
    return this;
  }

  /** Add rich template HTML examples from the registry */
  addTemplateExamples(templateId: TemplateId, exemplarPackId: ExemplarPackId, blueprintExamples?: string): this {
    const section = buildTemplateExamplesSection(templateId, exemplarPackId, blueprintExamples);
    if (section) this.sections.push(section);
    return this;
  }

  /** Add relevant knowledge base docs based on animation level */
  addKnowledge(): this {
    const docs = getRelevantKnowledge(this._animLevel);
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

  /** Build the final prompt string */
  build(): string {
    return this.sections.join('\n\n');
  }
}

/**
 * Build the full designer prompt with all sections.
 * This is the primary entry point — replaces buildSystemPrompt().
 */
export function buildDesignerPrompt(
  blueprint: TemplateBlueprint,
  templateId: TemplateId,
  exemplarPackId: ExemplarPackId,
  animLevel: 1 | 2 | 3 | 4,
  slideCount?: number,
): string {
  return new PromptComposer()
    .addBase(blueprint.palette)
    .addTypography()
    .addLayout()
    .addModernPatterns()
    .addDecorative()
    .addAnimation(animLevel)
    .addSvg()
    .addNarrative(slideCount)
    .addAntiPatterns()
    .addTemplateExamples(templateId, exemplarPackId, blueprint.exampleSlides)
    .addKnowledge()
    .addQuality()
    .build();
}

/**
 * Build a system prompt for the revision step.
 * Includes palette, layout, anti-patterns, and SVG guidance but
 * excludes narrative arc, template examples, and knowledge docs
 * (since revision is fixing, not creating from scratch).
 */
export function buildRevisionSystemPrompt(
  palette: TemplatePalette | undefined,
  animLevel: 1 | 2 | 3 | 4,
): string {
  return new PromptComposer()
    .addBase(palette)
    .addTypography()
    .addLayout()
    .addModernPatterns()
    .addDecorative()
    .addAnimation(animLevel)
    .addSvg()
    .addAntiPatterns()
    .addQuality()
    .addCustom(`## YOUR TASK — REVISION MODE

You are revising an existing slide deck to fix specific design issues.
- Fix ALL listed errors (MUST FIX items).
- Fix as many warnings (SHOULD FIX items) as possible.
- Do NOT change content that is not flagged as an issue.
- Do NOT re-order or remove slides unless instructed.
- Preserve the overall design language, palette, and slide structure.
- Output the COMPLETE corrected deck as HTML \`<section>\` elements.`)
    .build();
}

/**
 * Build a trimmed prompt for batch slide generation (~4K tokens vs ~35K).
 * Includes palette, typography, layout, animation, condensed anti-patterns.
 * Excludes knowledge docs, full SVG recipes, template examples, narrative, decorative catalog.
 */
export function buildBatchDesignerPrompt(
  palette: TemplatePalette | undefined,
  animLevel: 1 | 2 | 3 | 4,
  batchContext: {
    batchIndex: number;
    totalBatches: number;
    isFirstBatch: boolean;
  },
): string {
  const composer = new PromptComposer()
    .addBase(palette)
    .addTypography()
    .addLayout()
    .addAnimation(animLevel)
    .addCustom(buildCondensedAntiPatterns());

  // First batch establishes CSS vars and fonts; subsequent batches must not re-declare them
  if (batchContext.isFirstBatch) {
    composer.addCustom(`## YOUR TASK — BATCH GENERATION (batch ${batchContext.batchIndex + 1}/${batchContext.totalBatches})

Generate the first batch of slides. This is batch 1 of ${batchContext.totalBatches}.
- Start with the Google Fonts \`<link>\` tag as the FIRST line.
- Define CSS custom properties (--primary, --accent, --heading-font, --body-font) on the FIRST \`<section>\` ONLY.
- Output ONLY the \`<section>\` elements for the slides specified in the outline below.
- Use the palette colors EXACTLY as given. Do NOT invent new hex colors.
- Output a single code block. NOTHING else — no explanation, no commentary.

\`\`\`html
<link href="..." rel="stylesheet">
<section ...>...</section>
<section ...>...</section>
\`\`\``);
  } else {
    composer.addCustom(`## YOUR TASK — BATCH GENERATION (batch ${batchContext.batchIndex + 1}/${batchContext.totalBatches})

Generate the next batch of slides. This is batch ${batchContext.batchIndex + 1} of ${batchContext.totalBatches}.
- Do NOT include a Google Fonts \`<link>\` tag (already included in batch 1).
- Do NOT define CSS custom properties (already defined in batch 1). Use var(--primary), var(--accent), etc.
- Match the visual style of the previous slides exactly — same fonts, colors, spacing, card styles.
- Output ONLY \`<section>\` elements. No explanation, no commentary.

\`\`\`html
<section ...>...</section>
<section ...>...</section>
\`\`\``);
  }

  return composer.build();
}

/**
 * Build a compact prompt for edit operations (~3K tokens).
 * Used for modify/refine_style/add_slides intents — much smaller than the full designer prompt.
 */
export function buildEditDesignerPrompt(
  palette: TemplatePalette | undefined,
  animLevel: 1 | 2 | 3 | 4,
): string {
  return new PromptComposer()
    .addBase(palette)
    .addTypography()
    .addLayout()
    .addAnimation(animLevel)
    .addCustom(buildCondensedAntiPatterns())
    .addCustom(`## YOUR TASK — EDIT MODE

You are modifying an existing slide deck based on a user request.
- Output the COMPLETE modified deck as HTML \`<section>\` elements.
- Maintain visual consistency with the existing design.
- Do NOT change slides that are not affected by the request.
- Keep the same palette, fonts, and card styles.
- No external image URLs. Use Bootstrap Icons, emoji, or CSS gradients.
- Output a single code block. NOTHING else.

\`\`\`html
<link href="..." rel="stylesheet">
<section ...>...</section>
...
\`\`\``)
    .build();
}
