import { create } from 'zustand';
import type { ChatMessage, GenerationStatus } from '@/types';

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
}));
