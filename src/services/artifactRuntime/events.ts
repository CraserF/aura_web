import type { WorkflowEvent } from '@/services/ai/workflow/types';
import type {
  ArtifactRunEvent,
  ArtifactRunEventType,
  ArtifactRuntimeRole,
} from '@/services/artifactRuntime/types';

export interface CreateArtifactRunEventInput {
  runId: string;
  type: ArtifactRunEventType;
  role: ArtifactRuntimeRole;
  message: string;
  partId?: string;
  pct?: number;
}

export function createArtifactRunEvent(input: CreateArtifactRunEventInput): ArtifactRunEvent {
  return {
    id: crypto.randomUUID(),
    runId: input.runId,
    type: input.type,
    timestamp: Date.now(),
    role: input.role,
    message: input.message,
    ...(input.partId ? { partId: input.partId } : {}),
    ...(typeof input.pct === 'number' ? { pct: input.pct } : {}),
  };
}

export function artifactRunEventToWorkflowEvent(event: ArtifactRunEvent): WorkflowEvent {
  switch (event.type) {
    case 'runtime.part-started':
      return {
        type: 'step-update',
        stepId: event.partId ?? event.type,
        label: event.message,
        status: 'active',
      };
    case 'runtime.part-completed':
      return {
        type: 'step-update',
        stepId: event.partId ?? event.type,
        label: event.message,
        status: 'done',
      };
    case 'runtime.validation-started':
      return {
        type: 'step-start',
        stepId: event.partId ?? 'evaluate',
        label: event.message,
      };
    case 'runtime.validation-completed':
      return {
        type: 'step-done',
        stepId: event.partId ?? 'evaluate',
        label: event.message,
      };
    case 'runtime.repair-started':
      return {
        type: 'progress',
        message: event.message,
        pct: event.pct,
      };
    case 'runtime.finalized':
      return {
        type: 'step-done',
        stepId: event.partId ?? 'finalize',
        label: event.message,
      };
    case 'runtime.cancelled':
      return {
        type: 'step-error',
        stepId: event.partId ?? 'workflow',
        error: event.message,
      };
    case 'runtime.plan-created':
    case 'runtime.design-manifest-created':
    default:
      return {
        type: 'progress',
        message: event.message,
        pct: event.pct,
      };
  }
}

export function emitArtifactRunEvent(
  onEvent: (event: WorkflowEvent) => void,
  input: CreateArtifactRunEventInput,
): ArtifactRunEvent {
  const event = createArtifactRunEvent(input);
  onEvent(artifactRunEventToWorkflowEvent(event));
  return event;
}
