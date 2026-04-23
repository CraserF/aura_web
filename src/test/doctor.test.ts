import { describe, expect, it } from 'vitest';

import { validateContextPolicy } from '@/services/configValidate/contextPolicy';
import { validateWorkflowPresets } from '@/services/configValidate/presets';
import { runDoctor } from '@/services/diagnostics/runDoctor';
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
});
