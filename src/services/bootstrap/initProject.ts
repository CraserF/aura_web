import type { ProjectData } from '@/types/project';
import {
  defaultContextPolicy,
  defaultWorkflowPresets,
} from '@/services/projectRules/defaults';
import { createInitReport } from './initReport';
import { buildStarterArtifact, createProjectDocumentFromStarter } from './projectStarter';
import { getProjectStarterKit } from './starterKits';
import type {
  InitProjectOptions,
  InitReport,
  InitReportItem,
  ProjectStarterArtifact,
  ProjectStarterKit,
} from './types';

function isBlankProjectTitle(title: string | undefined): boolean {
  return !title || title.trim() === '' || title === 'Untitled Project';
}

function mergeProjectStarterKit(
  starterKitOrOptions?: ProjectStarterKit | InitProjectOptions | null,
): InitProjectOptions {
  if (!starterKitOrOptions) {
    return {};
  }

  if ('artifacts' in starterKitOrOptions && 'label' in starterKitOrOptions) {
    return {
      starterKitId: starterKitOrOptions.id,
      artifacts: starterKitOrOptions.artifacts,
      defaultProjectTitle: starterKitOrOptions.defaultProjectTitle,
      projectRulesMarkdown: starterKitOrOptions.projectRulesMarkdown,
      contextPolicyOverrides: starterKitOrOptions.contextPolicyOverrides,
      workflowPresets: starterKitOrOptions.workflowPresets,
    };
  }

  if (starterKitOrOptions.starterKitId) {
    const starterKit = getProjectStarterKit(starterKitOrOptions.starterKitId);
    if (starterKit) {
      return {
        starterKitId: starterKit.id,
        artifacts: starterKitOrOptions.artifacts ?? starterKit.artifacts,
        defaultProjectTitle: starterKitOrOptions.defaultProjectTitle ?? starterKit.defaultProjectTitle,
        projectRulesMarkdown: starterKitOrOptions.projectRulesMarkdown ?? starterKit.projectRulesMarkdown,
        contextPolicyOverrides: starterKitOrOptions.contextPolicyOverrides ?? starterKit.contextPolicyOverrides,
        workflowPresets: starterKitOrOptions.workflowPresets ?? starterKit.workflowPresets,
      };
    }
  }

  return starterKitOrOptions;
}

function mergeContextPolicy(
  project: ProjectData,
  items: InitReportItem[],
  overrides?: InitProjectOptions['contextPolicyOverrides'],
): ProjectData {
  if (!overrides) return project;

  const current = project.contextPolicy ?? defaultContextPolicy();
  const next = {
    ...current,
    ...overrides,
    artifactOverrides: {
      ...(current.artifactOverrides ?? {}),
    },
  };

  const changed = JSON.stringify(current) !== JSON.stringify(next);
  if (!changed) {
    items.push({
      kind: 'context-policy',
      target: 'project.contextPolicy',
      status: 'skipped',
      summary: 'Context policy already satisfies the starter defaults.',
    });
    return project;
  }

  items.push({
    kind: 'context-policy',
    target: 'project.contextPolicy',
    status: 'updated',
    summary: 'Applied starter context-policy overrides.',
  });

  return {
    ...project,
    contextPolicy: next,
  };
}

function mergeWorkflowPresets(
  project: ProjectData,
  items: InitReportItem[],
  workflowPresets?: InitProjectOptions['workflowPresets'],
): ProjectData {
  if (!workflowPresets) return project;

  const current = project.workflowPresets ?? defaultWorkflowPresets();
  const hasExistingPresets = current.presets.length > 0 || Object.keys(current.defaultPresetByArtifact).length > 0;
  if (hasExistingPresets) {
    items.push({
      kind: 'workflow-presets',
      target: 'project.workflowPresets',
      status: 'skipped',
      summary: 'Existing workflow presets were preserved.',
    });
    return project;
  }

  items.push({
    kind: 'workflow-presets',
    target: 'project.workflowPresets',
    status: 'created',
    summary: 'Applied starter workflow presets.',
  });

  return {
    ...project,
    workflowPresets,
  };
}

function mergeProjectRules(
  project: ProjectData,
  items: InitReportItem[],
  projectRulesMarkdown?: string,
): ProjectData {
  if (!projectRulesMarkdown?.trim()) return project;

  const currentMarkdown = project.projectRules?.markdown?.trim() ?? '';
  if (currentMarkdown) {
    items.push({
      kind: 'project-rules',
      target: 'project.projectRules',
      status: 'skipped',
      summary: 'Existing project rules markdown was preserved.',
    });
    return project;
  }

  items.push({
    kind: 'project-rules',
    target: 'project.projectRules',
    status: 'created',
    summary: 'Applied starter project rules markdown.',
  });

  return {
    ...project,
    projectRules: {
      markdown: projectRulesMarkdown,
      updatedAt: Date.now(),
    },
  };
}

function mergeProjectTitle(
  project: ProjectData,
  items: InitReportItem[],
  title?: string,
): ProjectData {
  if (!title?.trim()) return project;

  if (!isBlankProjectTitle(project.title)) {
    items.push({
      kind: 'project-title',
      target: 'project.title',
      status: 'skipped',
      summary: 'Existing project title was preserved.',
    });
    return project;
  }

  items.push({
    kind: 'project-title',
    target: 'project.title',
    status: 'updated',
    summary: `Set project title to "${title}".`,
  });

  return {
    ...project,
    title,
  };
}

function findStarterManagedDocument(
  documents: ProjectData['documents'],
  artifact: ProjectStarterArtifact,
  starterKitId?: string,
) {
  return documents.find((document) =>
    document.starterRef?.artifactKey === artifact.key
      && document.starterRef?.starterId === artifact.starterId
      && document.starterRef?.starterType === artifact.type
      && (starterKitId ? document.starterRef?.starterKitId === starterKitId : true));
}

function patchMissingStarterFields(
  document: ProjectData['documents'][number],
  artifact: ProjectStarterArtifact,
  starterKitId: string | undefined,
): { document: ProjectData['documents'][number]; changed: boolean } {
  let changed = false;
  let nextDocument = document;

  if (!document.starterRef) {
    nextDocument = {
      ...nextDocument,
      starterRef: {
        artifactKey: artifact.key,
        starterId: artifact.starterId,
        starterType: artifact.type,
        starterKitId,
      },
    };
    changed = true;
  }

  if ((!document.title || document.title.startsWith('New ')) && artifact.initialTitle) {
    nextDocument = {
      ...nextDocument,
      title: artifact.initialTitle,
    };
    changed = true;
  }

  return { document: nextDocument, changed };
}

export async function initProject(
  project: ProjectData,
  starterKitOrOptions?: ProjectStarterKit | InitProjectOptions | null,
): Promise<{ project: ProjectData; report: InitReport }> {
  const options = mergeProjectStarterKit(starterKitOrOptions);
  const items: InitReportItem[] = [];
  let nextProject = { ...project };

  nextProject = mergeProjectTitle(nextProject, items, options.defaultProjectTitle);
  nextProject = mergeProjectRules(nextProject, items, options.projectRulesMarkdown);
  nextProject = mergeContextPolicy(nextProject, items, options.contextPolicyOverrides);
  nextProject = mergeWorkflowPresets(nextProject, items, options.workflowPresets);

  const artifacts = options.artifacts ?? [];
  let nextDocuments = [...nextProject.documents];
  let firstArtifactId: string | null = null;

  for (const artifact of artifacts) {
    const existing = findStarterManagedDocument(nextDocuments, artifact, options.starterKitId);
    if (existing) {
      const patched = patchMissingStarterFields(existing, artifact, options.starterKitId);
      nextDocuments = nextDocuments.map((document) =>
        document.id === existing.id ? patched.document : document);
      items.push({
        kind: 'artifact',
        target: `${artifact.type}:${artifact.key}`,
        status: patched.changed ? 'updated' : 'skipped',
        summary: patched.changed
          ? `Updated missing starter metadata for "${patched.document.title}".`
          : `Preserved existing starter artifact "${existing.title}".`,
      });
      if (!firstArtifactId) {
        firstArtifactId = existing.id;
      }
      continue;
    }

    const buildResult = await buildStarterArtifact(artifact, options.starterKitId);
    const createdDocument = createProjectDocumentFromStarter(buildResult, nextDocuments.length);
    nextDocuments = [...nextDocuments, createdDocument];
    firstArtifactId = firstArtifactId ?? createdDocument.id;
    items.push({
      kind: 'artifact',
      target: `${artifact.type}:${artifact.key}`,
      status: 'created',
      summary: `Created starter artifact "${createdDocument.title}".`,
    });
  }

  nextProject = {
    ...nextProject,
    documents: nextDocuments,
    activeDocumentId: nextProject.activeDocumentId ?? firstArtifactId,
    updatedAt: Date.now(),
  };

  return {
    project: nextProject,
    report: createInitReport(nextProject.id, items),
  };
}
