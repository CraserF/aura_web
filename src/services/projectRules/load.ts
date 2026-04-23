import type {
  ContextPolicy,
  ProjectRulesDocument,
  WorkflowPresetCollection,
} from '@/services/projectRules/types';
import {
  defaultContextPolicy,
  defaultProjectRules,
  defaultWorkflowPresets,
} from '@/services/projectRules/defaults';

export function loadProjectRulesDocument(value?: ProjectRulesDocument | null): ProjectRulesDocument {
  return value ?? defaultProjectRules();
}

export function loadContextPolicy(value?: ContextPolicy | null): ContextPolicy {
  return value ?? defaultContextPolicy();
}

export function loadWorkflowPresets(value?: WorkflowPresetCollection | null): WorkflowPresetCollection {
  return value ?? defaultWorkflowPresets();
}
