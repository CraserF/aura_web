import type { ProviderConfig } from '@/types';
import type { ConfigDiagnostic } from '@/services/configValidate/types';
import type { DoctorCheckResult } from '@/services/diagnostics/types';
import {
  getProviderCapabilityProfile,
  OLLAMA_BASELINE_LABEL,
} from '@/services/ai/providerCapabilities';

function summarizeDiagnostics(diagnostics: ConfigDiagnostic[]): Pick<DoctorCheckResult, 'status' | 'summary'> {
  const errorCount = diagnostics.filter((item) => item.severity === 'error').length;
  const warningCount = diagnostics.filter((item) => item.severity === 'warning').length;

  if (errorCount > 0) {
    return { status: 'fail', summary: `${errorCount} blocking provider issue${errorCount === 1 ? '' : 's'} detected.` };
  }
  if (warningCount > 0) {
    return { status: 'warning', summary: `${warningCount} provider warning${warningCount === 1 ? '' : 's'} detected.` };
  }
  return { status: 'pass', summary: 'Provider configuration looks healthy.' };
}

export function runProviderDiagnostics(providerConfig: ProviderConfig): DoctorCheckResult {
  const diagnostics: ConfigDiagnostic[] = [];
  const capabilityProfile = getProviderCapabilityProfile(providerConfig);

  if (providerConfig.id === 'ollama') {
    if (!providerConfig.model?.trim()) {
      diagnostics.push({
        source: 'doctor',
        path: 'provider.model',
        severity: 'error',
        code: 'missing-model',
        message: 'Ollama requires a selected local model.',
        suggestion: 'Choose an Ollama model before generating.',
      });
    }

    diagnostics.push({
      source: 'doctor',
      path: 'provider.model',
      severity: 'info',
      code: 'ollama-local-capabilities',
      message: 'Ollama runs in local generation-first mode with reduced structured-review loops.',
      suggestion: `Use ${OLLAMA_BASELINE_LABEL} for the first supported local-model pass.`,
    });

    if (capabilityProfile.warnings.length > 0) {
      diagnostics.push({
        source: 'doctor',
        path: 'provider.model',
        severity: 'warning',
        code: 'ollama-non-baseline-model',
        message: capabilityProfile.warnings[0] ?? 'Selected Ollama model is not the recommended baseline.',
        suggestion: `Switch to ${OLLAMA_BASELINE_LABEL} before logging local quality results.`,
      });
    }
  } else if (!providerConfig.apiKey.trim()) {
    diagnostics.push({
      source: 'doctor',
      path: 'provider.apiKey',
      severity: 'error',
      code: 'missing-api-key',
      message: `${providerConfig.name} is missing an API key.`,
      suggestion: 'Add an API key in provider settings.',
    });
  }

  if (providerConfig.baseUrl) {
    try {
      new URL(providerConfig.baseUrl);
    } catch {
      diagnostics.push({
        source: 'doctor',
        path: 'provider.baseUrl',
        severity: 'warning',
        code: 'invalid-base-url',
        message: 'Provider base URL is not a valid URL.',
        suggestion: 'Use a fully qualified URL such as https://api.openai.com/v1.',
      });
    }
  }

  const { status, summary } = summarizeDiagnostics(diagnostics);
  return {
    id: 'provider',
    label: 'Provider',
    status,
    summary,
    diagnostics,
  };
}
