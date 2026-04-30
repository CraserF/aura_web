# Executive Editorial Scaffold Checklist

This scaffold follows the reference-repo pattern: the harness owns structure, CSS, classes, rhythm, and validation. The agent only fills approved slots.

## P0 Blocking

- One deck has exactly one `<style>` block emitted by the compiler.
- Every slide uses one locked skeleton from this pack.
- Every class in slide sections is defined in `style.css` or approved by Aura runtime.
- No inline `style` attributes.
- No raw viewport units for type or layout.
- If animation exists, `prefers-reduced-motion` exists.
- Every section has concrete `data-background-color`.
- No placeholder tokens, emoji icons, remote scripts, or remote assets.
- Required slots must be non-empty after compilation.

## P1 Rhythm

- Slide 1 establishes motif, class vocabulary, type scale, and theme tokens.
- Adjacent content slides should not repeat the same skeleton.
- Decks of 6 or more slides need a hero or breaker rhythm every 3-4 slides.
- Avoid three-slide runs with the same mood and density.
- Use metric proof, comparison, process, and closing skeletons to break card-wall repetition.

## P2 Export

- `editable-pptx` mode avoids complex filters, excessive nested spans, and text-as-image patterns.
- Media slots must keep declared aspect ratio and crop mode.
- Titles in compact layouts should stay below their scaffold slot max length.
