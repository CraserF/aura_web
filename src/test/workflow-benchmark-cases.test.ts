import { describe, expect, it } from 'vitest';

import { WORKFLOW_BENCHMARK_CASES } from '@/test/fixtures/workflow-benchmark-cases';

describe('workflow benchmark cases', () => {
  it('keeps a benchmark loop across all productivity artifact types', () => {
    const artifactTypes = new Set(WORKFLOW_BENCHMARK_CASES.map((benchmark) => benchmark.artifactType));
    expect(artifactTypes.has('document')).toBe(true);
    expect(artifactTypes.has('presentation')).toBe(true);
    expect(artifactTypes.has('spreadsheet')).toBe(true);
  });

  it('covers the key create/edit/rewrite/validation benchmark families', () => {
    const families = new Set(WORKFLOW_BENCHMARK_CASES.map((benchmark) => benchmark.caseFamily));

    expect(families.has('create')).toBe(true);
    expect(families.has('style-theme')).toBe(true);
    expect(families.has('structural-rewrite')).toBe(true);
    expect(families.has('queued-work')).toBe(true);
    expect(families.has('validation-export')).toBe(true);
    expect(families.has('explain-dry-run')).toBe(true);
  });
});
