import { describe, expect, it } from 'vitest';

import { mapApiExecutionRequest, mapApiExecutionResponse } from '@/services/adapters/api';
import { mapAutomationExecutionRequest, mapAutomationExecutionResponse } from '@/services/adapters/automation';
import { mapMcpExecutionRequest, mapMcpExecutionResponse } from '@/services/adapters/mcp';
import { publishRunEvent, clearRunEvents } from '@/services/events/eventBus';
import type { SerializableRunSpec } from '@/services/executionSpec/types';
import type { RunResult } from '@/services/contracts/runResult';

const spec: SerializableRunSpec = {
  version: 1,
  runId: 'run-1',
  mode: 'execute',
  intent: {
    artifactType: 'document',
    operation: 'edit',
    scope: 'document',
    targetDocumentId: 'doc-1',
    targetSelectors: [],
    allowFullRegeneration: false,
    confidence: 0.9,
    needsClarification: false,
    reason: 'test',
  },
  projectSnapshot: {
    documentIds: ['doc-1'],
    activeDocumentId: 'doc-1',
    linkedReferenceCount: 0,
    artifactCountsByType: { document: 1, presentation: 0, spreadsheet: 0 },
  },
  contextSnapshot: {
    metrics: {
      promptChars: 10,
      promptWithContextChars: 10,
      chatHistoryChars: 0,
      memoryContextChars: 0,
      artifactContextChars: 0,
      attachmentContextChars: 0,
      estimatedTotalTokens: 3,
    },
    compaction: {
      applied: false,
      beforeTokens: 3,
      afterTokens: 3,
      strategy: 'none',
      compactedSourceIds: [],
    },
    sources: [{
      kind: 'conversation',
      id: 'prompt:1',
      label: 'Prompt',
      reasonIncluded: 'user request',
      tokenEstimate: 3,
      detailLevel: 'full',
      pinned: false,
      excluded: false,
      compacted: false,
    }],
    selectedSourceIds: ['prompt:1'],
  },
  rulesSnapshot: {
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
  providerRef: {
    providerId: 'openai',
    model: 'gpt-4.1',
    hasApiKey: true,
  },
  targeting: {
    messageScope: 'document',
    targetDocumentId: 'doc-1',
  },
};

const result: RunResult = {
  runId: 'run-1',
  status: 'completed',
  intent: spec.intent,
  outputs: {
    envelope: {
      artifactType: 'document',
      mode: 'execute',
      targetSummary: ['doc-1'],
      changedTargets: [{ documentId: 'doc-1', action: 'updated' }],
      validation: { passed: true, summary: 'ok' },
      document: {
        artifactType: 'document',
        title: 'Updated',
      },
    },
  },
  assistantMessage: { content: 'Updated.' },
  validation: { passed: true, summary: 'ok' },
  warnings: [],
  changedTargets: [{ documentId: 'doc-1', action: 'updated' }],
  structuredStatus: { title: 'Done', detail: 'Done' },
};

describe('external adapter contracts', () => {
  it('maps API, MCP, and automation requests and responses onto the shared execution contract', () => {
    clearRunEvents();
    const event = publishRunEvent({
      type: 'run.completed',
      runId: 'run-1',
      source: 'test',
      payload: { status: 'completed' },
    });

    const apiRequest = mapApiExecutionRequest(spec, 'req-api');
    const mcpRequest = mapMcpExecutionRequest(spec, 'req-mcp');
    const automationRequest = mapAutomationExecutionRequest(spec, 'req-automation');

    expect(apiRequest.caller).toBe('api');
    expect(mcpRequest.caller).toBe('mcp');
    expect(automationRequest.caller).toBe('automation');

    const apiResponse = mapApiExecutionResponse(result, ['warn'], [event]);
    const mcpResponse = mapMcpExecutionResponse(result, [], [event]);
    const automationResponse = mapAutomationExecutionResponse(result, [], [event]);

    expect(apiResponse.runId).toBe('run-1');
    expect(apiResponse.warnings).toEqual(['warn']);
    expect(mcpResponse.events?.[0]?.type).toBe('run.completed');
    expect(automationResponse.result.outputs.envelope.document?.title).toBe('Updated');
  });
});
