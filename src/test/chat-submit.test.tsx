import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const submitPromptMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/chat/submitPrompt', () => ({
  submitPrompt: submitPromptMock,
}));

import { ChatBar } from '@/components/ChatBar';
import { useChatStore } from '@/stores/chatStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ProjectDocument } from '@/types/project';

function flushEffects(): Promise<void> {
  return act(async () => {
    await Promise.resolve();
  });
}

function renderChatBar(): {
  container: HTMLDivElement;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(<ChatBar />);
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

function getTextarea(container: HTMLElement): HTMLTextAreaElement {
  const textarea = container.querySelector('textarea');
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error('Textarea not found');
  }
  return textarea;
}

function clickButton(container: HTMLElement, label: string): void {
  const button = container.querySelector(`[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${label}`);
  }

  act(() => {
    button.click();
  });
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = container.querySelector(`[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}

function setTextareaValue(container: HTMLElement, value: string): void {
  const textarea = getTextarea(container);
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

  act(() => {
    descriptor?.set?.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function resetStores(): void {
  window.localStorage.clear();

  const chat = useChatStore.getState();
  chat.clearMessages();
  chat.setStatus({ state: 'idle' });
  chat.setStreamingContent('');
  chat.setShowAllMessages(false);
  chat.setApplyToAllDocuments(false);
  chat.resetTokens();
  chat.setPendingRetryPrompt(null);
  chat.setPendingAutoSubmitPrompt(null);

  useProjectStore.getState().reset();
  usePresentationStore.getState().reset();
  useSettingsStore.setState((state) => ({
    ...state,
    providerId: 'openai',
    showSettings: false,
    documentStylePreset: 'auto',
    providers: {
      ...state.providers,
      openai: {
        ...state.providers.openai,
        apiKey: 'test-key',
      },
    },
  }));
}

function seedActiveDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  const document: ProjectDocument = {
    id: 'doc-1',
    title: 'Working Draft',
    type: 'document',
    contentHtml: '<p>Draft</p>',
    sourceMarkdown: '# Draft',
    themeCss: '',
    slideCount: 0,
    chartSpecs: {},
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };

  useProjectStore.getState().addDocument(document);
  return document;
}

function seedPackBackedPresentation(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return seedActiveDocument({
    type: 'presentation',
    contentHtml: '<section><h1>Slide</h1></section>',
    slideCount: 1,
    artifactManifest: {
      packId: 'presentation/editorial-stage-v1',
      packVersion: '1.0.0',
      updatedAt: 1,
    },
    artifactSourcePayload: {
      packVersion: '1.0.0',
      slides: [],
    },
    ...overrides,
  });
}

describe('ChatBar submission paths', () => {
  beforeEach(() => {
    resetStores();
    submitPromptMock.mockReset();
  });

  afterEach(() => {
    useChatStore.getState().setStatus({ state: 'idle' });
    vi.useRealTimers();
  });

  it('loads retry prompts back into the composer without auto-submitting', async () => {
    const view = renderChatBar();

    act(() => {
      useChatStore.getState().setPendingRetryPrompt('Try a sharper executive summary');
    });
    await flushEffects();

    expect(getTextarea(view.container).value).toBe('Try a sharper executive summary');
    expect(useChatStore.getState().pendingRetryPrompt).toBeNull();
    expect(submitPromptMock).not.toHaveBeenCalled();

    view.unmount();
  });

  it('auto-submits a pending clarification prompt against the active document scope', async () => {
    const activeDocument = seedActiveDocument();
    submitPromptMock.mockImplementation(async (input, services) => {
      services.addMessage({
        id: 'user-1',
        role: 'user',
        content: input.prompt,
        timestamp: 1,
        documentId: input.activeDocument?.id,
        scope: 'document',
      });

      return {
        runId: 'run-1',
        status: 'completed',
        intent: {
          artifactType: 'document',
          operation: 'edit',
          scope: 'document',
          targetDocumentId: activeDocument.id,
          targetSelectors: [],
          allowFullRegeneration: false,
          confidence: 0.99,
          needsClarification: false,
          reason: 'active document type is authoritative',
        },
        outputs: {
          envelope: {
            artifactType: 'document',
            targetSummary: ['Working Draft'],
            changedTargets: [{ documentId: activeDocument.id, action: 'updated' }],
            validation: { passed: true, summary: 'ok' },
            document: {
              artifactType: 'document',
              title: activeDocument.title,
            },
          },
        },
        assistantMessage: { content: 'Updated document.' },
        validation: { passed: true, summary: 'ok' },
        warnings: [],
        changedTargets: [{ documentId: activeDocument.id, action: 'updated' }],
        structuredStatus: { title: 'Done', detail: 'Done' },
      };
    });

    const view = renderChatBar();

    act(() => {
      useChatStore.getState().setPendingAutoSubmitPrompt('Tighten this document into a one-page brief');
    });
    await flushEffects();

    expect(useChatStore.getState().pendingAutoSubmitPrompt).toBeNull();
    expect(submitPromptMock).toHaveBeenCalledTimes(1);
    const firstCall = submitPromptMock.mock.calls[0]?.[0];
    expect(firstCall).toBeDefined();
    expect(firstCall).toMatchObject({
      prompt: 'Tighten this document into a one-page brief',
      activeDocument,
      allowClarification: false,
    });
    expect(useChatStore.getState().messages[0]).toMatchObject({
      role: 'user',
      content: 'Tighten this document into a one-page brief',
      documentId: activeDocument.id,
      scope: 'document',
    });

    view.unmount();
  });

  it('aborts the active generation when cancel is clicked', async () => {
    const abort = vi.fn();
    seedActiveDocument();
    submitPromptMock.mockImplementation(async (_input, services) => {
      services.abortControllerRef.current = {
        abort,
        signal: new AbortController().signal,
      } as AbortController;
      services.setStatus({ state: 'generating', startedAt: Date.now(), step: 'Working…' });

      await new Promise<void>(() => {});
    });

    const view = renderChatBar();
    setTextareaValue(view.container, 'Revise this document');

    clickButton(view.container, 'Send message');
    await flushEffects();

    expect(view.container.querySelector('[aria-label="Cancel generation"]')).not.toBeNull();

    clickButton(view.container, 'Cancel generation');

    expect(abort).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  it('shows immediate preparing state while a run request is being built', async () => {
    seedActiveDocument();
    let resolveSubmit: (() => void) | undefined;
    submitPromptMock.mockImplementation(async () => new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    }));

    const view = renderChatBar();
    setTextareaValue(view.container, 'Revise this document');

    clickButton(view.container, 'Send message');
    await flushEffects();

    expect(useChatStore.getState().status).toMatchObject({
      state: 'generating',
      step: 'Preparing request...',
    });
    expect(view.container.textContent).toContain('Step 1 of 1: Preparing request');
    expect(view.container.querySelector('[aria-label="Cancel generation"]')).not.toBeNull();

    act(() => {
      resolveSubmit?.();
    });
    await flushEffects();
    view.unmount();
  });

  it('restores the prompt and shows an error when generation fails before a run starts', async () => {
    seedActiveDocument();
    submitPromptMock.mockRejectedValueOnce(new Error('Context assembly failed'));

    const view = renderChatBar();
    setTextareaValue(view.container, 'Revise this document');

    clickButton(view.container, 'Send message');
    await flushEffects();

    expect(useChatStore.getState().status).toMatchObject({
      state: 'error',
      message: 'Generation could not start: Context assembly failed',
    });
    expect(getTextarea(view.container).value).toBe('Revise this document');
    expect(view.container.textContent).toContain('Generation could not start: Context assembly failed');
    const messages = useChatStore.getState().messages;
    expect(messages[messages.length - 1]).toMatchObject({
      role: 'assistant',
      content: 'Generation could not start: Context assembly failed',
      documentId: 'doc-1',
      scope: 'document',
    });

    view.unmount();
  });

  it('keeps output mode, document style, and run history behind advanced options', () => {
    seedActiveDocument();
    const view = renderChatBar();

    expect(view.container.textContent).not.toContain('Auto mode');
    expect(view.container.textContent).not.toContain('Runs');

    clickButton(view.container, 'Advanced options');

    expect(view.container.textContent).toContain('Auto mode');
    expect(view.container.querySelector('[aria-label="Choose output mode"]')).not.toBeNull();
    expect(view.container.querySelector('[aria-label="Choose document style"]')).not.toBeNull();
    expect(view.container.querySelector('[aria-label="Open recent runs"]')).not.toBeNull();

    view.unmount();
  });

  it('shows guided edit chips for pack-backed editorial stage presentations', () => {
    seedPackBackedPresentation();
    const view = renderChatBar();

    expect(view.container.querySelector('[aria-label="Guided deck edits"]')).not.toBeNull();
    expect(getButton(view.container, 'Use guided edit: change slide title').textContent).toContain('Title');
    expect(getButton(view.container, 'Use guided edit: add slide').textContent).toContain('Add slide');
    expect(getButton(view.container, 'Use guided edit: restyle deck').textContent).toContain('Restyle');

    view.unmount();
  });

  it('does not show guided edit chips for non-pack docs or plain presentations', () => {
    seedActiveDocument();
    const documentView = renderChatBar();

    expect(documentView.container.querySelector('[aria-label="Guided deck edits"]')).toBeNull();
    documentView.unmount();

    resetStores();
    seedActiveDocument({
      type: 'presentation',
      contentHtml: '<section><h1>Plain deck</h1></section>',
      slideCount: 1,
    });
    const plainPresentationView = renderChatBar();

    expect(plainPresentationView.container.querySelector('[aria-label="Guided deck edits"]')).toBeNull();
    plainPresentationView.unmount();
  });

  it('hides the legacy project-colour action for pack-backed presentations', () => {
    seedPackBackedPresentation();
    useProjectStore.getState().setProject({
      ...useProjectStore.getState().project,
      colorTheme: {
        background: '#ffffff',
        primary: '#111827',
        accent: '#2563eb',
      },
    });
    const packView = renderChatBar();

    expect(packView.container.querySelector('[aria-label="Apply project colours to active deck"]')).toBeNull();
    packView.unmount();

    resetStores();
    seedActiveDocument({
      type: 'presentation',
      contentHtml: '<section><h1>Plain deck</h1></section>',
      slideCount: 1,
    });
    useProjectStore.getState().setProject({
      ...useProjectStore.getState().project,
      colorTheme: {
        background: '#ffffff',
        primary: '#111827',
        accent: '#2563eb',
      },
    });
    const plainView = renderChatBar();

    expect(plainView.container.querySelector('[aria-label="Apply project colours to active deck"]')).not.toBeNull();
    plainView.unmount();
  });

  it('populates and focuses the textarea when a guided edit chip is clicked', async () => {
    seedPackBackedPresentation();
    const view = renderChatBar();

    clickButton(view.container, 'Use guided edit: change slide title');
    await flushEffects();

    expect(getTextarea(view.container).value).toBe('Change slide 1 title to "..."');
    expect(document.activeElement).toBe(getTextarea(view.container));
    expect(submitPromptMock).not.toHaveBeenCalled();

    view.unmount();
  });

  it('shows unsupported guided edit info without populating an impossible command', () => {
    seedPackBackedPresentation();
    const view = renderChatBar();

    clickButton(view.container, 'Show unsupported guided edit info');

    expect(view.container.textContent).toContain('Reorder, delete, and media swap edits are not supported yet.');
    expect(getTextarea(view.container).value).toBe('');
    expect(submitPromptMock).not.toHaveBeenCalled();

    view.unmount();
  });

  it('shows explicit step and item counts during generation', async () => {
    const view = renderChatBar();

    act(() => {
      useChatStore.getState().setStatus({
        state: 'generating',
        startedAt: Date.now(),
        step: 'Creating slides',
        currentStep: 2,
        totalSteps: 5,
        currentItem: 3,
        totalItems: 6,
        itemLabel: 'slide',
      });
    });
    await flushEffects();

    expect(view.container.textContent).toContain('Step 2 of 5: Creating slides · Slide 3 of 6');

    view.unmount();
  });

  it('shows the age of the last progress update when generation stalls', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T12:00:00Z'));
    const view = renderChatBar();

    act(() => {
      useChatStore.getState().setStatus({
        state: 'generating',
        startedAt: Date.now(),
        step: 'Creating slides',
        currentStep: 2,
        totalSteps: 5,
      });
    });
    await flushEffects();

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(view.container.textContent).toContain('still working (last update 15s ago)');

    view.unmount();
  });
});
