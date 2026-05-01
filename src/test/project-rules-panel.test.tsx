import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProjectRulesPanel } from '@/components/ProjectRulesPanel';
import type { ProjectData } from '@/types/project';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function renderPanel(project: ProjectData): {
  container: HTMLDivElement;
  onSave: ReturnType<typeof vi.fn>;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const onSave = vi.fn();

  act(() => {
    root.render(
      <ProjectRulesPanel
        open
        onOpenChange={() => {}}
        project={project}
        onSave={onSave}
      />,
    );
  });

  return {
    container,
    onSave,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('ProjectRulesPanel design-system preview', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('previews safe project colour roles without exposing raw CSS as accepted tokens', () => {
    const view = renderPanel(makeProject({
      colorTheme: {
        background: '#ffffff',
        primary: '#111827',
        accent: '#2563eb',
      },
      projectRules: {
        markdown: [
          'Accent: #f97316',
          '.deck { background: #000000; }',
          'background: #101010',
        ].join('\n'),
        updatedAt: 1,
      },
    }));

    const preview = document.body.querySelector('[aria-label="Project colour preview"]');
    if (!(preview instanceof HTMLElement)) throw new Error('Expected project colour preview.');

    expect(preview.textContent).toContain('Project colours');
    expect(preview.textContent).toContain('3 active');
    expect(preview.textContent).toContain('accent');
    expect(preview.textContent).toContain('text');
    expect(preview.textContent).toContain('Ignored colour rules (2)');
    expect(preview.textContent).toContain('.deck { background: #000000; }');
    expect(preview.textContent).toContain('background: #101010');
    expect(preview.textContent).not.toContain('Design Tokens');

    view.unmount();
  });

  it('clears artifact default modes when None is selected', () => {
    const view = renderPanel(makeProject({
      workflowPresets: {
        version: 1,
        presets: [{
          id: 'presentation-lean',
          name: 'Presentation lean',
          artifactType: 'presentation',
          enabled: true,
        }],
        defaultPresetByArtifact: {
          presentation: 'presentation-lean',
        },
      },
    }));
    const presentationLabel = [...document.body.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('presentation default'));
    const select = presentationLabel?.querySelector('select');
    if (!(select instanceof HTMLSelectElement)) throw new Error('Expected presentation default select.');
    const saveButton = [...document.body.querySelectorAll('button')]
      .find((button) => button.textContent === 'Save project style');
    if (!(saveButton instanceof HTMLButtonElement)) throw new Error('Expected save button.');

    act(() => {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => {
      saveButton.click();
    });

    expect(view.onSave).toHaveBeenCalledTimes(1);
    expect(view.onSave.mock.calls[0]?.[0].workflowPresets.defaultPresetByArtifact.presentation)
      .toBeUndefined();

    view.unmount();
  });
});
