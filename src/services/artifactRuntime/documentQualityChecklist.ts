import type { ArtifactRuntimeTelemetry } from '@/services/ai/workflow/types';
import { estimateRuntimePromptTokens } from '@/services/artifactRuntime/diagnostics';
import {
  scoreAgainstTarget,
  scoreQualitySignal,
  summarizeQualitySignals,
} from '@/services/artifactRuntime/qualityScoring';
import type {
  ArtifactQualityBar,
  ArtifactQualityGrade,
  ArtifactQualitySignalId,
  ArtifactQualitySignalScore,
} from '@/services/artifactRuntime/types';

export interface DocumentQualityChecklistInput {
  html: string;
  promptText?: string;
  promptChars?: number;
  qualityBar?: ArtifactQualityBar;
}

export interface DocumentQualityCheck {
  id:
    | 'iframe-contract'
    | 'typography'
    | 'mobile-safety'
    | 'print-safety'
    | 'prompt-estimate'
    | 'excellence-depth'
    | 'excellence-rhythm'
    | 'excellence-score';
  label: string;
  passed: boolean;
  blockingCount: number;
  advisoryCount: number;
  details: string[];
}

export interface DocumentQualityChecklistResult {
  ready: boolean;
  promptTokenEstimate: number;
  blockingCount: number;
  advisoryCount: number;
  checks: DocumentQualityCheck[];
  qualityScore?: number;
  qualityGrade?: ArtifactQualityGrade;
  qualitySignals?: ArtifactQualitySignalScore[];
  qualityPolishingSkippedReason?: string;
}

function buildIframeContractCheck(html: string): DocumentQualityCheck {
  const blockingDetails: string[] = [];
  const advisoryDetails: string[] = [];

  if (/<(?:html|body|head|iframe|object|embed|link|meta|title)\b/i.test(html)) {
    blockingDetails.push('Document output contains unsupported wrappers or embedded objects.');
  }
  if (/<script\b/i.test(html)) {
    blockingDetails.push('Document output contains script tags.');
  }
  if (/\b(?:src|href|poster)=["']https?:\/\//i.test(html) || /url\(\s*["']?https?:\/\//i.test(html)) {
    blockingDetails.push('Document output references remote assets.');
  }

  const fixedWidthRisks = Array.from(html.matchAll(/\b([a-z-]*width)\s*:\s*(\d+)px/gi))
    .filter(([, property, size]) => {
      const normalizedProperty = property?.toLowerCase();
      return (normalizedProperty === 'width' || normalizedProperty === 'min-width') &&
        Number.parseInt(size ?? '0', 10) > 720;
    });
  if (fixedWidthRisks.length > 0) {
    blockingDetails.push('Document output includes fixed-width modules that may clip in framed mobile viewports.');
  }

  if (/<table\b/i.test(html) && !/(?:table\s*\{[^}]*width\s*:\s*100%|overflow-x\s*:\s*auto)/i.test(html)) {
    advisoryDetails.push('Tables should use fluid width or an overflow-safe wrapper.');
  }

  return {
    id: 'iframe-contract',
    label: 'Document iframe contract',
    passed: blockingDetails.length === 0 && advisoryDetails.length === 0,
    blockingCount: blockingDetails.length,
    advisoryCount: advisoryDetails.length,
    details: [...blockingDetails, ...advisoryDetails],
  };
}

function buildTypographyCheck(html: string): DocumentQualityCheck {
  const blockingDetails: string[] = [];
  const advisoryDetails: string[] = [];
  const bodyFontMatch = /\bbody\s*\{[^}]*font(?:-size)?\s*:\s*(?:[^;}]*\s)?(\d+)px/i.exec(html);
  const paragraphFontMatch = /\.doc-section\s+p[\s\S]*?font-size\s*:\s*(\d+)px/i.exec(html);

  if (bodyFontMatch && Number.parseInt(bodyFontMatch[1] ?? '0', 10) < 16) {
    blockingDetails.push('Document body type must be at least 16px.');
  }
  if (paragraphFontMatch && Number.parseInt(paragraphFontMatch[1] ?? '0', 10) < 16) {
    blockingDetails.push('Document paragraph/list type must be at least 16px.');
  }

  const tinyInlineText = Array.from(html.matchAll(/<(?:p|li|td|th)\b[^>]*style=["'][^"']*font-size\s*:\s*(\d+)px/gi))
    .filter(([, size]) => Number.parseInt(size ?? '0', 10) < 16);
  if (tinyInlineText.length > 0) {
    blockingDetails.push('Essential document text uses inline font sizes below 16px.');
  }

  if (!bodyFontMatch && !paragraphFontMatch) {
    advisoryDetails.push('Document shell should declare a readable 16px+ body or paragraph type scale.');
  }

  return {
    id: 'typography',
    label: 'Readable document typography',
    passed: blockingDetails.length === 0 && advisoryDetails.length === 0,
    blockingCount: blockingDetails.length,
    advisoryCount: advisoryDetails.length,
    details: [...blockingDetails, ...advisoryDetails],
  };
}

function buildMobileSafetyCheck(html: string): DocumentQualityCheck {
  const blockingDetails: string[] = [];
  const advisoryDetails: string[] = [];

  if (/grid-template-columns\s*:\s*repeat\(\s*[3-9]/i.test(html) && !/auto-fit|auto-fill|@media\s*\(\s*max-width/i.test(html)) {
    blockingDetails.push('Dense fixed grid columns need auto-fit/auto-fill or a mobile media fallback.');
  }
  if (/\b(?:img|svg|canvas)\b/i.test(html) && !/max-width\s*:\s*100%/i.test(html)) {
    advisoryDetails.push('Media should be fluid with max-width: 100%.');
  }

  return {
    id: 'mobile-safety',
    label: 'Mobile-safe document layout',
    passed: blockingDetails.length === 0 && advisoryDetails.length === 0,
    blockingCount: blockingDetails.length,
    advisoryCount: advisoryDetails.length,
    details: [...blockingDetails, ...advisoryDetails],
  };
}

function buildPrintSafetyCheck(html: string): DocumentQualityCheck {
  const advisoryDetails: string[] = [];

  if (!/@media\s+print/i.test(html)) {
    advisoryDetails.push('Document shell should include a print media rule.');
  }
  if (/@keyframes|animation\s*:/i.test(html)) {
    advisoryDetails.push('Document output should remain mostly static for print/export.');
  }

  return {
    id: 'print-safety',
    label: 'Print-safe document structure',
    passed: advisoryDetails.length === 0,
    blockingCount: 0,
    advisoryCount: advisoryDetails.length,
    details: advisoryDetails,
  };
}

function buildPromptEstimateCheck(promptTokenEstimate: number): DocumentQualityCheck {
  return {
    id: 'prompt-estimate',
    label: 'Prompt token estimate',
    passed: true,
    blockingCount: 0,
    advisoryCount: 0,
    details: [`Estimated prompt tokens: ${promptTokenEstimate}`],
  };
}

function visibleTextFromHtml(html: string): string {
  return html
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(value: string): number {
  return value.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g)?.length ?? 0;
}

function countMatches(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0;
}

function hasPattern(html: string, pattern: RegExp): boolean {
  return pattern.test(html);
}

function targetForSignal(qualityBar: ArtifactQualityBar, id: ArtifactQualitySignalId): number {
  return qualityBar.signals.find((signal) => signal.id === id)?.target ?? qualityBar.acceptanceThresholds.minimumScore;
}

function countDocumentComponentFamilies(html: string): number {
  const families = [
    /class=["'][^"']*(?:doc-header|doc-hero|doc-lead|doc-runtime-outline)/i,
    /class=["'][^"']*(?:doc-kpi-row|doc-kpi-grid|doc-kpi)/i,
    /class=["'][^"']*(?:doc-proof-strip|doc-proof-item|doc-callout)|<blockquote\b/i,
    /class=["'][^"']*(?:doc-comparison|doc-compare-card)|<table\b/i,
    /class=["'][^"']*(?:doc-timeline|doc-timeline-item)/i,
    /class=["'][^"']*(?:doc-sidebar-layout|doc-aside|doc-main)/i,
    /class=["'][^"']*(?:doc-story-card|doc-infographic-band)|<(?:ol|ul)\b/i,
  ];
  return families.filter((pattern) => hasPattern(html, pattern)).length;
}

function buildDocumentQualitySignals(input: {
  html: string;
  checks: DocumentQualityCheck[];
  qualityBar: ArtifactQualityBar;
}): ArtifactQualitySignalScore[] {
  const text = visibleTextFromHtml(input.html);
  const wordCount = countWords(text);
  const headingCount = countMatches(input.html, /<h[1-3]\b/gi);
  const paragraphCount = countMatches(input.html, /<p\b/gi);
  const componentFamilyCount = countDocumentComponentFamilies(input.html);
  const hasHero = hasPattern(input.html, /class=["'][^"']*(?:doc-header|doc-hero|doc-lead)|<header\b/i);
  const hasStyleBlock = /<style\b/i.test(input.html);
  const hasEvidenceRhythm = hasPattern(input.html, /class=["'][^"']*(?:doc-kpi|doc-proof|doc-comparison|doc-timeline|doc-sidebar)|<(?:table|blockquote)\b/i);
  const safetyBlocking = input.checks.reduce((sum, check) => sum + check.blockingCount, 0);
  const safetyAdvisory = input.checks.reduce((sum, check) => sum + check.advisoryCount, 0);

  return [
    scoreQualitySignal({
      id: 'content-depth',
      label: 'Content depth',
      score: scoreAgainstTarget(wordCount, input.qualityBar.expectedDepth.minWords ?? 600),
      target: targetForSignal(input.qualityBar, 'content-depth'),
      detail: `${wordCount} words against target ${input.qualityBar.expectedDepth.minWords ?? 600}.`,
    }),
    scoreQualitySignal({
      id: 'component-variety',
      label: 'Component variety',
      score: scoreAgainstTarget(componentFamilyCount, Math.max(1, input.qualityBar.requiredComponentVariety.length)),
      target: targetForSignal(input.qualityBar, 'component-variety'),
      detail: `${componentFamilyCount} distinct document component families detected.`,
    }),
    scoreQualitySignal({
      id: 'narrative-coherence',
      label: 'Narrative coherence',
      score: Math.min(100, (hasHero ? 25 : 0) + Math.min(35, headingCount * 10) + Math.min(40, paragraphCount * 8)),
      target: targetForSignal(input.qualityBar, 'narrative-coherence'),
      detail: `${headingCount} heading(s), ${paragraphCount} paragraph(s), hero ${hasHero ? 'present' : 'missing'}.`,
    }),
    scoreQualitySignal({
      id: 'visual-richness',
      label: 'Visual richness',
      score: Math.min(100, (hasStyleBlock ? 22 : 0) + (hasEvidenceRhythm ? 28 : 0) + Math.min(50, componentFamilyCount * 12)),
      target: targetForSignal(input.qualityBar, 'visual-richness'),
      detail: hasEvidenceRhythm
        ? 'Evidence rhythm uses KPI/proof/comparison/timeline/sidebar patterns.'
        : 'Evidence rhythm is flat or missing premium component patterns.',
    }),
    scoreQualitySignal({
      id: 'reference-style-match',
      label: 'Reference style match',
      score: Math.min(100, (hasHero ? 25 : 0) + (hasStyleBlock ? 25 : 0) + Math.min(50, componentFamilyCount * 10)),
      target: targetForSignal(input.qualityBar, 'reference-style-match'),
      detail: input.qualityBar.referenceStylePackId
        ? `Matched against ${input.qualityBar.referenceStylePackId} traits.`
        : 'Matched against runtime document design traits.',
    }),
    scoreQualitySignal({
      id: 'viewport-safety',
      label: 'Viewport safety',
      score: safetyBlocking > 0 ? 35 : safetyAdvisory > 0 ? 78 : 100,
      target: targetForSignal(input.qualityBar, 'viewport-safety'),
      detail: `${safetyBlocking} blocking and ${safetyAdvisory} advisory safety issue(s).`,
    }),
  ];
}

function buildDocumentExcellenceChecks(input: {
  qualityBar: ArtifactQualityBar;
  signals: ArtifactQualitySignalScore[];
  score: number;
  passed: boolean;
}): DocumentQualityCheck[] {
  const signal = (id: ArtifactQualitySignalId) => input.signals.find((entry) => entry.id === id);
  const failedRhythmSignals = [
    signal('component-variety'),
    signal('visual-richness'),
    signal('narrative-coherence'),
    signal('reference-style-match'),
  ].filter((entry): entry is ArtifactQualitySignalScore => Boolean(entry && !entry.passed));
  const depthSignal = signal('content-depth');

  return [
    {
      id: 'excellence-depth',
      label: 'Document content depth',
      passed: depthSignal?.passed ?? true,
      blockingCount: 0,
      advisoryCount: depthSignal?.passed === false ? 1 : 0,
      details: depthSignal ? [depthSignal.detail] : [],
    },
    {
      id: 'excellence-rhythm',
      label: 'Document module rhythm',
      passed: failedRhythmSignals.length === 0,
      blockingCount: 0,
      advisoryCount: failedRhythmSignals.length,
      details: failedRhythmSignals.map((entry) => `${entry.label}: ${entry.detail}`),
    },
    {
      id: 'excellence-score',
      label: 'Document excellence score',
      passed: input.passed,
      blockingCount: 0,
      advisoryCount: input.passed ? 0 : 1,
      details: [`Score ${input.score}; ${input.qualityBar.tier} target ${input.qualityBar.acceptanceThresholds.minimumScore}.`],
    },
  ];
}

export function buildDocumentQualityChecklist(
  input: DocumentQualityChecklistInput,
): DocumentQualityChecklistResult {
  const promptTokenEstimate = estimateRuntimePromptTokens({
    text: input.promptText,
    chars: input.promptChars,
  });
  const checks = [
    buildIframeContractCheck(input.html),
    buildTypographyCheck(input.html),
    buildMobileSafetyCheck(input.html),
    buildPrintSafetyCheck(input.html),
    buildPromptEstimateCheck(promptTokenEstimate),
  ];
  const qualitySignals = input.qualityBar
    ? buildDocumentQualitySignals({
        html: input.html,
        checks,
        qualityBar: input.qualityBar,
      })
    : undefined;
  const qualitySummary = input.qualityBar && qualitySignals
    ? summarizeQualitySignals(input.qualityBar, qualitySignals)
    : undefined;
  if (input.qualityBar && qualitySignals && qualitySummary) {
    checks.push(...buildDocumentExcellenceChecks({
      qualityBar: input.qualityBar,
      signals: qualitySignals,
      score: qualitySummary.score,
      passed: qualitySummary.passed,
    }));
  }
  const blockingCount = checks.reduce((sum, check) => sum + check.blockingCount, 0);
  const advisoryCount = checks.reduce((sum, check) => sum + check.advisoryCount, 0);

  return {
    ready: blockingCount === 0 && (qualitySummary?.passed ?? true),
    promptTokenEstimate,
    blockingCount,
    advisoryCount,
    checks,
    ...(qualitySummary
      ? {
          qualityScore: qualitySummary.score,
          qualityGrade: qualitySummary.grade,
          qualityPolishingSkippedReason: qualitySummary.polishingSkippedReason,
        }
      : {}),
    ...(qualitySignals ? { qualitySignals } : {}),
  };
}

export function buildDocumentQualityTelemetry(
  input: DocumentQualityChecklistInput,
): Pick<
  ArtifactRuntimeTelemetry,
  | 'promptTokenEstimate'
  | 'qualityPassed'
  | 'qualityScore'
  | 'qualityGrade'
  | 'qualityBlockingCount'
  | 'qualityAdvisoryCount'
  | 'qualitySignals'
  | 'qualityPolishingSkippedReason'
  | 'qualityChecks'
> {
  const checklist = buildDocumentQualityChecklist(input);
  return {
    promptTokenEstimate: checklist.promptTokenEstimate,
    qualityPassed: checklist.ready,
    ...(typeof checklist.qualityScore === 'number' ? { qualityScore: checklist.qualityScore } : {}),
    ...(checklist.qualityGrade ? { qualityGrade: checklist.qualityGrade } : {}),
    qualityBlockingCount: checklist.blockingCount,
    qualityAdvisoryCount: checklist.advisoryCount,
    ...(checklist.qualitySignals ? { qualitySignals: checklist.qualitySignals } : {}),
    ...(checklist.qualityPolishingSkippedReason
      ? { qualityPolishingSkippedReason: checklist.qualityPolishingSkippedReason }
      : {}),
    qualityChecks: checklist.checks.map((check) => ({
      id: check.id,
      label: check.label,
      passed: check.passed,
      blockingCount: check.blockingCount,
      advisoryCount: check.advisoryCount,
    })),
  };
}
