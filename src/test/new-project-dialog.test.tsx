import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initProjectMock = vi.hoisted(() => vi.fn());
const createBlankProjectMock = vi.hoisted(() => vi.fn(() => ({
  id: 'blank-project',
  title: 'Untitled Project',
  description: '',
  visibility: 'private',
  documents: [],
  activeDocumentId: null,
  chatHistory: [],
  memoryTree: undefined,
  media: [],
  projectRules: { markdown: '', updatedAt: 0 },
  contextPolicy: undefined,
  workflowPresets: undefined,
  sections: { drafts: [], main: [], suggestions: [], issues: [] },
  createdAt: 1,
  updatedAt: 1,
})));

vi.mock('@/services/bootstrap/projectStarter', () => ({
  createBlankProject: createBlankProjectMock,
  listPresentationStarters: () => [
    { id: 'corporate', label: 'Corporate', description: 'Starter deck', templateId: 'corporate' },
  ],
}));

vi.mock('@/services/bootstrap/initProject', () => ({
  initProject: initProjectMock,
}));

vi.mock('@/services/bootstrap/documentStarters', () => ({
  listDocumentStarters: () => [
    { id: 'executive-brief', label: 'Executive Brief', description: 'Doc starter', blueprintId: 'executive-brief' },
  ],
}));

vi.mock('@/services/bootstrap/spreadsheetStarters', () => ({
  listSpreadsheetStarters: () => [
    { id: 'project-tracker', label: 'Project Tracker', description: 'Sheet starter', starterKind: 'project' },
  ],
}));

vi.mock('@/services/bootstrap/starterKits', () => ({
  listProjectStarterKits: () => [
    {
      id: 'executive-briefing',
      label: 'Executive Briefing',
      description: 'Starter kit',
      artifacts: [{ key: 'brief', type: 'document', starterId: 'executive-brief' }],
    },
  ],
}));

vi.mock('@/services/storage/projectFormat', () => ({
  downloadProjectFile: vi.fn(),
  openProjectFile: vi.fn(),
}));

vi.mock('@/services/storage/versionHistory', () => ({
  commitVersion: vi.fn(async () => null),
}));

import { Toolbar } from '@/components/Toolbar';
import { useChatStore } from '@/stores/chatStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DEFAULT_COLOR_THEME = { background: '#ffffff', primary: '#1a1a2e', accent: '#2563eb' };

function flushEffects(): Promise<void> {
  return act(async () => {
    await Promise.resolve();
  });
}

function renderToolbar(): { container: HTMLDivElement; unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(
      <Toolbar
        chatPanelOpen={false}
        onToggleChatPanel={() => {}}
        sidebarOpen
        onToggleSidebar={() => {}}
        historyPanelOpen={false}
        onToggleHistoryPanel={() => {}}
      />,
    );
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function clickByLabel(container: HTMLElement, label: string) {
  const button = container.querySelector(`[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${label}`);
  }

  act(() => {
    button.click();
  });
}

function openDropdownByLabel(container: HTMLElement, label: string) {
  const button = container.querySelector(`[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Dropdown trigger not found: ${label}`);
  }

  act(() => {
    button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    button.click();
  });
}

function clickButtonByText(label: string) {
  const buttons = Array.from(document.querySelectorAll('button'));
  const button = buttons.find((entry) => entry.textContent?.includes(label));
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${label}`);
  }

  act(() => {
    button.click();
  });
}

function clickMenuItemByText(label: string) {
  const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
  const menuItem = menuItems.find((entry) => entry.textContent?.includes(label));
  if (!(menuItem instanceof HTMLElement)) {
    throw new Error(`Menu item not found: ${label}`);
  }

  act(() => {
    menuItem.click();
  });
}

function setSelectValue(id: string, value: string) {
  const select = document.getElementById(id);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Select not found: ${id}`);
  }

  act(() => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function resetStores() {
  window.localStorage.clear();
  useChatStore.getState().clearMessages();
  useChatStore.getState().setStatus({ state: 'idle' });
  useChatStore.getState().setStreamingContent('');
  useChatStore.getState().setPendingRetryPrompt(null);
  useChatStore.getState().setPendingAutoSubmitPrompt(null);
  useChatStore.getState().resetTokens();
  usePresentationStore.getState().reset();
  useProjectStore.getState().reset();
  useSettingsStore.setState((state) => ({
    ...state,
    providerId: 'openai',
    showSettings: false,
    documentStylePreset: 'auto',
  }));
}

describe('Toolbar new project dialog', () => {
  beforeEach(() => {
    resetStores();
    initProjectMock.mockReset();
    createBlankProjectMock.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('creates a blank project through the dialog path', async () => {
    initProjectMock.mockResolvedValue({
      project: {
        ...createBlankProjectMock(),
        visualVariantId: 'executive',
        colorTheme: DEFAULT_COLOR_THEME,
      },
      report: {
        ranAt: 1,
        projectId: 'blank-project',
        items: [],
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
      },
    });

    useProjectStore.getState().addDocument({
      id: 'doc-1',
      title: 'Existing',
      type: 'document',
      contentHtml: '<p>Existing</p>',
      sourceMarkdown: '# Existing',
      themeCss: '',
      slideCount: 0,
      chartSpecs: {},
      order: 0,
      createdAt: 1,
      updatedAt: 1,
    });

    const view = renderToolbar();
    clickByLabel(view.container, 'New project');
    clickButtonByText('Create project');
    clickButtonByText('Discard & start new');
    await flushEffects();

    expect(useProjectStore.getState().project.documents).toHaveLength(0);
    expect(useProjectStore.getState().project.visualVariantId).toBe('executive');
    expect(initProjectMock).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      visualVariantId: 'executive',
      colorTheme: DEFAULT_COLOR_THEME,
    }));

    view.unmount();
  });

  it('creates a starter-kit project through the dialog path', async () => {
    initProjectMock.mockResolvedValue({
      project: {
        ...createBlankProjectMock(),
        title: 'Executive Briefing',
        documents: [{
          id: 'doc-brief',
          title: 'Executive Brief',
          type: 'document',
          contentHtml: '<article><h1>Executive Brief</h1></article>',
          sourceMarkdown: '# Executive Brief',
          themeCss: '',
          slideCount: 0,
          chartSpecs: {},
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        }],
        activeDocumentId: 'doc-brief',
      },
      report: {
        ranAt: 1,
        projectId: 'blank-project',
        items: [
          {
            kind: 'project-rules',
            target: 'project-rules.md',
            status: 'created',
            summary: 'Applied visual direction.',
          },
          {
            kind: 'artifact',
            target: 'document:brief',
            status: 'created',
            summary: 'Created starter artifact.',
          },
        ],
        createdCount: 2,
        updatedCount: 0,
        skippedCount: 0,
      },
    });

    const view = renderToolbar();
    clickByLabel(view.container, 'New project');
    clickButtonByText('Starter kit');
    clickButtonByText('Create project');
    await flushEffects();

    expect(initProjectMock).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      starterKitId: 'executive-briefing',
      visualVariantId: 'executive',
      colorTheme: DEFAULT_COLOR_THEME,
    }));
    expect(useProjectStore.getState().project.title).toBe('Executive Briefing');
    expect(view.container.textContent).toContain('Project created with 1 starter artifact.');
    expect(view.container.textContent).not.toContain('2 starter artifacts');

    view.unmount();
  });

  it('creates a single-artifact quick-start project through the dialog path', async () => {
    initProjectMock.mockResolvedValue({
      project: {
        ...createBlankProjectMock(),
        title: 'Untitled Project',
        documents: [{
          id: 'sheet-1',
          title: 'Project Tracker',
          type: 'spreadsheet',
          contentHtml: '',
          themeCss: '',
          slideCount: 0,
          chartSpecs: {},
          workbook: { sheets: [], activeSheetIndex: 0 },
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        }],
        activeDocumentId: 'sheet-1',
      },
      report: {
        ranAt: 1,
        projectId: 'blank-project',
        items: [],
        createdCount: 1,
        updatedCount: 0,
        skippedCount: 0,
      },
    });

    const view = renderToolbar();
    clickByLabel(view.container, 'New project');
    clickButtonByText('Single artifact');
    setSelectValue('artifact-type-select', 'spreadsheet');
    await flushEffects();
    clickButtonByText('Create project');
    await flushEffects();

    expect(initProjectMock).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      artifacts: [{
        key: 'primary',
        type: 'spreadsheet',
        starterId: 'project-tracker',
      }],
      visualVariantId: 'executive',
      colorTheme: DEFAULT_COLOR_THEME,
    }));
    expect(useProjectStore.getState().project.documents[0]?.type).toBe('spreadsheet');

    view.unmount();
  });

  it('opens the real Artifact Library from the toolbar more menu', async () => {
    const view = renderToolbar();

    openDropdownByLabel(view.container, 'More options');
    await flushEffects();
    clickMenuItemByText('Artifact library');
    await flushEffects();

    expect(document.body.textContent).toContain('Artifact library');
    expect(document.body.textContent).toContain('Editorial Stage');
    expect(document.body.textContent).toContain('Operating Model');
    expect(document.body.textContent).toContain('src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/preview.png');

    view.unmount();
  });

  it('starts a project from a shipped Artifact Library example', async () => {
    const view = renderToolbar();

    openDropdownByLabel(view.container, 'More options');
    await flushEffects();
    clickMenuItemByText('Artifact library');
    await flushEffects();
    clickButtonByText('Start from example');
    await flushEffects();

    const project = useProjectStore.getState().project;
    expect(initProjectMock).not.toHaveBeenCalled();
    expect(project.title).toBe('Decision Brief Example');
    expect(project.documents).toHaveLength(1);
    expect(project.activeDocumentId).toBe(project.documents[0]?.id);
    expect(project.documents[0]?.artifactManifest?.packId).toBe('presentation/editorial-stage-v1');
    expect(project.documents[0]?.artifactSourcePayload).toEqual(expect.objectContaining({
      packId: 'presentation/editorial-stage-v1',
      schemaVersion: 1,
    }));
    expect(project.media?.map((asset) => asset.id)).toContain('launch-proof-screenshot');
    expect(view.container.textContent).toContain('Started from Decision Brief Example.');

    view.unmount();
  });
});
