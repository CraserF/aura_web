import { create } from 'zustand';
import type { ChatMessage, GenerationStatus } from '@/types';
import {
  createDefaultContextSelectionState,
  type ContextCompactionMode,
  type ContextScopeMode,
  type ContextSelectionState,
  type PinnedSheetRef,
} from '@/services/context/types';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface ChatState {
  messages: ChatMessage[];
  status: GenerationStatus;
  streamingContent: string;
  showAllMessages: boolean;
  applyToAllDocuments: boolean;
  /** Running estimate of tokens consumed by the conversation (length / 4 heuristic). */
  estimatedTokens: number;
  /**
   * When set, ChatBar will pick up this prompt and re-submit it as a retry.
   * Cleared immediately after ChatBar reads it.
   */
  pendingRetryPrompt: string | null;
  /**
   * When set, ChatBar will immediately trigger generation with this prompt
   * (bypassing the input textarea). Used by the clarifying-question UI.
   * Cleared immediately after ChatBar reads it.
   */
  pendingAutoSubmitPrompt: string | null;
  contextSelection: ContextSelectionState;

  addMessage: (message: ChatMessage) => void;
  setStatus: (status: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  clearMessages: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  setShowAllMessages: (showAllMessages: boolean) => void;
  setApplyToAllDocuments: (applyToAllDocuments: boolean) => void;
  resetTokens: () => void;
  /** True when estimated tokens exceed 80 % of a 100 K context window. */
  isContextLong: () => boolean;
  setPendingRetryPrompt: (prompt: string | null) => void;
  setPendingAutoSubmitPrompt: (prompt: string | null) => void;
  setContextScopeMode: (scopeMode: ContextScopeMode) => void;
  setCompactionMode: (compactionMode: ContextCompactionMode) => void;
  setRecentMessageCount: (recentMessageCount: number) => void;
  togglePinnedDocumentId: (documentId: string) => void;
  togglePinnedMemoryPath: (path: string) => void;
  togglePinnedSheetRef: (sheetRef: PinnedSheetRef) => void;
  toggleExcludedSourceId: (sourceId: string) => void;
  clearExcludedSourceId: (sourceId: string) => void;
  resetContextSelection: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  status: { state: 'idle' },
  streamingContent: '',
  showAllMessages: false,
  applyToAllDocuments: false,
  estimatedTokens: 0,
  pendingRetryPrompt: null,
  pendingAutoSubmitPrompt: null,
  contextSelection: createDefaultContextSelectionState(),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      estimatedTokens: state.estimatedTokens + estimateTokens(message.content ?? ''),
    })),

  setStatus: (status) => set({ status }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (chunk) =>
    set((state) => ({
      streamingContent: state.streamingContent + chunk,
    })),

  clearMessages: () => set({ messages: [], estimatedTokens: 0 }),

  setMessages: (messages) => set({ messages }),

  setShowAllMessages: (showAllMessages) => set({ showAllMessages }),

  setApplyToAllDocuments: (applyToAllDocuments) => set({ applyToAllDocuments }),

  resetTokens: () => set({ estimatedTokens: 0 }),

  isContextLong: () => get().estimatedTokens > 80_000,

  setPendingRetryPrompt: (prompt) => set({ pendingRetryPrompt: prompt }),

  setPendingAutoSubmitPrompt: (prompt) => set({ pendingAutoSubmitPrompt: prompt }),

  setContextScopeMode: (scopeMode) =>
    set((state) => ({
      contextSelection: { ...state.contextSelection, scopeMode },
    })),

  setCompactionMode: (compactionMode) =>
    set((state) => ({
      contextSelection: { ...state.contextSelection, compactionMode },
    })),

  setRecentMessageCount: (recentMessageCount) =>
    set((state) => ({
      contextSelection: {
        ...state.contextSelection,
        recentMessageCount: Math.max(1, recentMessageCount),
      },
    })),

  togglePinnedDocumentId: (documentId) =>
    set((state) => {
      const pinnedDocumentIds = state.contextSelection.pinnedDocumentIds.includes(documentId)
        ? state.contextSelection.pinnedDocumentIds.filter((id) => id !== documentId)
        : [...state.contextSelection.pinnedDocumentIds, documentId];
      return {
        contextSelection: {
          ...state.contextSelection,
          pinnedDocumentIds,
          excludedSourceIds: state.contextSelection.excludedSourceIds.filter(
            (id) => id !== `artifact:related:${documentId}`,
          ),
        },
      };
    }),

  togglePinnedMemoryPath: (path) =>
    set((state) => {
      const pinnedMemoryPaths = state.contextSelection.pinnedMemoryPaths.includes(path)
        ? state.contextSelection.pinnedMemoryPaths.filter((value) => value !== path)
        : [...state.contextSelection.pinnedMemoryPaths, path];
      return {
        contextSelection: {
          ...state.contextSelection,
          pinnedMemoryPaths,
          excludedSourceIds: state.contextSelection.excludedSourceIds.filter(
            (id) => id !== `memory:dir:${path}`,
          ),
        },
      };
    }),

  togglePinnedSheetRef: (sheetRef) =>
    set((state) => {
      const key = `${sheetRef.documentId}:${sheetRef.sheetId}`;
      const pinnedSheetRefs = state.contextSelection.pinnedSheetRefs.some(
        (value) => `${value.documentId}:${value.sheetId}` === key,
      )
        ? state.contextSelection.pinnedSheetRefs.filter(
            (value) => `${value.documentId}:${value.sheetId}` !== key,
          )
        : [...state.contextSelection.pinnedSheetRefs, sheetRef];
      return {
        contextSelection: {
          ...state.contextSelection,
          pinnedSheetRefs,
          excludedSourceIds: state.contextSelection.excludedSourceIds.filter(
            (id) => id !== `data:sheet:${sheetRef.documentId}:${sheetRef.sheetId}`,
          ),
        },
      };
    }),

  toggleExcludedSourceId: (sourceId) =>
    set((state) => ({
      contextSelection: {
        ...state.contextSelection,
        excludedSourceIds: state.contextSelection.excludedSourceIds.includes(sourceId)
          ? state.contextSelection.excludedSourceIds.filter((id) => id !== sourceId)
          : [...state.contextSelection.excludedSourceIds, sourceId],
        pinnedDocumentIds: sourceId.startsWith('artifact:related:')
          ? state.contextSelection.pinnedDocumentIds.filter(
              (id) => id !== sourceId.replace('artifact:related:', ''),
            )
          : state.contextSelection.pinnedDocumentIds,
        pinnedMemoryPaths: sourceId.startsWith('memory:dir:')
          ? state.contextSelection.pinnedMemoryPaths.filter(
              (path) => path !== sourceId.replace('memory:dir:', ''),
            )
          : state.contextSelection.pinnedMemoryPaths,
        pinnedSheetRefs: sourceId.startsWith('data:sheet:')
          ? state.contextSelection.pinnedSheetRefs.filter(
              (value) => `data:sheet:${value.documentId}:${value.sheetId}` !== sourceId,
            )
          : state.contextSelection.pinnedSheetRefs,
      },
    })),

  clearExcludedSourceId: (sourceId) =>
    set((state) => ({
      contextSelection: {
        ...state.contextSelection,
        excludedSourceIds: state.contextSelection.excludedSourceIds.filter((id) => id !== sourceId),
      },
    })),

  resetContextSelection: () => set({ contextSelection: createDefaultContextSelectionState() }),
}));
