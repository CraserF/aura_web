import type { ProjectData } from '@/types/project';

import type { SpreadsheetExecutionSummary, SpreadsheetPlan } from '@/services/spreadsheet/plans';

export interface SpreadsheetAugmentationSummaryInput {
  project: ProjectData;
  spreadsheetDocumentId: string;
  affectedSheetIds: string[];
  affectedTableNames?: string[];
  refreshedSheetIds?: string[];
  plan: SpreadsheetPlan;
}

export function summarizeSpreadsheetAugmentationImpact(
  input: SpreadsheetAugmentationSummaryInput,
): SpreadsheetExecutionSummary {
  const { project, spreadsheetDocumentId, affectedSheetIds, affectedTableNames = [], refreshedSheetIds, plan } = input;
  const impactedLinkedRefs = project.documents.reduce((count, document) => (
    count + (document.linkedTableRefs ?? []).filter((ref) => (
      ref.spreadsheetDocId === spreadsheetDocumentId && affectedSheetIds.includes(ref.sheetId)
    )).length
  ), 0);
  const chartDependents = project.documents.reduce((count, document) => (
    count + Object.values(document.chartSpecs ?? {}).filter((spec) => (
      spec.dataSource?.kind === 'table-ref' && affectedTableNames.includes(spec.dataSource?.refId ?? '')
    )).length
  ), 0);
  const summaryArtifacts = project.documents.filter((document) => document.starterRef?.artifactKey === 'project-summary').length;

  const downstreamAugmentationImpact = [
    impactedLinkedRefs > 0
      ? `${impactedLinkedRefs} linked table reference(s) now point at updated spreadsheet data.`
      : 'No linked-table dependents were affected.',
    chartDependents > 0
      ? `${chartDependents} chart artifact(s) depend on the changed spreadsheet tables.`
      : 'No chart dependents were detected for the changed spreadsheet tables.',
    summaryArtifacts > 0
      ? `${summaryArtifacts} managed project summary artifact(s) may need refresh if spreadsheet metrics changed.`
      : 'No managed project summary artifacts depend on this workbook yet.',
  ];

  return {
    planKind: plan.kind,
    targetSummary: plan.targets.map((target) => (
      [target.sheetName, target.columnName].filter(Boolean).join(' → ')
    )).filter(Boolean),
    downstreamAugmentationImpact,
    ...(refreshedSheetIds?.length ? { refreshedSheetIds } : {}),
  };
}
