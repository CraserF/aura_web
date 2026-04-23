# Major Change Validation Scorecard Template

Use this template for every major workflow change validation run.

## Run Header

- Date:
- Agent:
- Scope:
- Related phase or backlog doc:
- Commit or branch:
- Build (`npm run build`):
- Tests (`npm test`):
- Lint (`npm run lint`):

## Case Results

| Case ID | Artifact | Category | Speed | Quality | Consistency | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

Result values:

- `pass`
- `pass-with-warning`
- `blocked`

## Speed Notes

Record for each case where possible:

- time to first visible progress
- time to completion
- stalls
- retries
- cancellations

Interpretation defaults:

- `pass-with-warning`
  - more than 25% slower than the last validated baseline for the same case, or more than 5 seconds slower in a way that is still usable
- `blocked`
  - manual cancellation required
  - no visible progress in a reasonable time
  - workflow becomes meaningfully unusable

## Quality Notes

Check:

- right artifact type
- correct visible behavior for the requested case
- acceptable readability and layout
- no broken readiness, export, explain, or dependency behavior where applicable

## Consistency Notes

Check:

- behavior matches the intended case family
- no route drift
- no wrong-artifact creation
- no surprising variance from prior validated behavior for the same family

## Summary

- Cases run:
- Pass:
- Pass with warning:
- Blocked:
- New blockers:
- Follow-up actions:
- Final result:

## Logging Rule

After filling this scorecard:

- copy the relevant evidence into the active phase or backlog validation log
- update `docs/program-status.md` if the blocker state changed
- update `docs/implementation-plan-multi-agent.md` only if top-level program status or completion gating changed
