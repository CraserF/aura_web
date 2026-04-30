import { describe, expect, it } from 'vitest';

import {
  VALUE_REALIGNMENT_RELEASE_GATES,
  summarizeReleaseGateDefinitions,
  type ReleaseValidationLevel,
} from '@/services/validation/releaseGates';

describe('value realignment release gates', () => {
  it('covers all five W9 validation levels', () => {
    const levels = new Set(VALUE_REALIGNMENT_RELEASE_GATES.map((gate) => gate.level));
    const expected: ReleaseValidationLevel[] = [1, 2, 3, 4, 5];

    for (const level of expected) {
      expect(levels.has(level), `missing validation level ${level}`).toBe(true);
    }
  });

  it('keeps every blocking gate tied to concrete evidence', () => {
    for (const gate of VALUE_REALIGNMENT_RELEASE_GATES) {
      if (!gate.blocksRelease) continue;
      expect(gate.requiredEvidence.length, `${gate.id} has no required evidence`).toBeGreaterThan(0);
      expect(gate.purpose.trim().length, `${gate.id} has no purpose`).toBeGreaterThan(0);
    }
  });

  it('requires commands for automated and hybrid gates', () => {
    for (const gate of VALUE_REALIGNMENT_RELEASE_GATES) {
      if (gate.mode === 'manual') continue;
      expect(gate.commands.length, `${gate.id} has no command`).toBeGreaterThan(0);
    }
  });

  it('keeps manual product-quality evidence explicit', () => {
    const summary = summarizeReleaseGateDefinitions();

    expect(summary.manualEvidence).toEqual(expect.arrayContaining([
      expect.stringContaining('frontier single-slide'),
      expect.stringContaining('frontier queued-deck'),
      expect.stringContaining('Ollama queued-deck'),
      expect.stringContaining('viewport captures'),
    ]));
  });

  it('surfaces the automated commands needed for the release checklist', () => {
    const summary = summarizeReleaseGateDefinitions();

    expect(summary.levelsCovered).toEqual([1, 2, 3, 4, 5]);
    expect(summary.automatedCommands).toEqual(expect.arrayContaining([
      expect.stringContaining('scaffolding-guardrails.test.ts'),
      expect.stringContaining('release-smoke.test.ts'),
      expect.stringContaining('presentation-template-design-system.test.ts'),
      'npm run typecheck:benchmark',
      'npm run benchmark:ollama',
    ]));
    expect(summary.blockingGateCount).toBe(VALUE_REALIGNMENT_RELEASE_GATES.length);
  });
});
