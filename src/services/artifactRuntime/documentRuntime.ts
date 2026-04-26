import type { ArtifactPart, ArtifactRunPlan } from '@/services/artifactRuntime/types';

export interface BuildDocumentRuntimePartsInput {
  runPlan: ArtifactRunPlan;
  documentType: string;
  blueprintLabel: string;
  recommendedModules: string[];
  isEdit: boolean;
}

function normalizeModuleTitle(value: string, index: number): string {
  const cleaned = value
    .replace(/[`*_#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return `Document module ${index + 1}`;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function buildDocumentRuntimeParts(input: BuildDocumentRuntimePartsInput): ArtifactPart[] {
  const modules = input.recommendedModules.length > 0
    ? input.recommendedModules.slice(0, 4)
    : ['summary module', 'evidence module', 'next-step module'];
  const operation = input.isEdit ? 'Update' : 'Create';

  return [
    {
      id: 'document-outline',
      artifactType: 'document',
      kind: 'section',
      orderIndex: 0,
      title: `${operation} ${input.documentType} outline`,
      brief: `${operation} the document structure using the ${input.blueprintLabel} blueprint.`,
      status: 'pending',
    },
    ...modules.map((module, index) => ({
      id: `document-module-${index + 1}`,
      artifactType: 'document' as const,
      kind: 'document-module' as const,
      orderIndex: index + 1,
      title: normalizeModuleTitle(module, index),
      brief: `${operation} a ${module} for the ${input.documentType} document.`,
      status: 'pending' as const,
    })),
    {
      id: 'document-validation',
      artifactType: 'document',
      kind: 'validation-result',
      orderIndex: modules.length + 1,
      title: 'Document validation',
      brief: 'Validate iframe safety, readability, mobile stacking, and print-safe structure.',
      status: 'pending',
    },
  ];
}

export function attachDocumentRuntimeParts(input: BuildDocumentRuntimePartsInput): ArtifactPart[] {
  const parts = buildDocumentRuntimeParts(input);
  input.runPlan.workQueue = parts;
  input.runPlan.queueMode = 'sequential';
  input.runPlan.workflow.queueMode = 'sequential';
  input.runPlan.workflow.queuedWorkItems = parts
    .filter((part) => part.kind === 'section' || part.kind === 'document-module')
    .map((part) => ({
      id: part.id,
      orderIndex: part.orderIndex,
      targetType: 'section',
      targetLabel: part.title,
      operationKind: input.isEdit ? 'edit' : 'create',
      status: 'pending',
      promptSummary: part.brief,
    }));

  return parts;
}
