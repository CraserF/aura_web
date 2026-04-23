import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitPrompt } from '@/services/chat/submitPrompt';
import { createDefaultContextSelectionState } from '@/services/context/types';
import { clearRunEvents, listRunEvents } from '@/services/events/eventBus';
import { clearRunOutputBuffers, readRunOutputBuffer } from '@/services/runs/outputBuffer';
import { clearRunRegistry, getRunRecord } from '@/services/runs/registry';
import type { ProjectData, ProjectDocument } from '@/types/project';

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

describe('run dry-run mode', () => {
  beforeEach(() => {
    clearRunEvents();
    clearRunRegistry();
    clearRunOutputBuffers();
  });

  it('returns a non-mutating result and skips handler execution and output buffers', async () => {
    const activeDocument = makeDocument();
    const addDocument = vi.fn();
    const updateDocument = vi.fn();

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
        document: vi.fn(async () => {
          throw new Error('execute handler should not run during dry-run');
        }),
        presentation: vi.fn(async () => {
          throw new Error('execute handler should not run during dry-run');
        }),
        spreadsheet: vi.fn(async () => {
          throw new Error('execute handler should not run during dry-run');
        }),
        project: vi.fn(async () => {
          throw new Error('execute handler should not run during dry-run');
        }),
      },
    );

    expect(result.status).toBe('completed');
    expect(result.outputs.envelope.mode).toBe('dry-run');
    expect(result.outputs.envelope.explain?.predictedChanges[0]?.action).toBe('update');
    expect(addDocument).not.toHaveBeenCalled();
    expect(updateDocument).not.toHaveBeenCalled();
    expect(readRunOutputBuffer(`output-${result.runId}`)).toBeNull();
    expect(getRunRecord(result.runId)?.mode).toBe('dry-run');
    expect(getRunRecord(result.runId)?.outputBufferId).toBeUndefined();
    expect(listRunEvents(result.runId).map((event) => event.type)).toEqual([
      'run.started',
      'run.context-assembled',
      'run.spec-built',
      'run.intent-resolved',
      'run.policy-applied',
      'run.explained',
      'run.completed',
    ]);
  });
});
