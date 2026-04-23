import { expect } from 'vitest';

import type { WorkflowScenario } from '@/test/harness/runWorkflowScenario';

export function assertScenario(
  scenario: WorkflowScenario,
  result: Awaited<ReturnType<typeof import('@/test/harness/runWorkflowScenario').runWorkflowScenario>>,
): void {
  expect(result.runRequest.intent.artifactType).toBe(scenario.expects.route);

  if (scenario.expects.usesActiveArtifactType) {
    expect(result.runRequest.intent.reason).toContain('authoritative');
  }

  if (scenario.expects.requiresActiveWorkbook) {
    expect(result.runRequest.context.artifact.activeWorkbook).not.toBeNull();
  }

  if (scenario.expects.targetSelectorType) {
    expect(result.runRequest.intent.targetSelectors[0]?.type).toBe(scenario.expects.targetSelectorType);
  }

  if (scenario.expects.editStrategyHint) {
    expect(result.runRequest.intent.editStrategyHint).toBe(scenario.expects.editStrategyHint);
  }

  if (scenario.expects.allowFullRegeneration !== undefined) {
    expect(result.runRequest.intent.allowFullRegeneration).toBe(scenario.expects.allowFullRegeneration);
  }

  expect(result.runRequest.intent.operation).toBe(scenario.operation);
}
