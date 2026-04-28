/* global process */
/**
 * Ollama Artifact Benchmark Runner
 *
 * Runs the normal Aura artifact workflows with a local Ollama model and writes
 * a repeatable scorecard to logs/ollama-benchmark/<timestamp>/.
 *
 * Usage:
 *   npm run benchmark:ollama
 *
 * Environment variables:
 *   AURA_OLLAMA_MODEL       Ollama model tag (default: gemma4:e2b)
 *   AURA_OLLAMA_BASE_URL    Ollama base URL (default: http://127.0.0.1:11434)
 *   AURA_OLLAMA_CASES       Comma-separated case IDs to run (default: all)
 *   AURA_OLLAMA_RERUNS      Runs per case for consistency scoring (default: 1)
 *   AURA_OLLAMA_JUDGE       Set to "1" to enable optional model judge notes
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LanguageModel } from 'ai';
import { generateText } from 'ai';

import { buildArtifactRunPlan } from '@/services/artifactRuntime/build';
import type { BuildArtifactRunPlanInput } from '@/services/artifactRuntime/build';
import { finalizeSpreadsheetRuntimeResult } from '@/services/artifactRuntime/spreadsheetRuntime';
import type { ArtifactWorkflowRequestKind } from '@/services/artifactRuntime/types';
import { getProviderEntry } from '@/services/ai/registry';
import { runDocumentWorkflow } from '@/services/ai/workflow/document';
import { runPresentationWorkflow } from '@/services/ai/workflow/presentation';
import { runSpreadsheetWorkflow } from '@/services/ai/workflow/spreadsheet';
import type { ArtifactRuntimeTelemetry, LLMConfig, WorkflowEvent } from '@/services/ai/workflow/types';
import type { EditStrategy, ResolvedTarget } from '@/services/editing/types';
import {
  WORKFLOW_BENCHMARK_CASES,
  type WorkflowBenchmarkCaseDefinition,
} from '@/test/fixtures/workflow-benchmark-cases';
import type { DocumentType, ProjectDocument, WorkbookMeta } from '@/types/project';
import {
  benchmarkCasePassed,
  buildBenchmarkSummary,
  classifyBenchmarkFailure,
  computeConsistencyScore,
  generateOllamaBenchmarkScorecard,
  qualityGradeFromScore,
  scoreBenchmarkCase,
} from '@/services/benchmarkHarness';
import type {
  BenchmarkCaseTelemetry,
  BenchmarkQualityGrade,
  BenchmarkRunResult,
} from '@/services/benchmarkHarness';

const MODEL = process.env['AURA_OLLAMA_MODEL'] ?? 'gemma4:e2b';
const BASE_URL = process.env['AURA_OLLAMA_BASE_URL'] ?? 'http://127.0.0.1:11434';
const RERUNS = Math.max(1, Number.parseInt(process.env['AURA_OLLAMA_RERUNS'] ?? '1', 10));
const JUDGE_ENABLED = process.env['AURA_OLLAMA_JUDGE'] === '1';
const CASE_FILTER = process.env['AURA_OLLAMA_CASES']
  ? new Set(process.env['AURA_OLLAMA_CASES'].split(',').map((entry) => entry.trim()).filter(Boolean))
  : null;
const DEFAULT_LOCAL_QUALITY_THRESHOLD = 78;

const SAMPLE_PRESENTATION_HTML = `<style>
:root { --aura-bg: #f8fafc; --aura-ink: #172033; --aura-accent: #2f6f73; }
section { box-sizing: border-box; width: 100%; height: 100%; padding: 56px; background: var(--aura-bg); color: var(--aura-ink); font-family: Inter, Arial, sans-serif; }
.benchmark-title { font-size: 64px; line-height: 0.95; max-width: 760px; margin: 0 0 24px; }
.benchmark-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 32px; align-items: end; height: 100%; }
.benchmark-panel { border: 1px solid rgba(47, 111, 115, 0.24); padding: 24px; background: rgba(255,255,255,0.72); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>
<section data-background-color="#f8fafc">
  <div class="benchmark-grid">
    <div>
      <p>Current strategic transformation briefing</p>
      <h1 class="benchmark-title">A focused path to operating clarity</h1>
      <p>Baseline content used by the benchmark for edit, restyle, queue, and rewrite flows.</p>
    </div>
    <div class="benchmark-panel">Proof points, rollout plan, and next-step decisions.</div>
  </div>
</section>`;

const SAMPLE_DOCUMENT_HTML = `<main class="doc-shell">
  <section class="doc-hero">
    <p>Transformation report</p>
    <h1>Operating clarity for the next planning cycle</h1>
    <p>This baseline brief gives the benchmark a realistic document surface for edit, restyle, export, and rewrite flows.</p>
  </section>
  <section>
    <h2>Current findings</h2>
    <p>The organization needs a clearer narrative, stronger evidence modules, and more useful executive summaries.</p>
  </section>
</main>`;

const SAMPLE_WORKBOOK: WorkbookMeta = {
  activeSheetIndex: 0,
  sheets: [
    {
      id: 'benchmark-regional-performance',
      name: 'Regional Performance',
      tableName: 'benchmark_regional_performance',
      schema: [
        { name: 'Region', type: 'text', nullable: false },
        { name: 'Revenue', type: 'number', nullable: false },
        { name: 'Cost', type: 'number', nullable: false },
        { name: 'Quarter', type: 'text', nullable: false },
      ],
      frozenRows: 1,
      frozenCols: 0,
      columnWidths: {
        Region: 18,
        Revenue: 14,
        Cost: 14,
        Quarter: 12,
      },
      formulas: [],
    },
  ],
};

interface BenchmarkRunArtifacts {
  telemetry: BenchmarkCaseTelemetry;
  qualityThreshold: number;
  expectedRoutingKind: ArtifactWorkflowRequestKind;
  events: unknown[];
  outputHtml?: string;
  outputJson?: unknown;
  judgeHtml?: string;
}

interface JudgeRubric {
  looksPremium: string;
  contentDepth: string;
  notBoring: string;
  starterSimilarity: string;
  userUsefulness: string;
}

function elapsedMs(startMs: number): number {
  return Math.round(performance.now() - startMs);
}

function normalizeGrade(grade: ArtifactRuntimeTelemetry['qualityGrade'] | undefined, score: number): BenchmarkQualityGrade {
  return grade ?? qualityGradeFromScore(score);
}

function operationForCase(benchCase: WorkflowBenchmarkCaseDefinition): BuildArtifactRunPlanInput['operation'] {
  if (benchCase.caseFamily === 'create') return 'create';
  if (benchCase.caseFamily === 'validation-export' || benchCase.caseFamily === 'runtime-plan') return 'action';
  return 'edit';
}

function expectedRoutingKindForCase(benchCase: WorkflowBenchmarkCaseDefinition): ArtifactWorkflowRequestKind {
  switch (benchCase.caseFamily) {
    case 'queued-work':
      return 'queue';
    case 'structural-rewrite':
      return 'rewrite';
    case 'style-theme':
      return 'restyle';
    case 'content-edit':
    case 'validation-export':
    case 'runtime-plan':
      return 'edit';
    case 'create':
      return benchCase.artifactType === 'presentation' && /\b(deck|keynote|presentation|slideshow|powerpoint)\b/i.test(benchCase.fixturePrompt)
        ? 'batch'
        : 'create';
  }
}

function makeExistingDocument(type: DocumentType): ProjectDocument {
  const now = Date.now();
  return {
    id: `benchmark-existing-${type}`,
    title: `Benchmark Existing ${type}`,
    type,
    contentHtml: type === 'presentation' ? SAMPLE_PRESENTATION_HTML : type === 'document' ? SAMPLE_DOCUMENT_HTML : '',
    sourceMarkdown: type === 'document'
      ? '# Operating clarity for the next planning cycle\n\nBaseline content for benchmark edit flows.'
      : undefined,
    themeCss: '',
    slideCount: type === 'presentation' ? 1 : 0,
    chartSpecs: {},
    workbook: type === 'spreadsheet' ? SAMPLE_WORKBOOK : undefined,
    lifecycleState: 'draft',
    createdAt: now,
    updatedAt: now,
    order: 0,
  };
}

function editingStrategyForCase(benchCase: WorkflowBenchmarkCaseDefinition): EditStrategy {
  switch (benchCase.caseFamily) {
    case 'style-theme':
      return 'style-token';
    case 'structural-rewrite':
      return 'full-regenerate';
    case 'queued-work':
    case 'content-edit':
    case 'validation-export':
    case 'runtime-plan':
    case 'create':
      return 'block-replace';
  }
}

function targetSelectorTypeForCase(benchCase: WorkflowBenchmarkCaseDefinition): ResolvedTarget['selector']['type'] {
  if (benchCase.artifactType === 'presentation') {
    if (benchCase.caseFamily === 'style-theme') return 'deck-style';
    return 'slide-title';
  }
  if (benchCase.artifactType === 'spreadsheet') return 'active-sheet';
  if (benchCase.caseFamily === 'style-theme') return 'metadata-band';
  return 'heading-section';
}

function buildEditingContext(benchCase: WorkflowBenchmarkCaseDefinition): {
  resolvedTargets: ResolvedTarget[];
  targetSummary: string[];
  strategyHint?: EditStrategy;
  allowFullRegeneration: boolean;
} | undefined {
  if (operationForCase(benchCase) === 'create' || benchCase.artifactType === 'spreadsheet') return undefined;

  const targetLabel = benchCase.caseFamily === 'structural-rewrite'
    ? `Entire ${benchCase.artifactType}`
    : benchCase.expectedFocus;
  const target: ResolvedTarget = {
    selector: {
      type: targetSelectorTypeForCase(benchCase),
      label: targetLabel,
    },
    artifactType: benchCase.artifactType,
    label: targetLabel,
  };

  if (benchCase.artifactType === 'presentation') {
    target.slideIndex = 0;
  }

  return {
    resolvedTargets: [target],
    targetSummary: [targetLabel],
    strategyHint: editingStrategyForCase(benchCase),
    allowFullRegeneration: benchCase.caseFamily === 'structural-rewrite',
  };
}

function buildRunPlanInput(benchCase: WorkflowBenchmarkCaseDefinition, runIndex: number): BuildArtifactRunPlanInput {
  const operation = operationForCase(benchCase);
  return {
    runId: `benchmark-${benchCase.id}-run${runIndex + 1}`,
    prompt: benchCase.fixturePrompt,
    artifactType: benchCase.artifactType,
    operation,
    activeDocument: operation === 'create' ? null : makeExistingDocument(benchCase.artifactType),
    mode: 'execute',
    providerId: 'ollama',
    providerModel: MODEL,
    allowFullRegeneration: benchCase.caseFamily === 'structural-rewrite',
  };
}

function summarizeWorkflowEvent(event: WorkflowEvent): unknown {
  switch (event.type) {
    case 'draft-complete':
      return { type: event.type, htmlLength: event.html.length };
    case 'batch-slide-complete':
      return {
        type: event.type,
        htmlLength: event.html.length,
        slideIndex: event.slideIndex,
        totalSlides: event.totalSlides,
      };
    case 'complete':
      return { type: event.type, resultKind: typeof event.result };
    case 'streaming':
      return { type: event.type, stepId: event.stepId, chunkLength: event.chunk.length };
    default:
      return event;
  }
}

function createEventCapture(startMs: number): {
  events: unknown[];
  onEvent: (event: WorkflowEvent) => void;
  firstProgressMs: () => number | null;
  firstUsableOutputMs: () => number | null;
} {
  const events: unknown[] = [];
  let firstProgress: number | null = null;
  let firstUsable: number | null = null;

  const onEvent = (event: WorkflowEvent) => {
    const elapsed = elapsedMs(startMs);
    if (
      firstProgress === null &&
      (
        event.type === 'step-start' ||
        event.type === 'progress' ||
        event.type === 'streaming' ||
        event.type === 'draft-complete' ||
        event.type === 'batch-slide-complete'
      )
    ) {
      firstProgress = elapsed;
    }
    if (
      firstUsable === null &&
      (
        event.type === 'draft-complete' ||
        event.type === 'batch-slide-complete' ||
        event.type === 'complete'
      )
    ) {
      firstUsable = elapsed;
    }
    events.push(summarizeWorkflowEvent(event));
  };

  return {
    events,
    onEvent,
    firstProgressMs: () => firstProgress,
    firstUsableOutputMs: () => firstUsable,
  };
}

function failedSignalsFromRuntime(runtime: ArtifactRuntimeTelemetry | undefined): string[] {
  return (runtime?.qualitySignals ?? [])
    .filter((signal) => !signal.passed)
    .map((signal) => signal.id);
}

function telemetryFromRuntime(input: {
  runtime?: ArtifactRuntimeTelemetry;
  routingKind: ArtifactWorkflowRequestKind;
  firstProgressMs: number | null;
  firstUsableOutputMs: number | null;
  totalMs: number;
  fallbackScore?: number;
}): BenchmarkCaseTelemetry {
  const qualityScore = input.runtime?.qualityScore ?? input.fallbackScore ?? 0;
  return {
    qualityScore,
    qualityGrade: normalizeGrade(input.runtime?.qualityGrade, qualityScore),
    validationPassed: input.runtime?.validationPassed ?? false,
    validationBlockingCount: input.runtime?.validationBlockingCount ?? 0,
    failedSignalIds: failedSignalsFromRuntime(input.runtime),
    firstProgressMs: input.firstProgressMs,
    firstUsableOutputMs: input.firstUsableOutputMs,
    totalMs: input.totalMs,
    routingKind: input.routingKind,
  };
}

function errorArtifacts(input: {
  benchCase: WorkflowBenchmarkCaseDefinition;
  startMs: number;
  events: unknown[];
  error: unknown;
  routingKind?: ArtifactWorkflowRequestKind;
  qualityThreshold?: number;
}): BenchmarkRunArtifacts {
  return {
    telemetry: {
      qualityScore: 0,
      qualityGrade: 'needs-polish',
      validationPassed: false,
      validationBlockingCount: 1,
      failedSignalIds: [],
      firstProgressMs: null,
      firstUsableOutputMs: null,
      totalMs: elapsedMs(input.startMs),
      routingKind: input.routingKind,
      error: input.error instanceof Error ? input.error.message : String(input.error),
    },
    qualityThreshold: input.qualityThreshold ?? DEFAULT_LOCAL_QUALITY_THRESHOLD,
    expectedRoutingKind: expectedRoutingKindForCase(input.benchCase),
    events: input.events,
    outputJson: {
      error: input.error instanceof Error ? input.error.message : String(input.error),
    },
  };
}

async function runPresentationCase(
  benchCase: WorkflowBenchmarkCaseDefinition,
  runIndex: number,
  llmConfig: LLMConfig,
): Promise<BenchmarkRunArtifacts> {
  const startMs = performance.now();
  const capture = createEventCapture(startMs);
  let routingKind: ArtifactWorkflowRequestKind | undefined;
  let qualityThreshold = DEFAULT_LOCAL_QUALITY_THRESHOLD;

  try {
    const planInput = buildRunPlanInput(benchCase, runIndex);
    const activeDocument = planInput.activeDocument;
    const runPlan = buildArtifactRunPlan(planInput);
    routingKind = runPlan.requestKind;
    qualityThreshold = runPlan.qualityBar.acceptanceThresholds.minimumScore;

    const output = await runPresentationWorkflow({
      input: {
        prompt: benchCase.fixturePrompt,
        existingSlidesHtml: activeDocument?.type === 'presentation' ? activeDocument.contentHtml : undefined,
        chatHistory: [],
        artifactRunPlan: runPlan,
        templateGuidance: runPlan.templateGuidance,
        ...(buildEditingContext(benchCase) ? { editing: buildEditingContext(benchCase) } : {}),
      },
      llmConfig,
      onEvent: capture.onEvent,
    });
    const totalMs = elapsedMs(startMs);

    return {
      telemetry: telemetryFromRuntime({
        runtime: output.runtime,
        routingKind,
        firstProgressMs: capture.firstProgressMs(),
        firstUsableOutputMs: capture.firstUsableOutputMs() ?? (output.html ? totalMs : null),
        totalMs,
      }),
      qualityThreshold,
      expectedRoutingKind: expectedRoutingKindForCase(benchCase),
      events: capture.events,
      outputHtml: output.html,
      judgeHtml: output.html,
    };
  } catch (error) {
    return errorArtifacts({
      benchCase,
      startMs,
      events: capture.events,
      error,
      routingKind,
      qualityThreshold,
    });
  }
}

async function runDocumentCase(
  benchCase: WorkflowBenchmarkCaseDefinition,
  runIndex: number,
  llmConfig: LLMConfig,
): Promise<BenchmarkRunArtifacts> {
  const startMs = performance.now();
  const capture = createEventCapture(startMs);
  let routingKind: ArtifactWorkflowRequestKind | undefined;
  let qualityThreshold = DEFAULT_LOCAL_QUALITY_THRESHOLD;

  try {
    const planInput = buildRunPlanInput(benchCase, runIndex);
    const activeDocument = planInput.activeDocument;
    const runPlan = buildArtifactRunPlan(planInput);
    routingKind = runPlan.requestKind;
    qualityThreshold = runPlan.qualityBar.acceptanceThresholds.minimumScore;

    const output = await runDocumentWorkflow({
      input: {
        prompt: benchCase.fixturePrompt,
        existingHtml: activeDocument?.type === 'document' ? activeDocument.contentHtml : undefined,
        existingMarkdown: activeDocument?.type === 'document' ? activeDocument.sourceMarkdown : undefined,
        chatHistory: [],
        artifactRunPlan: runPlan,
        templateGuidance: runPlan.templateGuidance,
        styleHint: runPlan.documentThemeFamily,
        ...(buildEditingContext(benchCase) ? { editing: buildEditingContext(benchCase) } : {}),
      },
      llmConfig,
      onEvent: capture.onEvent,
    });
    const totalMs = elapsedMs(startMs);

    return {
      telemetry: telemetryFromRuntime({
        runtime: output.runtime,
        routingKind,
        firstProgressMs: capture.firstProgressMs(),
        firstUsableOutputMs: capture.firstUsableOutputMs() ?? (output.html ? totalMs : null),
        totalMs,
      }),
      qualityThreshold,
      expectedRoutingKind: expectedRoutingKindForCase(benchCase),
      events: capture.events,
      outputHtml: output.html,
      judgeHtml: output.html,
    };
  } catch (error) {
    return errorArtifacts({
      benchCase,
      startMs,
      events: capture.events,
      error,
      routingKind,
      qualityThreshold,
    });
  }
}

async function runSpreadsheetCase(
  benchCase: WorkflowBenchmarkCaseDefinition,
  runIndex: number,
): Promise<BenchmarkRunArtifacts> {
  const startMs = performance.now();
  const capture = createEventCapture(startMs);
  let routingKind: ArtifactWorkflowRequestKind | undefined;
  let qualityThreshold = DEFAULT_LOCAL_QUALITY_THRESHOLD;

  try {
    const planInput = buildRunPlanInput(benchCase, runIndex);
    const activeDocument = planInput.activeDocument;
    const runPlan = buildArtifactRunPlan(planInput);
    routingKind = runPlan.requestKind;
    qualityThreshold = runPlan.qualityBar.acceptanceThresholds.minimumScore;

    const result = await runSpreadsheetWorkflow({
      prompt: benchCase.fixturePrompt,
      activeWorkbook: activeDocument?.type === 'spreadsheet' ? activeDocument.workbook ?? null : null,
      activeDocumentId: activeDocument?.type === 'spreadsheet' ? activeDocument.id : null,
      projectDocumentCount: 1,
      isDefaultSheet: false,
      artifactRunPlan: runPlan,
    });

    const totalMs = elapsedMs(startMs);
    const finalized = finalizeSpreadsheetRuntimeResult({
      runPlan,
      result,
      totalRuntimeMs: totalMs,
      onEvent: capture.onEvent,
    });

    return {
      telemetry: telemetryFromRuntime({
        runtime: finalized.runtime,
        routingKind,
        firstProgressMs: capture.firstProgressMs() ?? 0,
        firstUsableOutputMs: capture.firstUsableOutputMs() ?? totalMs,
        totalMs,
      }),
      qualityThreshold,
      expectedRoutingKind: expectedRoutingKindForCase(benchCase),
      events: capture.events,
      outputJson: {
        result,
        runtime: finalized.runtime,
        parts: finalized.parts,
        advancedDiagnostics: finalized.advancedDiagnostics,
      },
    };
  } catch (error) {
    return errorArtifacts({
      benchCase,
      startMs,
      events: capture.events,
      error,
      routingKind,
      qualityThreshold,
    });
  }
}

async function runBenchmarkCase(
  benchCase: WorkflowBenchmarkCaseDefinition,
  runIndex: number,
  llmConfig: LLMConfig,
): Promise<BenchmarkRunArtifacts> {
  switch (benchCase.artifactType) {
    case 'presentation':
      return runPresentationCase(benchCase, runIndex, llmConfig);
    case 'document':
      return runDocumentCase(benchCase, runIndex, llmConfig);
    case 'spreadsheet':
      return runSpreadsheetCase(benchCase, runIndex);
  }
}

async function runOllamaJudge(
  model: LanguageModel,
  html: string,
  prompt: string,
): Promise<JudgeRubric | null> {
  const judgePrompt = [
    'You are a design quality judge. Return ONLY a JSON object with these keys:',
    '"looksPremium", "contentDepth", "notBoring", "starterSimilarity", "userUsefulness".',
    'Each value must be a brief note, not a score.',
    '',
    `Original prompt: ${prompt}`,
    '',
    'HTML:',
    html.slice(0, 4000),
  ].join('\n');

  try {
    const result = await generateText({
      model,
      prompt: judgePrompt,
      maxOutputTokens: 512,
    });
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as JudgeRubric;
  } catch {
    return null;
  }
}

function createRunResult(input: {
  benchCase: WorkflowBenchmarkCaseDefinition;
  runIndex: number;
  artifacts: BenchmarkRunArtifacts;
  consistencyScore: number;
}): BenchmarkRunResult {
  const { benchCase, runIndex, artifacts, consistencyScore } = input;
  const telemetry = artifacts.telemetry;
  const score = scoreBenchmarkCase({
    qualityScore: telemetry.qualityScore,
    validationPassed: telemetry.validationPassed,
    totalMs: telemetry.totalMs,
    consistencyScore,
  });
  const passed = benchmarkCasePassed({
    qualityScore: telemetry.qualityScore,
    validationPassed: telemetry.validationPassed,
    localMinimumScore: artifacts.qualityThreshold,
  });
  const failureClassification = classifyBenchmarkFailure({
    error: telemetry.error,
    routingKind: telemetry.routingKind,
    expectedRoutingKind: artifacts.expectedRoutingKind,
    validationPassed: telemetry.validationPassed,
    failedSignalIds: telemetry.failedSignalIds,
    qualityScore: telemetry.qualityScore,
    qualityThreshold: artifacts.qualityThreshold,
  });

  return {
    caseId: benchCase.id,
    artifactType: benchCase.artifactType,
    provider: 'ollama',
    model: MODEL,
    runIndex,
    timings: {
      firstProgressMs: telemetry.firstProgressMs,
      firstUsableOutputMs: telemetry.firstUsableOutputMs,
      totalMs: telemetry.totalMs,
    },
    score,
    qualityGrade: telemetry.qualityGrade,
    failedSignals: telemetry.failedSignalIds,
    failureClassification,
    result: telemetry.error ? 'error' : passed ? 'pass' : 'fail',
    notes: telemetry.error ?? '',
  };
}

async function writeOutputs(
  outputDir: string,
  caseId: string,
  runIndex: number,
  artifacts: BenchmarkRunArtifacts,
  runResult: BenchmarkRunResult,
  judgeResult: JudgeRubric | null,
): Promise<void> {
  const prefix = join(outputDir, `${caseId}-run${runIndex + 1}`);
  await writeFile(`${prefix}.telemetry.json`, JSON.stringify(artifacts.telemetry, null, 2));
  await writeFile(`${prefix}.result.json`, JSON.stringify(runResult, null, 2));
  await writeFile(`${prefix}.events.json`, JSON.stringify(artifacts.events, null, 2));

  if (artifacts.outputHtml !== undefined) {
    await writeFile(`${prefix}.output.html`, artifacts.outputHtml);
  } else {
    await writeFile(`${prefix}.output.json`, JSON.stringify(artifacts.outputJson ?? null, null, 2));
  }

  if (judgeResult) {
    await writeFile(`${prefix}.judge.json`, JSON.stringify(judgeResult, null, 2));
  }
}

async function createJudgeModel(llmConfig: LLMConfig): Promise<LanguageModel | null> {
  if (!JUDGE_ENABLED) return null;
  return llmConfig.providerEntry.createModel({
    apiKey: llmConfig.apiKey,
    baseUrl: llmConfig.baseUrl,
    model: llmConfig.model,
  });
}

async function main(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = join(process.cwd(), 'logs', 'ollama-benchmark', timestamp);
  await mkdir(outputDir, { recursive: true });

  const cases = WORKFLOW_BENCHMARK_CASES.filter((benchCase) => !CASE_FILTER || CASE_FILTER.has(benchCase.id));
  const providerEntry = getProviderEntry('ollama');
  const llmConfig: LLMConfig = {
    providerEntry,
    apiKey: 'ollama',
    baseUrl: BASE_URL,
    model: MODEL,
  };
  const judgeModel = await createJudgeModel(llmConfig);

  console.log('');
  console.log('Ollama Benchmark');
  console.log(`  Model:    ${MODEL}`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Cases:    ${cases.length}`);
  console.log(`  Reruns:   ${RERUNS}`);
  console.log(`  Judge:    ${judgeModel ? 'enabled' : 'disabled'}`);
  console.log(`  Output:   ${outputDir}`);
  console.log('');

  const allResults: BenchmarkRunResult[] = [];

  for (const benchCase of cases) {
    const runs: BenchmarkRunArtifacts[] = [];

    for (let runIndex = 0; runIndex < RERUNS; runIndex += 1) {
      process.stdout.write(`  ${benchCase.id} [run ${runIndex + 1}/${RERUNS}]... `);
      const artifacts = await runBenchmarkCase(benchCase, runIndex, llmConfig);
      runs.push(artifacts);
      const state = artifacts.telemetry.error ? 'ERROR' : 'done';
      console.log(`${state} quality=${artifacts.telemetry.qualityScore} totalMs=${artifacts.telemetry.totalMs}`);
    }

    const consistencyScore = RERUNS > 1
      ? computeConsistencyScore(runs.map((run) => run.telemetry.qualityScore))
      : 100;

    for (let runIndex = 0; runIndex < runs.length; runIndex += 1) {
      const artifacts = runs[runIndex]!;
      const runResult = createRunResult({
        benchCase,
        runIndex,
        artifacts,
        consistencyScore,
      });
      allResults.push(runResult);

      const judgeResult = judgeModel && artifacts.judgeHtml && !artifacts.telemetry.error
        ? await runOllamaJudge(judgeModel, artifacts.judgeHtml, benchCase.fixturePrompt)
        : null;
      await writeOutputs(outputDir, benchCase.id, runIndex, artifacts, runResult, judgeResult);
    }
  }

  const summary = buildBenchmarkSummary(allResults, {
    model: MODEL,
    baseUrl: BASE_URL,
    timestamp: new Date().toISOString(),
  });
  const scorecard = generateOllamaBenchmarkScorecard(summary);

  await writeFile(join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
  await writeFile(join(outputDir, 'scorecard.md'), scorecard);

  console.log('');
  console.log('-'.repeat(60));
  console.log(`Pass rate: ${summary.passCount}/${summary.totalCases}`);
  console.log(`Average composite score: ${summary.averageCompositeScore}`);
  console.log(`Full scorecard: ${join(outputDir, 'scorecard.md')}`);
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
