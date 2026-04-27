import type { ArtifactRuntimeTelemetry } from '@/services/ai/workflow/types';
import { estimateRuntimePromptTokens } from '@/services/artifactRuntime/diagnostics';
import {
  validatePresentationViewportContract,
  type PresentationViewportValidationResult,
} from '@/services/artifactRuntime/presentationViewport';

export interface PresentationQualityChecklistInput {
  html: string;
  promptText?: string;
  promptChars?: number;
  allowTemplateTokens?: boolean;
}

export interface PresentationQualityCheck {
  id: 'fragment-contract' | 'viewport-contract' | 'prompt-estimate';
  label: string;
  passed: boolean;
  blockingCount: number;
  advisoryCount: number;
  details: string[];
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
  ];

  return {
    ready: checks.every((check) => check.passed),
    slideCount,
    promptTokenEstimate,
    viewportContract,
    viewportContractPassed: viewportContract.passed,
    viewportBlockingCount: viewportContract.blockingCount,
    viewportAdvisoryCount: viewportContract.advisoryCount,
    checks,
  };
}

export function buildPresentationQualityTelemetry(
  input: PresentationQualityChecklistInput,
): Pick<
  ArtifactRuntimeTelemetry,
  | 'promptTokenEstimate'
  | 'qualityPassed'
  | 'qualityBlockingCount'
  | 'qualityAdvisoryCount'
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
    qualityBlockingCount,
    qualityAdvisoryCount,
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
