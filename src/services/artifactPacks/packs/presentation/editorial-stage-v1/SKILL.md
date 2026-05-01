# Editorial Stage V1

Use this pack for Aura-owned presentation decks that need a magazine-like editorial rhythm: a clear opening, visible chapter breaks, strong proof moments, media-led evidence, a decision, and a concrete close.

## Use When

- The user asks for a strategy, investor, board, launch, product, or thought-leadership deck.
- The brief needs story, evidence, and recommendation in one artifact.
- The user has screenshots, data, photos, quotes, or source notes that should shape the deck.
- A restrained default is better than exposing templates, colors, and layout knobs.

## Avoid When

- The artifact is a document, spreadsheet, dashboard, or freeform microsite.
- The user needs arbitrary CSS or one-off visual art direction.
- The output is mainly a dense table appendix.

## Workflow

1. Infer audience, purpose, decision, source material, and output mode.
2. Pick one supported direction. Default to `editorial-magazine`.
3. Build a rhythm plan before writing slide slots.
4. Use only the 12 layout families in this pack.
5. Fill declared slots with plain text. Do not insert HTML.
6. Bind media only to declared media slots and choose an allowed ratio and crop mode.
7. Validate rhythm, hierarchy, source support, and copy length before rendering.
8. Repair the source payload, not the compiled HTML.

## Animation Policy

- Keep motion inside the pack's declared roles: `hero`, `cascade`, `quote`, `directional`, `pipeline`, and `static`.
- Prefer no animation unless it clarifies hierarchy, sequence, or a proof moment.
- If animation is added, keep it CSS-only and limited to transform, opacity, filter, or shadow changes.
- Use infinite loops only for screen-recordable ambient/progress motion; do not loop every element by default.
- Always preserve the `prefers-reduced-motion: reduce` fallback.
- Do not add Three.js, WebGL, canvas, particle systems, decorative radial backgrounds, or complex generated scene backgrounds.
- Keep the compiled stage fixed at 1280x720 with overflow hidden.

## Repair Strategy

- If the deck feels repetitive, replace a middle slide with `section-divider`, `question-hero`, or `big-quote`.
- If a slide becomes a wall of equal boxes, rewrite around one dominant claim and use `big-number`, `decision`, or `lead-media`.
- If a metric lacks a source, downgrade it to qualitative copy or add a source note.
- If a product or brand is named but no asset is available, use a type-led layout or a labelled placeholder rather than generic decorative imagery.
- If the title wraps badly, shorten the title before changing the layout.
