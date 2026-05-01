import type { ArtifactPack, ArtifactPackManifest } from '@/services/artifactPacks/types';
import {
  compileExecutiveMemoPack,
  validateExecutiveMemoCompiledOutput,
  validateExecutiveMemoSource,
} from './compiler';
import type { ExecutiveMemoSource } from './schemas';
import {
  EXECUTIVE_MEMO_PACK_ID,
  EXECUTIVE_MEMO_PACK_VERSION,
  executiveMemoLayoutIds,
} from './schemas';

export const EXECUTIVE_MEMO_MANIFEST: ArtifactPackManifest = {
  id: EXECUTIVE_MEMO_PACK_ID,
  version: EXECUTIVE_MEMO_PACK_VERSION,
  label: 'Executive Memo',
  description: 'A deterministic document pack for concise decision memos with source-backed evidence, risks, and action ownership.',
  artifactType: 'document',
  status: 'draft',
  bestFor: [
    'executive memo',
    'decision memo',
    'board memo',
    'strategy recommendation',
    'operating update',
  ],
  supportedOutputModes: ['html', 'pdf', 'docx'],
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
      id: 'source-document',
      label: 'Source document or analysis',
      kind: 'document',
      purpose: 'Use as evidence for source notes rather than inventing metrics or claims.',
      required: false,
      allowedMimeTypes: ['application/pdf', 'text/markdown', 'text/plain'],
    },
    {
      id: 'source-spreadsheet',
      label: 'Source spreadsheet',
      kind: 'spreadsheet',
      purpose: 'Bind evidence-table rows to verified operational or financial inputs.',
      required: false,
      allowedMimeTypes: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    },
  ],
  layoutFamilies: executiveMemoLayoutIds,
  contentLimits: {
    minModules: 3,
    maxModules: 10,
    maxWordsPerModule: 240,
  },
  editSurfaces: [
    {
      id: 'create-from-module-payload',
      label: 'Create from module payload',
      kind: 'create',
      targetKinds: ['artifact'],
      allowedOperations: ['plan-modules', 'fill-slots', 'bind-sources', 'compile'],
      lockedFields: ['css', 'layoutHtml', 'className', 'documentShell', 'themeVariables'],
      guidance: 'Plan memo modules, fill declared text/table/source payloads, and compile. The model never writes full document HTML or CSS.',
    },
    {
      id: 'text-slot-edits',
      label: 'Text slot edits',
      kind: 'text-edit',
      targetKinds: ['slot', 'module'],
      allowedOperations: ['replace-slot-text', 'shorten-copy', 'clarify-copy'],
      lockedFields: ['layout', 'className', 'css', 'tableShape'],
      guidance: 'Patch declared module slots and recompile. Preserve table shapes unless the user requests a restructure.',
    },
    {
      id: 'add-module-from-layout-family',
      label: 'Add module from layout family',
      kind: 'add-module',
      targetKinds: ['artifact', 'module'],
      allowedOperations: ['choose-layout', 'append-module', 'insert-module'],
      lockedFields: ['css', 'fontStack', 'themeVariables'],
      guidance: 'Choose one approved memo module, fill its schema, and re-run source validation.',
    },
    {
      id: 'restyle-direction',
      label: 'Restyle direction',
      kind: 'restyle',
      targetKinds: ['artifact'],
      allowedOperations: ['swap-direction', 'swap-token-map'],
      lockedFields: ['layoutHtml', 'moduleSlots', 'tableData', 'sourceNotes'],
      guidance: 'Swap direction tokens and document posture only. Do not rewrite memo content.',
    },
  ],
  exportCaveats: [
    'HTML is the reference output for this first document pack slice.',
    'PDF export should preserve readable flow, source notes, and print-safe table wrapping.',
    'DOCX export should map modules to semantic headings, paragraphs, lists, and tables before using advanced layout.',
  ],
  examples: [
    {
      id: 'executive-memo-example',
      label: 'Executive Memo Example',
      sourcePath: 'examples/source.json',
      compiledPath: 'examples/example.html',
    },
  ],
};

export const EXECUTIVE_MEMO_PACK: ArtifactPack<ExecutiveMemoSource> = {
  manifest: EXECUTIVE_MEMO_MANIFEST,
  compile: compileExecutiveMemoPack,
  validateSource: validateExecutiveMemoSource,
  validateCompiledOutput: validateExecutiveMemoCompiledOutput,
};

export default EXECUTIVE_MEMO_MANIFEST;
