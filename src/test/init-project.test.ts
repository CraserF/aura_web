import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/ai/templates', () => ({
  TEMPLATE_REGISTRY: {
    corporate: {
      id: 'corporate',
      htmlPath: './html/corporate.html',
      animationLevel: 2,
      description: 'Corporate starter deck',
      bestFor: ['briefing'],
      slideCount: { min: 8, max: 15 },
    },
    'pitch-deck': {
      id: 'pitch-deck',
      htmlPath: './html/pitch-deck.html',
      animationLevel: 3,
      description: 'Pitch deck starter',
      bestFor: ['launch'],
      slideCount: { min: 10, max: 15 },
    },
  },
  getTemplateHtml: vi.fn(async (id: string) => `
    <html>
      <head><style>.reveal { color: #111; }</style></head>
      <body>
        <div class="reveal">
          <div class="slides">
            <section><h1>${id}</h1><p>Starter slide</p></section>
          </div>
        </div>
      </body>
    </html>
  `),
  resolveTemplatePlan: vi.fn(() => ({
    templateId: 'executive-briefing-light',
    exemplarPackId: 'executive-briefing-light',
  })),
  resolveReferenceQualityProfileId: vi.fn(({ artifactType }: { artifactType: string }) =>
    artifactType === 'presentation'
      ? 'presentation-executive-starter'
      : artifactType === 'document'
        ? 'document-professional-light'
        : undefined),
  summarizeReferenceQualityProfileForScoring: vi.fn(() => 'mock reference rhythm and density traits'),
  formatReferenceQualityProfileForPrompt: vi.fn(() => 'mock reference quality target'),
}));

vi.mock('@/services/spreadsheet/workbook', async () => {
  const actual = await vi.importActual<typeof import('@/services/spreadsheet/workbook')>('@/services/spreadsheet/workbook');
  return {
    ...actual,
    replaceSheetData: vi.fn(async (_sheet, schema) => schema),
  };
});

import { createBlankProject } from '@/services/bootstrap/projectStarter';
import { initProject } from '@/services/bootstrap/initProject';
import { listProjectStarterKits } from '@/services/bootstrap/starterKits';

describe('initProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the expected artifact set for each shipped starter kit', async () => {
    for (const kit of listProjectStarterKits()) {
      const base = createBlankProject();
      const { project, report } = await initProject(base, { starterKitId: kit.id });

      expect(project.documents).toHaveLength(kit.artifacts.length);
      expect(report.createdCount).toBeGreaterThanOrEqual(kit.artifacts.length);
      expect(project.activeDocumentId).toBe(project.documents[0]?.id ?? null);
    }
  });

  it('reruns idempotently without duplicating artifacts or overwriting user edits', async () => {
    const base = createBlankProject();
    const firstPass = await initProject(base, { starterKitId: 'research-pack' });
    const summaryDoc = firstPass.project.documents.find((document) => document.type === 'document');
    expect(summaryDoc).toBeDefined();

    const editedProject = {
      ...firstPass.project,
      projectRules: {
        markdown: '# Custom user rules',
        updatedAt: 22,
      },
      documents: firstPass.project.documents.map((document) =>
        document.id === summaryDoc?.id
          ? {
              ...document,
              title: 'User Edited Summary',
              contentHtml: '<article><h1>User Edited Summary</h1><p>Keep this content.</p></article>',
            }
          : document),
    };

    const secondPass = await initProject(editedProject, { starterKitId: 'research-pack' });
    const secondSummary = secondPass.project.documents.find((document) => document.id === summaryDoc?.id);

    expect(secondPass.project.documents).toHaveLength(firstPass.project.documents.length);
    expect(secondSummary?.title).toBe('User Edited Summary');
    expect(secondSummary?.contentHtml).toContain('Keep this content.');
    expect(secondPass.project.projectRules?.markdown).toBe('# Custom user rules');
    expect(secondPass.report.createdCount).toBe(0);
    expect(secondPass.report.skippedCount).toBeGreaterThan(0);
  });
});
