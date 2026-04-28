import type { ArtifactRuntimeTelemetry } from '@/services/ai/workflow/types';
import { summarizeReferenceQualityProfileForScoring } from '@/services/ai/templates';
import { estimateRuntimePromptTokens } from '@/services/artifactRuntime/diagnostics';
import {
  scoreAgainstTarget,
  scoreQualitySignal,
  summarizeQualitySignals,
} from '@/services/artifactRuntime/qualityScoring';
import {
  validatePresentationViewportContract,
  type PresentationViewportValidationResult,
} from '@/services/artifactRuntime/presentationViewport';
import type {
  ArtifactQualityBar,
  ArtifactQualityGrade,
  ArtifactQualitySignalId,
  ArtifactQualitySignalScore,
} from '@/services/artifactRuntime/types';

export interface PresentationQualityChecklistInput {
  html: string;
  promptText?: string;
  promptChars?: number;
  allowTemplateTokens?: boolean;
  qualityBar?: ArtifactQualityBar;
}

export type PresentationNamedFailureId =
  | 'weak-opening-scene'
  | 'repeated-card-grid'
  | 'missing-integrated-visual'
  | 'missing-narrative-transition'
  | 'poor-token-continuity'
  | 'copy-density-risk'
  // CSS/design contract
  | 'missing-style-system'
  | 'inline-style-leak'
  | 'external-css-or-asset'
  | 'missing-reduced-motion'
  | 'viewport-unit-layout'
  | 'tiny-source-type'
  | 'animation-budget-risk'
  | 'duplicate-root-style-system'
  | 'append-slide-style-reset'
  | 'weak-class-continuity'
  | 'unscoped-extension-style';

export interface PresentationNamedFailure {
  id: PresentationNamedFailureId;
  message: string;
}

export interface PresentationQualityCheck {
  id:
    | 'fragment-contract'
    | 'viewport-contract'
    | 'prompt-estimate'
    | 'css-design-contract'
    | 'excellence-visual'
    | 'excellence-narrative'
    | 'excellence-pattern-advisories'
    | 'excellence-score';
  label: string;
  passed: boolean;
  blockingCount: number;
  advisoryCount: number;
  details: string[];
  namedIssues?: PresentationNamedFailure[];
}

export interface PresentationQualityChecklistResult {
  ready: boolean;
  slideCount: number;
  promptTokenEstimate: number;
  viewportContract: PresentationViewportValidationResult;
  viewportContractPassed: boolean;
  viewportBlockingCount: number;
  viewportAdvisoryCount: number;
  checks: PresentationQualityCheck[];
  qualityScore?: number;
  qualityGrade?: ArtifactQualityGrade;
  qualitySignals?: ArtifactQualitySignalScore[];
  qualityPolishingSkippedReason?: string;
}

function countSections(html: string): number {
  return html.match(/<section\b/gi)?.length ?? 0;
}

function buildFragmentContractCheck(
  html: string,
  slideCount: number,
  allowTemplateTokens: boolean,
): PresentationQualityCheck {
  const details: string[] = [];

  if (slideCount === 0) {
    details.push('Presentation output must include at least one <section> slide.');
  }
  if (/<(?:html|body|script|link)\b/i.test(html)) {
    details.push('Presentation fragments must not include wrappers, scripts, or external asset links.');
  }
  if (!allowTemplateTokens && /\{\{[A-Z0-9_]+\}\}/i.test(html)) {
    details.push('Presentation output still contains unresolved template tokens.');
  }
  if (/\sstyle=/i.test(html)) {
    details.push('Presentation output should use class-based CSS instead of inline style attributes.');
  }

  return {
    id: 'fragment-contract',
    label: 'Presentation fragment contract',
    passed: details.length === 0,
    blockingCount: details.length,
    advisoryCount: 0,
    details,
  };
}

function buildViewportContractCheck(
  viewportContract: PresentationViewportValidationResult,
): PresentationQualityCheck {
  return {
    id: 'viewport-contract',
    label: 'Static viewport contract',
    passed: viewportContract.passed,
    blockingCount: viewportContract.blockingCount,
    advisoryCount: viewportContract.advisoryCount,
    details: viewportContract.issues.map((issue) => issue.detail),
  };
}

function buildPromptEstimateCheck(promptTokenEstimate: number): PresentationQualityCheck {
  return {
    id: 'prompt-estimate',
    label: 'Prompt token estimate',
    passed: true,
    blockingCount: 0,
    advisoryCount: 0,
    details: [`Estimated prompt tokens: ${promptTokenEstimate}`],
  };
}

function buildCssDesignContractCheck(html: string): PresentationQualityCheck {
  const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [];
  const styleTexts = styleBlocks.map((block) => block.replace(/<\/?style[^>]*>/gi, ''));
  const styleText = styleTexts.join('\n');

  const namedIssues: PresentationNamedFailure[] = [];
  const sections = extractSections(html);

  if (styleBlocks.length === 0) {
    namedIssues.push({
      id: 'missing-style-system',
      message: 'No <style> block found. Presentation output needs a reusable class-based style system.',
    });
  }

  if (/\sstyle\s*=/i.test(html)) {
    namedIssues.push({
      id: 'inline-style-leak',
      message: 'Inline style attributes detected. Move styling into reusable CSS classes in the <style> block.',
    });
  }

  if (/<(?:script|link)\b/i.test(html) || /@import\b/i.test(styleText) || /url\(\s*["']?https?:\/\//i.test(styleText) || /\ssrc=["']https?:\/\//i.test(html)) {
    namedIssues.push({
      id: 'external-css-or-asset',
      message: 'External CSS, scripts, links, or remote assets detected. Use inline SVG/CSS and local class-based styling only.',
    });
  }

  if (/\b(?:animation\s*:|@keyframes\b)/i.test(styleText) && !/prefers-reduced-motion/i.test(styleText)) {
    namedIssues.push({
      id: 'missing-reduced-motion',
      message: 'Animation present but no prefers-reduced-motion fallback. Add @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }',
    });
  }

  if (/\b(?:width|height|min-width|min-height|max-width|max-height|inset|top|right|bottom|left|padding|margin|gap|font-size)\s*:[^;{}]*(?:\d|\))\s*(?:vw|vh|dvw|dvh|vmin|vmax)\b/i.test(styleText)) {
    namedIssues.push({
      id: 'viewport-unit-layout',
      message: 'Viewport units (vw/vh) used for layout or type sizing. Replace with stage-relative px, %, clamp(), or grid/flex values.',
    });
  }

  const tinyFontSizes = [
    ...Array.from(styleText.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi)),
    ...Array.from(styleText.matchAll(/font-size\s*:\s*clamp\(\s*(\d+(?:\.\d+)?)px/gi)),
  ]
    .map(([, s]) => Number.parseFloat(s ?? '0'))
    .filter((s) => s > 0 && s < 16);
  if (tinyFontSizes.length > 0) {
    namedIssues.push({
      id: 'tiny-source-type',
      message: `Font sizes below 16px detected (smallest: ${Math.min(...tinyFontSizes)}px). Increase to ≥16px for readable fixed-stage output.`,
    });
  }

  const keyframeCount = (styleText.match(/@keyframes\s+[\w-]+/gi) ?? []).length;
  const animationDeclarationCount = (styleText.match(/\banimation\s*:/gi) ?? []).length;
  if (keyframeCount > 10 || animationDeclarationCount > 12) {
    namedIssues.push({
      id: 'animation-budget-risk',
      message: `Animation budget risk: ${keyframeCount} keyframe block(s) and ${animationDeclarationCount} animation declaration(s). Keep motion focused and bounded.`,
    });
  }

  const rootStyleBlockCount = styleTexts.filter((style) => /:root\s*\{/i.test(style)).length;
  const laterSectionsWithRootVars = sections.slice(1).filter((section) => /style=["'][^"']*--[a-z0-9-]+\s*:/i.test(section)).length;
  if (rootStyleBlockCount > 1 || laterSectionsWithRootVars > 0) {
    namedIssues.push({
      id: 'duplicate-root-style-system',
      message: `CSS root/style tokens are duplicated (${rootStyleBlockCount} :root style block(s), ${laterSectionsWithRootVars} later slide inline token set(s)). Keep shared tokens in one style system.`,
    });
  }

  const styleResetBlockCount = styleTexts.slice(1).filter((style) => /:root\s*\{|--(?:primary|accent|bg|text|ink)\s*:|\.[a-z0-9_-]+\s*\{/i.test(style)).length;
  if (styleResetBlockCount > 0) {
    namedIssues.push({
      id: 'append-slide-style-reset',
      message: `Later style block(s) appear to reset the deck style system ${styleResetBlockCount} time(s). Reuse the first shared style block and add only scoped extensions.`,
    });
  }

  const unscopedExtensionCount = styleTexts.slice(1).filter((style) =>
    style.length > 1200 || /(?:^|[{}]\s*)(?:html|body|section|:root)\b/i.test(style),
  ).length;
  if (unscopedExtensionCount > 0) {
    namedIssues.push({
      id: 'unscoped-extension-style',
      message: `Extension style block(s) are broad or unscoped ${unscopedExtensionCount} time(s). Later slides should add small, class-scoped CSS only.`,
    });
  }

  const sharedClassCount = countSharedClassContinuity(sections);
  const hasSharedTokens = /--(?:primary|accent|bg|text|ink|surface)\s*:/i.test(styleText);
  if (sections.length > 1 && sharedClassCount < 1 && !hasSharedTokens) {
    namedIssues.push({
      id: 'weak-class-continuity',
      message: 'No shared class or token continuity detected across slides. Reuse the deck class vocabulary and shared CSS variables.',
    });
  }

  return {
    id: 'css-design-contract',
    label: 'CSS design contract',
    passed: namedIssues.length === 0,
    blockingCount: 0,
    advisoryCount: namedIssues.length,
    details: namedIssues.map((issue) => issue.message),
    namedIssues: namedIssues.length > 0 ? namedIssues : undefined,
  };
}

function stripHtml(value: string): string {
  return value
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countMatches(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0;
}

function targetForSignal(qualityBar: ArtifactQualityBar, id: ArtifactQualitySignalId): number {
  return qualityBar.signals.find((signal) => signal.id === id)?.target ?? qualityBar.acceptanceThresholds.minimumScore;
}

function extractSections(html: string): string[] {
  return html.match(/<section\b[\s\S]*?<\/section>/gi) ?? [];
}

function classifySlideRoles(section: string, index: number, total: number): string[] {
  const roles: string[] = [];
  const text = stripHtml(section).toLowerCase();
  const classes = section.toLowerCase();

  if (index === 0 && /<h1\b|title|cover|opening|lockup|hero/.test(classes)) roles.push('title-scene');
  if (/metric|kpi|score|number|%|\b\d+[xkmb]?\b/.test(`${classes} ${text}`)) roles.push('metric-proof');
  if (/compare|comparison|versus|trade[- ]?off|before|after/.test(`${classes} ${text}`)) roles.push('comparison');
  if (/<svg\b|diagram|scene|visual|map|path|node|timeline|chart/.test(classes)) roles.push('integrated-visual');
  if (/recommend|decision|next step|action|close|cta/.test(`${classes} ${text}`) || index === total - 1) roles.push('action');
  if (/<p\b|insight|story|thesis|bridge|context/.test(classes)) roles.push('narrative');

  return roles.length > 0 ? roles : ['content'];
}

function countRepeatedCardGridRisk(sections: string[]): number {
  return sections.filter((section) => {
    const cardCount = countMatches(section, /class=["'][^"']*(?:card|tile|grid-item)/gi);
    const hasIntegratedVisual = /<svg\b|diagram|scene|visual|timeline|chart/i.test(section);
    return cardCount >= 4 && !hasIntegratedVisual;
  }).length;
}

function countSharedClassContinuity(sections: string[]): number {
  if (sections.length <= 1) return /<style\b|:root|--[a-z0-9-]+:/i.test(sections[0] ?? '') ? 2 : 1;
  const classSets = sections.map((section) =>
    new Set(
      Array.from(section.matchAll(/class=["']([^"']+)["']/gi))
        .flatMap((match) => (match[1] ?? '').split(/\s+/))
        .filter(Boolean),
    ));
  const [first, ...rest] = classSets;
  if (!first) return 0;
  return Array.from(first).filter((className) => rest.some((set) => set.has(className))).length;
}

function buildPresentationQualitySignals(input: {
  html: string;
  slideCount: number;
  viewportContract: PresentationViewportValidationResult;
  qualityBar: ArtifactQualityBar;
}): ArtifactQualitySignalScore[] {
  const sections = extractSections(input.html);
  const roleSet = new Set(sections.flatMap((section, index) => classifySlideRoles(section, index, sections.length)));
  const firstSection = sections[0] ?? '';
  const hasStrongTitleScene = /<h1\b|title|cover|opening|lockup|hero/i.test(firstSection) && stripHtml(firstSection).length >= 24;
  const integratedVisualCount = sections.filter((section) => /<svg\b|diagram|scene|visual|map|path|node|timeline|chart/i.test(section)).length;
  const repeatedGridRisk = countRepeatedCardGridRisk(sections);
  const sharedClassCount = countSharedClassContinuity(sections);
  const styleComplexity = Math.min(26, countMatches(input.html, /--[a-z0-9-]+\s*:/gi) * 2) +
    Math.min(24, countMatches(input.html, /\.[a-z0-9_-]+\s*[{,]/gi));
  const viewportScore = input.viewportContract.blockingCount > 0
    ? 35
    : input.viewportContract.advisoryCount > 0
      ? 78
      : 100;

  return [
    scoreQualitySignal({
      id: 'visual-richness',
      label: 'Visual richness',
      score: Math.min(100, styleComplexity + scoreAgainstTarget(integratedVisualCount, input.qualityBar.expectedDepth.minIntegratedVisuals ?? 1) * 0.5 - repeatedGridRisk * 18),
      target: targetForSignal(input.qualityBar, 'visual-richness'),
      detail: `${integratedVisualCount} integrated visual slide(s), ${repeatedGridRisk} repeated-grid risk slide(s).`,
    }),
    scoreQualitySignal({
      id: 'narrative-coherence',
      label: 'Narrative coherence',
      score: Math.min(100, (hasStrongTitleScene ? 35 : 0) + scoreAgainstTarget(input.slideCount, input.qualityBar.expectedDepth.minSlides ?? 1) * 0.35 + Math.min(30, roleSet.size * 7)),
      target: targetForSignal(input.qualityBar, 'narrative-coherence'),
      detail: hasStrongTitleScene
        ? `Opening scene is strong; ${roleSet.size} slide role(s) detected.`
        : `Opening scene is weak or generic; ${roleSet.size} slide role(s) detected.`,
    }),
    scoreQualitySignal({
      id: 'continuity',
      label: 'Continuity',
      score: Math.min(100, (/<style\b|:root|--[a-z0-9-]+:/i.test(input.html) ? 45 : 0) + Math.min(55, sharedClassCount * 12)),
      target: targetForSignal(input.qualityBar, 'continuity'),
      detail: `${sharedClassCount} shared class token(s) preserve deck continuity.`,
    }),
    scoreQualitySignal({
      id: 'component-variety',
      label: 'Component variety',
      score: scoreAgainstTarget(roleSet.size, input.qualityBar.expectedDepth.minLayoutRoles ?? 2),
      target: targetForSignal(input.qualityBar, 'component-variety'),
      detail: `Detected roles: ${Array.from(roleSet).sort().join(', ') || 'none'}.`,
    }),
    scoreQualitySignal({
      id: 'reference-style-match',
      label: 'Reference style match',
      score: Math.min(100, (hasStrongTitleScene ? 25 : 0) + (integratedVisualCount > 0 ? 25 : 0) + Math.min(35, roleSet.size * 7) - repeatedGridRisk * 10 + (input.qualityBar.referenceStylePackId ? 10 : 0)),
      target: targetForSignal(input.qualityBar, 'reference-style-match'),
      detail: input.qualityBar.referenceStylePackId
        ? `Matched against ${summarizeReferenceQualityProfileForScoring(input.qualityBar.referenceStylePackId)}.`
        : 'Matched against runtime deck design traits.',
    }),
    scoreQualitySignal({
      id: 'viewport-safety',
      label: 'Viewport safety',
      score: viewportScore,
      target: targetForSignal(input.qualityBar, 'viewport-safety'),
      detail: `${input.viewportContract.blockingCount} blocking and ${input.viewportContract.advisoryCount} advisory viewport issue(s).`,
    }),
  ];
}

function buildPresentationExcellenceChecks(input: {
  html: string;
  qualityBar: ArtifactQualityBar;
  signals: ArtifactQualitySignalScore[];
  score: number;
  passed: boolean;
}): PresentationQualityCheck[] {
  const signal = (id: ArtifactQualitySignalId) => input.signals.find((entry) => entry.id === id);
  const visualFailures = [
    signal('visual-richness'),
    signal('component-variety'),
    signal('reference-style-match'),
  ].filter((entry): entry is ArtifactQualitySignalScore => Boolean(entry && !entry.passed));
  const narrativeFailures = [
    signal('narrative-coherence'),
    signal('continuity'),
  ].filter((entry): entry is ArtifactQualitySignalScore => Boolean(entry && !entry.passed));
  const sections = extractSections(input.html);
  const firstSection = sections[0] ?? '';
  const hasStrongTitleScene = /<h1\b|title|cover|opening|lockup|hero/i.test(firstSection) && stripHtml(firstSection).length >= 24;
  const repeatedGridRisk = countRepeatedCardGridRisk(sections);
  const integratedVisualCount = sections.filter((section) => /<svg\b|diagram|scene|visual|map|path|node|timeline|chart/i.test(section)).length;
  const sharedClassCount = countSharedClassContinuity(sections);
  const transitionCount = sections.slice(1).filter((section) =>
    /\b(?:therefore|next|now|then|because|bridge|path forward|leads to|sets up|shifts? from|moves? from)\b/i.test(stripHtml(section)),
  ).length;
  const patternAdvisories: Array<{ id: PresentationNamedFailureId; message: string }> = [];
  if (!hasStrongTitleScene) {
    patternAdvisories.push({
      id: 'weak-opening-scene',
      message: 'Weak title scene: opening slide lacks a clear hero/title composition.',
    });
  }
  if (repeatedGridRisk > 0) {
    patternAdvisories.push({
      id: 'repeated-card-grid',
      message: `Repeated card grid risk: ${repeatedGridRisk} slide(s) use card walls without integrated visuals.`,
    });
  }
  if (integratedVisualCount === 0) {
    patternAdvisories.push({
      id: 'missing-integrated-visual',
      message: 'No integrated visuals detected: add an inline SVG, diagram, timeline, chart, scene, or visual model when useful.',
    });
  }
  if (sections.length > 2 && transitionCount === 0) {
    patternAdvisories.push({
      id: 'missing-narrative-transition',
      message: 'No narrative transition language detected between slides.',
    });
  }
  if (sections.length > 1 && sharedClassCount < 2) {
    patternAdvisories.push({
      id: 'poor-token-continuity',
      message: `Poor class/token continuity: only ${sharedClassCount} shared class token(s) detected.`,
    });
  }

  return [
    {
      id: 'excellence-visual',
      label: 'Presentation visual richness',
      passed: visualFailures.length === 0,
      blockingCount: 0,
      advisoryCount: visualFailures.length,
      details: visualFailures.map((entry) => `${entry.label}: ${entry.detail}`),
    },
    {
      id: 'excellence-narrative',
      label: 'Presentation narrative continuity',
      passed: narrativeFailures.length === 0,
      blockingCount: 0,
      advisoryCount: narrativeFailures.length,
      details: narrativeFailures.map((entry) => `${entry.label}: ${entry.detail}`),
    },
    {
      id: 'excellence-pattern-advisories',
      label: 'Presentation deterministic polish advisories',
      passed: patternAdvisories.length === 0,
      blockingCount: 0,
      advisoryCount: patternAdvisories.length,
      details: patternAdvisories.map((item) => item.message),
      namedIssues: patternAdvisories.length > 0 ? patternAdvisories : undefined,
    },
    {
      id: 'excellence-score',
      label: 'Presentation excellence score',
      passed: input.passed,
      blockingCount: 0,
      advisoryCount: input.passed ? 0 : 1,
      details: [`Score ${input.score}; ${input.qualityBar.tier} target ${input.qualityBar.acceptanceThresholds.minimumScore}.`],
    },
  ];
}

export function buildPresentationQualityChecklist(
  input: PresentationQualityChecklistInput,
): PresentationQualityChecklistResult {
  const slideCount = countSections(input.html);
  const promptTokenEstimate = estimateRuntimePromptTokens({
    text: input.promptText,
    chars: input.promptChars,
  });
  const viewportContract = validatePresentationViewportContract(input.html);
  const checks = [
    buildFragmentContractCheck(input.html, slideCount, input.allowTemplateTokens ?? false),
    buildViewportContractCheck(viewportContract),
    buildPromptEstimateCheck(promptTokenEstimate),
    buildCssDesignContractCheck(input.html),
  ];
  const qualitySignals = input.qualityBar
    ? buildPresentationQualitySignals({
        html: input.html,
        slideCount,
        viewportContract,
        qualityBar: input.qualityBar,
      })
    : undefined;
  const qualitySummary = input.qualityBar && qualitySignals
    ? summarizeQualitySignals(input.qualityBar, qualitySignals)
    : undefined;
  if (input.qualityBar && qualitySignals && qualitySummary) {
    checks.push(...buildPresentationExcellenceChecks({
      html: input.html,
      qualityBar: input.qualityBar,
      signals: qualitySignals,
      score: qualitySummary.score,
      passed: qualitySummary.passed,
    }));
  }

  return {
    ready: checks.every((check) => check.passed) && (qualitySummary?.passed ?? true),
    slideCount,
    promptTokenEstimate,
    viewportContract,
    viewportContractPassed: viewportContract.passed,
    viewportBlockingCount: viewportContract.blockingCount,
    viewportAdvisoryCount: viewportContract.advisoryCount,
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

/** Collects named failure messages for deterministic-signal-led revision prompts. */
export function collectPresentationNamedFailures(checks: PresentationQualityCheck[]): string[] {
  const namedMessages: string[] = [];
  for (const check of checks) {
    if (check.namedIssues && check.namedIssues.length > 0) {
      namedMessages.push(...check.namedIssues.map((issue) => `[${issue.id}] ${issue.message}`));
    }
  }
  const failedSignalDetails: string[] = [];
  for (const check of checks) {
    if (!check.passed && !check.namedIssues?.length && check.id !== 'excellence-pattern-advisories' && check.details.length > 0) {
      failedSignalDetails.push(...check.details.map((d) => `[${check.id}] ${d}`));
    }
  }
  return [...namedMessages, ...failedSignalDetails];
}

export function buildPresentationQualityTelemetry(
  input: PresentationQualityChecklistInput,
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
  | 'viewportContractPassed'
  | 'viewportBlockingCount'
  | 'viewportAdvisoryCount'
> {
  const checklist = buildPresentationQualityChecklist(input);
  const qualityBlockingCount = checklist.checks.reduce((sum, check) => sum + check.blockingCount, 0);
  const qualityAdvisoryCount = checklist.checks.reduce((sum, check) => sum + check.advisoryCount, 0);

  return {
    promptTokenEstimate: checklist.promptTokenEstimate,
    qualityPassed: checklist.ready,
    ...(typeof checklist.qualityScore === 'number' ? { qualityScore: checklist.qualityScore } : {}),
    ...(checklist.qualityGrade ? { qualityGrade: checklist.qualityGrade } : {}),
    qualityBlockingCount,
    qualityAdvisoryCount,
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
    viewportContractPassed: checklist.viewportContractPassed,
    viewportBlockingCount: checklist.viewportBlockingCount,
    viewportAdvisoryCount: checklist.viewportAdvisoryCount,
  };
}
