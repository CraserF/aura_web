import { describe, expect, it } from 'vitest';

import { resolveIntent } from '@/services/ai/intent/resolveIntent';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeProject(documents: ProjectDocument[] = []): ProjectData {
  return {
    id: 'project-1',
    title: 'Test Project',
    visibility: 'private',
    documents,
    activeDocumentId: documents[0]?.id ?? null,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };
}

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Doc',
    type: 'document',
    contentHtml: '<p>Draft</p>',
    sourceMarkdown: '# Draft',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('resolveIntent', () => {
  it('uses the active artifact type as the authoritative route for edit-style prompts', () => {
    const activeDocument = makeDocument({ type: 'presentation' });

    const result = resolveIntent({
      prompt: 'Make this presentation more concise',
      activeDocument,
      project: makeProject([activeDocument]),
      scope: 'document',
    });

    expect(result.artifactType).toBe('presentation');
    expect(result.operation).toBe('edit');
    expect(result.reason).toContain('authoritative');
    expect(result.targetSelectors[0]?.type).toBe('current-slide');
    expect(result.allowFullRegeneration).toBe(false);
  });

  it('lets explicit cross-artifact create prompts escape the active artifact route', () => {
    const activeDocument = makeDocument({ type: 'presentation' });

    const result = resolveIntent({
      prompt: 'Create a long-form document called Operating Model Review',
      activeDocument,
      project: makeProject([activeDocument]),
      scope: 'document',
    });

    expect(result.artifactType).toBe('document');
    expect(result.operation).toBe('create');
    expect(result.targetDocumentId).toBeUndefined();
    expect(result.targetSelectors).toEqual([]);
    expect(result.reason).toContain('explicit create prompt');
  });

  it('falls back to prompt-based workflow detection when no artifact is active', () => {
    const result = resolveIntent({
      prompt: 'Write a quarterly report',
      activeDocument: null,
      project: makeProject(),
      scope: 'project',
    });

    expect(result.artifactType).toBe('document');
    expect(result.operation).toBe('create');
    expect(result.reason).toContain('fallback');
    expect(result.targetSelectors).toEqual([]);
  });

  it('marks ambiguous presentation create prompts as requiring clarification', () => {
    const result = resolveIntent({
      prompt: 'AI strategy',
      activeDocument: null,
      project: makeProject(),
      scope: 'project',
    });

    expect(result.artifactType).toBe('presentation');
    expect(result.needsClarification).toBe(true);
    expect(result.clarification?.question).toContain('Quick question');
    expect(result.clarification?.options.length).toBeGreaterThan(0);
  });

  it('detects spreadsheet action prompts on an active workbook', () => {
    const activeDocument = makeDocument({
      type: 'spreadsheet',
      workbook: {
        activeSheetIndex: 0,
        sheets: [{
          id: 'sheet-1',
          name: 'Sheet 1',
          tableName: 'table_1',
          schema: [{ name: 'Amount', type: 'number', nullable: false }],
          frozenRows: 0,
          frozenCols: 0,
          columnWidths: {},
          formulas: [],
        }],
      },
    });

    const result = resolveIntent({
      prompt: 'Sort by Amount descending',
      activeDocument,
      project: makeProject([activeDocument]),
      scope: 'document',
    });

    expect(result.artifactType).toBe('spreadsheet');
    expect(result.operation).toBe('action');
    expect(result.targetSheetId).toBe('sheet-1');
    expect(result.editStrategyHint).toBe('sheet-action');
    expect(result.targetSelectors[0]?.type).toBe('sort-state');
  });

  it('allows full regeneration only for explicit rewrite requests', () => {
    const activeDocument = makeDocument({
      contentHtml: '<section><h2>Overview</h2><p>Draft.</p></section>',
    });

    const result = resolveIntent({
      prompt: 'Rewrite this document from scratch in a more persuasive tone',
      activeDocument,
      project: makeProject([activeDocument]),
      scope: 'document',
    });

    expect(result.allowFullRegeneration).toBe(true);
    expect(result.editStrategyHint).toBe('full-regenerate');
  });

  it('asks for clarification when a specific document section maps to multiple targets', () => {
    const activeDocument = makeDocument({
      contentHtml: '<section><h2>Overview</h2><p>Alpha</p></section><section><h2>Overview</h2><p>Beta</p></section>',
    });

    const result = resolveIntent({
      prompt: 'Revise the section "Overview"',
      activeDocument,
      project: makeProject([activeDocument]),
      scope: 'document',
    });

    expect(result.needsClarification).toBe(true);
    expect(result.clarification?.question).toContain('which target');
    expect(result.clarification?.options.length).toBeGreaterThan(1);
  });

  it('routes explicit project-wide prompts to the project workflow', () => {
    const documents = [
      makeDocument({ id: 'doc-1', type: 'document' }),
      makeDocument({ id: 'doc-2', type: 'presentation', contentHtml: '<section>Deck</section>', slideCount: 1 }),
      makeDocument({
        id: 'doc-3',
        type: 'spreadsheet',
        workbook: {
          activeSheetIndex: 0,
          sheets: [{
            id: 'sheet-1',
            name: 'Data',
            tableName: 'table_1',
            schema: [{ name: 'Amount', type: 'number', nullable: false }],
            frozenRows: 0,
            frozenCols: 0,
            columnWidths: {},
            formulas: [],
          }],
        },
      }),
    ];

    const result = resolveIntent({
      prompt: 'Summarize the project into one overview',
      activeDocument: null,
      project: makeProject(documents),
      scope: 'project',
    });

    expect(result.projectOperation).toBe('summarize-project');
    expect(result.scope).toBe('project');
    expect(result.targetDocumentIds).toEqual(['doc-1', 'doc-2', 'doc-3']);
    expect(result.targetSelectors).toEqual([]);
  });
});
