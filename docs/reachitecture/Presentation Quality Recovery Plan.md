# Presentation Quality Recovery Plan

## Summary

Recover Aura by making presentations the first-class “document format” and replacing open-ended generation/edit loops with a small, bounded, preview-validated workflow inspired by Dyad, OpenCode, and Claw Code.

Default decisions:
- Focus first on presentations; documents keep existing runtime fixes but are not the lead rescue target.
- Use one shared workflow for frontier and Ollama/local models from day one.
- Keep provider differences as budgets and constraints, not separate product paths.
- Deterministic quality checks are authoritative; model judges are optional notes only.

## Key Changes

- Replace the current “generate, QA, maybe evaluate, maybe repair” behavior with one explicit presentation state machine:
  `intake -> plan -> draft slides -> deterministic repair -> render/quality gate -> one bounded model revision -> final or surfaced needs-polish`.
- Add hard stop rules to every presentation run:
  - per-slide generation timeout;
  - total run budget from `ArtifactRunPlan.metricsBudget`;
  - max 1 deterministic repair pass per slide;
  - max 1 model revision pass per run;
  - no automatic second polish loop after budget exhaustion.
- Make queued slide generation the default for presentation create requests, including “make a deck” prompts that do not list slide numbers.
- Add a compact `PresentationSpec`/manifest layer before generation:
  - audience, artifact purpose, slide count, narrative arc, slide roles, visual motif, acceptance checks;
  - generated from existing `ArtifactRunPlan` and `presentationNarrativePlan`;
  - stored in telemetry so failures are diagnosable.
- Strengthen the first draft rather than relying on repair:
  - slide 1 must establish shared CSS variables, type scale, class vocabulary, motif, and layout grammar;
  - later slides receive the shared style seed plus previous-slide summaries;
  - prompts must forbid repeated card walls unless explicitly requested.
- Change quality scoring from “diagnostic” to “release gate”:
  - mechanical safety failures block output;
  - quality failures can ship only as `safe-budget-exhausted` with visible diagnostics;
  - quality scores must include visual richness, role variety, continuity, viewport safety, copy density, and repeated-grid risk.
- Make local/Ollama equal in workflow:
  - same spec, same queues, same validation, same scorecard;
  - local uses tighter prompts and smaller slide roles, but not a downgraded runtime contract;
  - if structured evaluation fails, deterministic score still decides pass/fail.

## Implementation Changes

- Runtime:
  - Update `artifactRuntime/build.ts` so presentation quality bars are no longer downgraded for Ollama; provider policy controls budgets only.
  - Add explicit timeout and max-step fields to `ArtifactRunPlan.metricsBudget`.
  - Add run outcome states: `excellent`, `valid-needs-polish`, `budget-exhausted`, `blocked`.
- Presentation orchestration:
  - In `presentationRuntime.ts`, centralize all repair/polish decisions in one bounded state machine.
  - Ensure queued generation is preferred for deck creation and multi-slide edits.
  - Reject any auto-loop that re-enters evaluation after the bounded model revision.
- Prompts:
  - In `presentationPrompts.ts`, add a compact presentation spec block and previous-slide continuity block.
  - Make the revision prompt surgical: it receives failed deterministic checks only, not broad “make it better” language.
- Quality:
  - In `presentationQualityChecklist.ts`, promote repeated-grid, weak opening scene, missing integrated visual, and poor continuity into named failed signals.
  - Add “first usable preview” telemetry distinct from first streamed token.
- Benchmarking:
  - Implement `npm run benchmark:ollama` as planned in `docs/testing/Automated Ollama Artifact Benchmark Harness.md`.
  - Add the same harness shape for frontier providers later, but keep the first runner local and opt-in.
- UX:
  - Show simple progress: Planning, Designing Slides, Checking Quality, Polishing Once, Finished.
  - Expose plain-language results: “Looks polished”, “Needs one more pass”, “Could not meet the quality bar in time”.
  - Provide one manual “Improve” action after budget exhaustion instead of hidden automatic loops.

## Test Plan

- Unit tests:
  - presentation run state machine stops after the configured repair/polish budget;
  - local and frontier plans use the same presentation quality threshold;
  - queued prompts include shared style seed and previous-slide continuity context;
  - repeated card grids fail the correct quality signal;
  - weak title slide fails narrative/visual quality signals;
  - model revision output is accepted only if validation passes and quality score does not regress.
- Integration tests:
  - narrative deck create;
  - metrics-heavy deck create;
  - title/opening slide create;
  - queued add-slides edit;
  - style-only restyle preserving text.
- Benchmark scenarios:
  - run at least one frontier and one Ollama pass for the same presentation cases;
  - record first progress, first usable preview, total runtime, score, grade, failed signals, and failure classification.
- Manual validation:
  - desktop, tablet, mobile portrait, and mobile landscape screenshots;
  - compare generated decks against starter/reference quality traits;
  - log any mismatch between human judgment and deterministic score as a scoring bug.

## Assumptions

- Presentations are the primary “document format” for this recovery slice.
- Equal baseline means shared workflow and quality contract, not identical visual complexity from every model.
- Spreadsheets remain deterministic and out of scope except for benchmark plumbing.
- Documents receive only compatibility adjustments needed by shared telemetry and benchmark infrastructure.
