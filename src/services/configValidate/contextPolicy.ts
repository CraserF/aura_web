import type { ConfigDiagnostic } from '@/services/configValidate/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateOverride(
  value: unknown,
  path: string,
  diagnostics: ConfigDiagnostic[],
  extraAllowedKeys: string[] = [],
): void {
  if (!isRecord(value)) {
    diagnostics.push({
      source: 'contextPolicy',
      path,
      severity: 'error',
      code: 'invalid-type',
      message: `${path} must be an object.`,
    });
    return;
  }

  const booleanKeys = ['includeProjectChat', 'includeMemory', 'includeAttachments', 'includeRelatedDocuments'] as const;
  const numberKeys = ['maxChatMessages', 'maxMemoryTokens', 'maxRelatedDocuments', 'maxAttachmentChars'] as const;
  const allowedKeys = new Set([...booleanKeys, ...numberKeys, 'includeChatHistory', ...extraAllowedKeys]);

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      diagnostics.push({
        source: 'contextPolicy',
        path: `${path}.${key}`,
        severity: 'warning',
        code: 'unknown-key',
        message: `Unknown context policy key "${key}" will be ignored.`,
      });
    }
  }

  if ('includeChatHistory' in value) {
    diagnostics.push({
      source: 'contextPolicy',
      path: `${path}.includeChatHistory`,
      severity: 'warning',
      code: 'deprecated-field',
      message: 'includeChatHistory is deprecated.',
      suggestion: 'Use includeProjectChat instead.',
    });
  }

  for (const key of booleanKeys) {
    if (key in value && typeof value[key] !== 'boolean') {
      diagnostics.push({
        source: 'contextPolicy',
        path: `${path}.${key}`,
        severity: 'error',
        code: 'invalid-type',
        message: `${key} must be a boolean.`,
      });
    }
  }

  for (const key of numberKeys) {
    if (key in value && (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0)) {
      diagnostics.push({
        source: 'contextPolicy',
        path: `${path}.${key}`,
        severity: 'error',
        code: 'invalid-type',
        message: `${key} must be a non-negative number.`,
      });
    }
  }
}

export function validateContextPolicy(policy: unknown): ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];

  if (policy == null) return diagnostics;
  if (!isRecord(policy)) {
    return [{
      source: 'contextPolicy',
      path: 'contextPolicy',
      severity: 'error',
      code: 'invalid-type',
      message: 'Context policy must be an object.',
    }];
  }

  const allowedKeys = new Set([
    'version',
    'includeProjectChat',
    'includeMemory',
    'includeAttachments',
    'includeRelatedDocuments',
    'maxChatMessages',
    'maxMemoryTokens',
    'maxRelatedDocuments',
    'maxAttachmentChars',
    'artifactOverrides',
    'includeChatHistory',
  ]);

  for (const key of Object.keys(policy)) {
    if (!allowedKeys.has(key)) {
      diagnostics.push({
        source: 'contextPolicy',
        path: `contextPolicy.${key}`,
        severity: 'warning',
        code: 'unknown-key',
        message: `Unknown context policy key "${key}" will be ignored.`,
      });
    }
  }

  if ('version' in policy && (typeof policy.version !== 'number' || !Number.isFinite(policy.version))) {
    diagnostics.push({
      source: 'contextPolicy',
      path: 'contextPolicy.version',
      severity: 'error',
      code: 'invalid-type',
      message: 'contextPolicy.version must be a finite number.',
    });
  }

  validateOverride(policy, 'contextPolicy', diagnostics, ['version', 'artifactOverrides']);

  if ('artifactOverrides' in policy) {
    if (!isRecord(policy.artifactOverrides)) {
      diagnostics.push({
        source: 'contextPolicy',
        path: 'contextPolicy.artifactOverrides',
        severity: 'error',
        code: 'invalid-type',
        message: 'artifactOverrides must be an object keyed by artifact type.',
      });
    } else {
      for (const [key, value] of Object.entries(policy.artifactOverrides)) {
        if (key !== 'document' && key !== 'presentation' && key !== 'spreadsheet') {
          diagnostics.push({
            source: 'contextPolicy',
            path: `contextPolicy.artifactOverrides.${key}`,
            severity: 'warning',
            code: 'unknown-key',
            message: `Unknown artifact override "${key}" will be ignored.`,
          });
          continue;
        }
        validateOverride(value, `contextPolicy.artifactOverrides.${key}`, diagnostics);
      }
    }
  }

  return diagnostics;
}
