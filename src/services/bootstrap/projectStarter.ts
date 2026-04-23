import { createInitialMemoryTree } from '@/services/memory';
import {
  defaultContextPolicy,
  defaultProjectRules,
  defaultWorkflowPresets,
} from '@/services/projectRules/defaults';
import { renderDocumentFromSource } from '@/services/ai/workflow/document';
import {
  TEMPLATE_REGISTRY,
  getTemplateHtml,
  type TemplateId,
} from '@/services/ai/templates';
import { listDocumentBlueprints } from '@/services/ai/templates/document-blueprints';
import { createDefaultSheet, replaceSheetData } from '@/services/spreadsheet/workbook';
import { planSpreadsheetStarter } from '@/services/spreadsheet/starter';
import { extractChartSpecsFromHtml } from '@/services/charts';
import type { ProjectData, ProjectDocument } from '@/types/project';
import { getDocumentStarter } from './documentStarters';
import { getSpreadsheetStarter } from './spreadsheetStarters';
import type {
  PresentationStarterTemplate,
  ProjectStarterArtifact,
  StarterArtifactBuildResult,
} from './types';

export function createBlankProject(): ProjectData {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled Project',
    description: '',
    visibility: 'private',
    documents: [],
    activeDocumentId: null,
    chatHistory: [],
    memoryTree: createInitialMemoryTree(),
    media: [],
    projectRules: defaultProjectRules(),
    contextPolicy: defaultContextPolicy(),
    workflowPresets: defaultWorkflowPresets(),
    sections: { drafts: [], main: [], suggestions: [], issues: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function listPresentationStarters(): PresentationStarterTemplate[] {
  return Object.values(TEMPLATE_REGISTRY).map((entry) => ({
    id: entry.id,
    label: titleCase(entry.id),
    description: entry.description,
    templateId: entry.id,
    initialTitle: titleCase(entry.id),
  }));
}

export function getPresentationStarter(id: string): PresentationStarterTemplate | undefined {
  return listPresentationStarters().find((starter) => starter.id === id);
}

function buildDocumentStarterResult(
  artifact: ProjectStarterArtifact,
  starterKitId?: string,
): StarterArtifactBuildResult {
  const starter = getDocumentStarter(artifact.starterId);
  if (!starter) {
    throw new Error(`Unknown document starter: ${artifact.starterId}`);
  }

  const blueprint = listDocumentBlueprints().find((entry) => entry.id === starter.blueprintId);
  if (!blueprint) {
    throw new Error(`Missing document blueprint for starter: ${starter.id}`);
  }

  const rendered = renderDocumentFromSource({
    text: blueprint.exampleHtml,
    titleHint: artifact.initialTitle ?? starter.initialTitle ?? starter.label,
    prompt: starter.seedPrompt ?? starter.label,
    documentType: starter.documentType,
  });

  return {
    title: artifact.initialTitle ?? rendered.title,
    type: 'document',
    contentHtml: rendered.html,
    sourceMarkdown: rendered.markdown,
    themeCss: '',
    slideCount: 0,
    description: starter.description,
    starterRef: {
      artifactKey: artifact.key,
      starterId: starter.id,
      starterType: 'document',
      starterKitId,
    },
  };
}

function extractTemplateSections(doc: Document): HTMLElement[] {
  const slideSections = Array.from(doc.querySelectorAll<HTMLElement>('.slides > section'));
  return slideSections.length > 0 ? slideSections : Array.from(doc.querySelectorAll<HTMLElement>('section'));
}

async function buildPresentationStarterResult(
  artifact: ProjectStarterArtifact,
  starterKitId?: string,
): Promise<StarterArtifactBuildResult> {
  const starter = getPresentationStarter(artifact.starterId);
  if (!starter) {
    throw new Error(`Unknown presentation starter: ${artifact.starterId}`);
  }

  const html = await getTemplateHtml(starter.templateId as TemplateId);
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');
  const sections = extractTemplateSections(parsed);
  const section = sections[0]?.cloneNode(true) as HTMLElement | undefined;

  if (!section) {
    const fallbackTitle = artifact.initialTitle ?? starter.initialTitle ?? starter.label;
    return {
      title: fallbackTitle,
      type: 'presentation',
      contentHtml: `<section><h1>${fallbackTitle}</h1><p>${starter.description}</p></section>`,
      themeCss: '',
      slideCount: 1,
      description: starter.description,
      starterRef: {
        artifactKey: artifact.key,
        starterId: starter.id,
        starterType: 'presentation',
        starterKitId,
      },
    };
  }

  const title = artifact.initialTitle ?? starter.initialTitle ?? starter.label;
  const firstHeading = section.querySelector<HTMLElement>('h1, h2, h3');
  if (firstHeading) {
    firstHeading.textContent = title;
  } else {
    const heading = parsed.createElement('h1');
    heading.textContent = title;
    section.prepend(heading);
  }

  const styles = Array.from(parsed.querySelectorAll('style'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n');
  const contentHtml = section.outerHTML;

  return {
    title,
    type: 'presentation',
    contentHtml,
    themeCss: styles,
    slideCount: 1,
    description: starter.description,
    starterRef: {
      artifactKey: artifact.key,
      starterId: starter.id,
      starterType: 'presentation',
      starterKitId,
    },
  };
}

async function buildSpreadsheetStarterResult(
  artifact: ProjectStarterArtifact,
  starterKitId?: string,
): Promise<StarterArtifactBuildResult> {
  const starter = getSpreadsheetStarter(artifact.starterId);
  if (!starter) {
    throw new Error(`Unknown spreadsheet starter: ${artifact.starterId}`);
  }

  const plan = planSpreadsheetStarter(starter.seedPrompt ?? starter.label);
  const sheet = createDefaultSheet(plan.sheetName);
  const nextSchema = await replaceSheetData(sheet, plan.schema, plan.rows);
  const workbook = {
    sheets: [{
      ...sheet,
      schema: nextSchema,
    }],
    activeSheetIndex: 0,
  };

  return {
    title: artifact.initialTitle ?? starter.initialTitle ?? plan.workbookTitle,
    type: 'spreadsheet',
    contentHtml: '',
    themeCss: '',
    slideCount: 0,
    description: starter.description,
    workbook,
    starterRef: {
      artifactKey: artifact.key,
      starterId: starter.id,
      starterType: 'spreadsheet',
      starterKitId,
    },
  };
}

export async function buildStarterArtifact(
  artifact: ProjectStarterArtifact,
  starterKitId?: string,
): Promise<StarterArtifactBuildResult> {
  switch (artifact.type) {
    case 'document':
      return buildDocumentStarterResult(artifact, starterKitId);
    case 'presentation':
      return buildPresentationStarterResult(artifact, starterKitId);
    case 'spreadsheet':
      return buildSpreadsheetStarterResult(artifact, starterKitId);
    default:
      throw new Error(`Unsupported starter artifact type: ${String(artifact.type)}`);
  }
}

export function createProjectDocumentFromStarter(
  result: StarterArtifactBuildResult,
  order: number,
): ProjectDocument {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: result.title,
    type: result.type,
    contentHtml: result.contentHtml,
    sourceMarkdown: result.sourceMarkdown,
    themeCss: result.themeCss,
    slideCount: result.slideCount,
    description: result.description,
    starterRef: result.starterRef,
    chartSpecs: extractChartSpecsFromHtml(result.contentHtml),
    workbook: result.workbook,
    order,
    createdAt: now,
    updatedAt: now,
  };
}
