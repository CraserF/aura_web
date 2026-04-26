import type { ProjectData, ProjectDocument } from '@/types/project';

import type { RunResult, RunResultChangedTarget, RunResultOutputs, RunResultValidationSummary, RunResultWarning } from '@/services/contracts/runResult';
import type { RunOutputsEnvelope } from '@/services/contracts/outputEnvelope';
import type { RunRequest } from '@/services/runs/types';
import type { SpreadsheetExecutionSummary, SpreadsheetPlan } from '@/services/spreadsheet/plans';
import type { ValidationResult } from '@/services/validation/types';
import type { PredictedChange, RunExplainResult } from '@/services/executionSpec/types';
import type { PolicyCondition } from '@/services/policy/types';

import { resolveTargets } from '@/services/editing/resolveTargets';
import { getCompressionBudget } from '@/services/context/compressionBudget';
import { evaluatePolicy } from '@/services/policy/engine';
import { refreshProjectDependencies } from '@/services/projectGraph/refresh';
import { buildProjectGraph } from '@/services/projectGraph/build';
import { validateProjectGraph } from '@/services/projectGraph/validate';
import { summarizeSpreadsheetAugmentationImpact } from '@/services/ai/workflow/agents/spreadsheet-augmenter';
import { planSpreadsheetWorkflow } from '@/services/ai/workflow/agents/spreadsheet-planner';
import { validateSpreadsheetPlan } from '@/services/ai/workflow/agents/spreadsheet-validator';
import { validateArtifactAgainstProfile } from '@/services/validation';
import { summarizeValidationResult, getDefaultValidationProfileId } from '@/services/validation/profiles';
import { validateProjectAgainstProfile } from '@/services/validation/projectValidation';

const PROJECT_SUMMARY_ARTIFACT_KEY = 'project-summary';

function isDefaultSheet(document: ProjectDocument | null): boolean {
  const sheet = document?.workbook?.sheets[document.workbook?.activeSheetIndex ?? 0];
  if (!sheet) return false;
  return (
    sheet.name === 'Sheet 1'
    && sheet.schema.length === 3
    && sheet.schema.map((column) => column.name).join(',') === 'A,B,C'
    && sheet.formulas.length === 0
    && !sheet.sortState
    && !sheet.filterState
  );
}

function buildTargetSummary(runRequest: RunRequest): string[] {
  const activeDocument = runRequest.activeArtifacts.activeDocument;
  const resolvedTargets = activeDocument
    ? resolveTargets({
        prompt: runRequest.context.conversation.prompt,
        intent: runRequest.intent,
        activeDocument,
      })
    : [];

  if (resolvedTargets.length > 0) {
    return resolvedTargets.map((target) => target.label);
  }

  if (runRequest.intent.targetSelectors.length > 0) {
    return runRequest.intent.targetSelectors.map((selector) => selector.label ?? selector.type);
  }

  if (activeDocument?.title) {
    return [activeDocument.title];
  }

  return ['project scope'];
}

function buildDocumentPredictedChanges(runRequest: RunRequest, targetSummary: string[]): PredictedChange[] {
  const activeDocument = runRequest.activeArtifacts.activeDocument;
  const action = activeDocument?.type === runRequest.intent.artifactType ? 'update' : 'create';
  return [{
    documentId: activeDocument?.type === runRequest.intent.artifactType ? activeDocument.id : undefined,
    artifactType: runRequest.intent.artifactType,
    action,
    summary: action === 'create'
      ? `Would create a ${runRequest.intent.artifactType} from the current prompt.`
      : `Would ${runRequest.intent.operation === 'edit' ? 'update' : 'refine'} ${targetSummary.join(', ')}.`,
  }];
}

function mapPredictedChangesToTargets(predictedChanges: PredictedChange[]): RunResultChangedTarget[] {
  return predictedChanges.map((change) => ({
    documentId: change.documentId,
    sheetId: change.sheetId,
    action: change.action === 'create' ? 'created' : change.action === 'update' ? 'updated' : 'none',
  }));
}

function buildValidationSummary(result: ValidationResult | undefined, fallback: string): RunResultValidationSummary {
  if (!result) {
    return {
      passed: true,
      summary: fallback,
    };
  }

  return {
    passed: result.passed,
    summary: summarizeValidationResult(result),
    profileId: result.profileId,
    score: result.score,
    blockingIssues: result.blockingIssues,
    warnings: result.warnings,
  };
}

function buildContextWarnings(runRequest: RunRequest): RunResultWarning[] {
  return [
    ...runRequest.projectRulesSnapshot.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
    })),
    ...(runRequest.context.compaction.compactedSourceIds.length > 0
      ? [{
          code: 'context-compacted',
          message: `Context compaction summarized ${runRequest.context.compaction.compactedSourceIds.length} source(s) before execution.`,
        }]
      : []),
  ];
}

function collectPolicyActions(conditionsByCheckpoint: Array<{ checkpoint: Parameters<typeof evaluatePolicy>[0]['checkpoint']; conditions: PolicyCondition[] }>): string[] {
  return Array.from(new Set(
    conditionsByCheckpoint.flatMap(({ checkpoint, conditions }) => evaluatePolicy({ checkpoint, conditions }).actions),
  ));
}

function buildExplainAssistantMessage(mode: RunRequest['mode'], explain: RunExplainResult, blockedReasons: string[]): string {
  const heading = mode === 'explain' ? 'Explain mode' : 'Dry run';
  const sections = [
    `${heading} prepared ${explain.predictedChanges.length} predicted change(s).`,
    `Targets: ${explain.targetSummary.join(', ') || 'None'}.`,
    explain.predictedChanges.length > 0
      ? `Predicted changes:\n${explain.predictedChanges.map((change) => `- ${change.summary}`).join('\n')}`
      : '',
    blockedReasons.length > 0
      ? `Blocked reasons:\n${blockedReasons.map((reason) => `- ${reason}`).join('\n')}`
      : '',
  ].filter(Boolean);

  return sections.join('\n\n');
}

function buildBaseEnvelope(
  runRequest: RunRequest,
  targetSummary: string[],
  changedTargets: RunResultChangedTarget[],
  validation: RunResultValidationSummary,
  explain: RunExplainResult,
): RunOutputsEnvelope {
  return {
    artifactType: runRequest.intent.projectOperation ? 'project' : runRequest.intent.artifactType,
    mode: runRequest.mode,
    targetSummary,
    changedTargets,
    validation,
    runtimePlan: runRequest.artifactRunPlan,
    workflowPlan: runRequest.artifactRunPlan.workflow,
    explain,
  };
}

function buildSpreadsheetPrediction(
  runRequest: RunRequest,
  project: ProjectData,
): {
  plan: SpreadsheetPlan | null;
  planSummary?: SpreadsheetExecutionSummary;
  predictedChanges: PredictedChange[];
  blockedReasons: string[];
  warnings: RunResultWarning[];
} {
  const activeDocument = runRequest.activeArtifacts.activeDocument;
  const activeWorkbook = activeDocument?.type === 'spreadsheet' ? activeDocument.workbook ?? null : null;
  const plan = planSpreadsheetWorkflow({
    prompt: runRequest.context.conversation.promptWithContext,
    activeWorkbook,
    activeDocumentId: activeDocument?.id ?? null,
    isDefaultSheet: isDefaultSheet(activeDocument),
  });

  if (!plan) {
    return {
      plan,
      predictedChanges: [{
        documentId: activeDocument?.id,
        artifactType: 'spreadsheet',
        action: 'none',
        summary: 'No deterministic spreadsheet plan matched the prompt.',
      }],
      blockedReasons: ['No supported spreadsheet workflow matched this prompt.'],
      warnings: [],
    };
  }

  const validation = validateSpreadsheetPlan({
    prompt: runRequest.context.conversation.prompt,
    plan,
    workbook: activeWorkbook,
    activeDocumentId: activeDocument?.id,
  });
  const blockedReasons = [
    ...(validation.clarification ? [validation.clarification] : []),
    ...validation.issues
      .filter((issue) => issue.severity === 'blocking')
      .map((issue) => issue.message),
  ];
  const targetSheetId = plan.targets[0]?.sheetId;
  const planSummary = activeDocument?.id
    ? summarizeSpreadsheetAugmentationImpact({
        project,
        spreadsheetDocumentId: activeDocument.id,
        affectedSheetIds: targetSheetId ? [targetSheetId] : [],
        affectedTableNames: [],
        plan,
      })
    : {
        planKind: plan.kind,
        targetSummary: plan.targets.map((target) => [target.sheetName, target.columnName].filter(Boolean).join(' → ')).filter(Boolean),
        downstreamAugmentationImpact: plan.canAugmentProject
          ? ['Spreadsheet changes can refresh linked tables, chart sources, and project summaries.']
          : ['This spreadsheet request does not change project dependencies.'],
      };

  const predictedAction = plan.kind === 'summarize-sheet' ? 'none' : activeDocument?.type === 'spreadsheet' ? 'update' : 'create';
  const predictedChanges: PredictedChange[] = [{
    documentId: activeDocument?.type === 'spreadsheet' ? activeDocument.id : undefined,
    sheetId: targetSheetId,
    artifactType: 'spreadsheet',
    action: predictedAction,
    summary: plan.kind === 'summarize-sheet'
      ? 'Would summarize the active sheet without mutating the workbook.'
      : plan.kind === 'create-query-view'
        ? `Would materialize query view "${plan.queryView?.outputSheetName}" from "${plan.queryView?.sourceSheetName}".`
        : plan.kind === 'create-formula-column'
          ? `Would add computed column "${plan.formula?.outputColumnName}" to ${plan.targets[0]?.sheetName ?? 'the active sheet'}.`
          : plan.kind === 'create-workbook'
            ? 'Would create a new workbook from the starter plan.'
            : `Would apply spreadsheet plan "${plan.kind}" to ${plan.targets[0]?.sheetName ?? 'the active sheet'}.`,
  }];

  return {
    plan,
    planSummary,
    predictedChanges,
    blockedReasons,
    warnings: validation.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
    })),
  };
}

async function buildProjectPrediction(runRequest: RunRequest, project: ProjectData): Promise<{
  predictedChanges: PredictedChange[];
  blockedReasons: string[];
  validationResult: ValidationResult;
  dependencyBroken: boolean;
}> {
  const operation = runRequest.intent.projectOperation ?? 'augment';
  const refreshed = refreshProjectDependencies(project);
  const dependencyIssues = validateProjectGraph(buildProjectGraph(refreshed.project));
  const dependencyBroken = dependencyIssues.some((issue) => issue.status !== 'valid');
  const validationResult = await validateProjectAgainstProfile({
    project: refreshed.project,
    profileId: 'publish-ready',
  });
  const summaryDocument = project.documents.find((document) => document.starterRef?.artifactKey === PROJECT_SUMMARY_ARTIFACT_KEY);

  const predictedChanges: PredictedChange[] = [];
  if (operation === 'summarize-project' || operation === 'augment') {
    predictedChanges.push({
      documentId: summaryDocument?.id,
      artifactType: 'document',
      action: summaryDocument ? 'update' : 'create',
      summary: summaryDocument
        ? 'Would update the managed project summary artifact.'
        : 'Would create a managed project summary artifact.',
    });
  }
  if (operation === 'refresh-dependencies' || operation === 'augment') {
    for (const change of refreshed.changes) {
      predictedChanges.push({
        documentId: change.documentId,
        artifactType: project.documents.find((document) => document.id === change.documentId)?.type ?? 'document',
        action: 'update',
        summary: change.reason,
      });
    }
  }
  if (operation === 'review-project' && predictedChanges.length === 0) {
    predictedChanges.push({
      artifactType: 'project',
      action: 'none',
      summary: 'Would review current artifacts and dependency state without mutating them.',
    });
  }
  if (operation === 'link-project' && predictedChanges.length === 0) {
    predictedChanges.push({
      artifactType: 'project',
      action: 'none',
      summary: 'Would report low-risk deterministic link suggestions without mutating artifacts.',
    });
  }

  return {
    predictedChanges,
    blockedReasons: validationResult.blockingIssues.map((issue) => issue.message),
    validationResult,
    dependencyBroken,
  };
}

export interface BuildNonMutatingRunResultInput {
  runRequest: RunRequest;
  project: ProjectData;
}

export async function buildNonMutatingRunResult(
  input: BuildNonMutatingRunResultInput,
): Promise<RunResult> {
  const { runRequest, project } = input;
  const mode = runRequest.mode;
  const targetSummary = buildTargetSummary(runRequest);
  const baseWarnings = buildContextWarnings(runRequest);

  if (runRequest.intent.projectOperation) {
    const prediction = await buildProjectPrediction(runRequest, project);
    const policyActions = collectPolicyActions([
      {
        checkpoint: 'before-run',
        conditions: [
          ...(runRequest.activeArtifacts.activeDocument?.lifecycleState === 'stale' ? ['artifact-stale' as const] : []),
          ...(runRequest.selectedPresetId && !runRequest.appliedPreset ? ['preset-mismatch' as const] : []),
        ],
      },
      {
        checkpoint: 'after-context-assembly',
        conditions: runRequest.context.compaction.afterTokens > getCompressionBudget() ? ['context-budget-exceeded'] : [],
      },
      {
        checkpoint: 'after-validation',
        conditions: [
          ...(!prediction.validationResult.passed ? ['validation-blocked' as const] : []),
          ...(!prediction.validationResult.passed ? ['export-unavailable' as const] : []),
        ],
      },
      {
        checkpoint: 'after-lifecycle-refresh',
        conditions: prediction.dependencyBroken ? ['dependency-broken'] : [],
      },
    ]);
    const explain: RunExplainResult = {
      includedSources: runRequest.serializableSpec?.contextSnapshot.sources ?? [],
      projectOperation: runRequest.intent.projectOperation,
      targetSummary,
      validationProfile: prediction.validationResult.profileId,
      ...(runRequest.appliedPreset ? { appliedPreset: { id: runRequest.appliedPreset.id, name: runRequest.appliedPreset.name } } : {}),
      policyActions,
      predictedChanges: prediction.predictedChanges,
      blockedReasons: prediction.blockedReasons,
    };
    const changedTargets = mapPredictedChangesToTargets(prediction.predictedChanges);
    const primaryBlockedReason = explain.blockedReasons[0];
    const validation = buildValidationSummary(
      prediction.validationResult,
      'Project validation completed for non-mutating execution.',
    );
    const envelope = {
      ...buildBaseEnvelope(runRequest, targetSummary, changedTargets, validation, explain),
      project: {
        artifactType: 'project' as const,
        project: {
          operation: runRequest.intent.projectOperation,
          updatedDocumentIds: prediction.predictedChanges.map((change) => change.documentId).filter(Boolean) as string[],
          dependencyChanges: validateProjectGraph(buildProjectGraph(project)).map((issue) => ({
            edgeId: issue.edgeId ?? issue.code,
            kind: issue.code,
            status: issue.status,
            sourceDocumentId: issue.documentId,
            sheetId: issue.sheetId,
            message: issue.message,
          })),
        },
        publish: {
          profileId: prediction.validationResult.profileId,
          projectValidation: prediction.validationResult,
          exportBlocked: !prediction.validationResult.passed,
          overrideRequired: !prediction.validationResult.passed,
        },
      },
    } satisfies RunOutputsEnvelope;

    return {
      runId: runRequest.runId,
      status: explain.blockedReasons.length > 0 && mode === 'dry-run' ? 'blocked' : 'completed',
      intent: runRequest.intent,
      outputs: {
        envelope,
        project: envelope.project?.project,
        publish: envelope.project?.publish,
      },
      assistantMessage: {
        content: buildExplainAssistantMessage(mode, explain, explain.blockedReasons),
      },
      validation,
      warnings: [
        ...baseWarnings,
        ...prediction.validationResult.blockingIssues.map((issue) => ({ code: issue.code, message: issue.message })),
        ...prediction.validationResult.warnings.map((issue) => ({ code: issue.code, message: issue.message })),
      ],
      changedTargets,
      structuredStatus: {
        title: mode === 'explain' ? 'Explain mode completed' : 'Dry run completed',
        detail: primaryBlockedReason
          ? primaryBlockedReason
          : `${mode === 'explain' ? 'Prepared' : 'Validated'} ${explain.predictedChanges.length} predicted project change(s).`,
      },
    };
  }

  if (runRequest.intent.artifactType === 'spreadsheet') {
    const spreadsheetPrediction = buildSpreadsheetPrediction(runRequest, project);
    const activeDocument = runRequest.activeArtifacts.activeDocument;
    const artifactValidation = activeDocument ? validateArtifactAgainstProfile(activeDocument) : undefined;
    const blockedReasons = [
      ...spreadsheetPrediction.blockedReasons,
      ...(artifactValidation?.blockingIssues.map((issue) => issue.message) ?? []),
    ];
    const policyActions = collectPolicyActions([
      {
        checkpoint: 'before-run',
        conditions: [
          ...(activeDocument?.lifecycleState === 'stale' ? ['artifact-stale' as const] : []),
          ...(runRequest.selectedPresetId && !runRequest.appliedPreset ? ['preset-mismatch' as const] : []),
        ],
      },
      {
        checkpoint: 'after-context-assembly',
        conditions: runRequest.context.compaction.afterTokens > getCompressionBudget() ? ['context-budget-exceeded'] : [],
      },
      {
        checkpoint: 'after-validation',
        conditions: [
          ...(blockedReasons.length > 0 ? ['validation-blocked' as const] : []),
          ...(!artifactValidation?.passed ? ['export-unavailable' as const] : []),
        ],
      },
      {
        checkpoint: 'after-lifecycle-refresh',
        conditions: [],
      },
    ]);
    const explain: RunExplainResult = {
      includedSources: runRequest.serializableSpec?.contextSnapshot.sources ?? [],
      targetSummary,
      validationProfile: artifactValidation?.profileId ?? getDefaultValidationProfileId('spreadsheet'),
      ...(runRequest.appliedPreset ? { appliedPreset: { id: runRequest.appliedPreset.id, name: runRequest.appliedPreset.name } } : {}),
      policyActions,
      predictedChanges: spreadsheetPrediction.predictedChanges,
      blockedReasons,
    };
    const changedTargets = mapPredictedChangesToTargets(spreadsheetPrediction.predictedChanges);
    const primaryBlockedReason = blockedReasons[0];
    const validation = buildValidationSummary(
      artifactValidation,
      primaryBlockedReason ?? 'Spreadsheet dry-run completed.',
    );
    const envelope = {
      ...buildBaseEnvelope(runRequest, targetSummary, changedTargets, validation, explain),
      spreadsheet: {
        artifactType: 'spreadsheet' as const,
        kind: spreadsheetPrediction.plan?.kind,
        spreadsheet: spreadsheetPrediction.planSummary,
        editing: runRequest.intent.operation === 'action'
          ? {
              strategyUsed: runRequest.intent.editStrategyHint ?? 'sheet-action',
              fallbackUsed: false,
              targetSummary,
              dryRunFailures: blockedReasons,
            }
          : undefined,
        publish: artifactValidation
          ? {
              profileId: artifactValidation.profileId,
              artifactValidation,
              exportBlocked: !artifactValidation.passed,
              overrideRequired: !artifactValidation.passed,
            }
          : undefined,
      },
    } satisfies RunOutputsEnvelope;

    return {
      runId: runRequest.runId,
      status: blockedReasons.length > 0 && mode === 'dry-run' ? 'blocked' : 'completed',
      intent: runRequest.intent,
      outputs: {
        envelope,
        ...(spreadsheetPrediction.planSummary ? { spreadsheet: spreadsheetPrediction.planSummary } : {}),
        ...(envelope.spreadsheet?.editing ? { editing: envelope.spreadsheet.editing } : {}),
        ...(envelope.spreadsheet?.publish ? { publish: envelope.spreadsheet.publish } : {}),
      },
      assistantMessage: {
        content: buildExplainAssistantMessage(mode, explain, blockedReasons),
      },
      validation,
      warnings: [...baseWarnings, ...spreadsheetPrediction.warnings],
      changedTargets,
      structuredStatus: {
        title: mode === 'explain' ? 'Spreadsheet explain prepared' : 'Spreadsheet dry run prepared',
        detail: primaryBlockedReason ?? `Prepared spreadsheet ${spreadsheetPrediction.plan?.kind ?? 'plan'} without mutating the workbook.`,
      },
    };
  }

  const activeDocument = runRequest.activeArtifacts.activeDocument;
  const artifactValidation = activeDocument ? validateArtifactAgainstProfile(activeDocument) : undefined;
  const blockedReasons = [
    ...(runRequest.intent.needsClarification && runRequest.intent.clarification?.question
      ? [runRequest.intent.clarification.question]
      : []),
  ];
  const policyActions = collectPolicyActions([
    {
      checkpoint: 'before-run',
      conditions: [
        ...(activeDocument?.lifecycleState === 'stale' ? ['artifact-stale' as const] : []),
        ...(runRequest.selectedPresetId && !runRequest.appliedPreset ? ['preset-mismatch' as const] : []),
      ],
    },
    {
      checkpoint: 'after-context-assembly',
      conditions: runRequest.context.compaction.afterTokens > getCompressionBudget() ? ['context-budget-exceeded'] : [],
    },
    {
      checkpoint: 'after-validation',
      conditions: [
        ...(!artifactValidation?.passed ? ['validation-blocked' as const] : []),
        ...(!artifactValidation?.passed ? ['export-unavailable' as const] : []),
      ],
    },
    {
      checkpoint: 'after-lifecycle-refresh',
      conditions: [],
    },
  ]);
  const predictedChanges = buildDocumentPredictedChanges(runRequest, targetSummary);
  const explain: RunExplainResult = {
    includedSources: runRequest.serializableSpec?.contextSnapshot.sources ?? [],
    targetSummary,
    validationProfile: artifactValidation?.profileId ?? getDefaultValidationProfileId(runRequest.intent.artifactType),
    ...(runRequest.appliedPreset ? { appliedPreset: { id: runRequest.appliedPreset.id, name: runRequest.appliedPreset.name } } : {}),
    policyActions,
    predictedChanges,
    blockedReasons,
  };
  const changedTargets = mapPredictedChangesToTargets(predictedChanges);
  const primaryBlockedReason = blockedReasons[0];
  const validation = buildValidationSummary(
    artifactValidation,
    primaryBlockedReason ?? `${runRequest.intent.artifactType} ${mode} completed without mutating project state.`,
  );
  const envelope = runRequest.intent.artifactType === 'presentation'
    ? {
        ...buildBaseEnvelope(runRequest, targetSummary, changedTargets, validation, explain),
        presentation: {
          artifactType: 'presentation' as const,
          title: activeDocument?.title,
          slideCount: activeDocument?.slideCount,
          editing: runRequest.intent.operation === 'edit'
            ? {
                strategyUsed: runRequest.intent.editStrategyHint ?? 'search-replace',
                fallbackUsed: false,
                targetSummary,
                dryRunFailures: blockedReasons,
              }
            : undefined,
          publish: artifactValidation
            ? {
                profileId: artifactValidation.profileId,
                artifactValidation,
                exportBlocked: !artifactValidation.passed,
                overrideRequired: !artifactValidation.passed,
              }
            : undefined,
        },
      }
    : {
        ...buildBaseEnvelope(runRequest, targetSummary, changedTargets, validation, explain),
        document: {
          artifactType: 'document' as const,
          title: activeDocument?.title,
          editing: runRequest.intent.operation === 'edit'
            ? {
                strategyUsed: runRequest.intent.editStrategyHint ?? 'block-replace',
                fallbackUsed: false,
                targetSummary,
                dryRunFailures: blockedReasons,
              }
            : undefined,
          publish: artifactValidation
            ? {
                profileId: artifactValidation.profileId,
                artifactValidation,
                exportBlocked: !artifactValidation.passed,
                overrideRequired: !artifactValidation.passed,
              }
            : undefined,
        },
      };

  const outputs: RunResultOutputs = {
    envelope,
    ...(envelope.document?.editing || envelope.presentation?.editing
      ? { editing: envelope.document?.editing ?? envelope.presentation?.editing }
      : {}),
    ...(envelope.document?.publish || envelope.presentation?.publish
      ? { publish: envelope.document?.publish ?? envelope.presentation?.publish }
      : {}),
  };

  return {
    runId: runRequest.runId,
    status: blockedReasons.length > 0 && mode === 'dry-run' ? 'blocked' : 'completed',
    intent: runRequest.intent,
    outputs,
    assistantMessage: {
      content: buildExplainAssistantMessage(mode, explain, blockedReasons),
    },
    validation,
    warnings: [
      ...baseWarnings,
      ...(artifactValidation?.blockingIssues.map((issue) => ({ code: issue.code, message: issue.message })) ?? []),
      ...(artifactValidation?.warnings.map((issue) => ({ code: issue.code, message: issue.message })) ?? []),
    ],
    changedTargets,
    structuredStatus: {
      title: mode === 'explain' ? 'Explain mode completed' : 'Dry run completed',
      detail: blockedReasons[0] ?? `Prepared ${runRequest.intent.artifactType} execution without mutating project state.`,
    },
  };
}
