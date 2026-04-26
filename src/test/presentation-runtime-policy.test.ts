import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getProviderCapabilityProfile,
  OLLAMA_BASELINE_MODEL,
} from '@/services/ai/providerCapabilities';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), 'src', relativePath), 'utf8');
}

describe('presentation runtime policy', () => {
  it('does not configure internal timeout-driven aborts for Ollama presentation generation', () => {
    const profile = getProviderCapabilityProfile({
      id: 'ollama',
      model: OLLAMA_BASELINE_MODEL,
    });

    expect('editCorrectionTimeoutMs' in profile).toBe(false);

    const presentationSource = readSource('services/ai/workflow/presentation.ts');
    const presentationRuntimeSource = readSource('services/artifactRuntime/presentationRuntime.ts');
    const designerSource = readSource('services/ai/workflow/agents/designer.ts');

    expect(presentationSource).not.toMatch(/streamSoftTimeoutMs|60_000/);
    expect(presentationSource).not.toMatch(/runBatchQueue/);
    expect(presentationSource).not.toMatch(/from '\.\/agents\/designer'/);
    expect(presentationSource).not.toMatch(/from '\.\/agents\/evaluator'/);
    expect(presentationRuntimeSource).toMatch(/runBatchQueue/);
    expect(presentationRuntimeSource).toMatch(/runSinglePresentationRuntime/);
    expect(presentationRuntimeSource).toMatch(/validatePresentationRuntimeOutput/);
    expect(presentationRuntimeSource).toMatch(/repairPresentationRuntimeOutput/);
    expect(designerSource).not.toMatch(/softTimeoutMs|Draft stream soft timeout|Edit correction soft timeout/);
  });

  it('keeps external execution-spec adapters out of active generation paths', () => {
    const activeSources = [
      'services/chat/buildRunRequest.ts',
      'services/chat/submitPrompt.ts',
      'components/chat/handlers/presentationHandler.ts',
      'components/chat/handlers/documentHandler.ts',
      'components/chat/handlers/spreadsheetHandler.ts',
      'services/ai/workflow/presentation.ts',
      'services/ai/workflow/document.ts',
      'services/ai/workflow/spreadsheet.ts',
    ].map(readSource).join('\n');

    expect(activeSources).not.toMatch(/services\/executionSpec|@\/services\/executionSpec/);
    expect(activeSources).not.toMatch(/run\.spec-built|run\.explained/);
    expect(activeSources).not.toMatch(/runRequest\.workflowPlan|workflowPlan:\s*runRequest/);
  });

  it('keeps workflow planner build as a compatibility export for runtime-owned planning', () => {
    const artifactRuntimeBuildSource = readSource('services/artifactRuntime/build.ts');
    const workflowPlannerBuildSource = readSource('services/workflowPlanner/build.ts');

    expect(artifactRuntimeBuildSource).toMatch(/artifactRuntime\/planner/);
    expect(workflowPlannerBuildSource.trim()).toBe("export { buildArtifactWorkflowPlan } from '@/services/artifactRuntime/planner';");
  });
});
