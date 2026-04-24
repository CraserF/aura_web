# Aura Workflow Gap Analysis

Date: 2026-04-24

This gap analysis maps the external benchmark findings onto Aura's current workflow shape.

## Current Strengths

- Aura already has a strong validation and scorecard foundation.
- Aura already has templates, exemplar packs, and provider capability notes.
- Aura already has a presentation batch queue, but it is too narrow and not yet the dominant workflow shape.
- Aura already has spreadsheet planning and deterministic execution.

## Main Gaps

### 1. Presentation workflow shape is still too narrow

- Most presentation work still behaves like a single-slide pipeline.
- Multi-slide create/edit requests are not yet treated as a first-class queued experience.
- Progress is better than before, but completion time is still too slow for local presentation edits.

### 2. Intent separation is too weak

- Aura still routes too many requests through generic create/edit paths.
- Restyle vs content edit vs rewrite needs to be explicit before prompt generation begins.
- The user should not need to know the internal distinction, but Aura does.

### 3. Quality guidance is too generic

- Templates and exemplars exist, but the prompt layer still leans too hard on generic “make it beautiful” instructions.
- Local models need a stricter guidance profile than frontier models.
- Presentation quality still drifts toward ordinary office decks too often.

### 4. Documents need the same workflow discipline as presentations

- Documents already generate better than presentations in some cases, but they still need stronger separation between content changes, style shifts, and structural rewrites.
- Long-form work should eventually use section planning and staged generation rather than one opaque pass.

### 5. Benchmarking is present but not yet centered on workflow quality

- The validation protocol is broad, but we still need a tighter benchmark loop for timing, quality, continuity, and queue behavior on the artifact families we care about most.

## Recommended Sequence

1. Presentation-first workflow planner and queue hardening
2. Presentation prompt-pack and template-guidance improvements
3. Document adoption of the same planner semantics
4. Spreadsheet alignment for routing and explain/dry-run clarity
5. Full quality benchmark loop plus Ollama baseline tuning
