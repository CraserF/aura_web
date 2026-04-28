import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModel, ModelMessage } from 'ai';
import type { ProviderEntry } from '@/services/ai/types';
import type { LLMConfig, WorkflowEvent } from '@/services/ai/workflow/types';
import { buildArtifactRunPlan } from '@/services/artifactRuntime';

const aiMocks = vi.hoisted(() => ({
  streamText: vi.fn(),
}));

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    streamText: aiMocks.streamText,
  };
});

const { runDocumentWorkflow } = await import('@/services/ai/workflow/document');
const streamTextMock = aiMocks.streamText;

function createLlmConfig(): LLMConfig {
  return {
    providerEntry: {
      id: 'openai',
      name: 'OpenAI',
      defaultModel: 'test-model',
      createModel: vi.fn(async () => ({}) as LanguageModel),
    } as ProviderEntry,
    apiKey: 'test-key',
    baseUrl: 'https://example.com',
    model: 'test-model',
  };
}

function createDocumentRunPlan(prompt: string, operation: 'create' | 'edit' = 'create') {
  return buildArtifactRunPlan({
    runId: `doc-${operation}-run`,
    prompt,
    artifactType: 'document',
    operation,
    activeDocument: null,
    mode: 'execute',
    providerId: 'openai',
    providerModel: 'gpt-4o',
    allowFullRegeneration: false,
  });
}

async function* streamChunks(text: string): AsyncGenerator<string> {
  yield text;
}

function readUserText(message: ModelMessage | undefined): string {
  if (!message || message.role !== 'user') return '';
  if (typeof message.content === 'string') return message.content;
  return message.content
    .map((part) => part.type === 'text' ? part.text : `[${part.type}]`)
    .join('\n');
}

function readLastMessage(messages: ModelMessage[] | undefined): ModelMessage | undefined {
  return messages && messages.length > 0
    ? messages[messages.length - 1]
    : undefined;
}

function readLastUserText(callIndex: number): string {
  const call = streamTextMock.mock.calls[callIndex]?.[0] as { messages?: ModelMessage[] } | undefined;
  return readUserText(readLastMessage(call?.messages));
}

function createStreamResponse(prompt: string): string {
  const moduleId = prompt.match(/Runtime part id:\s*(document-module-\d+)/)?.[1];
  if (/Repair one failed document module fragment/i.test(prompt)) {
    const repairId = moduleId ?? prompt.match(/data-runtime-part="([^"]+)"/)?.[1] ?? 'document-module-1';
    return `<section class="doc-section doc-runtime-module" data-runtime-part="${repairId}"><h2>Repaired module</h2><p>Repaired module content with enough useful detail for validation.</p></section>`;
  }
  if (/Create the runtime outline/i.test(prompt)) {
    return 'The document explains the decision path.\n- Executive summary\n- Evidence\n- Next steps';
  }
  if (moduleId) {
    return `<section class="doc-section doc-runtime-module" data-runtime-part="${moduleId}"><h2>${moduleId}</h2><p>${moduleId} content with enough useful detail for the runtime validator.</p></section>`;
  }
  return '<main class="doc-shell"><h1>Updated Document</h1><section><h2>Summary</h2><p>Updated broad stream content for the document.</p></section></main>';
}

function installDefaultStreamMock(): void {
  streamTextMock.mockImplementation((options: { messages?: ModelMessage[] }) => {
    const prompt = readUserText(readLastMessage(options.messages));
    return {
      textStream: streamChunks(createStreamResponse(prompt)),
    };
  });
}

describe('document runtime workflow orchestration', () => {
  beforeEach(() => {
    streamTextMock.mockReset();
    installDefaultStreamMock();
  });

  it('keeps queued document streaming implementation in artifactRuntime', () => {
    const workflowSource = readFileSync(join(process.cwd(), 'src/services/ai/workflow/document.ts'), 'utf8');

    expect(workflowSource).toContain("from '@/services/artifactRuntime/documentStreaming'");
    expect(workflowSource).toContain("from '@/services/artifactRuntime/documentPrompts'");
    expect(workflowSource).not.toMatch(/function\s+streamDocumentRuntimeText/);
    expect(workflowSource).not.toMatch(/buildDocumentRuntime(?:Outline|Module|ModuleRepair)Prompt/);
    expect(workflowSource).not.toMatch(/assembleDocumentRuntimeHtml|applyDocumentRuntimeModuleEdits|validateDocumentRuntimeModules/);
    expect(workflowSource).not.toMatch(/class\s+DocumentPromptComposer|DOCUMENT_SYSTEM_PROMPT|EDIT_DOCUMENT_SYSTEM_PROMPT/);
    expect(workflowSource).not.toMatch(/getReferenceStylePack|synthetic style example|ADDITIONAL REFERENCE MATERIAL/);
  });

  it('uses images only in the queued outline step for image-based creates', async () => {
    const events: WorkflowEvent[] = [];
    const result = await runDocumentWorkflow({
      input: {
        prompt: 'Create an executive briefing document from this screenshot',
        chatHistory: [],
        artifactRunPlan: createDocumentRunPlan('Create an executive briefing document from this screenshot'),
        imageParts: [{
          type: 'image',
          image: 'data:image/png;base64,AAA',
          mimeType: 'image/png',
        }],
      },
      llmConfig: createLlmConfig(),
      onEvent: (event) => events.push(event),
    });

    const firstCall = streamTextMock.mock.calls[0]?.[0] as { messages?: ModelMessage[] } | undefined;
    const firstUserMessage = readLastMessage(firstCall?.messages);
    expect(firstUserMessage?.role).toBe('user');
    expect(Array.isArray(firstUserMessage?.content)).toBe(true);
    expect(readLastUserText(0)).toContain('Create the runtime content blueprint');

    for (let index = 1; index < streamTextMock.mock.calls.length; index += 1) {
      const call = streamTextMock.mock.calls[index]?.[0] as { messages?: ModelMessage[] } | undefined;
      expect(Array.isArray(readLastMessage(call?.messages)?.content)).toBe(false);
      const userText = readLastUserText(index);
      expect(
        userText.includes('Runtime part id: document-module-') ||
        userText.includes('DOCUMENT QUALITY ENRICHMENT TASK'),
      ).toBe(true);
    }

    expect(result.runtime?.runMode).toBe('queued-create');
    expect(result.runtime?.queuedPartCount).toBeGreaterThan(0);
    expect(result.runtime?.completedPartCount).toBe(result.runtime?.queuedPartCount);
    expect(result.runtime?.timeToFirstPreviewMs).toBeGreaterThanOrEqual(0);
    expect(events.some((event) => event.type === 'streaming' && event.stepId === 'generate')).toBe(true);
    expect(events.some((event) => event.type === 'step-update' && event.stepId === 'document-outline' && event.status === 'active')).toBe(true);
    expect(events.some((event) => event.type === 'step-update' && event.stepId === 'document-module-1' && event.status === 'done')).toBe(true);
    expect(events.some((event) => event.type === 'progress' && event.message === 'Creating document outline and modules…')).toBe(true);
  });

  it('falls back to the broad targeted edit path when no runtime module wrapper resolves', async () => {
    const runPlan = createDocumentRunPlan('Update the risk wording', 'edit');
    runPlan.providerPolicy.maxRepairPasses = 0;

    const result = await runDocumentWorkflow({
      input: {
        prompt: 'Update the risk wording',
        chatHistory: [],
        artifactRunPlan: runPlan,
        existingHtml: '<main><section><h2>Risk</h2><p>Old risk wording.</p></section></main>',
        editing: {
          resolvedTargets: [{
            selector: { type: 'document-block', value: 'risk' },
            artifactType: 'document',
            label: 'Risk section',
            matchedText: 'Old risk wording.',
          }],
          targetSummary: ['Risk section'],
          strategyHint: 'block-replace',
          allowFullRegeneration: false,
        },
      },
      llmConfig: createLlmConfig(),
      onEvent: () => {},
    });

    expect(streamTextMock).toHaveBeenCalledTimes(1);
    expect(readLastUserText(0)).toContain('Existing Document');
    expect(readLastUserText(0)).not.toContain('Runtime part id:');
    expect(result.runtime?.runMode).toBe('single-stream');
    expect(result.editing?.fallbackUsed).toBe(true);
  });

  it('uses module-local queued regeneration when an edit target resolves to a runtime module', async () => {
    const runPlan = createDocumentRunPlan('Update the risk section', 'edit');
    runPlan.providerPolicy.maxRepairPasses = 0;

    const result = await runDocumentWorkflow({
      input: {
        prompt: 'Update the risk section',
        chatHistory: [],
        artifactRunPlan: runPlan,
        existingHtml: `<main class="doc-shell">
          <section data-runtime-part="document-module-1"><h2>Executive summary</h2><p>Keep this summary unchanged.</p></section>
          <section data-runtime-part="document-module-2"><h2>Risk section</h2><p>Old risk language with mitigation gaps.</p></section>
        </main>`,
        editing: {
          resolvedTargets: [{
            selector: { type: 'document-block', value: 'risk' },
            artifactType: 'document',
            label: 'Risk section',
            matchedText: 'Old risk language with mitigation gaps.',
          }],
          targetSummary: ['Risk section'],
          strategyHint: 'block-replace',
          allowFullRegeneration: false,
        },
      },
      llmConfig: createLlmConfig(),
      onEvent: () => {},
    });

    expect(streamTextMock).toHaveBeenCalledTimes(1);
    expect(readLastUserText(0)).toContain('Runtime part id: document-module-2');
    expect(readLastUserText(0)).toContain('preserve the useful structure of this existing module');
    expect(result.html).toContain('Keep this summary unchanged.');
    expect(result.runtime?.runMode).toBe('queued-edit');
    expect(result.runtime?.queuedPartCount).toBe(1);
    expect(result.runtime?.completedPartCount).toBe(1);
    expect(result.editing?.fallbackUsed).toBe(false);
  });

  it('attempts queued per-module repair before deterministic module repair', async () => {
    streamTextMock.mockImplementation((options: { messages?: ModelMessage[] }) => {
      const prompt = readUserText(readLastMessage(options.messages));
      const moduleId = prompt.match(/Runtime part id:\s*(document-module-\d+)/)?.[1];
      if (/Repair one failed document module fragment/i.test(prompt)) {
        return {
          textStream: streamChunks(`<section class="doc-section doc-runtime-module" data-runtime-part="${moduleId ?? 'document-module-1'}"><h2>Repaired module</h2><p>Repaired content with enough detail to pass module validation.</p></section>`),
        };
      }
      return {
        textStream: streamChunks('<main class="doc-shell"><section class="doc-section doc-runtime-module" data-runtime-part="document-module-1"><p>tiny</p></section></main>'),
      };
    });
    const events: WorkflowEvent[] = [];
    const runPlan = createDocumentRunPlan('Create an executive briefing document');
    runPlan.providerPolicy.generationGranularity = 'artifact';
    runPlan.providerPolicy.maxRepairPasses = 4;

    const result = await runDocumentWorkflow({
      input: {
        prompt: 'Create an executive briefing document',
        chatHistory: [],
        artifactRunPlan: runPlan,
      },
      llmConfig: createLlmConfig(),
      onEvent: (event) => events.push(event),
    });

    expect(streamTextMock.mock.calls.some((call) => readUserText(readLastMessage((call[0] as { messages?: ModelMessage[] }).messages)).includes('Repair one failed document module fragment'))).toBe(true);
    expect(events.some((event) => event.type === 'progress' && event.message.includes('Queued document module repair passed validation'))).toBe(true);
    expect(events.some((event) => event.type === 'progress' && event.message === 'Applying deterministic document module repair.')).toBe(false);
    expect(result.runtime?.runMode).toBe('single-stream');
    expect(result.runtime?.repairedPartCount).toBeGreaterThan(0);
    expect(result.runtime?.repairCount).toBeGreaterThan(0);
  });
});
