import { create } from 'zustand';
import type { ProjectData, ProjectDocument } from '@/types/project';
import type { ChatMessage } from '@/types';

function newProject(): ProjectData {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled Project',
    description: '',
    visibility: 'private',
    documents: [],
    activeDocumentId: null,
    chatHistory: [],
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

interface ProjectState {
  project: ProjectData;

  // Selectors
  activeDocument: () => ProjectDocument | null;

  // Project-level
  setProject: (project: ProjectData) => void;
  setProjectTitle: (title: string) => void;
  setProjectDescription: (description: string) => void;
  setChatHistory: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  reset: () => void;

  // Document management
  setActiveDocumentId: (id: string | null) => void;
  addDocument: (doc: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;
  removeDocument: (id: string) => void;
  reorderDocuments: (orderedIds: string[]) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: newProject(),

  activeDocument: () => {
    const { project } = get();
    if (!project.activeDocumentId) return null;
    return project.documents.find((d) => d.id === project.activeDocumentId) ?? null;
  },

  setProject: (project) =>
    set(() => {
      const hasActive =
        !!project.activeDocumentId &&
        project.documents.some((d) => d.id === project.activeDocumentId);
      const activeDocumentId = hasActive
        ? project.activeDocumentId
        : (project.documents[0]?.id ?? null);

      return {
        project: {
          ...project,
          activeDocumentId,
        },
      };
    }),

  setProjectTitle: (title) =>
    set((s) => ({ project: { ...s.project, title, updatedAt: Date.now() } })),

  setProjectDescription: (description) =>
    set((s) => ({ project: { ...s.project, description, updatedAt: Date.now() } })),

  setChatHistory: (chatHistory) =>
    set((s) => ({ project: { ...s.project, chatHistory, updatedAt: Date.now() } })),

  addChatMessage: (message) =>
    set((s) => ({
      project: {
        ...s.project,
        chatHistory: [...s.project.chatHistory, message],
        updatedAt: Date.now(),
      },
    })),

  reset: () => set({ project: newProject() }),

  setActiveDocumentId: (id) =>
    set((s) => ({ project: { ...s.project, activeDocumentId: id } })),

  addDocument: (doc) =>
    set((s) => ({
      project: {
        ...s.project,
        documents: [...s.project.documents, doc],
        activeDocumentId: doc.id,
        updatedAt: Date.now(),
      },
    })),

  updateDocument: (id, updates) =>
    set((s) => ({
      project: {
        ...s.project,
        documents: s.project.documents.map((d) =>
          d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d,
        ),
        updatedAt: Date.now(),
      },
    })),

  removeDocument: (id) =>
    set((s) => {
      const remaining = s.project.documents.filter((d) => d.id !== id);
      const newActive =
        s.project.activeDocumentId === id
          ? (remaining[0]?.id ?? null)
          : s.project.activeDocumentId;
      return {
        project: {
          ...s.project,
          documents: remaining,
          activeDocumentId: newActive,
          updatedAt: Date.now(),
        },
      };
    }),

  reorderDocuments: (orderedIds) =>
    set((s) => {
      const docMap = new Map(s.project.documents.map((d) => [d.id, d]));
      const reordered = orderedIds
        .map((id, i) => {
          const d = docMap.get(id);
          return d ? { ...d, order: i } : null;
        })
        .filter(Boolean) as ProjectDocument[];
      return {
        project: { ...s.project, documents: reordered, updatedAt: Date.now() },
      };
    }),
}));
