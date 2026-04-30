import type { ArtifactPack, ArtifactPackManifest } from '@/services/artifactPacks/types';
import {
  compileEditorialStagePack,
  validateEditorialStageCompiledOutput,
  validateEditorialStageSource,
} from './compiler';
import type { EditorialStageSource } from './schemas';
import { editorialStageLayoutIds } from './schemas';

export const EDITORIAL_STAGE_PACK_ID = 'presentation/editorial-stage-v1';

export const EDITORIAL_STAGE_MANIFEST: ArtifactPackManifest = {
  id: EDITORIAL_STAGE_PACK_ID,
  version: '1.0.0',
  label: 'Editorial Stage',
  description: 'A high-craft presentation pack for staged editorial narratives, evidence-led decks, and strong default visual rhythm.',
  artifactType: 'presentation',
  status: 'draft',
  bestFor: [
    'strategy narratives',
    'investor and board updates',
    'product stories',
    'research summaries with a point of view',
    'launch or manifesto decks that need editorial rhythm',
  ],
  supportedOutputModes: ['html', 'pdf', 'editable-pptx'],
  supportedDirections: [
    'editorial-magazine',
    'modern-minimal',
    'data-utility',
    'warm-narrative',
    'bold-editorial',
  ],
  requiredSourceAssets: [],
  optionalSourceAssets: [
    {
      id: 'brand-logo',
      label: 'Brand logo',
      kind: 'brand',
      purpose: 'Use on cover or closing slides when brand recognition matters.',
      required: false,
      allowedMimeTypes: ['image/svg+xml', 'image/png', 'image/jpeg'],
    },
    {
      id: 'proof-media',
      label: 'Product, screenshot, source chart, or evidence media',
      kind: 'image',
      purpose: 'Bind to story-split, media-grid, or lead-media layouts instead of using decoration.',
      required: false,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    },
  ],
  layoutFamilies: editorialStageLayoutIds,
  contentLimits: {
    minSlides: 4,
    maxSlides: 18,
  },
  editSurfaces: [
    {
      id: 'create-from-source-payload',
      label: 'Create from source payload',
      kind: 'create',
      targetKinds: ['artifact'],
      allowedOperations: ['plan-structure', 'fill-slots', 'bind-media', 'compile'],
      lockedFields: ['css', 'layoutHtml', 'className', 'motion', 'themeVariables'],
      guidance: 'Plan rhythm, fill declared layout slots, and compile. The model never writes full slide HTML or CSS.',
    },
    {
      id: 'text-slot-edits',
      label: 'Text slot edits',
      kind: 'text-edit',
      targetKinds: ['slot', 'slide'],
      allowedOperations: ['replace-slot-text', 'shorten-copy', 'clarify-copy'],
      lockedFields: ['layout', 'className', 'css', 'motion', 'mediaCropPolicy'],
      guidance: 'Patch declared slots and recompile. Do not let the model rewrite slide HTML.',
    },
    {
      id: 'add-slide-from-layout-family',
      label: 'Add slide from layout family',
      kind: 'add-slide',
      targetKinds: ['artifact', 'slide'],
      allowedOperations: ['choose-layout', 'append-slide', 'insert-slide'],
      lockedFields: ['css', 'navigation', 'fontStack', 'themeVariables'],
      guidance: 'Choose one approved layout family, fill slots, and re-run rhythm validation.',
    },
    {
      id: 'restyle-direction',
      label: 'Restyle direction',
      kind: 'restyle',
      targetKinds: ['artifact'],
      allowedOperations: ['swap-direction', 'swap-token-map'],
      lockedFields: ['layoutHtml', 'sourceSlots', 'mediaBindings'],
      guidance: 'Swap direction tokens and posture only. Do not rewrite content.',
    },
  ],
  exportCaveats: [
    'HTML is the reference output for this seed pack.',
    'PDF export should preserve the fixed 16:9 stage and single compiler-owned style block.',
    'Editable PPTX export may flatten motion and advanced CSS treatments.',
    'preview.png is intentionally omitted in this first seed; examples/example.html is the visual reference until binary preview generation is wired in.',
  ],
  examples: [
    {
      id: 'decision-brief-example',
      label: 'Decision Brief Example',
      sourcePath: 'examples/source.json',
      compiledPath: 'examples/example.html',
    },
  ],
};

export const EDITORIAL_STAGE_PACK: ArtifactPack<EditorialStageSource> = {
  manifest: EDITORIAL_STAGE_MANIFEST,
  compile: compileEditorialStagePack,
  validateSource: validateEditorialStageSource,
  validateCompiledOutput: validateEditorialStageCompiledOutput,
};

export default EDITORIAL_STAGE_MANIFEST;
