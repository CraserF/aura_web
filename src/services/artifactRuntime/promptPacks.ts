import type { ArtifactQualityBar, TemplateGuidanceProfile } from '@/services/artifactRuntime/types';
import {
  DOCUMENT_RUNTIME_SHARED_MODULE_CLASSES,
  getDocumentRuntimeModuleWrapperClassName,
} from '@/services/artifactRuntime/documentDesignSystem';
import { formatReferenceQualityProfileForPrompt } from '@/services/ai/templates';

export function buildCoreArtifactContractPack(): string {
  return `## ARTIFACT RUNTIME CONTRACT

You are producing one small artifact part for Aura's internal runtime.

Universal rules:
- Follow the selected artifact type exactly.
- Use concise, finished copy; never leave placeholders or TODO labels.
- Produce finished, visually polished output. Do not simplify for a repair pass.
- Prefer reusable class names and deterministic markup over clever one-off output.`;
}

export function buildPresentationFragmentContractPack(guidanceProfile?: TemplateGuidanceProfile): string {
  return `## PRESENTATION FRAGMENT CONTRACT

Output format:
- Return only <style> plus one or more <section> elements.
- No <!DOCTYPE>, <html>, <head>, <body>, scripts, external images, or remote assets.
- Use class-based CSS; avoid inline style attributes on slide content.
- Use concrete data-background-color values on sections.
- Include reduced-motion handling when animation exists.

Readability:
- Cover headlines should feel like 76-96px source type.
- Content slide headings should feel like 44-60px source type.
- Essential body copy should feel like 24-30px source type.
- Essential labels must not be smaller than 16px.

Design routing:
${guidanceProfile?.selectedTemplateId ? `- Template family: ${guidanceProfile.selectedTemplateId}` : '- Template family: selected by runtime plan'}
${guidanceProfile?.presentationRecipeId ? `- Slide recipe: ${guidanceProfile.presentationRecipeId}` : '- Slide recipe: match the runtime brief'}
${guidanceProfile?.referenceStylePackId ? `- Reference style pack: ${guidanceProfile.referenceStylePackId}` : '- Reference style pack: one selected pack only'}

Keep the result canvas-safe for the fixed 16:9 Reveal stage inside Aura.`;
}

export function buildDocumentIframeContractPack(): string {
  const sharedClasses = DOCUMENT_RUNTIME_SHARED_MODULE_CLASSES.join(', ');

  return `## DOCUMENT IFRAME CONTRACT

Output must be safe for Aura's sandboxed document canvas:
- no <script>, <iframe>, <object>, <embed>, <html>, <head>, <body>, remote assets, or JavaScript
- keep media and tables fluid with max-width: 100%
- avoid fixed-width modules that clip on narrow framed viewports
- use mobile-safe stacking with CSS classes such as ${sharedClasses}
- keep body copy at 16px or larger and print-friendly; use mostly static markup`;
}

export function buildDocumentDesignFamilyPack(input: {
  documentType: string;
  designFamily?: string;
  blueprintLabel?: string;
}): string {
  return `## DOCUMENT DESIGN FAMILY

Document type: ${input.documentType}
Design family: ${input.designFamily ?? 'document-default'}
${input.blueprintLabel ? `Blueprint: ${input.blueprintLabel}` : 'Blueprint: runtime-selected'}

Use the family as a compact design direction, not a second preset system.`;
}

export function buildDocumentModuleContractPack(input: { partId: string; repair?: boolean }): string {
  const wrapperClassName = getDocumentRuntimeModuleWrapperClassName();
  const sharedClasses = DOCUMENT_RUNTIME_SHARED_MODULE_CLASSES.join(', ');

  return `## DOCUMENT MODULE CONTRACT

Return only one semantic HTML module:
- use exactly one wrapper: <section class="${wrapperClassName}" data-runtime-part="${input.partId}">
- include one clear <h2>
- include useful body content with <p>, <ul>, <ol>, <table>, or simple nested <div> blocks only when useful
- use shared classes when helpful: ${sharedClasses}
- keep module layout mobile-safe and readable in a framed iframe
- ${input.repair ? 'fix only the failed module issues and preserve useful existing structure' : 'do not repeat the document shell'}
- do not include <style>, <script>, <html>, <head>, <body>, remote assets, or JavaScript`;
}

export function buildQualityBarContractPack(
  qualityBar?: ArtifactQualityBar,
  options: { includeReferenceQualityTarget?: boolean } = {},
): string {
  if (!qualityBar) return '';

  const depth = [
    qualityBar.expectedDepth.minWords ? `min words ${qualityBar.expectedDepth.minWords}` : undefined,
    qualityBar.expectedDepth.minModuleWords ? `module words ${qualityBar.expectedDepth.minModuleWords}+` : undefined,
    qualityBar.expectedDepth.minModules ? `modules ${qualityBar.expectedDepth.minModules}+` : undefined,
    qualityBar.expectedDepth.minSlides ? `slides ${qualityBar.expectedDepth.minSlides}+` : undefined,
    qualityBar.expectedDepth.minLayoutRoles ? `layout roles ${qualityBar.expectedDepth.minLayoutRoles}+` : undefined,
    qualityBar.expectedDepth.minIntegratedVisuals ? `integrated visuals ${qualityBar.expectedDepth.minIntegratedVisuals}+` : undefined,
    qualityBar.expectedDepth.summaryRequired ? 'summary required' : undefined,
  ].filter(Boolean).join('; ');
  const includeReferenceQualityTarget = options.includeReferenceQualityTarget ?? true;
  const referenceQualityTarget = includeReferenceQualityTarget
    ? formatReferenceQualityProfileForPrompt(qualityBar.referenceStylePackId)
    : '';

  return `## QUALITY BAR

Tier: ${qualityBar.tier}; target score: ${qualityBar.acceptanceThresholds.minimumScore}+${qualityBar.referenceStylePackId ? `; style pack: ${qualityBar.referenceStylePackId}` : ''}
Expected depth: ${depth || 'match runtime request depth'}
Required variety: ${qualityBar.requiredComponentVariety.join('; ')}
Score signals: ${qualityBar.signals.map((signal) => `${signal.label} ${signal.target}+`).join('; ')}
Polish budget: ${qualityBar.polishingBudget.deterministicPasses} deterministic, ${qualityBar.polishingBudget.llmPasses} LLM.
Safety blocks output; excellence misses trigger polish when budget remains.${referenceQualityTarget ? `\n\n${referenceQualityTarget}` : ''}`;
}

export function buildValidatorFeedbackPack(feedback: string[]): string {
  if (feedback.length === 0) return '';

  return `## VALIDATOR FEEDBACK

Fix only these issues:
${feedback.map((item) => `- ${item}`).join('\n')}`;
}
