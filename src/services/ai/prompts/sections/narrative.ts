/**
 * Narrative section — slide structure, narrative arc, and layout variety mandate.
 *
 * Key improvements:
 * - Slide count is a HARD CONTRACT tied to the planner outline
 * - Layout variety is enforced with a minimum variety threshold
 * - Each layout type has a concrete description so the LLM knows WHEN to use it
 */

export function buildNarrativeSection(slideCount?: number): string {
  const countInstruction = slideCount
    ? `\n\n**SLIDE COUNT CONTRACT: You MUST produce exactly ${slideCount} slides.** The planner has determined this is the right number. Producing fewer is a critical error — it means missing parts of the narrative. Producing more is wasteful. Match the count exactly.`
    : '\n\nMinimum 8 slides, maximum 15. Fewer than 8 cannot cover the narrative arc.';

  return `## SLIDE STRUCTURE — NARRATIVE ARC

Every deck MUST follow this narrative structure:

| Position | Type | Purpose | Suggested Layouts |
|----------|------|---------|-------------------|
| Slide 1 | **Title** | Hero title, scene background, accent divider, subtitle | \`hero-title\` |
| Slide 2 | **Problem / Context** | Set the stage with a bold statement or comparison | \`split-text-visual\`, \`comparison\` |
| Slide 3 | **Solution / Overview** | Introduce the core idea | \`icon-grid\`, \`card-grid\`, \`bento-grid\` |
| Slides 4-N-2 | **Content** (3-6 slides) | Deep dive with VARIED layouts | Mix of all layout types |
| Slide N-1 | **Key Insight / Quote** | Pivotal moment, large typography | \`pull-quote\` |
| Slide N | **Closing / CTA** | Strong ending, action button or summary | \`closing-cta\` |
${countInstruction}

## LAYOUT VARIETY MANDATE

You MUST use at least 4 different layout types across the deck. Using the same layout more than twice is a failure.

### Available layout types and WHEN to use each:
| Layout | Best For | Grid Pattern |
|--------|----------|-------------|
| \`hero-title\` | Title slide, big statements | Centered, full-width |
| \`bento-grid\` | Features, capabilities (mixed card sizes) | \`grid-template-columns: 1fr 1fr\` or mixed |
| \`split-text-visual\` | Text + supporting visual side-by-side | \`grid-template-columns: 1fr 1.2fr\` |
| \`metrics-row\` | Key statistics, KPIs | \`repeat(3,1fr)\` or \`repeat(4,1fr)\` |
| \`timeline\` | Sequential events, phases, roadmaps | Horizontal or vertical flow |
| \`comparison\` | Before/after, pros/cons, vs. | \`repeat(2,1fr)\` |
| \`icon-grid\` | Feature lists, value props | \`repeat(3,1fr)\` with icon+text |
| \`pull-quote\` | Key insights, testimonials | Centered large text |
| \`process-steps\` | How it works, numbered steps | Horizontal numbered flow |
| \`card-grid\` | Uniform items (team, features) | \`repeat(3,1fr)\` |
| \`closing-cta\` | Call to action, summary | Centered with button |

### Layout sequencing rules:
- **NEVER** use the same layout on consecutive slides
- **NEVER** use card-grid or icon-grid more than twice in a deck — it is the most overused pattern. Using it 3+ times is a CRITICAL ERROR that makes the entire deck monotonous.
- **NEVER** use the "emoji-in-a-box card" pattern more than twice. If you catch yourself creating 3+ cards that each have a colored box containing an emoji followed by a heading and paragraph, STOP. Switch to: metric cards (big number + label), SVG mini-diagrams inside cards, progress bars, timeline nodes, comparison columns, or split-panel layouts.
- Include at least ONE of: metrics-row, timeline, or process-steps (data/structure slides)
- Include at least ONE of: pull-quote or split-text-visual (breathing room slides)

## VISUAL SPECTACLE MANDATE

Every deck MUST include **at least 2 slides with rich inline SVG illustrations** — not just Bootstrap Icons or emoji in cards. These are the visual centerpiece that makes the deck spectacular.

### Required visual elements:
1. **Title slide**: MUST have a composed SVG background scene (animated shapes, flowing lines, floating elements — see hero-scenes reference)
2. **At least 1-2 content slides**: MUST feature SVG-embedded visuals: cards with inline SVG mini-diagrams (funnels, shields, flow cycles, progress rings), or a split-panel with an SVG scene + text
3. **Closing slide**: Should include at least an animated accent element (pulsing rings, floating shapes, shimmer effects)

### What makes slides editorial-quality (aim for this):
- **Cards with inline SVG mini-illustrations** — each card gets a unique SVG (funnel, shield, circular flow, bar chart, network nodes) instead of emoji. The SVG is small (80-150px) but composed (5-15 elements) with animation.
- **Asymmetric grid layouts** — not every column the same width. Use \`grid-template-columns: 1.15fr 0.85fr\` or \`1.2fr 1fr\` for visual interest.
- **Animated data visualizations** — progress rings with animated stroke-dasharray, tapered capital stacks with sweep animations, flowing dashed pipelines connecting elements.
- **Magazine-style typographic hierarchy** — serif headings (Playfair Display, Lora), sans-serif body (Source Sans, Inter), uppercase spaced-out labels at 9-10px.
- **Accent borders on cards** — \`border-left: 5px solid var(--primary)\` with different colors per card for visual variety.
- **Pill badges with contextual labels** — small rounded pills (\`border-radius:20px; padding:3px 10px; font-size:0.7em\`) for tags, statuses, dates.
- **Shimmer sweep effects** on cards — a translucent gradient div animating left-to-right across a card.

### Anti-pattern — the boring deck:
- ❌ 10 slides of card-grids with emoji-in-a-box = boring and forgettable
- ❌ Only emoji for visual interest = lazy and amateurish
- ❌ Same layout repeated 4+ times = monotonous
- ❌ Every card identical (icon-box → heading → paragraph) = template-like, not designed
- ✅ Mix of SVG mini-illustrations, animated scenes, data visualizations, and varied layouts = spectacular
- ✅ Cards that each have DIFFERENT visual treatments (one with SVG funnel, one with metric, one with progress bar) = editorial quality`;
}
