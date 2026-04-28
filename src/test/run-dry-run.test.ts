import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitPrompt } from '@/services/chat/submitPrompt';
import { createDefaultContextSelectionState } from '@/services/context/types';
import { clearRunEvents, listRunEvents } from '@/services/events/eventBus';
import { clearRunOutputBuffers, readRunOutputBuffer } from '@/services/runs/outputBuffer';
import { clearRunRegistry, getRunRecord } from '@/services/runs/registry';
import type { ProjectData, ProjectDocument } from '@/types/project';
import type { DocumentHandlerContext } from '@/components/chat/handlers/documentHandler';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Working Draft',
    type: 'document',
    contentHtml: '<article><h1>Working Draft</h1><p>Body</p></article>',
    sourceMarkdown: '# Working Draft',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    lifecycleState: 'draft',
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeProject(documents: ProjectDocument[]): ProjectData {
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

describe('request mode normalization', () => {
  beforeEach(() => {
    clearRunEvents();
    clearRunRegistry();
    clearRunOutputBuffers();
  });

  it('is normalized into the internal execute runtime path', async () => {
    const activeDocument = makeDocument();
    const addDocument = vi.fn();
    const updateDocument = vi.fn();
    const documentHandler = vi.fn(async (context: DocumentHandlerContext) => ({
      runId: context.runRequest.runId,
      status: 'completed' as const,
      intent: context.runRequest.intent,
      outputs: {
        envelope: {
          artifactType: 'document' as const,
          mode: 'execute' as const,
          targetSummary: ['Working Draft'],
          changedTargets: [{ documentId: 'doc-1', action: 'updated' as const }],
          validation: { passed: true, summary: 'ok' },
          runtimePlan: context.runRequest.artifactRunPlan,
          document: {
            artifactType: 'document' as const,
            title: 'Working Draft',
          },
        },
        title: 'Working Draft',
      },
      assistantMessage: { content: 'Updated.' },
      validation: { passed: true, summary: 'ok' },
      warnings: [],
      changedTargets: [{ documentId: 'doc-1', action: 'updated' as const }],
      structuredStatus: { title: 'Done', detail: 'Updated.' },
    }));

    const result = await submitPrompt(
      {
        prompt: 'Tighten this into a one-page summary',
        attachments: [],
        messages: [],
        project: makeProject([activeDocument]),
        activeDocument,
        showAllMessages: false,
        applyToAllDocuments: false,
        selectionState: createDefaultContextSelectionState(),
        providerConfig: { id: 'openai', name: 'OpenAI', apiKey: 'test-key', model: 'gpt-4.1' },
        documentStylePreset: 'auto',
        allowClarification: false,
        mode: 'dry-run',
      },
      {
        workflowStepsRef: { current: [] },
        abortControllerRef: { current: null },
        addMessage: vi.fn(),
        addDocument,
        updateDocument,
        setStatus: vi.fn(),
        setStreamingContent: vi.fn(),
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
        document: documentHandler,
        presentation: vi.fn(async () => {
          throw new Error('presentation handler should not run');
        }),
        spreadsheet: vi.fn(async () => {
          throw new Error('spreadsheet handler should not run');
        }),
        project: vi.fn(async () => {
          throw new Error('project handler should not run');
        }),
      },
    );

    expect(result.status).toBe('completed');
    expect(result.outputs.envelope.mode).toBe('execute');
    expect(documentHandler).toHaveBeenCalledTimes(1);
    expect(addDocument).not.toHaveBeenCalled();
    expect(updateDocument).not.toHaveBeenCalled();
    expect(readRunOutputBuffer(`output-${result.runId}`)?.summary).toContain('Updated.');
    expect(getRunRecord(result.runId)?.mode).toBe('execute');
    expect(getRunRecord(result.runId)?.outputBufferId).toBe(`output-${result.runId}`);
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
