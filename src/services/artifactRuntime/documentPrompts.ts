import {
  buildCoreArtifactContractPack,
  buildDocumentDesignFamilyPack,
  buildDocumentIframeContractPack,
  buildQualityBarContractPack,
} from '@/services/artifactRuntime/promptPacks';
import {
  buildDocumentRuntimePartPrompt,
  buildDocumentRuntimeModulePrompt,
  buildDocumentRuntimeModuleRepairPrompt,
  buildDocumentRuntimeOutlinePrompt,
  type BuildDocumentRuntimeModulePromptInput,
  type BuildDocumentRuntimeModuleRepairPromptInput,
  type BuildDocumentRuntimeOutlinePromptInput,
} from '@/services/artifactRuntime/documentRuntime';
import type { ArtifactPart, ArtifactQualityBar } from '@/services/artifactRuntime/types';

export interface BuildDocumentRuntimeSystemPromptInput {
  documentType: string;
  designFamily?: string;
  blueprintLabel?: string;
  mode: 'queued-create' | 'queued-edit' | 'queued-repair';
  qualityBar?: ArtifactQualityBar;
}

export interface DocumentRuntimeProjectLink {
  id: string;
  title: string;
  type: 'document' | 'presentation';
}

export interface BuildDocumentRuntimeSingleStreamSystemPromptInput {
  documentType: string;
  designFamily?: string;
  blueprintLabel?: string;
  mode: 'create' | 'edit';
  projectRulesBlock?: string;
  qualityBar?: ArtifactQualityBar;
}

export interface BuildDocumentRuntimeSingleStreamUserPromptInput {
  taskBrief: string;
  documentType: string;
  blueprintLabel?: string;
  artDirection?: string;
  preferHtml?: boolean;
  requestedTitle?: string;
  memoryContext?: string;
  projectLinks?: DocumentRuntimeProjectLink[];
  runtimeParts?: ArtifactPart[];
  existingDocumentSummary?: string;
  targetSummary?: string[];
  allowFullRegeneration?: boolean;
  qualityBar?: ArtifactQualityBar;
}

export function buildDocumentRuntimeSystemPrompt(
  input: BuildDocumentRuntimeSystemPromptInput,
): string {
  const modeInstruction = input.mode === 'queued-repair'
    ? 'Repair only the failed runtime document module.'
    : input.mode === 'queued-edit'
      ? 'Edit only the targeted runtime document module.'
      : 'Create one runtime-owned document part at a time.';

  return [
    buildCoreArtifactContractPack(),
    buildDocumentIframeContractPack(),
    buildDocumentDesignFamilyPack({
      documentType: input.documentType,
      designFamily: input.designFamily,
      blueprintLabel: input.blueprintLabel,
    }),
    buildQualityBarContractPack(input.qualityBar),
    `## DOCUMENT RUNTIME ROLE

${modeInstruction}
Keep output deterministic and easy for Aura to validate, while meeting the quality bar for depth, rhythm, and usefulness.
Use semantic HTML fragments for modules and markdown only when the task asks for an outline.
Never include remote assets, JavaScript, unsupported wrappers, unresolved placeholders, or inline event handlers.`,
  ].join('\n\n');
}

export function buildDocumentRuntimeSingleStreamSystemPrompt(
  input: BuildDocumentRuntimeSingleStreamSystemPromptInput,
): string {
  const modeInstruction = input.mode === 'edit'
    ? 'Update the current document with the smallest complete change that satisfies the request.'
    : 'Create one complete document body that Aura can render immediately.';
  const projectRules = input.projectRulesBlock?.trim()
    ? `\n\n## PROJECT STYLE RULES\n\n${input.projectRulesBlock.trim()}\n\nFollow these rules unless the user explicitly overrides them.`
    : '';

  return [
    buildCoreArtifactContractPack(),
    buildDocumentIframeContractPack(),
    buildDocumentDesignFamilyPack({
      documentType: input.documentType,
      designFamily: input.designFamily,
      blueprintLabel: input.blueprintLabel,
    }),
    buildQualityBarContractPack(input.qualityBar),
    `## DOCUMENT SINGLE-STREAM ROLE

${modeInstruction}
Return only the document content fragment for Aura's document canvas.
Use semantic HTML with class-based CSS when visual structure helps; markdown is acceptable only for plain reference notes.
Keep the document focused, readable, mobile-safe, print-friendly, and easy to validate.
Never include scripts, remote assets, external stylesheets, unsupported wrappers, unresolved placeholders, or inline event handlers.${projectRules}`,
  ].join('\n\n');
}

function renderProjectLinks(links: DocumentRuntimeProjectLink[] = []): string {
  const documentLinks = links.filter((link) => link.type === 'document');
  if (documentLinks.length === 0) return '';

  return `## Available Project Documents

Reference these documents only when useful:
${documentLinks.map(({ id, title }) => `- <a href="#${id}">${title}</a>`).join('\n')}`;
}

function renderTargetScope(input: BuildDocumentRuntimeSingleStreamUserPromptInput): string {
  if (!input.targetSummary?.length) return '';

  const boundedRule = input.allowFullRegeneration
    ? 'A full rewrite is allowed if it best satisfies the request.'
    : 'Preserve non-targeted blocks where possible and prefer block-local edits.';

  return `## Targeted Edit Scope

Only modify these target areas unless the request explicitly needs a broader rewrite:
${input.targetSummary.map((target) => `- ${target}`).join('\n')}

${boundedRule}`;
}

export function buildDocumentRuntimeSingleStreamUserPrompt(
  input: BuildDocumentRuntimeSingleStreamUserPromptInput,
): string {
  const runtimePartPrompt = buildDocumentRuntimePartPrompt(input.runtimeParts ?? []);
  const titleInstruction = input.requestedTitle?.trim()
    ? `## Required Title\n\nUse this exact document title as the first <h1>: ${input.requestedTitle.trim()}`
    : '';
  const existingDocument = input.existingDocumentSummary?.trim()
    ? `## Existing Document\n\n\`\`\`markdown\n${input.existingDocumentSummary.trim()}\n\`\`\``
    : '';
  const memory = input.memoryContext?.trim()
    ? `## RELEVANT MEMORY CONTEXT\n\n${input.memoryContext.trim()}\n\nUse this only when it improves the current document.`
    : '';
  const projectLinks = renderProjectLinks(input.projectLinks);
  const targetScope = renderTargetScope(input);

  return [
    `## DOCUMENT TASK

Document type: ${input.documentType}
Blueprint: ${input.blueprintLabel ?? 'runtime-selected'}
Art direction: ${input.artDirection ?? 'runtime-selected'}
Output mode: ${input.preferHtml === false ? 'clean reference-friendly document' : 'designed HTML-first document'}
Quality bar: ${input.qualityBar ? `${input.qualityBar.tier}, score ${input.qualityBar.acceptanceThresholds.minimumScore}+` : 'runtime-selected'}

Task brief:
${input.taskBrief}`,
    titleInstruction,
    existingDocument,
    targetScope,
    projectLinks,
    runtimePartPrompt,
    memory,
    `## OUTPUT RULES

- Return the complete current document content, not commentary.
- Use one compact <style> block only when the document benefits from designed hierarchy.
- Use reusable class names and mobile-safe modules instead of inline styles.
- Keep body copy at 16px or larger and make tables/media fluid.
- Avoid walls of text; use concise sections, callouts, KPI/proof strips, comparison modules, timelines, or sidebars only when they clarify the content.
- Do not include <html>, <head>, <body>, scripts, remote assets, external CSS, iframes, fixed-width clipping layouts, TODOs, or unresolved placeholders.`,
  ].filter(Boolean).join('\n\n');
}

export function buildDocumentRuntimeOutlineUserPrompt(
  input: BuildDocumentRuntimeOutlinePromptInput,
): string {
  return buildDocumentRuntimeOutlinePrompt(input);
}

export function buildDocumentRuntimeModuleUserPrompt(
  input: BuildDocumentRuntimeModulePromptInput,
): string {
  return buildDocumentRuntimeModulePrompt(input);
}

export function buildDocumentRuntimeRepairUserPrompt(
  input: BuildDocumentRuntimeModuleRepairPromptInput,
): string {
  return buildDocumentRuntimeModuleRepairPrompt(input);
}
