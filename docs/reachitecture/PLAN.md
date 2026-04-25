# Aura Artifact Runtime Rebuild

## Summary
Rebuild Aura around a simpler, presentation-first artifact runtime inspired by Dyad, OpenCode, and Claw Code: explicit planning, small generation steps, typed run events, deterministic validation, and guided defaults for non-technical users.

Research inputs: Dyad’s guided app-generation flow and live preview contract ([dyad](https://github.com/dyad-sh/dyad)), OpenCode’s session/agent/message-part runtime ([opencode](https://github.com/anomalyco/opencode)), and Claw Code’s session/task/permission/prompt-cache patterns ([claw-code](https://github.com/ultraworkers/claw-code)).

Chosen direction:
- Deep rearchitecture.
- Presentations first.
- Frontier-quality generation with local/Ollama fallback.
- No legacy project/export support required.
- Remove external API/MCP/automation seams until the new architecture is complete.
- Simplify the app for non-technical users with guided defaults and hidden advanced controls.

## Key Architecture Changes
- Replace today’s scattered workflow path with a single internal `ArtifactRuntime`.
- Remove the external-facing execution-spec layer for now: API/MCP/automation adapter mappers, dry-run/explain plumbing, and serializable external run contracts should be deleted or quarantined.
- Keep only the internal app runtime primitives needed for UX: run id, steps, events, validation, output summary, and cancellation.
- Introduce a new internal `ArtifactRunPlan` as the only source of truth for artifact type, user intent, selected design family, work queue, provider policy, context budget, and validation gates.
- Replace duplicated intent/template decisions inside presentation/document/spreadsheet workflows with planner-produced run plans.
- Model generated artifacts as first-class parts:
  - presentation: deck, slide, section, design manifest, validation result;
  - document: outline, section, module, shell, validation result;
  - spreadsheet: workbook action, formula, query, chart, validation result.
- Add internal role separation, not user-visible complexity:
  - `Planner` decides what to build.
  - `DesignDirector` selects the visual system.
  - `Generator` creates small artifact parts.
  - `Validator` checks render/readability/contracts.
  - `Repairer` fixes only failing parts.
  - `Finalizer` assembles and writes the artifact.

## Presentation Workflow
- Make presentations the first implementation target.
- Replace one-shot deck generation with:
  - user intent summary;
  - slide outline;
  - `DesignManifest`;
  - queued slide generation;
  - per-slide validation;
  - targeted repair;
  - final deck assembly.
- Route default generation only through production template families. Legacy templates do not need compatibility and can be removed, archived, or converted later.
- Standardize slide output to simple fragments: `<style>` plus `<section>` elements, class-based CSS, scoped-safe selectors, no JavaScript, no external images, no unresolved tokens, and reduced-motion support.
- Store complete slide HTML directly in the artifact. Do not preserve old `themeCss` behavior except where still needed internally during the transition.
- Add deterministic starter decks that use the same runtime as generated decks, not a separate one-off path.
- Add a compact `DesignManifest` generated once per deck with typography, colors, layout recipes, component classes, icon/diagram rules, and motion budget. Later slides reuse this manifest to reduce tokens and improve consistency.

## Documents And Spreadsheets
- After presentation runtime lands, move documents onto the same run engine.
- Documents should generate from outline plus section/module queue, using reusable document design modules instead of broad freeform HTML.
- Extract document shell styling into a compact design-system module and keep generated document HTML simple, iframe-safe, mobile-safe, and print-safe.
- Keep spreadsheets deterministic:
  - the model extracts intent and proposes actions;
  - runtime code executes formulas, queries, charts, validation, and workbook updates.
- Use spreadsheets as the reference standard for low-token, high-reliability execution.

## Prompt And Context Strategy
- Replace the large prompt composer with small prompt packs:
  - core artifact contract;
  - canvas/rendering contract;
  - selected design family;
  - task brief;
  - validator feedback.
- Remove contradictory guidance around inline styles, wrappers, external assets, and output format.
- Use one selected style pack or exemplar per run, not the whole template universe.
- Add provider-aware modes:
  - frontier mode can plan and design richer outputs;
  - local mode uses smaller queued tasks, stricter schemas, fewer animations, and shorter repairs.
- Keep context assembly automatic for normal users. Advanced users may inspect context, but should not need to tune token budgets, source counts, or model behavior manually.
- Track token use, cache hits where available, first-preview time, repair count, and validation pass rate as runtime metrics.

## Simplified UX
- Replace “Project Rules” as a visible technical surface with guided “Project Style” and “Output Preferences”.
- Default controls should be understandable to non-technical users:
  - audience;
  - tone;
  - visual style;
  - quality/speed preference;
  - artifact type;
  - source usage.
- Hide advanced controls behind an Advanced area:
  - provider;
  - model;
  - context limits;
  - raw rules markdown;
  - validation details;
  - workflow diagnostics.
- Remove workflow presets as a user-authored technical system. Replace them with curated built-in modes such as Executive, Editorial, Proposal, Research, Launch, Teaching, and Data Story.
- Keep the generation experience simple: “planning”, “designing”, “creating slides”, “checking quality”, “finishing”.
- Show first usable preview early and update progressively.

## Implementation Order
1. Remove/quarantine external API/MCP/automation seams and dry-run/explain complexity from the active runtime.
2. Define the new `ArtifactRunPlan`, `ArtifactRunEvent`, `ArtifactPart`, `DesignManifest`, and `ValidationGate` types.
3. Rebuild presentation generation around the new run engine while keeping the current UI entry point.
4. Replace presentation prompt composition with compact prompt packs and design manifests.
5. Convert starter kits to use the same presentation runtime and production design families.
6. Simplify user-facing project settings into guided style/preferences, with current technical controls moved to Advanced.
7. Move document generation onto the same run engine.
8. Keep spreadsheet execution deterministic but emit the same run events and validation summaries.
9. Delete or convert legacy templates after production routing is stable.
10. Add benchmark and viewport validation harnesses for presentations first, then documents and spreadsheets.

## Test Plan
- Add planner tests proving each user prompt produces exactly one authoritative `ArtifactRunPlan`.
- Add presentation runtime tests for outline, manifest, queued slides, validation, repair, and final assembly.
- Add prompt contract tests ensuring generated slide prompts require the new fragment format and do not reintroduce old contradictions.
- Add template tests for all routed production templates: no wrappers, no JavaScript, no external images, no unresolved tokens, readable font sizes, reduced motion, and canvas-safe sizing.
- Add starter-kit tests proving starter decks use the runtime, contain multiple sections, have correct slide counts, and do not write duplicated CSS.
- Add UX tests for guided settings defaults and Advanced-only technical controls.
- Add regression tests proving removed external adapter paths are no longer part of active generation.
- Add benchmark checks for time to first preview, total generation time, token estimate, validation pass rate, and repair count.

## Assumptions
- “Remove API” means remove external API/MCP/automation adapter seams, not provider API access for AI generation.
- Existing Aura projects, old exports, and old template compatibility can be broken or reset.
- The app remains client-side for now.
- No new runtime dependency is required in the first rebuild pass.
- The default product experience should optimize for non-technical users; expert controls remain available only behind Advanced.
