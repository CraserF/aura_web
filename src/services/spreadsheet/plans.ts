import type {
  QueryViewAggregate,
  QueryViewFilter,
  SheetMeta,
  SortState,
} from '@/types/project';

import type { SheetAction } from '@/services/spreadsheet/actions';
import type { SpreadsheetStarterKind, SpreadsheetStarterPlan } from '@/services/spreadsheet/starter';
import type { ValidationIssue } from '@/services/validation/types';

export type SpreadsheetIntentKind =
  | 'sheet-action'
  | 'create-workbook'
  | 'create-formula-column'
  | 'create-query-view'
  | 'create-chart-pack'
  | 'summarize-sheet';

export interface SpreadsheetPlanTarget {
  documentId?: string;
  sheetId?: string;
  sheetName?: string;
  columnName?: string;
  range?: string;
  sourceSheetId?: string;
}

export interface SpreadsheetFormulaPlan {
  outputColumnName: string;
  expression: string;
  dependsOn: string[];
  expressionLabel: string;
}

export interface SpreadsheetQueryViewPlan {
  sourceSheetId: string;
  sourceSheetName: string;
  outputSheetName: string;
  selectColumns: string[];
  filters: QueryViewFilter[];
  groupBy?: string[];
  aggregates?: QueryViewAggregate[];
  sort?: SortState;
}

export interface SpreadsheetExecutionSummary {
  planKind: SpreadsheetIntentKind;
  targetSummary: string[];
  downstreamAugmentationImpact: string[];
  refreshedSheetIds?: string[];
}

export interface SpreadsheetPlan {
  kind: SpreadsheetIntentKind;
  targets: SpreadsheetPlanTarget[];
  requiresClarification: boolean;
  clarification?: string;
  canAugmentProject: boolean;
  action?: SheetAction;
  starterPlan?: SpreadsheetStarterPlan;
  starterKind?: SpreadsheetStarterKind;
  formula?: SpreadsheetFormulaPlan;
  queryView?: SpreadsheetQueryViewPlan;
  chartTarget?: {
    sheetId: string;
    sheetName: string;
  };
  summaryTarget?: {
    sheetId: string;
    sheetName: string;
  };
}

export interface SpreadsheetValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  clarification?: string;
}

export interface SpreadsheetExecutionContext {
  workbook: {
    sheets: SheetMeta[];
    activeSheetIndex: number;
  } | null;
  activeDocumentId?: string | null;
}
