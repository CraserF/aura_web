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
import { listDocumentBlueprints } from '@/services/ai/templates/document-blueprints';
import { createDefaultSheet, replaceSheetData } from '@/services/spreadsheet/workbook';
import { planSpreadsheetStarter } from '@/services/spreadsheet/starter';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { buildStaticPresentationStarterRuntime } from '@/services/artifactRuntime';
import type { StarterTokenValues } from '@/services/artifactRuntime';
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
};

async function buildPresentationStarterResult(
  artifact: ProjectStarterArtifact,
  starterKitId?: string,
): Promise<StarterArtifactBuildResult> {
  const starter = getPresentationStarter(artifact.starterId);
  if (!starter) {
    throw new Error(`Unknown presentation starter: ${artifact.starterId}`);
  }

  const title = artifact.initialTitle ?? starter.initialTitle ?? starter.label;
  const html = await getTemplateHtml(starter.templateId as TemplateId);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const templateId = starter.templateId as TemplateId;
  const knownTokens = TEMPLATE_STARTER_CONTENT[templateId]?.({ title, today }) ?? {
    TITLE: title,
    COMPANY: title,
    DATE: today,
  };

  const runtimeResult = buildStaticPresentationStarterRuntime({
    artifactKey: artifact.key,
    starterId: starter.id,
    starterLabel: starter.label,
    starterDescription: starter.description,
    templateId,
    title,
    templateHtml: html,
    tokens: knownTokens,
  });

  return {
    title,
    type: 'presentation',
    contentHtml: runtimeResult.output.html,
    themeCss: '',
    slideCount: runtimeResult.output.slideCount,
    description: starter.description,
    runtimePlan: runtimeResult.runtimePlan,
    runtime: runtimeResult.output.runtime,
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
