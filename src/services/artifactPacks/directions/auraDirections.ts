import type {
  ArtifactDesignDirection,
  ArtifactDesignDirectionId,
  BuiltinArtifactDesignDirectionId,
} from '@/services/artifactPacks/types';

const commonSpacing = {
  xs: '8px',
  sm: '16px',
  md: '24px',
  lg: '40px',
  xl: '64px',
  xxl: '96px',
} as const;

const commonWeights = {
  regular: 400,
  medium: 520,
  semibold: 640,
  bold: 760,
} as const;

export const AURA_DESIGN_DIRECTIONS: readonly ArtifactDesignDirection[] = [
  {
    id: 'editorial-magazine',
    label: 'Editorial Magazine',
    bestFor: ['strategy decks', 'investor narratives', 'thought leadership', 'brand stories'],
    mood: 'Print-like, spacious, confident, and restrained. Type and evidence carry the work.',
    palette: {
      colors: {
        canvas: '#f4efe6',
        surface: '#fffaf2',
        raisedSurface: '#ffffff',
        text: '#191715',
        mutedText: '#6f675d',
        accent: '#b95735',
        accentText: '#fff7ef',
        border: '#d8cdbd',
        subtleFill: '#ebe3d6',
        positive: '#376f59',
        warning: '#9a6a1d',
        negative: '#a93f34',
      },
      chartPalette: ['#b95735', '#376f59', '#23395d', '#9a6a1d', '#6f675d'],
      spacing: commonSpacing,
      radius: { none: '0', sm: '4px', md: '8px', lg: '12px' },
      elevation: { none: 'none', low: 'none', medium: '0 18px 40px rgba(25, 23, 21, 0.10)' },
      table: { headerFill: '#ebe3d6', gridLine: '#d8cdbd', emphasisFill: '#fffaf2' },
      motion: { intensity: 'subtle', maxDurationMs: 700 },
    },
    typography: {
      families: {
        display: '"Iowan Old Style", "Charter", Georgia, serif',
        body: '"Aptos", "Inter", system-ui, sans-serif',
        mono: '"IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace',
      },
      scale: {
        eyebrow: '15px',
        title: '86px',
        subtitle: '30px',
        heading: '56px',
        body: '24px',
        caption: '16px',
        metric: '96px',
      },
      weights: commonWeights,
    },
    layoutPosture: [
      'Lead with one typographic focal point.',
      'Prefer asymmetry, wide margins, and one proof object over equal cards.',
      'Use media only when it has provenance or a clear story role.',
    ],
    artifactPosture: {
      presentation: [
        'Hero or breaker every three to four slides.',
        'Serif display titles, sans body, mono metadata.',
        'No generic motif decoration as the main visual.',
      ],
      document: [
        'Readable editorial modules with side notes and source blocks.',
        'Tables are calm, sparse, and evidence-led.',
      ],
      spreadsheet: [
        'Use only for report-style dashboards, not dense models.',
        'Keep grid styling quiet and source notes visible.',
      ],
    },
    do: [
      'Use one warm accent sparingly.',
      'Make a strong first focal point.',
      'Prefer quotes, big numbers, and real images over card grids.',
    ],
    dont: [
      'Do not use emoji icons.',
      'Do not fill space with abstract rings or blobs.',
      'Do not invent metrics.',
    ],
    examplePackIds: ['presentation/editorial-stage-v1'],
  },
  {
    id: 'modern-minimal',
    label: 'Modern Minimal',
    bestFor: ['SaaS updates', 'product briefs', 'internal operating docs', 'simple proposals'],
    mood: 'Quiet, precise, software-native, and practical. The interface fades back so content is clear.',
    palette: {
      colors: {
        canvas: '#f8fafc',
        surface: '#ffffff',
        raisedSurface: '#ffffff',
        text: '#111827',
        mutedText: '#64748b',
        accent: '#2563eb',
        accentText: '#ffffff',
        border: '#dbe3ee',
        subtleFill: '#eef2f7',
        positive: '#16803c',
        warning: '#b7791f',
        negative: '#c2413b',
      },
      chartPalette: ['#2563eb', '#0f766e', '#7c3aed', '#b7791f', '#64748b'],
      spacing: commonSpacing,
      radius: { none: '0', sm: '4px', md: '8px', lg: '10px' },
      elevation: { none: 'none', low: '0 1px 2px rgba(15, 23, 42, 0.06)', medium: '0 12px 28px rgba(15, 23, 42, 0.10)' },
      table: { headerFill: '#eef2f7', gridLine: '#dbe3ee', emphasisFill: '#f8fafc' },
      motion: { intensity: 'subtle', maxDurationMs: 500 },
    },
    typography: {
      families: {
        display: '"Inter", "Aptos Display", system-ui, sans-serif',
        body: '"Inter", "Aptos", system-ui, sans-serif',
        mono: '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',
      },
      scale: {
        eyebrow: '14px',
        title: '78px',
        subtitle: '28px',
        heading: '52px',
        body: '23px',
        caption: '15px',
        metric: '84px',
      },
      weights: commonWeights,
    },
    layoutPosture: [
      'Use precise grids and compact chrome.',
      'Let screenshots, diagrams, and product evidence carry visual weight.',
      'Keep accent usage limited to one or two moments per screen.',
    ],
    artifactPosture: {
      presentation: ['Use product/screenshots first.', 'Avoid oversized marketing flourishes.', 'Keep sections sharply aligned.'],
      document: ['Use compact modules and clear headings.', 'Avoid decorative callouts unless they clarify action.'],
      spreadsheet: ['Good default for lightweight trackers and clean dashboard sheets.'],
    },
    do: ['Use system typography.', 'Make alignment obvious.', 'Use one accent role.'],
    dont: ['Do not use gradients as default polish.', 'Do not add icons beside every heading.', 'Do not over-round surfaces.'],
    examplePackIds: [],
  },
  {
    id: 'data-utility',
    label: 'Data Utility',
    bestFor: ['research findings', 'finance', 'operations', 'engineering reviews', 'workbooks'],
    mood: 'Evidence-first, dense when needed, clear under scrutiny. Trust beats atmosphere.',
    palette: {
      colors: {
        canvas: '#f7f9fb',
        surface: '#ffffff',
        raisedSurface: '#ffffff',
        text: '#132033',
        mutedText: '#5a667a',
        accent: '#0f766e',
        accentText: '#ffffff',
        border: '#d4dde8',
        subtleFill: '#eef4f7',
        positive: '#15803d',
        warning: '#b45309',
        negative: '#b91c1c',
      },
      chartPalette: ['#0f766e', '#1d4ed8', '#7c2d12', '#6d28d9', '#475569'],
      spacing: commonSpacing,
      radius: { none: '0', sm: '2px', md: '6px', lg: '8px' },
      elevation: { none: 'none', low: 'none', medium: '0 10px 24px rgba(19, 32, 51, 0.08)' },
      table: { headerFill: '#e2eaf2', gridLine: '#cbd7e3', emphasisFill: '#eef4f7' },
      motion: { intensity: 'none', maxDurationMs: 0 },
    },
    typography: {
      families: {
        display: '"Aptos Display", "Inter", system-ui, sans-serif',
        body: '"Aptos", "Inter", system-ui, sans-serif',
        mono: '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace',
      },
      scale: {
        eyebrow: '14px',
        title: '70px',
        subtitle: '26px',
        heading: '46px',
        body: '22px',
        caption: '14px',
        metric: '74px',
      },
      weights: commonWeights,
    },
    layoutPosture: [
      'Use charts, tables, annotations, and source notes.',
      'Prefer fewer larger metrics over many equal stats.',
      'Keep decorative systems out of the way.',
    ],
    artifactPosture: {
      presentation: ['Evidence slide every two to three slides.', 'Dark hero only when it improves contrast.', 'Source notes are visible.'],
      document: ['Use method, findings, evidence, implications, and sources.', 'Make tables and citations first-class.'],
      spreadsheet: ['Default direction for models and dashboards.', 'Freeze headers, mark generated cells, and trace outputs.'],
    },
    do: ['Use tabular numerics.', 'Label assumptions.', 'Keep chart colors semantic.'],
    dont: ['Do not invent proof.', 'Do not hide source notes.', 'Do not use decorative gradients.'],
    examplePackIds: [],
  },
  {
    id: 'warm-narrative',
    label: 'Warm Narrative',
    bestFor: ['teaching', 'onboarding', 'customer stories', 'workshops', 'proposals'],
    mood: 'Human, guided, and approachable without becoming cute or childish.',
    palette: {
      colors: {
        canvas: '#fbf4ec',
        surface: '#fffaf5',
        raisedSurface: '#ffffff',
        text: '#251f1a',
        mutedText: '#74695e',
        accent: '#8f5b2f',
        accentText: '#fff8f0',
        border: '#e0d2c2',
        subtleFill: '#f1e7dc',
        positive: '#3d755b',
        warning: '#9b6a2e',
        negative: '#a44a3f',
      },
      chartPalette: ['#8f5b2f', '#3d755b', '#5c6f91', '#a07a32', '#74695e'],
      spacing: commonSpacing,
      radius: { none: '0', sm: '6px', md: '10px', lg: '14px' },
      elevation: { none: 'none', low: '0 2px 8px rgba(37, 31, 26, 0.06)', medium: '0 16px 36px rgba(37, 31, 26, 0.10)' },
      table: { headerFill: '#f1e7dc', gridLine: '#e0d2c2', emphasisFill: '#fffaf5' },
      motion: { intensity: 'subtle', maxDurationMs: 650 },
    },
    typography: {
      families: {
        display: '"Newsreader", "Iowan Old Style", Georgia, serif',
        body: '"Aptos", "Inter", system-ui, sans-serif',
        mono: '"IBM Plex Mono", ui-monospace, monospace',
      },
      scale: {
        eyebrow: '15px',
        title: '80px',
        subtitle: '29px',
        heading: '52px',
        body: '24px',
        caption: '16px',
        metric: '84px',
      },
      weights: commonWeights,
    },
    layoutPosture: [
      'Use guided sequences, examples, and story beats.',
      'Favor generous spacing and soft contrast.',
      'Keep visuals grounded in examples, not cute symbols.',
    ],
    artifactPosture: {
      presentation: ['Good for teaching decks with recurring examples.', 'Use warm breakers and simple diagrams.'],
      document: ['Good for playbooks, onboarding, and proposals.', 'Use examples and checklists.'],
      spreadsheet: ['Useful for simple trackers and planning workbooks only.'],
    },
    do: ['Use clear examples.', 'Make steps feel guided.', 'Keep language plain.'],
    dont: ['Do not use emoji as icons.', 'Do not use playful clutter.', 'Do not over-soften business artifacts.'],
    examplePackIds: [],
  },
  {
    id: 'bold-editorial',
    label: 'Bold Editorial',
    bestFor: ['launch decks', 'campaigns', 'manifestos', 'creative reviews'],
    mood: 'High contrast, big type, sparse copy, and deliberate tension.',
    palette: {
      colors: {
        canvas: '#111111',
        surface: '#1d1d1d',
        raisedSurface: '#f5f1e8',
        text: '#f5f1e8',
        mutedText: '#b8afa2',
        accent: '#ff5a3c',
        accentText: '#111111',
        border: '#3a3732',
        subtleFill: '#202020',
        positive: '#7dd3a8',
        warning: '#f2b84b',
        negative: '#ff6b62',
      },
      chartPalette: ['#ff5a3c', '#f5f1e8', '#7dd3a8', '#f2b84b', '#b8afa2'],
      spacing: commonSpacing,
      radius: { none: '0', sm: '2px', md: '4px', lg: '6px' },
      elevation: { none: 'none', low: 'none', medium: 'none' },
      table: { headerFill: '#202020', gridLine: '#3a3732', emphasisFill: '#1d1d1d' },
      motion: { intensity: 'moderate', maxDurationMs: 800 },
    },
    typography: {
      families: {
        display: '"Arial Narrow", "Aptos Display", Impact, system-ui, sans-serif',
        body: '"Inter", "Aptos", system-ui, sans-serif',
        mono: '"IBM Plex Mono", ui-monospace, monospace',
      },
      scale: {
        eyebrow: '15px',
        title: '104px',
        subtitle: '30px',
        heading: '64px',
        body: '24px',
        caption: '16px',
        metric: '116px',
      },
      weights: commonWeights,
    },
    layoutPosture: [
      'Use fewer, stronger objects.',
      'Let scale and contrast create energy.',
      'Break symmetry deliberately, not randomly.',
    ],
    artifactPosture: {
      presentation: ['Best for short high-impact decks.', 'Use big statements and stark transitions.'],
      document: ['Use only for short branded briefs.', 'Avoid long-form dense reading.'],
      spreadsheet: ['Not a default spreadsheet direction. Use only for summary dashboards.'],
    },
    do: ['Make the headline unmistakable.', 'Use hard contrast.', 'Cut copy aggressively.'],
    dont: ['Do not use for dense operational artifacts.', 'Do not add many small cards.', 'Do not mix multiple accents.'],
    examplePackIds: ['presentation/editorial-stage-v1'],
  },
] as const;

export function listArtifactDesignDirections(): ArtifactDesignDirection[] {
  return AURA_DESIGN_DIRECTIONS.map((direction) => ({
    ...direction,
    palette: {
      ...direction.palette,
      colors: { ...direction.palette.colors },
      chartPalette: [...direction.palette.chartPalette],
      spacing: { ...direction.palette.spacing },
      radius: { ...direction.palette.radius },
      elevation: { ...direction.palette.elevation },
      table: { ...direction.palette.table },
      motion: { ...direction.palette.motion },
    },
    typography: {
      ...direction.typography,
      families: { ...direction.typography.families },
      scale: { ...direction.typography.scale },
      weights: { ...direction.typography.weights },
    },
    layoutPosture: [...direction.layoutPosture],
    artifactPosture: {
      presentation: [...direction.artifactPosture.presentation],
      document: [...direction.artifactPosture.document],
      spreadsheet: [...direction.artifactPosture.spreadsheet],
    },
    do: [...direction.do],
    dont: [...direction.dont],
    examplePackIds: [...direction.examplePackIds],
  }));
}

export function getArtifactDesignDirection(id: string | undefined): ArtifactDesignDirection | undefined {
  return AURA_DESIGN_DIRECTIONS.find((direction) => direction.id === id);
}

export function isBuiltinArtifactDesignDirectionId(value: string): value is BuiltinArtifactDesignDirectionId {
  return AURA_DESIGN_DIRECTIONS.some((direction) => direction.id === value);
}

export function resolveArtifactDesignDirectionId(value: string | undefined): ArtifactDesignDirectionId {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'editorial-magazine';
  const exact = AURA_DESIGN_DIRECTIONS.find((direction) => direction.id === normalized);
  if (exact) return exact.id;
  if (/(editorial|magazine|investor|strategy|thought)/.test(normalized)) return 'editorial-magazine';
  if (/(minimal|modern|saas|product|software|internal)/.test(normalized)) return 'modern-minimal';
  if (/(data|research|finance|analysis|operation|engineering|spreadsheet)/.test(normalized)) return 'data-utility';
  if (/(warm|teaching|training|workshop|onboarding|proposal|customer)/.test(normalized)) return 'warm-narrative';
  if (/(bold|launch|campaign|manifesto|creative)/.test(normalized)) return 'bold-editorial';
  return 'editorial-magazine';
}

