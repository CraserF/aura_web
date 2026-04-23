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

  expect(result.runRequest.intent.operation).toBe(scenario.operation);
}
