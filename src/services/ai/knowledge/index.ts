/**
 * Knowledge Base — Structured access to reference docs, skills, and prompts.
 * All docs imported at build time via Vite's ?raw imports.
 */

import animCheatsheet from './docs/animation-cheatsheet.md?raw';
import components from './docs/components.md?raw';
import iconsAndFonts from './docs/icons-and-fonts.md?raw';
import qualityChecklist from './docs/quality-checklist.md?raw';
import threejsKnowledge from './docs/threejs-knowledge.md?raw';
import svgDrawing from './docs/svg-drawing.md?raw';
import svgDiagrams from './docs/svg-diagrams.md?raw';
import heroScenes from './docs/hero-scenes.md?raw';
import slideGeneration from './skills/slide-generation.md?raw';
import advancedWorkflows from './skills/advanced-workflows.md?raw';
import promptLibrary from './prompts/prompt-library.md?raw';

export type KnowledgeDocId =
  | 'animation-cheatsheet'
  | 'components'
  | 'icons-and-fonts'
  | 'quality-checklist'
  | 'threejs-knowledge'
  | 'svg-drawing'
  | 'svg-diagrams'
  | 'hero-scenes'
  | 'slide-generation'
  | 'advanced-workflows'
  | 'prompt-library';

const KNOWLEDGE_BASE: Record<KnowledgeDocId, string> = {
  'animation-cheatsheet': animCheatsheet,
  'components': components,
  'icons-and-fonts': iconsAndFonts,
  'quality-checklist': qualityChecklist,
  'threejs-knowledge': threejsKnowledge,
  'svg-drawing': svgDrawing,
  'svg-diagrams': svgDiagrams,
  'hero-scenes': heroScenes,
  'slide-generation': slideGeneration,
  'advanced-workflows': advancedWorkflows,
  'prompt-library': promptLibrary,
};

/** Get a knowledge doc by ID */
export function getKnowledge(id: KnowledgeDocId): string {
  return KNOWLEDGE_BASE[id];
}

/** Get knowledge docs relevant to a given animation level */
export function getRelevantKnowledge(animLevel: 1 | 2 | 3 | 4): string[] {
  const docs: string[] = [];

  // Always include core references
  docs.push(components);
  docs.push(iconsAndFonts);

  // Add animation and SVG references scaled to level
  if (animLevel >= 2) {
    docs.push(animCheatsheet);
    docs.push(svgDrawing);
    docs.push(heroScenes);
  }

  // Add advanced SVG diagrams for higher levels
  if (animLevel >= 3) {
    docs.push(svgDiagrams);
  }

  // Add Three.js knowledge for cinematic levels
  if (animLevel >= 4) {
    docs.push(threejsKnowledge);
  }

  return docs;
}

/** Get condensed quality checklist for validation */
export function getQualityChecklist(): string {
  return qualityChecklist;
}
