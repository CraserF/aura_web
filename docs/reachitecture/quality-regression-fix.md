# Quality Regression Fix Plan

## Context

The rearchitecture (PLAN.md slices 1–22) replaced the old `PromptComposer` with compact prompt packs (`presentationPrompts.ts` + `promptPacks.ts`) inspired by production coding agents (dyad, opencode, claw-code). This is structurally correct for format/contract enforcement. However, quality has dramatically regressed because the new packs stripped out the **design knowledge** the LLM needs to produce visually excellent slides.

Coding agents work with compact prompts because LLMs already know programming languages. Slide design is different — the LLM needs explicit guidance on CSS patterns, animation vocabulary, SVG composition, layer stacking, typography scale, and concrete examples showing what "good" looks like. All of this lived in the old knowledge docs and is now absent.

## Three Root Causes

### 1. No design knowledge in prompts

`buildPresentationCreateSystemPrompt` assembles compact format/contract packs but zero design knowledge. The `getRelevantKnowledge()` function still exists and loads `standalone-slide-knowledge.md`, `standalone-slide-extended.md`, example HTML slides, animation cheatsheets, and SVG guides — but nothing calls it in the active generation path anymore.

| Old path | New path | Missing |
|---|---|---|
| `PromptComposer` → `getRelevantKnowledge(animLevel)` → full knowledge docs + examples | `buildPresentationCreateSystemPrompt` → compact packs only | All design knowledge |
| `standalone-slide-knowledge.md` (Parts 1–7) | — | CSS layer stack, type scale, palette contract |
| `standalone-slide-extended.md` (Parts 8–12) | — | Component patterns, animation classes, SVG rules |
| 3 example HTML slides | — | Concrete reference for what "good" looks like |
| `svg-drawing.md`, `hero-scenes.md` (level ≥ 2) | — | SVG illustration guide |

### 2. `buildCoreArtifactContractPack()` actively degrades quality

It tells the LLM: *"Keep structure simple enough for another agent pass to validate and repair."*

This explicitly instructs the LLM to produce mediocre output — optimizing for repairability rather than quality. Combined with no design vocabulary, the first draft is weak by design.

### 3. ToolLoopAgent churns when the first draft is weak

The `submitFinalSlide` tool rejects HTML with blocking violations and instructs the agent to fix and resubmit. With 5 steps and no design knowledge, the agent oscillates — fixing one issue introduces another — and hits the step limit without a clean submission. The fallback (`agentResult.text`) is then used, which may not be valid HTML.

The evaluator also truncates the style block to 800 chars (`truncateForEval`), so it judges CSS it can't fully see, producing false feedback that triggers unnecessary revision loops.

## Changes Required

### Step 1 — Restore knowledge docs to `design()` and `designEdit()` in `designer.ts`

`design()` and `designEdit()` are already `async`. Load knowledge at the top of each function and pass it to the prompt builders.

**`src/services/ai/workflow/agents/designer.ts`**
- Import `getRelevantKnowledge` from `@/services/ai/knowledge`
- At the start of `design()`:
  ```typescript
  const knowledgePacks = await getRelevantKnowledge(planResult.animationLevel as 1 | 2 | 3 | 4);
  ```
- Pass `knowledgePacks` into `buildPresentationCreateSystemPrompt({ …, knowledgePacks })`
- Same in `designEdit()` → `buildPresentationEditSystemPrompt({ …, knowledgePacks })`

**`src/services/artifactRuntime/presentationPrompts.ts`**
- Add `knowledgePacks?: string[]` to `PresentationPromptBaseInput`
- In `buildPresentationCreateSystemPrompt`, include knowledge packs between `buildMobileStagePack()` and the CREATE MODE line:
  ```typescript
  ...(input.knowledgePacks ?? []),
  ```
- Same in `buildPresentationEditSystemPrompt` and `buildPresentationRevisionSystemPrompt`

### Step 2 — Fix `buildCoreArtifactContractPack()` in `promptPacks.ts`

**`src/services/artifactRuntime/promptPacks.ts`** — `buildCoreArtifactContractPack()` (line ~15):

Remove: `"Keep structure simple enough for another agent pass to validate and repair."`

Replace with: `"Produce finished, visually polished output. Do not simplify for a repair pass."`

### Step 3 — Fix evaluator style truncation in `evaluator.ts`

`truncateForEval()` currently truncates style blocks to 800 chars. Modern slides have 1500–3000 char style blocks. The evaluator can't correctly judge CSS it can't see.

**`src/services/ai/workflow/agents/evaluator.ts`**
- Change `maxStyleChars = 800` to `maxStyleChars = 3000` in `truncateForEval()`

### Step 4 — Soften the `submitFinalSlide` rejection gate in `designer.ts`

The current gate rejects with "fix these issues and call again" when blocking violations exist. With a better first draft (step 1), this fires less often. When it does fire, change the response to accept the submission and let the deterministic repair layer handle remaining issues — this stops oscillating loops.

**`src/services/ai/workflow/agents/designer.ts`** — `createDesignAgent()`, `submitFinalSlide.execute`:
- When `blockingViolations.length > 0`, return `{ accepted: true, warnings: [...], guidance: "Deterministic repair will handle remaining issues." }` instead of `{ accepted: false, … }`

The deterministic repair layer (`repairPresentationFragmentHtml`) and bounded LLM repair in `presentationRuntime.ts` already handle these issues post-generation.

### Step 5 — Thread knowledge into `buildPresentationBatchSlidePrompt`

Batch slide generation (queued decks) also needs design knowledge. The `runBatchQueue` path calls `buildPresentationBatchSlidePrompt` which currently only has narrative plan + slide blueprint + task brief.

**`src/services/ai/workflow/batchQueue.ts`**
- Load `getRelevantKnowledge` once before the batch loop
- Pass to each slide prompt via a new `knowledgePacks` field

**`src/services/artifactRuntime/presentationPrompts.ts`** — `buildPresentationBatchSlidePrompt`:
- Add `knowledgePacks?: string[]` to `PresentationBatchSlidePromptInput`
- Include on slide 1 only — slide 1 establishes the shared design system; later slides inherit from the shared style block

## Critical Files

| File | Change |
|---|---|
| `src/services/ai/workflow/agents/designer.ts` | Load `getRelevantKnowledge`, pass to prompt builders; soften `submitFinalSlide` rejection |
| `src/services/artifactRuntime/presentationPrompts.ts` | Add `knowledgePacks?: string[]` to base input; include in system prompts |
| `src/services/artifactRuntime/promptPacks.ts` | Fix `buildCoreArtifactContractPack()` wording |
| `src/services/ai/workflow/agents/evaluator.ts` | Increase truncation limit 800 → 3000 |
| `src/services/ai/workflow/batchQueue.ts` | Load knowledge once, pass to first slide prompt |

## Reused Functions (no changes needed)

- `getRelevantKnowledge(animLevel)` — `src/services/ai/knowledge/index.ts:92` — already exists and loads the right docs by level
- `repairPresentationFragmentHtml()` — `src/services/artifactRuntime/presentationRuntime.ts:395` — handles post-design deterministic repair
- `evaluateAndRevise()` — `src/services/ai/workflow/agents/evaluator.ts:85` — loop is bounded correctly; only the truncation fix is needed

## What NOT to Change

- Do not revert the compact prompt packs structure — it is correct for format/contract enforcement
- Do not remove the ToolLoopAgent — the validate→fix pattern is sound; the problem is the LLM lacks vocabulary without design knowledge
- Do not change `maxCorrectionSteps` — 5 is appropriate once the first draft is quality enough to pass QA on the first try
- Do not re-add Google Fonts `<link>` — the system font / CSS stack approach is intentional
- Do not touch `runSinglePresentationRuntime` or the evaluator call chain — those are correct once step 3 is fixed

## Verification

1. `bun run typecheck` — must pass
2. `bun test -- prompt-contracts` — update prompt contract tests to expect knowledge pack content at animLevel ≥ 1
3. Manual: create a single slide → first draft should be visually polished, not skeletal
4. Manual: create a 3-slide deck → batch slides should share visual language
5. Manual: edit an existing slide → no loops, fast QA pass
6. `bun test -- presentation-runtime-workflow release-smoke` — existing tests must still pass
