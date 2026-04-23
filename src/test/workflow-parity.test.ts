import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { assertScenario } from '@/test/harness/assertScenario';
import { runWorkflowScenario, type WorkflowScenario } from '@/test/harness/runWorkflowScenario';

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), 'src/test/workflow-scenarios.json'), 'utf8'),
) as { scenarios: WorkflowScenario[] };

describe('workflow parity harness skeleton', () => {
  it('loads the scenario manifest', () => {
    expect(manifest.scenarios.length).toBeGreaterThan(0);
  });

  for (const scenarioId of [
    'presentation-create-from-prompt',
    'document-refine-active-document',
    'spreadsheet-action-flow',
    'presentation-title-slide-tweak',
    'document-explicit-full-rewrite',
    'project-summary-routing',
    'project-refresh-dependencies-routing',
  ]) {
    const scenario = manifest.scenarios.find((entry) => entry.id === scenarioId);

    it(`matches the Phase 1 contract for ${scenarioId}`, async () => {
      expect(scenario).toBeDefined();
      const result = await runWorkflowScenario(scenario!);
      assertScenario(scenario!, result);
    });
  }
});
