/**
 * Knowledge Base — Structured access to reference docs for standalone HTML slide generation.
 * Docs are loaded on demand via Vite raw imports and cached in memory.
 */

const KNOWLEDGE_MODULES = {
  ...import.meta.glob('./docs/*.md', { query: '?raw', import: 'default' }),
  ...import.meta.glob('./docs/*.html', { query: '?raw', import: 'default' }),
  ...import.meta.glob('./skills/*.md', { query: '?raw', import: 'default' }),
  ...import.meta.glob('./prompts/*.md', { query: '?raw', import: 'default' }),
} as Record<string, () => Promise<string>>;

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

const KNOWLEDGE_PATHS: Record<KnowledgeDocId, string> = {
  'standalone-slide-knowledge': './docs/standalone-slide-knowledge.md',
  'standalone-slide-extended': './docs/standalone-slide-extended.md',
  'slide-prompt-template': './docs/slide-prompt-template.md',
  'example-title-slide': './docs/example-title-slide.html',
  'example-editorial': './docs/example-editorial.html',
  'example-interstitial': './docs/example-interstitial.html',
  'animation-cheatsheet': './docs/animation-cheatsheet.md',
  components: './docs/components.md',
  'icons-and-fonts': './docs/icons-and-fonts.md',
  'quality-checklist': './docs/quality-checklist.md',
  'svg-drawing': './docs/svg-drawing.md',
  'svg-diagrams': './docs/svg-diagrams.md',
  'hero-scenes': './docs/hero-scenes.md',
  'slide-generation': './skills/slide-generation.md',
  'advanced-workflows': './skills/advanced-workflows.md',
  'prompt-library': './prompts/prompt-library.md',
};

const knowledgeCache = new Map<KnowledgeDocId, string>();

function sanitizeReferenceContent(content: string): string {
  return content
    .replace(/WaterBorne Capital/gi, 'Example Organization')
    .replace(/Waterbourne Capital/gi, 'Example Organization')
    .replace(/WaterBorne/gi, 'Example Brand')
    .replace(/Waterbourne/gi, 'Example Brand')
    .replace(/Presented by\s+<strong>[^<]+<\/strong>/gi, 'Presented by <strong>Example Organization</strong>')
    .replace(/Kahoot Quiz Time\s*·\s*[^<\n]+/gi, 'Interactive Quiz Moment · Example Organization');
}

async function loadKnowledge(id: KnowledgeDocId): Promise<string> {
  const cached = knowledgeCache.get(id);
  if (cached) return cached;

  const path = KNOWLEDGE_PATHS[id];
  const loader = path ? KNOWLEDGE_MODULES[path] : undefined;
  if (!loader) {
    throw new Error(`Missing knowledge loader for ${id}`);
  }

  const content = sanitizeReferenceContent((await loader()) as string);
  knowledgeCache.set(id, content);
  return content;
}

/** Get a knowledge doc by ID */
export async function getKnowledge(id: KnowledgeDocId): Promise<string> {
  return loadKnowledge(id);
}

/**
 * Get knowledge docs relevant to a given animation level.
 * Structured for standalone HTML slide generation with rich CSS/SVG.
 */
export async function getRelevantKnowledge(animLevel: 1 | 2 | 3 | 4): Promise<string[]> {
  const requiredIds: KnowledgeDocId[] = [
    'standalone-slide-knowledge',
    'standalone-slide-extended',
    'slide-prompt-template',
    'example-title-slide',
    'example-editorial',
    'example-interstitial',
  ];

  if (animLevel >= 2) {
    requiredIds.push('svg-drawing', 'hero-scenes');
  }

  if (animLevel >= 3) {
    requiredIds.push('svg-diagrams');
  }

  const loaded = await Promise.all(
    requiredIds.map(async (id) => [id, await loadKnowledge(id)] as const),
  );
  const docMap = Object.fromEntries(loaded) as Record<KnowledgeDocId, string>;

  return [
    docMap['standalone-slide-knowledge'],
    docMap['standalone-slide-extended'],
    docMap['slide-prompt-template'],
    `## EXAMPLE: Title Slide\n\`\`\`html\n${docMap['example-title-slide']}\n\`\`\``,
    `## EXAMPLE: Editorial/Infographic Slide\n\`\`\`html\n${docMap['example-editorial']}\n\`\`\``,
    `## EXAMPLE: Interstitial/Pop Slide\n\`\`\`html\n${docMap['example-interstitial']}\n\`\`\``,
    ...(animLevel >= 2 ? [docMap['svg-drawing'], docMap['hero-scenes']] : []),
    ...(animLevel >= 3 ? [docMap['svg-diagrams']] : []),
  ].filter(Boolean);
}

/** Get condensed quality checklist for validation */
export async function getQualityChecklist(): Promise<string> {
  return loadKnowledge('quality-checklist');
}
