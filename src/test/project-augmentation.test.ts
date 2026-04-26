import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/storage/versionHistory', () => ({
  commitVersion: vi.fn(async () => 'hash'),
}));

import { handleProjectWorkflow } from '@/services/ai/workflow/project';
import { buildArtifactRunPlan } from '@/services/artifactRuntime';
import { clearRunEvents, listRunEvents } from '@/services/events/eventBus';
import { useProjectStore } from '@/stores/projectStore';
import type { RunRequest } from '@/services/runs/types';
import type { ProjectData, ProjectDocument } from '@/types/project';

function makeDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Doc',
    type: 'document',
    contentHtml: '<article><h1>Draft</h1><p>Body</p></article>',
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

function makeRunRequest(
  project: ProjectData,
  overrides: Partial<RunRequest> & {
    intent: RunRequest['intent'];
    runId: string;
  },
): RunRequest {
  const artifactRunPlan = overrides.artifactRunPlan ?? buildArtifactRunPlan({
    runId: overrides.runId,
    prompt: overrides.context?.conversation.prompt ?? 'Project workflow',
    artifactType: overrides.intent.artifactType,
    operation: overrides.intent.operation,
    activeDocument: overrides.activeArtifacts?.activeDocument ?? null,
    mode: overrides.mode ?? 'execute',
    providerId: overrides.providerConfig?.id ?? 'openai',
    providerModel: overrides.providerConfig?.model,
    editStrategyHint: overrides.intent.editStrategyHint,
    allowFullRegeneration: overrides.intent.allowFullRegeneration,
  });

  return {
    runId: overrides.runId,
    intent: overrides.intent,
    context: overrides.context ?? {
      conversation: {
        prompt: 'Project workflow',
        promptWithContext: 'Project workflow',
        chatHistory: [],
      },
      attachments: {
        files: [],
        textContext: '',
        imageParts: [],
      },
      artifact: {
        activeDocument: null,
        activeWorkbook: null,
        relatedDocuments: [],
      },
      memory: { text: '' },
      data: {
        projectId: project.id,
        projectDocumentCount: project.documents.length,
      },
      metrics: {
        promptChars: 0,
        promptWithContextChars: 0,
        chatHistoryChars: 0,
        memoryContextChars: 0,
        artifactContextChars: 0,
        attachmentContextChars: 0,
        estimatedTotalTokens: 0,
      },
      sources: [],
      compaction: {
        applied: false,
        beforeTokens: 0,
        afterTokens: 0,
        strategy: 'none',
        compactedSourceIds: [],
      },
    },
    providerConfig: overrides.providerConfig ?? { id: 'openai', name: 'OpenAI', apiKey: 'test' },
    activeArtifacts: overrides.activeArtifacts ?? { activeDocument: null },
    projectRulesSnapshot: overrides.projectRulesSnapshot ?? {
      markdown: '',
      promptBlock: '',
      contextPolicy: {
        version: 1,
        includeProjectChat: true,
        includeMemory: true,
        includeAttachments: true,
        includeRelatedDocuments: true,
        maxChatMessages: 12,
        maxMemoryTokens: 1200,
        maxRelatedDocuments: 6,
        maxAttachmentChars: 12000,
        artifactOverrides: {},
      },
      diagnostics: [],
    },
    projectSnapshot: overrides.projectSnapshot ?? {
      documentIds: project.documents.map((document) => document.id),
      activeDocumentId: project.activeDocumentId,
      linkedReferenceCount: project.documents.reduce(
        (total, document) => total + (document.linkedTableRefs?.length ?? 0),
        0,
      ),
      artifactCountsByType: project.documents.reduce(
        (counts, document) => {
          counts[document.type] += 1;
          return counts;
        },
        { document: 0, presentation: 0, spreadsheet: 0 },
      ),
    },
    artifactRunPlan,
    mode: overrides.mode ?? 'execute',
    createdAt: overrides.createdAt ?? 1,
  };
}

describe('project augmentation workflow', () => {
  beforeEach(() => {
    clearRunEvents();
    useProjectStore.getState().reset();
  });

  it('creates a stable managed summary document and updates it on rerun without duplication', async () => {
    const project = makeProject([
      makeDocument({ id: 'doc-main', title: 'Main Brief', updatedAt: 10 }),
      makeDocument({
        id: 'sheet-doc',
        title: 'Data',
        type: 'spreadsheet',
        contentHtml: '',
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
      }),
    ]);

    useProjectStore.getState().setProject(project);

    const baseContext = {
      addDocument: useProjectStore.getState().addDocument,
      updateDocument: useProjectStore.getState().updateDocument,
      setStatus: () => {},
      setStreamingContent: () => {},
    };

    const first = await handleProjectWorkflow({
      ...baseContext,
      project,
      runRequest: makeRunRequest(project, {
        runId: 'run-1',
        intent: {
          artifactType: 'document',
          operation: 'create',
          scope: 'project',
          projectOperation: 'summarize-project',
          targetDocumentIds: ['doc-main', 'sheet-doc'],
          targetSelectors: [],
          allowFullRegeneration: false,
          confidence: 0.9,
          needsClarification: false,
          reason: 'project wide',
        },
        context: {
          conversation: {
            prompt: 'Summarize the project',
            promptWithContext: 'Summarize the project',
            chatHistory: [],
          },
          attachments: { files: [], textContext: '', imageParts: [] },
          artifact: { activeDocument: null, activeWorkbook: null, relatedDocuments: [] },
          memory: { text: '' },
          data: { projectId: 'project-1', projectDocumentCount: 2 },
          metrics: {
            promptChars: 10,
            promptWithContextChars: 10,
            chatHistoryChars: 0,
            memoryContextChars: 0,
            artifactContextChars: 0,
            attachmentContextChars: 0,
            estimatedTotalTokens: 0,
          },
          sources: [],
          compaction: { applied: false, beforeTokens: 0, afterTokens: 0, strategy: 'none', compactedSourceIds: [] },
        },
        createdAt: 1,
      }),
    });

    const summary = useProjectStore.getState().project.documents.find((document) => document.starterRef?.artifactKey === 'project-summary');
    expect(summary).toBeDefined();
    expect(first.changedTargets[0]?.action).toBe('created');

    const second = await handleProjectWorkflow({
      ...baseContext,
      project: useProjectStore.getState().project,
      runRequest: makeRunRequest(useProjectStore.getState().project, {
        runId: 'run-2',
        intent: {
          ...first.intent,
          operation: 'edit',
        },
        context: {
          conversation: {
            prompt: 'Summarize the project again',
            promptWithContext: 'Summarize the project again',
            chatHistory: [],
          },
          attachments: { files: [], textContext: '', imageParts: [] },
          artifact: { activeDocument: null, activeWorkbook: null, relatedDocuments: [] },
          memory: { text: '' },
          data: { projectId: 'project-1', projectDocumentCount: useProjectStore.getState().project.documents.length },
          metrics: {
            promptChars: 20,
            promptWithContextChars: 20,
            chatHistoryChars: 0,
            memoryContextChars: 0,
            artifactContextChars: 0,
            attachmentContextChars: 0,
            estimatedTotalTokens: 0,
          },
          sources: [],
          compaction: { applied: false, beforeTokens: 0, afterTokens: 0, strategy: 'none', compactedSourceIds: [] },
        },
        createdAt: 2,
      }),
    });

    const summaries = useProjectStore.getState().project.documents.filter((document) => document.starterRef?.artifactKey === 'project-summary');
    expect(summaries).toHaveLength(1);
    expect(second.changedTargets[0]?.action).toBe('updated');
  });

  it('returns structured review findings without mutating artifacts', async () => {
    const project = makeProject([
      makeDocument({ id: 'doc-main', title: 'Main Brief' }),
      makeDocument({
        id: 'doc-broken',
        title: 'Broken Link Doc',
        contentHtml: '<div data-aura-linked-table="missing-doc:sheet-1"></div>',
        linkedTableRefs: [{ spreadsheetDocId: 'missing-doc', sheetId: 'sheet-1' }],
      }),
    ]);
    useProjectStore.getState().setProject(project);

    const result = await handleProjectWorkflow({
      project,
      runRequest: makeRunRequest(project, {
        runId: 'run-review',
        intent: {
          artifactType: 'document',
          operation: 'action',
          scope: 'project',
          projectOperation: 'review-project',
          targetDocumentIds: ['doc-main', 'doc-broken'],
          targetSelectors: [],
          allowFullRegeneration: false,
          confidence: 0.9,
          needsClarification: false,
          reason: 'project wide',
        },
        context: {
          conversation: {
            prompt: 'Review the project',
            promptWithContext: 'Review the project',
            chatHistory: [],
          },
          attachments: { files: [], textContext: '', imageParts: [] },
          artifact: { activeDocument: null, activeWorkbook: null, relatedDocuments: [] },
          memory: { text: '' },
          data: { projectId: 'project-1', projectDocumentCount: 2 },
          metrics: {
            promptChars: 12,
            promptWithContextChars: 12,
            chatHistoryChars: 0,
            memoryContextChars: 0,
            artifactContextChars: 0,
            attachmentContextChars: 0,
            estimatedTotalTokens: 0,
          },
          sources: [],
          compaction: { applied: false, beforeTokens: 0, afterTokens: 0, strategy: 'none', compactedSourceIds: [] },
        },
        createdAt: 1,
      }),
      addDocument: useProjectStore.getState().addDocument,
      updateDocument: useProjectStore.getState().updateDocument,
      setStatus: () => {},
      setStreamingContent: () => {},
    });

    expect(result.outputs.project?.reviewSummary).toContain('linked table reference');
    expect(result.changedTargets).toEqual([]);
    expect(listRunEvents('run-review').some((event) => event.type === 'dependency.broken')).toBe(true);
  });
});
