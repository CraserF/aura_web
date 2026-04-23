import type { ProjectData, ProjectDocument } from '@/types/project';

import { createValidationIssue } from '@/services/validation/profiles';
import type { ValidationIssue } from '@/services/validation/types';

function makeSampleProject(document: ProjectDocument): ProjectData {
  return {
    id: 'clean-env-project',
    title: 'Clean Env Project',
    visibility: 'private',
    documents: [document],
    activeDocumentId: document.id,
    chatHistory: [],
    media: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };
}

export async function runCleanEnvironmentChecks(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  try {
    const pdf = await import('@/services/export/pdf');
    const prepared = pdf.prepareDocumentPdfMarkup('<div class="doc-shell"><h1>Smoke</h1><p>Ready</p></div>', 'Smoke');
    if (!prepared.documentMarkup.includes('aura-pdf-page')) {
      issues.push(createValidationIssue('blocking', 'clean-env-pdf-markup', 'PDF export helpers failed to produce shared export markup.', {
        source: 'clean-env',
      }));
    }
  } catch (error) {
    issues.push(createValidationIssue('blocking', 'clean-env-load-failed', `PDF export runtime failed to load: ${error instanceof Error ? error.message : 'unknown error'}`, {
      source: 'clean-env',
    }));
  }

  try {
    const docx = await import('@/services/export/docx');
    if (typeof docx.exportDocumentDocx !== 'function') {
      issues.push(createValidationIssue('blocking', 'clean-env-docx-missing', 'DOCX export runtime did not expose the expected export function.', {
        source: 'clean-env',
      }));
    }
  } catch (error) {
    issues.push(createValidationIssue('blocking', 'clean-env-load-failed', `DOCX export runtime failed to load: ${error instanceof Error ? error.message : 'unknown error'}`, {
      source: 'clean-env',
    }));
  }

  try {
    const [documentHtml, presentationHtml, emailHtml] = await Promise.all([
      import('@/services/export/documentHtml'),
      import('@/services/export/presentationHtml'),
      import('@/services/export/emailHtml'),
    ]);
    const document: ProjectDocument = {
      id: 'doc-clean',
      title: 'Smoke Document',
      type: 'document',
      contentHtml: '<div class="doc-shell"><h1>Smoke</h1><p>Ready</p></div>',
      sourceMarkdown: '# Smoke',
      themeCss: '',
      slideCount: 0,
      chartSpecs: {},
      order: 0,
      createdAt: 1,
      updatedAt: 1,
    };
    const presentation: ProjectDocument = {
      id: 'deck-clean',
      title: 'Smoke Deck',
      type: 'presentation',
      contentHtml: '<section data-background-color="#0f172a"><h1>Smoke</h1></section>',
      themeCss: '',
      slideCount: 1,
      chartSpecs: {},
      order: 1,
      createdAt: 1,
      updatedAt: 1,
    };
    const docProject = makeSampleProject(document);
    const deckProject = {
      ...makeSampleProject(presentation),
      documents: [presentation],
      activeDocumentId: presentation.id,
    };

    await documentHtml.exportDocumentStandaloneHtml({ project: docProject, document });
    await emailHtml.exportDocumentEmailHtml({ project: docProject, document });
    await presentationHtml.exportPresentationStandaloneHtml({ project: deckProject, document: presentation });
  } catch (error) {
    issues.push(createValidationIssue('blocking', 'clean-env-load-failed', `Standalone export helpers failed to run: ${error instanceof Error ? error.message : 'unknown error'}`, {
      source: 'clean-env',
    }));
  }

  try {
    const data = await import('@/services/data');
    if (typeof data.describeTable !== 'function' || typeof data.aggregateQuery !== 'function') {
      issues.push(createValidationIssue('warning', 'clean-env-data-runtime', 'Spreadsheet data runtime did not expose the expected query helpers.', {
        source: 'clean-env',
      }));
    }
  } catch (error) {
    issues.push(createValidationIssue('warning', 'clean-env-load-failed', `Spreadsheet data runtime failed to load: ${error instanceof Error ? error.message : 'unknown error'}`, {
      source: 'clean-env',
    }));
  }

  return issues;
}
