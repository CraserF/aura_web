import type { LanguageModel, ModelMessage } from 'ai';
import { streamText } from 'ai';

import { emitArtifactRunEvent } from '@/services/artifactRuntime/events';
import {
  applyDocumentRuntimeModuleEdits,
  assembleDocumentRuntimeHtml,
  validateDocumentRuntimeModules,
  type DocumentRuntimeDraftResult,
  type DocumentRuntimeEditModuleMatch,
  type DocumentRuntimeValidationResult,
  type QueuedDocumentRuntimeModuleRepairResult,
} from '@/services/artifactRuntime/documentRuntime';
import {
  buildDocumentRuntimeModuleUserPrompt,
  buildDocumentRuntimeOutlineUserPrompt,
  buildDocumentRuntimeRepairUserPrompt,
  buildDocumentRuntimeSystemPrompt,
} from '@/services/artifactRuntime/documentPrompts';
import type { ArtifactPart } from '@/services/artifactRuntime/types';
import type { EventListener } from '@/services/ai/workflow/types';

export interface DocumentRuntimeImagePart {
  type: 'image';
  image: string;
  mimeType: string;
}

export interface RunQueuedDocumentRuntimeCreateDraftInput {
  model: LanguageModel;
  systemProviderOptions?: ModelMessage['providerOptions'];
  historyMessages: ModelMessage[];
  taskBrief: string;
  memoryContext?: string;
  imageParts?: DocumentRuntimeImagePart[];
  documentType: string;
  blueprintLabel: string;
  runtimeParts: ArtifactPart[];
  designFamily?: string;
  title: string;
  maxModuleOutputTokens: number;
  onEvent: EventListener;
  signal?: AbortSignal;
  runId: string;
}

export interface RunQueuedDocumentRuntimeEditDraftInput {
  model: LanguageModel;
  systemProviderOptions?: ModelMessage['providerOptions'];
  taskBrief: string;
  documentType: string;
  designFamily?: string;
  existingHtml: string;
  runtimeParts: ArtifactPart[];
  editModules: DocumentRuntimeEditModuleMatch[];
  maxModuleOutputTokens: number;
  onEvent: EventListener;
  signal?: AbortSignal;
  runId: string;
}

export interface RunQueuedDocumentRuntimeModuleRepairInput {
  model: LanguageModel;
  systemProviderOptions?: ModelMessage['providerOptions'];
  html: string;
  taskBrief: string;
  documentType: string;
  designFamily?: string;
  runtimeParts: ArtifactPart[];
  validation: DocumentRuntimeValidationResult;
  maxRepairPasses: number;
  maxRepairOutputTokens: number;
  onEvent: EventListener;
  signal?: AbortSignal;
  runId: string;
}

function withMemoryContext(prompt: string, memoryContext?: string): string {
  const sections = [prompt];
  if (memoryContext) {
    sections.push(`Relevant memory context:\n${memoryContext}\n\nUse this memory only when it improves the current document.`);
  }
  return sections.join('\n\n');
}

function buildSystemMessage(
  content: string,
  providerOptions?: ModelMessage['providerOptions'],
): ModelMessage {
  return {
    role: 'system',
    content,
    ...(providerOptions ? { providerOptions } : {}),
  } as ModelMessage;
}

function extractDocumentSource(raw: string): string {
  const fenceMatch = raw.match(/```(?:html|markdown|md)?\n?([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  return raw.trim();
}

async function streamDocumentRuntimeText(input: {
  model: LanguageModel;
  messages: ModelMessage[];
  maxOutputTokens: number;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
}): Promise<string> {
  const stream = streamText({
    model: input.model,
    messages: input.messages,
    maxOutputTokens: input.maxOutputTokens,
    ...(input.signal ? { abortSignal: input.signal } : {}),
  });
  let text = '';

  for await (const chunk of stream.textStream) {
    if (input.signal?.aborted) {
      throw new DOMException('Workflow aborted', 'AbortError');
    }
    text += chunk;
    input.onChunk(chunk);
  }

  return text;
}

export async function runQueuedDocumentRuntimeCreateDraft(
  input: RunQueuedDocumentRuntimeCreateDraftInput,
): Promise<DocumentRuntimeDraftResult> {
  const moduleParts = input.runtimeParts
    .filter((part) => part.kind === 'document-module')
    .sort((a, b) => a.orderIndex - b.orderIndex);
  let firstPreviewAt: number | undefined;
  const onChunk = (chunk: string) => {
    firstPreviewAt ??= performance.now();
    input.onEvent({ type: 'streaming', stepId: 'generate', chunk });
  };

  emitArtifactRunEvent(input.onEvent, {
    runId: input.runId,
    type: 'runtime.part-started',
    role: 'generator',
    message: 'Creating document outline',
    partId: 'document-outline',
    pct: 30,
  });
  const outlinePrompt = withMemoryContext(
    buildDocumentRuntimeOutlineUserPrompt({
      taskBrief: input.taskBrief,
      documentType: input.documentType,
      blueprintLabel: input.blueprintLabel,
      parts: input.runtimeParts,
      designFamily: input.designFamily,
    }),
    input.memoryContext,
  );
  const outlineUserMessage: ModelMessage = input.imageParts && input.imageParts.length > 0
    ? {
        role: 'user',
        content: [
          { type: 'text' as const, text: outlinePrompt },
          ...input.imageParts.map((img) => ({
            type: 'image' as const,
            image: img.image,
            mimeType: img.mimeType as `image/${string}`,
          })),
        ],
      }
    : { role: 'user', content: outlinePrompt };
  const outline = await streamDocumentRuntimeText({
    model: input.model,
    messages: [
      buildSystemMessage(buildDocumentRuntimeSystemPrompt({
        documentType: input.documentType,
        designFamily: input.designFamily,
        blueprintLabel: input.blueprintLabel,
        mode: 'queued-create',
      }), input.systemProviderOptions),
      ...input.historyMessages,
      outlineUserMessage,
    ],
    maxOutputTokens: 2048,
    ...(input.signal ? { signal: input.signal } : {}),
    onChunk,
  });
  emitArtifactRunEvent(input.onEvent, {
    runId: input.runId,
    type: 'runtime.part-completed',
    role: 'generator',
    message: 'Created document outline',
    partId: 'document-outline',
    pct: 40,
  });

  const modules: Array<{ partId: string; html: string }> = [];
  for (const [index, part] of moduleParts.entries()) {
    const pct = Math.min(76, 42 + (index * 8));
    emitArtifactRunEvent(input.onEvent, {
      runId: input.runId,
      type: 'runtime.part-started',
      role: 'generator',
      message: `Creating ${part.title}`,
      partId: part.id,
      pct,
    });
    const modulePrompt = buildDocumentRuntimeModuleUserPrompt({
      taskBrief: input.taskBrief,
      documentType: input.documentType,
      outline,
      part,
      designFamily: input.designFamily,
    });
    const html = await streamDocumentRuntimeText({
      model: input.model,
      messages: [
        buildSystemMessage(buildDocumentRuntimeSystemPrompt({
          documentType: input.documentType,
          designFamily: input.designFamily,
          blueprintLabel: input.blueprintLabel,
          mode: 'queued-create',
        }), input.systemProviderOptions),
        { role: 'user', content: modulePrompt },
      ],
      maxOutputTokens: input.maxModuleOutputTokens,
      ...(input.signal ? { signal: input.signal } : {}),
      onChunk,
    });
    modules.push({
      partId: part.id,
      html: extractDocumentSource(html),
    });
    emitArtifactRunEvent(input.onEvent, {
      runId: input.runId,
      type: 'runtime.part-completed',
      role: 'generator',
      message: `Created ${part.title}`,
      partId: part.id,
      pct: Math.min(82, pct + 6),
    });
  }

  const renderedHtml = assembleDocumentRuntimeHtml({
    title: input.title,
    outline: extractDocumentSource(outline),
    parts: input.runtimeParts,
    modules,
  });
  const rawContent = [
    `# ${input.title}`,
    extractDocumentSource(outline),
    ...modules.map((module) => module.html),
  ].filter(Boolean).join('\n\n');

  return {
    rawContent,
    renderedHtml,
    ...(firstPreviewAt ? { firstPreviewAt } : {}),
  };
}

export async function runQueuedDocumentRuntimeEditDraft(
  input: RunQueuedDocumentRuntimeEditDraftInput,
): Promise<DocumentRuntimeDraftResult> {
  let firstPreviewAt: number | undefined;
  const onChunk = (chunk: string) => {
    firstPreviewAt ??= performance.now();
    input.onEvent({ type: 'streaming', stepId: 'generate', chunk });
  };
  const outline = [
    `Edit request: ${input.taskBrief}`,
    'Targeted runtime modules:',
    ...input.editModules.map((match, index) => `${index + 1}. ${match.part.title} [${match.part.id}]: ${match.existingText.slice(0, 600)}`),
  ].join('\n');
  const modules: Array<{ partId: string; html: string }> = [];

  for (const [index, match] of input.editModules.entries()) {
    const pct = Math.min(76, 34 + (index * 10));
    emitArtifactRunEvent(input.onEvent, {
      runId: input.runId,
      type: 'runtime.part-started',
      role: 'generator',
      message: `Updating ${match.part.title}`,
      partId: match.part.id,
      pct,
    });
    const html = await streamDocumentRuntimeText({
      model: input.model,
      messages: [
        buildSystemMessage(buildDocumentRuntimeSystemPrompt({
          documentType: input.documentType,
          designFamily: input.designFamily,
          mode: 'queued-edit',
        }), input.systemProviderOptions),
        {
          role: 'user',
          content: buildDocumentRuntimeModuleUserPrompt({
            taskBrief: input.taskBrief,
            documentType: input.documentType,
            outline,
            part: match.part,
            designFamily: input.designFamily,
            existingModuleHtml: match.existingHtml,
          }),
        },
      ],
      maxOutputTokens: input.maxModuleOutputTokens,
      ...(input.signal ? { signal: input.signal } : {}),
      onChunk,
    });
    modules.push({
      partId: match.part.id,
      html: extractDocumentSource(html),
    });
    emitArtifactRunEvent(input.onEvent, {
      runId: input.runId,
      type: 'runtime.part-completed',
      role: 'generator',
      message: `Updated ${match.part.title}`,
      partId: match.part.id,
      pct: Math.min(82, pct + 6),
    });
  }

  const renderedHtml = applyDocumentRuntimeModuleEdits({
    existingHtml: input.existingHtml,
    parts: input.runtimeParts,
    modules,
  });
  const rawContent = modules.map((module) => module.html).join('\n\n');

  return {
    rawContent,
    renderedHtml,
    ...(firstPreviewAt ? { firstPreviewAt } : {}),
  };
}

function findRuntimePartHtml(html: string, partId: string): string | undefined {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const element = Array.from(doc.body.querySelectorAll<HTMLElement>('[data-runtime-part]'))
    .find((node) => node.getAttribute('data-runtime-part') === partId);
  return element?.outerHTML;
}

export async function runQueuedDocumentRuntimeModuleRepair(
  input: RunQueuedDocumentRuntimeModuleRepairInput,
): Promise<QueuedDocumentRuntimeModuleRepairResult> {
  const issues = input.validation.moduleIssues ?? [];
  if (issues.length === 0 || input.maxRepairPasses <= 0) {
    return {
      html: input.html,
      repairCount: 0,
      repairedPartCount: 0,
      repaired: false,
      validation: input.validation,
      summary: 'No queued document module repair available.',
    };
  }

  const partsById = new Map(input.runtimeParts.map((part) => [part.id, part]));
  const issueGroups = new Map<string, typeof issues>();
  for (const issue of issues) {
    issueGroups.set(issue.partId, [...(issueGroups.get(issue.partId) ?? []), issue]);
  }

  const modules = [];
  const selectedGroups = Array.from(issueGroups.entries()).slice(0, input.maxRepairPasses);

  for (const [partId, partIssues] of selectedGroups) {
    const part = partsById.get(partId);
    if (!part) continue;

    emitArtifactRunEvent(input.onEvent, {
      runId: input.runId,
      type: 'runtime.repair-started',
      role: 'repairer',
      message: `Repairing ${part.title}`,
      partId,
      pct: 84,
    });
    const repairedModule = await streamDocumentRuntimeText({
      model: input.model,
      messages: [
        buildSystemMessage(buildDocumentRuntimeSystemPrompt({
          documentType: input.documentType,
          designFamily: input.designFamily,
          mode: 'queued-repair',
        }), input.systemProviderOptions),
        {
          role: 'user',
          content: buildDocumentRuntimeRepairUserPrompt({
            taskBrief: input.taskBrief,
            documentType: input.documentType,
            part,
            issues: partIssues,
            designFamily: input.designFamily,
            existingModuleHtml: findRuntimePartHtml(input.html, partId),
          }),
        },
      ],
      maxOutputTokens: input.maxRepairOutputTokens,
      ...(input.signal ? { signal: input.signal } : {}),
      onChunk: (chunk) => input.onEvent({ type: 'streaming', stepId: 'qa', chunk }),
    });
    modules.push({
      partId,
      html: extractDocumentSource(repairedModule),
    });
  }

  if (modules.length === 0) {
    return {
      html: input.html,
      repairCount: 0,
      repairedPartCount: 0,
      repaired: false,
      validation: input.validation,
      summary: 'Queued document module repair skipped because no matching runtime parts were found.',
    };
  }

  const repairedHtml = applyDocumentRuntimeModuleEdits({
    existingHtml: input.html,
    parts: input.runtimeParts,
    modules,
  });
  const repairedValidation = validateDocumentRuntimeModules(repairedHtml, input.runtimeParts);

  return {
    html: repairedHtml,
    repairCount: 1,
    repairedPartCount: modules.length,
    repaired: repairedHtml.trim() !== input.html.trim(),
    validation: repairedValidation,
    summary: repairedValidation.passed
      ? 'Queued document module repair passed validation.'
      : `Queued document module repair completed with ${repairedValidation.blockingCount} blocking issue(s) and ${repairedValidation.advisoryCount} advisory issue(s) remaining.`,
  };
}
