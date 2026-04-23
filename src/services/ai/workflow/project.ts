import type { GenerationStatus } from '@/types';
import type { ProjectData, ProjectDocument } from '@/types/project';
import type { RunResult, RunResultDependencyChange, RunResultProjectOutputs } from '@/services/contracts/runResult';
import type { RunRequest } from '@/services/runs/types';

import { extractChartSpecsFromHtml } from '@/services/charts';
import { renderDocumentFromSource, deriveDocumentTextSource } from '@/services/ai/workflow/document';
import { buildProjectGraph } from '@/services/projectGraph/build';
import { refreshProjectDependencies } from '@/services/projectGraph/refresh';
import { validateProjectGraph } from '@/services/projectGraph/validate';
import { publishRunEvent } from '@/services/events/eventBus';
import { createRunEventSource } from '@/services/events/provenance';
import { useProjectStore } from '@/stores/projectStore';
import { commitVersion } from '@/services/storage/versionHistory';
import { summarizeValidationResult } from '@/services/validation/profiles';
import { validateProjectAgainstProfile } from '@/services/validation/projectValidation';
import { validateArtifactAgainstProfile } from '@/services/validation';
import { deriveLifecycleFromValidation, markDocumentStale } from '@/services/lifecycle/state';

const PROJECT_SUMMARY_REF = {
  artifactKey: 'project-summary',
  starterId: 'phase-6-project-summary',
  starterType: 'document' as const,
};

function summarizeDependencyChanges(
  graphIssues: ReturnType<typeof validateProjectGraph>,
): RunResultDependencyChange[] {
  return graphIssues.map((issue) => ({
    edgeId: issue.edgeId ?? issue.code,
    kind: issue.code,
    status: issue.status,
    sourceDocumentId: issue.documentId,
    sheetId: issue.sheetId,
    message: issue.message,
  }));
}

function formatDocumentSnapshot(document: ProjectDocument): string {
  const summarySource = document.type === 'document'
    ? (document.sourceMarkdown?.trim() || deriveDocumentTextSource(document.contentHtml))
    : document.type === 'presentation'
      ? deriveDocumentTextSource(document.contentHtml)
      : document.workbook
        ? `${document.workbook.sheets.length} sheet(s) in workbook`
        : 'Spreadsheet without workbook metadata';

  return [
    `## ${document.title}`,
    `- Type: ${document.type}`,
    `- Updated: ${new Date(document.updatedAt).toISOString()}`,
    document.linkedTableRefs?.length
      ? `- Linked tables: ${document.linkedTableRefs.length}`
      : '- Linked tables: 0',
    Object.keys(document.chartSpecs ?? {}).length
      ? `- Charts: ${Object.keys(document.chartSpecs ?? {}).length}`
      : '- Charts: 0',
    document.type === 'spreadsheet'
      ? `- Workbook sheets: ${document.workbook?.sheets.length ?? 0}`
      : `- Snapshot:\n${summarySource.slice(0, 600)}`,
  ].join('\n');
}

function buildProjectSummaryMarkdown(project: ProjectData): string {
  const graph = buildProjectGraph(project);
  const issues = validateProjectGraph(graph);
  const counts = project.documents.reduce(
    (summary, document) => ({
      ...summary,
      [document.type]: summary[document.type] + 1,
    }),
    { document: 0, presentation: 0, spreadsheet: 0 },
  );

  const sections = project.documents
    .filter((document) => document.starterRef?.artifactKey !== PROJECT_SUMMARY_REF.artifactKey)
    .map((document) => formatDocumentSnapshot(document));

  return [
    `# ${project.title} Project Summary`,
    '',
    '## Snapshot',
    `- Documents: ${counts.document}`,
    `- Presentations: ${counts.presentation}`,
    `- Spreadsheets: ${counts.spreadsheet}`,
    `- Linked references: ${project.documents.reduce((total, document) => total + (document.linkedTableRefs?.length ?? 0), 0)}`,
    `- Dependency issues: ${issues.length}`,
    '',
    '## Artifact Overview',
    ...sections,
  ].join('\n\n').trim();
}

function buildProjectReviewSummary(project: ProjectData): string {
  const graphIssues = validateProjectGraph(buildProjectGraph(project));
  const findings: string[] = [];

  if (project.documents.length === 0) {
    findings.push('The project has no artifacts yet.');
  }

  for (const document of project.documents) {
    if (document.type !== 'spreadsheet' && !document.contentHtml.trim()) {
      findings.push(`"${document.title}" is empty and may need content before augmentation.`);
    }
    if (document.type === 'spreadsheet' && !document.workbook?.sheets.length) {
      findings.push(`"${document.title}" is missing workbook sheets.`);
    }
  }

  for (const issue of graphIssues) {
    findings.push(issue.message);
  }

  if (findings.length === 0) {
    findings.push('The project artifacts and dependency graph look healthy.');
  }

  return findings.map((finding) => `- ${finding}`).join('\n');
}

function buildLinkSummary(project: ProjectData): string {
  const spreadsheets = project.documents.filter((document) => document.type === 'spreadsheet' && document.workbook?.sheets.length);
  const documents = project.documents.filter((document) => document.type !== 'spreadsheet');

  const proposals: string[] = [];
  for (const document of documents) {
    for (const spreadsheet of spreadsheets) {
      const firstSheet = spreadsheet.workbook?.sheets[0];
      if (!firstSheet) continue;
      const alreadyLinked = (document.linkedTableRefs ?? []).some((ref) => ref.spreadsheetDocId === spreadsheet.id && ref.sheetId === firstSheet.id);
      if (!alreadyLinked) {
        proposals.push(`Consider linking "${document.title}" to ${spreadsheet.title} / ${firstSheet.name}.`);
      }
    }
  }

  return proposals.length > 0
    ? proposals.map((proposal) => `- ${proposal}`).join('\n')
    : '- No deterministic low-risk cross-artifact link proposals were found.';
}

function upsertProjectSummaryDocument(
  project: ProjectData,
  addDocument: (doc: ProjectDocument) => void,
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void,
): { documentId: string; action: 'created' | 'updated' } {
  const existingSummary = project.documents.find((document) => document.starterRef?.artifactKey === PROJECT_SUMMARY_REF.artifactKey);
  const summaryMarkdown = buildProjectSummaryMarkdown(project);
  const rendered = renderDocumentFromSource({
    text: summaryMarkdown,
    titleHint: `${project.title} Project Summary`,
    prompt: `Summarize the ${project.title} project`,
    documentType: 'brief',
  });
  const chartSpecs = extractChartSpecsFromHtml(rendered.html);

  if (existingSummary) {
    updateDocument(existingSummary.id, {
      title: rendered.title,
      contentHtml: rendered.html,
      sourceMarkdown: rendered.markdown,
      chartSpecs,
      starterRef: {
        ...PROJECT_SUMMARY_REF,
        starterKitId: existingSummary.starterRef?.starterKitId,
      },
      lastSuccessfulPresetId: undefined,
    });
    return {
      documentId: existingSummary.id,
      action: 'updated',
    };
  }

  const newDocument: ProjectDocument = {
    id: crypto.randomUUID(),
    title: rendered.title,
    type: 'document',
    contentHtml: rendered.html,
    sourceMarkdown: rendered.markdown,
    themeCss: '',
    slideCount: 0,
    chartSpecs,
    starterRef: PROJECT_SUMMARY_REF,
    lifecycleState: 'draft',
    order: project.documents.length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  addDocument(newDocument);
  return {
    documentId: newDocument.id,
    action: 'created',
  };
}

function buildProjectOutputs(
  operation: NonNullable<RunRequest['intent']['projectOperation']>,
  updatedDocumentIds: string[],
  dependencyChanges: RunResultDependencyChange[],
  reviewSummary?: string,
  linkSummary?: string,
): RunResultProjectOutputs {
  return {
    operation,
    updatedDocumentIds,
    dependencyChanges,
    ...(reviewSummary ? { reviewSummary } : {}),
    ...(linkSummary ? { linkSummary } : {}),
  };
}

export interface ProjectWorkflowContext {
  runRequest: RunRequest;
  project: ProjectData;
  addDocument: (doc: ProjectDocument) => void;
  updateDocument: (id: string, updates: Partial<ProjectDocument>) => void;
  setStatus: (status: GenerationStatus) => void;
  setStreamingContent: (content: string) => void;
}

export async function handleProjectWorkflow(ctx: ProjectWorkflowContext): Promise<RunResult> {
  const { runRequest, project, addDocument, updateDocument, setStatus, setStreamingContent } = ctx;
  const source = createRunEventSource('projectWorkflow');
  const operation = runRequest.intent.projectOperation ?? 'augment';

  setStatus({
    state: 'generating',
    startedAt: Date.now(),
    step: 'Project workflow',
    pct: 40,
  });
  setStreamingContent('');

  let workingProject = project;
  const updatedDocumentIds = new Set<string>();

  const refreshed = refreshProjectDependencies(workingProject);
  workingProject = refreshed.project;
  for (const change of refreshed.changes) {
    updateDocument(change.documentId, {
      linkedTableRefs: workingProject.documents.find((document) => document.id === change.documentId)?.linkedTableRefs,
      chartSpecs: workingProject.documents.find((document) => document.id === change.documentId)?.chartSpecs,
    });
    updatedDocumentIds.add(change.documentId);
    publishRunEvent({
      type: 'dependency.refreshed',
      runId: runRequest.runId,
      source,
      payload: {
        documentId: change.documentId,
        reason: change.reason,
      },
    });
  }

  const graphIssues = validateProjectGraph(buildProjectGraph(workingProject));
  for (const issue of graphIssues) {
    publishRunEvent({
      type: 'dependency.broken',
      runId: runRequest.runId,
      source,
      payload: {
        code: issue.code,
        edgeId: issue.edgeId,
        documentId: issue.documentId,
      },
    });
  }

  let reviewSummary: string | undefined;
  let linkSummary: string | undefined;
  const changedTargets: RunResult['changedTargets'] = [];

  if (operation === 'summarize-project' || operation === 'augment') {
    const summaryResult = upsertProjectSummaryDocument(useProjectStore.getState().project, addDocument, updateDocument);
    updatedDocumentIds.add(summaryResult.documentId);
    changedTargets.push({
      documentId: summaryResult.documentId,
      action: summaryResult.action,
    });
    publishRunEvent({
      type: summaryResult.action === 'created' ? 'artifact.created' : 'artifact.updated',
      runId: runRequest.runId,
      source,
      payload: {
        documentId: summaryResult.documentId,
        operation: 'summarize-project',
      },
    });
  }

  if (operation === 'review-project' || operation === 'augment') {
    reviewSummary = buildProjectReviewSummary(useProjectStore.getState().project);
  }

  if (operation === 'link-project' || operation === 'augment') {
    linkSummary = buildLinkSummary(useProjectStore.getState().project);
  }

  const latestProject = useProjectStore.getState().project;
  const dependencyChanges = summarizeDependencyChanges(validateProjectGraph(buildProjectGraph(latestProject)));
  for (const change of dependencyChanges) {
    if (change.status !== 'valid' && change.sourceDocumentId) {
      updateDocument(change.sourceDocumentId, markDocumentStale(change.message));
    }
  }
  const projectValidation = await validateProjectAgainstProfile({
    project: latestProject,
    profileId: 'publish-ready',
  });
  for (const document of latestProject.documents) {
    updateDocument(document.id, deriveLifecycleFromValidation(validateArtifactAgainstProfile(document)));
  }

  if (operation === 'refresh-dependencies') {
    for (const documentId of updatedDocumentIds) {
      changedTargets.push({
        documentId,
        action: 'updated',
      });
    }
  }

  const commitMessage = `Project ${operation}: ${runRequest.context.conversation.prompt.slice(0, 60)}`;
  await commitVersion(latestProject, commitMessage).catch((error) => {
    console.warn('[VersionHistory] commit failed:', error);
  });

  setStatus({ state: 'idle' });
  setStreamingContent('');

  const warnings = dependencyChanges.map((change) => ({
    code: change.kind,
    message: change.message,
  })).concat(
    [...projectValidation.blockingIssues, ...projectValidation.warnings].map((issue) => ({
      code: issue.code,
      message: issue.message,
    })),
  );

  return {
    runId: runRequest.runId,
    status: 'completed',
    intent: runRequest.intent,
    outputs: {
      envelope: {
        artifactType: 'project',
        mode: runRequest.mode,
        targetSummary: [operation],
        changedTargets,
        validation: {
          passed: projectValidation.passed,
          summary: summarizeValidationResult(projectValidation),
          profileId: projectValidation.profileId,
          score: projectValidation.score,
          blockingIssues: projectValidation.blockingIssues,
          warnings: projectValidation.warnings,
        },
        project: {
          artifactType: 'project',
          project: buildProjectOutputs(
            operation,
            Array.from(updatedDocumentIds),
            dependencyChanges,
            reviewSummary,
            linkSummary,
          ),
          publish: {
            profileId: projectValidation.profileId,
            projectValidation,
            exportBlocked: !projectValidation.passed,
            overrideRequired: !projectValidation.passed,
          },
        },
      },
      project: buildProjectOutputs(
        operation,
        Array.from(updatedDocumentIds),
        dependencyChanges,
        reviewSummary,
        linkSummary,
      ),
      publish: {
        profileId: projectValidation.profileId,
        projectValidation,
        exportBlocked: !projectValidation.passed,
        overrideRequired: !projectValidation.passed,
      },
    },
    assistantMessage: {
      content: [
        `Completed project operation: ${operation}.`,
        reviewSummary ? `Review findings:\n${reviewSummary}` : '',
        linkSummary ? `Link suggestions:\n${linkSummary}` : '',
      ].filter(Boolean).join('\n\n'),
    },
    validation: {
      passed: projectValidation.passed,
      summary: summarizeValidationResult(projectValidation),
      profileId: projectValidation.profileId,
      score: projectValidation.score,
      blockingIssues: projectValidation.blockingIssues,
      warnings: projectValidation.warnings,
    },
    warnings,
    changedTargets,
    structuredStatus: {
      title: 'Project workflow completed',
      detail: `Completed ${operation} across ${latestProject.documents.length} artifact(s).`,
    },
  };
}
