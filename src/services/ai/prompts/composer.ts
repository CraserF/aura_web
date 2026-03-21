/**
 * PromptComposer — Modular prompt builder with chainable methods.
 * Replaces the monolithic buildSystemPrompt() with composable sections.
 *
 * Each section is independently testable and can be included/excluded
 * based on the template, animation level, and generation context.
 */
import type { TemplatePalette, TemplateBlueprint } from '../templates';
import type { TemplateId } from '../templates';
import { buildBaseSection } from './sections/base';
import { buildTypographySection } from './sections/typography';
import { buildLayoutSection } from './sections/layout';
import { buildDecorativeSection } from './sections/decorative';
import { buildAnimationSection } from './sections/animation';
import { buildNarrativeSection } from './sections/narrative';
import { buildQualitySection } from './sections/quality';
import { buildAntiPatternsSection } from './sections/anti-patterns';
import { buildTemplateExamplesSection } from './sections/template-examples';
import { getRelevantKnowledge } from '../knowledge';

export class PromptComposer {
  private sections: string[] = [];
  private _palette?: TemplatePalette;
  private _animLevel: 1 | 2 | 3 | 4 = 2;

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

  /** Add slide structure / narrative arc */
  addNarrative(): this {
    this.sections.push(buildNarrativeSection());
    return this;
  }

  /** Add quality checklist and response format */
  addQuality(): this {
    this.sections.push(buildQualitySection());
    return this;
  }

  /** Add design anti-patterns (previously only in review — now in generation too) */
  addAntiPatterns(): this {
    this.sections.push(buildAntiPatternsSection());
    return this;
  }

  /** Add rich template HTML examples from the registry */
  addTemplateExamples(templateId: TemplateId, blueprintExamples?: string): this {
    const section = buildTemplateExamplesSection(templateId, blueprintExamples);
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
  animLevel: 1 | 2 | 3 | 4,
): string {
  return new PromptComposer()
    .addBase(blueprint.palette)
    .addTypography()
    .addLayout()
    .addDecorative()
    .addAnimation(animLevel)
    .addNarrative()
    .addAntiPatterns()
    .addTemplateExamples(templateId, blueprint.exampleSlides)
    .addKnowledge()
    .addQuality()
    .build();
}
