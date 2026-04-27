import {
  buildCoreArtifactContractPack,
  buildDocumentDesignFamilyPack,
  buildDocumentIframeContractPack,
} from '@/services/artifactRuntime/promptPacks';
import {
  buildDocumentRuntimeModulePrompt,
  buildDocumentRuntimeModuleRepairPrompt,
  buildDocumentRuntimeOutlinePrompt,
  type BuildDocumentRuntimeModulePromptInput,
  type BuildDocumentRuntimeModuleRepairPromptInput,
  type BuildDocumentRuntimeOutlinePromptInput,
} from '@/services/artifactRuntime/documentRuntime';

export interface BuildDocumentRuntimeSystemPromptInput {
  documentType: string;
  designFamily?: string;
  blueprintLabel?: string;
  mode: 'queued-create' | 'queued-edit' | 'queued-repair';
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
    `## DOCUMENT RUNTIME ROLE

${modeInstruction}
Keep output small, deterministic, and easy for Aura to validate.
Use semantic HTML fragments for modules and markdown only when the task asks for an outline.
Never include remote assets, JavaScript, unsupported wrappers, unresolved placeholders, or inline event handlers.`,
  ].join('\n\n');
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
