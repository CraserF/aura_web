import { create } from 'zustand';
import type { ChatMessage, GenerationStatus } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  status: GenerationStatus;
  streamingContent: string;
  showAllMessages: boolean;
  applyToAllDocuments: boolean;

  addMessage: (message: ChatMessage) => void;
  setStatus: (status: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  clearMessages: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  setShowAllMessages: (showAllMessages: boolean) => void;
  setApplyToAllDocuments: (applyToAllDocuments: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  status: { state: 'idle' },
  streamingContent: '',
  showAllMessages: false,
  applyToAllDocuments: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setStatus: (status) => set({ status }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (chunk) =>
    set((state) => ({
      streamingContent: state.streamingContent + chunk,
    })),

  clearMessages: () => set({ messages: [] }),

  setMessages: (messages) => set({ messages }),

  setShowAllMessages: (showAllMessages) => set({ showAllMessages }),

  setApplyToAllDocuments: (applyToAllDocuments) => set({ applyToAllDocuments }),
}));
