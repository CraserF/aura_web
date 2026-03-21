/**
 * Design rules and anti-patterns extracted from impeccable
 * (github.com/pbakaus/impeccable) — 7 design domains.
 *
 * Used by:
 * - The reviewer agent to audit generated slides (buildReviewRules)
 * - The designer agent's prompt to prevent errors upfront (via prompts/sections/anti-patterns.ts)
 * - Condensed generation rules for quick reference (buildGenerationRules)
 */

// ── Anti-patterns (things that MUST be caught) ──────────────

export const ANTI_PATTERNS = [
  // Typography
  'Do NOT use Inter as the only font — it signals generic/undesigned.',
  'Never set body text below 0.85em (16px equivalent at slide scale).',
  'Heading line-height must be ≤ 1.2 — anything higher looks loose.',
  'Never use more than 2 font families (3 if one is monospace for code).',
  'Avoid ALL-CAPS on body text or long headings — reserve for labels only.',

  // Color & Contrast
  'Do NOT use gray text on a colored background — use a tinted version of the bg color instead.',
  'Never use pure black (#000) on pure white (#fff) — too harsh. Use #0f172a or #1e293b.',
  'Accent colors must have ≥ 4.5:1 contrast ratio against their background.',
  'Do NOT use more than 2 accent colors per slide. One primary, one secondary.',
  'Do NOT use the same opacity for surface and border — border must be visibly distinct from surface fill.',
  'Never apply backdrop-filter:blur on LIGHT mode slides — use solid surfaces with box-shadow instead.',
  'Do NOT use bright accent colors as large background fills. Accents are for SMALL elements: icons, badges, dividers.',
  'Never pair two saturated colors adjacently (e.g., bright red card next to bright blue card). One saturated + one neutral.',
  'Do NOT use the primary color as body text. Primary is for accent elements ONLY (icons, metrics, buttons, dividers).',
  'NEVER place dark text on a dark background or light text on a light background. This is the #1 most common error. Always verify: dark bg → light text, light bg → dark text.',
  'Never set text opacity below 0.55 for ANY readable text. Muted labels at rgba(…, 0.3) or rgba(…, 0.4) are unreadable. Use minimum 0.55 opacity.',
  'On light backgrounds, use the dark heading/body colors from the palette. On dark backgrounds, use the light heading/body colors from the palette. Do NOT invert this.',

  // Spatial Design
  'Do NOT nest cards inside cards — creates visual noise.',
  'Never have unequal gutters in a grid — all gaps must be consistent.',
  'Content must never touch the edges — minimum 2rem padding on all slides.',
  'Avoid orphaned elements (single card in a row that should have siblings).',

  // Motion Design
  'Do NOT use bounce easing — it looks cheap and dated.',
  'Never animate more than 3 elements simultaneously on a single slide.',
  'Entry animations should be 300-600ms — below feels snappy, above feels sluggish.',
  'Do NOT apply continuous animations (.anim-infinite) to text — only to decorative elements.',

  // Interaction Design
  'Fragment reveals must follow reading order (top-to-bottom, left-to-right).',
  'Never use more than 6 fragment steps per slide — audience loses patience.',

  // Responsive / Layout
  'Slide content must use max-width ≤ 90% and be centered.',
  'Grid columns: max 4 columns for cards, max 6 for icon grids.',
  'Never stack more than 5 bullet points — split into two columns or cards instead.',

  // UX Writing
  'Headings should be 2–8 words. Cut filler words mercilessly.',
  'Bullet points: max 12 words each. If longer, rewrite as a card with title + body.',
  'Never use "Click here" or "Next slide" — the presentation flow handles navigation.',
] as const;

// ── Design Principles (positive guidance) ───────────────────

export const DESIGN_PRINCIPLES = {
  typography: [
    'Use a clear 3-level hierarchy: hero/title (3.5em), heading (2.2em), body (0.9-1em).',
    'Letter-spacing: tight on headings (-0.02em), normal on body.',
    'Use font-weight contrast: 700-800 headings, 400 body, 500-600 labels.',
    'Monospace for data, numbers, and code snippets.',
  ],
  color: [
    'Build from a single background color. Surface = bg + subtle lightness shift.',
    'Borders should be near-invisible: 6-10% opacity of the heading color.',
    'Use color temperature intentionally: cool = professional, warm = approachable.',
    'Gradient text for hero titles only — never on body or small text. NEVER on light backgrounds.',
  ],
  colorSystem: [
    'Apply 60-30-10 rule: 60% background, 30% surface/cards, 10% primary accent color.',
    'Every color has a role: bg=canvas, surface=containers, primary=emphasis, accent=highlights.',
    'Light themes: depth via shadows (not transparency). Dark themes: depth via layered translucency.',
    'Tint technique: primary color at 8-12% opacity for subtle icon/badge backgrounds.',
    'Contrast hierarchy: heading=highest contrast, body=high, muted=medium, border=low.',
  ],
  spatial: [
    'Whitespace is design. 40% of each slide should be empty.',
    'Group related elements with proximity. Separate groups with generous gaps.',
    'Consistent border-radius: 12-16px for cards, 8px for smaller elements, 50% for avatars.',
    'Visual weight should flow top-left to bottom-right (F-pattern reading).',
  ],
  motion: [
    'Entrance: elements should come from the direction of content flow (up or left).',
    'Stagger delays: 80-120ms between items in a group.',
    'Scene backgrounds (particles, aurora) on max 2 slides — overuse kills impact.',
    'Use .anim-stagger container for automatic child delay cascading.',
  ],
} as const;

// ── Review Prompt Builder ───────────────────────────────────

export function buildReviewRules(): string {
  const antiPatternList = ANTI_PATTERNS.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
  const principlesSections = Object.entries(DESIGN_PRINCIPLES)
    .map(([domain, rules]) => `### ${domain}\n${rules.map((r) => `- ${r}`).join('\n')}`)
    .join('\n\n');

  return `## DESIGN ANTI-PATTERNS — Catch ALL of these:\n${antiPatternList}\n\n## DESIGN PRINCIPLES:\n${principlesSections}`;
}

// ── Generation Rules (condensed for designer prompt) ────────

/** Condensed anti-patterns for injection into the designer's system prompt */
export function buildGenerationRules(): string {
  return ANTI_PATTERNS
    .map((r, i) => `${i + 1}. ${r}`)
    .join('\n');
}

/** Positive design guidelines for the designer */
export function buildDesignGuidelines(): string {
  return Object.entries(DESIGN_PRINCIPLES)
    .map(([domain, rules]) => `**${domain}:** ${(rules as readonly string[]).join(' ')}`)
    .join('\n');
}
