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

export interface DocumentRuntimeFinalizeResult {
  html: string;
  changed: boolean;
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
Mark each document module wrapper with its exact runtime id using data-runtime-part="...".

${documentParts.map((part, index) => `${index + 1}. ${part.title} [${part.id}]: ${part.brief}`).join('\n')}`;
}

function getDocumentModuleParts(parts: ArtifactPart[]): ArtifactPart[] {
  return parts
    .filter((part) => part.kind === 'document-module')
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

function findRuntimePartElement(doc: Document, partId: string): HTMLElement | null {
  return Array.from(doc.body.querySelectorAll<HTMLElement>('[data-runtime-part]'))
    .find((element) => element.getAttribute('data-runtime-part') === partId) ?? null;
}

export function validateDocumentRuntimeModules(
  html: string,
  parts: ArtifactPart[],
): DocumentRuntimeValidationResult {
  const moduleParts = getDocumentModuleParts(parts);
  if (moduleParts.length === 0) {
    return {
      passed: true,
      score: 100,
      blockingCount: 0,
      advisoryCount: 0,
      summary: 'No document runtime modules required.',
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let missingCount = 0;
  let emptyCount = 0;
  let headinglessCount = 0;

  for (const part of moduleParts) {
    const element = findRuntimePartElement(doc, part.id);
    if (!element) {
      missingCount += 1;
      continue;
    }

    if ((element.textContent ?? '').replace(/\s+/g, ' ').trim().length < 24) {
      emptyCount += 1;
    }

    if (!element.querySelector('h2, h3, h4')) {
      headinglessCount += 1;
    }
  }

  const blockingCount = missingCount + emptyCount;
  const advisoryCount = headinglessCount;
  const score = Math.max(0, 100 - (blockingCount * 18) - (advisoryCount * 7));

  return {
    passed: blockingCount === 0 && advisoryCount === 0,
    score,
    blockingCount,
    advisoryCount,
    summary: blockingCount === 0 && advisoryCount === 0
      ? `Document runtime modules validated (${moduleParts.length} module(s)).`
      : `Document runtime module validation found ${missingCount} missing, ${emptyCount} empty, and ${headinglessCount} headingless module(s).`,
  };
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

function serializeDocumentRuntimeHtml(doc: Document): string {
  return `${Array.from(doc.head.querySelectorAll('style')).map((style) => style.outerHTML).join('\n')}\n${doc.body.innerHTML}`.trim();
}

function findDocumentModuleCandidates(doc: Document): HTMLElement[] {
  const selector = [
    'section',
    'article',
    '.doc-section',
    '.doc-story-card',
    '.doc-callout',
    '.doc-kpi-grid',
    '.doc-proof-strip',
    '.doc-infographic-band',
    '.doc-comparison',
    '.doc-timeline',
    '.doc-sidebar-layout',
  ].join(', ');
  const candidates = Array.from(doc.body.querySelectorAll<HTMLElement>(selector))
    .filter((element) => {
      if (element.matches('.doc-shell')) return false;
      if (element.hasAttribute('data-runtime-part')) return false;
      if ((element.textContent ?? '').replace(/\s+/g, ' ').trim().length < 24) return false;
      return true;
    });

  return candidates.filter((element) => !candidates.some((other) => other !== element && other.contains(element)));
}

function getDocumentModuleRoot(doc: Document): HTMLElement {
  return doc.body.querySelector<HTMLElement>('.doc-shell, main, article') ?? doc.body;
}

function ensureDocumentModuleHeading(doc: Document, element: HTMLElement, part: ArtifactPart): boolean {
  if (element.querySelector('h2, h3, h4')) return false;

  const heading = doc.createElement('h2');
  heading.textContent = part.title;
  element.prepend(heading);
  return true;
}

function ensureDocumentModuleBody(doc: Document, element: HTMLElement, part: ArtifactPart): boolean {
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text.length >= 40) return false;

  const paragraph = doc.createElement('p');
  paragraph.textContent = part.brief;
  element.append(paragraph);
  return true;
}

function createDocumentModuleShell(doc: Document, part: ArtifactPart): HTMLElement {
  const section = doc.createElement('section');
  section.className = 'doc-section doc-runtime-module';
  section.setAttribute('data-runtime-part', part.id);
  ensureDocumentModuleHeading(doc, section, part);
  ensureDocumentModuleBody(doc, section, part);
  return section;
}

export function finalizeDocumentRuntimeHtml(input: {
  html: string;
  title: string;
}): DocumentRuntimeFinalizeResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input.html, 'text/html');
  const before = serializeDocumentRuntimeHtml(doc);

  stripUnsupportedDocumentNodes(doc);
  ensureDocumentRuntimeTitle(doc, input.title);
  wrapLooseDocumentBody(doc);
  ensureDocumentRuntimeStyle(doc);

  const html = serializeDocumentRuntimeHtml(doc);
  return {
    html,
    changed: html.trim() !== before.trim(),
  };
}

export function repairDocumentRuntimeModules(input: {
  html: string;
  parts: ArtifactPart[];
  validation: DocumentRuntimeValidationResult;
  runPlan?: ArtifactRunPlan;
  onEvent: EventListener;
}): DocumentRuntimeRepairResult {
  if (input.validation.passed) {
    return {
      html: input.html,
      repairCount: 0,
      repaired: false,
      validation: input.validation,
      summary: 'No document module repair needed.',
    };
  }

  const moduleParts = getDocumentModuleParts(input.parts);
  const maxRepairPasses = input.runPlan?.providerPolicy.maxRepairPasses ?? 1;
  if (moduleParts.length === 0 || maxRepairPasses <= 0) {
    return {
      html: input.html,
      repairCount: 0,
      repaired: false,
      validation: input.validation,
      summary: 'Document module repair skipped because no runtime module repair budget is available.',
    };
  }

  emitArtifactRunEvent(input.onEvent, {
    runId: input.runPlan?.runId ?? 'document-runtime',
    type: 'runtime.repair-started',
    role: 'repairer',
    message: 'Applying deterministic document module repair.',
    partId: 'document-modules',
    pct: 86,
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(input.html, 'text/html');
  stripUnsupportedDocumentNodes(doc);
  wrapLooseDocumentBody(doc);

  const root = getDocumentModuleRoot(doc);
  const candidates = findDocumentModuleCandidates(doc);
  let changed = false;

  for (const part of moduleParts) {
    let element = findRuntimePartElement(doc, part.id);
    if (!element) {
      element = candidates.shift() ?? createDocumentModuleShell(doc, part);
      if (!element.parentElement) root.append(element);
      element.setAttribute('data-runtime-part', part.id);
      changed = true;
    }

    if (ensureDocumentModuleHeading(doc, element, part)) changed = true;
    if (ensureDocumentModuleBody(doc, element, part)) changed = true;
  }

  const repairedHtml = serializeDocumentRuntimeHtml(doc);
  const repairedValidation = validateDocumentRuntimeModules(repairedHtml, input.parts);

  return {
    html: repairedHtml,
    repairCount: changed ? 1 : 0,
    repaired: changed,
    validation: repairedValidation,
    summary: repairedValidation.passed
      ? 'Deterministic document module repair passed validation.'
      : `Deterministic document module repair completed with ${repairedValidation.blockingCount} blocking issue(s) and ${repairedValidation.advisoryCount} advisory issue(s) remaining.`,
  };
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

  const repairedHtml = serializeDocumentRuntimeHtml(doc);
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
