import { describe, expect, it, vi, beforeEach } from 'vitest';

import { clearRunEvents, listRunEvents, publishRunEvent } from '@/services/events/eventBus';
import { clearRunRegistry } from '@/services/runs/registry';
import { submitPrompt } from '@/services/chat/submitPrompt';
import { createDefaultContextSelectionState } from '@/services/context/types';
import type { RunResult } from '@/services/contracts/runResult';
import type { ProjectData, ProjectDocument } from '@/types/project';

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

function makeProject(documents: ProjectDocument[] = []): ProjectData {
  return {
    id: 'project-1',
    title: 'Project',
    visibility: 'private',
    documents,
    activeDocumentId: documents[0]?.id ?? null,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('run events', () => {
  beforeEach(() => {
    clearRunEvents();
    clearRunRegistry();
  });

  it('dedupes duplicate fingerprints in memory', () => {
    const first = publishRunEvent({
      type: 'run.started',
      runId: 'run-1',
      source: 'test',
      payload: { step: 'a' },
    });
    const second = publishRunEvent({
      type: 'run.started',
      runId: 'run-1',
      source: 'test',
      payload: { step: 'a' },
    });

    expect(first.id).toBe(second.id);
    expect(listRunEvents()).toHaveLength(1);
  });

  it('emits stable event order for a successful project run', async () => {
    const activeDocument = makeDocument();
    const addMessage = vi.fn();
    const setStatus = vi.fn();
    const setStreamingContent = vi.fn();

    const result = await submitPrompt(
      {
        prompt: 'Summarize the project into one overview',
        attachments: [],
        messages: [],
        project: makeProject([
          activeDocument,
          makeDocument({ id: 'sheet-1', type: 'spreadsheet', contentHtml: '', workbook: {
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
          } }),
        ]),
        activeDocument,
        showAllMessages: false,
        applyToAllDocuments: false,
        selectionState: createDefaultContextSelectionState(),
        providerConfig: { id: 'openai', name: 'OpenAI', apiKey: 'test-key' },
        documentStylePreset: 'auto',
        allowClarification: false,
      },
      {
        workflowStepsRef: { current: [] },
        abortControllerRef: { current: null },
        addMessage,
        addDocument: vi.fn(),
        updateDocument: vi.fn(),
        setStatus,
        setStreamingContent,
        appendStreamingContent: vi.fn(),
        setSlides: vi.fn(),
        setTitle: vi.fn(),
        updateStepStatus: vi.fn(),
        queueMemoryExtraction: vi.fn(async () => {}),
        buildWorkflowMemoryContext: vi.fn(async () => ({
          text: '',
          tokenCount: 0,
          budgetExceeded: false,
          trimmedMemories: [],
          items: [],
        })),
      },
      {
        document: vi.fn(),
        presentation: vi.fn(),
        spreadsheet: vi.fn(),
        project: vi.fn(async ({ runRequest }): Promise<RunResult> => ({
          runId: runRequest.runId,
          status: 'completed',
          intent: runRequest.intent,
          outputs: {
            envelope: {
              artifactType: 'project',
              mode: runRequest.mode,
              targetSummary: ['summarize-project'],
              changedTargets: [{ documentId: 'doc-1', action: 'updated' }],
              validation: { passed: true, summary: 'ok' },
              project: {
                artifactType: 'project',
                project: {
                  operation: 'summarize-project',
                  updatedDocumentIds: ['doc-1'],
                  dependencyChanges: [],
                },
              },
            },
            project: {
              operation: 'summarize-project',
              updatedDocumentIds: ['doc-1'],
              dependencyChanges: [],
            },
          },
          assistantMessage: { content: 'done' },
          validation: { passed: true, summary: 'ok' },
          warnings: [],
          changedTargets: [{ documentId: 'doc-1', action: 'updated' }],
          structuredStatus: { title: 'Done', detail: 'Done' },
        })),
      },
    );

    expect(result.status).toBe('completed');
    expect(listRunEvents(result.runId).map((event) => event.type)).toEqual([
      'run.started',
      'run.context-assembled',
      'run.plan-built',
      'run.intent-resolved',
      'run.generating',
      'run.completed',
    ]);
  });
});
