# Reference: Huashu Design Lessons For Aura

Date: 2026-04-30

Scope: local study of `/Volumes/Callum_SSD/dev_projects/huashu-design` for Aura planning. This document distills design and process lessons only. It does not copy Huashu source code, bundled assets, showcase images, audio files, starter components, or export scripts.

## Sources Studied

Primary Huashu sources:

- `/Volumes/Callum_SSD/dev_projects/huashu-design/SKILL.md`: overall workflow; "HTML is tool, not medium"; fact verification before assumptions; core asset protocol; design-direction advisor fallback; junior designer workflow; anti-AI-slop rules; app prototype rules; deck/PPTX export routing; expert review.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/workflow.md`: one-batch question set, design context intake, assumptions plus placeholders pass, variations, and verification.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/design-context.md`: context-first design, codebase/token extraction, system vocalization before execution.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/design-styles.md`: 5 schools and 20 design philosophies, scene suitability, prompt DNA, and HTML vs image-generation routing.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/assets/showcases/INDEX.md`: 8 scenes x 3 styles = 24 showcase references used for direction selection.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/content-guidelines.md`: anti-slop blacklist, filler-content rules, scale rules for slides, print documents, web, and mobile.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/critique-guide.md`: 5-dimension critique rubric and output template.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/slide-decks.md`: HTML-first deck workflow, 2-page showcase before long decks, multi-file vs single-file architecture, PDF/PPTX derivation.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/editable-pptx.md`: editable PPTX constraints that must be decided before authoring.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/verification.md`: Playwright/browser verification workflow.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/scene-templates.md`: output-type scene constraints for covers, infographics, decks, reports, landing pages, and app UI.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/assets/personal-asset-index.example.json`: private asset index concept; real personal/brand data must not live in distributed skill assets.

Aura files used to anchor implications:

- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/plan/presentation_scaffold_recovery_plan.md`: scaffold-first presentation recovery plan.
- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/plan/value-focused-product-realignment-plan.md`: current value-focused roadmap, runtime/scaffold status, and release gates.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/presentationPrompts.ts`: current presentation prompt packs and design manifest handling.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/documentPrompts.ts`: current document prompt packs and runtime module handling.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/presentationQualityChecklist.ts`: presentation named failures and quality signals.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/documentQualityChecklist.ts`: document safety and excellence checks.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/spreadsheetRuntime.ts`: spreadsheet craft metadata and downstream readiness summaries.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/templates/layouts.ts`: typed presentation layout and slot contracts.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/templates/documentSectionModules.ts`: typed document module and slot contracts.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/workflow/skills/design-rules.ts`: current Aura anti-patterns and design principles.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/workflow/spreadsheet.ts`, `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/spreadsheet/starter.ts`, and `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/validation/spreadsheetValidation.ts`: deterministic spreadsheet planning, starter data, craft metadata, and validation.

## High-Level Lesson

Huashu's strongest idea is not a specific visual style. It is a process contract: high-fidelity output must begin from facts, context, assets, and an explicit design direction. When that context is missing, the system should not improvise an average-looking artifact. It should switch into a design-direction advisor mode, show differentiated options, then generate only after the user or project context supplies a direction.

Aura already has many of the mechanical pieces: typed slide layouts, document modules, quality bars, validation profiles, runtime progress, scaffold plans, and deterministic spreadsheet actions. The lesson is to add a stronger pre-generation "art direction and asset grounding" layer ahead of the existing runtimes, then reflect that layer in validators, export decisions, and user-visible run progress.

## 1. Design-Direction Advisor Patterns

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/huashu-design/SKILL.md`: "design direction advisor fallback" for vague briefs.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/design-styles.md`: 5 schools x 20 philosophies.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/assets/showcases/INDEX.md`: preview gallery for style comprehension.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/scene-templates.md`: output-type constraints.

Huashu trigger rule:

- Enter advisor mode when the brief is vague, the user asks for style recommendations, no design context is available, or the user says they do not know what style they want.
- Skip advisor mode when the user already supplied a Figma, screenshot, brand guideline, reference style, or a concrete target such as an existing deck or product surface.

Huashu advisor phases worth adopting:

1. Understand the artifact context: audience, core message, emotional tone, output format.
2. Restate the brief as a design problem.
3. Recommend 3 differentiated directions.
4. Each direction must name a design lineage or designer/institutional reference, not just a generic adjective.
5. The 3 directions should come from different schools so the choice is meaningful.
6. Show examples before asking the user to choose.
7. Generate visual demos only after the direction set is clear.
8. Once chosen, return to the main artifact workflow.

Implementation pattern for Aura:

- Add a `DesignDirectionPack` registry, not copied from Huashu, with Aura-owned labels, traits, palette roles, type rhythm, density, best-fit artifact types, and anti-patterns.
- Add a `DesignDirectionRecommendation` step to `ArtifactRunPlan` for vague create requests.
- Store the selected direction in `runPlan.designManifest` or a new `designContextSpec.direction` field so downstream prompts, validators, and export code see the same choice.
- Map direction packs to current Aura assets:
  - Presentations: `src/services/ai/templates/layouts.ts`, motion presets, SVG motif families, and future scaffold themes.
  - Documents: `src/services/ai/templates/documentSectionModules.ts`, document design families, density levels, and print rules.
  - Spreadsheets: workbook theme, chart palette, conditional formatting vocabulary, and downstream chart/document readiness.
- In the UI, expose direction cards only when helpful:
  - new blank project;
  - vague prompt;
  - "make it look better";
  - restyle request;
  - starter-kit customization.

Aura should not copy Huashu's showcase files. The source lesson is the gallery mechanism. Aura should compile its own tiny reference previews from shipped scaffolds and starter kits.

Concrete structure:

```ts
type DesignDirectionPack = {
  id: string;
  label: string;
  school: 'information' | 'motion' | 'minimal' | 'experimental' | 'warm-human';
  bestFor: Array<'presentation' | 'document' | 'spreadsheet'>;
  traits: string[];
  paletteRoles: string[];
  typeRhythm: string;
  densityDefault: 'calm' | 'balanced' | 'dense';
  allowedLayouts: string[];
  antiPatterns: string[];
  previewArtifactId?: string;
};
```

The exact naming can differ, but the important invariant is this: the model should choose among typed art directions, not invent arbitrary style prose per run.

## 2. Asset And Brand Protocol

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/huashu-design/SKILL.md`: "Core Asset Protocol", "facts before assumptions", "assets > specs", "5-10-2-8" material quality threshold, and "write brand-spec.md".
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/design-context.md`: read existing design system, codebase, screenshots, and exact values before drawing.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/assets/personal-asset-index.example.json`: private memory asset index, not distributed assets.

Huashu's key asset ranking:

1. Logo is mandatory for any specific brand.
2. Product renders or product photos are mandatory for physical products.
3. UI screenshots are mandatory for digital products.
4. Color values are supporting assets.
5. Fonts are supporting assets.
6. Mood keywords are internal guardrails, not brand identity by themselves.

The most transferable concept is "asset > spec": a product is recognized by real assets before it is recognized by a palette. A generic deck in the right color is still generic if it lacks logo, product imagery, UI screenshots, or real source data.

Aura adoption:

- Create a first-class `DesignContextSpec` that is gathered before generation and stored with the project/run.
- Connect `DesignContextSpec` to project media, project rules, memory, and runtime plans.
- Treat missing mandatory brand assets as a quality gate for brand-sensitive artifacts.
- When an asset is missing, use an explicit placeholder state and user-facing status, not silent visual substitution.
- For browser-only Aura, do not implement Huashu's shell-based `curl` asset scraping directly in product runtime. Instead, support user-uploaded media, project media library, linked local files where available, and manual source annotations.

Suggested `DesignContextSpec` fields:

```ts
type DesignContextSpec = {
  sourceStatus: 'user-provided' | 'project-derived' | 'advisor-derived' | 'partial' | 'missing';
  factualClaims: Array<{
    claim: string;
    sourceRef?: string;
    verifiedAt?: string;
    confidence: 'verified' | 'user-provided' | 'assumed' | 'unknown';
  }>;
  brandAssets: {
    logo?: AssetRef;
    logoVariants?: AssetRef[];
    productImages?: AssetRef[];
    uiScreenshots?: AssetRef[];
    chartDataSources?: AssetRef[];
  };
  brandTokens: {
    colors?: Array<{ role: string; value: string; source: string }>;
    fonts?: Array<{ role: string; stack: string; source: string }>;
    spacing?: string;
    radius?: string;
  };
  assetQuality: Array<{
    assetId: string;
    score: number;
    rationale: string;
    approvedFor: Array<'hero' | 'supporting' | 'reference-only'>;
  }>;
  missingBlockers: string[];
  direction?: string;
};
```

Quality rule to port:

- For non-logo visual assets, require a scored threshold before use in a hero or primary visual role. Huashu calls this "5-10-2-8": search broadly, collect candidates, choose few, each 8/10 or better. Aura should adapt this to local-first constraints:
  - If user uploads many media files, rank and pick the best few.
  - If the source is project media, require clear provenance and resolution.
  - If the asset cannot be verified, mark it `reference-only` or use a labeled placeholder.
  - Do not pad a deck/document with weak images to "feel visual".

Protocol impact by artifact:

- Presentations: brand-sensitive decks should block "polished/ready" status unless logo plus required product/UI/source-data assets are present or intentionally waived.
- Documents: proposals and reports should include source provenance for logos, charts, screenshots, and claims; missing assets should appear as structured TODO slots, not fake visuals.
- Spreadsheets: asset protocol translates to data provenance and source freshness. Workbook-derived charts should record source sheet, query, row count, and generated-at time. Sample data must be labeled sample data.

Avoid:

- Do not let the model invent colors when a project palette exists.
- Do not use CSS silhouettes, generic abstract panels, or decorative SVGs as stand-ins for real product or UI assets.
- Do not silently mix demo/customer colors from screenshots into the product's own brand tokens.
- Do not store private personal asset indexes in a distributed package or starter kit.

## 3. Critique Rubric

Source concept:

- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/critique-guide.md`: 5 dimensions: philosophy alignment, visual hierarchy, craft quality, functionality, originality; output Keep/Fix/Quick Wins.

Huashu's rubric is useful because it separates "valid" from "good". Aura already has deterministic validation and quality scoring, but the current checks can become stronger if they are mapped to a human-readable critique model.

Recommended Aura rubric mapping:

| Rubric dimension | Aura interpretation | Existing anchors |
| --- | --- | --- |
| Philosophy alignment | Does the output match the selected design direction, scaffold, starter variant, and brand context? | `designManifest`, `TemplateGuidanceProfile`, future `DesignContextSpec` |
| Visual hierarchy | Can a viewer identify the primary idea, supporting evidence, and next action quickly? | `presentationQualityChecklist.ts`, `documentQualityChecklist.ts`, layout slot budgets |
| Craft quality | Are spacing, contrast, type scale, class continuity, export constraints, and responsive/print behavior correct? | viewport checks, CSS design contract, document iframe contract |
| Functionality | Does the artifact serve its task without decoration, fake data, or unnecessary modules? | document module contracts, spreadsheet plan validation, run plan target scope |
| Originality | Does it avoid generic AI patterns while remaining appropriate to the audience? | anti-patterns, reference-style packs, scaffold themes |

Artifact-specific weighting:

- Presentations:
  - Visual hierarchy and philosophy alignment should be strongest.
  - Craft quality covers one style system, class continuity, motion budget, and slide-to-slide rhythm.
  - Functionality means one main idea per slide, not maximal content density.
- Documents:
  - Functionality and craft quality should be strongest.
  - Originality is lower weight than evidence clarity, long-form readability, print safety, headings, tables, and citation/provenance discipline.
- Spreadsheets:
  - Functionality dominates.
  - Craft quality is column formats, frozen headers, widths, formulas, query safety, chart suitability, and downstream readiness.
  - Originality is mostly irrelevant except for dashboard/chart presentation.

Recommended output shape for Aura diagnostics:

- `Keep`: concrete strengths that should be preserved in edits.
- `Fix`: ordered issues with severity and repair action.
- `Quick Wins`: up to 3 bounded repairs that can run safely.
- `Blocked`: missing assets, unverified claims, export-mode contradictions, or unsafe spreadsheet mutations.

Implementation:

- Extend `ArtifactQualitySignalScore` with optional `rubricDimension`.
- Add a `buildCritiqueSummary()` helper that converts deterministic signals plus named failures into Keep/Fix/Quick Wins.
- In chat, surface a compact version after quality-bar failures instead of a generic "QA flagged issues".
- In advanced diagnostics, include full rubric scores.

## 4. Anti-Slop Rules

Source concepts:

- `/Volumes/Callum_SSD/dev_projects/huashu-design/SKILL.md`: "anti AI slop" as brand protection, not taste policing.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/content-guidelines.md`: blacklists for aggressive gradients, emoji decoration, rounded card plus left border accent, generic SVG imagery, fake stats, fake quotes, too-common fonts, and filler content.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/design-context.md`: if context is missing, say so and choose a known fallback direction explicitly.

Core lesson:

Anti-slop rules should explain why a pattern is harmful. The reason is not "this pattern is ugly"; it is "this pattern carries no user-specific information and makes every brand look the same".

Rules Aura should adopt:

- Context first:
  - Use project rules, starter variant, uploaded assets, current artifact, and linked data before generating visuals.
  - If no context exists, ask for it or run the design-direction advisor.
- Asset honesty:
  - Real product/UI/data assets beat decorative stand-ins.
  - Honest placeholders beat fake visuals.
  - Missing evidence should be visible in the artifact state and diagnostics.
- No data slop:
  - Do not invent KPI values, customer counts, quotes, citations, formulas, or chart data for decoration.
  - Sample rows in spreadsheets must be clear starter examples and should not be passed downstream as real evidence.
- No icon slop:
  - Do not attach icons to every heading or feature unless the icon carries information.
  - Use approved icon/motif registries in presentation scaffolds.
- No gradient/card-wall autopilot:
  - Avoid same-size card grids as the default deck/document structure.
  - Avoid aggressive "AI tech" gradients unless they are a selected brand/direction trait.
- No arbitrary color invention:
  - Use brand tokens, scaffold theme tokens, or direction packs.
  - If a new color is needed, add it to a token spec with a role and source.
- Typography has to be intentional:
  - System fonts can be legitimate for documents and product UI, but they are not an art direction by themselves.
  - Presentation and document design packs should define type rhythm, not let the model choose random web fonts.

Important conflict in Aura today:

- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/workflow/skills/design-rules.ts` currently contains a fallback that allows large emoji for real-world subjects. Huashu's stricter rule is that emoji decoration is usually slop unless the brand or audience makes it appropriate. Aura should revise the fallback from "use emoji as subject replacement" to "use licensed/project media, a semantic icon, a chart/diagram, or an explicit placeholder". Emoji can remain allowed only for playful starter kits or user-requested tone.

Validator implications:

- Add named failures:
  - `generic-gradient-slop`
  - `decorative-icon-slop`
  - `fake-data-slop`
  - `quote-slop`
  - `brand-asset-missing`
  - `unscored-hero-media`
  - `direction-mismatch`
  - `sample-data-not-labeled`
- Tie failures to repair paths:
  - Remove decorative element.
  - Replace with placeholder.
  - Ask user for source data/assets.
  - Re-run direction advisor.
  - Swap to scaffold-approved motif.

## 5. What Aura Should Adopt

Adopt as product/runtime concepts:

- Design context as a first-class structured object, not just prose in project rules.
- Design-direction advisor for vague or context-free prompts.
- Three-direction recommendation rule with meaningful contrast.
- Project-owned preview gallery generated from Aura scaffolds, not vendored reference assets.
- Asset ranking: logo, product image/UI screenshot, source data, then palette/font.
- Asset quality scoring for hero/supporting/reference-only media use.
- "Placeholder over bad implementation" as a validator-backed rule.
- "Junior designer" staged workflow:
  - assumptions;
  - early skeleton or module plan;
  - user-visible direction;
  - full generation;
  - critique/repair.
- Artifact-specific critique rubric linked to deterministic quality signals.
- Export intent decided before generation.
- Long deck/document showcase before batch generation:
  - presentations: 2 representative slides before all slides;
  - documents: cover plus one dense content module before all modules when the user is present;
  - spreadsheets: starter schema plus one sample derived view/chart before downstream document/deck refresh.
- Human-readable Keep/Fix/Quick Wins summary after quality checks.

Adopt as engineering constraints:

- The model fills slots; the runtime owns scaffolds, CSS, layout, motion, spreadsheet mutations, and export constraints.
- Brand/context tokens should be injected as variables and validated, not re-described loosely in every prompt.
- Missing mandatory assets should downgrade readiness or block publish/export, depending on artifact type and user override.
- Quality bars should include design-direction fit, asset completeness, and source-data honesty.

## 6. What Aura Should Avoid

Avoid copying:

- Huashu assets, showcase images, audio, starter components, export scripts, and demo HTML.
- Huashu's exact style taxonomy as product vocabulary. Aura should make its own direction packs aligned with starter kits and user workflows.
- Huashu's shell/web-search/curl protocol as a browser runtime feature. Aura is local-first and client-side; asset gathering must fit user-uploaded/project-media flows.
- Huashu's HTML deck architecture wholesale. Aura uses Reveal and is moving toward scaffolded fragment compilation. The lesson is "HTML/source first, derivatives later", not the exact deck implementation.

Avoid product/process regressions:

- Do not add a blocking questionnaire for every small edit. Huashu's checkpoint process is good for ambiguous new design work; Aura should route by intent and keep minor edits fast.
- Do not make design-direction advisor a landing page or decorative wizard. It should appear when ambiguity is real.
- Do not let "anti-slop" become a single visual style. The correct output can be dense, playful, quiet, editorial, or technical if it is context-grounded.
- Do not make every artifact premium at the cost of correctness. Spreadsheets stay deterministic first.
- Do not use visual novelty to hide weak content, fake data, or unverified claims.

## 7. Implications For Presentation Generation

Sources:

- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/slide-decks.md`
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/editable-pptx.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/docs/plan/presentation_scaffold_recovery_plan.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/templates/layouts.ts`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/presentationPrompts.ts`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/presentationQualityChecklist.ts`

Lessons:

- Decide export intent before generating:
  - HTML/Reveal only allows richer visuals.
  - PDF snapshot allows visual fidelity.
  - Editable PPTX requires structural constraints from the first slide.
- For decks with 5 or more slides, create or compile two representative slides first to establish grammar before filling the rest.
- Slide generation should answer Huashu's "position four questions":
  - narrative role;
  - viewing distance;
  - visual temperature;
  - capacity estimate.
- Decks need rhythm, not repeated layout validity:
  - opening scene;
  - context;
  - proof;
  - mechanism/process;
  - contrast;
  - closing action.
- Direction and brand assets must constrain scaffold selection, tokens, motif, and media slots.

Concrete Aura changes:

- Extend `ArtifactRunPlan` with:
  - `designContextSpec`;
  - `presentationExportIntent`;
  - `designDirectionId`;
  - `assetReadiness`;
  - `showcaseCheckpoint?: { required: boolean; slideIds: string[] }`.
- In scaffolded mode, add a host-owned `planDeckGrammar` step before queued slide filling. This should select:
  - scaffold;
  - direction;
  - theme;
  - type rhythm;
  - recurring motif;
  - title slide grammar;
  - proof/data slide grammar.
- Add validator rules:
  - first slide establishes tokens/motif;
  - no unscored hero media;
  - no repeated card wall;
  - no fake KPI/quote/citation;
  - selected direction traits present;
  - required brand assets used or waived.
- Update `presentationQualityChecklist.ts` named failures so "weak opening scene" can distinguish:
  - no art direction;
  - missing brand asset;
  - missing narrative promise;
  - repeated generic layout.
- For editable PPTX, create a separate scaffold/export profile that avoids unsupported features up front instead of repairing after generation.

Do not adopt:

- Huashu's multi-file deck assembler as-is.
- Huashu's exact PPTX conversion scripts.
- Any showcase PNG/HTML as Aura examples.

## 8. Implications For Document Generation

Sources:

- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/content-guidelines.md`
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/scene-templates.md`
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/critique-guide.md`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/templates/documentSectionModules.ts`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/documentPrompts.ts`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/documentQualityChecklist.ts`

Lessons:

- Documents are not slides. Huashu's "HTML is tool, not medium" maps directly: a report should not look like a dashboard or landing page.
- Long-form artifacts need reading optimization: line length, heading hierarchy, print media, table accessibility, evidence rhythm, and page-break behavior.
- Functional clarity beats visual novelty in reports, proposals, and reference materials.
- Missing source evidence must not be masked by polished layout.
- A brand-sensitive document needs the same core asset protocol as a deck: logo, real product/UI assets where relevant, palette/font tokens, and source notes.

Concrete Aura changes:

- Add `designContextSpec` to document runtime prompts and module prompts.
- Add document-level "position questions":
  - reader context: skim, decide, learn, archive;
  - reading distance: mobile, laptop, printed page;
  - evidence standard: internal memo, client proposal, public report;
  - export target: in-app HTML, email HTML, DOCX/PDF later.
- For major document creates, run a module grammar pass:
  - cover/header module;
  - one dense content module;
  - evidence/table/recommendation rhythm.
- Map design direction to document module density:
  - executive: concise, proof strips, recommendation blocks;
  - research: evidence tables, footnote-like source rhythm;
  - editorial: pull quotes, essay sections, strong headings;
  - teaching: process modules, callouts, checks.
- Add quality failures:
  - missing source provenance for claims;
  - fake citation;
  - decorative callout with no information;
  - table without accessible headers;
  - brand asset missing for client-facing document;
  - print/export risk.

DOCX/export implications:

- Decide document export target before generation when possible.
- If an editable/exportable DOCX path has structural constraints, enforce them at module generation time.
- Keep semantic HTML clean: headings, paragraphs, lists, tables, figures, captions.
- Avoid visual structures that cannot map to DOCX/PDF without rasterizing unless the user chooses visual HTML as the primary deliverable.

## 9. Implications For Spreadsheet Generation

Sources:

- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/content-guidelines.md`: no fake stats or data slop.
- `/Volumes/Callum_SSD/dev_projects/huashu-design/references/critique-guide.md`: functionality and craft rubric.
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/ai/workflow/spreadsheet.ts`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/artifactRuntime/spreadsheetRuntime.ts`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/spreadsheet/starter.ts`
- `/Volumes/Callum_SSD/dev_projects/aura_web/src/services/validation/spreadsheetValidation.ts`

Lessons:

- Spreadsheet "design" is mostly trust design:
  - correct schema;
  - clear target;
  - formulas that reference real columns;
  - safe query views;
  - readable formats;
  - honest sample data labels;
  - chart suitability.
- Anti-slop becomes "no decorative metrics". A workbook should not invent KPI dashboards just because a deck would look better with numbers.
- Asset protocol becomes data protocol: provenance, freshness, source sheet, row count, transformation path, and downstream usage.

Aura already does well:

- Spreadsheet execution is deterministic and plan-validated.
- `applySpreadsheetCraftMetadata()` adds useful number/date formats, frozen headers, and readable widths.
- Chart specs are generated only when chartable columns exist.
- Query views and formula columns validate source columns.

Additional recommendations:

- Add `DataContextSpec` parallel to `DesignContextSpec` for spreadsheets:
  - source type: user data, starter sample, imported file, derived query;
  - sample/real status;
  - row count and schema;
  - freshness timestamp;
  - downstream artifact links.
- Label starter rows from `spreadsheet/starter.ts` as sample rows in workbook metadata so downstream charts/documents/decks cannot accidentally cite them as real business facts.
- Add chart critique:
  - chart answers a stated question;
  - chart type matches data shape;
  - labels are readable;
  - no more than 2-3 emphasized series unless user requested detail;
  - palette follows project brand or chart theme tokens.
- Add dashboard anti-slop checks:
  - no generated KPI tiles without source columns;
  - no "Total", "Growth", or "Conversion" metric unless computed from explicit fields;
  - no decorative charts on empty/default sheets.
- Use spreadsheet craft summaries as inputs to presentations/documents:
  - "source sheet";
  - "query view";
  - "chart ready";
  - "sample data";
  - "real imported data".

## 10. Proposed Aura Workflow

Recommended create flow:

1. Intake
   - Resolve artifact type, export target, audience, and task.
   - If facts/products/brands are named, mark factual claims as user-provided, verified, assumed, or unknown.
2. Context scan
   - Read project rules, current artifacts, media assets, workbook data, starter variant, and prior memory.
   - Build `DesignContextSpec` or `DataContextSpec`.
3. Advisor fallback
   - If context is thin or style is vague, recommend 3 directions from different direction families.
   - If the user does not choose interactively, pick one and record the assumption.
4. Asset/data readiness
   - Score assets or data sources.
   - Mark blockers, waivers, and placeholders.
5. Scaffold/module/plan selection
   - Presentations: deck rhythm plus slide skeletons.
   - Documents: module plan plus evidence rhythm.
   - Spreadsheets: deterministic action plan plus validation.
6. Generation
   - Model fills slots and content only.
   - Runtime compiles layout, style, motion, spreadsheet mutations, and export constraints.
7. Critique and repair
   - Run deterministic checks.
   - Build Keep/Fix/Quick Wins.
   - Repair only the rejected slot/data/module surfaces.
8. Delivery
   - Show concise status, caveats, missing assets/data, export readiness, and next safe actions.

Progress UI language:

- "Checking context"
- "Choosing direction"
- "Preparing assets"
- "Planning structure"
- "Filling content"
- "Validating quality"
- "Repairing issues"
- "Ready with caveats"

This fits Aura's W4 progress system and W9 release gates while adding clearer design-process semantics.

## 11. Near-Term Implementation Slices

Slice A: direction and context data model

- Add `DesignContextSpec` and `DataContextSpec` types.
- Thread them through `ArtifactRunPlan`.
- Populate from project rules, visual variant, current artifact, media library, workbook metadata, and user prompt.
- Add tests for missing, partial, and complete context states.

Slice B: Aura-owned direction packs

- Add a small registry of 5-7 Aura direction packs.
- Map packs to presentation scaffold themes and document module density.
- Add selector logic for vague prompts.
- Generate local previews from Aura scaffolds, not Huashu assets.

Slice C: asset/data readiness gates

- Add validators for missing logo/product/UI assets in brand-sensitive requests.
- Add media quality scores and hero-media thresholds.
- Add sample-vs-real spreadsheet metadata and downstream warnings.

Slice D: critique summaries

- Map existing quality signals and named failures to the 5-dimension rubric.
- Add Keep/Fix/Quick Wins summaries to run result payloads.
- Make repair actions target slots/modules/data transforms, not full regeneration.

Slice E: anti-slop validator updates

- Replace emoji-as-default fallback with media/icon/placeholder policy.
- Add fake-data, fake-quote, decorative-icon, generic-gradient, and direction-mismatch named failures.
- Add tests with representative bad fragments.

Slice F: export intent before generation

- Add explicit export target to presentation/document run plans.
- If editable PPTX/DOCX is requested, select compatible scaffolds/modules before generation.
- Add validation that refuses after-the-fact conversion promises when the source artifact violates export constraints.

## 12. Acceptance Criteria

Aura should be considered to have absorbed the useful Huashu lessons when:

- A vague "make a polished deck/document" prompt produces a visible direction-selection step or records a selected default direction with rationale.
- A brand-specific artifact cannot reach "ready" status without logo and relevant product/UI/source-data assets or an explicit user waiver.
- Generated presentations show deck rhythm, direction fit, and asset grounding, not only valid HTML.
- Generated documents show evidence rhythm, semantic structure, print/readability safety, and source honesty.
- Generated spreadsheets label sample data, preserve deterministic transformations, and expose downstream readiness without decorative metrics.
- Quality diagnostics produce Keep/Fix/Quick Wins grounded in the 5 critique dimensions.
- Validators catch generic slop patterns with actionable repair targets.
- No Huashu proprietary assets, showcase files, starter components, scripts, or code are vendored into Aura.

