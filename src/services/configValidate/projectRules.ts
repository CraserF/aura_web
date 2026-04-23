import type { ConfigDiagnostic } from '@/services/configValidate/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function validateProjectRules(rules: unknown): ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];

  if (rules == null) return diagnostics;
  if (!isRecord(rules)) {
    return [{
      source: 'projectRules',
      path: 'projectRules',
      severity: 'error',
      code: 'invalid-type',
      message: 'Project rules must be an object with markdown and updatedAt fields.',
      suggestion: 'Reset the project rules document to the default empty state.',
    }];
  }

  const allowedKeys = new Set(['markdown', 'updatedAt', 'content']);
  for (const key of Object.keys(rules)) {
    if (!allowedKeys.has(key)) {
      diagnostics.push({
        source: 'projectRules',
        path: `projectRules.${key}`,
        severity: 'warning',
        code: 'unknown-key',
        message: `Unknown project rules key "${key}" will be ignored.`,
      });
    }
  }

  if ('content' in rules) {
    diagnostics.push({
      source: 'projectRules',
      path: 'projectRules.content',
      severity: 'warning',
      code: 'deprecated-field',
      message: 'projectRules.content is deprecated.',
      suggestion: 'Rename content to markdown.',
    });
  }

  if ('markdown' in rules && typeof rules.markdown !== 'string') {
    diagnostics.push({
      source: 'projectRules',
      path: 'projectRules.markdown',
      severity: 'error',
      code: 'invalid-type',
      message: 'projectRules.markdown must be a string.',
    });
  }

  if ('updatedAt' in rules && (typeof rules.updatedAt !== 'number' || !Number.isFinite(rules.updatedAt))) {
    diagnostics.push({
      source: 'projectRules',
      path: 'projectRules.updatedAt',
      severity: 'warning',
      code: 'invalid-type',
      message: 'projectRules.updatedAt must be a finite number.',
    });
  }

  return diagnostics;
}
