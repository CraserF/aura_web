import { describe, expect, it } from 'vitest';

import { evaluatePolicy } from '@/services/policy/engine';

describe('policy engine', () => {
  it('maps deterministic conditions to orchestration actions', () => {
    const result = evaluatePolicy({
      checkpoint: 'after-validation',
      conditions: ['validation-blocked', 'dependency-broken'],
    });

    expect(result.actions).toContain('block-publish');
    expect(result.actions).toContain('mark-stale');
    expect(result.actions).toContain('recommend-doctor');
  });

  it('dedupes repeated actions across multiple conditions', () => {
    const result = evaluatePolicy({
      checkpoint: 'after-context-assembly',
      conditions: ['context-budget-exceeded', 'context-budget-exceeded'],
    });

    expect(result.actions).toEqual(['compact-context']);
  });
});
