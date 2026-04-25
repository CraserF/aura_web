import { describe, expect, it } from 'vitest';

import { listReferenceStylePacks } from '@/services/ai/templates';
import { WORKFLOW_BENCHMARK_CASES } from '@/test/fixtures/workflow-benchmark-cases';

const FORBIDDEN_REFERENCE_PATTERNS = [
  /https?:\/\//i,
  /mailto:/i,
  /presented by/i,
  /\b20\d{2}\b/,
  /[$€£]\s?\d/,
];

describe('reference style packs', () => {
  it('provides confidentiality guidance for every sanitized style pack', () => {
    for (const pack of listReferenceStylePacks()) {
      expect(pack.confidentialityRules.length).toBeGreaterThan(0);
      expect(pack.syntheticExample.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps sanitized style examples free from obvious confidential markers or external assets', () => {
    for (const pack of listReferenceStylePacks()) {
      for (const pattern of FORBIDDEN_REFERENCE_PATTERNS) {
        expect(pack.syntheticExample).not.toMatch(pattern);
      }
    }
  });

  it('keeps benchmark fixtures synthetic and free of direct reference-leak markers', () => {
    for (const benchmark of WORKFLOW_BENCHMARK_CASES) {
      for (const pattern of FORBIDDEN_REFERENCE_PATTERNS) {
        expect(benchmark.fixturePrompt).not.toMatch(pattern);
        expect(benchmark.expectedFocus).not.toMatch(pattern);
      }
    }
  });
});
