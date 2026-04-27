import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
});
