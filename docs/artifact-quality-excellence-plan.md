# Artifact Quality Recovery And Excellence Plan

Created: 2026-04-28

This plan tracks the remaining work to turn Aura's faster artifact runtime into a consistently premium document, presentation, and spreadsheet creation system.

## Goal

Aura should keep the new `ArtifactRuntime` structure, but generated artifacts must feel finished, useful, and crafted:

- documents should be substantive, well-structured, and visually organized rather than short generic memos;
- presentations should have narrative arc, varied slide roles, strong opening scenes, and reusable visual motifs rather than repeated boring grids;
- spreadsheets should remain deterministic and correct while gaining useful formatting, summaries, charts, and downstream readiness signals.

## Status Legend

- `[x]` Done and covered by automated validation.
- `[~]` Started, but still needs runtime behavior or validation depth.
- `[ ]` Not started.

## Current Completed Foundation

- [x] Added `QualityBar` as a first-class runtime planning concept.
- [x] Defaulted create-mode documents and presentations to premium quality targets, with local/Ollama downgraded to `structured-premium-lite`.
- [x] Added quality telemetry fields for score, grade, signals, and polishing reason.
- [x] Added deterministic document excellence checks for depth, rhythm, component variety, reference-style match, and viewport safety.
- [x] Added deterministic presentation checks for visual richness, narrative coherence, continuity, component variety, reference-style match, viewport safety, and boring repeated-grid patterns.
- [x] Added spreadsheet craft scoring for deterministic correctness, target clarity, formatting usefulness, and downstream readiness.
- [x] Threaded quality-bar guidance into document and presentation prompt packs.
- [x] Updated validation docs so explain/dry-run are legacy compatibility checks, not normal active quality gates.
- [x] Added automated regression coverage for quality bars, prompt inclusion, scoring, telemetry, and docs expectations.
- [x] Added active quality-polish decisions so runtimes classify outputs as excellent, needing polish, budget-exhausted, or safety-blocked.
- [x] Added deterministic document quality polish and presentation LLM-polish routing for premium/frontier runs.
- [x] Added document content blueprints with per-module role, word-budget, evidence, component, and rhythm guidance.
- [x] Added bounded premium/frontier document LLM enrichment after deterministic polish when quality remains below the bar.
- [x] Added deck-level narrative plans with promise, audience, arc, motif, slide roles, layout map, and continuity rules.
- [x] Added explicit deterministic presentation polish advisories for weak title scenes, repeated grids, missing visuals, missing transitions, and weak class/token continuity.
- [x] Verified with:
  - `npm test -- artifact-runtime prompt-contracts runtime-telemetry document-quality-checklist presentation-quality-checklist spreadsheet-runtime`
  - `npm test -- artifact-runtime prompt-contracts document-quality-checklist document-runtime-workflow runtime-telemetry quality-decision`
  - `npm test -- artifact-runtime prompt-contracts presentation-quality-checklist presentation-runtime-policy`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`

## Workstream 1: Excellence Polishing Runtime

Status: `[~]`

Purpose: convert quality scores from passive diagnostics into active runtime behavior.

Implementation checklist:

- [x] Add a shared quality decision helper that classifies final output as:
  - `safe-and-excellent`;
  - `safe-needs-polish`;
  - `safe-budget-exhausted`;
  - `blocked-by-safety`.
- [x] Replace the current “QA passed, skip evaluation” behavior with “safety passed, decide whether excellence polishing is needed.”
- [x] Treat safety gates as blocking output and excellence gates as polish/enrichment triggers.
- [x] Emit progress events using the simple UX language:
  - Planning;
  - Designing;
  - Creating parts;
  - Polishing quality;
  - Finishing.
- [x] Add advanced diagnostics that explain:
  - quality score;
  - quality grade;
  - failed signals;
  - whether polishing ran, skipped, or exhausted budget.
- [ ] Backfill manual validation evidence from generated artifacts so this workstream can move from `[~]` to `[x]`.

Acceptance criteria:

- [x] A mechanically valid but low-scoring document triggers a polish/enrichment decision.
- [~] A mechanically valid but boring deck triggers a polish/evaluation decision. Automated decision routing exists; manual generated-deck validation is still pending.
- [x] Local/Ollama runs do not request LLM polish when their quality bar has no LLM budget.
- [x] The final runtime telemetry always records either a polish action or a clear skipped reason.

## Workstream 2: Document Excellence

Status: `[~]`

Purpose: make generated documents substantive and visually organized while keeping the queued runtime structure.

Already started:

- [x] Document quality scoring exists.
- [x] Quality-bar guidance reaches queued and single-stream prompts.
- [x] Runtime module count can expand when a quality bar is present.

Implementation checklist:

- [x] Change queued document planning from outline plus modules to content blueprint plus module budgets.
- [x] Give every document module:
  - role;
  - target word range;
  - evidence requirement;
  - component pattern;
  - visual rhythm instruction.
- [x] Add deterministic document enrichment for outputs that are:
  - too short;
  - missing hero/summary/KPI/proof/comparison/timeline rhythm;
  - too visually flat;
  - below the quality-bar score threshold.
- [x] Add a bounded LLM enrichment pass for premium/frontier runs only.
- [x] Expand the document design-system vocabulary with safe classes for:
  - hero summary;
  - recommendation block;
  - KPI row;
  - proof strip;
  - comparison;
  - timeline;
  - sidebar;
  - evidence table;
  - executive summary callout.

Acceptance criteria:

- [~] Long-form reports meet target depth and component variety. Runtime budgets and scoring now enforce this; generated benchmark evidence is still pending.
- [x] Executive briefs include hero, summary, KPI/proof/recommendation rhythm in runtime guidance and deterministic enrichment.
- [x] Enrichment improves short or flat documents without breaking iframe/mobile/print validation.
- [~] Document output can resemble starter/example quality through structure and rhythm without copying content. Style-rhythm mechanics exist; reference-corpus benchmarking remains pending.

## Workstream 3: Presentation Excellence

Status: `[~]`

Purpose: make generated decks feel art-directed instead of merely valid.

Already started:

- [x] Presentation quality scoring exists.
- [x] Prompt guidance includes quality bar and slide-role continuity reminders.
- [x] Boring repeated-grid decks can be detected deterministically.

Implementation checklist:

- [x] Add a deck-level narrative plan before slide generation:
  - promise;
  - audience;
  - arc;
  - visual motif;
  - slide roles;
  - layout map;
  - continuity rules.
- [x] Ensure slide 1 establishes the design system and reusable motif.
- [x] Ensure later slides vary layout while preserving tokens, motif, and class vocabulary.
- [x] Add an art-director/evaluator pass for premium/frontier runs when quality score is below threshold, even if mechanical QA passed.
- [x] Add deterministic polish advisories for:
  - weak title scene;
  - repeated card grids;
  - no integrated visuals;
  - no narrative transitions;
  - poor class/token continuity.

Acceptance criteria:

- [~] Queued decks produce varied slide roles and continuity. Runtime planning and prompt contracts are covered; generated-deck manual validation is pending.
- [~] Title/opening slides have strong scene composition. Slide 1 prompt/blueprint rules are covered; generated-deck manual validation is pending.
- [x] Repeated-grid decks trigger quality advisories or polishing.
- [x] Premium/frontier decks get a bounded quality pass when needed.

## Workstream 4: Spreadsheet Craft

Status: `[~]`

Purpose: keep spreadsheet execution deterministic while making outputs easier to use in workbooks, documents, and decks.

Already started:

- [x] Spreadsheet craft telemetry exists.
- [x] Spreadsheet runtime reports deterministic correctness, target clarity, formatting usefulness, and downstream readiness.

Implementation checklist:

- [ ] Add better default formatting for created workbooks:
  - frozen headers;
  - useful number formats;
  - readable column widths;
  - summary rows where useful.
- [ ] Add chart specs when useful and when source data supports them.
- [ ] Improve action summaries so users can see:
  - changed sheets;
  - refreshed derived sheets;
  - validation outcome;
  - downstream document/deck readiness.
- [ ] Keep all spreadsheet mutations deterministic and runtime-owned.

Acceptance criteria:

- [ ] Workbook create/formula/query/chart flows remain correct and deterministic.
- [ ] Created workbooks have useful formatting without requiring manual cleanup.
- [ ] Spreadsheet outputs are ready to feed linked documents or presentations.

## Workstream 5: Reference-Quality Corpus

Status: `[ ]`

Purpose: use starter kits and examples as style targets without copying their real content.

Implementation checklist:

- [ ] Normalize starter kits, production presentation templates, document blueprints, and the example document into reference style packs.
- [ ] Record style traits only:
  - rhythm;
  - density;
  - module grammar;
  - layout variety;
  - typography scale;
  - component families;
  - anti-patterns.
- [ ] Add reference-pack routing so quality bars can select the right style target per artifact type and output mode.
- [ ] Add tests proving reference packs are used as style metadata, not content sources.

Acceptance criteria:

- [ ] Prompts and scoring can reference starter-quality traits without embedding source content.
- [ ] Synthetic examples remain synthetic and confidentiality-safe.
- [ ] Documents/decks can be compared against starter-quality rhythm and density.

## Workstream 6: Legacy Cleanup

Status: `[~]`

Purpose: keep the active runtime free from legacy API/MCP/automation and old presentation-template drag.

Already started:

- [x] Active-generation import-boundary tests keep external adapter and execution-spec paths out.
- [x] Validation docs now treat explain/dry-run as legacy compatibility, not active workflow gates.
- [x] Several legacy presentation templates have already been removed.

Implementation checklist:

- [ ] Continue controlled cleanup of remaining legacy presentation templates marked `archive later`.
- [ ] Convert only templates that still contain valuable production-grade patterns.
- [ ] Keep provider API access untouched; only external automation/API/MCP seams are out of scope.
- [ ] Keep import-boundary regression tests proving removed external adapter paths stay gone.

Acceptance criteria:

- [ ] No active generation path imports external API/MCP/automation adapter code.
- [ ] Legacy template chunks continue shrinking after safe archive/delete batches.
- [ ] Production routing and starter kits remain intact after each cleanup batch.

## Manual Validation And Benchmarking

Status: `[ ]`

Purpose: prove the quality recovery worked in actual generated outputs, not only telemetry.

Checklist:

- [ ] Run benchmark cases for documents, presentations, and spreadsheets.
- [ ] Score at least one frontier run and one local/Ollama run.
- [ ] Compare generated documents/decks against starter kits and example document style targets.
- [ ] Capture manual fields:
  - looks premium;
  - content depth;
  - not boring;
  - starter-kit similarity;
  - user usefulness.
- [ ] Classify failures as:
  - `quality-depth`;
  - `quality-visual`;
  - `quality-continuity`;
  - `quality-routing`;
  - `provider-capability`.
- [ ] Run viewport checks:
  - desktop;
  - tablet;
  - mobile portrait;
  - mobile landscape.

Acceptance criteria:

- [ ] At least one generated document and one generated deck show visible improvement over the current baseline.
- [ ] Quality scores correlate with manual reviewer judgment.
- [ ] Any mismatch between scoring and human judgment becomes a tracked scoring bug.

## Next Recommended Slice

Continue with the Workstream 3 benchmark slice now that presentation narrative planning and deterministic advisories are attached to runtime diagnostics.

Recommended order:

1. Run one manual deck benchmark against starter/example quality targets.
2. Compare presentation art-director pre/post quality score and log whether the bounded pass visibly improves boring decks.
3. Run one manual document benchmark to move Workstream 2 acceptance from `[~]` to `[x]`.
4. Backfill Workstream 1 manual validation evidence from generated artifacts.
5. Start Workstream 4 spreadsheet craft once presentation manual benchmarks are logged.

This order builds on the active quality-decision foundation and moves the biggest remaining quality gains into the generated artifact structure itself.
