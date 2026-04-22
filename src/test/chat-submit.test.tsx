import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const handlerMocks = vi.hoisted(() => ({
  document: vi.fn(),
  presentation: vi.fn(),
  spreadsheet: vi.fn(),
}));

vi.mock('@/components/chat/handlers/documentHandler', () => ({
  handleDocumentWorkflow: handlerMocks.document,
}));

vi.mock('@/components/chat/handlers/presentationHandler', () => ({
  handlePresentationWorkflow: handlerMocks.presentation,
}));

vi.mock('@/components/chat/handlers/spreadsheetHandler', () => ({
  handleSpreadsheetWorkflow: handlerMocks.spreadsheet,
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

describe('ChatBar submission paths', () => {
  beforeEach(() => {
    resetStores();
    handlerMocks.document.mockReset();
    handlerMocks.presentation.mockReset();
    handlerMocks.spreadsheet.mockReset();
  });

  afterEach(() => {
    useChatStore.getState().setStatus({ state: 'idle' });
  });

  it('loads retry prompts back into the composer without auto-submitting', async () => {
    const view = renderChatBar();

    act(() => {
      useChatStore.getState().setPendingRetryPrompt('Try a sharper executive summary');
    });
    await flushEffects();

    expect(getTextarea(view.container).value).toBe('Try a sharper executive summary');
    expect(useChatStore.getState().pendingRetryPrompt).toBeNull();
    expect(handlerMocks.document).not.toHaveBeenCalled();

    view.unmount();
  });

  it('auto-submits a pending clarification prompt against the active document scope', async () => {
    const activeDocument = seedActiveDocument();
    handlerMocks.document.mockResolvedValue(undefined);

    const view = renderChatBar();

    act(() => {
      useChatStore.getState().setPendingAutoSubmitPrompt('Tighten this document into a one-page brief');
    });
    await flushEffects();

    expect(useChatStore.getState().pendingAutoSubmitPrompt).toBeNull();
    expect(handlerMocks.document).toHaveBeenCalledTimes(1);
    expect(handlerMocks.presentation).not.toHaveBeenCalled();
    expect(handlerMocks.spreadsheet).not.toHaveBeenCalled();
    const firstCall = handlerMocks.document.mock.calls[0]?.[0];
    expect(firstCall).toBeDefined();
    expect(firstCall).toMatchObject({
      prompt: 'Tighten this document into a one-page brief',
      activeDocument,
      scopedDocumentId: activeDocument.id,
      messageScope: 'document',
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
    handlerMocks.document.mockImplementation(async (ctx) => {
      ctx.abortControllerRef.current = {
        abort,
        signal: new AbortController().signal,
      } as AbortController;
      ctx.setStatus({ state: 'generating', startedAt: Date.now(), step: 'Working…' });

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
});
