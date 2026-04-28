import { emitArtifactRunEvent } from '@/services/artifactRuntime/events';
import {
  buildCoreArtifactContractPack,
  buildDocumentDesignFamilyPack,
  buildDocumentIframeContractPack,
  buildDocumentModuleContractPack,
  buildQualityBarContractPack,
  buildValidatorFeedbackPack,
} from '@/services/artifactRuntime/promptPacks';
import {
  DOCUMENT_RUNTIME_MODULE_CANDIDATE_SELECTORS,
  DOCUMENT_RUNTIME_SHELL_CSS,
  getDocumentRuntimeModuleWrapperClassName,
} from '@/services/artifactRuntime/documentDesignSystem';
import { buildDocumentQualityTelemetry } from '@/services/artifactRuntime/documentQualityChecklist';
import { decideArtifactQualityPolish, type ArtifactQualityPolishDecision } from '@/services/artifactRuntime/qualityDecision';
import type {
  ArtifactPart,
  ArtifactQualityBar,
  ArtifactRunPlan,
  DocumentModuleBlueprint,
  DocumentModuleRole,
} from '@/services/artifactRuntime/types';
import { validateDocument } from '@/services/ai/workflow/agents/document-qa';
import type { ArtifactRuntimeTelemetry, EventListener } from '@/services/ai/workflow/types';
import type { EditingTelemetry, ResolvedTarget } from '@/services/editing/types';

export interface DocumentRuntimeModuleIssue {
  partId: string;
  title: string;
  severity: 'blocking' | 'advisory';
  reason: 'missing' | 'empty' | 'headingless';
  summary: string;
}

export interface DocumentRuntimeValidationResult {
  passed: boolean;
  score: number;
  blockingCount: number;
  advisoryCount: number;
  summary: string;
  moduleIssues?: DocumentRuntimeModuleIssue[];
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

export interface DocumentRuntimeModuleDraft {
  partId: string;
  html: string;
}

export interface DocumentRuntimeDraftResult {
  rawContent: string;
  renderedHtml: string;
  firstPreviewAt?: number;
}

export interface DocumentRuntimeGenerationResult extends DocumentRuntimeDraftResult {
  usedQueuedDocumentEdit: boolean;
  runMode: ArtifactRuntimeTelemetry['runMode'];
  completedPartCount: number;
  selectedMode: 'queued-runtime-edit' | 'queued-runtime' | 'single-stream';
}

export interface RunDocumentRuntimeGenerationInput {
  useQueuedDocumentRuntime: boolean;
  useQueuedDocumentEditRuntime: boolean;
  queuedCreatePartCount: number;
  queuedEditModuleCount: number;
  onEvent: EventListener;
  runQueuedCreate: () => Promise<DocumentRuntimeDraftResult>;
  runQueuedEdit: () => Promise<DocumentRuntimeDraftResult>;
  runSingleStream: () => Promise<DocumentRuntimeDraftResult>;
}

export interface QueuedDocumentRuntimeModuleRepairResult {
  html: string;
  repairCount: number;
  repairedPartCount: number;
  repaired: boolean;
  validation: DocumentRuntimeValidationResult;
  summary: string;
}

export interface RepairDocumentRuntimeStructureInput {
  html: string;
  title: string;
  parts: ArtifactPart[];
  runPlan?: ArtifactRunPlan;
  onEvent: EventListener;
  sanitizeHtml: (html: string) => string;
  runQueuedModuleRepair: (input: {
    html: string;
    validation: DocumentRuntimeValidationResult;
  }) => Promise<QueuedDocumentRuntimeModuleRepairResult>;
}

export interface DocumentRuntimeStructureRepairResult {
  html: string;
  validation: DocumentRuntimeValidationResult;
  moduleRepairCount: number;
  repairedPartCount: number;
  finalizedChanged: boolean;
}

export interface DocumentRuntimePreparedEditResult {
  html: string;
  editing?: EditingTelemetry;
  repairCount?: number;
}

export interface RunDocumentRuntimeOrchestratorInput {
  isEdit: boolean;
  runtimeStartMs: number;
  nowMs: () => number;
  promptText: string;
  parts: ArtifactPart[];
  runPlan?: ArtifactRunPlan;
  onEvent: EventListener;
  sanitizeHtml: (html: string) => string;
  generation: RunDocumentRuntimeGenerationInput;
  stopGenerationHeartbeat?: () => void;
  onGenerationComplete?: (result: DocumentRuntimeGenerationResult) => void;
  prepareGeneratedHtml: (html: string) => string;
  buildQueuedEditTelemetry?: (html: string) => EditingTelemetry;
  applyFallbackEdit?: (html: string) => DocumentRuntimePreparedEditResult;
  resolveTitle: (html: string) => string;
  buildSourceMarkdown: (rawContent: string, finalHtml: string) => string;
  runQueuedModuleRepair: RepairDocumentRuntimeStructureInput['runQueuedModuleRepair'];
  runQualityLlmPolish?: (input: {
    html: string;
    title: string;
    qualityDecision: ArtifactQualityPolishDecision;
  }) => Promise<DocumentRuntimeRepairResult>;
  finalProgressMessage?: string;
}

export interface DocumentRuntimeOrchestratorResult {
  html: string;
  markdown: string;
  title: string;
  runtime: ArtifactRuntimeTelemetry;
  generation: DocumentRuntimeGenerationResult;
  editing?: EditingTelemetry;
}

export interface DocumentRuntimeEditModuleMatch {
  part: ArtifactPart;
  existingHtml: string;
  existingText: string;
}

export interface BuildDocumentRuntimeTelemetryInput {
  runtimeStartMs: number;
  nowMs: number;
  validation: DocumentRuntimeValidationResult;
  repairCount: number;
  firstPreviewAtMs?: number;
  runMode?: ArtifactRuntimeTelemetry['runMode'];
  queuedPartCount?: number;
  completedPartCount?: number;
  repairedPartCount?: number;
  html?: string;
  promptText?: string;
  promptChars?: number;
  qualityBar?: ArtifactQualityBar;
}

export interface BuildDocumentRuntimePartsInput {
  runPlan: ArtifactRunPlan;
  documentType: string;
  blueprintLabel: string;
  recommendedModules: string[];
  isEdit: boolean;
  qualityBar?: ArtifactQualityBar;
}

export interface CanRunQueuedDocumentRuntimeInput {
  runPlan?: ArtifactRunPlan;
  parts: ArtifactPart[];
  isEdit: boolean;
  hasImages: boolean;
}

export interface BuildDocumentRuntimeOutlinePromptInput {
  taskBrief: string;
  documentType: string;
  blueprintLabel: string;
  parts: ArtifactPart[];
  designFamily?: string;
  qualityBar?: ArtifactQualityBar;
}

export interface BuildDocumentRuntimeModulePromptInput {
  taskBrief: string;
  documentType: string;
  outline: string;
  part: ArtifactPart;
  designFamily?: string;
  existingModuleHtml?: string;
  qualityBar?: ArtifactQualityBar;
}

export interface BuildDocumentRuntimeModuleRepairPromptInput {
  taskBrief: string;
  documentType: string;
  part: ArtifactPart;
  issues: DocumentRuntimeModuleIssue[];
  designFamily?: string;
  existingModuleHtml?: string;
  qualityBar?: ArtifactQualityBar;
}

export interface AssembleDocumentRuntimeHtmlInput {
  title: string;
  outline: string;
  parts: ArtifactPart[];
  modules: DocumentRuntimeModuleDraft[];
}

export interface ResolveDocumentRuntimeEditModulesInput {
  existingHtml: string;
  targets: ResolvedTarget[];
  parts: ArtifactPart[];
}

export interface ApplyDocumentRuntimeModuleEditsInput {
  existingHtml: string;
  parts: ArtifactPart[];
  modules: DocumentRuntimeModuleDraft[];
}

export async function runDocumentRuntimeGeneration(
  input: RunDocumentRuntimeGenerationInput,
): Promise<DocumentRuntimeGenerationResult> {
  if (input.useQueuedDocumentEditRuntime) {
    input.onEvent({ type: 'progress', message: 'Updating targeted document modules…', pct: 30 });
    const draft = await input.runQueuedEdit();
    return {
      ...draft,
      usedQueuedDocumentEdit: true,
      runMode: 'queued-edit',
      completedPartCount: input.queuedEditModuleCount,
      selectedMode: 'queued-runtime-edit',
    };
  }

  if (input.useQueuedDocumentRuntime) {
    input.onEvent({ type: 'progress', message: 'Creating document outline and modules…', pct: 30 });
    const draft = await input.runQueuedCreate();
    return {
      ...draft,
      usedQueuedDocumentEdit: false,
      runMode: 'queued-create',
      completedPartCount: input.queuedCreatePartCount,
      selectedMode: 'queued-runtime',
    };
  }

  const draft = await input.runSingleStream();
  return {
    ...draft,
    usedQueuedDocumentEdit: false,
    runMode: 'single-stream',
    completedPartCount: 0,
    selectedMode: 'single-stream',
  };
}

function normalizeModuleTitle(value: string, index: number): string {
  const cleaned = value
    .replace(/[`*_#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return `Document module ${index + 1}`;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function resolveDocumentModuleRole(title: string, index: number): DocumentModuleRole {
  const normalized = title.toLowerCase();
  if (/\b(hero|opening|lead|thesis)\b/.test(normalized) || index === 0) return 'hero-summary';
  if (/\b(kpi|metric|score|proof|signal)\b/.test(normalized)) return 'kpi-proof';
  if (/\b(compare|comparison|versus|before|after|trade[- ]?off)\b/.test(normalized)) return 'comparison';
  if (/\b(timeline|roadmap|next|phase|sequence|milestone|action)\b/.test(normalized)) return 'timeline';
  if (/\b(recommend|decision|proposal|ask|next step)\b/.test(normalized)) return 'recommendation';
  if (/\b(sidebar|risk|watchout|constraint|note)\b/.test(normalized)) return 'sidebar';
  if (/\b(summary|brief|overview)\b/.test(normalized)) return 'executive-summary';
  return 'evidence';
}

function componentPatternForDocumentRole(role: DocumentModuleRole): string {
  switch (role) {
    case 'hero-summary':
    case 'executive-summary':
      return 'doc-sidebar-layout with doc-main and doc-aside';
    case 'kpi-proof':
      return 'doc-kpi-row with doc-kpi cards, or doc-proof-strip when the prompt has no numbers';
    case 'comparison':
      return 'doc-comparison with doc-compare-card lanes';
    case 'timeline':
      return 'doc-timeline with doc-timeline-item steps';
    case 'recommendation':
      return 'doc-proof-strip plus a concise recommendation paragraph';
    case 'sidebar':
      return 'doc-sidebar-layout with a compact doc-aside';
    case 'evidence':
      return 'doc-proof-strip, evidence table, or structured list';
  }
}

function evidenceRequirementForDocumentRole(role: DocumentModuleRole): string {
  switch (role) {
    case 'hero-summary':
      return 'State the thesis, audience impact, and one decision/recommendation in concrete language.';
    case 'executive-summary':
      return 'Summarize the core decision path with at least two grounded proof points.';
    case 'kpi-proof':
      return 'Use concrete metrics when provided; otherwise use labeled proof signals without inventing numbers.';
    case 'comparison':
      return 'Compare at least two options, states, audiences, or tradeoffs with a clear verdict.';
    case 'timeline':
      return 'Show ordered next steps or phases with ownership, timing, or dependency cues when available.';
    case 'recommendation':
      return 'Make one recommendation and support it with rationale, risk, and next action.';
    case 'sidebar':
      return 'Surface constraints, risks, assumptions, or watchouts that sharpen the main argument.';
    case 'evidence':
      return 'Include specific evidence, examples, source-derived labels, or structured reasoning from the task brief.';
  }
}

function visualRhythmForDocumentRole(role: DocumentModuleRole): string {
  switch (role) {
    case 'hero-summary':
      return 'Open with a strong lead paragraph, then use a compact side rail for decision/proof/action.';
    case 'executive-summary':
      return 'Use short paragraphs plus a scannable proof/recommendation band.';
    case 'kpi-proof':
      return 'Lead with the strongest signal and group proof into 2-4 compact cards.';
    case 'comparison':
      return 'Use parallel lanes and end with a concise bridge or verdict.';
    case 'timeline':
      return 'Use sequential steps with short labels; keep the rhythm vertical on mobile.';
    case 'recommendation':
      return 'Make the recommendation visually dominant, then add proof and action cues.';
    case 'sidebar':
      return 'Keep the side rail compact and subordinate to the main argument.';
    case 'evidence':
      return 'Break evidence into labeled chunks instead of a flat prose block.';
  }
}

function buildDocumentModuleBlueprint(input: {
  title: string;
  index: number;
  qualityBar?: ArtifactQualityBar;
}): DocumentModuleBlueprint {
  const role = resolveDocumentModuleRole(input.title, input.index);
  const minWords = input.qualityBar?.expectedDepth.minModuleWords ?? 90;
  const isPremium = input.qualityBar?.tier === 'premium';

  return {
    role,
    targetWordRange: {
      min: minWords,
      max: minWords + (isPremium ? 110 : 70),
    },
    evidenceRequirement: evidenceRequirementForDocumentRole(role),
    componentPattern: componentPatternForDocumentRole(role),
    visualRhythmInstruction: visualRhythmForDocumentRole(role),
  };
}

function formatDocumentModuleBlueprint(blueprint?: DocumentModuleBlueprint): string {
  if (!blueprint) return '';

  return [
    `Role: ${blueprint.role}`,
    `Target words: ${blueprint.targetWordRange.min}-${blueprint.targetWordRange.max}`,
    `Evidence: ${blueprint.evidenceRequirement}`,
    `Component pattern: ${blueprint.componentPattern}`,
    `Visual rhythm: ${blueprint.visualRhythmInstruction}`,
  ].join('\n');
}

function formatDocumentModuleLine(part: ArtifactPart, index: number): string {
  const blueprint = formatDocumentModuleBlueprint(part.documentModuleBlueprint);
  return blueprint
    ? `${index + 1}. ${part.title} [${part.id}]: ${part.brief}\n${blueprint.split('\n').map((line) => `   - ${line}`).join('\n')}`
    : `${index + 1}. ${part.title} [${part.id}]: ${part.brief}`;
}

export function buildDocumentRuntimeParts(input: BuildDocumentRuntimePartsInput): ArtifactPart[] {
  const targetModuleCount = input.qualityBar?.expectedDepth.minModules ?? 3;
  const defaultModules = [
    'hero summary',
    'KPI proof row',
    'comparison or evidence module',
    'next-step timeline',
  ];
  const modules = input.recommendedModules.length > 0
    ? input.qualityBar
      ? [
          ...input.recommendedModules,
          ...defaultModules.filter((module) => !input.recommendedModules.includes(module)),
        ].slice(0, Math.max(3, targetModuleCount))
      : input.recommendedModules.slice(0, 4)
    : input.qualityBar
      ? defaultModules.slice(0, Math.max(3, targetModuleCount))
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
    ...modules.map((module, index) => {
      const title = normalizeModuleTitle(module, index);
      return {
        id: `document-module-${index + 1}`,
        artifactType: 'document' as const,
        kind: 'document-module' as const,
        orderIndex: index + 1,
        title,
        brief: `${operation} a ${module} for the ${input.documentType} document.`,
        status: 'pending' as const,
        documentModuleBlueprint: buildDocumentModuleBlueprint({
          title,
          index,
          qualityBar: input.qualityBar,
        }),
      };
    }),
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
Use each module blueprint as a content budget: meet the role, target word range, evidence requirement, component pattern, and rhythm.

${documentParts.map((part, index) => formatDocumentModuleLine(part, index)).join('\n')}`;
}

function getDocumentModuleParts(parts: ArtifactPart[]): ArtifactPart[] {
  return parts
    .filter((part) => part.kind === 'document-module')
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function canRunQueuedDocumentRuntime(input: CanRunQueuedDocumentRuntimeInput): boolean {
  if (!input.runPlan) return false;
  if (input.isEdit) return false;
  if (input.runPlan.artifactType !== 'document') return false;
  if (input.runPlan.providerPolicy.generationGranularity !== 'part') return false;
  return getDocumentModuleParts(input.parts).length > 0;
}

export function buildDocumentRuntimeOutlinePrompt(input: BuildDocumentRuntimeOutlinePromptInput): string {
  const moduleParts = getDocumentModuleParts(input.parts);

  return [
    buildCoreArtifactContractPack(),
    buildDocumentIframeContractPack(),
    buildDocumentDesignFamilyPack({
      documentType: input.documentType,
      designFamily: input.designFamily,
      blueprintLabel: input.blueprintLabel,
    }),
    buildQualityBarContractPack(input.qualityBar),
    `## CONTENT BLUEPRINT TASK

Create the runtime content blueprint for this ${input.documentType} document.

Required modules:
${moduleParts.map((part, index) => formatDocumentModuleLine(part, index)).join('\n')}

Task brief:
${input.taskBrief}

Return only a compact content blueprint in markdown:
- one document thesis sentence
- one bullet per required module with the module role, evidence angle, and intended component rhythm
- if images were provided, use them only to infer structure, evidence, labels, or visual emphasis
- no CSS, no full HTML document, no external assets`,
  ].join('\n\n');
}

export function buildDocumentRuntimeModulePrompt(input: BuildDocumentRuntimeModulePromptInput): string {
  return [
    buildCoreArtifactContractPack(),
    buildDocumentIframeContractPack(),
    buildDocumentDesignFamilyPack({
      documentType: input.documentType,
      designFamily: input.designFamily,
    }),
    buildQualityBarContractPack(input.qualityBar),
    `## MODULE TASK

Task brief:
${input.taskBrief}

Runtime part id: ${input.part.id}
Runtime part title: ${input.part.title}
Runtime part brief: ${input.part.brief}
${input.part.documentModuleBlueprint ? `\nRuntime module blueprint:\n${formatDocumentModuleBlueprint(input.part.documentModuleBlueprint)}` : ''}

Outline:
${input.outline}

${input.existingModuleHtml ? `Existing module to edit:
\`\`\`html
${input.existingModuleHtml}
\`\`\`

preserve the useful structure of this existing module while applying the requested edit.` : 'Create the module from the outline and task brief.'}

${buildDocumentModuleContractPack({ partId: input.part.id })}`,
  ].join('\n\n');
}

export function buildDocumentRuntimeModuleRepairPrompt(input: BuildDocumentRuntimeModuleRepairPromptInput): string {
  return [
    buildCoreArtifactContractPack(),
    buildDocumentIframeContractPack(),
    buildDocumentDesignFamilyPack({
      documentType: input.documentType,
      designFamily: input.designFamily,
    }),
    buildQualityBarContractPack(input.qualityBar),
    buildValidatorFeedbackPack(input.issues.map((issue) => `${issue.severity}: ${issue.summary}`)),
    `## MODULE REPAIR TASK

Repair one failed document module fragment.

Task brief:
${input.taskBrief}

Runtime part id: ${input.part.id}
Runtime part title: ${input.part.title}
Runtime part brief: ${input.part.brief}
${input.part.documentModuleBlueprint ? `\nRuntime module blueprint:\n${formatDocumentModuleBlueprint(input.part.documentModuleBlueprint)}` : ''}

${input.existingModuleHtml ? `Existing module:
\`\`\`html
${input.existingModuleHtml}
\`\`\`` : 'The module is missing and must be created from the runtime part brief.'}

${buildDocumentModuleContractPack({ partId: input.part.id, repair: true })}`,
  ].join('\n\n');
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreTextOverlap(a: string, b: string): number {
  const aTokens = new Set(normalizeText(a).split(' ').filter((token) => token.length >= 4));
  const bTokens = new Set(normalizeText(b).split(' ').filter((token) => token.length >= 4));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.min(aTokens.size, bTokens.size);
}

export function resolveDocumentRuntimeEditModules(
  input: ResolveDocumentRuntimeEditModulesInput,
): DocumentRuntimeEditModuleMatch[] {
  const moduleParts = getDocumentModuleParts(input.parts);
  if (moduleParts.length === 0 || input.targets.length === 0) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(input.existingHtml, 'text/html');
  const matches = new Map<string, DocumentRuntimeEditModuleMatch>();
  const targetText = input.targets
    .map((target) => `${target.label} ${target.matchedText ?? ''} ${target.selector.value ?? ''}`)
    .join(' ');

  for (const part of moduleParts) {
    const element = findRuntimePartElement(doc, part.id);
    if (!element) continue;

    const existingText = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    const titleMatch = normalizeText(targetText).includes(normalizeText(part.title));
    const textMatch = scoreTextOverlap(targetText, existingText) >= 0.35;
    const blockMatch = input.targets.some((target) => {
      if (!target.blockId) return false;
      const targetElement = doc.body.querySelector<HTMLElement>(`[data-aura-block-id="${target.blockId}"]`);
      return !!targetElement && (element.contains(targetElement) || targetElement.contains(element));
    });

    if (titleMatch || textMatch || blockMatch) {
      matches.set(part.id, {
        part,
        existingHtml: element.outerHTML,
        existingText,
      });
    }
  }

  return Array.from(matches.values()).sort((a, b) => a.part.orderIndex - b.part.orderIndex);
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
  const moduleIssues: DocumentRuntimeModuleIssue[] = [];

  for (const part of moduleParts) {
    const element = findRuntimePartElement(doc, part.id);
    if (!element) {
      missingCount += 1;
      moduleIssues.push({
        partId: part.id,
        title: part.title,
        severity: 'blocking',
        reason: 'missing',
        summary: `${part.title} is missing its runtime module wrapper.`,
      });
      continue;
    }

    if ((element.textContent ?? '').replace(/\s+/g, ' ').trim().length < 24) {
      emptyCount += 1;
      moduleIssues.push({
        partId: part.id,
        title: part.title,
        severity: 'blocking',
        reason: 'empty',
        summary: `${part.title} is present but too empty to be useful.`,
      });
    }

    if (!element.querySelector('h2, h3, h4')) {
      headinglessCount += 1;
      moduleIssues.push({
        partId: part.id,
        title: part.title,
        severity: 'advisory',
        reason: 'headingless',
        summary: `${part.title} is missing a module heading.`,
      });
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
    ...(moduleIssues.length > 0 ? { moduleIssues } : {}),
  };
}

export function buildDocumentRuntimeTelemetry(
  input: BuildDocumentRuntimeTelemetryInput,
): ArtifactRuntimeTelemetry {
  const qualityTelemetry = input.html
    ? buildDocumentQualityTelemetry({
        html: input.html,
        promptText: input.promptText,
        promptChars: input.promptChars,
        qualityBar: input.qualityBar,
      })
    : {};

  return {
    ...(typeof input.firstPreviewAtMs === 'number'
      ? { timeToFirstPreviewMs: Math.round(input.firstPreviewAtMs - input.runtimeStartMs) }
      : {}),
    totalRuntimeMs: Math.round(input.nowMs - input.runtimeStartMs),
    validationPassed: input.validation.passed,
    validationBlockingCount: input.validation.blockingCount,
    validationAdvisoryCount: input.validation.advisoryCount,
    repairCount: input.repairCount,
    ...(input.runMode ? { runMode: input.runMode } : {}),
    ...(typeof input.queuedPartCount === 'number' ? { queuedPartCount: input.queuedPartCount } : {}),
    ...(typeof input.completedPartCount === 'number' ? { completedPartCount: input.completedPartCount } : {}),
    ...(typeof input.repairedPartCount === 'number' ? { repairedPartCount: input.repairedPartCount } : {}),
    ...qualityTelemetry,
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
  style.textContent = DOCUMENT_RUNTIME_SHELL_CSS;
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

function normalizeDocumentText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function extractDocumentQualitySnippets(doc: Document): string[] {
  const candidates = Array.from(doc.body.querySelectorAll<HTMLElement>('p, li, td, th'))
    .map((element) => normalizeDocumentText(element.textContent))
    .filter((text) => text.length >= 36);

  return Array.from(new Set(candidates))
    .slice(0, 6)
    .map((text) => text.length > 170 ? `${text.slice(0, 167).trim()}...` : text);
}

function hasDocumentQualityRhythm(doc: Document, selector: string): boolean {
  return Boolean(doc.body.querySelector(selector));
}

function appendDocumentProofStrip(doc: Document, root: HTMLElement, snippets: string[]): boolean {
  if (hasDocumentQualityRhythm(doc, '.doc-proof-strip, .doc-kpi-row, .doc-kpi-grid, .doc-kpi')) {
    return false;
  }
  if (snippets.length === 0) return false;

  const section = doc.createElement('section');
  section.className = 'doc-section doc-runtime-quality-polish';
  section.setAttribute('data-runtime-polish', 'proof-strip');
  const heading = doc.createElement('h2');
  heading.textContent = 'Evidence Summary';
  section.append(heading);

  const strip = doc.createElement('div');
  strip.className = 'doc-proof-strip';
  for (const [index, snippet] of snippets.slice(0, 3).entries()) {
    const item = doc.createElement('article');
    item.className = 'doc-proof-item';
    const label = doc.createElement('strong');
    label.textContent = index === 0 ? 'Primary signal' : index === 1 ? 'Supporting signal' : 'Decision cue';
    const copy = doc.createElement('span');
    copy.textContent = snippet;
    item.append(label, copy);
    strip.append(item);
  }
  section.append(strip);
  root.append(section);
  return true;
}

function appendDocumentTimeline(doc: Document, root: HTMLElement, snippets: string[]): boolean {
  if (hasDocumentQualityRhythm(doc, '.doc-timeline, .doc-comparison, table')) {
    return false;
  }
  if (snippets.length < 2) return false;

  const section = doc.createElement('section');
  section.className = 'doc-section doc-runtime-quality-polish';
  section.setAttribute('data-runtime-polish', 'timeline');
  const heading = doc.createElement('h2');
  heading.textContent = 'Action Rhythm';
  section.append(heading);

  const timeline = doc.createElement('div');
  timeline.className = 'doc-timeline';
  for (const [index, snippet] of snippets.slice(0, 3).entries()) {
    const item = doc.createElement('article');
    item.className = 'doc-timeline-item';
    const label = doc.createElement('strong');
    label.textContent = index === 0 ? 'Now' : index === 1 ? 'Next' : 'Then';
    const copy = doc.createElement('span');
    copy.textContent = snippet;
    item.append(label, copy);
    timeline.append(item);
  }
  section.append(timeline);
  root.append(section);
  return true;
}

function appendDocumentRecommendation(doc: Document, root: HTMLElement, snippets: string[]): boolean {
  if (hasDocumentQualityRhythm(doc, '.doc-recommendation, .doc-executive-callout')) {
    return false;
  }
  const [primary, secondary] = snippets;
  if (!primary) return false;

  const section = doc.createElement('section');
  section.className = 'doc-section doc-runtime-quality-polish';
  section.setAttribute('data-runtime-polish', 'recommendation');
  const heading = doc.createElement('h2');
  heading.textContent = 'Recommendation';
  const callout = doc.createElement('div');
  callout.className = 'doc-recommendation';
  const label = doc.createElement('strong');
  label.textContent = 'Recommended direction';
  const copy = doc.createElement('p');
  copy.textContent = secondary
    ? `${primary} ${secondary}`
    : primary;
  callout.append(label, copy);
  section.append(heading, callout);
  root.append(section);
  return true;
}

function appendDocumentEvidenceTable(doc: Document, root: HTMLElement, snippets: string[]): boolean {
  if (hasDocumentQualityRhythm(doc, '.doc-evidence-table, table, .doc-comparison')) {
    return false;
  }
  if (snippets.length < 2) return false;

  const section = doc.createElement('section');
  section.className = 'doc-section doc-runtime-quality-polish';
  section.setAttribute('data-runtime-polish', 'evidence-table');
  const heading = doc.createElement('h2');
  heading.textContent = 'Evidence Table';
  const table = doc.createElement('table');
  table.className = 'doc-evidence-table';
  const thead = doc.createElement('thead');
  thead.innerHTML = '<tr><th>Signal</th><th>Implication</th></tr>';
  const tbody = doc.createElement('tbody');
  for (const [index, snippet] of snippets.slice(0, 3).entries()) {
    const row = doc.createElement('tr');
    const signalCell = doc.createElement('td');
    signalCell.textContent = index === 0 ? 'Core evidence' : index === 1 ? 'Supporting context' : 'Action cue';
    const implicationCell = doc.createElement('td');
    implicationCell.textContent = snippet;
    row.append(signalCell, implicationCell);
    tbody.append(row);
  }
  table.append(thead, tbody);
  section.append(heading, table);
  root.append(section);
  return true;
}

export function polishDocumentRuntimeQuality(input: {
  html: string;
  title: string;
}): DocumentRuntimeRepairResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input.html, 'text/html');
  const before = serializeDocumentRuntimeHtml(doc);

  stripUnsupportedDocumentNodes(doc);
  ensureDocumentRuntimeTitle(doc, input.title);
  wrapLooseDocumentBody(doc);
  ensureDocumentRuntimeStyle(doc);

  const root = getDocumentModuleRoot(doc);
  const snippets = extractDocumentQualitySnippets(doc);
  let changed = false;
  changed = appendDocumentProofStrip(doc, root, snippets) || changed;
  changed = appendDocumentTimeline(doc, root, snippets) || changed;
  changed = appendDocumentRecommendation(doc, root, snippets) || changed;
  changed = appendDocumentEvidenceTable(doc, root, snippets) || changed;

  const html = serializeDocumentRuntimeHtml(doc);
  const repaired = changed && html.trim() !== before.trim();
  const validation = validateDocumentRuntimeOutput(html);

  return {
    html,
    repairCount: repaired ? 1 : 0,
    repaired,
    validation,
    summary: repaired
      ? 'Deterministic document quality polish added evidence rhythm modules.'
      : 'Deterministic document quality polish found no safe content-derived enrichment.',
  };
}

function findDocumentModuleCandidates(doc: Document): HTMLElement[] {
  const selector = DOCUMENT_RUNTIME_MODULE_CANDIDATE_SELECTORS.join(', ');
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
  section.className = getDocumentRuntimeModuleWrapperClassName();
  section.setAttribute('data-runtime-part', part.id);
  ensureDocumentModuleHeading(doc, section, part);
  ensureDocumentModuleBody(doc, section, part);
  return section;
}

function escapeDocumentText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function outlineToHtml(outline: string): string {
  const lines = outline
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 8);

  if (lines.length === 0) return '<p>Document outline.</p>';

  const [summary, ...items] = lines;
  const list = items.length > 0
    ? `<ul>${items.map((item) => `<li>${escapeDocumentText(item)}</li>`).join('')}</ul>`
    : '';
  return `<p>${escapeDocumentText(summary ?? 'Document outline.')}</p>${list}`;
}

function normalizeDocumentRuntimeModuleHtml(html: string, part: ArtifactPart): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  stripUnsupportedDocumentNodes(doc);
  doc.querySelectorAll('style').forEach((node) => node.remove());

  const existing = findRuntimePartElement(doc, part.id);
  const candidate = existing
    ?? doc.body.querySelector<HTMLElement>('section, article, div')
    ?? createDocumentModuleShell(doc, part);

  const wrapper = doc.createElement('section');
  wrapper.className = getDocumentRuntimeModuleWrapperClassName(candidate.classList);
  wrapper.setAttribute('data-runtime-part', part.id);
  wrapper.innerHTML = candidate.innerHTML.trim() || `<p>${escapeDocumentText(part.brief)}</p>`;

  ensureDocumentModuleHeading(doc, wrapper, part);
  ensureDocumentModuleBody(doc, wrapper, part);
  return wrapper.outerHTML;
}

export function assembleDocumentRuntimeHtml(input: AssembleDocumentRuntimeHtmlInput): string {
  const moduleParts = getDocumentModuleParts(input.parts);
  const moduleMap = new Map(input.modules.map((module) => [module.partId, module.html]));
  const modulesHtml = moduleParts
    .map((part) => normalizeDocumentRuntimeModuleHtml(moduleMap.get(part.id) ?? '', part))
    .join('\n');

  return `<main class="doc-shell">
  <header class="doc-header">
    <h1>${escapeDocumentText(input.title || 'Document')}</h1>
  </header>
  <section class="doc-section doc-runtime-outline" data-runtime-part="document-outline">
    <h2>Outline</h2>
    ${outlineToHtml(input.outline)}
  </section>
  ${modulesHtml}
</main>`;
}

export function applyDocumentRuntimeModuleEdits(input: ApplyDocumentRuntimeModuleEditsInput): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input.existingHtml, 'text/html');
  const moduleMap = new Map(input.modules.map((module) => [module.partId, module.html]));
  const root = getDocumentModuleRoot(doc);

  for (const part of getDocumentModuleParts(input.parts)) {
    const moduleHtml = moduleMap.get(part.id);
    if (!moduleHtml) continue;

    const existingElement = findRuntimePartElement(doc, part.id);
    const template = doc.createElement('template');
    template.innerHTML = normalizeDocumentRuntimeModuleHtml(moduleHtml, part);
    const replacement = template.content.firstElementChild;
    if (replacement instanceof HTMLElement) {
      if (existingElement) {
        existingElement.replaceWith(replacement);
      } else {
        root.append(replacement);
      }
    }
  }

  return serializeDocumentRuntimeHtml(doc);
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

export async function repairDocumentRuntimeStructure(
  input: RepairDocumentRuntimeStructureInput,
): Promise<DocumentRuntimeStructureRepairResult> {
  let html = input.html;
  let moduleRepairCount = 0;
  let repairedPartCount = 0;

  const finalized = finalizeDocumentRuntimeHtml({
    html,
    title: input.title,
  });
  if (finalized.changed) {
    html = input.sanitizeHtml(finalized.html);
  }

  let validation = validateDocumentRuntimeModules(html, input.parts);
  if (!validation.passed) {
    input.onEvent({ type: 'progress', message: validation.summary, pct: 82 });
    const queuedModuleRepair = await input.runQueuedModuleRepair({
      html,
      validation,
    });

    if (queuedModuleRepair.repaired) {
      html = input.sanitizeHtml(queuedModuleRepair.html);
      moduleRepairCount += queuedModuleRepair.repairCount;
      repairedPartCount += queuedModuleRepair.repairedPartCount;
      validation = queuedModuleRepair.validation;
      input.onEvent({ type: 'progress', message: queuedModuleRepair.summary, pct: 84 });
    }

    if (!validation.passed) {
      const moduleRepair = repairDocumentRuntimeModules({
        html,
        parts: input.parts,
        validation,
        runPlan: input.runPlan,
        onEvent: input.onEvent,
      });
      if (moduleRepair.repaired) {
        html = input.sanitizeHtml(moduleRepair.html);
        moduleRepairCount += moduleRepair.repairCount;
        repairedPartCount += validation.moduleIssues
          ? new Set(validation.moduleIssues.map((issue) => issue.partId)).size
          : 0;
        validation = moduleRepair.validation;
        input.onEvent({ type: 'progress', message: moduleRepair.summary, pct: 84 });
      }
    }
  }

  return {
    html,
    validation,
    moduleRepairCount,
    repairedPartCount,
    finalizedChanged: finalized.changed,
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

export async function runDocumentRuntimeOrchestrator(
  input: RunDocumentRuntimeOrchestratorInput,
): Promise<DocumentRuntimeOrchestratorResult> {
  let generation: DocumentRuntimeGenerationResult | undefined;

  try {
    generation = await runDocumentRuntimeGeneration(input.generation);
  } finally {
    input.stopGenerationHeartbeat?.();
  }

  if (!generation) {
    throw new Error('Document runtime generation did not produce a draft.');
  }

  input.onGenerationComplete?.(generation);
  input.onEvent({ type: 'progress', message: 'Structuring document…', pct: 72 });
  input.onEvent({ type: 'progress', message: 'Sanitizing content…', pct: 84 });

  let finalHtml = input.prepareGeneratedHtml(generation.renderedHtml);
  let editingTelemetry: EditingTelemetry | undefined;
  let editFallbackRepairCount = 0;

  if (generation.usedQueuedDocumentEdit && input.buildQueuedEditTelemetry) {
    editingTelemetry = input.buildQueuedEditTelemetry(finalHtml);
  } else if (input.applyFallbackEdit) {
    const fallbackEdit = input.applyFallbackEdit(finalHtml);
    finalHtml = fallbackEdit.html;
    editingTelemetry = fallbackEdit.editing;
    editFallbackRepairCount = fallbackEdit.repairCount ?? 0;
  }

  const title = input.resolveTitle(finalHtml);
  const structureRepair = await repairDocumentRuntimeStructure({
    html: finalHtml,
    title,
    parts: input.parts,
    runPlan: input.runPlan,
    onEvent: input.onEvent,
    sanitizeHtml: input.sanitizeHtml,
    runQueuedModuleRepair: input.runQueuedModuleRepair,
  });
  finalHtml = structureRepair.html;

  const sourceMarkdown = input.buildSourceMarkdown(generation.rawContent, finalHtml);

  input.onEvent({
    type: 'step-done',
    stepId: 'generate',
    label: input.isEdit ? 'Updating document…' : 'Writing document…',
  });
  emitArtifactRunEvent(input.onEvent, {
    runId: input.runPlan?.runId ?? 'document-runtime',
    type: 'runtime.part-completed',
    role: 'generator',
    message: input.isEdit ? 'Updated document part' : 'Wrote document part',
    partId: 'generate',
    pct: 80,
  });

  input.onEvent({ type: 'step-start', stepId: 'qa', label: 'Checking document quality…' });
  emitArtifactRunEvent(input.onEvent, {
    runId: input.runPlan?.runId ?? 'document-runtime',
    type: 'runtime.validation-started',
    role: 'validator',
    message: 'Checking document quality...',
    partId: 'qa',
    pct: 84,
  });

  let qaResult = validateDocumentRuntimeOutput(finalHtml);
  input.onEvent({
    type: 'progress',
    message: qaResult.summary,
    pct: 88,
  });
  const qaRepair = await repairDocumentRuntimeOutput({
    html: finalHtml,
    title,
    validation: qaResult,
    runPlan: input.runPlan,
    onEvent: input.onEvent,
  });
  if (qaRepair.repaired) {
    finalHtml = input.sanitizeHtml(qaRepair.html);
    qaResult = qaRepair.validation;
    input.onEvent({ type: 'progress', message: qaRepair.summary, pct: 92 });
  }

  let qualityPolishDecision: ArtifactQualityPolishDecision | undefined;
  let qualityPolishAction: ArtifactRuntimeTelemetry['qualityPolishAction'] | undefined;
  let deterministicQualityPolishAttemptCount = 0;
  let deterministicQualityPolishRepairCount = 0;
  let llmQualityPolishAttemptCount = 0;
  let llmQualityPolishRepairCount = 0;
  const llmPolishAvailable = Boolean(input.runQualityLlmPolish);
  let qualityPolishStepStarted = false;

  const startQualityPolishStep = () => {
    if (qualityPolishStepStarted || !input.runPlan) return;
    qualityPolishStepStarted = true;
    input.onEvent({ type: 'step-start', stepId: 'quality-polish', label: 'Polishing quality…' });
    emitArtifactRunEvent(input.onEvent, {
      runId: input.runPlan.runId,
      type: 'runtime.repair-started',
      role: 'repairer',
      message: 'Polishing document quality...',
      partId: 'quality-polish',
      pct: 92,
    });
  };

  const finishQualityPolishStep = (message: string) => {
    if (!qualityPolishStepStarted || !input.runPlan) return;
    input.onEvent({ type: 'step-done', stepId: 'quality-polish', label: 'Polishing quality…' });
    emitArtifactRunEvent(input.onEvent, {
      runId: input.runPlan.runId,
      type: 'runtime.repair-completed',
      role: 'repairer',
      message,
      partId: 'quality-polish',
      pct: 95,
    });
  };

  if (input.runPlan?.qualityBar) {
    const prePolishQuality = buildDocumentQualityTelemetry({
      html: finalHtml,
      promptText: input.promptText,
      qualityBar: input.runPlan.qualityBar,
    });
    qualityPolishDecision = decideArtifactQualityPolish({
      qualityBar: input.runPlan.qualityBar,
      validationPassed: qaResult.passed,
      validationBlockingCount: qaResult.blockingCount,
      qualityPassed: prePolishQuality.qualityPassed,
      qualityScore: prePolishQuality.qualityScore,
      qualityBlockingCount: prePolishQuality.qualityBlockingCount,
      deterministicPolishAvailable: true,
      llmPolishAvailable,
    });
    qualityPolishAction = qualityPolishDecision.action;

    if (qualityPolishDecision.shouldPolish && qualityPolishDecision.action === 'deterministic-polish') {
      startQualityPolishStep();

      const polish = polishDocumentRuntimeQuality({
        html: finalHtml,
        title,
      });
      deterministicQualityPolishAttemptCount = 1;
      if (polish.repaired) {
        finalHtml = input.sanitizeHtml(polish.html);
        qaResult = polish.validation;
        deterministicQualityPolishRepairCount = polish.repairCount;
        input.onEvent({ type: 'progress', message: polish.summary, pct: 94 });
      }

      const postPolishQuality = buildDocumentQualityTelemetry({
        html: finalHtml,
        promptText: input.promptText,
        qualityBar: input.runPlan.qualityBar,
      });
      qualityPolishDecision = decideArtifactQualityPolish({
        qualityBar: input.runPlan.qualityBar,
        validationPassed: qaResult.passed,
        validationBlockingCount: qaResult.blockingCount,
        qualityPassed: postPolishQuality.qualityPassed,
        qualityScore: postPolishQuality.qualityScore,
        qualityBlockingCount: postPolishQuality.qualityBlockingCount,
        deterministicPolishCount: deterministicQualityPolishAttemptCount,
        deterministicPolishAvailable: true,
        llmPolishAvailable,
      });
      qualityPolishAction = polish.repaired ? 'deterministic-polish' : qualityPolishDecision.action;
    }

    if (
      qualityPolishDecision.shouldPolish &&
      qualityPolishDecision.action === 'llm-polish' &&
      input.runQualityLlmPolish
    ) {
      startQualityPolishStep();
      const qualityBeforeLlm = buildDocumentQualityTelemetry({
        html: finalHtml,
        promptText: input.promptText,
        qualityBar: input.runPlan.qualityBar,
      });
      const llmPolish = await input.runQualityLlmPolish({
        html: finalHtml,
        title,
        qualityDecision: qualityPolishDecision,
      });
      llmQualityPolishAttemptCount = 1;
      qualityPolishAction = 'llm-polish';

      const polishedHtml = input.sanitizeHtml(llmPolish.html);
      const polishedOutputValidation = validateDocumentRuntimeOutput(polishedHtml);
      const polishedModuleValidation = validateDocumentRuntimeModules(polishedHtml, input.parts);
      const qualityAfterLlm = buildDocumentQualityTelemetry({
        html: polishedHtml,
        promptText: input.promptText,
        qualityBar: input.runPlan.qualityBar,
      });
      const beforeScore = qualityBeforeLlm.qualityScore ?? 0;
      const afterScore = qualityAfterLlm.qualityScore ?? 0;

      if (
        llmPolish.repaired &&
        polishedOutputValidation.passed &&
        polishedModuleValidation.passed &&
        afterScore >= beforeScore
      ) {
        finalHtml = polishedHtml;
        qaResult = polishedOutputValidation;
        llmQualityPolishRepairCount = Math.max(1, llmPolish.repairCount);
        input.onEvent({ type: 'progress', message: llmPolish.summary, pct: 96 });
      } else {
        const rejectionReason = !polishedOutputValidation.passed
          ? polishedOutputValidation.summary
          : !polishedModuleValidation.passed
            ? polishedModuleValidation.summary
            : `quality score would change from ${beforeScore} to ${afterScore}.`;
        input.onEvent({
          type: 'progress',
          message: `Bounded document quality enrichment was discarded because ${rejectionReason}`,
          pct: 96,
        });
      }

      const postLlmQuality = buildDocumentQualityTelemetry({
        html: finalHtml,
        promptText: input.promptText,
        qualityBar: input.runPlan.qualityBar,
      });
      qualityPolishDecision = decideArtifactQualityPolish({
        qualityBar: input.runPlan.qualityBar,
        validationPassed: qaResult.passed,
        validationBlockingCount: qaResult.blockingCount,
        qualityPassed: postLlmQuality.qualityPassed,
        qualityScore: postLlmQuality.qualityScore,
        qualityBlockingCount: postLlmQuality.qualityBlockingCount,
        deterministicPolishCount: deterministicQualityPolishAttemptCount,
        llmPolishCount: llmQualityPolishAttemptCount,
        deterministicPolishAvailable: true,
        llmPolishAvailable,
      });
    }

    finishQualityPolishStep(qualityPolishDecision.reason);
  }

  input.onEvent({ type: 'step-done', stepId: 'qa', label: 'Checking document quality…' });
  emitArtifactRunEvent(input.onEvent, {
    runId: input.runPlan?.runId ?? 'document-runtime',
    type: 'runtime.validation-completed',
    role: 'validator',
    message: 'Checking document quality...',
    partId: 'qa',
    pct: 90,
  });

  input.onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing document…' });

  const runMode = generation.runMode;
  const runtime = buildDocumentRuntimeTelemetry({
    runtimeStartMs: input.runtimeStartMs,
    nowMs: input.nowMs(),
    validation: qaResult,
    repairCount: structureRepair.moduleRepairCount + qaRepair.repairCount + editFallbackRepairCount + deterministicQualityPolishRepairCount + llmQualityPolishRepairCount,
    runMode,
    queuedPartCount: runMode === 'queued-create'
      ? input.generation.queuedCreatePartCount
      : runMode === 'queued-edit'
        ? input.generation.queuedEditModuleCount
        : 0,
    completedPartCount: generation.completedPartCount,
    repairedPartCount: structureRepair.repairedPartCount,
    html: finalHtml,
    promptText: input.promptText,
    qualityBar: input.runPlan?.qualityBar,
    ...(generation.firstPreviewAt ? { firstPreviewAtMs: generation.firstPreviewAt } : {}),
  });
  if (qualityPolishDecision) {
    runtime.qualityDecision = qualityPolishDecision.status;
    runtime.qualityPolishAction = qualityPolishAction ?? qualityPolishDecision.action;
    if (qualityPolishDecision.action !== 'skipped-excellent') {
      runtime.qualityPolishingSkippedReason = qualityPolishDecision.reason;
    }
  }

  input.onEvent({ type: 'step-done', stepId: 'finalize', label: 'Finalizing document…' });
  emitArtifactRunEvent(input.onEvent, {
    runId: input.runPlan?.runId ?? 'document-runtime',
    type: 'runtime.finalized',
    role: 'finalizer',
    message: 'Finalizing document...',
    partId: 'finalize',
    pct: 100,
  });
  input.onEvent({
    type: 'progress',
    message: input.finalProgressMessage ?? 'Done!',
    pct: 100,
  });

  return {
    html: finalHtml,
    markdown: sourceMarkdown,
    title,
    runtime,
    generation,
    ...(editingTelemetry ? { editing: editingTelemetry } : {}),
  };
}
