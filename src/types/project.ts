// ============================================
// Aura — Project & Document Types
// ============================================

import type { ChatMessage } from './index';

/** Document type within a project */
export type DocumentType = 'document' | 'presentation';

/** Visibility level for a project */
export type ProjectVisibility = 'private' | 'public';

/** A single document in a project */
export interface ProjectDocument {
  id: string;
  title: string;
  type: DocumentType;
  /** For 'document': full sanitized HTML body. For 'presentation': <section> HTML. */
  contentHtml: string;
  /** CSS theme (primarily for presentations) */
  themeCss: string;
  /** Slide count (only meaningful for presentations) */
  slideCount: number;
  /** Short description shown in sidebar */
  description?: string;
  createdAt: number;
  updatedAt: number;
  order: number;
}

/** Project-level sections for the hosting structure */
export interface ProjectSections {
  /** Document IDs in drafts */
  drafts: string[];
  /** Document IDs in main/public */
  main: string[];
  /** Suggestion document IDs */
  suggestions: string[];
  /** Issue document IDs */
  issues: string[];
}

/** The full project data stored in memory and persisted */
export interface ProjectData {
  id: string;
  title: string;
  description?: string;
  visibility: ProjectVisibility;
  documents: ProjectDocument[];
  activeDocumentId: string | null;
  chatHistory: ChatMessage[];
  sections: ProjectSections;
  createdAt: number;
  updatedAt: number;
}

/** Manifest inside a project .aura zip */
export interface ProjectManifest {
  version: string;
  schemaType: 'project';
  id: string;
  title: string;
  description?: string;
  documentCount: number;
  visibility: ProjectVisibility;
  createdAt: number;
  updatedAt: number;
}

/** A version history entry (backed by isomorphic-git) */
export interface VersionEntry {
  hash: string;
  message: string;
  timestamp: number;
  author: string;
}
