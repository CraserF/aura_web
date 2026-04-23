import type { RunResult } from '@/services/contracts/runResult';
import type { RunRequest } from '@/services/runs/types';
import type { ProjectDocument } from '@/types/project';
import type { GenerationStatus } from '@/types';

export interface ProjectWorkflowContext {
  runRequest: RunRequest;
  addDocument: (doc: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;
  setStatus: (status: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
}

// TODO(phase-6): Add project-wide summary/review/link/refresh orchestration.
export async function handleProjectWorkflow(ctx: ProjectWorkflowContext): Promise<RunResult> {
  const { runRequest, setStatus, setStreamingContent } = ctx;
  setStatus({ state: 'idle' });
  setStreamingContent('');

  return {
    runId: runRequest.runId,
    status: 'blocked',
    intent: runRequest.intent,
    outputs: {},
    assistantMessage: {
      content: 'Project workflow is not implemented yet.',
    },
    validation: {
      passed: true,
      summary: 'Project workflow scaffold is present but not active yet.',
    },
    warnings: [],
    changedTargets: [],
    structuredStatus: {
      title: 'Project workflow pending',
      detail: 'Phase 6 project workflow scaffold is present but not yet active.',
    },
  };
}
