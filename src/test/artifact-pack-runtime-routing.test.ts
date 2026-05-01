import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { LanguageModel } from 'ai';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';
import type { PresentationOutput } from '@/services/ai/workflow/types';

import { createProjectMediaResolver } from '@/services/artifactPacks';
import { detectAnimationLevel, getTemplateBlueprint, resolveTemplatePlan } from '@/services/ai/templates';
import { buildArtifactRunPlan } from '@/services/artifactRuntime/build';
import { buildSlideBriefsFromRunPlan } from '@/services/artifactRuntime/presentation';
import { compileEditorialStagePack } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/compiler';
import { runEditorialStagePresentationEditRuntime } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/runtime';
import { validateEditorialStageSource } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/validator';
import type { EditorialStageSource } from '@/services/artifactPacks/packs/presentation/editorial-stage-v1/schemas';
import type { ProjectMediaAsset } from '@/types/project';

const batchQueueMocks = vi.hoisted(() => ({
  runBatchQueue: vi.fn(),
}));

const designerMocks = vi.hoisted(() => ({
  design: vi.fn(),
  designEdit: vi.fn(),
}));

vi.mock('@/services/ai/workflow/batchQueue', () => ({
  runBatchQueue: batchQueueMocks.runBatchQueue,
}));

vi.mock('@/services/ai/workflow/agents/designer', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/ai/workflow/agents/designer')>();
  return {
    ...original,
    design: designerMocks.design,
    designEdit: designerMocks.designEdit,
  };
});

const { runPresentationRuntime, runQueuedPresentationRuntime } = await import('@/services/artifactRuntime/presentationRuntime');

const EXAMPLE_SOURCE_PATH = 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/source.json';
const EXAMPLE_MEDIA_PATH = 'src/services/artifactPacks/packs/presentation/editorial-stage-v1/examples/media.json';

function createPlanResult(): PlanResult {
  const prompt = 'Create 2 slides: opening thesis, next move';
  const templatePlan = resolveTemplatePlan(prompt);
  const blueprint = getTemplateBlueprint(templatePlan.style);

  return {
    intent: 'batch_create',
    blocked: false,
    style: templatePlan.style,
    selectedTemplate: templatePlan.templateId,
    exemplarPackId: templatePlan.exemplarPackId,
    animationLevel: detectAnimationLevel(prompt),
    blueprint,
    enhancedPrompt: prompt,
    slideBriefs: [
      {
        index: 1,
        title: 'Opening thesis',
        contentGuidance: 'State the argument for the focused launch.',
      },
      {
        index: 2,
        title: 'Next move',
        contentGuidance: 'Close with the decision and action.',
      },
    ],
    styleManifest: templatePlan.styleManifest,
  };
}

async function createPackedDeck(): Promise<PresentationOutput> {
  const runPlan = buildArtifactRunPlan({
    runId: 'artifact-pack-source-seed',
    prompt: 'Create 2 slides: opening thesis, next move',
    artifactType: 'presentation',
    operation: 'create',
    activeDocument: null,
    providerId: 'openai',
    providerModel: 'gpt-4o',
    allowFullRegeneration: false,
  });

  return runQueuedPresentationRuntime({
    runPlan,
    planResult: createPlanResult(),
    model: {} as LanguageModel,
    input: {
      prompt: 'Create 2 slides: opening thesis, next move',
      chatHistory: [],
    },
    onEvent: vi.fn(),
    isEdit: false,
  });
}

function editPolicy() {
  return {
    mode: 'best-effort',
    maxCorrectionSteps: 0,
  } as const;
}

function cloneSource<T>(source: T): T {
  return JSON.parse(JSON.stringify(source)) as T;
}

function sourceEditManifest(source: EditorialStageSource): NonNullable<PresentationOutput['artifactManifest']> {
  return {
    packId: 'presentation/editorial-stage-v1',
    packVersion: source.packVersion,
    designDirectionId: source.directionId,
    sourcePayloadVersion: 1,
    renderer: 'presentation',
    validationStatus: 'passed',
    updatedAt: Date.now(),
  };
}

describe('artifact pack presentation runtime routing', () => {
  it('selects the editorial-stage artifact pack without enabling the legacy scaffold path', () => {
    const runPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-routing',
      prompt: 'Create 2 slides: opening thesis, next move',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(runPlan.artifactPackId).toBe('presentation/editorial-stage-v1');
    expect(runPlan.artifactPackVersion).toBe('1.0.0');
    expect(runPlan.presentationScaffoldId).toBeUndefined();
    expect(runPlan.workflow.artifactPackId).toBe('presentation/editorial-stage-v1');
    expect(buildSlideBriefsFromRunPlan(runPlan)).toHaveLength(2);
  });

  it('uses the pack compiler runtime instead of batch freeform slide generation', async () => {
    batchQueueMocks.runBatchQueue.mockReset();
    const runPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-runtime',
      prompt: 'Create 2 slides: opening thesis, next move',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    const output = await runQueuedPresentationRuntime({
      runPlan,
      planResult: createPlanResult(),
      model: {} as LanguageModel,
      input: {
        prompt: 'Create 2 slides: opening thesis, next move',
        chatHistory: [],
      },
      onEvent: vi.fn(),
      isEdit: false,
    });

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(output.html).toContain('data-pack="presentation/editorial-stage-v1"');
    expect(output.html).not.toContain('data-scaffold=');
    expect(output.artifactManifest).toEqual(expect.objectContaining({
      packId: 'presentation/editorial-stage-v1',
      packVersion: '1.0.0',
      renderer: 'presentation',
    }));
    expect(output.artifactSourcePayload).toEqual(expect.objectContaining({
      packId: 'presentation/editorial-stage-v1',
      packVersion: '1.0.0',
    }));
    expect(output.runtime?.runMode).toBe('queued-create');
  });

  it('blocks pack edit plans without source payloads instead of falling back to freeform HTML', async () => {
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.design.mockReset();
    designerMocks.designEdit.mockReset();
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-missing-source-edit',
      prompt: 'Change slide 1 title to "Sharper opening"',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const legacyHtml = '<style>.legacy-slide { color: black; }</style><section class="legacy-slide"><h1>Old title</h1></section>';

    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Change slide 1 title to "Sharper opening"',
        existingSlidesHtml: legacyHtml,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.design).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(output.reviewPassed).toBe(false);
    expect(output.html).toContain('Old title');
    expect(output.artifactManifest).toBeUndefined();
    expect(output.artifactSourcePayload).toBeUndefined();
    expect(output.runtime?.qualityDecision).toBe('blocked-by-safety');
    expect(output.runtime?.validationByPart?.[0]?.partId).toBe('artifact-pack-edit-surface');
  });

  it('binds uploaded project media during normal pack creates when the rhythm asks for visual evidence', async () => {
    batchQueueMocks.runBatchQueue.mockReset();
    const prompt = 'Create 3 slides: opening thesis, proof screenshot, closing action';
    const runPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-create-with-media',
      prompt,
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const media: ProjectMediaAsset[] = [{
      id: 'project-proof-shot',
      filename: 'project-proof-shot.png',
      mimeType: 'image/png',
      relativePath: 'media/project-proof-shot.png',
      dataUrl: 'data:image/png;base64,project-proof',
    }];
    const planResult = createPlanResult();
    planResult.slideBriefs = [
      {
        index: 1,
        title: 'Opening thesis',
        contentGuidance: 'State the argument.',
      },
      {
        index: 2,
        title: 'Proof screenshot',
        contentGuidance: 'Show the uploaded media as evidence for the recommendation.',
      },
      {
        index: 3,
        title: 'Closing action',
        contentGuidance: 'Close with the decision and next move.',
      },
    ];

    const output = await runQueuedPresentationRuntime({
      runPlan,
      planResult,
      model: {} as LanguageModel,
      input: {
        prompt,
        chatHistory: [],
        projectMedia: media,
      },
      onEvent: vi.fn(),
      isEdit: false,
    });
    const source = output.artifactSourcePayload as EditorialStageSource;

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(output.reviewPassed).toBe(true);
    expect(output.html).toContain('data-asset-id="project-proof-shot"');
    expect(output.html).toContain('<img src="data:image/png;base64,project-proof"');
    expect(source.slides.some((slide) => slide.media.some((binding) => binding.assetId === 'project-proof-shot'))).toBe(true);
  });

  it('patches manifest-backed editorial-stage source slots without calling freeform design', async () => {
    const seed = await createPackedDeck();
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.design.mockReset();
    designerMocks.designEdit.mockReset();
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-source-text-edit',
      prompt: 'Change slide 1 title to "Sharper opening"',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(editRunPlan.artifactAllowedEditSurface?.kind).toBe('text-edit');
    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Change slide 1 title to "Sharper opening"',
        existingSlidesHtml: seed.html,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: seed.artifactManifest,
        artifactSourcePayload: seed.artifactSourcePayload,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });
    const source = output.artifactSourcePayload as { slides: Array<{ slots: Record<string, string> }> };

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(output.runtime?.runMode).toBe('deterministic-action');
    expect(output.html).toContain('Sharper opening');
    expect(source.slides[0]?.slots.title).toBe('Sharper opening');
    expect(output.artifactManifest).toEqual(expect.objectContaining({
      packId: 'presentation/editorial-stage-v1',
      packVersion: '1.0.0',
      validationStatus: expect.stringMatching(/^(passed|warnings)$/),
    }));
  });

  it('routes metric label edits to the label slot rather than the metric value', async () => {
    const source = JSON.parse(readFileSync(EXAMPLE_SOURCE_PATH, 'utf8')) as EditorialStageSource;
    const media = JSON.parse(readFileSync(EXAMPLE_MEDIA_PATH, 'utf8')) as ProjectMediaAsset[];
    const seed = compileEditorialStagePack({
      source,
      outputMode: 'html',
      mediaResolver: createProjectMediaResolver(media),
    });
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.designEdit.mockReset();
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-source-metric-label-edit',
      prompt: 'Change slide 3 metric label to "of demand comes from the focused buyer"',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Change slide 3 metric label to "of demand comes from the focused buyer"',
        existingSlidesHtml: seed.output.content,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: sourceEditManifest(source),
        artifactSourcePayload: source,
        projectMedia: media,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });
    const editedSource = output.artifactSourcePayload as EditorialStageSource;

    expect(output.reviewPassed).toBe(true);
    expect(editedSource.slides[2]?.slots.metric_value).toBe('42%');
    expect(editedSource.slides[2]?.slots.metric_label).toBe('of demand comes from the focused buyer');
  });

  it('preserves numeric-leading slot replacements', async () => {
    const seed = await createPackedDeck();
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.designEdit.mockReset();
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-source-numeric-title-edit',
      prompt: 'Change slide 1 title to "2026 launch plan"',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Change slide 1 title to "2026 launch plan"',
        existingSlidesHtml: seed.html,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: seed.artifactManifest,
        artifactSourcePayload: seed.artifactSourcePayload,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });
    const editedSource = output.artifactSourcePayload as EditorialStageSource;

    expect(output.reviewPassed).toBe(true);
    expect(editedSource.slides[0]?.slots.title).toBe('2026 launch plan');
    expect(output.html).toContain('2026 launch plan');
  });

  it('repairs invalid source slot HTML and persists the cleaned source after a valid text edit', async () => {
    const seed = await createPackedDeck();
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.design.mockReset();
    designerMocks.designEdit.mockReset();
    const dirtySource = cloneSource(seed.artifactSourcePayload as EditorialStageSource);
    dirtySource.slides[0]!.slots.subtitle = 'A <strong>clean</strong> proof line for the room.';
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-source-slot-html-repair',
      prompt: 'Change slide 1 title to "Sharper repaired opening"',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(validateEditorialStageSource(dirtySource).findings.map((finding) => finding.id))
      .toContain('slot.html_detected');
    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Change slide 1 title to "Sharper repaired opening"',
        existingSlidesHtml: seed.html,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: seed.artifactManifest,
        artifactSourcePayload: dirtySource,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });
    const repairedSource = output.artifactSourcePayload as EditorialStageSource;

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(output.reviewPassed).toBe(true);
    expect(output.runtime?.runMode).toBe('deterministic-action');
    expect(output.html).toContain('Sharper repaired opening');
    expect(output.html).toContain('A clean proof line for the room.');
    expect(output.html).not.toContain('<strong>');
    expect(repairedSource.slides[0]?.slots.title).toBe('Sharper repaired opening');
    expect(repairedSource.slides[0]?.slots.subtitle).toBe('A clean proof line for the room.');
    expect(validateEditorialStageSource(repairedSource).findings.map((finding) => finding.id))
      .not.toContain('slot.html_detected');
  });

  it('fills missing required source slots and truncates overlong slots deterministically', async () => {
    const seed = await createPackedDeck();
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.design.mockReset();
    designerMocks.designEdit.mockReset();
    const dirtySource = cloneSource(seed.artifactSourcePayload as EditorialStageSource);
    delete dirtySource.slides[0]!.slots.kicker;
    dirtySource.slides[0]!.slots.subtitle = Array.from({ length: 28 }, () => 'Detailed launch proof').join(' ');
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-source-required-slot-repair',
      prompt: 'Change slide 1 title to "Filled repaired opening"',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const runEdit = () => runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Change slide 1 title to "Filled repaired opening"',
        existingSlidesHtml: seed.html,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: seed.artifactManifest,
        artifactSourcePayload: cloneSource(dirtySource),
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });

    expect(validateEditorialStageSource(dirtySource).findings.map((finding) => finding.id))
      .toEqual(expect.arrayContaining(['slot.required_missing', 'slot.too_long_for_layout']));
    const firstOutput = await runEdit();
    const secondOutput = await runEdit();
    const firstSource = firstOutput.artifactSourcePayload as EditorialStageSource;
    const secondSource = secondOutput.artifactSourcePayload as EditorialStageSource;

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(firstOutput.reviewPassed).toBe(true);
    expect(secondOutput.reviewPassed).toBe(true);
    const firstSlide = firstSource.slides[0];
    const secondSlide = secondSource.slides[0];
    if (!firstSlide || !secondSlide) throw new Error('Expected repaired source to keep the opening slide.');
    const repairedKicker = firstSlide.slots.kicker;
    const repairedSubtitle = firstSlide.slots.subtitle;
    if (typeof repairedKicker !== 'string' || typeof repairedSubtitle !== 'string') {
      throw new Error('Expected required opening slots to be repaired.');
    }
    expect(firstSlide.slots.title).toBe('Filled repaired opening');
    expect(repairedKicker).toEqual(expect.any(String));
    expect(repairedKicker.trim().length).toBeGreaterThan(0);
    expect(repairedKicker.length).toBeLessThanOrEqual(48);
    expect(repairedSubtitle.length).toBeLessThanOrEqual(180);
    expect(firstSlide.slots).toEqual(secondSlide.slots);
    expect(validateEditorialStageSource(firstSource).findings.map((finding) => finding.id))
      .not.toEqual(expect.arrayContaining(['slot.required_missing', 'slot.too_long_for_layout']));
  });

  it('appends slides to existing editorial-stage source without rebuilding existing slots', async () => {
    const seed = await createPackedDeck();
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.designEdit.mockReset();
    const seedSource = seed.artifactSourcePayload as { slides: Array<{ slideId: string; slots: Record<string, string> }> };
    const firstTitle = seedSource.slides[0]?.slots.title;
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-source-add-slide',
      prompt: 'Add one slide about the rollout checkpoint',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(editRunPlan.artifactAllowedEditSurface?.kind).toBe('add-slide');
    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Add one slide about the rollout checkpoint',
        existingSlidesHtml: seed.html,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: seed.artifactManifest,
        artifactSourcePayload: seed.artifactSourcePayload,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });
    const source = output.artifactSourcePayload as {
      rhythmPlan: unknown[];
      slides: Array<{ slideId: string; slots: Record<string, string> }>;
    };

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(source.slides).toHaveLength(seedSource.slides.length + 1);
    expect(source.rhythmPlan).toHaveLength(source.slides.length);
    expect(source.slides[0]?.slots.title).toBe(firstTitle);
    expect(new Set(source.slides.map((slide) => slide.slideId)).size).toBe(source.slides.length);
  });

  it('persists successful partial multi-slide adds at the slide cap', async () => {
    const seed = await createPackedDeck();
    const source = cloneSource(seed.artifactSourcePayload as EditorialStageSource);
    while (source.slides.length < 17) {
      const previous = source.slides[source.slides.length - 1]!;
      source.slides.push({
        ...cloneSource(previous),
        slideId: `slide-${source.slides.length + 1}`,
      });
    }
    source.rhythmPlan = source.slides.map((slide, index) => ({
      slideIndex: index + 1,
      slideId: slide.slideId,
      narrativeRole: 'Focus',
      layoutId: slide.layoutId,
      mood: slide.mood,
      density: slide.density,
      visualWeight: slide.visualWeight,
      motion: slide.motion,
      transitionPurpose: `Slide ${index + 1}`,
      mediaNeeds: [],
    }));
    const planResult = createPlanResult();
    planResult.intent = 'add_slides';
    planResult.slideBriefs = [
      { index: 18, title: 'Allowed final slide', contentGuidance: 'Add the last available slide.' },
      { index: 19, title: 'Blocked overflow slide', contentGuidance: 'This should exceed the cap.' },
    ];

    const result = await runEditorialStagePresentationEditRuntime({
      source,
      prompt: 'Add two slides',
      planResult,
      onEvent: vi.fn(),
      onSlideComplete: vi.fn(),
    });

    expect(result.changed).toBe(true);
    expect(result.source.slides).toHaveLength(18);
    expect(result.source.slides[17]?.slots.title).toBe('Allowed final slide');
  });

  it('restyles editorial-stage source by swapping direction tokens only', async () => {
    const seed = await createPackedDeck();
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.designEdit.mockReset();
    const seedSource = seed.artifactSourcePayload as { directionId: string; slides: Array<{ slots: Record<string, string> }> };
    const beforeSlots = JSON.stringify(seedSource.slides.map((slide) => slide.slots));
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-source-restyle',
      prompt: 'Restyle this deck for a launch narrative',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
      projectRulesBlock: 'Design direction: bold-editorial',
    });

    expect(editRunPlan.artifactAllowedEditSurface?.kind).toBe('restyle');
    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Restyle this deck for a launch narrative',
        existingSlidesHtml: seed.html,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: seed.artifactManifest,
        artifactSourcePayload: seed.artifactSourcePayload,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });
    const source = output.artifactSourcePayload as { directionId: string; slides: Array<{ slots: Record<string, string> }> };

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(seedSource.directionId).not.toBe('bold-editorial');
    expect(source.directionId).toBe('bold-editorial');
    expect(JSON.stringify(source.slides.map((slide) => slide.slots))).toBe(beforeSlots);
    expect(output.artifactManifest?.designDirectionId).toBe('bold-editorial');
  });

  it('blocks unsupported source-backed restructure edits instead of treating them as text edits', async () => {
    const seed = await createPackedDeck();
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.design.mockReset();
    designerMocks.designEdit.mockReset();
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-unsupported-edit',
      prompt: 'Reorder the slides so slide 2 comes first',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(editRunPlan.artifactAllowedEditSurface?.kind).toBe('unsupported');
    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Reorder the slides so slide 2 comes first',
        existingSlidesHtml: seed.html,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: seed.artifactManifest,
        artifactSourcePayload: seed.artifactSourcePayload,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.design).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(output.reviewPassed).toBe(false);
    expect(output.runtime?.qualityDecision).toBe('blocked-by-safety');
    expect(output.runtime?.qualityPolishingSkippedReason).toContain('Supported edits are text changes, add slide, and restyle');
    expect(JSON.stringify(output.runtime?.validationByPart ?? [])).toContain('Reordering, deleting, and media replacement are blocked');
    expect(output.artifactManifest).toBeUndefined();
    expect(output.artifactSourcePayload).toBeUndefined();
  });

  it('blocks media replacement requests until typed media-binding edits exist', async () => {
    const seed = await createPackedDeck();
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.design.mockReset();
    designerMocks.designEdit.mockReset();
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-media-edit-blocked',
      prompt: 'Replace slide 2 screenshot with the new proof image',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(editRunPlan.artifactAllowedEditSurface?.kind).toBe('unsupported');
    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Replace slide 2 screenshot with the new proof image',
        existingSlidesHtml: seed.html,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: seed.artifactManifest,
        artifactSourcePayload: seed.artifactSourcePayload,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(output.reviewPassed).toBe(false);
    expect(output.runtime?.qualityDecision).toBe('blocked-by-safety');
    expect(output.runtime?.qualityPolishingSkippedReason).toContain('Supported edits are text changes, add slide, and restyle');
    expect(JSON.stringify(output.runtime?.validationByPart ?? [])).toContain('media replacement are blocked');
    expect(output.artifactManifest).toBeUndefined();
  });

  it('blocks no-op source text edits so unchanged decks are not persisted as successful edits', async () => {
    const seed = await createPackedDeck();
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.design.mockReset();
    designerMocks.designEdit.mockReset();
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-no-op-text-edit',
      prompt: 'Make slide 1 title punchier',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(editRunPlan.artifactAllowedEditSurface?.kind).toBe('text-edit');
    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Make slide 1 title punchier',
        existingSlidesHtml: seed.html,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: seed.artifactManifest,
        artifactSourcePayload: seed.artifactSourcePayload,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(output.reviewPassed).toBe(false);
    expect(output.html).toBe(seed.html);
    expect(output.artifactManifest).toBeUndefined();
    expect(output.artifactSourcePayload).toBeUndefined();
    expect(output.runtime?.validationByPart?.map((part) => part.partId)).toContain('artifact-pack-source-edit');
  });

  it('threads project media through source-backed edits so real images survive recompilation', async () => {
    const source = JSON.parse(readFileSync(EXAMPLE_SOURCE_PATH, 'utf8')) as EditorialStageSource;
    const media = JSON.parse(readFileSync(EXAMPLE_MEDIA_PATH, 'utf8')) as ProjectMediaAsset[];
    const seed = compileEditorialStagePack({
      source,
      outputMode: 'html',
      mediaResolver: createProjectMediaResolver(media),
    });
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.designEdit.mockReset();
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-source-media-edit',
      prompt: 'Change slide 5 title to "Proof with the real screenshot"',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Change slide 5 title to "Proof with the real screenshot"',
        existingSlidesHtml: seed.output.content,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: {
          packId: 'presentation/editorial-stage-v1',
          packVersion: '1.0.0',
          sourcePayloadVersion: 1,
          renderer: 'presentation',
          validationStatus: 'passed',
          updatedAt: Date.now(),
        },
        artifactSourcePayload: source,
        projectMedia: media,
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(output.reviewPassed).toBe(true);
    expect(output.html).toContain('Proof with the real screenshot');
    expect(output.html).toContain('<img src="data:image/svg+xml;base64,');
    expect(output.html).not.toContain('<span>Launch proof screenshot</span>');
  });

  it('keeps unresolved required real media blocked instead of repairing it away', async () => {
    const source = JSON.parse(readFileSync(EXAMPLE_SOURCE_PATH, 'utf8')) as EditorialStageSource;
    const seed = compileEditorialStagePack({
      source,
      outputMode: 'html',
      mediaResolver: createProjectMediaResolver([]),
    });
    batchQueueMocks.runBatchQueue.mockReset();
    designerMocks.design.mockReset();
    designerMocks.designEdit.mockReset();
    const editRunPlan = buildArtifactRunPlan({
      runId: 'artifact-pack-source-required-media-blocked',
      prompt: 'Change slide 5 title to "Proof still needs real media"',
      artifactType: 'presentation',
      operation: 'edit',
      activeDocument: null,
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    const output = await runPresentationRuntime({
      model: {} as LanguageModel,
      input: {
        prompt: 'Change slide 5 title to "Proof still needs real media"',
        existingSlidesHtml: seed.output.content,
        chatHistory: [],
        artifactRunPlan: editRunPlan,
        artifactManifest: sourceEditManifest(source),
        artifactSourcePayload: source,
        projectMedia: [],
      },
      onEvent: vi.fn(),
      editCorrectionPolicy: editPolicy(),
      skipSecondaryEvaluation: true,
    });

    expect(batchQueueMocks.runBatchQueue).not.toHaveBeenCalled();
    expect(designerMocks.design).not.toHaveBeenCalled();
    expect(designerMocks.designEdit).not.toHaveBeenCalled();
    expect(output.reviewPassed).toBe(false);
    expect(output.html).toBe(seed.output.content);
    expect(output.artifactManifest).toBeUndefined();
    expect(output.artifactSourcePayload).toBeUndefined();
    expect(output.runtime?.validationPassed).toBe(false);
    expect(output.runtime?.validationBlockingCount).toBeGreaterThan(0);
    expect(output.runtime?.validationByPart?.flatMap((part) => part.rules).join('\n'))
      .toContain('unresolved asset "launch-proof-screenshot"');
  });
});
