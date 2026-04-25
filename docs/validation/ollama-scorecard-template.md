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
- no broken readiness, export, explain, or dry-run behavior where applicable

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
