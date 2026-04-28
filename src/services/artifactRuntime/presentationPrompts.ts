import { getReferenceQualityProfile } from '@/services/ai/templates';
import type { PlanResult, SlideBrief } from '@/services/ai/workflow/agents/planner';
import {
  buildCoreArtifactContractPack,
  buildPresentationFragmentContractPack,
  buildQualityBarContractPack,
  buildValidatorFeedbackPack,
} from '@/services/artifactRuntime/promptPacks';
import type { ArtifactRunPlan, PresentationSlideBlueprint, TemplateGuidanceProfile } from '@/services/artifactRuntime/types';

interface PresentationPromptBaseInput {
  runPlan?: ArtifactRunPlan;
  planResult: PlanResult;
  projectRulesBlock?: string;
  guidanceProfile?: TemplateGuidanceProfile;
}

interface PresentationCreateUserPromptInput extends PresentationPromptBaseInput {
  existingSlidesHtml?: string;
  taskBrief?: string;
}

interface PresentationEditUserPromptInput extends PresentationPromptBaseInput {
  existingSlidesHtml: string;
  existingSlideCount: number;
  targetSummary?: string[];
}

interface PresentationBatchSlidePromptInput extends PresentationPromptBaseInput {
  brief: SlideBrief;
  totalSlides: number;
  sharedStyleBlock?: string;
}

interface PresentationRevisionPromptInput extends PresentationPromptBaseInput {
  feedback?: string[];
}

function compactList(items: string[] | undefined, fallback: string): string {
  const clean = (items ?? []).map((item) => item.trim()).filter(Boolean);
  return clean.length > 0 ? clean.join('; ') : fallback;
}

function promptTask(input: Pick<PresentationPromptBaseInput, 'runPlan' | 'planResult'> & { taskBrief?: string }): string {
  return (input.taskBrief ?? input.runPlan?.userIntent ?? input.planResult.enhancedPrompt).trim();
}

function guidanceFrom(input: PresentationPromptBaseInput): TemplateGuidanceProfile | undefined {
  return input.runPlan?.templateGuidance ?? input.guidanceProfile;
}

function buildMobileStagePack(): string {
  return `## MOBILE-STAGE READABILITY

Aura scales a fixed 16:9 Reveal stage into desktop, tablet, and mobile frames.
- Use 1-3 major zones with strong hierarchy.
- Avoid dense card walls, long paragraphs, tiny captions, and viewport-unit layout sizing.
- Keep essential text readable after the whole stage is scaled down.`;
}

function buildDesignManifestPack(input: PresentationPromptBaseInput): string {
  const manifest = input.runPlan?.designManifest;
  const palette = input.planResult.blueprint.palette;
  const styleManifest = input.planResult.styleManifest;

  if (!manifest) {
    return `## DESIGN MANIFEST

Family: ${input.planResult.selectedTemplate}
Recipe: ${styleManifest.exemplarPackId}
Type scale: cover 76-96px, content headings 44-60px, body 24-30px, labels 16px+
Colors: background ${palette.bg}, text ${palette.body}, accent ${palette.accent}
Layout recipes: ${styleManifest.componentPatterns.join('; ')}
Motion: ${styleManifest.motionLanguage}; include reduced-motion CSS.`;
  }

  return `## DESIGN MANIFEST

Family: ${manifest.family}
Template: ${manifest.templateId ?? 'runtime-selected'}
Recipe: ${manifest.recipeId ?? input.runPlan?.presentationRecipeId ?? 'general-polished'}
Type scale: cover ${manifest.typography.coverH1Px}px, content headings ${manifest.typography.contentH2Px}px, body ${manifest.typography.bodyPx}px, labels ${manifest.typography.labelMinPx}px+
Colors: ${manifest.colors.mode}; background ${manifest.colors.background}; text ${manifest.colors.text}; accent ${manifest.colors.accent}
Layout recipes: ${compactList(manifest.layoutRecipes, 'premium editorial canvas')}
Components: ${compactList(manifest.componentClasses, 'slide-shell; title-lockup; content-grid')}
Diagrams: ${compactList(manifest.iconAndDiagramRules, 'inline SVG or CSS-built diagrams only')}
Motion: max ${manifest.motionBudget.maxAnimatedSystems} animated system(s); reduced-motion CSS is required.
Canvas: ${compactList(manifest.canvasContract, 'fixed 16:9 Aura presentation stage')}`;
}

function buildStyleFamilyPack(input: PresentationPromptBaseInput): string {
  const guidance = guidanceFrom(input);
  const qualityProfile = guidance?.referenceStylePackId
    ? getReferenceQualityProfile(guidance.referenceStylePackId)
    : null;
  const constraints = compactList(guidance?.designConstraints, 'Use the selected production design family.');
  const antiPatterns = compactList(guidance?.antiPatterns, 'Avoid generic card walls, placeholder copy, and unsafe wrappers.');

  return `## SELECTED STYLE FAMILY

Template: ${input.runPlan?.designManifest.templateId ?? guidance?.selectedTemplateId ?? input.planResult.selectedTemplate}
Recipe: ${input.runPlan?.presentationRecipeId ?? guidance?.presentationRecipeId ?? input.planResult.styleManifest.exemplarPackId}
Reference pack: ${qualityProfile?.label ?? guidance?.referenceStylePackId ?? 'runtime manifest only'}
Constraints: ${constraints}
Avoid: ${antiPatterns}`;
}

function buildNarrativePlanPack(input: PresentationPromptBaseInput): string {
  const narrativePlan = input.runPlan?.presentationNarrativePlan;
  if (!narrativePlan) return '';

  const roles = narrativePlan.slideRoles
    .slice(0, 8)
    .map((entry) => `${entry.slideId}: ${entry.role} (${entry.title})`)
    .join('; ');
  const layouts = narrativePlan.layoutMap
    .slice(0, 8)
    .map((entry) => `${entry.slideId}: ${entry.layoutPattern}`)
    .join('; ');

  return `## DECK NARRATIVE PLAN

Promise: ${narrativePlan.promise}
Audience: ${narrativePlan.audience}
Arc: ${narrativePlan.arc}
Visual motif: ${narrativePlan.visualMotif}
Slide roles: ${roles}
Layout map: ${layouts}
Continuity rules: ${narrativePlan.continuityRules.join(' ')}`;
}

function buildSlideBlueprintPack(blueprint?: PresentationSlideBlueprint): string {
  if (!blueprint) return '';

  return `## SLIDE BLUEPRINT

Role: ${blueprint.role}
Narrative beat: ${blueprint.narrativeBeat}
Layout pattern: ${blueprint.layoutPattern}
Motif: ${blueprint.motifInstruction}
Continuity: ${blueprint.continuityInstruction}`;
}

function buildFinalFormatPack(): string {
  return `## FINAL FORMAT CHECK

- Return only a \`<style>\` block plus \`<section>\` element(s).
- Do not output \`<!DOCTYPE>\`, \`<html>\`, \`<head>\`, \`<body>\`, \`<link>\`, scripts, remote assets, markdown, or prose.
- Use CSS classes only; no inline \`style=\` attributes on slide content.
- Every section must use a concrete hex \`data-background-color\`.
- Replace placeholders and unfinished copy before calling \`submitFinalSlide\`.
- Validate the fragment, fix blocking issues, then call \`submitFinalSlide\`.`;
}

function buildPrompt(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join('\n\n');
}

function extractLastNSections(html: string, n: number): string {
  const sections = html.match(/<section[\s\S]*?<\/section>/gi) ?? [];
  return sections.slice(-n).join('\n');
}

function summarizeExistingStyle(html: string): string {
  const styleBlock = html.match(/<style[^>]*>[\s\S]*?<\/style>/i)?.[0] ?? '';
  const classes = Array.from(html.matchAll(/class=["']([^"']+)["']/gi))
    .flatMap((match) => (match[1] ?? '').split(/\s+/))
    .map((className) => className.trim())
    .filter(Boolean);
  const uniqueClasses = Array.from(new Set(classes)).slice(0, 18);

  return `Existing style summary:
- Reuse these classes when possible: ${uniqueClasses.length > 0 ? uniqueClasses.join(', ') : 'derive from the current section structure'}
- Shared style excerpt:
\`\`\`html
${styleBlock.slice(0, 1600)}
\`\`\``;
}

export function buildPresentationCreateSystemPrompt(input: PresentationPromptBaseInput): string {
  return buildPrompt([
    buildCoreArtifactContractPack(),
    buildPresentationFragmentContractPack(guidanceFrom(input)),
    buildDesignManifestPack(input),
    buildStyleFamilyPack(input),
    buildNarrativePlanPack(input),
    buildQualityBarContractPack(input.runPlan?.qualityBar),
    buildMobileStagePack(),
    `## CREATE MODE

Create one finished presentation slide fragment unless the task brief explicitly asks for multiple sections.
Use system fonts or local CSS font-family stacks only. Build visual interest with layout, CSS, and inline SVG diagrams.`,
    input.projectRulesBlock,
    buildFinalFormatPack(),
  ]);
}

export function buildPresentationCreateUserPrompt(input: PresentationCreateUserPromptInput): string {
  const task = promptTask(input);
  if (input.existingSlidesHtml) {
    return `Create a new slide for this task:
${task}

Match the visual language of these recent slides without repeating them:
\`\`\`html
${extractLastNSections(input.existingSlidesHtml, 2)}
\`\`\`

Output only the new slide fragment.`;
  }

  return `Create a polished presentation slide for this task:
${task}

Output the complete slide fragment.`;
}

export function buildPresentationEditSystemPrompt(input: PresentationPromptBaseInput): string {
  const isRestyle = input.runPlan?.requestKind === 'restyle' || guidanceFrom(input)?.intentFamily === 'restyle';

  return buildPrompt([
    buildCoreArtifactContractPack(),
    buildPresentationFragmentContractPack(guidanceFrom(input)),
    buildDesignManifestPack(input),
    buildStyleFamilyPack(input),
    buildNarrativePlanPack(input),
    buildQualityBarContractPack(input.runPlan?.qualityBar),
    buildMobileStagePack(),
    isRestyle
      ? `## RESTYLE MODE

Change visual tokens only: colors, font stacks, spacing variables, borders, shadows, and motion cadence.
Do not change slide copy, data values, heading labels, or section order.`
      : undefined,
    `## EDIT MODE

Make the minimum change that satisfies the request.
Preserve unaffected slides and existing class architecture.
For small text/style changes, prefer SEARCH/REPLACE patches with exact FIND blocks.
For large structural changes, output the complete corrected \`<style>\` plus all \`<section>\` elements.`,
    input.projectRulesBlock,
    buildFinalFormatPack(),
  ]);
}

export function buildPresentationEditUserPrompt(input: PresentationEditUserPromptInput): string {
  const targetedScope = input.targetSummary && input.targetSummary.length > 0
    ? `Target only these areas unless the user explicitly asked for broader changes:\n- ${input.targetSummary.join('\n- ')}`
    : 'Target the smallest safe set of slides.';

  return `Edit the current deck (${input.existingSlideCount} slide(s)).

Current deck:
\`\`\`html
${input.existingSlidesHtml}
\`\`\`

User request:
${promptTask(input)}

${targetedScope}

Output either exact SEARCH/REPLACE patches or the complete corrected fragment.`;
}

export function buildPresentationAddSlidesUserPrompt(input: PresentationEditUserPromptInput): string {
  const nextSlideHint = input.existingSlideCount === 1
    ? 'This is slide 2: create an agenda or overview slide.'
    : input.existingSlideCount === 2
      ? 'This is slide 3: start the first content slide.'
      : `This is slide ${input.existingSlideCount + 1}: continue the content flow or transition toward closing.`;

  return `Append new slide section(s) to the existing ${input.existingSlideCount}-slide deck.

${summarizeExistingStyle(input.existingSlidesHtml)}

Recent slide context:
\`\`\`html
${extractLastNSections(input.existingSlidesHtml, 2)}
\`\`\`

User request:
${promptTask(input)}

Position hint: ${nextSlideHint}

Output only the new \`<section>\` element(s); do not repeat existing slides and do not output a new \`<style>\` block.`;
}

export function buildPresentationBatchSlidePrompt(input: PresentationBatchSlidePromptInput): string {
  const qualityLine = input.runPlan?.qualityBar
    ? `Quality bar: ${input.runPlan.qualityBar.tier}, score ${input.runPlan.qualityBar.acceptanceThresholds.minimumScore}+; vary slide role while preserving motif and shared tokens.`
    : 'Quality bar: preserve premium narrative continuity, role variety, and strong visual hierarchy.';
  const slideTask = `## BATCH SLIDE ${input.brief.index} OF ${input.totalSlides}

Deck task: ${input.runPlan?.userIntent ?? input.planResult.enhancedPrompt}
Slide title: ${input.brief.title}
Content guidance: ${input.brief.contentGuidance}
${input.brief.visualGuidance ? `Visual guidance: ${input.brief.visualGuidance}` : ''}
${qualityLine}

Generate exactly one \`<section>\` for this slide.`;
  const slideBlueprint = input.runPlan?.workQueue
    .find((part) => part.kind === 'slide' && part.orderIndex === input.brief.index - 1)
    ?.presentationSlideBlueprint;

  if (input.brief.index === 1 || !input.sharedStyleBlock) {
    return buildPrompt([
      buildNarrativePlanPack(input),
      buildSlideBlueprintPack(slideBlueprint),
      slideTask,
      'This first slide establishes the reusable deck style system. Include the shared `<style>` block and one section.',
    ]);
  }

  return buildPrompt([
    buildNarrativePlanPack(input),
    buildSlideBlueprintPack(slideBlueprint),
    slideTask,
    `Shared deck style from slide 1:
\`\`\`html
${input.sharedStyleBlock.slice(0, 2200)}
\`\`\``,
    'Reuse the shared variables, class vocabulary, type scale, and motion cadence. Add a small extension `<style>` only if this slide needs one new class.',
  ]);
}

export function buildPresentationRevisionSystemPrompt(input: PresentationRevisionPromptInput): string {
  return buildPrompt([
    buildCoreArtifactContractPack(),
    buildPresentationFragmentContractPack(guidanceFrom(input)),
    buildDesignManifestPack(input),
    buildQualityBarContractPack(input.runPlan?.qualityBar, { includeReferenceQualityTarget: false }),
    buildValidatorFeedbackPack(input.feedback ?? []),
    `## SURGICAL REVISION

Fix only the listed quality issues.
Preserve useful structure, class names, copy, CSS variables, and animation names.
Do not introduce new wrappers, remote assets, inline styles, or a new visual system.`,
    input.projectRulesBlock,
    buildFinalFormatPack(),
  ]);
}
