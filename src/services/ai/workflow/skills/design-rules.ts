/**
 * Design rules — Structured with "WHY" reasoning per Anthropic Skills methodology.
 *
 * Principles:
 * - Each rule explains WHY it exists (reasoning > rigid directive)
 * - Rules grouped by fragility: prescriptive where consistency matters, loose where creativity is valid
 * - Gotchas capture the highest-value corrections from real generation failures
 *
 * Used by:
 * - The reviewer agent to audit generated slides (buildReviewRules)
 * - The designer agent's prompt to prevent errors upfront (via prompts/sections/anti-patterns.ts)
 * - QA validator for programmatic checks
 */

// ── Anti-patterns (things that MUST be caught) ──────────────

export const ANTI_PATTERNS = [
  // Typography
  'Do NOT use Inter as the only font — it signals "undesigned" because it is the default fallback. The palette provides curated font pairings; use them.',
  'Never set body text below 1.1em (~40px at 1920×1080) because text that looks fine in a code editor is illegibly small on a projected slide.',
  'Hero titles MUST be at least 4em (~144px) because timid titles fail to anchor the slide and make the whole deck look amateur.',
  'H2 slide titles must be at least 2.4em (~86px) because they must visually anchor each slide at a glance.',
  'Heading line-height must be ≤ 1.2 because anything higher makes headings look loose and unprofessional.',
  'Never use more than 2 font families (3 if one is monospace for code) because too many fonts create visual noise instead of hierarchy.',
  'Avoid ALL-CAPS on body text or long headings — reserve for short labels only, because all-caps reduces readability by ~20%.',

  // Color & Contrast
  'Do NOT use gray text on a colored background — use a tinted version of the bg color instead, because pure gray looks out-of-palette and washed out.',
  'Never use pure black (#000) on pure white (#fff) — use #0f172a or #1e293b instead, because the harsh contrast causes eye strain.',
  'Accent colors must have ≥ 4.5:1 contrast ratio against their background because WCAG AA compliance ensures readability.',
  'Do NOT use more than 2 accent colors per slide because additional colors dilute the visual hierarchy.',
  'Do NOT use the same opacity for surface and border — border must be visibly distinct from surface fill, because otherwise cards have no visible edge.',
  'Never apply backdrop-filter:blur on LIGHT mode slides — use solid surfaces with box-shadow instead, because blur on light backgrounds looks muddy and washed out.',
  'Do NOT use bright accent colors as large background fills because accents lose their emphasis when overused — they work only on SMALL elements: icons, badges, dividers.',
  'Never pair two saturated colors adjacently (e.g., bright red card next to bright blue card) because the visual vibration hurts readability. Use one saturated + one neutral.',
  'Do NOT use the primary color as body text because primary is reserved for accent elements ONLY (icons, metrics, buttons, dividers) — body text uses the body token.',
  'NEVER place dark text on a dark background or light text on a light background. This is the #1 most common LLM generation error. Always verify: dark bg → light text, light bg → dark text.',
  'Never set text opacity below 0.55 for ANY readable text because muted labels at rgba(…, 0.3) or rgba(…, 0.4) are unreadable on any background.',
  'On light backgrounds, use the dark heading/body colors from the palette. On dark backgrounds, use the light heading/body colors. Do NOT invert this, because it causes invisible text.',

  // Spatial Design
  'Do NOT nest cards inside cards because it creates visual noise and wastes precious slide space.',
  'Never have unequal gutters in a grid — all gaps must be consistent because irregular spacing looks broken.',
  'Content must never touch the edges — minimum 4rem 5rem padding on all slides because slide edges are often clipped during projection.',
  'Avoid orphaned elements (single card in a row that should have siblings) because they look unfinished.',
  'Content must fill at least 60-70% of the 1920×1080 slide area because small clusters of content floating in the center look unfinished and waste the large canvas.',
  'Wrap all slide content in a full-size container: width:100%; height:100%; padding:4rem 5rem; box-sizing:border-box; — do NOT use max-width:90% with margin:auto because it clusters everything in the center.',
  'Cards and panels should be substantial — minimum 150-200px tall because tiny cards look like thumbnail previews, not presentation content.',

  // Motion Design
  'Do NOT use bounce easing because it looks cheap, dated, and undermines professional credibility.',
  'Never animate more than 3 elements simultaneously on a single slide because too many moving parts confuse the viewer.',
  'Entry animations should be 300-600ms because below feels snappy (intentional) and above feels sluggish (unintentional).',
  'Do NOT apply continuous animations (.anim-infinite) to text because it distracts from reading — only decorative background elements should loop.',

  // Interaction Design
  'Fragment reveals must follow reading order (top-to-bottom, left-to-right) because out-of-order reveals confuse the audience.',
  'Never use more than 6 fragment steps per slide because audiences lose patience beyond that.',

  // Layout
  'Slide content wrapper should use width:100% with internal padding (4rem 5rem), not max-width:90% with margin:auto because center-clustering wastes the large 1920×1080 canvas.',
  'Grid columns: max 4 columns for cards, max 6 for icon grids — more becomes unreadable at presentation distance.',
  'Never stack more than 5 bullet points — split into two columns or cards instead, because walls of bullets kill engagement.',

  // UX Writing
  'Headings should be 2–8 words because filler words dilute impact — cut mercilessly.',
  'Bullet points: max 12 words each because if longer, the content should be a card with title + body.',
  'Never use "Click here" or "Next slide" because the presentation flow handles navigation automatically.',

  // SVG
  'Max 2 SVG-heavy slides per deck because overuse turns a presentation into an infographic.',
  'All inline SVGs MUST have a viewBox attribute because without it they will not scale correctly across different screen sizes.',
  'Do NOT use SVG illustrations on animation level 1 (minimal) presentations — keep it text and CSS only.',
  'Inline SVG icons MUST have explicit width and height attributes because relying on the parent container for sizing is unreliable.',

  // Visual Content — SVG illustration rules
  'NEVER draw recognizable real-world objects (animals, people, faces, buildings, vehicles, food) in SVG or CSS — LLMs always produce ugly geometric blobs. Use large emoji (5-8em) for real subjects, with abstract SVG accents (hearts, sparkles, flowing lines) around them.',
  'Do NOT create "visual placeholder" panels — large empty containers with only a vague tagline and decorative SVG. Every panel must contain substantive content (data, lists, diagrams, or concrete text).',

  // Slide Structure — prevents thin decks and monotony
  'A new presentation MUST have at least 8 slides. A 5-slide deck is NEVER acceptable because it cannot cover the narrative arc (title → context → solution → content → insight → closing).',
  'NEVER repeat the same layout pattern on consecutive slides because it makes the deck feel monotonous. Vary between: bento-grid, split-text-visual, metrics-row, timeline, comparison, icon-grid, pull-quote, process-steps, card-grid.',
  'NEVER use the emoji-in-a-box card pattern (colored-box → emoji → heading → paragraph) more than twice per deck. It is the #1 most overused pattern.',

  // Palette Compliance (NEW — prevents color invention)
  'You MUST use exactly the color values provided in the palette. Do NOT invent new hex colors, because the palette colors are pre-tuned for contrast, harmony, and mode-awareness.',
  'CSS custom properties (--primary, --accent, --heading-font, --body-font) must appear ONLY on the FIRST <section>. All subsequent sections reference them with var(). Duplicating them wastes tokens and risks inconsistency.',
] as const;

// ── Design Principles (positive guidance) ───────────────────

export const DESIGN_PRINCIPLES = {
  typography: [
    'Use a clear 3-level hierarchy: hero/title (3.5-4em), heading (2.4em), body (1.1em). This anchors each slide visually.',
    'Letter-spacing: tight on headings (-0.02em to -0.03em), normal on body. Tight tracking makes large text feel premium.',
    'Use font-weight contrast: 700-800 headings, 400 body, 500-600 labels. Weight variation drives hierarchy without color.',
    'Monospace for data, numbers, and code snippets — it signals "factual" and aids scanability.',
  ],
  color: [
    'Build from a single background color. Surface = bg + subtle lightness shift. This creates natural depth.',
    'Borders should be near-invisible: 6-10% opacity of the heading color. They define edges without demanding attention.',
    'Use color temperature intentionally: cool = professional, warm = approachable. Match the topic.',
    'Gradient text for hero titles only in DARK mode — never on body or small text, NEVER on light backgrounds because it kills contrast.',
  ],
  colorSystem: [
    'Apply 60-30-10 rule: 60% background, 30% surface/cards, 10% primary accent color. This prevents accent overuse.',
    'Every color has a role: bg=canvas, surface=containers, primary=emphasis, accent=highlights. Mixing roles creates visual chaos.',
    'Light themes: depth via shadows (not transparency). Dark themes: depth via layered translucency. These are mode-specific — do not cross-apply.',
    'Tint technique: primary color at 8-12% opacity for subtle icon/badge backgrounds. This creates cohesive accent areas.',
    'Contrast hierarchy: heading=highest contrast, body=high, muted=medium, border=low. This guides the eye correctly.',
  ],
  spatial: [
    'Whitespace is design. 30-40% of each slide should be breathing room — but not vast empty voids.',
    'Group related elements with proximity. Separate groups with generous gaps. Proximity drives meaning.',
    'Consistent border-radius: 12-16px for cards, 8-10px for smaller elements, 999px for pills, 50% for avatars.',
    'Visual weight should flow top-left to bottom-right (F-pattern reading). Place the most important element top-left or center.',
  ],
  motion: [
    'Entrance: elements should come from the direction of content flow (up or left). This feels natural.',
    'Stagger delays: 80-120ms between items in a group. This creates a cascade effect without feeling slow.',
    'Scene backgrounds (particles, aurora) on max 2 slides — overuse kills impact and distracts from content.',
    'Use .anim-stagger container for automatic child delay cascading instead of manually setting delays.',
  ],
  svg: [
    'Use SVGs for diagrams, charts, and illustrations — they scale perfectly at any resolution.',
    'SVG colors should reference palette tokens: primary for strokes, surface for fills, muted for labels.',
    'Animated SVGs: limit to stroke-dashoffset (draw-in), transform, and opacity transitions. Other properties cause jank.',
    'Diagram readability: max 6-8 nodes, minimum 12px font-size in SVG text elements.',
    'Bootstrap Icons CDN for broad icon coverage; inline SVGs for custom visuals and data viz only.',
  ],
} as const;

// ── Gotchas — highest-value corrections from real failures ──

export const GOTCHAS = [
  'The LLM will often produce only 5 slides when asked for a full presentation. The planner specifies the exact slide count — ALWAYS match it.',
  'When the palette is "Coral Energy" (light mode), the LLM tends to invent its own warm palette instead of using the provided tokens. Use the EXACT hex values from the palette table.',
  'CSS custom properties get duplicated on every <section> tag. They should ONLY be on the first <section>. All others inherit via var().',
  'The LLM loves to create "decorative visual panels" — large empty boxes with a tagline like "More Love, More Joy" and an abstract SVG. These are content-free. Replace with actual data, lists, or concrete statements.',
  'NEVER draw recognizable real objects (dogs, people, buildings) in SVG or CSS — the result is always ugly blobs. For real-world subjects, use large emoji (5-8em) as the focal visual with abstract animated SVG accents (hearts, flowing lines, pulsing dots) around them.',
  'On light-mode slides, the LLM sometimes applies backdrop-filter:blur() which makes everything look muddy. Light mode uses solid surfaces with box-shadow for depth.',
  'The LLM defaults to card-grid layout for everything. A good deck uses at least 4 different layout types across its slides.',
  'Custom web-font links are not allowed in runtime presentation fragments. Use system font stacks or local @font-face only.',
] as const;

// ── Review Prompt Builder ───────────────────────────────────

export function buildReviewRules(): string {
  const antiPatternList = ANTI_PATTERNS.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
  const principlesSections = Object.entries(DESIGN_PRINCIPLES)
    .map(([domain, rules]) => `### ${domain}\n${rules.map((r) => `- ${r}`).join('\n')}`)
    .join('\n\n');
  const gotchasList = GOTCHAS.map((g, i) => `  ${i + 1}. ${g}`).join('\n');

  return `## DESIGN ANTI-PATTERNS — Catch ALL of these:\n${antiPatternList}\n\n## DESIGN PRINCIPLES:\n${principlesSections}\n\n## GOTCHAS — Common LLM generation failures:\n${gotchasList}`;
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

/** Gotchas section for the designer prompt */
export function buildGotchas(): string {
  return GOTCHAS.map((g, i) => `${i + 1}. ${g}`).join('\n');
}
