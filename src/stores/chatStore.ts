import { create } from 'zustand';
import type { ChatMessage, GenerationStatus } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  status: GenerationStatus;
  streamingContent: string;

  addMessage: (message: ChatMessage) => void;
  setStatus: (status: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  clearMessages: () => void;
  setMessages: (messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  status: { state: 'idle' },
  streamingContent: '',

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
}));
