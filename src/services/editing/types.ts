import type { DocumentType } from '@/types/project';

export type EditStrategy =
  | 'search-replace'
  | 'block-replace'
  | 'style-token'
  | 'sheet-action'
  | 'full-regenerate';

export type TargetSelectorType =
  | 'current-slide'
  | 'slide-number'
  | 'slide-title'
  | 'deck-style'
  | 'document-block'
  | 'heading-section'
  | 'paragraph-cluster'
  | 'callout-block'
  | 'table-block'
  | 'chart-block'
  | 'metadata-band'
  | 'active-sheet'
  | 'sheet-name'
  | 'column'
  | 'range'
  | 'formula-column'
  | 'filter-state'
  | 'sort-state';

export interface TargetSelector {
  type: TargetSelectorType;
  value?: string;
  label?: string;
}

export interface ResolvedTarget {
  selector: TargetSelector;
  artifactType: DocumentType;
  label: string;
  blockId?: string;
  sheetId?: string;
  slideIndex?: number;
  matchedText?: string;
}

export interface PatchAttempt {
  strategy: EditStrategy;
  success: boolean;
  targetSummary: string;
  dryRunFailures: string[];
}

export interface EditFallbackDecision {
  fallbackUsed: boolean;
  attemptedStrategies: EditStrategy[];
  finalStrategy: EditStrategy;
  reason: string;
}

export interface EditingTelemetry {
  strategyUsed: EditStrategy;
  fallbackUsed: boolean;
  targetSummary: string[];
  dryRunFailures: string[];
}

// TODO(phase-4): Replace broad selector/value usage with tighter artifact-specific
// contracts once the shared editing path is fully wired into all workflows.
