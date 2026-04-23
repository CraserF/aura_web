import { describe, expect, it } from 'vitest';
import type { ProjectDocument } from '@/types/project';

import { validatePresentationAgainstProfile } from '@/services/validation/presentationValidation';

function makePresentation(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'deck-1',
    title: 'Deck',
    type: 'presentation',
    contentHtml: '<style>.slides{color:white;}</style><section data-background-color="#0f172a"><h1>Slide</h1></section>',
    themeCss: '',
    slideCount: 1,
    chartSpecs: {},
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('presentation validation', () => {
  it('maps presentation QA blocking issues into the shared validation result shape', () => {
    const result = validatePresentationAgainstProfile({
      document: makePresentation({
        contentHtml: '<div>No slides</div>',
      }),
    });

    expect(result.passed).toBe(false);
    expect(result.blockingIssues.map((issue) => issue.code)).toContain('structure');
  });

  it('promotes style-block warnings for publish-ready exports', () => {
    const result = validatePresentationAgainstProfile({
      document: makePresentation({
        contentHtml: '<section data-background-color="#0f172a"><h1>Slide</h1></section>',
      }),
      profileId: 'publish-ready',
    });

    expect(result.blockingIssues.map((issue) => issue.code)).toContain('style-block');
  });
});
