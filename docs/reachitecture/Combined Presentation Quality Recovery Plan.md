# Combined Presentation Quality Recovery Plan

Created: 2026-04-28

Status: proposed source-of-truth plan. This document is a planning artifact only. It does not assume source-code changes have been made.

## Purpose

Aura's presentation runtime is structurally much healthier than a simple prompt-regression story suggests, but generated presentation quality is still at risk because the active generation path is now compact enough to have lost some of the design vocabulary that made older slide output feel art-directed.

This is the single recovery plan for presentation quality. It is designed to stand on its own and should be used instead of earlier exploratory plans.

The recommended path is:

1. Keep the new `ArtifactRuntime` direction, queued work model, production template routing, quality bars, and deterministic validation.
2. Restore presentation design knowledge, but as compact runtime-owned design packs, not by dumping the old 190 KB knowledge corpus into every prompt.
3. Fix the current first-draft quality regressions before adding broader orchestration work.
4. Bring single-slide generation up to the same safety and finalization standard as queued decks before softening model-tool rejection gates.
5. Use deterministic quality signals as the source of truth; model evaluation is a bounded optional repair or polish pass, not the oracle.
6. Treat local/Ollama as the same workflow and same signal set, but with provider-calibrated thresholds and budgets until benchmark evidence proves stricter parity is reliable.
7. Surface final quality outcomes plainly, with one explicit manual Improve action after budget exhaustion instead of hidden automatic loops.

## Codebase Assessment

### Active Architecture

Aura is a client-side React app with a service-oriented generation layer. The active presentation path is:

1. `src/services/chat/buildRunRequest.ts`
   - resolves intent;
   - assembles context;
   - creates one `ArtifactRunPlan` through `buildArtifactRunPlan()`.
2. `src/components/chat/handlers/presentationHandler.ts`
   - prepares workflow steps;
   - calls `runPresentationWorkflow()`;
   - updates canvas on streaming, draft, and queued slide events;
   - stores final artifact HTML and runtime diagnostics.
3. `src/services/ai/workflow/presentation.ts`
   - is now mostly a provider/model setup shell;
   - applies provider capability policy;
   - delegates orchestration to `runPresentationRuntime()`.
4. `src/services/artifactRuntime/presentationRuntime.ts`
   - owns planning handoff, queued deck execution, single-slide execution, validation, deterministic repair for queued decks, bounded LLM repair for queued decks, quality telemetry, and finalization.
5. `src/services/artifactRuntime/presentationPrompts.ts`
   - builds the active compact runtime presentation prompts from the run plan, design manifest, style family, narrative plan, quality bar, mobile stage rules, and final format rules.
6. `src/services/ai/workflow/agents/designer.ts`
   - performs initial streamed generation;
   - optionally runs a ToolLoopAgent validate/fix/submit loop.
7. `src/services/ai/workflow/agents/evaluator.ts`
   - runs an optional model evaluator and revision pass.

### What Is Already Done

The broad recovery plan includes several items that are already implemented or partially implemented:

- `ArtifactRunPlan` exists and is the authoritative active run plan.
- `DesignManifest` exists and is attached to presentation run plans.
- `presentationNarrativePlan` exists with promise, audience, arc, visual motif, slide roles, layout map, and continuity rules.
- Queued presentation generation exists for explicit multi-slide requests and add-slide edits.
- Runtime events and visible workflow progress exist.
- Deterministic presentation quality checks exist in `presentationQualityChecklist.ts`.
- Quality bars, quality score, quality grade, failed signals, and polishing decisions exist.
- Production template routing exists; legacy templates are tagged and routed away from active generation.
- Documents and spreadsheets now have their own runtime bridges and quality/craft telemetry.
- Ollama provider capability policy exists and intentionally skips secondary structured evaluation.

The plan should not reimplement these foundations.

### Current Gaps That Still Matter

The immediate quality regression plan is right about several live issues:

- `src/services/ai/knowledge/index.ts` still exposes `getRelevantKnowledge()`, but active presentation generation does not call it.
- `src/services/artifactRuntime/promptPacks.ts` still tells the model to keep structure simple enough for another agent to validate and repair. That conflicts with first-draft quality.
- `src/services/ai/workflow/agents/evaluator.ts` still truncates style blocks to 800 chars before evaluation, which is too small for current slide CSS.
- `src/services/ai/workflow/agents/designer.ts` still rejects `submitFinalSlide` calls with blocking violations, which can cause local and weaker frontier drafts to churn inside tool loops.
- `src/services/artifactRuntime/presentationPrompts.ts` has compact design manifests and reference-quality traits, but it does not include the reusable CSS/SVG/layout vocabulary that the older knowledge docs supplied.

There are also gaps not fully covered by either draft:

- Single-slide runtime does not currently run the same deterministic repair/final validation path as queued deck runtime.
- Single-slide `evaluateAndRevise()` output is not guarded by the same post-revision validation and no-regression checks that queued quality polish uses.
- Single-slide quality polish is only available when `designResult.fastPath` is true. A mechanically repaired but visually weak slide can skip the excellence pass.
- Deck-like prompts without an explicit slide count can still route as single-slide create requests, even when the user says "deck", "keynote", or "presentation".
- `metricsBudget` has target fields, but it does not yet express concrete max steps, max optional passes, or max total runtime behavior at runtime boundaries.
- The benchmark docs exist, but `npm run benchmark:ollama` is not yet in `package.json`.

## Decision: Recommended Direction

The recovery should start with the live quality regression, then harden runtime boundaries around the improved generation path.

### Immediate Recovery Slice

Adopt these as the first implementation slice:

- restore missing design vocabulary;
- remove the "simplify for repair" instruction;
- increase evaluator CSS visibility;
- reduce ToolLoopAgent churn;
- thread design guidance into create, edit, and batch generation.

These target live code seams and are likely to produce the fastest visible quality recovery.

### Prompt Scope Correction

Do not directly inject the full `getRelevantKnowledge()` output into active prompts. The old docs and examples total roughly 190 KB before tokenization, while current prompt contract tests intentionally cap create/edit prompts around 6.5 KB and batch slide prompts around 3.5 KB. Reintroducing the full corpus would fight the runtime architecture and likely hurt local/Ollama reliability.

Instead, build compact presentation design knowledge packs from:

- `src/services/ai/templates/design-system.ts`;
- `src/services/ai/templates/reference-quality-corpus.ts`;
- selected distilled rules from `src/services/ai/knowledge/docs/*`;
- optional tiny synthetic snippets from `reference-style-packs.ts`, if kept under strict caps and confidentiality rules.

### Runtime Direction

Use this runtime direction:

- one bounded runtime path;
- queued slide generation as the default for real deck creation;
- deterministic repair before model repair;
- one bounded model revision or quality polish pass;
- first usable preview telemetry;
- simple visible progress;
- deterministic checks as the release gate;
- local and frontier sharing the same workflow shape.

### Runtime Scope Correction

Do not create a duplicate `PresentationSpec` unless a missing field cannot fit into `ArtifactRunPlan`, `DesignManifest`, or `presentationNarrativePlan`. The current runtime already has those structures. Add fields there if needed.

Do not immediately force Ollama to use the exact same premium threshold as frontier models. The repo already encodes `structured-premium-lite` for local providers, and `docs/validation/ollama-gemma4-baseline.md` says local output should be judged against the supported local baseline, not GPT-4o-level output in every case. The right standard is:

- same workflow;
- same deterministic signal IDs;
- same diagnostics;
- same safety contract;
- provider-calibrated score thresholds and optional-pass budgets.

After benchmark evidence improves, local thresholds can be raised deliberately.

## Additional Hardening Decisions

The plan uses these additional hardening decisions:

- Preserve the compact prompt-pack architecture and avoid reverting to the old composer.
- Treat the first implementation slice as surgical: design knowledge, core wording, evaluator visibility, batch prompt continuity, and loop-churn reduction.
- Add previous-slide continuity context for queued slides, not only the shared style block.
- Make run outcomes user-visible with plain-language states.
- Expose a manual Improve action after budget exhaustion rather than starting hidden second loops.
- Promote weak opening scenes, repeated card grids, missing visuals, and poor continuity into named quality failures.

This plan also includes two important safety constraints:

- Do not inject the full old `getRelevantKnowledge()` output directly. Distill it into compact runtime design packs so prompt size, local reliability, and confidentiality controls remain intact.
- Do not soften `submitFinalSlide` rejection until single-slide runtime finalization uses the same deterministic repair/final validation semantics as queued decks.

## Progress Tracker

Use this section as the canonical progress ledger for this plan. Agents should update it whenever they complete a slice, discover a blocker, or intentionally defer work. Keep updates short and evidence-based so later agents can resume without rereading the entire git history.

Status legend:

- `[ ]` Not started.
- `[~]` In progress or partially implemented.
- `[!]` Blocked or needs decision.
- `[x]` Done with tests or documented manual evidence.

| Step | Status | Owner / Date | Evidence | Notes |
|---|---:|---|---|---|
| 0. Baseline and guardrails | `[x]` | Claude / 2026-04-28 | Plan read, scope confirmed, no implementation changes | No code changes; scope, non-goals, and validation files identified. |
| 1. Compact presentation design knowledge | `[x]` | Claude + Codex / 2026-04-28 | `prompt-contracts.test.ts` — 8 tests pass; createPrompt contains PRESENTATION DESIGN VOCABULARY, title/cover recipe, data-band, footer-rail; fresh slide 1 batch prompt includes full vocabulary; appended queued slide prompt reuses existing deck style; editPrompt contains EDIT DESIGN GUIDANCE | Added `buildPresentationDesignKnowledgePack()` and `buildPresentationEditDesignGuidancePack()` to `presentationPrompts.ts`; wired into create, edit, and batch slide prompts; cap updated to 8.5 KB with explicit fresh/appended batch prompt caps. |
| 2. Remove first-draft quality suppression | `[x]` | Claude / 2026-04-28 | `prompt-contracts.test.ts` — asserts old phrase absent, new phrase present; all 612 tests pass | Replaced "Keep structure simple enough for another agent pass to validate and repair." with "Produce finished, visually polished output. Do not simplify for a repair pass." in `promptPacks.ts`. |
| 3. Shared single/queued finalization | `[x]` | Claude + Codex / 2026-04-28 | `presentation-runtime-workflow.test.ts` — 7 tests pass (3 new: single-slide repair, add-slide validation review state, no-regression polish); full `npm test` — 109 files, 616 tests pass; `tsc --noEmit` clean | `runSinglePresentationRuntime` now calls `validatePresentationRuntimeOutput` → `repairPresentationRuntimeOutput` before quality polish; LLM polish accepted only when validation passes and quality score doesn't regress; `reviewPassed` and telemetry reflect post-repair state. |
| 3A. CSS/design contract gate | `[~]` | Codex / 2026-04-28 | `batch-queue.test.ts`; `prompt-contracts.test.ts`; full `npm test` — 109 files, 616 tests pass; `npm run typecheck` passes | Appended-slide style reset corrected by passing existing style context into first queued appended slide. Full named CSS/design validation gate remains pending. |
| 4. Soften `submitFinalSlide` after finalization is safe | `[x]` | Claude + Codex / 2026-04-28 | `designer-submit.test.ts` proves blocking issues soft-accept with runtime-repair guidance; full `npm test` — 109 files, 616 tests pass; `tsc --noEmit` clean | Changed `submitFinalSlide.execute` from hard rejection to `accepted: true` + `warnings` + `guidance` pointing to runtime repair. Updated tool description. |
| 5. Evaluator context and deterministic-signal revision | `[x]` | Claude / 2026-04-28 | `evaluator.ts` truncation default raised to 3000 chars; `evaluateAndRevise` accepts `deterministicFeedback?`; both runtime paths collect named failures via `collectPresentationNamedFailures` and pass to `evaluateAndRevise`; `buildRevisionUserPrompt` refactored to accept `string[]`; full `npm test` — 109 files, 616 tests pass; `tsc --noEmit` clean | CSS visibility + deterministic-signal-led revision complete. When named failures exist, LLM `generateObject` evaluation is skipped and revision is driven directly from quality signal messages. |
| 6. Queue real deck prompts by default | `[ ]` | — | — | Deck/keynote/presentation prompts should produce queued work unless clearly single-slide. |
| 7. Explicit runtime budgets | `[ ]` | — | — | Add boundary-only budget fields and telemetry for skipped optional work. |
| 8. Local/Ollama calibrated parity | `[ ]` | — | — | Same workflow and diagnostics, provider-calibrated thresholds and budgets. |
| 9. Ollama benchmark harness | `[ ]` | — | — | Add opt-in `npm run benchmark:ollama` and scorecard output. |
| 10. Outcome and manual Improve UX | `[ ]` | — | — | Surface plain outcome labels and one explicit Improve action after budget exhaustion. |
| 11. Manual visual validation and release gate | `[ ]` | — | — | Frontier and Ollama runs with viewport/manual quality evidence. |

Update rules:

- Change a row to `[~]` when implementation starts and add the agent/date.
- Change a row to `[x]` only when the acceptance criteria for that step are met and the Evidence cell lists tests, benchmark output, or manual validation notes.
- Use `[!]` when work is blocked by a code conflict, missing decision, failing invariant, or manual validation failure. Put the exact blocker in Notes.
- Do not mark multiple future steps `[x]` based on intent. Each row needs its own evidence.
- If a later implementation changes sequencing, update both this tracker and the "Recommended Implementation Order" section in the same documentation change.
- If a step is split across agents, keep the row `[~]` and append concise evidence rather than creating competing plan fragments elsewhere.

## Implementation Plan

### Step 0: Baseline And Guardrails

Goal: make the starting point explicit before changing prompts or runtime behavior.

Files to inspect or update later:

- `docs/artifact-quality-excellence-plan.md`
- `docs/validation/workflow-quality-benchmark.md`
- `docs/validation/ollama-gemma4-baseline.md`
- `src/test/fixtures/workflow-benchmark-cases.ts`
- `src/test/prompt-contracts.test.ts`
- `src/test/presentation-runtime-workflow.test.ts`
- `src/test/presentation-quality-checklist.test.ts`

Implementation details:

- Record that this recovery slice touches presentation generation, prompt composition, runtime repair/finalization, provider policy, and benchmarks.
- Keep documents and spreadsheets out of scope except for shared diagnostics or benchmark harness plumbing.
- Keep `PromptComposer` out of the active presentation path.
- Keep external API/MCP/automation seams out of active generation.
- Keep Google Fonts `<link>` output out of generated runtime fragments.
- Keep the ToolLoopAgent pattern in place during the first slice; reduce churn through better first drafts and safer finalization before removing or bypassing it.
- Do not change `maxCorrectionSteps` in the first prompt-quality patch unless tests and generated evidence show it is still a blocker after design vocabulary is restored.
- Keep prompt-size tests, but update their limits only when the added compact design pack is intentional and measured.
- Treat any manual generated-output examples as synthetic or local-only evidence unless they are safe to commit.

Acceptance criteria:

- The plan identifies the exact source files for each change.
- No implementation step depends on broad, unbounded prompt expansion.
- Every future code slice has automated tests and a manual validation hook.

### Step 1: Restore Compact Presentation Design Knowledge

Goal: give the model enough design vocabulary to produce polished first drafts without returning to the old broad prompt composer.

Recommended implementation:

- Add a compact prompt pack, likely in `src/services/artifactRuntime/presentationPrompts.ts` or a new nearby module such as `src/services/artifactRuntime/presentationDesignKnowledge.ts`.
- Base it on existing runtime-owned assets:
  - `buildPresentationDesignSystemPrompt()` from `src/services/ai/templates/design-system.ts`;
  - `PRESENTATION_LAYOUT_RECIPES`;
  - `formatReferenceQualityProfileForPrompt()` from `reference-quality-corpus.ts`;
  - `DesignManifest.componentClasses`;
  - `PresentationSlideBlueprint.role`, `layoutPattern`, `motifInstruction`, and `continuityInstruction`.
- Distill old knowledge docs into compact rules instead of loading raw docs:
  - CSS architecture: `:root` variables, semantic classes, reusable component families;
  - layer stack: background field, motif/diagram layer, content layer, support rail;
  - typography: fixed-stage source sizes, not viewport-scaled type;
  - SVG: inline, semantic, simple diagrams rather than remote images;
  - motion: one ambient system plus micro-motion, reduced-motion fallback;
  - anti-patterns: equal-weight card walls, tiny metadata, placeholder content, unrelated decoration.
- Include recipe-specific guidance:
  - title/opening: one scene, one lockup, compact support row, no KPI wall;
  - stage-setting: scene panel plus insight stack;
  - finance/metrics: few dominant signals plus interpretation, not a metric wall;
  - editorial: asymmetric explanation with embedded diagram;
  - comparison: two lanes plus verdict/bridge;
  - closing: action path and proof band.

Prompt placement:

- Create prompt: include compact design knowledge after `DESIGN MANIFEST` and before `QUALITY BAR`.
- Edit prompt: include a shorter edit-safe version that prioritizes preserving existing copy and class vocabulary.
- Batch slide prompt:
  - slide 1 receives the full compact design knowledge and must establish shared variables/classes/motif;
  - later slides receive only the slide blueprint, shared style summary, previous-slide summary, and compact "reuse and vary" rules.
- Fresh deck creation and add-slide edits must be distinguished:
  - the first generated slide of a fresh deck may establish the shared `<style>` block;
  - the first generated slide appended to an existing deck must receive the existing shared style summary and must not be prompted as a new style-system seed;
  - `runBatchQueue()` should pass existing `initialHtml` style context into the first appended slide instead of relying only on loop index or `brief.index`.
- Previous-slide summaries should include:
  - slide role;
  - main narrative beat;
  - visual treatment;
  - reused class vocabulary;
  - explicit "do not repeat this exact composition" guidance.
- Revision prompt:
  - do not include broad examples;
  - include only failed deterministic checks and the minimal design rule needed to fix them.

Do not:

- call `getRelevantKnowledge()` directly from `designer.ts` for every request;
- include full old HTML examples in every prompt;
- reintroduce sections named `ADDITIONAL REFERENCE MATERIAL` or `TEMPLATE EXAMPLES` into active runtime prompts;
- remove prompt-size caps without replacing them with new measured caps.

Acceptance criteria:

- Create and edit prompts include concrete CSS/SVG/layout vocabulary.
- Batch slide 1 has enough information to establish a reusable deck system.
- Later batch slides inherit and vary the established system rather than inventing new styles.
- Prompt tests prove the compact design pack is present.
- Prompt tests still prove broad old composer markers and Google Fonts links are absent.
- Create/edit prompt size remains bounded by a new explicit cap, for example 8.5 KB unless measured otherwise.
- Batch follow-up prompt size remains materially smaller than create prompts.

### Step 2: Remove First-Draft Quality Suppression

Goal: stop instructing the model to optimize for repairability instead of finished output.

Files:

- `src/services/artifactRuntime/promptPacks.ts`
- `src/test/prompt-contracts.test.ts`

Implementation details:

- Replace this current instruction:
  - `Keep structure simple enough for another agent pass to validate and repair.`
- With a quality-forward instruction:
  - `Produce finished, visually polished output. Do not simplify for a repair pass.`
- Keep the deterministic markup preference:
  - reusable class names;
  - class-based CSS;
  - safe fragments;
  - no wrappers or remote assets.
- Add test coverage that ensures the old phrase cannot return.

Acceptance criteria:

- `buildCoreArtifactContractPack()` no longer tells the model to produce simplified repair-friendly output.
- Prompt contract tests assert that the replacement language is present.
- No other prompt pack reintroduces a "make it easy for the repair pass" instruction.

### Step 3: Make Single-Slide Finalization As Safe As Queued Deck Finalization

Goal: before softening ToolLoopAgent rejection, make sure every single-slide result goes through deterministic validation, repair, optional LLM repair, quality scoring, and final validation.

Files:

- `src/services/artifactRuntime/presentationRuntime.ts`
- `src/test/presentation-runtime-workflow.test.ts`
- `src/test/artifact-runtime.test.ts`
- `src/test/presentation-runtime-policy.test.ts`

Current issue:

- Queued decks call `repairQueuedPresentationSlideFragments()` and `repairPresentationRuntimeOutput()`.
- Single-slide runtime validates with `validateSlides()`, but it does not call `repairPresentationRuntimeOutput()` before finalizing.
- Single-slide model revision output is not guarded with the same validation/no-regression checks used by queued quality polish.

Implementation details:

- Extract a shared presentation finalization helper used by both queued and single paths.
- The helper should run this sequence:
  1. sanitize candidate HTML;
  2. validate mechanical/safety contract;
  3. run deterministic repair when blocking issues exist and budget allows;
  4. revalidate after deterministic repair;
  5. run bounded LLM repair only if blocking issues remain, a model exists, and repair budget remains;
  6. revalidate after LLM repair;
  7. compute quality telemetry from the latest safe candidate;
  8. decide quality polish;
  9. run at most one quality polish pass when allowed;
  10. accept the polish only if safety passes and quality score does not regress;
  11. emit final runtime telemetry.
- Distinguish repair from polish:
  - repair fixes safety or fragment validity;
  - polish improves visual/narrative quality after safety passes.
- Do not count skipped optional polish as a failed repair.
- Preserve first preview behavior: drafts can still stream to the canvas, but final stored output must pass the finalizer.

Runtime states to represent in telemetry:

- `safe-and-excellent`
- `safe-needs-polish`
- `safe-budget-exhausted`
- `blocked-by-safety`

User-facing outcome labels should be derived from these states, not become a second source of truth:

- `safe-and-excellent` -> "Looks polished"
- `safe-needs-polish` -> "Needs one more pass"
- `safe-budget-exhausted` -> "Could not meet the quality bar in time"
- `blocked-by-safety` -> "Could not produce a safe presentation"

Acceptance criteria:

- Single-slide create runs deterministic repair when validation fails.
- Single-slide edit runs deterministic repair when validation fails.
- Single-slide model repair is bounded by provider policy.
- Any LLM revision that introduces blocking issues is discarded.
- Any LLM quality polish that lowers quality score is discarded.
- `reviewPassed` reflects the final validation, not the pre-repair validation.
- Tests prove queued and single paths use the same finalization semantics.

### Step 3A: Add A CSS/Design Contract Gate

Goal: make CSS and design-system correctness an explicit runtime step, not just a prompt instruction or a buried QA advisory.

Rationale:

- The current code has useful CSS checks in `qa-validator.ts`, including style block presence, viewport unit warnings, tiny source type, reduced motion, keyframe budget, CSS variable hints, and background-color validation.
- Those checks are currently part of generic QA rather than a named workflow stage with clear telemetry and repair routing.
- Step 1 adds stronger CSS/design prompt vocabulary, but prompt guidance alone cannot prevent invalid CSS, duplicated deck style systems, unreadable typography, or design drift across queued slides.

Files:

- `src/services/ai/workflow/agents/qa-validator.ts`
- `src/services/artifactRuntime/presentationQualityChecklist.ts`
- `src/services/artifactRuntime/presentationRuntime.ts`
- `src/services/artifactRuntime/presentationPrompts.ts`
- `src/services/ai/workflow/batchQueue.ts`
- `src/services/chat/workflowProgress.ts`
- `src/components/AIWorkingIndicator.tsx`
- `src/test/prompt-contracts.test.ts`
- `src/test/presentation-quality-checklist.test.ts`
- `src/test/presentation-runtime-workflow.test.ts`
- `src/test/workflow-progress.test.ts`

Implementation details:

- Add a named CSS/design contract result that can be computed for single-slide and queued deck output.
- The contract should validate:
  - one usable `<style>` block for a new deck or a clear shared style source for appended slides;
  - no inline `style=` attributes on slide content;
  - no external CSS, `@import`, remote `url(...)`, scripts, or asset links;
  - no viewport-unit layout/type sizing inside the fixed 16:9 stage;
  - no tiny source font sizes below the readable threshold;
  - concrete `data-background-color` values on every section;
  - reduced-motion fallback when animation exists;
  - bounded keyframe/animation count;
  - intentional motion, not mandatory motion; static slides should pass when visual quality is otherwise strong;
  - reusable CSS variable tokens and semantic class families;
  - no full duplicate root/style systems appended to every queued slide;
  - shared class/token continuity across deck slides;
  - extension style blocks are small and scoped when later slides need one new class.
- Fix the add-slide prompt continuity edge case as part of this gate:
  - when `initialHtml` exists, the first queued new slide is an appended slide, not a style-system seed;
  - pass `sharedStyleBlock` or an explicit `existingDeckStyleBlock` into `buildPresentationBatchSlidePrompt()` for the first appended slide;
  - avoid the "This first slide establishes the reusable deck style system" branch for appended slides even if `brief.index === 1` or it is the first loop iteration;
  - assert that appended-slide prompts contain existing class/token guidance and do not contain the full fresh-deck design vocabulary unless a restyle request explicitly asks for it.
- Emit a runtime part or progress event with a stable id such as `css-design-contract`.
- Map the default UI label to "Checking quality" unless an advanced diagnostic view is open.
- Route CSS/design failures into deterministic repair first when safe:
  - strip unsupported external CSS;
  - add reduced-motion fallback;
  - replace variable `data-background-color` values with concrete hex values;
  - remove empty optional shells;
  - preserve structural/decorative containers.
- Route non-deterministic CSS/design failures into Step 5's bounded revision path as named deterministic failures.
- Keep this as a gate before optional quality polish. A model polish pass should not run on CSS that is mechanically unsafe.
- Align the existing animation advisory with this contract: do not require every slide to contain 2-3 keyframe animations, but do require reduced-motion handling and bounded motion whenever animation is present.

Named CSS/design issue ids:

- `missing-style-system`
- `inline-style-leak`
- `external-css-or-asset`
- `viewport-unit-layout`
- `tiny-source-type`
- `missing-reduced-motion`
- `animation-budget-risk`
- `duplicate-root-style-system`
- `append-slide-style-reset`
- `weak-class-continuity`
- `unscoped-extension-style`

Acceptance criteria:

- Single-slide create and edit outputs record CSS/design contract telemetry.
- Queued decks record CSS/design contract telemetry for the assembled deck and, where useful, by slide.
- CSS/design failures are visible in advanced diagnostics and benchmark scorecards.
- Mechanically unsafe CSS/design failures block optional polish until repaired or classified.
- Tests cover viewport-unit CSS, missing reduced-motion, duplicated root styles across queued slides, weak class continuity, and the first appended queued slide preserving the existing deck style context.
- Default user-facing progress remains simple and does not expose raw CSS jargon.

### Step 4: Then Soften `submitFinalSlide` Tool Rejection

Goal: reduce ToolLoopAgent oscillation without letting invalid output bypass final validation.

Files:

- `src/services/ai/workflow/agents/designer.ts`
- `src/services/artifactRuntime/presentationRuntime.ts`
- `src/test/presentation-runtime-workflow.test.ts`

Important sequencing:

- Do this only after Step 3 is complete.
- Softening the tool gate before shared finalization exists could allow invalid single-slide fragments to become final output.

Implementation details:

- Change `submitFinalSlide.execute` behavior for blocking violations from hard rejection to accepted-with-warnings.
- Suggested return shape:
  - `accepted: true`
  - `warnings: [...]`
  - `guidance: "Runtime deterministic repair will handle remaining blocking issues before finalization."`
- Keep `validateSlideHtml` as a useful self-check tool.
- Keep the tool-loop step count bounded.
- For local/Ollama, continue using the provider capability profile's lower correction step count.
- Do not remove the ToolLoopAgent yet; the validate/fix/submit pattern is still useful when first draft quality is close.

Acceptance criteria:

- A draft with fixable blocking issues can exit the ToolLoopAgent without repeated rejected submissions.
- The runtime finalizer repairs or blocks remaining issues before storing output.
- Tests prove soft-accepted blocking issues are not treated as final validation success.
- Local edit flows still return a usable draft instead of stalling in repeated correction loops.

### Step 5: Fix Evaluator Context And Make Revision Deterministic-Signal-Led

Goal: make optional model revision see enough CSS to judge the slide and make it fix concrete failed signals rather than inventing broad redesigns.

Files:

- `src/services/ai/workflow/agents/evaluator.ts`
- `src/services/artifactRuntime/presentationQualityChecklist.ts`
- `src/services/artifactRuntime/presentationPrompts.ts`
- `src/test/presentation-quality-checklist.test.ts`
- `src/test/presentation-runtime-workflow.test.ts`

Implementation details:

- Increase `truncateForEval()` default style limit from 800 chars to at least 3000 chars.
- Consider preserving:
  - the first 2400 chars of CSS;
  - all `:root` variables;
  - all class names used in the current section;
  - all keyframes names;
  - the full section markup.
- Do not let evaluator feedback become broad "make it better" language.
- For quality polish, prefer deterministic failed signals from `buildPresentationQualityTelemetry()`:
  - visual richness;
  - narrative coherence;
  - continuity;
  - component variety;
  - reference style match;
  - viewport safety;
  - repeated-grid risk;
  - weak opening scene;
  - missing integrated visual.
- If a failure currently appears only as a generic pattern advisory, promote it to a named issue that can be routed into revision prompts and benchmark scorecards. The first named issue set should include:
  - `weak-opening-scene`;
  - `repeated-card-grid`;
  - `missing-integrated-visual`;
  - `missing-narrative-transition`;
  - `poor-token-continuity`;
  - `copy-density-risk`.
- Use `buildPresentationRevisionSystemPrompt()` with a list of failed deterministic checks.
- Keep the model evaluator as optional notes or a fallback when deterministic signal metadata is insufficient.
- Revalidate and rescore every revision before accepting.

Acceptance criteria:

- Evaluator no longer judges only a tiny CSS fragment.
- Revision prompts include exact failed deterministic checks.
- Revision prompts do not ask for wholesale redesign unless the user requested a rewrite.
- Revision output is accepted only when final validation passes and quality score does not regress.
- Tests cover a low-quality but mechanically valid deck that triggers a bounded quality revision.

### Step 6: Queue Real Deck Prompts By Default

Goal: when a user asks for a deck, presentation, keynote, pitch deck, or slideshow, Aura should usually create a queued multi-slide artifact even if the user did not specify slide count.

Files:

- `src/services/artifactRuntime/planner.ts`
- `src/services/ai/validation.ts`
- `src/services/ai/workflow/agents/planner.ts`
- `src/services/artifactRuntime/build.ts`
- `src/test/workflow-planner.test.ts`
- `src/test/presentation-runtime-workflow.test.ts`
- `src/test/workflow-benchmark-cases.test.ts`

Current issue:

- `buildArtifactWorkflowPlan()` queues only when explicit multi-slide patterns are detected.
- `classifyIntent()` only returns `batch_create` for conservative explicit multi-slide requests.
- A prompt like "Create a narrative keynote deck about a product relaunch" can still behave like a single-slide create.

Implementation details:

- Add a deck-like create detector:
  - `deck`;
  - `presentation`;
  - `keynote`;
  - `pitch deck`;
  - `slideshow`;
  - `PowerPoint`.
- Keep explicit "title slide", "opening slide", "cover slide", and "one slide" requests single-slide.
- For deck-like create prompts without slide count, create a default work queue:
  - 3 slides for simple/short prompts;
  - 5 slides for richer deck/keynote/pitch prompts;
  - cap defaults conservatively for local/Ollama, for example 3 slides unless the prompt asks for more.
- Generate default slide work items from recipe and prompt:
  - title/opening;
  - context/problem;
  - proof/mechanism;
  - recommendation/action;
  - closing, if 5 slides.
- Attach `PresentationSlideBlueprint` to each work item through the existing narrative plan path.
- Keep single-slide benchmark cases single-slide by matching "title slide", "context slide", or "finance-grid explainer slide".

Acceptance criteria:

- "Create a narrative keynote deck about a product relaunch" queues multiple slide parts.
- "Create an executive briefing deck for leadership review" queues multiple slide parts.
- "Create a polished opening title slide" remains single-slide.
- "Create a setting-the-stage slide" remains single-slide.
- Queued deck progress shows slide-specific steps.
- Tests prove default queued deck prompts get a narrative plan, slide roles, and shared style continuity.

### Step 7: Make Budgets Explicit At Runtime Boundaries

Goal: make the workflow bounded without introducing fragile timer-driven abort behavior.

Files:

- `src/services/artifactRuntime/types.ts`
- `src/services/artifactRuntime/build.ts`
- `src/services/artifactRuntime/presentationRuntime.ts`
- `src/services/ai/providerCapabilities.ts`
- `src/test/artifact-runtime.test.ts`
- `src/test/presentation-runtime-policy.test.ts`

Implementation details:

- Extend `ArtifactRuntimeMetricsBudget` with fields such as:
  - `maxTotalRuntimeMs`;
  - `maxOptionalPolishPasses`;
  - `maxRepairPasses`;
  - `maxToolLoopSteps`;
  - `budgetEnforcement: "boundary-only"`.
- Boundary-only enforcement means:
  - do not start optional repair/polish if budget is already exhausted;
  - after each slide or model call completes, decide whether more work is allowed;
  - record per-slide elapsed time, total elapsed time, and budget-skipped optional work in telemetry;
  - avoid adding timer-driven in-flight aborts for Ollama streams, since existing tests and provider policy intentionally avoid them.
- Map provider policy into budgets:
  - frontier: more repair capacity and one optional LLM polish;
  - local/Ollama: same validation, fewer correction steps, no secondary structured evaluation, likely no LLM polish unless explicitly enabled later.
- Record budget exhaustion in telemetry as `safe-budget-exhausted` when output is mechanically safe but below excellence threshold.
- Record `blocked-by-safety` when no safe output can be produced.

Acceptance criteria:

- Runtime plan exposes concrete max pass counts and max optional runtime budget.
- Optional polish is skipped when budget is exhausted and telemetry says why.
- Ollama path does not reintroduce internal timeout-driven abort tests currently guarded against.
- No automatic second polish loop starts after the budget is exhausted.

### Step 8: Keep Local/Ollama Workflow Equal, But Calibrated

Goal: prevent local providers from becoming a separate product path while avoiding false failures against unrealistic thresholds.

Files:

- `src/services/ai/providerCapabilities.ts`
- `src/services/artifactRuntime/qualityBar.ts`
- `src/services/artifactRuntime/build.ts`
- `src/test/artifact-runtime.test.ts`
- `src/test/quality-decision.test.ts`
- `docs/validation/ollama-gemma4-baseline.md`

Implementation details:

- Keep the same:
  - `ArtifactRunPlan`;
  - work queue;
  - prompt pack architecture;
  - deterministic validation;
  - quality signal IDs;
  - telemetry fields;
  - benchmark scorecard shape.
- Keep local-specific:
  - tighter prompts;
  - fewer correction steps;
  - lower motion budget;
  - no structured secondary evaluation by default;
  - `structured-premium-lite` quality tier until benchmark evidence supports a higher target.
- Do not downgrade local safety requirements.
- Do not hide local quality misses. Report them as quality signals and failure classifications.
- If local output is safe but below the local threshold, return `safe-budget-exhausted` with diagnostics and a manual Improve action.

Acceptance criteria:

- Local and frontier runs produce comparable telemetry fields.
- Local safety gates are not weaker.
- Local visual quality thresholds are explicit and documented.
- Tests continue proving `ollama` uses constrained provider policy.
- Any future move to equal premium thresholds is benchmark-driven.

### Step 9: Implement The Ollama Benchmark Harness

Goal: stop judging quality recovery by anecdotes and produce repeatable local evidence.

Files:

- `package.json`
- `docs/testing/Automated Ollama Artifact Benchmark Harness.md`
- `src/test/fixtures/workflow-benchmark-cases.ts`
- new benchmark runner under a scripts or services path selected by implementation
- ignored output directory, likely `logs/ollama-benchmark/<timestamp>/`

Implementation details:

- Add `npm run benchmark:ollama`.
- Use `WORKFLOW_BENCHMARK_CASES` as the first fixture source.
- Run normal app planning and runtime generation with provider id `ollama`.
- Required env:
  - `AURA_OLLAMA_MODEL`, default `gemma4:e2b`;
  - `AURA_OLLAMA_BASE_URL`, default `http://127.0.0.1:11434`;
  - `AURA_OLLAMA_CASES`;
  - `AURA_OLLAMA_RERUNS`;
  - `AURA_OLLAMA_JUDGE`, optional.
- Generate:
  - `summary.json`;
  - `scorecard.md`;
  - per-case `output.html` or workbook JSON;
  - per-case `telemetry.json`;
  - per-case `events.json`;
  - optional `judge.json`.
- Score with:
  - deterministic quality score/grade;
  - validation profile result;
  - first visible progress;
  - first usable output;
  - total completion;
  - consistency across reruns.
- Use optional model judging only for notes, never pass/fail.

Acceptance criteria:

- Scorecard generation is unit-testable without a live Ollama server.
- Real Ollama runs are opt-in and not part of normal `npm test`.
- Failure classification includes:
  - routing bug;
  - workflow bug;
  - provider capability mismatch;
  - model quality limitation;
  - prompt tuning issue;
  - quality depth;
  - quality visual;
  - quality continuity.
- The first benchmark set includes:
  - presentation title opening;
  - presentation narrative deck;
  - metrics-heavy deck;
  - queued add slides;
  - at least one document create;
  - at least one spreadsheet deterministic flow.

### Step 10: Surface Outcome And Manual Improve

Goal: make final quality state visible without turning advanced diagnostics into noisy default UX.

Files:

- `src/components/chat/handlers/presentationHandler.ts`
- `src/services/chat/renderRunResult.ts`
- `src/components/RunHistoryPanel.tsx`
- `src/components/AIWorkingIndicator.tsx`
- `src/test/workflow-progress.test.ts`
- `src/test/run-history-panel.test.tsx`
- `src/test/ai-working-indicator.test.tsx`

Implementation details:

- Keep default progress labels simple:
  - Planning;
  - Creating slides;
  - Checking quality;
  - Polishing quality;
  - Finishing.
- Map runtime quality decisions to plain assistant-facing messages:
  - `safe-and-excellent`: "Looks polished."
  - `safe-needs-polish`: "Needs one more pass."
  - `safe-budget-exhausted`: "Could not meet the quality bar in time."
  - `blocked-by-safety`: "Could not produce a safe presentation."
- Keep detailed scores, failed checks, and quality signals in advanced diagnostics and run history.
- After `safe-budget-exhausted`, expose one explicit Improve action. That action should start a new user-visible run with a fresh run id and the previous artifact as context.
- Do not start hidden automatic second polish loops.

Acceptance criteria:

- Default chat output stays non-technical.
- Advanced diagnostics still include score, grade, failed signals, skipped reason, and validation counts.
- Budget-exhausted outputs expose one manual Improve path.
- Tests prove quality diagnostics remain advanced-only while outcome labels are visible.

### Step 11: Manual Visual Validation And Release Gate

Goal: prove that deterministic telemetry correlates with human judgment.

Files:

- `docs/artifact-quality-excellence-plan.md`
- `docs/program-status.md`
- `docs/validation/scorecard-template.md`
- `docs/validation/workflow-quality-benchmark.md`

Implementation details:

- Run one frontier and one Ollama pass for the same presentation cases.
- Capture:
  - desktop;
  - desktop wide;
  - tablet portrait;
  - mobile portrait;
  - mobile landscape.
- Record:
  - looks premium;
  - content depth;
  - not boring;
  - starter/reference similarity;
  - user usefulness;
  - quality score;
  - failed signals;
  - polish action or skipped reason.
- Treat human disagreement with deterministic scoring as a scoring bug candidate.
- Do not promote this recovery as complete until at least one generated deck visibly improves over the current baseline.

Acceptance criteria:

- At least one generated single-slide presentation improves against baseline.
- At least one generated queued deck improves against baseline.
- Quality signal failures are understandable to a developer and, in advanced UI, to a user.
- Any repeated-grid, weak-opening, or missing-visual failure is either fixed or logged as a remaining blocker.

## Recommended Implementation Order

1. Step 1 plus Step 2: compact design knowledge and prompt wording.
2. Step 3: shared finalization for single and queued presentation paths.
3. Step 3A: CSS/design contract gate and appended-slide style continuity.
4. Step 4: soften ToolLoopAgent submit gate after finalization is safe.
5. Step 5: evaluator truncation and deterministic-signal-led revision.
6. Step 6: default queued deck behavior for deck-like prompts.
7. Step 7 plus Step 8: explicit budgets and calibrated provider policy.
8. Step 9: automated Ollama benchmark harness.
9. Step 10: surface outcomes and manual Improve.
10. Step 11: manual visual validation and status-document updates.

This order keeps the first slice focused on the highest-confidence quality regression, then closes safety holes before changing loop behavior, then broadens into deck orchestration and benchmarking.

## Test Plan

### Unit Tests

- `prompt-contracts`
  - compact design knowledge is present;
  - old broad prompt markers stay absent;
  - old "simplify for repair" instruction stays absent;
  - prompt sizes stay within explicit caps;
  - fresh deck slide 1 prompts may seed the style system;
  - appended queued slide prompts reuse existing shared style and do not ask for a new style system.
- `workflow-planner`
  - deck-like prompts without slide counts queue by default;
  - explicit single-slide prompts remain single-slide;
  - local/Ollama prompt guidance remains tighter.
- `artifact-runtime`
  - `ArtifactRunPlan.metricsBudget` exposes max pass fields;
  - local and frontier policies map correctly to budgets;
  - presentation narrative plan and slide blueprints are attached to default queued decks.
- `presentation-runtime-workflow`
  - single-slide create uses deterministic repair before finalization;
  - single-slide edit uses deterministic repair before finalization;
  - post-revision validation rejects unsafe output;
  - quality polish accepts only non-regressing output;
  - soft ToolLoopAgent acceptance still results in final runtime validation;
  - queued add-slide edits pass existing style context to the first newly generated slide.
- `presentation-quality-checklist`
  - CSS/design contract issue ids are emitted for unsafe or drifting CSS;
  - duplicated root styles and weak token continuity fail the right CSS/design signals;
  - static but visually complete slides do not fail solely because they lack keyframes;
  - weak opening scenes fail the right signal;
  - repeated-grid risk remains detectable;
  - missing integrated visuals remain detectable;
  - continuity issues are surfaced.
- `quality-decision`
  - safe low-quality output becomes `safe-needs-polish` when budget exists;
  - safe low-quality output becomes `safe-budget-exhausted` when budget is exhausted;
  - blocking safety issues become `blocked-by-safety`.

### Integration Tests

- single polished title slide create;
- stage-setting/context slide create;
- narrative deck create without explicit slide count;
- metrics-heavy deck create;
- queued add-slides edit preserving old slides and existing style tokens;
- restyle preserving text;
- local/Ollama policy path using mocked provider capability;
- visible quality outcome after budget exhaustion;
- manual Improve action starts a separate visible run;
- release smoke covering starter deck, generated deck, and queued edit preservation.

### Manual Tests

- frontier single-slide visual quality;
- frontier queued deck visual quality;
- Ollama single-slide visual quality;
- Ollama queued deck behavior and progress continuity;
- mobile portrait readability;
- mobile landscape readability;
- tablet portrait readability;
- desktop standard and wide layout.

## Drift Controls

Use these controls during implementation to prevent the plan from dissolving into prompt churn:

- Each source change must map to one step in this document.
- Each step must land with tests that prove the intended contract.
- Prompt changes must include prompt-contract assertions and measured size caps.
- Runtime changes must include telemetry assertions.
- Any broad prompt corpus injection must be rejected unless it is distilled into a compact, tested pack.
- Any local/Ollama threshold increase must be justified by benchmark evidence.
- Any model revision path must revalidate and rescore before accepting output.
- Manual validation failures should become tracked scoring, routing, provider, or prompt issues, not vague "quality feels bad" notes.

## Non-Goals

- Do not restore the old presentation `PromptComposer`.
- Do not put raw old knowledge docs into every active prompt.
- Do not re-add Google Fonts `<link>` output.
- Do not make documents or spreadsheets part of this recovery except for benchmark plumbing and shared telemetry compatibility.
- Do not add a backend or server-side rendering requirement.
- Do not delete remaining legacy templates as part of this quality recovery unless a separate cleanup slice owns that risk.
- Do not make local/Ollama pretend to have the same model capability as frontier providers; make its limits explicit and measured.

## Final Recommendation

The immediate recovery should start with the quality-regression fix, but implemented in the runtime's current architecture:

- compact design knowledge first;
- quality-forward core contract wording;
- evaluator context fix;
- shared single/queued finalization;
- then softer ToolLoopAgent acceptance;
- then default queued deck creation;
- then benchmark evidence.

This is the most reliable path because it fixes the live quality regression while preserving the architectural work that is already giving Aura better planning, validation, telemetry, and provider control.
