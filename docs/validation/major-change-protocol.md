# Major Workflow Change Validation Protocol

This protocol is the default validation gate for **workflow-affecting changes**. It exists to make major changes prove three things before they are treated as complete:

- **Speed** is still acceptable for normal use.
- **Quality** is still acceptable for the requested artifact and workflow.
- **Consistency** is still acceptable across the planned regression families for that artifact type.

Use this protocol for any change that affects:

- generation
- editing
- routing
- prompt composition
- export
- validation or readiness
- lifecycle or policy behavior
- project augmentation
- artifact creation flows
- explain or dry-run behavior

Do not use this protocol as the default gate for shell-only UI polish that does not affect workflow behavior.

## Protocol Inputs

Run the protocol with:

- the active phase or backlog tracker
- `docs/program-status.md`
- the artifact case matrix in [artifact-case-matrix.md](./artifact-case-matrix.md)
- the scorecard in [scorecard-template.md](./scorecard-template.md)
- the registry in `src/test/fixtures/major-change-cases.ts`

Required automated checks before manual logging:

- `npm test`
- `npm run build`
- `npm run lint`
  - currently record as non-gating if blocked by the repo-level ESLint 9 gap

## Required Coverage

For any workflow-affecting change:

- run the full relevant case-family set for each touched artifact type
- rerun shared cross-artifact cases when the change affects:
  - routing
  - explain or dry-run
  - readiness or publish gating
  - lifecycle or policy
  - project augmentation
- run the viewport matrix for changed document or presentation behaviors
- compare at least one result against a previously validated case in the same family to catch drift

Case-family coverage is intentionally broad. A change is not considered fully validated because one create flow worked once.

## Status Rules

Per case result:

- `pass`
  - correct behavior, acceptable speed, acceptable quality
- `pass-with-warning`
  - behavior is correct, but there is a notable slowdown, weaker polish, or minor inconsistency that should be logged
- `blocked`
  - wrong artifact type
  - wrong route
  - unusable output
  - failed edit behavior
  - failed readiness or export behavior
  - stall or regression severe enough to break normal use

Phase or backlog promotion rules:

- A phase may move from `implemented` to `shipped` only when its required case families are logged as passed.
- If even one required case family is still unrun or blocked, the phase stays `implemented`.
- Do not promote anything based on implication or partial spot-checks.

## Speed, Quality, and Consistency Rules

### Speed

Record:

- time to first visible progress
- time to completion
- whether progress feedback stayed visible throughout the long-running step
- stalls
- retries
- cancellations

Default interpretation:

- treat speed as a **warning gate**, not a hard-fail budget, unless the slowdown is clearly severe
- record `pass-with-warning` when the same case is materially slower than the last validated baseline
- treat as `blocked` when the run stalls, needs manual cancellation, or becomes meaningfully unusable

Recommended v1 warning threshold:

- warn when the same case is slower by more than **25%** or by more than **5 seconds** absolute, whichever is more meaningful
- warn when a design or generation step stays alive but does not refresh visible progress for too long, even if total completion time remains acceptable

Recommended v1 blocking threshold:

- block when progress does not appear in a reasonable window for the flow, or the run must be cancelled manually, or completion time is so degraded that the workflow is not usable

Recommended v1 UX acceptance bar:

- a long-running design step may take up to **2 minutes** when the output quality justifies it
- roughly **90 seconds** for generation is acceptable when the workflow keeps communicating progress
- long-running design or generation flows should emit visible progress updates continuously rather than sitting on a frozen percentage or stale status message

### Quality

Check:

- correct artifact type
- correct visible behavior for the case
- acceptable structure and readability
- no obvious degradation in layout or design quality
- no broken export, readiness, explain, or dependency behavior where applicable

### Consistency

Check:

- behavior matches the intended case family
- no route drift
- no wrong-artifact creation
- no surprising variance from previously validated behavior for the same case family

## Logging Rules

For every protocol run, update:

- the active phase or backlog doc
- `docs/program-status.md` if the run changes the current blocker or closes validation debt
- `docs/implementation-plan-multi-agent.md` only when top-level status or gating evidence changes

Each log entry should include:

- date
- agent
- scope
- build result
- test result
- lint result
- exact cases run
- timing notes
- quality findings
- consistency findings
- final result

Do not collapse multiple unrelated outcomes into a single vague note.

## Current Defaults

- This protocol is a **Backlog Phase B extension**, not a new feature phase.
- Fixed fixture prompts and expected outcomes are the consistency baseline.
- Documents and presentations use many edit families, not just create checks.
- Spreadsheets use equivalent families:
  - formula
  - query
  - schema/layout
  - dependency refresh
  - validation/publish
- Performance is always recorded, but correctness and quality remain the primary gate.
