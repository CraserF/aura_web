# Ollama Validation Scorecard Template

Use this template for local Ollama baseline runs.

## Run Header

- Date:
- Agent:
- Scope:
- Related phase or backlog doc:
- Provider: `ollama`
- Model:
- Build (`npm run build`):
- Tests (`npm test`):
- Lint (`npm run lint`):

## Case Results

| Case ID | Artifact | Scenario | First Progress | Completion | Quality | Consistency | Failure Classification | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | |

Result values:

- `pass`
- `pass-with-warning`
- `blocked`

Failure classification values:

- `routing-bug`
- `workflow-bug`
- `provider-capability-mismatch`
- `model-quality-limitation`
- `prompt-tuning-issue`

## Quality Notes

Check:

- right artifact type
- coherent content structure
- visually acceptable layout
- quality score, grade, and failed quality signals make sense where runtime telemetry is present
- no broken readiness or export behavior where applicable
- no broken legacy explain/dry-run behavior only when the changed seam explicitly touches it

## Consistency Notes

Check:

- same case family behaves similarly across reruns
- no wrong-artifact creation
- no route drift
- no local-only regression that cloud baselines do not show

## Summary

- Cases run:
- Pass:
- Pass with warning:
- Blocked:
- New blockers:
- Follow-up actions:
- Final result:
