import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildArtifactRunPlan } from '@/services/artifactRuntime';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), 'src', relativePath), 'utf8');
}

describe('non-technical UX simplification', () => {
  it('surfaces curated project style modes and keeps technical controls advanced-only', () => {
    const panelSource = readSource('components/ProjectRulesPanel.tsx');

    for (const mode of ['Executive', 'Editorial', 'Proposal', 'Research', 'Launch', 'Teaching', 'Data Story']) {
      expect(panelSource).toContain(mode);
    }
    expect(panelSource).toContain('Output mode');
    expect(panelSource).toContain('Advanced');
    expect(panelSource).toContain('Rules Markdown');
    expect(panelSource).toContain('Context Policy');
    expect(panelSource).toContain('Advanced Workflow Modes');
    expect(panelSource).not.toContain('Workflow Presets');
    expect(panelSource).not.toContain('No workflow presets yet.');

    const advancedStart = panelSource.indexOf('>Advanced</summary>');
    expect(advancedStart).toBeGreaterThan(0);
    for (const defaultLabel of ['Audience', 'Output mode', 'Tone', 'Visual style', 'Quality / speed', 'Source usage']) {
      expect(panelSource.indexOf(defaultLabel)).toBeLessThan(advancedStart);
    }
    for (const technicalLabel of ['Rules Markdown', 'Context Policy', 'Advanced Workflow Modes']) {
      expect(panelSource.indexOf(technicalLabel)).toBeGreaterThan(advancedStart);
    }
  });

  it('replaces visible workflow-preset wording in the chat controls with output modes', () => {
    const chatBarSource = readSource('components/ChatBar.tsx');

    expect(chatBarSource).toContain('Choose output mode');
    expect(chatBarSource).toContain('Auto mode');
    expect(chatBarSource).toContain('Save current as mode');
    expect(chatBarSource).not.toContain('Choose workflow preset');
    expect(chatBarSource).not.toContain('Project default');
    expect(chatBarSource).not.toContain('Save current as preset');
  });

  it('keeps provider mechanics out of the default toolbar status label', () => {
    const toolbarSource = readSource('components/Toolbar.tsx');

    expect(toolbarSource).toContain('AI ready');
    expect(toolbarSource).toContain('AI setup');
    expect(toolbarSource).not.toContain('{providerId}');
    expect(toolbarSource).not.toContain('providerId = useSettingsStore');
  });

  it('maps curated output modes into runtime plan design defaults', () => {
    const launchPlan = buildArtifactRunPlan({
      runId: 'launch-mode-run',
      prompt: 'Create a concise product update deck',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
      projectRulesBlock: '## Project Style\n\n- Output mode: Launch',
    });
    const researchPlan = buildArtifactRunPlan({
      runId: 'research-mode-run',
      prompt: 'Create a concise market document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
      projectRulesBlock: '## Project Style\n\n- Output mode: Research',
    });

    expect(launchPlan.presentationRecipeId).toBe('title-opening');
    expect(launchPlan.templateGuidance.selectedTemplateId).toBe('launch-narrative-light');
    expect(launchPlan.designManifest.family).toBe('launch-narrative-light');
    expect(researchPlan.documentThemeFamily).toBe('research-light');
    expect(researchPlan.designManifest.family).toBe('research-light');
  });
});
