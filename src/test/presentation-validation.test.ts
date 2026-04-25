import { describe, expect, it } from 'vitest';
import type { ProjectDocument } from '@/types/project';

import { validatePresentationAgainstProfile } from '@/services/validation/presentationValidation';
import { PRESENTATION_MOBILE_FIXTURE } from '@/test/fixtures/workstream-f';

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

  it('surfaces dense card layouts that will be hard to read in mobile framed viewports', () => {
    const result = validatePresentationAgainstProfile({
      document: makePresentation({
        contentHtml: PRESENTATION_MOBILE_FIXTURE,
      }),
    });

    expect(result.warnings.map((issue) => issue.code)).toContain('mobile-stage-density');
  });

  it('does not warn about missing custom font sources when the HTML includes a Google Fonts link', () => {
    const result = validatePresentationAgainstProfile({
      document: makePresentation({
        contentHtml: `
          <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
          <style>
            .slide-wrap { font-family: 'Inter', sans-serif; }
            h1 { font-family: 'Space Grotesk', sans-serif; }
          </style>
          <section data-background-color="#0f172a"><div class="slide-wrap"><h1>Slide</h1></div></section>
        `,
      }),
    });

    expect(result.warnings.map((issue) => issue.code)).not.toContain('google-fonts');
  });

  it('warns on viewport units, tiny source type, and missing reduced-motion handling', () => {
    const result = validatePresentationAgainstProfile({
      document: makePresentation({
        contentHtml: `
          <style>
            .slide-wrap {
              width: 100vw;
              font-size: 14px;
              animation: fadeIn 800ms ease both;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          </style>
          <section data-background-color="#0f172a">
            <div class="slide-wrap"><h1>Slide</h1><p>Readable content</p></div>
          </section>
        `,
      }),
    });

    const warningCodes = result.warnings.map((issue) => issue.code);
    expect(warningCodes).toContain('viewport-unit-layout');
    expect(warningCodes).toContain('tiny-essential-text');
    expect(warningCodes).toContain('reduced-motion');
  });
});
