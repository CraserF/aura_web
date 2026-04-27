import type { TemplateGuidanceProfile } from '@/services/artifactRuntime/types';

export function buildCoreArtifactContractPack(): string {
  return `## ARTIFACT RUNTIME CONTRACT

You are producing one small artifact part for Aura's internal runtime.

Universal rules:
- Follow the selected artifact type exactly.
- Use concise, finished copy; never leave placeholders or TODO labels.
- Keep structure simple enough for another agent pass to validate and repair.
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
  return `## DOCUMENT IFRAME CONTRACT

Output must be safe for Aura's sandboxed document canvas:
- no <script>, <iframe>, <object>, <embed>, <html>, <head>, <body>, remote assets, or JavaScript
- keep media and tables fluid with max-width: 100%
- avoid fixed-width modules that clip on narrow framed viewports
- use mobile-safe stacking with CSS classes such as doc-kpi-row, doc-proof-strip, doc-comparison, doc-timeline, and doc-sidebar-layout
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
  return `## DOCUMENT MODULE CONTRACT

Return only one semantic HTML module:
- use exactly one wrapper: <section class="doc-section doc-runtime-module" data-runtime-part="${input.partId}">
- include one clear <h2>
- include useful body content with <p>, <ul>, <ol>, <table>, or simple nested <div> blocks only when useful
- use shared classes when helpful: doc-kpi-row, doc-kpi, doc-comparison, doc-compare-card, doc-proof-strip, doc-proof-item, doc-timeline, doc-timeline-item, doc-sidebar-layout, doc-main, doc-aside
- keep module layout mobile-safe and readable in a framed iframe
- ${input.repair ? 'fix only the failed module issues and preserve useful existing structure' : 'do not repeat the document shell'}
- do not include <style>, <script>, <html>, <head>, <body>, remote assets, or JavaScript`;
}

export function buildValidatorFeedbackPack(feedback: string[]): string {
  if (feedback.length === 0) return '';

  return `## VALIDATOR FEEDBACK

Fix only these issues:
${feedback.map((item) => `- ${item}`).join('\n')}`;
}
