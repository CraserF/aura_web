import type { TemplateGuidanceProfile } from '@/services/workflowPlanner/types';

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

export function buildValidatorFeedbackPack(feedback: string[]): string {
  if (feedback.length === 0) return '';

  return `## VALIDATOR FEEDBACK

Fix only these issues:
${feedback.map((item) => `- ${item}`).join('\n')}`;
}
