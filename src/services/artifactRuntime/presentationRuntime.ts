import type { LanguageModel } from 'ai';

import { runBatchQueue } from '@/services/ai/workflow/batchQueue';
import type { BatchQueueResult } from '@/services/ai/workflow/batchQueue';
import { design, designEdit } from '@/services/ai/workflow/agents/designer';
import { plan } from '@/services/ai/workflow/agents/planner';
import { validateSlides, type QAViolation } from '@/services/ai/workflow/agents/qa-validator';
import { evaluateAndRevise } from '@/services/ai/workflow/agents/evaluator';
import { sanitizeSlideHtml } from '@/services/ai/utils/sanitizeHtml';
import { sanitizeInnerHtml } from '@/services/html/sanitizer';
import { emitArtifactRunEvent } from '@/services/artifactRuntime/events';
import { resolvePresentationStyleSystem } from '@/services/artifactRuntime/presentationStyleSystem';
import {
  isScaffoldedPresentationRun,
  resolveScaffoldForRunPlan,
  runScaffoldedPresentationEditRuntime,
  runScaffoldedPresentationQueue,
  validateScaffoldedDeck,
  type ScaffoldValidationResult,
} from '@/services/presentationScaffolds';
import {
  isEditorialStagePresentationRun,
  runEditorialStagePresentationEditRuntime,
  runEditorialStagePresentationQueue,
} from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/runtime';
import {
  EDITORIAL_STAGE_PACK_ID,
  normalizeEditorialStageSource,
} from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/sourceOps';
import type { EditorialStageSource } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/schemas';
import {
  applyArtifactRunPlanToPresentationPlan,
  buildSlideBriefsFromRunPlan,
} from '@/services/artifactRuntime/presentation';
import {
  buildPresentationQualityChecklist,
  buildPresentationQualityTelemetry,
  collectPresentationNamedFailures,
} from '@/services/artifactRuntime/presentationQualityChecklist';
import { decideArtifactQualityPolish, type ArtifactQualityPolishDecision } from '@/services/artifactRuntime/qualityDecision';
import { useSettingsStore } from '@/stores/settingsStore';
import { aiDebugLog, logEditingMetrics, toErrorInfo } from '@/services/ai/debug';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';
import type {
  ArtifactRuntimeTelemetry,
  EventListener,
  PresentationInput,
  PresentationOutput,
} from '@/services/ai/workflow/types';
import type { TemplateGuidanceProfile } from '@/services/artifactRuntime/types';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';
import type { ArtifactValidationReport } from '@/services/artifactPacks';

export interface PresentationRuntimeValidationResult {
  passed: boolean;
  blockingCount: number;
  advisoryCount: number;
  summary: string;
  validationByPart: NonNullable<ArtifactRuntimeTelemetry['validationByPart']>;
}

export interface PresentationRuntimeRepairResult {
  html: string;
  repairCount: number;
  repairedPartCount?: number;
  repaired: boolean;
  summary: string;
  validation?: PresentationRuntimeValidationResult;
  llmRepairRequested?: boolean;
  llmRepairExecuted?: boolean;
}

export interface QueuedPresentationSlideRepairResult {
  html: string;
  repairCount: number;
  repairedPartCount: number;
  repaired: boolean;
  validationByPart: NonNullable<ArtifactRuntimeTelemetry['validationByPart']>;
}

export interface QueuedPresentationRuntimeOptions {
  runPlan?: ArtifactRunPlan;
  planResult: PlanResult;
  model: LanguageModel;
  input: PresentationInput;
  onEvent: EventListener;
  isEdit: boolean;
  guidanceProfile?: TemplateGuidanceProfile;
  signal?: AbortSignal;
  planningDurationMs?: number;
}

export interface PresentationRuntimeOrchestratorOptions {
  model: LanguageModel;
  input: PresentationInput;
  onEvent: EventListener;
  editCorrectionPolicy: SinglePresentationRuntimeOptions['editCorrectionPolicy'];
  skipSecondaryEvaluation: boolean;
  signal?: AbortSignal;
  planningDurationMs?: number;
}

export interface StaticPresentationRuntimeFinalizeInput {
  rawHtml: string;
  title: string;
  slideCount: number;
  runPlan?: ArtifactRunPlan;
}

export interface SinglePresentationRuntimeOptions {
  runPlan?: ArtifactRunPlan;
  planResult: PlanResult;
  model: LanguageModel;
  input: PresentationInput;
  onEvent: EventListener;
  isEdit: boolean;
  effectiveChatHistory: PresentationInput['chatHistory'];
  guidanceProfile?: TemplateGuidanceProfile;
  editCorrectionPolicy?: {
    mode: 'full' | 'best-effort';
    maxCorrectionSteps: number;
  };
  skipSecondaryEvaluation: boolean;
  signal?: AbortSignal;
  planningDurationMs?: number;
}

function startProgressHeartbeat(opts: {
  onEvent: EventListener;
  startPct: number;
  maxPct: number;
  intervalMs?: number;
  messages: string[];
}): () => void {
  const { onEvent, startPct, maxPct, intervalMs = 8000, messages } = opts;
  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    const pct = Math.min(maxPct, startPct + (tick * 6));
    const message = messages[Math.min(tick - 1, messages.length - 1)] ?? messages[messages.length - 1] ?? 'Working...';
    onEvent({ type: 'progress', message, pct });
  }, intervalMs);

  return () => clearInterval(timer);
}

function applyQualityDecisionTelemetry(
  runtime: ArtifactRuntimeTelemetry,
  decision: ArtifactQualityPolishDecision | undefined,
  action?: ArtifactRuntimeTelemetry['qualityPolishAction'],
): ArtifactRuntimeTelemetry {
  if (!decision) return runtime;
  return {
    ...runtime,
    qualityDecision: decision.status,
    qualityPolishAction: action ?? decision.action,
    ...(decision.action !== 'skipped-excellent'
      ? { qualityPolishingSkippedReason: decision.reason }
      : {}),
  };
}

function maxRuntimeRepairPasses(runPlan?: ArtifactRunPlan): number {
  return runPlan?.metricsBudget.maxRepairPasses ?? runPlan?.providerPolicy.maxRepairPasses ?? 0;
}

function maxRuntimeToolLoopSteps(
  runPlan: ArtifactRunPlan | undefined,
  fallback: number,
): number {
  return runPlan?.metricsBudget.maxToolLoopSteps ?? fallback;
}

function canStartOptionalLlmPolish(input: {
  runPlan?: ArtifactRunPlan;
  usedPasses?: number;
  runtimeStartMs?: number;
}): boolean {
  const maxPasses = input.runPlan?.metricsBudget.maxOptionalPolishPasses
    ?? input.runPlan?.qualityBar.polishingBudget.llmPasses
    ?? 0;
  if ((input.usedPasses ?? 0) >= maxPasses) return false;

  const maxTotalRuntimeMs = input.runPlan?.metricsBudget.maxTotalRuntimeMs;
  if (typeof maxTotalRuntimeMs === 'number' && typeof input.runtimeStartMs === 'number') {
    return performance.now() - input.runtimeStartMs < maxTotalRuntimeMs;
  }

  return true;
}

const STRUCTURAL_EMPTY_CLASSES = [
  'slide-content',
  'layout',
  'scene-particles',
  'particle',
  'slides',
  'reveal',
];

function extractPresentationSections(doc: Document): HTMLElement[] {
  const slideSections = Array.from(doc.querySelectorAll<HTMLElement>('.slides > section'));
  return slideSections.length > 0 ? slideSections : Array.from(doc.querySelectorAll<HTMLElement>('section'));
}

function hasExternalUrl(value: string): boolean {
  return /https?:\/\//i.test(value);
}

function repairStyleText(value: string): string {
  return value
    .replace(/@import\s+url\(\s*["']?https?:\/\/[^"')]+["']?\s*\)\s*;?/gi, '')
    .replace(/url\(\s*["']?https?:\/\/[^"')]+["']?\s*\)/gi, 'none');
}

function isStructuralElement(element: HTMLElement): boolean {
  return STRUCTURAL_EMPTY_CLASSES.some((className) =>
    Array.from(element.classList).some((candidate) =>
      candidate === className || candidate.startsWith(`${className}-`)));
}

function hasMediaOrIconChild(element: HTMLElement): boolean {
  return Boolean(element.querySelector('img, svg, canvas, video, picture, icon, [data-icon]'));
}

function isSeparatorElement(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && (
    element.tagName.toLowerCase() === 'hr' ||
    element.classList.contains('separator') ||
    element.classList.contains('heading-divider')
  );
}

function cleanupEmptyOptionalElements(section: HTMLElement): void {
  const candidates = Array.from(section.querySelectorAll<HTMLElement>('p, div'));

  for (const element of candidates) {
    if (isStructuralElement(element)) continue;
    if (element.textContent?.trim()) continue;
    if (hasMediaOrIconChild(element)) continue;

    const isParagraph = element.tagName.toLowerCase() === 'p';
    const isLeafDiv = element.tagName.toLowerCase() === 'div' && element.children.length === 0;
    if (!isParagraph && !isLeafDiv) continue;

    const nextElement = element.nextElementSibling;
    element.remove();
    if (isSeparatorElement(nextElement)) {
      nextElement.remove();
    }
  }
}

function stripUnsupportedAssets(doc: Document): void {
  doc.querySelectorAll('script, iframe, object, embed, link, meta, title').forEach((node) => node.remove());

  for (const style of Array.from(doc.querySelectorAll<HTMLStyleElement>('style'))) {
    style.textContent = repairStyleText(style.textContent ?? '');
  }

  for (const element of Array.from(doc.querySelectorAll<HTMLElement>('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value;
      const lowerName = attribute.name.toLowerCase();
      const isExternalAssetAttribute = ['src', 'href', 'xlink:href', 'poster'].includes(lowerName) && hasExternalUrl(value);
      const hasExternalCssAsset = lowerName === 'style' && /url\(\s*["']?https?:\/\//i.test(value);

      if (isExternalAssetAttribute) {
        if (['img', 'image', 'source', 'video', 'audio', 'picture'].includes(element.tagName.toLowerCase())) {
          element.remove();
          break;
        }
        element.removeAttribute(attribute.name);
      } else if (hasExternalCssAsset) {
        element.setAttribute(attribute.name, repairStyleText(value));
      }
    }
  }
}

function ensureConcreteSectionBackgrounds(sections: HTMLElement[]): void {
  for (const section of sections) {
    const current = section.getAttribute('data-background-color')?.trim();
    if (!current || current.startsWith('var(')) {
      section.setAttribute('data-background-color', '#ffffff');
    }
  }
}

function buildStyleFragment(doc: Document, fallbackStyleBlock?: string): string {
  const styleText = Array.from(doc.querySelectorAll<HTMLStyleElement>('style'))
    .map((style) => style.textContent?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n');
  if (!styleText) {
    return fallbackStyleBlock ?? '<style>\n</style>';
  }

  const needsReducedMotion = /\b(?:animation\s*:|@keyframes\b)/i.test(styleText) && !/prefers-reduced-motion/i.test(styleText);
  const repairedStyleText = needsReducedMotion
    ? `${styleText}\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { animation: none !important; transition: none !important; }\n}`
    : styleText;

  return `<style>\n${repairedStyleText}\n</style>`;
}

function canRequestLlmRepair(input: {
  runPlan?: ArtifactRunPlan;
  validation: PresentationRuntimeValidationResult;
  repairCount: number;
}): boolean {
  const maxRepairPasses = maxRuntimeRepairPasses(input.runPlan);
  return !input.validation.passed && input.repairCount < maxRepairPasses;
}

function extractPresentationPrefixBlocks(html: string): string[] {
  const blocks = html.match(/<style\b[\s\S]*?<\/style>|<link\b[^>]*>/gi) ?? [];
  return Array.from(new Set(blocks.map((block) => block.trim()).filter(Boolean)));
}

function extractPresentationSectionFragments(html: string): string[] {
  return html.match(/<section\b[\s\S]*?<\/section>/gi) ?? [];
}

function assemblePresentationFragments(prefixBlocks: string[], sections: string[]): string {
  return [...prefixBlocks, ...sections].filter(Boolean).join('\n');
}

function summarizePresentationValidationByPart(
  violations: QAViolation[],
  slideCount: number,
): NonNullable<ArtifactRuntimeTelemetry['validationByPart']> {
  const summaries = new Map<string, NonNullable<ArtifactRuntimeTelemetry['validationByPart']>[number]>();

  const ensureSummary = (partId: string, label: string) => {
    const existing = summaries.get(partId);
    if (existing) return existing;
    const next = {
      partId,
      label,
      validationPassed: true,
      blockingCount: 0,
      advisoryCount: 0,
      rules: [] as string[],
    };
    summaries.set(partId, next);
    return next;
  };

  for (let index = 1; index <= slideCount; index += 1) {
    ensureSummary(`slide-${index}`, `Slide ${index}`);
  }

  for (const violation of violations) {
    const partId = violation.slide > 0 ? `slide-${violation.slide}` : 'deck';
    const summary = ensureSummary(partId, violation.slide > 0 ? `Slide ${violation.slide}` : 'Deck');
    if (violation.tier === 'blocking') {
      summary.blockingCount += 1;
    } else {
      summary.advisoryCount += 1;
    }
    summary.validationPassed = summary.blockingCount === 0;
    if (!summary.rules.includes(violation.rule)) {
      summary.rules.push(violation.rule);
    }
  }

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      validationPassed: summary.blockingCount === 0,
      rules: summary.rules.sort(),
    }))
    .sort((a, b) => {
      if (a.partId === 'deck') return -1;
      if (b.partId === 'deck') return 1;
      return a.partId.localeCompare(b.partId, undefined, { numeric: true });
    });
}

async function runBoundedLlmPresentationRepair(input: {
  html: string;
  deterministicRepairCount: number;
  validation: PresentationRuntimeValidationResult;
  planResult: PlanResult;
  expectedSlideCount: number;
  runPlan?: ArtifactRunPlan;
  model?: LanguageModel;
  projectRulesBlock?: string;
  signal?: AbortSignal;
  onEvent: EventListener;
}): Promise<PresentationRuntimeRepairResult | null> {
  if (!canRequestLlmRepair({
    runPlan: input.runPlan,
    validation: input.validation,
    repairCount: input.deterministicRepairCount,
  })) {
    return null;
  }

  if (!input.model) {
    return {
      html: input.html,
      repairCount: input.deterministicRepairCount,
      repaired: input.deterministicRepairCount > 0,
      validation: input.validation,
      llmRepairRequested: true,
      summary: input.deterministicRepairCount > 0
        ? `Deterministic presentation repair completed with ${input.validation.blockingCount} blocking issue(s) and ${input.validation.advisoryCount} advisory issue(s) remaining; bounded LLM repair handoff requested.`
        : 'Deterministic repair could not resolve the remaining blocking issues; bounded LLM repair handoff requested.',
    };
  }

  const remainingPasses = Math.max(1, maxRuntimeRepairPasses(input.runPlan) - input.deterministicRepairCount);
  emitArtifactRunEvent(input.onEvent, {
    runId: input.runPlan?.runId ?? 'presentation-runtime',
    type: 'runtime.repair-started',
    role: 'repairer',
    message: `Running bounded LLM presentation repair (${remainingPasses} pass${remainingPasses === 1 ? '' : 'es'}).`,
    pct: 90,
  });

  const repairedHtml = await evaluateAndRevise(
    input.model,
    input.html,
    input.planResult,
    input.onEvent,
    input.projectRulesBlock,
    input.signal,
    remainingPasses,
    input.runPlan,
  );
  const repairedValidation = validatePresentationRuntimeOutput(
    repairedHtml,
    input.planResult,
    input.expectedSlideCount,
  );

  return {
    html: repairedHtml,
    repairCount: input.deterministicRepairCount + 1,
    repaired: true,
    validation: repairedValidation,
    llmRepairRequested: true,
    llmRepairExecuted: true,
    summary: repairedValidation.passed
      ? 'Bounded LLM presentation repair passed validation.'
      : `Bounded LLM presentation repair completed with ${repairedValidation.blockingCount} blocking issue(s) and ${repairedValidation.advisoryCount} advisory issue(s) remaining.`,
  };
}

export function repairPresentationFragmentHtml(html: string): { html: string; changed: boolean } {
  return repairPresentationFragmentHtmlWithOptions(html);
}

export function repairPresentationFragmentHtmlWithOptions(
  html: string,
  options: { styleSystemHtml?: string } = {},
): { html: string; changed: boolean } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  stripUnsupportedAssets(doc);
  const sections = extractPresentationSections(doc)
    .map((section) => section.cloneNode(true) as HTMLElement);

  if (sections.length === 0) {
    return { html, changed: false };
  }

  ensureConcreteSectionBackgrounds(sections);
  for (const section of sections) {
    cleanupEmptyOptionalElements(section);
  }

  const repairedHtml = [
    buildStyleFragment(doc, options.styleSystemHtml),
    ...sections.map((section) => section.outerHTML),
  ].join('\n');

  return {
    html: repairedHtml,
    changed: repairedHtml.trim() !== html.trim(),
  };
}

export function repairQueuedPresentationSlideFragments(input: {
  html: string;
  planResult: PlanResult;
  runPlan?: ArtifactRunPlan;
  onEvent: EventListener;
}): QueuedPresentationSlideRepairResult {
  const prefixBlocks = extractPresentationPrefixBlocks(input.html);
  const sections = extractPresentationSectionFragments(input.html);
  const validationByPart: NonNullable<ArtifactRuntimeTelemetry['validationByPart']> = [];
  const maxRepairPasses = maxRuntimeRepairPasses(input.runPlan);

  if (sections.length === 0) {
    return {
      html: input.html,
      repairCount: 0,
      repairedPartCount: 0,
      repaired: false,
      validationByPart,
    };
  }

  const nextSections = [...sections];
  let repairCount = 0;
  let repairedPartCount = 0;

  for (const [index, section] of sections.entries()) {
    const slideNumber = index + 1;
    const fragment = assemblePresentationFragments(prefixBlocks, [section]);
    const validation = validatePresentationRuntimeOutput(fragment, input.planResult, 1);
    const slideSummary = validation.validationByPart.find((part) => part.partId === 'slide-1');
    validationByPart.push({
      partId: `slide-${slideNumber}`,
      label: `Slide ${slideNumber}`,
      validationPassed: slideSummary?.validationPassed ?? validation.passed,
      blockingCount: slideSummary?.blockingCount ?? validation.blockingCount,
      advisoryCount: slideSummary?.advisoryCount ?? validation.advisoryCount,
      rules: slideSummary?.rules ?? [],
    });

    if (validation.passed || repairCount >= maxRepairPasses) continue;

    emitArtifactRunEvent(input.onEvent, {
      runId: input.runPlan?.runId ?? 'presentation-runtime',
      type: 'runtime.repair-started',
      role: 'repairer',
      message: `Repairing slide ${slideNumber} fragment.`,
      partId: `slide-${slideNumber}`,
      pct: Math.min(86, 72 + (slideNumber * 3)),
    });

    const repaired = repairPresentationFragmentHtml(fragment);
    if (!repaired.changed) continue;

    const repairedSections = extractPresentationSectionFragments(repaired.html);
    const repairedSection = repairedSections[0];
    if (!repairedSection) continue;

    nextSections[index] = repairedSection;
    repairCount += 1;

    const repairedValidation = validatePresentationRuntimeOutput(
      assemblePresentationFragments(prefixBlocks, [repairedSection]),
      input.planResult,
      1,
    );
    const repairedSummary = repairedValidation.validationByPart.find((part) => part.partId === 'slide-1');
    validationByPart[validationByPart.length - 1] = {
      partId: `slide-${slideNumber}`,
      label: `Slide ${slideNumber}`,
      validationPassed: repairedSummary?.validationPassed ?? repairedValidation.passed,
      blockingCount: repairedSummary?.blockingCount ?? repairedValidation.blockingCount,
      advisoryCount: repairedSummary?.advisoryCount ?? repairedValidation.advisoryCount,
      rules: repairedSummary?.rules ?? [],
    };
    if (repairedValidation.passed) {
      repairedPartCount += 1;
    }
    emitArtifactRunEvent(input.onEvent, {
      runId: input.runPlan?.runId ?? 'presentation-runtime',
      type: 'runtime.repair-completed',
      role: 'repairer',
      message: repairedValidation.passed
        ? `Repaired slide ${slideNumber} fragment.`
        : `Slide ${slideNumber} fragment repair completed with validation issues remaining.`,
      partId: `slide-${slideNumber}`,
      pct: Math.min(88, 75 + (slideNumber * 3)),
    });
  }

  const html = repairCount > 0
    ? assemblePresentationFragments(prefixBlocks, nextSections)
    : input.html;

  return {
    html,
    repairCount,
    repairedPartCount,
    repaired: repairCount > 0,
    validationByPart,
  };
}

export function canRunQueuedPresentationRuntime(planResult: PlanResult): boolean {
  return canRunQueuedPresentationRuntimeWithPlan(planResult);
}

function canRunQueuedPresentationRuntimeWithPlan(
  planResult: PlanResult,
  runPlan?: ArtifactRunPlan,
): boolean {
  if (runPlan && buildSlideBriefsFromRunPlan(runPlan).length > 0) {
    return true;
  }

  return (
    (planResult.intent === 'batch_create' || planResult.intent === 'add_slides') &&
    (planResult.slideBriefs?.length ?? 0) > 0
  );
}

function buildQueuedPresentationPlanResult(
  planResult: PlanResult,
  runPlan: ArtifactRunPlan | undefined,
): PlanResult {
  const runtimeSlideBriefs = runPlan ? buildSlideBriefsFromRunPlan(runPlan) : [];
  if (runtimeSlideBriefs.length === 0) {
    return planResult;
  }

  return {
    ...planResult,
    slideBriefs: runtimeSlideBriefs,
    intent: planResult.intent === 'add_slides' ? 'add_slides' : 'batch_create',
  };
}

function canRunPresentationQualityLlmPolish(planResult: PlanResult): boolean {
  return Boolean(planResult.blueprint && planResult.styleManifest?.compositionMode);
}

export function validatePresentationRuntimeOutput(
  html: string,
  planResult: PlanResult,
  expectedSlideCount: number,
  options: { skipExpectedBackground?: boolean } = {},
): PresentationRuntimeValidationResult {
  const qaResult = validateSlides(html, {
    expectedSlideCount,
    expectedBgColor: options.skipExpectedBackground ? undefined : planResult.blueprint.palette.bg,
    isCreate: planResult.intent === 'batch_create' || planResult.intent === 'create',
    styleManifest: planResult.styleManifest,
    exemplarPackId: planResult.exemplarPackId,
  });
  const blockingCount = qaResult.violations.filter((violation) => violation.tier === 'blocking').length;
  const advisoryCount = qaResult.violations.length - blockingCount;

  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    validationByPart: summarizePresentationValidationByPart(qaResult.violations, expectedSlideCount),
    summary: qaResult.violations.length === 0
      ? 'Queued presentation runtime validation passed.'
      : `Queued presentation runtime found ${blockingCount} blocking issue(s) and ${advisoryCount} advisory issue(s).`,
  };
}

function combineScaffoldValidation(
  runtimeValidation: PresentationRuntimeValidationResult,
  scaffoldValidation: ScaffoldValidationResult | undefined,
): PresentationRuntimeValidationResult {
  if (!scaffoldValidation || scaffoldValidation.findings.length === 0) {
    return runtimeValidation;
  }

  const validationByPart = [
    ...runtimeValidation.validationByPart,
    ...scaffoldValidation.findings.map((finding, index) => ({
      partId: finding.slideIndex ? `slide-${finding.slideIndex}` : `scaffold-${index + 1}`,
      label: finding.id,
      validationPassed: finding.severity !== 'blocking',
      blockingCount: finding.severity === 'blocking' ? 1 : 0,
      advisoryCount: finding.severity === 'advisory' ? 1 : 0,
      rules: [finding.message],
    })),
  ];
  const blockingCount = runtimeValidation.blockingCount + scaffoldValidation.blockingCount;
  const advisoryCount = runtimeValidation.advisoryCount + scaffoldValidation.advisoryCount;

  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    validationByPart,
    summary: blockingCount === 0
      ? `Queued presentation runtime validation passed with ${scaffoldValidation.advisoryCount} scaffold advisory issue(s).`
      : `Queued presentation runtime found ${blockingCount} blocking issue(s) and ${advisoryCount} advisory issue(s), including scaffold contract findings.`,
  };
}

function combineArtifactPackValidation(
  runtimeValidation: PresentationRuntimeValidationResult,
  artifactValidation: ArtifactValidationReport | undefined,
): PresentationRuntimeValidationResult {
  if (!artifactValidation || artifactValidation.findings.length === 0) {
    return runtimeValidation;
  }

  const validationByPart = [
    ...runtimeValidation.validationByPart,
    ...artifactValidation.findings.map((finding, index) => {
      const slidePathIndex = finding.path?.find((part) => typeof part === 'number');
      const slideIndex = typeof slidePathIndex === 'number' ? slidePathIndex + 1 : undefined;
      return {
        partId: slideIndex ? `slide-${slideIndex}` : `artifact-pack-${index + 1}`,
        label: finding.id,
        validationPassed: finding.severity !== 'blocking',
        blockingCount: finding.severity === 'blocking' ? 1 : 0,
        advisoryCount: finding.severity === 'advisory' ? 1 : 0,
        rules: [finding.message],
      };
    }),
  ];
  const blockingCount = runtimeValidation.blockingCount + artifactValidation.blockingCount;
  const advisoryCount = runtimeValidation.advisoryCount + artifactValidation.advisoryCount;

  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    validationByPart,
    summary: blockingCount === 0
      ? `Queued presentation runtime validation passed with ${artifactValidation.advisoryCount} artifact-pack advisory issue(s).`
      : `Queued presentation runtime found ${blockingCount} blocking issue(s) and ${advisoryCount} advisory issue(s), including artifact-pack contract findings.`,
  };
}

function resolveEditorialStageSourceBackedEdit(input: PresentationInput): EditorialStageSource | null {
  const source = normalizeEditorialStageSource(input.artifactSourcePayload);
  if (!source) return null;

  const manifestMatches =
    input.artifactManifest?.packId === EDITORIAL_STAGE_PACK_ID &&
    input.artifactManifest.packVersion === source.packVersion;
  const htmlMatches =
    !input.existingSlidesHtml ||
    new RegExp(`\\bdata-pack=["']${EDITORIAL_STAGE_PACK_ID.replace('/', '\\/')}["']`, 'i').test(input.existingSlidesHtml);
  const runPlanCompatible = !input.artifactRunPlan?.artifactPackId || input.artifactRunPlan.artifactPackId === EDITORIAL_STAGE_PACK_ID;
  const editSurfaceKind = input.artifactRunPlan?.artifactAllowedEditSurface?.kind;
  const supportedEditSurface =
    editSurfaceKind === 'text-edit' ||
    editSurfaceKind === 'add-slide' ||
    editSurfaceKind === 'restyle';
  if (!manifestMatches || !htmlMatches || !runPlanCompatible || !supportedEditSurface) return null;

  return source.packId === EDITORIAL_STAGE_PACK_ID && source.packVersion === '1.0.0' ? source : null;
}

async function runEditorialStageSourceEditPresentationRuntime(opts: {
  runPlan?: ArtifactRunPlan;
  planResult: PlanResult;
  input: PresentationInput;
  onEvent: EventListener;
  source: EditorialStageSource;
  planningDurationMs?: number;
  signal?: AbortSignal;
}): Promise<PresentationOutput> {
  const {
    runPlan,
    planResult,
    input,
    onEvent,
    source,
    planningDurationMs,
    signal,
  } = opts;
  const runtimeStart = performance.now();
  const runtimeRunId = runPlan?.runId ?? 'presentation-runtime';
  const phaseTimings: NonNullable<ArtifactRuntimeTelemetry['phaseTimings']> = [];
  if (typeof planningDurationMs === 'number') {
    phaseTimings.push({
      phaseId: 'planning',
      label: 'Planning',
      durationMs: Math.round(planningDurationMs),
      order: 0,
    });
  }

  let firstPreviewAt: number | undefined;
  const editStartedAt = performance.now();
  onEvent({ type: 'step-start', stepId: 'targeted-design', label: 'Updating presentation source…' });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-started',
    role: 'generator',
    message: 'Updating presentation source payload…',
    partId: 'targeted-design',
    pct: 30,
  });

  if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

  const editResult = await runEditorialStagePresentationEditRuntime({
    source,
    prompt: input.prompt,
    planResult,
    ...(runPlan ? { runPlan } : {}),
    onEvent,
    onSlideDraft: (combinedHtml, slideIndex, totalSlides) => {
      firstPreviewAt ??= performance.now();
      onEvent({ type: 'batch-slide-draft', html: combinedHtml, slideIndex, totalSlides });
    },
    onSlideComplete: (combinedHtml, slideIndex, totalSlides) => {
      firstPreviewAt ??= performance.now();
      onEvent({ type: 'batch-slide-complete', html: combinedHtml, slideIndex, totalSlides });
    },
  });

  phaseTimings.push({
    phaseId: 'source-edit',
    label: 'Source edit',
    durationMs: Math.round(performance.now() - editStartedAt),
    order: 1,
  });
  onEvent({ type: 'step-done', stepId: 'targeted-design', label: 'Updating presentation source…' });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-completed',
    role: 'generator',
    message: editResult.changed
      ? 'Presentation source payload updated.'
      : editResult.reason ?? 'Presentation source payload recompiled.',
    partId: 'targeted-design',
    pct: 70,
  });

  if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

  const validationStartedAt = performance.now();
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.validation-started',
    role: 'validator',
    message: 'Checking compiled presentation source…',
    partId: 'evaluate',
    pct: 72,
  });
  const validation = combineArtifactPackValidation(
    validatePresentationRuntimeOutput(editResult.html, planResult, editResult.slideCount, { skipExpectedBackground: true }),
    editResult.compileResult.validation,
  );
  phaseTimings.push({
    phaseId: 'validation',
    label: 'Validation',
    durationMs: Math.round(performance.now() - validationStartedAt),
    order: 2,
  });
  onEvent({
    type: 'progress',
    message: validation.summary,
    pct: validation.passed ? 84 : 78,
    partId: 'evaluate',
    runId: runtimeRunId,
  });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.validation-completed',
    role: 'validator',
    message: 'Checking compiled presentation source…',
    partId: 'evaluate',
    pct: 88,
  });

  const finalizeStartedAt = performance.now();
  onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing presentation…' });
  const compiledOutputHtml = sanitizeInnerHtml(editResult.html);
  const shouldPersistSourceEdit = validation.blockingCount === 0;
  const outputHtml = shouldPersistSourceEdit
    ? compiledOutputHtml
    : sanitizeInnerHtml(input.existingSlidesHtml ?? editResult.html);
  const outputSource = shouldPersistSourceEdit ? editResult.source : source;
  const outputSlideCount = shouldPersistSourceEdit ? editResult.slideCount : source.slides.length;
  const qualityTelemetry = buildPresentationQualityTelemetry({
    html: outputHtml,
    promptText: input.prompt,
    qualityBar: runPlan?.qualityBar,
  });
  const editSurfaceIds = Array.from(new Set([
    ...(input.artifactManifest?.editSurfaces ?? []),
    ...(runPlan?.artifactAllowedEditSurface?.id ? [runPlan.artifactAllowedEditSurface.id] : []),
  ]));
  const runtimeTelemetry = applyQualityDecisionTelemetry({
    ...(firstPreviewAt ? { timeToFirstPreviewMs: Math.round(firstPreviewAt - runtimeStart) } : {}),
    totalRuntimeMs: Math.round(performance.now() - runtimeStart),
    validationPassed: validation.passed,
    validationBlockingCount: validation.blockingCount,
    validationAdvisoryCount: validation.advisoryCount,
    repairCount: 0,
    runMode: 'deterministic-action',
    queuedPartCount: editResult.slideCount,
    completedPartCount: editResult.slideCount,
    repairedPartCount: 0,
    phaseTimings: [
      ...phaseTimings,
      {
        phaseId: 'finalize',
        label: 'Finalize',
        durationMs: Math.round(performance.now() - finalizeStartedAt),
        order: 99,
      },
    ],
    ...qualityTelemetry,
    validationByPart: validation.validationByPart,
  }, undefined, undefined);
  const output: PresentationOutput = {
    html: outputHtml,
    title: outputSource.title,
    slideCount: outputSlideCount,
    reviewPassed: validation.passed,
    runtime: runtimeTelemetry,
    artifactManifest: {
      packId: EDITORIAL_STAGE_PACK_ID,
      packVersion: outputSource.packVersion,
      designDirectionId: outputSource.directionId,
      sourcePayloadVersion: 1,
      renderer: 'presentation',
      exports: [outputSource.outputMode],
      ...(editSurfaceIds.length > 0 ? { editSurfaces: editSurfaceIds } : {}),
      validationStatus: validation.passed
        ? (validation.advisoryCount > 0 ? 'warnings' : 'passed')
        : 'failed',
      updatedAt: Date.now(),
    },
    artifactSourcePayload: outputSource,
  };

  onEvent({ type: 'draft-complete', html: outputHtml });
  onEvent({ type: 'step-done', stepId: 'finalize', label: 'Finalizing presentation…' });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.finalized',
    role: 'finalizer',
    message: 'Finalizing presentation…',
    partId: 'finalize',
    pct: 100,
  });
  onEvent({ type: 'complete', result: output });

  return output;
}

export async function repairPresentationRuntimeOutput(
  html: string,
  validation: PresentationRuntimeValidationResult,
  planResult: PlanResult,
  expectedSlideCount: number,
  runPlan: ArtifactRunPlan | undefined,
  onEvent: EventListener,
  options: {
    model?: LanguageModel;
    projectRulesBlock?: string;
    styleSystemHtml?: string;
    signal?: AbortSignal;
  } = {},
): Promise<PresentationRuntimeRepairResult> {
  if (validation.passed) {
    return {
      html,
      repairCount: 0,
      repaired: false,
      summary: 'No repair needed.',
    };
  }

  const maxRepairPasses = maxRuntimeRepairPasses(runPlan);
  if (maxRepairPasses <= 0) {
    return {
      html,
      repairCount: 0,
      repaired: false,
      summary: 'Repair skipped because no runtime repair budget is available.',
    };
  }

  emitArtifactRunEvent(onEvent, {
    runId: runPlan?.runId ?? 'presentation-runtime',
    type: 'runtime.repair-started',
    role: 'repairer',
    message: 'Applying deterministic presentation repair.',
    pct: 88,
  });

  const repaired = repairPresentationFragmentHtmlWithOptions(html, {
    ...(options.styleSystemHtml ? { styleSystemHtml: options.styleSystemHtml } : {}),
  });
  if (repaired.changed) {
    const repairedValidation = validatePresentationRuntimeOutput(
      repaired.html,
      planResult,
      expectedSlideCount,
    );
    const llmRepairRequested = canRequestLlmRepair({
      runPlan,
      validation: repairedValidation,
      repairCount: 1,
    });

    const llmRepair = await runBoundedLlmPresentationRepair({
      html: repaired.html,
      deterministicRepairCount: 1,
      validation: repairedValidation,
      planResult,
      expectedSlideCount,
      runPlan,
      model: options.model,
      projectRulesBlock: options.projectRulesBlock,
      signal: options.signal,
      onEvent,
    });

    if (llmRepair) {
      return llmRepair;
    }

    return {
      html: repaired.html,
      repairCount: 1,
      repaired: true,
      validation: repairedValidation,
      ...(llmRepairRequested ? { llmRepairRequested: true } : {}),
      summary: repairedValidation.passed
        ? 'Deterministic presentation repair passed validation.'
        : llmRepairRequested
          ? `Deterministic presentation repair completed with ${repairedValidation.blockingCount} blocking issue(s) and ${repairedValidation.advisoryCount} advisory issue(s) remaining; bounded LLM repair handoff requested.`
        : `Deterministic presentation repair completed with ${repairedValidation.blockingCount} blocking issue(s) and ${repairedValidation.advisoryCount} advisory issue(s) remaining.`,
    };
  }

  if (canRequestLlmRepair({ runPlan, validation, repairCount: 0 })) {
    emitArtifactRunEvent(onEvent, {
      runId: runPlan?.runId ?? 'presentation-runtime',
      type: 'runtime.repair-started',
      role: 'repairer',
      message: 'Deterministic repair could not resolve the fragment; bounded LLM repair handoff requested.',
      pct: 90,
    });

    const llmRepair = await runBoundedLlmPresentationRepair({
      html,
      deterministicRepairCount: 0,
      validation,
      planResult,
      expectedSlideCount,
      runPlan,
      model: options.model,
      projectRulesBlock: options.projectRulesBlock,
      signal: options.signal,
      onEvent,
    });

    return llmRepair ?? {
      html,
      repairCount: 0,
      repaired: false,
      llmRepairRequested: true,
      summary: 'Deterministic repair could not resolve the remaining blocking issues; bounded LLM repair handoff requested.',
    };
  }

  return {
    html,
    repairCount: 0,
    repaired: false,
    summary: 'No deterministic presentation repair was available for the remaining issues.',
  };
}

export async function runQueuedPresentationRuntime(
  opts: QueuedPresentationRuntimeOptions,
): Promise<PresentationOutput> {
  const {
    runPlan,
    planResult,
    model,
    input,
    onEvent,
    isEdit,
    guidanceProfile,
    signal,
    planningDurationMs,
  } = opts;

  const runtimeStart = performance.now();
  let firstPreviewAt: number | undefined;
  const phaseTimings: NonNullable<ArtifactRuntimeTelemetry['phaseTimings']> = [];
  if (typeof planningDurationMs === 'number') {
    phaseTimings.push({
      phaseId: 'planning',
      label: 'Planning',
      durationMs: Math.round(planningDurationMs),
      order: 0,
    });
  }
  const runtimeRunId = runPlan?.runId ?? 'presentation-runtime';
  const effectivePlanResult = buildQueuedPresentationPlanResult(planResult, runPlan);
  const slideBriefs = effectivePlanResult.slideBriefs ?? [];
  if (slideBriefs.length === 0) {
    throw new Error('Queued presentation runtime requires slide briefs.');
  }

  const queuedStepId = isEdit ? 'targeted-design' : 'design';
  const queuedLabel = isEdit
    ? `Creating ${slideBriefs.length} new slide${slideBriefs.length === 1 ? '' : 's'}…`
    : `Creating ${slideBriefs.length} slide${slideBriefs.length === 1 ? '' : 's'}…`;

  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-started',
    role: 'generator',
    message: queuedLabel,
    partId: queuedStepId,
    pct: 18,
  });
  onEvent({
    type: 'progress',
    message: runPlan
      ? `Creating ${slideBriefs.length} slide part${slideBriefs.length === 1 ? '' : 's'} from the runtime plan…`
      : `Creating ${slideBriefs.length} queued slide${slideBriefs.length === 1 ? '' : 's'}…`,
    pct: 18,
  });

  const existingDeckIsScaffolded = !input.existingSlidesHtml || /\bdata-scaffold=["'][^"']+["']/i.test(input.existingSlidesHtml);
  const existingDeckIsArtifactPacked = !input.existingSlidesHtml || /\bdata-pack=["']presentation\/editorial-stage-v1["']/i.test(input.existingSlidesHtml);
  const useArtifactPackRuntime =
    isEditorialStagePresentationRun(runPlan) &&
    !isScaffoldedPresentationRun(runPlan) &&
    (!isEdit || existingDeckIsArtifactPacked);
  const useScaffoldRuntime = isScaffoldedPresentationRun(runPlan) && (!isEdit || existingDeckIsScaffolded);
  let styleSystemHtmlForRepair = '';
  let scaffoldValidation: ScaffoldValidationResult | undefined;
  let artifactPackValidation: ArtifactValidationReport | undefined;
  let artifactSourcePayload: unknown;
  const styleStartedAt = performance.now();
  const generationStartedAt = performance.now();
  let batchResult: BatchQueueResult;

  if (useArtifactPackRuntime) {
    phaseTimings.push({
      phaseId: 'style-system',
      label: 'Artifact pack shell',
      durationMs: Math.round(performance.now() - styleStartedAt),
      order: 1,
    });
    onEvent({
      type: 'progress',
      message: `Artifact pack selected: ${runPlan?.artifactPackId ?? 'presentation/editorial-stage-v1'}`,
      pct: 18,
      partId: 'style-system',
      runId: runtimeRunId,
    });

    const packResult = await runEditorialStagePresentationQueue({
      planResult: effectivePlanResult,
      onEvent,
      ...(runPlan ? { runPlan } : {}),
      onSlideDraft: (combinedHtml, slideIndex, totalSlides) => {
        firstPreviewAt ??= performance.now();
        onEvent({ type: 'batch-slide-draft', html: combinedHtml, slideIndex, totalSlides });
      },
      onSlideComplete: (combinedHtml, slideIndex, totalSlides) => {
        firstPreviewAt ??= performance.now();
        onEvent({ type: 'batch-slide-complete', html: combinedHtml, slideIndex, totalSlides });
      },
    });
    styleSystemHtmlForRepair = packResult.styleBlock;
    artifactPackValidation = packResult.compileResult.validation;
    artifactSourcePayload = packResult.source;
    batchResult = packResult;
  } else if (useScaffoldRuntime) {
    const scaffoldSelection = resolveScaffoldForRunPlan(runPlan);
    phaseTimings.push({
      phaseId: 'style-system',
      label: 'Scaffold shell',
      durationMs: Math.round(performance.now() - styleStartedAt),
      order: 1,
    });
    onEvent({
      type: 'progress',
      message: `Scaffold selected: ${scaffoldSelection.scaffold.label} / ${scaffoldSelection.theme.label}`,
      pct: 18,
      partId: 'style-system',
      runId: runtimeRunId,
    });

    const scaffoldResult = await runScaffoldedPresentationQueue({
      planResult: effectivePlanResult,
      model,
      onEvent,
      ...(isEdit && input.existingSlidesHtml ? { initialHtml: input.existingSlidesHtml } : {}),
      ...(isEdit && effectivePlanResult.intent !== 'add_slides' ? { replaceExistingSlides: true } : {}),
      ...(runPlan ? { runPlan } : {}),
      onSlideDraft: (combinedHtml, slideIndex, totalSlides) => {
        firstPreviewAt ??= performance.now();
        onEvent({ type: 'batch-slide-draft', html: combinedHtml, slideIndex, totalSlides });
      },
      onSlideComplete: (combinedHtml, slideIndex, totalSlides) => {
        firstPreviewAt ??= performance.now();
        onEvent({ type: 'batch-slide-complete', html: combinedHtml, slideIndex, totalSlides });
      },
      ...(signal ? { signal } : {}),
    });
    styleSystemHtmlForRepair = scaffoldResult.compileResult.styleBlock;
    scaffoldValidation = scaffoldResult.validation;
    batchResult = scaffoldResult;
  } else {
    const styleSystem = await resolvePresentationStyleSystem({
      planResult: effectivePlanResult,
      ...(runPlan ? { runPlan } : {}),
      ...(guidanceProfile ? { guidanceProfile } : {}),
      projectRulesBlock: input.projectRulesBlock,
    });
    styleSystemHtmlForRepair = styleSystem.styleBlock;
    phaseTimings.push({
      phaseId: 'style-system',
      label: 'Style shell',
      durationMs: Math.round(performance.now() - styleStartedAt),
      order: 1,
    });
    onEvent({
      type: 'progress',
      message: `Style system locked: ${styleSystem.templateId}`,
      pct: 18,
      partId: 'style-system',
      runId: runtimeRunId,
    });

    batchResult = await runBatchQueue({
      planResult: effectivePlanResult,
      model,
      onEvent,
      ...(isEdit && input.existingSlidesHtml ? { initialHtml: input.existingSlidesHtml } : {}),
      ...(guidanceProfile ? { guidanceProfile } : {}),
      ...(runPlan ? { runPlan } : {}),
      styleSystemHtml: styleSystem.styleBlock,
      onSlideDraft: (combinedHtml, slideIndex, totalSlides) => {
        firstPreviewAt ??= performance.now();
        onEvent({ type: 'batch-slide-draft', html: combinedHtml, slideIndex, totalSlides });
      },
      onSlideComplete: (combinedHtml, slideIndex, totalSlides) => {
        firstPreviewAt ??= performance.now();
        onEvent({ type: 'batch-slide-complete', html: combinedHtml, slideIndex, totalSlides });
      },
      ...(signal ? { signal } : {}),
    });
  }
  phaseTimings.push({
    phaseId: 'slide-generation',
    label: 'Slide generation',
    durationMs: Math.round(performance.now() - generationStartedAt),
    order: 2,
  });
  (batchResult.slideTimingsMs ?? []).forEach((durationMs, index) => {
    phaseTimings.push({
      phaseId: 'slide',
      label: `Slide ${index + 1}`,
      durationMs,
      partId: `slide-${index + 1}`,
      order: 3 + index,
    });
  });

  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-completed',
    role: 'generator',
    message: queuedLabel,
    partId: queuedStepId,
    pct: 70,
  });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.validation-started',
    role: 'validator',
    message: 'Checking queued slides…',
    partId: 'evaluate',
    pct: 70,
  });

  const validationStartedAt = performance.now();
  const compilerOwnedOutput = useScaffoldRuntime || useArtifactPackRuntime;
  const slideRepair = compilerOwnedOutput
    ? {
        html: batchResult.html,
        repairCount: 0,
        repairedPartCount: 0,
        repaired: false,
        validationByPart: [],
      } satisfies QueuedPresentationSlideRepairResult
    : repairQueuedPresentationSlideFragments({
        html: batchResult.html,
        planResult: effectivePlanResult,
        ...(runPlan ? { runPlan } : {}),
        onEvent,
      });
  if (slideRepair.repaired) {
    onEvent({
      type: 'progress',
      message: `Repaired ${slideRepair.repairedPartCount} queued slide fragment${slideRepair.repairedPartCount === 1 ? '' : 's'} before deck validation.`,
      pct: 84,
    });
  }

  const validation = combineScaffoldValidation(
    combineArtifactPackValidation(
      validatePresentationRuntimeOutput(
        slideRepair.html,
        effectivePlanResult,
        batchResult.slideCount,
        { skipExpectedBackground: compilerOwnedOutput },
      ),
      artifactPackValidation,
    ),
    scaffoldValidation,
  );
  onEvent({
    type: 'progress',
    message: validation.summary,
    pct: validation.passed ? 82 : 78,
  });
  phaseTimings.push({
    phaseId: 'validation',
    label: 'Validation',
    durationMs: Math.round(performance.now() - validationStartedAt),
    order: 20,
  });

  const repairStartedAt = performance.now();
  const repair = compilerOwnedOutput
    ? {
        html: slideRepair.html,
        repairCount: 0,
        repaired: false,
        summary: 'Compiler-owned output; generic HTML repair skipped.',
        validation,
      } satisfies PresentationRuntimeRepairResult
    : await repairPresentationRuntimeOutput(
        slideRepair.html,
        validation,
        effectivePlanResult,
        batchResult.slideCount,
        runPlan,
        onEvent,
        {
          model,
          projectRulesBlock: input.projectRulesBlock,
          styleSystemHtml: styleSystemHtmlForRepair,
          signal,
        },
      );
  phaseTimings.push({
    phaseId: 'repair',
    label: 'Deterministic repair',
    durationMs: Math.round(performance.now() - repairStartedAt),
    order: 21,
  });

  if (validation.passed || !repair.repaired) {
    emitArtifactRunEvent(onEvent, {
      runId: runtimeRunId,
      type: 'runtime.validation-completed',
      role: 'validator',
      message: 'Checking queued slides…',
      partId: 'evaluate',
      pct: 88,
    });
  }

  onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing presentation…' });
  const finalizeStartedAt = performance.now();
  let finalValidation = repair.validation ?? validation;
  let finalHtml = repair.html;
  if (useArtifactPackRuntime) {
    finalValidation = combineArtifactPackValidation(
      validatePresentationRuntimeOutput(finalHtml, effectivePlanResult, batchResult.slideCount, { skipExpectedBackground: true }),
      artifactPackValidation,
    );
  } else if (useScaffoldRuntime) {
    const scaffoldSelection = resolveScaffoldForRunPlan(runPlan);
    finalValidation = combineScaffoldValidation(
      validatePresentationRuntimeOutput(finalHtml, effectivePlanResult, batchResult.slideCount, { skipExpectedBackground: true }),
      validateScaffoldedDeck({
        html: finalHtml,
        scaffold: scaffoldSelection.scaffold,
        rhythmPlan: runPlan?.deckRhythmPlan,
        exportIntent: scaffoldSelection.exportIntent,
      }),
    );
  }
  let llmQualityPolishCount = 0;
  let qualityTelemetry = buildPresentationQualityTelemetry({
    html: sanitizeInnerHtml(finalHtml),
    promptText: input.prompt,
    qualityBar: runPlan?.qualityBar,
  });
  let qualityDecision = runPlan?.qualityBar
    ? decideArtifactQualityPolish({
        qualityBar: runPlan.qualityBar,
        validationPassed: finalValidation.passed,
        validationBlockingCount: finalValidation.blockingCount,
        qualityPassed: qualityTelemetry.qualityPassed,
        qualityScore: qualityTelemetry.qualityScore,
        qualityBlockingCount: qualityTelemetry.qualityBlockingCount,
        deterministicPolishAvailable: false,
        llmPolishAvailable: !compilerOwnedOutput && canRunPresentationQualityLlmPolish(effectivePlanResult) && canStartOptionalLlmPolish({
          runPlan,
          usedPasses: llmQualityPolishCount,
          runtimeStartMs: runtimeStart,
        }),
      })
    : undefined;
  let qualityPolishAction: ArtifactRuntimeTelemetry['qualityPolishAction'] | undefined = qualityDecision?.action;

  if (qualityDecision?.shouldPolish && qualityDecision.action === 'llm-polish') {
    const polishStartedAt = performance.now();
    onEvent({ type: 'step-start', stepId: 'quality-polish', label: 'Polishing quality…' });
    emitArtifactRunEvent(onEvent, {
      runId: runtimeRunId,
      type: 'runtime.repair-started',
      role: 'repairer',
      message: 'Polishing presentation quality...',
      partId: 'quality-polish',
      pct: 90,
    });

    const polishChecklist = buildPresentationQualityChecklist({
      html: sanitizeInnerHtml(finalHtml),
      promptText: input.prompt,
      qualityBar: runPlan?.qualityBar,
    });
    const deterministicFeedback = collectPresentationNamedFailures(polishChecklist.checks);
    const polishedHtml = await evaluateAndRevise(
      model,
      finalHtml,
      effectivePlanResult,
      onEvent,
      input.projectRulesBlock,
      signal,
      1,
      runPlan,
      deterministicFeedback.length > 0 ? deterministicFeedback : undefined,
    );
    const polishedValidation = validatePresentationRuntimeOutput(
      polishedHtml,
      effectivePlanResult,
      batchResult.slideCount,
    );
    const polishedQualityTelemetry = buildPresentationQualityTelemetry({
      html: sanitizeInnerHtml(polishedHtml),
      promptText: input.prompt,
      qualityBar: runPlan?.qualityBar,
    });
    if (
      polishedValidation.passed &&
      (polishedQualityTelemetry.qualityScore ?? 0) >= (qualityTelemetry.qualityScore ?? 0)
    ) {
      finalHtml = polishedHtml;
      finalValidation = polishedValidation;
      qualityTelemetry = polishedQualityTelemetry;
      llmQualityPolishCount = 1;
      qualityPolishAction = 'llm-polish';
    }
    qualityDecision = runPlan?.qualityBar
      ? decideArtifactQualityPolish({
          qualityBar: runPlan.qualityBar,
          validationPassed: finalValidation.passed,
          validationBlockingCount: finalValidation.blockingCount,
          qualityPassed: qualityTelemetry.qualityPassed,
          qualityScore: qualityTelemetry.qualityScore,
          qualityBlockingCount: qualityTelemetry.qualityBlockingCount,
          llmPolishCount: llmQualityPolishCount,
          deterministicPolishAvailable: false,
          llmPolishAvailable: !compilerOwnedOutput && canRunPresentationQualityLlmPolish(effectivePlanResult) && canStartOptionalLlmPolish({
            runPlan,
            usedPasses: llmQualityPolishCount,
            runtimeStartMs: runtimeStart,
          }),
        })
      : undefined;
    onEvent({ type: 'step-done', stepId: 'quality-polish', label: 'Polishing quality…' });
    emitArtifactRunEvent(onEvent, {
      runId: runtimeRunId,
      type: 'runtime.repair-completed',
      role: 'repairer',
      message: qualityDecision?.reason ?? 'Presentation quality polish completed.',
      partId: 'quality-polish',
      pct: 94,
    });
    phaseTimings.push({
      phaseId: 'quality-polish',
      label: 'Quality polish',
      durationMs: Math.round(performance.now() - polishStartedAt),
      order: 22,
    });
  }

  const outputHtml = sanitizeInnerHtml(finalHtml);
  const runtimeTelemetry = applyQualityDecisionTelemetry({
    ...(firstPreviewAt ? { timeToFirstPreviewMs: Math.round(firstPreviewAt - runtimeStart) } : {}),
    totalRuntimeMs: Math.round(performance.now() - runtimeStart),
    validationPassed: finalValidation.passed,
    validationBlockingCount: finalValidation.blockingCount,
    validationAdvisoryCount: finalValidation.advisoryCount,
    repairCount: slideRepair.repairCount + repair.repairCount + llmQualityPolishCount,
    runMode: isEdit ? 'queued-edit' : 'queued-create',
    queuedPartCount: slideBriefs.length,
    completedPartCount: batchResult.slideCount,
    repairedPartCount: slideRepair.repairedPartCount + (repair.repairedPartCount ?? 0),
    phaseTimings: [
      ...phaseTimings,
      {
        phaseId: 'finalize',
        label: 'Finalize',
        durationMs: Math.round(performance.now() - finalizeStartedAt),
        order: 99,
      },
    ],
    ...qualityTelemetry,
    validationByPart: finalValidation.validationByPart,
  }, qualityDecision, qualityPolishAction);
  const output: PresentationOutput = {
    html: outputHtml,
    title: batchResult.title,
    slideCount: batchResult.slideCount,
    reviewPassed: finalValidation.passed,
    runtime: runtimeTelemetry,
    ...(runPlan?.artifactPackId && runPlan.artifactPackVersion ? {
      artifactManifest: {
        packId: runPlan.artifactPackId,
        packVersion: runPlan.artifactPackVersion,
        ...(runPlan.designDirectionId ? { designDirectionId: runPlan.designDirectionId } : {}),
        sourcePayloadVersion: 1,
        renderer: 'presentation',
        ...(runPlan.artifactExportIntent ? { exports: [runPlan.artifactExportIntent] } : {}),
        ...(runPlan.artifactAllowedEditSurface ? { editSurfaces: [runPlan.artifactAllowedEditSurface.id] } : {}),
        validationStatus: finalValidation.passed
          ? (finalValidation.advisoryCount > 0 ? 'warnings' : 'passed')
          : 'failed',
        updatedAt: Date.now(),
      },
      ...(artifactSourcePayload ? { artifactSourcePayload } : {}),
    } : {}),
  };

  onEvent({
    type: 'progress',
    message: slideRepair.repairCount + repair.repairCount + llmQualityPolishCount > 0
      ? `Presentation finalized after ${slideRepair.repairCount + repair.repairCount + llmQualityPolishCount} repair pass${slideRepair.repairCount + repair.repairCount + llmQualityPolishCount === 1 ? '' : 'es'}.`
      : 'Presentation finalized from queued runtime output.',
    pct: 96,
  });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.finalized',
    role: 'finalizer',
    message: 'Finalizing presentation…',
    partId: 'finalize',
    pct: 100,
  });
  onEvent({ type: 'complete', result: output });

  return output;
}

export async function runPresentationRuntime(
  opts: PresentationRuntimeOrchestratorOptions,
): Promise<PresentationOutput> {
  const {
    model,
    input,
    onEvent,
    editCorrectionPolicy,
    skipSecondaryEvaluation,
    signal,
  } = opts;
  const isEdit = !!input.existingSlidesHtml;
  const runtimeRunId = input.artifactRunPlan?.runId ?? 'presentation-runtime';
  const effectiveChatHistory = input.memoryContext
    ? [
        ...input.chatHistory,
        {
          role: 'assistant' as const,
          content: `Relevant memory context:\n${input.memoryContext}`,
        },
      ]
    : input.chatHistory;

  onEvent({ type: 'step-start', stepId: 'plan', label: 'Analyzing your request…' });
  onEvent({ type: 'progress', message: 'Understanding your request…', pct: 10 });

  const planningStartedAt = performance.now();
  let planResult = await plan(input.prompt, isEdit);
  const planningDurationMs = performance.now() - planningStartedAt;
  if (planResult.blocked) {
    onEvent({ type: 'step-error', stepId: 'plan', error: planResult.blockReason ?? 'Request blocked.' });
    throw new Error(planResult.blockReason ?? 'Request blocked.');
  }

  planResult = applyArtifactRunPlanToPresentationPlan(planResult, input.artifactRunPlan, isEdit);
  const guidanceProfile = input.templateGuidance ?? input.artifactRunPlan?.templateGuidance;
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.plan-created',
    role: 'planner',
    message: input.artifactRunPlan
      ? input.artifactRunPlan.intentSummary
      : `Presentation plan selected ${planResult.selectedTemplate}.`,
    partId: 'plan',
    pct: 18,
  });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.design-manifest-created',
    role: 'design-director',
    message: input.artifactRunPlan
      ? `Design manifest ready: ${input.artifactRunPlan.designManifest.family}.`
      : `Design family ready: ${planResult.selectedTemplate}.`,
    partId: 'design',
    pct: 20,
  });

  onEvent({
    type: 'progress',
    message: input.artifactRunPlan
      ? `Designing with ${input.artifactRunPlan.designManifest.family}`
      : `Detected ${planResult.style} style, animation level ${planResult.animationLevel}`,
    pct: 20,
  });
  onEvent({ type: 'step-done', stepId: 'plan', label: 'Analyzing your request…' });

  if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

  const editorialStageSourceEdit = isEdit
    ? resolveEditorialStageSourceBackedEdit(input)
    : null;
  if (editorialStageSourceEdit) {
    return runEditorialStageSourceEditPresentationRuntime({
      ...(input.artifactRunPlan ? { runPlan: input.artifactRunPlan } : {}),
      planResult,
      input,
      onEvent,
      source: editorialStageSourceEdit,
      planningDurationMs,
      ...(signal ? { signal } : {}),
    });
  }

  if (canRunQueuedPresentationRuntimeWithPlan(planResult, input.artifactRunPlan)) {
    return runQueuedPresentationRuntime({
      ...(input.artifactRunPlan ? { runPlan: input.artifactRunPlan } : {}),
      planResult,
      model,
      input,
      onEvent,
      isEdit,
      ...(guidanceProfile ? { guidanceProfile } : {}),
      planningDurationMs,
      ...(signal ? { signal } : {}),
    });
  }

  if (
    isEdit &&
    isScaffoldedPresentationRun(input.artifactRunPlan) &&
    (!input.existingSlidesHtml || /\bdata-scaffold=["'][^"']+["']/i.test(input.existingSlidesHtml))
  ) {
    return runScaffoldedPresentationEditRuntime({
      ...(input.artifactRunPlan ? { runPlan: input.artifactRunPlan } : {}),
      planResult,
      model,
      presentationInput: input,
      onEvent,
      planningDurationMs,
      ...(signal ? { signal } : {}),
    });
  }

  return runSinglePresentationRuntime({
    ...(input.artifactRunPlan ? { runPlan: input.artifactRunPlan } : {}),
    planResult,
    model,
    input,
    onEvent,
    isEdit,
    effectiveChatHistory,
    ...(guidanceProfile ? { guidanceProfile } : {}),
    editCorrectionPolicy,
    skipSecondaryEvaluation,
    planningDurationMs,
    ...(signal ? { signal } : {}),
  });
}

export async function runSinglePresentationRuntime(
  opts: SinglePresentationRuntimeOptions,
): Promise<PresentationOutput> {
  const {
    runPlan,
    planResult,
    model,
    input,
    onEvent,
    isEdit,
    effectiveChatHistory,
    guidanceProfile,
    editCorrectionPolicy,
    skipSecondaryEvaluation,
    signal,
    planningDurationMs,
  } = opts;
  const runtimeRunId = runPlan?.runId ?? 'presentation-runtime';
  const runtimeStart = performance.now();
  let firstPreviewAt: number | undefined;
  const phaseTimings: NonNullable<ArtifactRuntimeTelemetry['phaseTimings']> = [];
  if (typeof planningDurationMs === 'number') {
    phaseTimings.push({
      phaseId: 'planning',
      label: 'Planning',
      durationMs: Math.round(planningDurationMs),
      order: 0,
    });
  }
  const runtimeOnEvent: EventListener = (event) => {
    if (!firstPreviewAt && (event.type === 'draft-complete' || event.type === 'streaming')) {
      firstPreviewAt = performance.now();
    }
    onEvent(event);
  };
  const fallbackEditCorrectionPolicy = editCorrectionPolicy ?? {
    mode: runPlan?.providerPolicy.mode === 'local-constrained' ? 'best-effort' : 'full',
    maxCorrectionSteps: runPlan?.metricsBudget.maxToolLoopSteps ?? 5,
  };
  const runtimeEditCorrectionPolicy = {
    ...fallbackEditCorrectionPolicy,
    maxCorrectionSteps: maxRuntimeToolLoopSteps(runPlan, fallbackEditCorrectionPolicy.maxCorrectionSteps),
  };

  const designStepId = isEdit ? 'targeted-design' : 'design';
  const designLabel = isEdit ? 'Editing slides...' : 'Designing your slide...';
  const designStartedAt = performance.now();
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-started',
    role: 'generator',
    message: designLabel,
    partId: designStepId,
    pct: 30,
  });
  onEvent({ type: 'progress', message: isEdit ? 'Applying changes...' : 'Designing a polished slide...', pct: 30 });
  const stopDesignHeartbeat = startProgressHeartbeat({
    onEvent,
    startPct: 30,
    maxPct: 60,
    messages: isEdit
      ? [
          'Still applying slide changes...',
          'Refining the updated slide composition...',
          'Finishing the current slide draft...',
        ]
      : [
          'Still designing the slide composition...',
          'Refining hierarchy, layout, and visual balance...',
          'Finishing the current slide draft...',
        ],
  });

  const designResult = await (async () => {
    try {
      return isEdit
        ? await designEdit(
            planResult,
            input.existingSlidesHtml!,
            effectiveChatHistory,
            model,
            runtimeOnEvent,
            input.projectRulesBlock,
            guidanceProfile,
            input.editing,
            runtimeEditCorrectionPolicy,
            signal,
            runPlan,
          )
        : await design(
            planResult,
            input.existingSlidesHtml,
            effectiveChatHistory,
            model,
            runtimeOnEvent,
            input.projectRulesBlock,
            guidanceProfile,
            signal,
            runPlan,
          );
    } finally {
      stopDesignHeartbeat();
    }
  })();
  phaseTimings.push({
    phaseId: 'slide-generation',
    label: isEdit ? 'Slide editing' : 'Slide generation',
    durationMs: Math.round(performance.now() - designStartedAt),
    order: 1,
  });

  onEvent({
    type: 'progress',
    message: isEdit
      ? `Updated ${designResult.slideCount} slide(s)`
      : `Slide designed${designResult.title ? `: ${designResult.title}` : ''}`,
    pct: 70,
  });
  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.part-completed',
    role: 'generator',
    message: designLabel,
    partId: designStepId,
    pct: 70,
  });

  if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

  let finalHtml = designResult.html;
  let reviewPassed = true;

  const alwaysRunEvaluation = useSettingsStore.getState().alwaysRunEvaluation;
  let runtimeValidation = validatePresentationRuntimeOutput(designResult.html, planResult, designResult.slideCount);

  if (runtimeValidation.blockingCount > 0 || runtimeValidation.advisoryCount > 0) {
    aiDebugLog('workflow', runtimeValidation.passed ? 'QA advisories on final output' : 'QA blocking issues on final output', {
      blockingCount: runtimeValidation.blockingCount,
      advisoryCount: runtimeValidation.advisoryCount,
      summary: runtimeValidation.summary,
    });
  }

  // Step 3: run deterministic + bounded LLM repair for blocking issues (mirrors queued path)
  let repairResult: PresentationRuntimeRepairResult | undefined;
  if (!runtimeValidation.passed) {
    const repairStartedAt = performance.now();
    onEvent({ type: 'progress', message: 'Repairing slide issues...', pct: 72 });
    repairResult = await repairPresentationRuntimeOutput(
      designResult.html,
      runtimeValidation,
      planResult,
      designResult.slideCount,
      runPlan,
      onEvent,
      { model, projectRulesBlock: input.projectRulesBlock, signal },
    );
    phaseTimings.push({
      phaseId: 'repair',
      label: 'Deterministic repair',
      durationMs: Math.round(performance.now() - repairStartedAt),
      order: 2,
    });
    if (repairResult.repaired) {
      finalHtml = repairResult.html;
    }
    runtimeValidation = repairResult.validation ?? runtimeValidation;
  }

  const canEvaluate = planResult.intent !== 'add_slides';
  const initialQualityTelemetry = buildPresentationQualityTelemetry({
    html: sanitizeInnerHtml(finalHtml),
    promptText: input.prompt,
    qualityBar: runPlan?.qualityBar,
  });
  let qualityDecision = runPlan?.qualityBar
    ? decideArtifactQualityPolish({
        qualityBar: runPlan.qualityBar,
        validationPassed: runtimeValidation.passed,
        validationBlockingCount: runtimeValidation.blockingCount,
        qualityPassed: initialQualityTelemetry.qualityPassed,
        qualityScore: initialQualityTelemetry.qualityScore,
        qualityBlockingCount: initialQualityTelemetry.qualityBlockingCount,
        deterministicPolishAvailable: false,
        llmPolishAvailable: canEvaluate
          && designResult.fastPath
          && !skipSecondaryEvaluation
          && canRunPresentationQualityLlmPolish(planResult)
          && canStartOptionalLlmPolish({
            runPlan,
            usedPasses: 0,
            runtimeStartMs: runtimeStart,
          }),
      })
    : undefined;
  const needsExcellenceEvaluation = qualityDecision?.shouldPolish && qualityDecision.action === 'llm-polish';
  const shouldEvaluate =
    canEvaluate &&
    designResult.fastPath &&
    (alwaysRunEvaluation || !runtimeValidation.passed || needsExcellenceEvaluation) &&
    !skipSecondaryEvaluation;
  aiDebugLog('workflow', 'phase 3 decision', {
    intent: planResult.intent,
    fastPath: designResult.fastPath,
    qaPassed: runtimeValidation.passed,
    blockingCount: runtimeValidation.blockingCount,
    advisoryCount: runtimeValidation.advisoryCount,
    alwaysRunEvaluation,
    qualityDecision: qualityDecision?.status,
    qualityPolishAction: qualityDecision?.action,
    canEvaluate,
    skipSecondaryEvaluation,
    shouldEvaluate,
  });

  if (shouldEvaluate) {
    const evaluationStartedAt = performance.now();
    emitArtifactRunEvent(onEvent, {
      runId: runtimeRunId,
      type: 'runtime.validation-started',
      role: 'validator',
      message: needsExcellenceEvaluation ? 'Polishing quality...' : 'Evaluating quality...',
      partId: 'evaluate',
      pct: 74,
    });
    if (needsExcellenceEvaluation) {
      onEvent({ type: 'step-start', stepId: 'quality-polish', label: 'Polishing quality…' });
    }
    try {
      const qualityChecklist = buildPresentationQualityChecklist({
        html: sanitizeInnerHtml(finalHtml),
        promptText: input.prompt,
        qualityBar: runPlan?.qualityBar,
      });
      const deterministicFeedback = collectPresentationNamedFailures(qualityChecklist.checks);
      const polishedHtml = await evaluateAndRevise(
        model,
        finalHtml,
        planResult,
        runtimeOnEvent,
        input.projectRulesBlock,
        signal,
        1,
        runPlan,
        deterministicFeedback.length > 0 ? deterministicFeedback : undefined,
      );
      // Step 3: accept polish only if validation passes and quality score does not regress
      const polishedValidation = validatePresentationRuntimeOutput(polishedHtml, planResult, designResult.slideCount);
      const polishedQualityTelemetry = buildPresentationQualityTelemetry({
        html: sanitizeInnerHtml(polishedHtml),
        promptText: input.prompt,
        qualityBar: runPlan?.qualityBar,
      });
      if (
        polishedValidation.passed &&
        (polishedQualityTelemetry.qualityScore ?? 0) >= (initialQualityTelemetry.qualityScore ?? 0)
      ) {
        finalHtml = polishedHtml;
        runtimeValidation = polishedValidation;
      } else {
        aiDebugLog('workflow', 'polish output rejected (validation failed or quality regressed)', {
          polishedPassed: polishedValidation.passed,
          polishedScore: polishedQualityTelemetry.qualityScore,
          prePolishScore: initialQualityTelemetry.qualityScore,
        });
      }
      emitArtifactRunEvent(onEvent, {
        runId: runtimeRunId,
        type: 'runtime.validation-completed',
        role: 'validator',
        message: needsExcellenceEvaluation ? 'Polishing quality...' : 'Evaluating quality...',
        partId: 'evaluate',
        pct: 86,
      });
      if (needsExcellenceEvaluation) {
        onEvent({ type: 'step-done', stepId: 'quality-polish', label: 'Polishing quality…' });
      }
    } catch (evalErr) {
      aiDebugLog('workflow', 'evaluator error, using designer output', toErrorInfo(evalErr));
      console.warn('[Workflow] evaluator error, using designer output:', evalErr);
      onEvent({ type: 'step-skipped', stepId: 'evaluate', label: 'Evaluating quality...' });
      if (needsExcellenceEvaluation) {
        onEvent({ type: 'step-skipped', stepId: 'quality-polish', label: 'Polishing quality…' });
      }
    }
    phaseTimings.push({
      phaseId: needsExcellenceEvaluation ? 'quality-polish' : 'validation',
      label: needsExcellenceEvaluation ? 'Quality polish' : 'Validation',
      durationMs: Math.round(performance.now() - evaluationStartedAt),
      order: 3,
    });
  } else {
    onEvent({ type: 'step-skipped', stepId: 'evaluate', label: 'Evaluating quality...' });
    onEvent({
      type: 'progress',
      message: skipSecondaryEvaluation
        ? 'Local model safe path - skipping secondary evaluation'
        : qualityDecision?.reason ?? 'QA passed - skipping evaluation',
      pct: 85,
    });
  }

  reviewPassed = runtimeValidation.passed;

  if (signal?.aborted) throw new DOMException('Workflow aborted', 'AbortError');

  onEvent({ type: 'step-start', stepId: 'finalize', label: 'Finalizing slide...' });
  const finalizeStartedAt = performance.now();

  const outputHtml = sanitizeInnerHtml(finalHtml);
  const finalQualityTelemetry = buildPresentationQualityTelemetry({
    html: outputHtml,
    promptText: input.prompt,
    qualityBar: runPlan?.qualityBar,
  });
  qualityDecision = runPlan?.qualityBar
    ? decideArtifactQualityPolish({
        qualityBar: runPlan.qualityBar,
        validationPassed: runtimeValidation.passed,
        validationBlockingCount: runtimeValidation.blockingCount,
        qualityPassed: finalQualityTelemetry.qualityPassed,
        qualityScore: finalQualityTelemetry.qualityScore,
        qualityBlockingCount: finalQualityTelemetry.qualityBlockingCount,
        llmPolishCount: needsExcellenceEvaluation && shouldEvaluate ? 1 : 0,
        deterministicPolishAvailable: false,
        llmPolishAvailable: canEvaluate
          && designResult.fastPath
          && !skipSecondaryEvaluation
          && canRunPresentationQualityLlmPolish(planResult)
          && canStartOptionalLlmPolish({
            runPlan,
            usedPasses: needsExcellenceEvaluation && shouldEvaluate ? 1 : 0,
            runtimeStartMs: runtimeStart,
          }),
      })
    : undefined;
  const runtimeTelemetry = applyQualityDecisionTelemetry({
    ...(firstPreviewAt ? { timeToFirstPreviewMs: Math.round(firstPreviewAt - runtimeStart) } : {}),
    totalRuntimeMs: Math.round(performance.now() - runtimeStart),
    validationPassed: runtimeValidation.passed,
    validationBlockingCount: runtimeValidation.blockingCount,
    validationAdvisoryCount: runtimeValidation.advisoryCount,
    repairCount: (repairResult?.repairCount ?? 0) + (shouldEvaluate ? 1 : 0),
    runMode: 'single-stream',
    queuedPartCount: 1,
    completedPartCount: designResult.slideCount,
    phaseTimings: [
      ...phaseTimings,
      {
        phaseId: 'finalize',
        label: 'Finalize',
        durationMs: Math.round(performance.now() - finalizeStartedAt),
        order: 99,
      },
    ],
    ...finalQualityTelemetry,
    validationByPart: runtimeValidation.validationByPart,
  }, qualityDecision, needsExcellenceEvaluation && shouldEvaluate ? 'llm-polish' : qualityDecision?.action);
  const output: PresentationOutput = {
    html: outputHtml,
    title: designResult.title,
    slideCount: designResult.slideCount,
    reviewPassed,
    runtime: runtimeTelemetry,
    ...(designResult.editing ? { editing: designResult.editing } : {}),
  };

  if (designResult.editing) {
    logEditingMetrics('presentation', {
      ...designResult.editing,
      regenerationAvoided: designResult.editing.strategyUsed !== 'full-regenerate',
    });
  }

  emitArtifactRunEvent(onEvent, {
    runId: runtimeRunId,
    type: 'runtime.finalized',
    role: 'finalizer',
    message: 'Finalizing slide...',
    partId: 'finalize',
    pct: 100,
  });
  onEvent({ type: 'complete', result: output });

  return output;
}

export function finalizeStaticPresentationRuntime(
  input: StaticPresentationRuntimeFinalizeInput,
): PresentationOutput {
  const runtimeStart = performance.now();
  const html = sanitizeSlideHtml(input.rawHtml);
  const qualityTelemetry = buildPresentationQualityTelemetry({
    html,
    promptText: input.title,
    qualityBar: input.runPlan?.qualityBar,
  });
  const qaResult = validateSlides(html, {
    expectedSlideCount: input.slideCount,
    isCreate: true,
  });
  const blockingCount = qaResult.violations.filter((violation) => violation.tier === 'blocking').length;
  const advisoryCount = qaResult.violations.length - blockingCount;
  const validationByPart = summarizePresentationValidationByPart(qaResult.violations, input.slideCount);
  const qualityDecision = input.runPlan?.qualityBar
    ? decideArtifactQualityPolish({
        qualityBar: input.runPlan.qualityBar,
        validationPassed: blockingCount === 0,
        validationBlockingCount: blockingCount,
        qualityPassed: qualityTelemetry.qualityPassed,
        qualityScore: qualityTelemetry.qualityScore,
        qualityBlockingCount: qualityTelemetry.qualityBlockingCount,
        deterministicPolishAvailable: false,
        llmPolishAvailable: false,
      })
    : undefined;

  return {
    html,
    title: input.title,
    slideCount: input.slideCount,
    reviewPassed: blockingCount === 0,
    runtime: applyQualityDecisionTelemetry({
      timeToFirstPreviewMs: 0,
      totalRuntimeMs: Math.round(performance.now() - runtimeStart),
      validationPassed: blockingCount === 0,
      validationBlockingCount: blockingCount,
      validationAdvisoryCount: advisoryCount,
      repairCount: 0,
      runMode: 'deterministic-action',
      queuedPartCount: input.slideCount,
      completedPartCount: input.slideCount,
      repairedPartCount: 0,
      phaseTimings: [{
        phaseId: 'deterministic-finalize',
        label: 'Deterministic finalize',
        durationMs: Math.round(performance.now() - runtimeStart),
        order: 0,
      }],
      ...qualityTelemetry,
      validationByPart,
    }, qualityDecision),
  };
}
