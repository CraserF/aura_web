import { describe, expect, it } from 'vitest';

import { validateContextPolicy } from '@/services/configValidate/contextPolicy';
import { validateWorkflowPresets } from '@/services/configValidate/presets';
import { runDoctor } from '@/services/diagnostics/runDoctor';
import {
  getProviderCapabilityProfile,
  OLLAMA_BASELINE_MODEL,
} from '@/services/ai/providerCapabilities';
import type { ProjectData } from '@/types/project';

function makeProject(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    id: 'project-1',
    title: 'Project',
    visibility: 'private',
    documents: [],
    activeDocumentId: null,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('config validation', () => {
  it('returns actionable diagnostics for wrong type, unknown key, and deprecated field', () => {
    const diagnostics = validateContextPolicy({
      version: 1,
      includeProjectChat: 'yes',
      includeChatHistory: true,
      unexpectedSetting: true,
    });

    expect(diagnostics.some((item) => item.code === 'invalid-type')).toBe(true);
    expect(diagnostics.some((item) => item.code === 'deprecated-field')).toBe(true);
    expect(diagnostics.some((item) => item.code === 'unknown-key')).toBe(true);
  });

  it('flags duplicate workflow preset ids', () => {
    const diagnostics = validateWorkflowPresets({
      version: 1,
      presets: [
        { id: 'dup', name: 'One', enabled: true },
        { id: 'dup', name: 'Two', enabled: true },
      ],
      defaultPresetByArtifact: {},
    });

    expect(diagnostics.some((item) => item.code === 'duplicate-id')).toBe(true);
  });
});

describe('runDoctor', () => {
  it('returns stable fail and warning counts for invalid project/provider state', () => {
    const report = runDoctor({
      project: makeProject({
        activeDocumentId: 'missing-doc',
        contextPolicy: {
          version: 1,
          includeProjectChat: true,
          includeMemory: true,
          includeAttachments: true,
          includeRelatedDocuments: true,
          maxChatMessages: 12,
          maxMemoryTokens: 800,
          maxRelatedDocuments: 4,
          maxAttachmentChars: 1000,
        },
      }),
      providerConfig: {
        id: 'openai',
        name: 'OpenAI',
        apiKey: '',
        baseUrl: 'not-a-url',
      },
    });

    expect(report.overallStatus).toBe('fail');
    expect(report.blockingCount).toBeGreaterThan(0);
    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.checks.map((check) => check.id)).toEqual([
      'provider',
      'project',
      'exports',
      'memory',
      'data',
      'dependencies',
    ]);
  });

  it('recommends the gemma4 baseline for non-baseline Ollama models', () => {
    const report = runDoctor({
      project: makeProject(),
      providerConfig: {
        id: 'ollama',
        name: 'Ollama',
        apiKey: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        model: 'llama3.1',
      },
    });

    const providerCheck = report.checks[0];
    expect(providerCheck?.status).toBe('warning');
    expect(providerCheck?.diagnostics.some((diagnostic) => diagnostic.code === 'ollama-local-capabilities')).toBe(true);
    expect(providerCheck?.diagnostics.some((diagnostic) => diagnostic.code === 'ollama-non-baseline-model')).toBe(true);
  });
});

describe('provider capabilities', () => {
  it('marks the Ollama gemma4 baseline as the recommended local profile', () => {
    const profile = getProviderCapabilityProfile({
      id: 'ollama',
      model: OLLAMA_BASELINE_MODEL,
    });

    expect(profile.isRecommendedBaseline).toBe(true);
    expect(profile.toolSupport).toBe('limited');
    expect(profile.structuredOutput).toBe('best-effort');
    expect(profile.secondaryEvaluation).toBe('skip');
    expect(profile.warnings).toEqual([]);
  });
});
