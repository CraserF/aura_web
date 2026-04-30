export const EDITORIAL_STAGE_TOKENS = {
  colors: {
    ink: '#171717',
    paper: '#f7f3e8',
    surface: '#fffdf7',
    quietSurface: '#ece7dc',
    reverseInk: '#fffaf0',
    charcoal: '#202226',
    night: '#111318',
    line: '#d7d0c3',
    muted: '#68635b',
    accent: '#b4472f',
    accentAlt: '#1f6f68',
    dataBlue: '#2563a8',
    dataGreen: '#3f7f52',
    dataGold: '#b7791f',
    risk: '#9b2c2c',
  },
  typography: {
    display: {
      family: '"Newsreader", "Iowan Old Style", Georgia, serif',
      weight: 720,
      lineHeight: 0.94,
      letterSpacing: '0',
    },
    body: {
      family: '"Inter", "Aptos", system-ui, sans-serif',
      weight: 430,
      lineHeight: 1.28,
      letterSpacing: '0',
    },
    mono: {
      family: '"SFMono-Regular", "IBM Plex Mono", ui-monospace, monospace',
      weight: 700,
      lineHeight: 1.1,
      letterSpacing: '0',
    },
  },
  spacing: {
    stagePaddingX: 72,
    stagePaddingY: 56,
    xs: 8,
    sm: 12,
    md: 20,
    lg: 32,
    xl: 48,
    xxl: 72,
  },
  density: {
    calm: { maxTextBlocks: 3, maxBodyLines: 5 },
    balanced: { maxTextBlocks: 5, maxBodyLines: 9 },
    dense: { maxTextBlocks: 8, maxBodyLines: 14 },
  },
  radius: {
    media: 6,
    frame: 4,
    control: 6,
    cardLikePanelMax: 8,
  },
  borders: {
    hairline: '1px solid #d7d0c3',
    heavyRule: '3px solid #171717',
    accentRule: '4px solid #b4472f',
  },
  charts: {
    categorical: ['#171717', '#2563a8', '#b4472f', '#3f7f52', '#b7791f', '#6b7280'],
    sequential: ['#e9edf2', '#b9c9dc', '#7b9cbd', '#3f6f9d', '#173b63'],
  },
  motion: {
    htmlPdf: ['hero', 'cascade', 'quote', 'directional', 'pipeline'],
    editablePptx: ['static', 'minimal-fade'],
    reducedMotionRequired: true,
  },
  exportRestrictions: {
    noViewportUnitsInsideStage: true,
    noInlineStylesInSlots: true,
    noArbitraryHexFromModel: true,
    oneStyleBlock: true,
  },
} as const;

export const EDITORIAL_STAGE_DIRECTIONS = {
  'editorial-magazine': {
    label: 'Editorial Magazine',
    mood: 'paper, ink, confident whitespace, restrained warm accent',
    typography: 'serif display, sans body, mono metadata',
  },
  'modern-minimal': {
    label: 'Modern Minimal',
    mood: 'precise grid, cool white surfaces, cobalt accent, product evidence first',
    typography: 'system sans display and body, mono numerics',
  },
  'data-utility': {
    label: 'Data Utility',
    mood: 'evidence-first, compact rules, annotated numbers, no oversized decoration',
    typography: 'sans display and body, mono data labels',
  },
  'warm-narrative': {
    label: 'Warm Narrative',
    mood: 'human, guided, reflective, useful for teaching or customer stories',
    typography: 'soft serif display, humanist sans body',
  },
  'bold-editorial': {
    label: 'Bold Editorial',
    mood: 'high contrast, asymmetric lockups, large statements, sparse proof',
    typography: 'assertive display, restrained body',
  },
} as const;

export type EditorialStageDirectionId = keyof typeof EDITORIAL_STAGE_DIRECTIONS;
