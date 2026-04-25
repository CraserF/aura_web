import { createInitialMemoryTree } from '@/services/memory';
import {
  defaultContextPolicy,
  defaultProjectRules,
  defaultWorkflowPresets,
} from '@/services/projectRules/defaults';
import { renderDocumentFromSource } from '@/services/ai/workflow/document';
import {
  getTemplateHtml,
  type TemplateId,
} from '@/services/ai/templates';
import { sanitizeSlideHtml } from '@/services/ai/utils/sanitizeHtml';
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

const CURATED_PRESENTATION_QUICK_STARTS: PresentationStarterTemplate[] = [
  {
    id: 'corporate',
    label: 'Executive Deck',
    description: 'Professional corporate presentation for leadership briefings.',
    templateId: 'executive-briefing-light',
    initialTitle: 'Executive Deck',
  },
  {
    id: 'pitch-deck',
    label: 'Pitch Deck',
    description: 'Startup pitch deck for fundraising and investor meetings.',
    templateId: 'launch-narrative-light',
    initialTitle: 'Pitch Deck',
  },
];

export function listPresentationStarters(): PresentationStarterTemplate[] {
  return CURATED_PRESENTATION_QUICK_STARTS.map((starter) => ({ ...starter }));
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

type StarterTokenValues = Record<string, string>;

type StarterContentFactory = (input: { title: string; today: string }) => StarterTokenValues;

const TEMPLATE_STARTER_CONTENT: Partial<Record<TemplateId, StarterContentFactory>> = {
  'executive-briefing-light': ({ title, today }) => ({
    TITLE: title,
    COMPANY: title,
    SUBTITLE: 'Prepared for Leadership Review',
    DATE: today,
    PRESENTER: 'Your Name',
    PRESENTER_ROLE: 'Title, Organization',
    CONTACT_INFO: '',
    WORKSHOP_TITLE: title,
    INSTRUCTOR: 'Your Name',
    FACILITATOR_NAME: 'Your Name',
    DECISION_TITLE: 'What leadership needs to decide',
    INSIGHT_1_TITLE: 'The context is clear',
    INSIGHT_1_BODY: 'Summarize the current situation in one concise, decision-ready statement.',
    INSIGHT_2_TITLE: 'The implication matters',
    INSIGHT_2_BODY: 'Translate the signal into what changes for priorities, sequencing, or ownership.',
    INSIGHT_3_TITLE: 'The decision is focused',
    INSIGHT_3_BODY: 'Name the choice, trade-off, or approval path that needs leadership attention.',
    PRIORITY_TITLE: 'Three signals to track',
    METRIC_1_VALUE: '01',
    METRIC_1_LABEL: 'Primary decision area for this briefing.',
    METRIC_2_VALUE: '03',
    METRIC_2_LABEL: 'Priority workstreams to align before execution.',
    METRIC_3_VALUE: '1',
    METRIC_3_LABEL: 'Material risk to resolve before the next review.',
    PRIORITY_SUMMARY: 'Use this strip for the plain-language interpretation of the metrics above.',
    ACTION_TITLE: 'Recommended next move',
    ACTION_BODY: 'Close the starter deck with the action leadership should approve or refine.',
    NEXT_1_TITLE: 'Confirm the decision',
    NEXT_1_BODY: 'Agree the recommendation and the owner for the next step.',
    NEXT_2_TITLE: 'Align the evidence',
    NEXT_2_BODY: 'Replace starter placeholders with the strongest supporting signal.',
    NEXT_3_TITLE: 'Set the review point',
    NEXT_3_BODY: 'Define the timing and criteria for the next leadership checkpoint.',
  }),
  'launch-narrative-light': ({ title, today }) => ({
    TITLE: title,
    COMPANY: title,
    ONE_LINE_DESCRIPTION: 'One sentence that explains the launch, the audience, and the outcome.',
    STAGE: 'Launch',
    DATE: today,
    PRESENTER: 'Your Name',
    SUBTITLE: '',
    THESIS_TITLE: 'Why this launch wins',
    THESIS_HEADLINE: 'Make the launch path obvious',
    THESIS_BODY: 'Use this slide to connect audience need, offer clarity, and the proof that supports action.',
    PROOF_1_TITLE: 'Audience focus',
    PROOF_1_BODY: 'Define the audience segment and the need this launch serves first.',
    PROOF_2_TITLE: 'Offer clarity',
    PROOF_2_BODY: 'State the promise in simple language before adding details.',
    PROOF_3_TITLE: 'Momentum signal',
    PROOF_3_BODY: 'Name the evidence that gives the team confidence to proceed.',
    READINESS_TITLE: 'Readiness path',
    STEP_1_TITLE: 'Prepare',
    STEP_1_BODY: 'Finalize the message, owner map, and launch assets.',
    STEP_2_TITLE: 'Activate',
    STEP_2_BODY: 'Coordinate channels, stakeholders, and timing.',
    STEP_3_TITLE: 'Measure',
    STEP_3_BODY: 'Track adoption, learning, and follow-up actions.',
    READINESS_SUMMARY: 'Only launch when message, audience, and operating rhythm are aligned.',
    ACTION_TITLE: 'Move to launch',
    ACTION_BODY: 'End with the decision, sequence, and next action the team should take.',
    ACTION_1_TITLE: 'Lock the story',
    ACTION_1_BODY: 'Replace this with the final positioning statement.',
    ACTION_2_TITLE: 'Assign owners',
    ACTION_2_BODY: 'Clarify responsibility for each launch motion.',
    ACTION_3_TITLE: 'Review signals',
    ACTION_3_BODY: 'Set the first measurement checkpoint.',
  }),
  corporate: ({ title, today }) => ({
    TITLE: title,
    COMPANY: title,
    SUBTITLE: 'Prepared for Leadership Review',
    DATE: today,
    PRESENTER: 'Your Name',
    PRESENTER_ROLE: 'Title, Organization',
    CONTACT_INFO: '',
    WORKSHOP_TITLE: title,
    INSTRUCTOR: 'Your Name',
    FACILITATOR_NAME: 'Your Name',
  }),
  'pitch-deck': ({ title, today }) => ({
    TITLE: title,
    COMPANY: title,
    ONE_LINE_DESCRIPTION: 'One sentence that explains what you do.',
    STAGE: 'Seed',
    DATE: today,
    PRESENTER: 'Your Name',
    SUBTITLE: '',
  }),
};

function replaceTokens(value: string, tokens: StarterTokenValues): string {
  return value.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, token: string) => tokens[token] ?? '');
}

function replaceTokensInElement(element: HTMLElement, tokens: StarterTokenValues): void {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }
  for (const textNode of textNodes) {
    textNode.nodeValue = replaceTokens(textNode.nodeValue ?? '', tokens);
  }

  const elements = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
  for (const node of elements) {
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.value.includes('{{')) {
        node.setAttribute(attribute.name, replaceTokens(attribute.value, tokens));
      }
    }
  }
}

const STRUCTURAL_EMPTY_CLASSES = [
  'slide-content',
  'layout',
  'scene-particles',
  'particle',
  'slides',
  'reveal',
];

function isStructuralElement(element: HTMLElement): boolean {
  return STRUCTURAL_EMPTY_CLASSES.some((className) =>
    Array.from(element.classList).some((candidate) =>
      candidate === className || candidate.startsWith(`${className}-`)));
}

function hasMediaOrIconChild(element: HTMLElement): boolean {
  return Boolean(element.querySelector('img, svg, canvas, video, picture, icon, [data-icon]'));
}

function isSeparatorElement(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && (
    element.tagName.toLowerCase() === 'hr' ||
    element.classList.contains('separator') ||
    element.classList.contains('heading-divider')
  );
}

function cleanupEmptyOptionalStarterElements(section: HTMLElement): void {
  const candidates = Array.from(section.querySelectorAll<HTMLElement>('p, div'));

  for (const element of candidates) {
    if (!element.isConnected || isStructuralElement(element)) continue;
    if (element.textContent?.trim()) continue;
    if (hasMediaOrIconChild(element)) continue;

    const isParagraph = element.tagName.toLowerCase() === 'p';
    const isLeafDiv = element.tagName.toLowerCase() === 'div' && element.children.length === 0;
    if (!isParagraph && !isLeafDiv) continue;

    const nextElement = element.nextElementSibling;
    element.remove();
    if (isSeparatorElement(nextElement)) {
      nextElement.remove();
    }
  }
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
  const clonedSections = sections
    .map((entry) => entry.cloneNode(true) as HTMLElement)
    .filter(Boolean);

  if (clonedSections.length === 0) {
    const fallbackTitle = artifact.initialTitle ?? starter.initialTitle ?? starter.label;
    const contentHtml = sanitizeSlideHtml(`<section><h1>${fallbackTitle}</h1><p>${starter.description}</p></section>`);
    return {
      title: fallbackTitle,
      type: 'presentation',
      contentHtml,
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
  const firstHeading = clonedSections[0]?.querySelector<HTMLElement>('h1, h2, h3');
  if (firstHeading) {
    firstHeading.textContent = title;
  } else {
    const heading = parsed.createElement('h1');
    heading.textContent = title;
    clonedSections[0]?.prepend(heading);
  }

  const styles = Array.from(parsed.querySelectorAll('style'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n');

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const templateId = starter.templateId as TemplateId;
  const knownTokens = TEMPLATE_STARTER_CONTENT[templateId]?.({ title, today }) ?? {
    TITLE: title,
    COMPANY: title,
    DATE: today,
  };
  for (const section of clonedSections) {
    replaceTokensInElement(section, knownTokens);
    cleanupEmptyOptionalStarterElements(section);
  }

  const sectionHtml = clonedSections.map((section) => section.outerHTML).join('\n');
  const rawHtml = styles ? `<style>\n${styles}\n</style>\n${sectionHtml}` : sectionHtml;
  const contentHtml = sanitizeSlideHtml(rawHtml);

  return {
    title,
    type: 'presentation',
    contentHtml,
    themeCss: '',
    slideCount: clonedSections.length,
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
    lifecycleState: 'draft',
    order,
    createdAt: now,
    updatedAt: now,
  };
}
