# Presentation Quality Recovery — Combined Plan

## Summary

Quality degraded dramatically after the rearchitecture replaced the old `PromptComposer` with compact prompt packs. The primary cause is missing design knowledge in prompts — not broken loop architecture. The fix is two-phased: restore quality immediately with surgical prompt changes, then harden the runtime with loop safety, outcome states, and richer continuity context.

---

## Root Causes

### 1. Design knowledge was removed from active prompts

`buildPresentationCreateSystemPrompt` assembles compact format/contract packs but zero design knowledge. `getRelevantKnowledge()` still exists in `src/services/ai/knowledge/index.ts` and loads `standalone-slide-knowledge.md`, `standalone-slide-extended.md`, three example HTML slides, animation cheatsheets, and SVG guides — but nothing in the active generation path calls it anymore.

| Old path | New path | Missing |
|---|---|---|
| `PromptComposer` → `getRelevantKnowledge(animLevel)` | `buildPresentationCreateSystemPrompt` → compact packs only | All design knowledge |
| `standalone-slide-knowledge.md` (Parts 1–7) | — | CSS layer stack, type scale, palette contract |
| `standalone-slide-extended.md` (Parts 8–12) | — | Component patterns, animation classes, SVG rules |
| 3 example HTML slides | — | Concrete reference for what "good" looks like |
| `svg-drawing.md`, `hero-scenes.md` (level ≥ 2) | — | SVG illustration guide |

### 2. `buildCoreArtifactContractPack()` actively degrades quality

It tells the LLM: *"Keep structure simple enough for another agent pass to validate and repair."*

This instructs the LLM to produce mediocre output by design — optimising for repairability rather than quality. Combined with no design vocabulary, the first draft is weak before any loop runs.

### 3. ToolLoopAgent churns when the first draft is weak

The `submitFinalSlide` tool in `designer.ts` rejects HTML with blocking violations and asks the agent to fix and resubmit. With 5 steps and no design vocabulary, the agent oscillates — fixing one issue introduces another — hits the step limit without a clean submission, and falls back to `agentResult.text`, which may not be valid HTML.

The evaluator also truncates style blocks to 800 chars (`truncateForEval`), so it judges CSS it cannot see, producing false feedback that triggers unnecessary revision loops.

### 4. No hard stops or observable outcomes

The current runtime has no explicit per-slide timeout, no total run budget enforcement, and no surfaced outcome state. When generation degrades it loops silently. There is no signal to the user that quality could not be met, and no manual escape hatch.

---

## Phase 1 — Immediate Quality Fix

Surgical changes only. No architectural rewrites. Target: one session.

### 1.1 — Restore design knowledge to `design()` and `designEdit()`

Both functions are already `async`. Load the knowledge docs at the top of each and pass them to the prompt builders.

**`src/services/ai/workflow/agents/designer.ts`**
- Import `getRelevantKnowledge` from `@/services/ai/knowledge`
- At the top of `design()`:
  ```typescript
  const knowledgePacks = await getRelevantKnowledge(planResult.animationLevel as 1 | 2 | 3 | 4);
  ```
- Pass `knowledgePacks` into `buildPresentationCreateSystemPrompt({ …, knowledgePacks })`
- Same in `designEdit()` → `buildPresentationEditSystemPrompt({ …, knowledgePacks })`

**`src/services/artifactRuntime/presentationPrompts.ts`**
- Add `knowledgePacks?: string[]` to `PresentationPromptBaseInput`
- In `buildPresentationCreateSystemPrompt`, splice knowledge packs between `buildMobileStagePack()` and the CREATE MODE section:
  ```typescript
  ...(input.knowledgePacks ?? []),
  ```
- Same in `buildPresentationEditSystemPrompt` and `buildPresentationRevisionSystemPrompt`

### 1.2 — Fix `buildCoreArtifactContractPack()` wording

**`src/services/artifactRuntime/promptPacks.ts`** — `buildCoreArtifactContractPack()`:

Remove: `"Keep structure simple enough for another agent pass to validate and repair."`

Replace with: `"Produce finished, visually polished output. Do not simplify for a repair pass."`

### 1.3 — Fix evaluator style truncation

**`src/services/ai/workflow/agents/evaluator.ts`** — `truncateForEval()`:

Change `maxStyleChars = 800` → `maxStyleChars = 3000`

Modern slides have 1500–3000 char style blocks. The evaluator currently cannot see enough CSS to judge correctly.

### 1.4 — Soften the `submitFinalSlide` rejection gate

The current gate returns `{ accepted: false }` when blocking violations are present and tells the agent to fix and call again. This creates oscillation. With a better first draft (1.1), the gate fires less. When it does fire, accept the submission and let the deterministic repair layer handle the remainder.

**`src/services/ai/workflow/agents/designer.ts`** — `createDesignAgent()`, `submitFinalSlide.execute`:
- When `blockingViolations.length > 0`, return `{ accepted: true, warnings: [...], guidance: "Deterministic repair will handle remaining issues." }` instead of `{ accepted: false, … }`

`repairPresentationFragmentHtml()` (`presentationRuntime.ts:395`) and the bounded LLM repair pass already handle post-generation blocking issues.

### 1.5 — Thread knowledge into `buildPresentationBatchSlidePrompt`

**`src/services/ai/workflow/batchQueue.ts`**
- Call `getRelevantKnowledge` once before the batch loop and pass to each slide

**`src/services/artifactRuntime/presentationPrompts.ts`** — `buildPresentationBatchSlidePrompt`:
- Add `knowledgePacks?: string[]` to `PresentationBatchSlidePromptInput`
- Include on slide 1 only — slide 1 establishes the shared design system; later slides inherit via the shared style block

### Phase 1 files

| File | Change |
|---|---|
| `src/services/ai/workflow/agents/designer.ts` | Load `getRelevantKnowledge`; pass to prompt builders; soften `submitFinalSlide` rejection |
| `src/services/artifactRuntime/presentationPrompts.ts` | Add `knowledgePacks?: string[]`; include in system prompts |
| `src/services/artifactRuntime/promptPacks.ts` | Fix `buildCoreArtifactContractPack()` wording |
| `src/services/ai/workflow/agents/evaluator.ts` | Increase truncation 800 → 3000 |
| `src/services/ai/workflow/batchQueue.ts` | Load knowledge once; pass to first slide prompt |

### Phase 1 — what NOT to change

- Do not revert the compact prompt packs structure — it is correct for format/contract enforcement
- Do not remove the ToolLoopAgent — validate→fix is the right pattern; the LLM just lacked vocabulary
- Do not change `maxCorrectionSteps` — 5 is appropriate once the first draft passes QA on the first try
- Do not re-add Google Fonts `<link>` — the system font / CSS stack approach is intentional
- Do not touch `runSinglePresentationRuntime` or the evaluator call chain — correct once truncation is fixed

---

## Phase 2 — Loop Safety, Outcome States, and Continuity

After Phase 1 has soaked and quality is restored, harden the runtime so degradation is bounded and visible. These are not emergency fixes.

### 2.1 — Add explicit hard stop rules to `ArtifactRunPlan`

Add `perSlideTimeoutMs` and `totalRunTimeoutMs` to `ArtifactRunPlan.metricsBudget`. The presentation orchestrator in `presentationRuntime.ts` should enforce these and abort cleanly rather than looping.

Max per run:
- 1 deterministic repair pass per slide
- 1 model revision pass per run
- No automatic second polish loop after budget exhaustion

**`src/services/artifactRuntime/types.ts`** — extend `ArtifactRunMetricsBudget`

**`src/services/artifactRuntime/presentationRuntime.ts`** — enforce budget fields in `runSinglePresentationRuntime` and `runQueuedPresentationRuntime`

### 2.2 — Add run outcome states

Add explicit outcome states to the presentation output envelope:

```typescript
type PresentationRunOutcome =
  | 'excellent'
  | 'valid-needs-polish'
  | 'budget-exhausted'
  | 'blocked';
```

These replace the current implicit "did it pass validation" boolean with a surfaceable signal.

**`src/services/ai/workflow/types.ts`** — add `runOutcome` to `PresentationOutput`

**`src/services/artifactRuntime/presentationRuntime.ts`** — assign outcome at the end of each runtime function

### 2.3 — Add previous-slide continuity context to batch prompts

Each queued slide prompt after slide 1 should receive a compact summary of the previous slide's content role, visual treatment, and CSS class vocabulary — not just the shared style block. This prevents repeated card walls and ensures role variety.

**`src/services/ai/workflow/batchQueue.ts`** — accumulate a compact per-slide summary after each generation and pass it into `buildPresentationBatchSlidePrompt`

**`src/services/artifactRuntime/presentationPrompts.ts`** — add `previousSlideSummary?: string` to `PresentationBatchSlidePromptInput`; include as a `## PREVIOUS SLIDE` block

### 2.4 — Promote quality signals to named failures

The quality checklist currently treats repeated card grids, weak opening scenes, missing integrated visuals, and poor continuity as advisory. These should become named failing signals that contribute to `valid-needs-polish` outcome state.

**`src/services/artifactRuntime/presentationQualityChecklist.ts`** — promote these checks from advisory to failing signals

### 2.5 — UX: surface outcome and add manual Improve action

- Show simple progress labels: Planning → Designing Slides → Checking Quality → Polishing → Finished
- Show plain-language outcome: "Looks polished", "Needs one more pass", "Could not meet quality bar in time"
- After `budget-exhausted`, expose one explicit "Improve" action instead of hidden automatic loops

**`src/components/ChatBar.tsx`** or equivalent — read `runOutcome` from the output envelope

### 2.6 — Connect to Ollama benchmark harness

Implement `npm run benchmark:ollama` as planned in `docs/testing/Automated Ollama Artifact Benchmark Harness.md`. Use the same quality scorecard for both frontier and local runs. Record: first progress event, first usable preview, total runtime, score, grade, failed signals, and failure classification.

---

## Test Plan

### Phase 1 regression tests
- `bun run typecheck` — must pass after adding optional `knowledgePacks` fields
- `bun test -- prompt-contracts` — update to assert knowledge pack content is present at animLevel ≥ 1
- `bun test -- presentation-runtime-workflow release-smoke` — existing tests must still pass

### Phase 1 manual smoke
- Create a single slide → first draft is visually polished, not skeletal
- Create a 3-slide deck → batch slides share visual language and class vocabulary
- Edit an existing slide → no oscillation, fast QA pass on corrected output

### Phase 2 unit tests
- Presentation run state machine stops after configured repair/polish budget
- Local and frontier plans use the same presentation quality threshold
- Queued prompts include previous-slide continuity context from slide 2 onward
- Repeated card grids fail the correct named quality signal
- Weak title slide fails narrative/visual quality signals
- Model revision output is accepted only if validation passes and quality score does not regress

### Phase 2 integration tests
- Narrative deck create
- Metrics-heavy deck create
- Title/opening slide create
- Queued add-slides edit
- Style-only restyle preserving text

### Benchmark scenarios
- At least one frontier and one Ollama pass for the same presentation cases
- Record first progress, first usable preview, total runtime, score, grade, failed signals, and failure classification
- Log any mismatch between human judgment and deterministic score as a scoring calibration issue

### Manual validation
- Desktop, tablet, mobile portrait, and mobile landscape screenshots
- Compare generated decks against starter/reference quality traits
