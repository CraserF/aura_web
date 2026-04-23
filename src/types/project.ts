// ============================================
// Aura — Project & Document Types
// ============================================

import type { ChatMessage } from './index';
import type { ChartSpec } from '@/services/charts';
import type { MemoryDirectory } from '@/services/memory';

/** Document type within a project */
export type DocumentType = 'document' | 'presentation' | 'spreadsheet';

export interface WorkbookMeta {
  sheets: SheetMeta[];
  activeSheetIndex: number;
}

export interface SheetMeta {
  id: string;
  name: string;
  tableName: string;
  schema: ColumnSchema[];
  frozenRows: number;
  frozenCols: number;
  columnWidths: Record<string, number>;
  formulas: FormulaEntry[];
  sortState?: SortState;
  filterState?: FilterState;
}

export interface ColumnSchema {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  format?: string;
}

export interface FormulaEntry {
  id: string;
  column: string;
  expression: string;
  dependsOn: string[];
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  query?: string;
}

/** A reference from a document to a spreadsheet sheet for live table embedding */
export interface LinkedTableRef {
  /** The document ID of the spreadsheet document */
  spreadsheetDocId: string;
  /** The sheet ID within the workbook */
  sheetId: string;
  /** Optional limit on rows to show */
  limit?: number;
  /** Optional explicit column list to display */
  columns?: string[];
}

/** Visibility level for a project */
export type ProjectVisibility = 'private' | 'public';

export interface ProjectRulesDocument {
  markdown: string;
  updatedAt: number;
}

export interface ContextPolicyOverride {
  includeProjectChat?: boolean;
  includeMemory?: boolean;
  includeAttachments?: boolean;
  includeRelatedDocuments?: boolean;
  maxChatMessages?: number;
  maxMemoryTokens?: number;
  maxRelatedDocuments?: number;
  maxAttachmentChars?: number;
}

export interface ContextPolicy extends ContextPolicyOverride {
  version: number;
  artifactOverrides?: Partial<Record<DocumentType, ContextPolicyOverride>>;
}

export interface WorkflowPreset {
  id: string;
  name: string;
  artifactType?: DocumentType;
  rulesAppendix?: string;
  contextPolicyOverrides?: ContextPolicyOverride;
  documentStylePreset?: string;
  enabled: boolean;
}

export interface WorkflowPresetCollection {
  version: number;
  presets: WorkflowPreset[];
  defaultPresetByArtifact: Partial<Record<DocumentType, string>>;
}

/** A single document in a project */
export interface ProjectDocument {
  id: string;
  title: string;
  type: DocumentType;
  /** For 'document': full sanitized HTML body. For 'presentation': <section> HTML. */
  contentHtml: string;
  /** Internal markdown source for documents; used for rich editing and export. */
  sourceMarkdown?: string;
  /** CSS theme (primarily for presentations) */
  themeCss: string;
  /** Slide count (only meaningful for presentations) */
  slideCount: number;
  /** Short description shown in sidebar */
  description?: string;
  /** Parent document ID for nesting */
  parentId?: string;
  /** Whether paginated A4-style view is enabled (documents only) */
  pagesEnabled?: boolean;
  /** Chart specifications keyed by chart ID */
  chartSpecs?: Record<string, ChartSpec>;
  /** Spreadsheet workbook metadata (for spreadsheet docs) */
  workbook?: WorkbookMeta;
  /** References to spreadsheet sheets embedded as linked tables in this document */
  linkedTableRefs?: LinkedTableRef[];
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
  memoryTree?: MemoryDirectory;
  projectRules?: ProjectRulesDocument;
  contextPolicy?: ContextPolicy;
  workflowPresets?: WorkflowPresetCollection;
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
  activeDocumentId?: string | null;
  visibility?: ProjectVisibility;
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
