import type { ArtifactRuntimeTelemetry } from '@/services/ai/workflow/types';
import { estimateRuntimePromptTokens } from '@/services/artifactRuntime/diagnostics';

export interface DocumentQualityChecklistInput {
  html: string;
  promptText?: string;
  promptChars?: number;
}

export interface DocumentQualityCheck {
  id: 'iframe-contract' | 'typography' | 'mobile-safety' | 'print-safety' | 'prompt-estimate';
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
  const blockingCount = checks.reduce((sum, check) => sum + check.blockingCount, 0);
  const advisoryCount = checks.reduce((sum, check) => sum + check.advisoryCount, 0);

  return {
    ready: blockingCount === 0,
    promptTokenEstimate,
    blockingCount,
    advisoryCount,
    checks,
  };
}

export function buildDocumentQualityTelemetry(
  input: DocumentQualityChecklistInput,
): Pick<
  ArtifactRuntimeTelemetry,
  'promptTokenEstimate' | 'qualityPassed' | 'qualityBlockingCount' | 'qualityAdvisoryCount' | 'qualityChecks'
> {
  const checklist = buildDocumentQualityChecklist(input);
  return {
    promptTokenEstimate: checklist.promptTokenEstimate,
    qualityPassed: checklist.ready,
    qualityBlockingCount: checklist.blockingCount,
    qualityAdvisoryCount: checklist.advisoryCount,
    qualityChecks: checklist.checks.map((check) => ({
      id: check.id,
      label: check.label,
      passed: check.passed,
      blockingCount: check.blockingCount,
      advisoryCount: check.advisoryCount,
    })),
  };
}
