import { describe, expect, it } from 'vitest';
import { buildSubmitFinalSlideReview } from '@/services/ai/workflow/agents/designer';
import type { QAResult } from '@/services/ai/workflow/agents/qa-validator';

describe('designer submitFinalSlide review', () => {
  it('soft-accepts blocking issues and delegates final repair to runtime', () => {
    const review = buildSubmitFinalSlideReview({
      passed: false,
      blockingCount: 1,
      advisoryCount: 0,
      violations: [
        {
          slide: 1,
          rule: 'background-color',
          tier: 'blocking',
          severity: 'error',
          detail: 'Missing data-background-color attribute.',
        },
      ],
    } satisfies QAResult);

    expect(review).toEqual({
      accepted: true,
      warnings: ['[background-color] slide 1: Missing data-background-color attribute.'],
      guidance: 'Runtime deterministic repair will handle remaining blocking issues before finalization.',
    });
  });
});
