/**
 * Knowledge Base — Structured access to reference docs for standalone HTML slide generation.
 * All docs imported at build time via Vite's ?raw imports.
 */

// Core standalone slide knowledge (always included)
import standaloneSlideKnowledge from './docs/standalone-slide-knowledge.md?raw';
import standaloneSlideExtended from './docs/standalone-slide-extended.md?raw';
import slidePromptTemplate from './docs/slide-prompt-template.md?raw';

// Example slides (gold standard references)
import exampleTitleSlide from './docs/example-title-slide.html?raw';
import exampleEditorial from './docs/example-editorial.html?raw';
import exampleInterstitial from './docs/example-interstitial.html?raw';

// Supplementary reference docs
import animCheatsheet from './docs/animation-cheatsheet.md?raw';
import components from './docs/components.md?raw';
import iconsAndFonts from './docs/icons-and-fonts.md?raw';
import qualityChecklist from './docs/quality-checklist.md?raw';
import svgDrawing from './docs/svg-drawing.md?raw';
import svgDiagrams from './docs/svg-diagrams.md?raw';
import heroScenes from './docs/hero-scenes.md?raw';
import slideGeneration from './skills/slide-generation.md?raw';
import advancedWorkflows from './skills/advanced-workflows.md?raw';
import promptLibrary from './prompts/prompt-library.md?raw';

export type KnowledgeDocId =
  | 'standalone-slide-knowledge'
  | 'standalone-slide-extended'
  | 'slide-prompt-template'
  | 'example-title-slide'
  | 'example-editorial'
  | 'example-interstitial'
  | 'animation-cheatsheet'
  | 'components'
  | 'icons-and-fonts'
  | 'quality-checklist'
  | 'svg-drawing'
  | 'svg-diagrams'
  | 'hero-scenes'
  | 'slide-generation'
  | 'advanced-workflows'
  | 'prompt-library';

const KNOWLEDGE_BASE: Record<KnowledgeDocId, string> = {
  'standalone-slide-knowledge': standaloneSlideKnowledge,
  'standalone-slide-extended': standaloneSlideExtended,
  'slide-prompt-template': slidePromptTemplate,
  'example-title-slide': exampleTitleSlide,
  'example-editorial': exampleEditorial,
  'example-interstitial': exampleInterstitial,
  'animation-cheatsheet': animCheatsheet,
  'components': components,
  'icons-and-fonts': iconsAndFonts,
  'quality-checklist': qualityChecklist,
  'svg-drawing': svgDrawing,
  'svg-diagrams': svgDiagrams,
  'hero-scenes': heroScenes,
  'slide-generation': slideGeneration,
  'advanced-workflows': advancedWorkflows,
  'prompt-library': promptLibrary,
};

function sanitizeReferenceContent(content: string): string {
  return content
    .replace(/WaterBorne Capital/gi, 'Example Organization')
    .replace(/Waterbourne Capital/gi, 'Example Organization')
    .replace(/WaterBorne/gi, 'Example Brand')
    .replace(/Waterbourne/gi, 'Example Brand')
    .replace(/Presented by\s+<strong>[^<]+<\/strong>/gi, 'Presented by <strong>Example Organization</strong>')
    .replace(/Kahoot Quiz Time\s*·\s*[^<\n]+/gi, 'Interactive Quiz Moment · Example Organization');
}

/** Get a knowledge doc by ID */
export function getKnowledge(id: KnowledgeDocId): string {
  return sanitizeReferenceContent(KNOWLEDGE_BASE[id]);
}

/**
 * Get knowledge docs relevant to a given animation level.
 * Structured for standalone HTML slide generation with rich CSS/SVG.
 *
 * The three core knowledge docs (knowledge base, extended, prompt template)
 * are ALWAYS included — they contain the comprehensive guidance the agent
 * needs to produce high-quality slides. Supplementary docs are level-gated.
 */
export function getRelevantKnowledge(animLevel: 1 | 2 | 3 | 4): string[] {
  const docs: string[] = [];

  // ── Always included: three core knowledge documents ─────────
  // These contain the comprehensive architecture, component library,
  // layout patterns, animation cookbook, SVG recipes, and prompt
  // structure the agent needs to match the gold-standard examples.
  docs.push(sanitizeReferenceContent(standaloneSlideKnowledge));
  docs.push(sanitizeReferenceContent(standaloneSlideExtended));
  docs.push(sanitizeReferenceContent(slidePromptTemplate));

  // ── Always included: example slides as gold-standard references ──
  // NOTE: Example files demonstrate correct sizing (fixed px), composition, and component patterns.
  docs.push(`## EXAMPLE: Title Slide\n\`\`\`html\n${sanitizeReferenceContent(exampleTitleSlide)}\n\`\`\``);
  docs.push(`## EXAMPLE: Editorial/Infographic Slide\n\`\`\`html\n${sanitizeReferenceContent(exampleEditorial)}\n\`\`\``);
  docs.push(`## EXAMPLE: Interstitial/Pop Slide\n\`\`\`html\n${sanitizeReferenceContent(exampleInterstitial)}\n\`\`\``);

  // ── Level 2+: supplementary reference docs ──────────────────
  if (animLevel >= 2) {
    docs.push(sanitizeReferenceContent(svgDrawing));
    docs.push(sanitizeReferenceContent(heroScenes));
  }

  // ── Level 3+: advanced SVG diagrams ─────────────────────────
  if (animLevel >= 3) {
    docs.push(sanitizeReferenceContent(svgDiagrams));
  }

  return docs;
}

/** Get condensed quality checklist for validation */
export function getQualityChecklist(): string {
  return qualityChecklist;
}
