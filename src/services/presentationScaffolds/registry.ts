import { EXECUTIVE_EDITORIAL_SCAFFOLD } from './packs/executive-editorial-v1/manifest';
import type { ArtifactRunPlan, PresentationRecipeId, RuntimeOutputMode } from '@/services/artifactRuntime/types';
import type {
  PresentationDesignContextSpec,
  PresentationExportIntent,
  PresentationScaffold,
  PresentationScaffoldDirectionId,
  PresentationScaffoldId,
  ScaffoldTheme,
} from './types';

const SCAFFOLDS: PresentationScaffold[] = [
  EXECUTIVE_EDITORIAL_SCAFFOLD,
];

const DIRECTION_FROM_OUTPUT_MODE: Partial<Record<RuntimeOutputMode, PresentationScaffoldDirectionId>> = {
  Executive: 'executive',
  Launch: 'launch',
  Editorial: 'editorial',
  Research: 'research',
  Teaching: 'teaching',
  'Data Story': 'research',
  Proposal: 'executive',
};

const DIRECTION_FROM_RECIPE: Partial<Record<PresentationRecipeId, PresentationScaffoldDirectionId>> = {
  'title-opening': 'launch',
  'stage-setting': 'teaching',
  'editorial-explainer': 'editorial',
  'finance-grid': 'research',
  'metrics-summary': 'research',
  comparison: 'executive',
  'closing-action': 'executive',
  'general-polished': 'executive',
};

function normalizeDirection(value: string | undefined): PresentationScaffoldDirectionId | undefined {
  const raw = value?.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw.includes('launch') || raw.includes('go-to-market') || raw.includes('pitch')) return 'launch';
  if (raw.includes('editorial') || raw.includes('story') || raw.includes('magazine')) return 'editorial';
  if (raw.includes('research') || raw.includes('data') || raw.includes('analysis')) return 'research';
  if (raw.includes('teaching') || raw.includes('training') || raw.includes('workshop')) return 'teaching';
  if (raw.includes('executive') || raw.includes('board') || raw.includes('leadership')) return 'executive';
  return undefined;
}

export function parsePresentationDirectionFromRulesBlock(projectRulesBlock?: string): PresentationScaffoldDirectionId | undefined {
  if (!projectRulesBlock) return undefined;
  const visualMatch = projectRulesBlock.match(/(?:^|\n)\s*##\s*Visual Direction\s*:\s*([^\n]+)/i)
    ?? projectRulesBlock.match(/\bVisual Direction\s*:\s*([^\n;]+)/i)
    ?? projectRulesBlock.match(/(?:^|\n)\s*Direction\s*:\s*([^\n]+)/i);
  return normalizeDirection(visualMatch?.[1]);
}

export function listPresentationScaffolds(): PresentationScaffold[] {
  return SCAFFOLDS.map((scaffold) => ({
    ...scaffold,
    themes: scaffold.themes.map((theme) => ({ ...theme, tokens: { ...theme.tokens } })),
    skeletons: scaffold.skeletons.map((skeleton) => ({
      ...skeleton,
      slots: skeleton.slots.map((slot) => ({ ...slot })),
      approvedClasses: [...skeleton.approvedClasses],
    })),
  }));
}

export function getPresentationScaffold(id: string | undefined): PresentationScaffold | undefined {
  return SCAFFOLDS.find((scaffold) => scaffold.id === id);
}

export function getScaffoldTheme(scaffold: PresentationScaffold, themeId: string | undefined): ScaffoldTheme {
  return scaffold.themes.find((theme) => theme.id === themeId)
    ?? scaffold.themes.find((theme) => theme.id === scaffold.fallbackThemeId)
    ?? scaffold.themes[0]!;
}

export interface DefaultScaffoldSelectionInput {
  projectRulesBlock?: string;
  guidedOutputMode?: RuntimeOutputMode;
  presentationRecipeId?: PresentationRecipeId;
  exportIntent?: PresentationExportIntent;
}

export interface ScaffoldSelection {
  scaffold: PresentationScaffold;
  scaffoldId: PresentationScaffoldId;
  directionId: PresentationScaffoldDirectionId;
  themeId: PresentationScaffoldDirectionId;
  theme: ScaffoldTheme;
  exportIntent: PresentationExportIntent;
  designContextSpec: PresentationDesignContextSpec;
}

export function resolveDefaultScaffoldSelection(input: DefaultScaffoldSelectionInput = {}): ScaffoldSelection {
  const scaffold = EXECUTIVE_EDITORIAL_SCAFFOLD;
  const directionId =
    parsePresentationDirectionFromRulesBlock(input.projectRulesBlock)
    ?? (input.guidedOutputMode ? DIRECTION_FROM_OUTPUT_MODE[input.guidedOutputMode] : undefined)
    ?? (input.presentationRecipeId ? DIRECTION_FROM_RECIPE[input.presentationRecipeId] : undefined)
    ?? scaffold.fallbackDirectionId;
  const theme = getScaffoldTheme(scaffold, directionId);
  const exportIntent = input.exportIntent ?? 'html';

  return {
    scaffold,
    scaffoldId: scaffold.id,
    directionId,
    themeId: theme.id,
    theme,
    exportIntent,
    designContextSpec: {
      source: input.projectRulesBlock?.trim() ? 'project-rules' : 'runtime-defaults',
      directionId,
      themeId: theme.id,
      audience: 'presentation viewers who need a clear decision path',
      exportIntent,
      colorTheme: theme.colorTheme,
      notes: [
        'Scaffolded presentations use locked CSS and HTML skeletons.',
        'The model may fill declared slots only; the compiler owns classes, layout, and style.',
      ],
    },
  };
}

export function resolveScaffoldForRunPlan(runPlan: ArtifactRunPlan | undefined): ScaffoldSelection {
  const scaffold = getPresentationScaffold(runPlan?.presentationScaffoldId) ?? EXECUTIVE_EDITORIAL_SCAFFOLD;
  const directionId =
    normalizeDirection(runPlan?.presentationDirectionId)
    ?? (runPlan?.presentationRecipeId ? DIRECTION_FROM_RECIPE[runPlan.presentationRecipeId] : undefined)
    ?? scaffold.fallbackDirectionId;
  const theme = getScaffoldTheme(scaffold, runPlan?.presentationThemeId ?? directionId);
  const exportIntent = runPlan?.presentationExportIntent ?? 'html';

  return {
    scaffold,
    scaffoldId: scaffold.id,
    directionId,
    themeId: theme.id,
    theme,
    exportIntent,
    designContextSpec: runPlan?.designContextSpec ?? {
      source: 'runtime-defaults',
      directionId,
      themeId: theme.id,
      audience: runPlan?.presentationNarrativePlan?.audience ?? 'presentation viewers',
      exportIntent,
      colorTheme: theme.colorTheme,
      notes: ['Resolved from the ArtifactRunPlan scaffold fields.'],
    },
  };
}

export function isScaffoldedPresentationRun(runPlan: ArtifactRunPlan | undefined): boolean {
  return runPlan?.artifactType === 'presentation' && Boolean(runPlan.presentationScaffoldId);
}
