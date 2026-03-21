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
- **NEVER** use card-grid more than twice in a deck — it is the most overused pattern
- Include at least ONE of: metrics-row, timeline, or process-steps (data/structure slides)
- Include at least ONE of: pull-quote or split-text-visual (breathing room slides)`;
}
