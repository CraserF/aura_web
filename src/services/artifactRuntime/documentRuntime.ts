import { emitArtifactRunEvent } from '@/services/artifactRuntime/events';
import type { ArtifactPart, ArtifactRunPlan } from '@/services/artifactRuntime/types';
import { validateDocument } from '@/services/ai/workflow/agents/document-qa';
import type { ArtifactRuntimeTelemetry, EventListener } from '@/services/ai/workflow/types';

export interface DocumentRuntimeValidationResult {
  passed: boolean;
  score: number;
  blockingCount: number;
  advisoryCount: number;
  summary: string;
}

export interface DocumentRuntimeRepairResult {
  html: string;
  repairCount: number;
  repaired: boolean;
  validation: DocumentRuntimeValidationResult;
  summary: string;
}

export interface BuildDocumentRuntimeTelemetryInput {
  runtimeStartMs: number;
  nowMs: number;
  validation: DocumentRuntimeValidationResult;
  repairCount: number;
  firstPreviewAtMs?: number;
}

export interface BuildDocumentRuntimePartsInput {
  runPlan: ArtifactRunPlan;
  documentType: string;
  blueprintLabel: string;
  recommendedModules: string[];
  isEdit: boolean;
}

function normalizeModuleTitle(value: string, index: number): string {
  const cleaned = value
    .replace(/[`*_#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return `Document module ${index + 1}`;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function buildDocumentRuntimeParts(input: BuildDocumentRuntimePartsInput): ArtifactPart[] {
  const modules = input.recommendedModules.length > 0
    ? input.recommendedModules.slice(0, 4)
    : ['summary module', 'evidence module', 'next-step module'];
  const operation = input.isEdit ? 'Update' : 'Create';

  return [
    {
      id: 'document-outline',
      artifactType: 'document',
      kind: 'section',
      orderIndex: 0,
      title: `${operation} ${input.documentType} outline`,
      brief: `${operation} the document structure using the ${input.blueprintLabel} blueprint.`,
      status: 'pending',
    },
    ...modules.map((module, index) => ({
      id: `document-module-${index + 1}`,
      artifactType: 'document' as const,
      kind: 'document-module' as const,
      orderIndex: index + 1,
      title: normalizeModuleTitle(module, index),
      brief: `${operation} a ${module} for the ${input.documentType} document.`,
      status: 'pending' as const,
    })),
    {
      id: 'document-validation',
      artifactType: 'document',
      kind: 'validation-result',
      orderIndex: modules.length + 1,
      title: 'Document validation',
      brief: 'Validate iframe safety, readability, mobile stacking, and print-safe structure.',
      status: 'pending',
    },
  ];
}

export function attachDocumentRuntimeParts(input: BuildDocumentRuntimePartsInput): ArtifactPart[] {
  const parts = buildDocumentRuntimeParts(input);
  input.runPlan.workQueue = parts;
  input.runPlan.queueMode = 'sequential';
  input.runPlan.workflow.queueMode = 'sequential';
  input.runPlan.workflow.queuedWorkItems = parts
    .filter((part) => part.kind === 'section' || part.kind === 'document-module')
    .map((part) => ({
      id: part.id,
      orderIndex: part.orderIndex,
      targetType: 'section',
      targetLabel: part.title,
      operationKind: input.isEdit ? 'edit' : 'create',
      status: 'pending',
      promptSummary: part.brief,
    }));

  return parts;
}

export function buildDocumentRuntimePartPrompt(parts: ArtifactPart[]): string {
  const documentParts = parts
    .filter((part) => part.kind === 'section' || part.kind === 'document-module')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  if (documentParts.length === 0) return '';

  return `## DOCUMENT RUNTIME PART QUEUE

Build the document by satisfying these runtime parts in order. Keep the final output as one complete document, but make each part visible in the structure.

${documentParts.map((part, index) => `${index + 1}. ${part.title}: ${part.brief}`).join('\n')}`;
}

export function buildDocumentRuntimeTelemetry(
  input: BuildDocumentRuntimeTelemetryInput,
): ArtifactRuntimeTelemetry {
  return {
    ...(typeof input.firstPreviewAtMs === 'number'
      ? { timeToFirstPreviewMs: Math.round(input.firstPreviewAtMs - input.runtimeStartMs) }
      : {}),
    totalRuntimeMs: Math.round(input.nowMs - input.runtimeStartMs),
    validationPassed: input.validation.passed,
    validationBlockingCount: input.validation.blockingCount,
    validationAdvisoryCount: input.validation.advisoryCount,
    repairCount: input.repairCount,
  };
}

export function validateDocumentRuntimeOutput(html: string): DocumentRuntimeValidationResult {
  const qaResult = validateDocument(html);
  const blockingCount = qaResult.violations.filter((violation) => violation.severity === 'error').length;
  const advisoryCount = qaResult.violations.length - blockingCount;

  return {
    passed: qaResult.passed,
    score: qaResult.score,
    blockingCount,
    advisoryCount,
    summary: qaResult.passed
      ? `Document runtime validation passed (score ${qaResult.score}).`
      : `Document runtime validation found ${blockingCount} blocking issue(s) and ${advisoryCount} advisory issue(s) (score ${qaResult.score}).`,
  };
}

function stripUnsupportedDocumentNodes(doc: Document): void {
  doc.querySelectorAll('script:not([type="application/json"][data-aura-chart-spec]), iframe, object, embed, link, meta, title')
    .forEach((node) => node.remove());

  for (const element of Array.from(doc.body.querySelectorAll<HTMLElement>('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (['src', 'href', 'xlink:href', 'poster'].includes(name) && /https?:\/\//i.test(value)) {
        element.removeAttribute(attribute.name);
      }
      if (name === 'style' && /url\(\s*["']?https?:\/\//i.test(value)) {
        element.setAttribute(attribute.name, value.replace(/url\(\s*["']?https?:\/\/[^"')]+["']?\s*\)/gi, 'none'));
      }
    }
  }
}

function ensureDocumentRuntimeStyle(doc: Document): void {
  if (doc.querySelector('style')) return;

  const style = doc.createElement('style');
  style.textContent = `
:root {
  --doc-primary: #1f4b99;
  --doc-accent: #0f8b8d;
  --doc-text: #162235;
  --doc-muted: #5f6f85;
  --doc-bg: #f7f9fc;
  --doc-surface: #ffffff;
  --doc-border: rgba(22, 34, 53, 0.18);
}
body {
  margin: 0;
  background: var(--doc-bg);
  color: var(--doc-text);
  font: 16px/1.6 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.doc-shell {
  max-width: 920px;
  margin: 0 auto;
  padding: 48px 28px;
}
@media (max-width: 720px) {
  .doc-shell { padding: 32px 18px; }
}
`;
  doc.head.append(style);
}

function ensureDocumentRuntimeTitle(doc: Document, title: string): void {
  if (doc.body.querySelector('h1')) return;

  const heading = doc.createElement('h1');
  heading.textContent = title || 'Document';
  doc.body.prepend(heading);
}

function wrapLooseDocumentBody(doc: Document): void {
  if (doc.body.querySelector('.doc-shell')) return;

  const shell = doc.createElement('main');
  shell.className = 'doc-shell';
  while (doc.body.firstChild) {
    shell.append(doc.body.firstChild);
  }
  doc.body.append(shell);
}

export async function repairDocumentRuntimeOutput(input: {
  html: string;
  title: string;
  validation: DocumentRuntimeValidationResult;
  runPlan?: ArtifactRunPlan;
  onEvent: EventListener;
}): Promise<DocumentRuntimeRepairResult> {
  if (input.validation.passed) {
    return {
      html: input.html,
      repairCount: 0,
      repaired: false,
      validation: input.validation,
      summary: 'No document repair needed.',
    };
  }

  const maxRepairPasses = input.runPlan?.providerPolicy.maxRepairPasses ?? 1;
  if (maxRepairPasses <= 0) {
    return {
      html: input.html,
      repairCount: 0,
      repaired: false,
      validation: input.validation,
      summary: 'Document repair skipped because no runtime repair budget is available.',
    };
  }

  emitArtifactRunEvent(input.onEvent, {
    runId: input.runPlan?.runId ?? 'document-runtime',
    type: 'runtime.repair-started',
    role: 'repairer',
    message: 'Applying deterministic document repair.',
    partId: 'document-repair',
    pct: 90,
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(input.html, 'text/html');
  stripUnsupportedDocumentNodes(doc);
  ensureDocumentRuntimeTitle(doc, input.title);
  wrapLooseDocumentBody(doc);
  ensureDocumentRuntimeStyle(doc);

  const repairedHtml = `${Array.from(doc.head.querySelectorAll('style')).map((style) => style.outerHTML).join('\n')}\n${doc.body.innerHTML}`.trim();
  const repairedValidation = validateDocumentRuntimeOutput(repairedHtml);

  return {
    html: repairedHtml,
    repairCount: repairedHtml.trim() === input.html.trim() ? 0 : 1,
    repaired: repairedHtml.trim() !== input.html.trim(),
    validation: repairedValidation,
    summary: repairedValidation.passed
      ? 'Deterministic document repair passed validation.'
      : `Deterministic document repair completed with ${repairedValidation.blockingCount} blocking issue(s) and ${repairedValidation.advisoryCount} advisory issue(s) remaining.`,
  };
}
