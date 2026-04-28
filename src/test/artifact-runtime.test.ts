import { describe, expect, it } from 'vitest';

import {
  buildArtifactRunPlan,
  DOCUMENT_RUNTIME_SHARED_MODULE_CLASSES,
  DOCUMENT_RUNTIME_SHELL_CSS,
} from '@/services/artifactRuntime';
import {
  artifactRunEventToWorkflowEvent,
  createArtifactRunEvent,
} from '@/services/artifactRuntime/events';
import {
  finalizeStaticPresentationRuntime,
  repairPresentationFragmentHtml,
  repairQueuedPresentationSlideFragments,
  repairPresentationRuntimeOutput,
  validatePresentationRuntimeOutput,
} from '@/services/artifactRuntime/presentationRuntime';
import { validatePresentationViewportContract } from '@/services/artifactRuntime/presentationViewport';
import { buildSlideBriefsFromRunPlan } from '@/services/artifactRuntime/presentation';
import {
  attachDocumentRuntimeParts,
  applyDocumentRuntimeModuleEdits,
  assembleDocumentRuntimeHtml,
  buildDocumentRuntimeModulePrompt,
  buildDocumentRuntimeModuleRepairPrompt,
  buildDocumentRuntimeOutlinePrompt,
  buildDocumentRuntimePartPrompt,
  buildDocumentRuntimeTelemetry,
  canRunQueuedDocumentRuntime,
  finalizeDocumentRuntimeHtml,
  repairDocumentRuntimeModules,
  repairDocumentRuntimeOutput,
  repairDocumentRuntimeStructure,
  resolveDocumentRuntimeEditModules,
  runDocumentRuntimeGeneration,
  runDocumentRuntimeOrchestrator,
  validateDocumentRuntimeModules,
  validateDocumentRuntimeOutput,
} from '@/services/artifactRuntime/documentRuntime';
import type { PlanResult } from '@/services/ai/workflow/agents/planner';

describe('ArtifactRuntime plan', () => {
  it('creates one authoritative presentation run plan with design manifest, parts, and gates', () => {
    const plan = buildArtifactRunPlan({
      runId: 'run-1',
      prompt: 'Create 3 slides: opening thesis, market gap, next steps',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    expect(plan.version).toBe(1);
    expect(plan.requestKind).toBe('batch');
    expect(plan.queueMode).toBe('sequential');
    expect(plan.templateGuidance).toBe(plan.workflow.templateGuidance);
    expect(plan.workflow.requestKind).toBe('batch');
    expect(plan.roles).toEqual(['planner', 'design-director', 'generator', 'validator', 'repairer', 'finalizer']);
    expect(plan.providerPolicy.mode).toBe('frontier-quality');
    expect(plan.qualityBar).toEqual(expect.objectContaining({
      artifactType: 'presentation',
      tier: 'premium',
    }));
    expect(plan.qualityBar.signals.map((signal) => signal.id)).toContain('visual-richness');
    expect(plan.qualityBar.requiredComponentVariety).toContain('varied slide roles');
    expect(plan.designManifest.typography.coverH1Px).toBe('76-96');
    expect(plan.designManifest.motionBudget.reducedMotionRequired).toBe(true);
    expect(plan.workQueue).toHaveLength(3);
    expect(plan.presentationNarrativePlan).toEqual(expect.objectContaining({
      promise: expect.stringContaining('analytical reviewers'),
      arc: expect.stringContaining('Open with a strong promise'),
      visualMotif: expect.stringContaining(plan.designManifest.colors.accent),
    }));
    expect(plan.presentationNarrativePlan?.slideRoles.map((slide) => slide.role)).toEqual([
      'title-scene',
      'problem',
      'closing-action',
    ]);
    expect(plan.workQueue[0]?.presentationSlideBlueprint).toEqual(expect.objectContaining({
      role: 'title-scene',
      layoutPattern: expect.stringContaining('title scene'),
      motifInstruction: expect.stringContaining('Establish the reusable motif'),
    }));
    expect(plan.workQueue[1]?.presentationSlideBlueprint).toEqual(expect.objectContaining({
      continuityInstruction: expect.stringContaining('Preserve shared tokens'),
    }));
    expect(plan.validationGates[0]?.checks).toContain('Slide count matches assembled section count.');
    expect(plan.validationGates.map((gate) => gate.id)).toContain('presentation-excellence-contract');

    const slideBriefs = buildSlideBriefsFromRunPlan(plan);
    expect(slideBriefs.map((brief) => brief.title)).toEqual([
      'Opening thesis',
      'Market gap',
      'Next steps',
    ]);
    expect(slideBriefs[0]?.visualGuidance).toContain('Slide role: title-scene');
    expect(slideBriefs[1]?.contentGuidance).toContain('Narrative beat:');
  });

  it('uses constrained provider policy for local presentation generation', () => {
    const plan = buildArtifactRunPlan({
      runId: 'run-local',
      prompt: 'Create a polished title slide about the launch plan',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'ollama',
      providerModel: 'llama3.2',
      allowFullRegeneration: false,
    });

    expect(plan.providerPolicy).toMatchObject({
      tier: 'local-best-effort',
      mode: 'local-constrained',
      secondaryEvaluation: 'skip',
      generationGranularity: 'part',
    });
    expect(plan.qualityBar.tier).toBe('structured-premium-lite');
    expect(plan.qualityBar.polishingBudget.llmPasses).toBe(0);
    expect(plan.designManifest.motionBudget.maxAnimatedSystems).toBe(1);
    expect(plan.cancellation.source).toBe('user-only');
  });

  it('expands document runtime plans into outline, module, and validation parts', () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-run',
      prompt: 'Create an executive briefing document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });

    const parts = attachDocumentRuntimeParts({
      runPlan: plan,
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      recommendedModules: ['hero summary', 'KPI row', 'next-step timeline'],
      isEdit: false,
    });

    expect(parts.map((part) => part.kind)).toEqual([
      'section',
      'document-module',
      'document-module',
      'document-module',
      'validation-result',
    ]);
    expect(plan.queueMode).toBe('sequential');
    expect(plan.workQueue).toEqual(parts);
    expect(parts[1]?.documentModuleBlueprint).toEqual(expect.objectContaining({
      role: 'hero-summary',
      componentPattern: expect.any(String),
      evidenceRequirement: expect.any(String),
      visualRhythmInstruction: expect.any(String),
    }));
    expect(parts[1]?.documentModuleBlueprint?.targetWordRange.min).toBeGreaterThan(0);
    expect(plan.workflow.queuedWorkItems.map((item) => item.targetType)).toEqual(['section', 'section', 'section', 'section']);
    expect(buildDocumentRuntimePartPrompt(parts)).toContain('DOCUMENT RUNTIME PART QUEUE');
    expect(buildDocumentRuntimePartPrompt(parts)).toContain('Create brief outline');
    expect(buildDocumentRuntimePartPrompt(parts)).toContain('[document-module-1]');
    expect(canRunQueuedDocumentRuntime({
      runPlan: plan,
      parts,
      isEdit: false,
      hasImages: false,
    })).toBe(true);
    expect(canRunQueuedDocumentRuntime({
      runPlan: plan,
      parts,
      isEdit: false,
      hasImages: true,
    })).toBe(true);
    const outlinePrompt = buildDocumentRuntimeOutlinePrompt({
      taskBrief: 'Create an executive briefing document',
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      parts,
      designFamily: 'executive-light',
    });
    expect(outlinePrompt).toContain('ARTIFACT RUNTIME CONTRACT');
    expect(outlinePrompt).toContain('DOCUMENT IFRAME CONTRACT');
    expect(outlinePrompt).toContain('DOCUMENT DESIGN FAMILY');
    expect(outlinePrompt).toContain('CONTENT BLUEPRINT TASK');
    expect(outlinePrompt).toContain('Return only a compact content blueprint');
    expect(outlinePrompt).toContain('Target words:');
    expect(outlinePrompt).toContain('no <script>');
    expect(outlinePrompt).toContain('mobile-safe stacking');
    for (const className of DOCUMENT_RUNTIME_SHARED_MODULE_CLASSES) {
      expect(outlinePrompt).toContain(className);
    }
    expect(outlinePrompt.length).toBeLessThan(3_200);
    const modulePrompt = buildDocumentRuntimeModulePrompt({
      taskBrief: 'Create an executive briefing document',
      documentType: 'brief',
      outline: 'Thesis and module list.',
      part: parts[1]!,
      designFamily: 'executive-light',
    });
    expect(modulePrompt).toContain('data-runtime-part="document-module-1"');
    expect(modulePrompt).toContain('Runtime module blueprint');
    expect(modulePrompt).toContain('Evidence:');
    expect(modulePrompt).toContain('doc-kpi-row');
    expect(modulePrompt).toContain('doc-sidebar-layout');
    for (const className of DOCUMENT_RUNTIME_SHARED_MODULE_CLASSES) {
      expect(modulePrompt).toContain(className);
    }
    expect(modulePrompt).toContain('mobile-safe');
    expect(modulePrompt).toContain('remote assets');
    expect(modulePrompt).not.toContain('TEMPLATE EXAMPLES');
    expect(modulePrompt.length).toBeLessThan(3_500);
  });

  it('selects document runtime generation mode inside the runtime helper', async () => {
    const events: unknown[] = [];
    const calls: string[] = [];

    const queuedEdit = await runDocumentRuntimeGeneration({
      useQueuedDocumentRuntime: true,
      useQueuedDocumentEditRuntime: true,
      queuedCreatePartCount: 3,
      queuedEditModuleCount: 1,
      onEvent: (event) => events.push(event),
      runQueuedEdit: async () => {
        calls.push('queued-edit');
        return { rawContent: 'edit', renderedHtml: '<main>Edit</main>', firstPreviewAt: 12 };
      },
      runQueuedCreate: async () => {
        calls.push('queued-create');
        return { rawContent: 'create', renderedHtml: '<main>Create</main>' };
      },
      runSingleStream: async () => {
        calls.push('single-stream');
        return { rawContent: 'single', renderedHtml: '<main>Single</main>' };
      },
    });

    expect(queuedEdit).toEqual({
      rawContent: 'edit',
      renderedHtml: '<main>Edit</main>',
      firstPreviewAt: 12,
      usedQueuedDocumentEdit: true,
      runMode: 'queued-edit',
      completedPartCount: 1,
      selectedMode: 'queued-runtime-edit',
    });
    expect(calls).toEqual(['queued-edit']);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: 'Updating targeted document modules…',
    }));

    const queuedCreate = await runDocumentRuntimeGeneration({
      useQueuedDocumentRuntime: true,
      useQueuedDocumentEditRuntime: false,
      queuedCreatePartCount: 3,
      queuedEditModuleCount: 0,
      onEvent: (event) => events.push(event),
      runQueuedEdit: async () => {
        throw new Error('edit should not run');
      },
      runQueuedCreate: async () => ({ rawContent: 'create', renderedHtml: '<main>Create</main>' }),
      runSingleStream: async () => {
        throw new Error('single should not run');
      },
    });

    expect(queuedCreate.runMode).toBe('queued-create');
    expect(queuedCreate.completedPartCount).toBe(3);
  });

  it('assembles queued document module drafts into a runtime shell', () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-assemble-run',
      prompt: 'Create an executive briefing document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const parts = attachDocumentRuntimeParts({
      runPlan: plan,
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      recommendedModules: ['hero summary', 'KPI row'],
      isEdit: false,
    });

    const html = assembleDocumentRuntimeHtml({
      title: 'Queued Document',
      outline: '- Thesis\n- Hero summary\n- KPI row',
      parts,
      modules: [{
        partId: 'document-module-1',
        html: '<section><p>The module draft is intentionally missing a heading but contains useful detail.</p></section>',
      }],
    });
    const finalized = finalizeDocumentRuntimeHtml({ html, title: 'Queued Document' });
    const validation = validateDocumentRuntimeModules(finalized.html, parts);

    expect(finalized.html).toContain('class="doc-section doc-runtime-outline"');
    expect(finalized.html).toContain('data-runtime-part="document-module-1"');
    expect(finalized.html).toContain('data-runtime-part="document-module-2"');
    expect(finalized.html).toContain('<h2>Hero summary</h2>');
    expect(validation.passed).toBe(true);
  });

  it('reports module-specific validation issues for targeted repair', () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-module-issue-run',
      prompt: 'Create an executive briefing document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const parts = attachDocumentRuntimeParts({
      runPlan: plan,
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      recommendedModules: ['hero summary', 'KPI row'],
      isEdit: false,
    });
    const validation = validateDocumentRuntimeModules(
      '<main class="doc-shell"><section data-runtime-part="document-module-1"><p>tiny</p></section></main>',
      parts,
    );

    expect(validation.passed).toBe(false);
    expect(validation.moduleIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        partId: 'document-module-1',
        reason: 'empty',
        severity: 'blocking',
      }),
      expect.objectContaining({
        partId: 'document-module-1',
        reason: 'headingless',
        severity: 'advisory',
      }),
      expect.objectContaining({
        partId: 'document-module-2',
        reason: 'missing',
        severity: 'blocking',
      }),
    ]));

    const repairPrompt = buildDocumentRuntimeModuleRepairPrompt({
      taskBrief: 'Create an executive briefing document',
      documentType: 'brief',
      part: parts[1]!,
      issues: validation.moduleIssues?.filter((issue) => issue.partId === 'document-module-1') ?? [],
      designFamily: 'executive-light',
      existingModuleHtml: '<section data-runtime-part="document-module-1"><p>tiny</p></section>',
    });
    expect(repairPrompt).toContain('Repair one failed document module fragment');
    expect(repairPrompt).toContain('VALIDATOR FEEDBACK');
    expect(repairPrompt).toContain('empty');
    expect(repairPrompt).toContain('data-runtime-part="document-module-1"');
    expect(repairPrompt).toContain('fix only the failed module issues');
    expect(repairPrompt.length).toBeLessThan(3_500);
  });

  it('resolves targeted document edits to runtime modules and applies module-local replacements', () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-edit-module-run',
      prompt: 'Update the risk section',
      artifactType: 'document',
      operation: 'edit',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const parts = attachDocumentRuntimeParts({
      runPlan: plan,
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      recommendedModules: ['executive summary', 'risk section'],
      isEdit: true,
    });
    const existingHtml = `<main class="doc-shell">
      <section class="doc-section" data-runtime-part="document-module-1"><h2>Executive summary</h2><p>Keep this summary unchanged.</p></section>
      <section class="doc-section" data-runtime-part="document-module-2"><h2>Risk section</h2><p>Old risk language with mitigation gaps.</p></section>
    </main>`;

    const matches = resolveDocumentRuntimeEditModules({
      existingHtml,
      parts,
      targets: [{
        selector: { type: 'document-block', value: 'risk' },
        artifactType: 'document',
        label: 'Risk section',
        matchedText: 'Old risk language with mitigation gaps.',
      }],
    });

    expect(matches.map((match) => match.part.id)).toEqual(['document-module-2']);
    const editedHtml = applyDocumentRuntimeModuleEdits({
      existingHtml,
      parts,
      modules: [{
        partId: 'document-module-2',
        html: '<section><h2>Risk section</h2><p>Updated risk language with clearer owners.</p></section>',
      }],
    });

    expect(editedHtml).toContain('Keep this summary unchanged.');
    expect(editedHtml).toContain('Updated risk language with clearer owners.');
    expect(editedHtml).not.toContain('Old risk language');
    expect(validateDocumentRuntimeModules(editedHtml, parts).passed).toBe(true);
  });

  it('applies queued module repair fragments by appending missing modules', () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-repair-append-run',
      prompt: 'Repair the missing module',
      artifactType: 'document',
      operation: 'edit',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const parts = attachDocumentRuntimeParts({
      runPlan: plan,
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      recommendedModules: ['executive summary', 'risk section'],
      isEdit: true,
    });
    const existingHtml = '<main class="doc-shell"><section data-runtime-part="document-module-1"><h2>Executive summary</h2><p>Existing summary stays.</p></section></main>';

    const repairedHtml = applyDocumentRuntimeModuleEdits({
      existingHtml,
      parts,
      modules: [{
        partId: 'document-module-2',
        html: '<section><h2>Risk section</h2><p>Repaired risk section with owners and timing.</p></section>',
      }],
    });

    expect(repairedHtml).toContain('Existing summary stays.');
    expect(repairedHtml).toContain('data-runtime-part="document-module-2"');
    expect(repairedHtml).toContain('Repaired risk section with owners and timing.');
    expect(validateDocumentRuntimeModules(repairedHtml, parts).passed).toBe(true);
  });

  it('repairs missing document runtime module wrappers before final QA', () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-module-run',
      prompt: 'Create an executive briefing document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const parts = attachDocumentRuntimeParts({
      runPlan: plan,
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      recommendedModules: ['hero summary', 'KPI row', 'next-step timeline'],
      isEdit: false,
    });
    const html = `<main class="doc-shell">
      <h1>Executive Brief</h1>
      <section><p>The opening module has enough substance to be mapped into the runtime queue.</p></section>
    </main>`;
    const validation = validateDocumentRuntimeModules(html, parts);
    const events: unknown[] = [];

    const repair = repairDocumentRuntimeModules({
      html,
      parts,
      validation,
      runPlan: plan,
      onEvent: (event) => events.push(event),
    });

    expect(validation.passed).toBe(false);
    expect(repair.repaired).toBe(true);
    expect(repair.repairCount).toBe(1);
    expect(repair.validation.passed).toBe(true);
    expect(repair.html).toContain('data-runtime-part="document-module-1"');
    expect(repair.html).toContain('data-runtime-part="document-module-2"');
    expect(repair.html).toContain('data-runtime-part="document-module-3"');
    expect(repair.html).toContain('<h2>KPI row</h2>');
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: 'Applying deterministic document module repair.',
    }));
  });

  it('coordinates queued module repair before deterministic document structure repair', async () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-structure-repair-run',
      prompt: 'Create an executive briefing document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const parts = attachDocumentRuntimeParts({
      runPlan: plan,
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      recommendedModules: ['hero summary'],
      isEdit: false,
    });
    const events: unknown[] = [];
    const result = await repairDocumentRuntimeStructure({
      html: '<main class="doc-shell"><section data-runtime-part="document-module-1"><p>tiny</p></section></main>',
      title: 'Executive Brief',
      parts,
      runPlan: plan,
      onEvent: (event) => events.push(event),
      sanitizeHtml: (html) => html,
      runQueuedModuleRepair: async () => {
        const html = '<main class="doc-shell"><section class="doc-section doc-runtime-module" data-runtime-part="document-module-1"><h2>Hero summary</h2><p>Repaired module content with enough substance for validation.</p></section></main>';
        return {
          html,
          repairCount: 1,
          repairedPartCount: 1,
          repaired: true,
          validation: validateDocumentRuntimeModules(html, parts),
          summary: 'Queued document module repair passed validation.',
        };
      },
    });

    expect(result.moduleRepairCount).toBe(1);
    expect(result.repairedPartCount).toBe(1);
    expect(result.validation.passed).toBe(true);
    expect(result.html).toContain('Hero summary');
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: expect.stringContaining('Document runtime module validation found'),
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: 'Queued document module repair passed validation.',
    }));
  });

  it('runs the document runtime orchestrator through generation, QA, finalization, and telemetry', async () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-orchestrator-run',
      prompt: 'Create an executive briefing document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const parts = attachDocumentRuntimeParts({
      runPlan: plan,
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      recommendedModules: ['hero summary'],
      isEdit: false,
    });
    const events: unknown[] = [];

    const result = await runDocumentRuntimeOrchestrator({
      isEdit: false,
      runtimeStartMs: 100,
      nowMs: () => 260,
      promptText: 'Create an executive briefing document',
      parts,
      runPlan: plan,
      onEvent: (event) => events.push(event),
      sanitizeHtml: (html) => html,
      generation: {
        useQueuedDocumentRuntime: false,
        useQueuedDocumentEditRuntime: false,
        queuedCreatePartCount: 1,
        queuedEditModuleCount: 0,
        onEvent: (event) => events.push(event),
        runQueuedCreate: async () => {
          throw new Error('queued create should not run');
        },
        runQueuedEdit: async () => {
          throw new Error('queued edit should not run');
        },
        runSingleStream: async () => ({
          rawContent: '# Runtime Document\nUseful runtime document body.',
          renderedHtml: '<main class="doc-shell"><h1>Runtime Document</h1><section class="doc-section doc-runtime-module" data-runtime-part="document-module-1"><h2>Hero summary</h2><p>Enough useful document detail for validation and runtime telemetry.</p></section></main>',
          firstPreviewAt: 130,
        }),
      },
      prepareGeneratedHtml: (html) => html,
      resolveTitle: () => 'Runtime Document',
      buildSourceMarkdown: (rawContent) => rawContent,
      runQueuedModuleRepair: async ({ html, validation }) => ({
        html,
        repairCount: 0,
        repairedPartCount: 0,
        repaired: false,
        validation,
        summary: 'No queued repair needed.',
      }),
    });

    expect(result.title).toBe('Runtime Document');
    expect(result.markdown).toContain('Runtime Document');
    expect(result.runtime.runMode).toBe('single-stream');
    expect(result.runtime.totalRuntimeMs).toBe(160);
    expect(result.runtime.timeToFirstPreviewMs).toBe(30);
    expect(result.runtime.validationPassed).toBe(true);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'step-start',
      stepId: 'qa',
      label: 'Checking document quality…',
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: 'Done!',
      pct: 100,
    }));
  });

  it('runs a bounded document LLM quality enrichment pass when premium quality remains low', async () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-llm-polish-run',
      prompt: 'Create an executive briefing document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    plan.qualityBar.polishingBudget.deterministicPasses = 0;
    plan.qualityBar.polishingBudget.llmPasses = 1;
    const parts = attachDocumentRuntimeParts({
      runPlan: plan,
      documentType: 'brief',
      blueprintLabel: 'Executive Brief',
      recommendedModules: ['hero summary'],
      isEdit: false,
    });
    const events: unknown[] = [];
    const deepCopy = Array.from({ length: 930 }, (_, index) => `evidence${index}`).join(' ');
    const enrichedHtml = `<style>
      body { font-size: 16px; }
      .doc-section p, .doc-section li { font-size: 16px; }
      img, table { max-width: 100%; }
      @media print { .doc-section { break-inside: avoid; } }
    </style>
    <main class="doc-shell">
      <header class="doc-header"><h1>Runtime Document</h1><p class="doc-lead">Premium decision brief with clear proof and action rhythm.</p></header>
      <section class="doc-section doc-runtime-module doc-sidebar-layout" data-runtime-part="document-module-1">
        <div class="doc-main"><h2>Hero summary</h2><p>${deepCopy}</p></div>
        <aside class="doc-aside"><strong>Decision</strong><p>Use the evidence-led path and sequence the rollout by readiness.</p></aside>
      </section>
      <section class="doc-section doc-kpi-row"><h2>Signals</h2><article class="doc-kpi"><strong>High</strong><span>Decision confidence</span></article></section>
      <section class="doc-section doc-proof-strip"><h2>Proof</h2><article class="doc-proof-item"><strong>Primary signal</strong><span>Ownership and timing are now visible.</span></article></section>
      <section class="doc-section doc-comparison"><h2>Comparison</h2><article class="doc-compare-card"><strong>Before</strong><span>Flat summary.</span></article><article class="doc-compare-card"><strong>After</strong><span>Evidence-led recommendation.</span></article></section>
      <section class="doc-section doc-timeline"><h2>Action rhythm</h2><article class="doc-timeline-item"><strong>Now</strong><span>Confirm owners.</span></article></section>
      <section class="doc-section doc-recommendation"><h2>Recommendation</h2><strong>Recommended direction</strong><p>Move forward with the structured operating model.</p></section>
      <section class="doc-section"><h2>Evidence table</h2><table class="doc-evidence-table"><thead><tr><th>Signal</th><th>Implication</th></tr></thead><tbody><tr><td>Readiness</td><td>Sequencing can start safely.</td></tr></tbody></table></section>
    </main>`;

    const result = await runDocumentRuntimeOrchestrator({
      isEdit: false,
      runtimeStartMs: 100,
      nowMs: () => 320,
      promptText: 'Create an executive briefing document',
      parts,
      runPlan: plan,
      onEvent: (event) => events.push(event),
      sanitizeHtml: (html) => html,
      generation: {
        useQueuedDocumentRuntime: false,
        useQueuedDocumentEditRuntime: false,
        queuedCreatePartCount: 1,
        queuedEditModuleCount: 0,
        onEvent: (event) => events.push(event),
        runQueuedCreate: async () => {
          throw new Error('queued create should not run');
        },
        runQueuedEdit: async () => {
          throw new Error('queued edit should not run');
        },
        runSingleStream: async () => ({
          rawContent: '# Runtime Document\nShort valid body.',
          renderedHtml: '<main class="doc-shell"><h1>Runtime Document</h1><section class="doc-section doc-runtime-module" data-runtime-part="document-module-1"><h2>Hero summary</h2><p>Short valid body.</p></section></main>',
          firstPreviewAt: 130,
        }),
      },
      prepareGeneratedHtml: (html) => html,
      resolveTitle: () => 'Runtime Document',
      buildSourceMarkdown: (rawContent) => rawContent,
      runQueuedModuleRepair: async ({ html, validation }) => ({
        html,
        repairCount: 0,
        repairedPartCount: 0,
        repaired: false,
        validation,
        summary: 'No queued repair needed.',
      }),
      runQualityLlmPolish: async () => ({
        html: enrichedHtml,
        repairCount: 1,
        repaired: true,
        validation: validateDocumentRuntimeOutput(enrichedHtml),
        summary: 'Bounded document quality enrichment passed validation.',
      }),
    });

    expect(result.html).toContain('doc-evidence-table');
    expect(result.runtime.qualityPolishAction).toBe('llm-polish');
    expect(result.runtime.repairCount).toBe(1);
    expect(result.runtime.qualityScore).toBeGreaterThanOrEqual(plan.qualityBar.acceptanceThresholds.minimumScore);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'step-start',
      stepId: 'quality-polish',
      label: 'Polishing quality…',
    }));
  });

  it('finalizes loose document runtime HTML into a shell before QA', () => {
    const finalized = finalizeDocumentRuntimeHtml({
      html: '<p>Loose document body.</p>',
      title: 'Runtime Shell',
    });

    expect(finalized.changed).toBe(true);
    expect(finalized.html).toContain('<style>');
    expect(finalized.html).toContain('class="doc-shell"');
    expect(finalized.html).toContain('.doc-kpi-row');
    expect(finalized.html).toContain('@media print');
    expect(finalized.html).toContain(DOCUMENT_RUNTIME_SHELL_CSS.trim().slice(0, 24));
    expect(finalized.html).toContain('<h1>Runtime Shell</h1>');
  });

  it('repairs document runtime output and records telemetry-ready validation', async () => {
    const plan = buildArtifactRunPlan({
      runId: 'doc-repair-run',
      prompt: 'Create a document',
      artifactType: 'document',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const html = '<article><p>Document body without a title or style.</p><script>bad()</script></article>';
    const validation = validateDocumentRuntimeOutput(html);
    const events: unknown[] = [];

    const repair = await repairDocumentRuntimeOutput({
      html,
      title: 'Runtime Document',
      validation,
      runPlan: plan,
      onEvent: (event) => events.push(event),
    });

    expect(validation.passed).toBe(false);
    expect(repair.repaired).toBe(true);
    expect(repair.repairCount).toBe(1);
    expect(repair.html).toContain('<style>');
    expect(repair.html).toContain('<h1>Runtime Document</h1>');
    expect(repair.html).not.toContain('<script>');
    expect(repair.validation.blockingCount).toBe(0);
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: 'Applying deterministic document repair.',
    }));

    expect(buildDocumentRuntimeTelemetry({
      runtimeStartMs: 100,
      firstPreviewAtMs: 250,
      nowMs: 700,
      validation: repair.validation,
      repairCount: repair.repairCount,
    })).toEqual({
      timeToFirstPreviewMs: 150,
      totalRuntimeMs: 600,
      validationPassed: repair.validation.passed,
      validationBlockingCount: repair.validation.blockingCount,
      validationAdvisoryCount: repair.validation.advisoryCount,
      repairCount: 1,
    });
  });

  it('validates queued presentation runtime output without requiring an LLM repair pass', () => {
    const planResult = {
      intent: 'batch_create',
      blueprint: {
        palette: {
          bg: '#ffffff',
        },
      },
    } as PlanResult;
    const html = `<style>
      :root { --bg: #ffffff; --accent: #245c5f; }
      @keyframes fade { from { opacity: .9; } to { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      .title { font-size: 80px; animation: fade 1s ease both; }
    </style>
    <section data-background-color="#ffffff"><h1 class="title">Opening Thesis</h1></section>
    <section data-background-color="#ffffff"><h2>Market Gap</h2></section>`;

    const validation = validatePresentationRuntimeOutput(html, planResult, 2);

    expect(validation.passed).toBe(true);
    expect(validation.blockingCount).toBe(0);
    expect(validation.validationByPart).toHaveLength(2);
    expect(validation.validationByPart.every((part) => part.validationPassed)).toBe(true);
    expect(validation.summary).toContain('Queued presentation runtime');
  });

  it('finalizes deterministic starter-style presentation HTML with scoped CSS and telemetry', () => {
    const finalized = finalizeStaticPresentationRuntime({
      title: 'Starter Deck',
      slideCount: 1,
      rawHtml: `<style>
        :root { --bg: #ffffff; --accent: #245c5f; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
        .title { font-size: 84px; }
      </style>
      <section data-background-color="#ffffff"><h1 class="title">Starter Deck</h1></section>`,
    });

    expect(finalized.html).toContain('@scope (.reveal .slides)');
    expect(finalized.slideCount).toBe(1);
    expect(finalized.runtime?.timeToFirstPreviewMs).toBe(0);
    expect(finalized.runtime?.repairCount).toBe(0);
    expect(finalized.runtime?.runMode).toBe('deterministic-action');
    expect(finalized.runtime?.queuedPartCount).toBe(1);
    expect(finalized.runtime?.completedPartCount).toBe(1);
    expect(finalized.runtime?.validationByPart).toContainEqual(expect.objectContaining({
      partId: 'slide-1',
      validationPassed: true,
    }));
  });

  it('adapts runtime part events into current workflow step updates', () => {
    const runtimeEvent = createArtifactRunEvent({
      runId: 'run-1',
      type: 'runtime.part-started',
      role: 'generator',
      message: 'Creating slide part',
      partId: 'design',
      pct: 25,
    });

    expect(runtimeEvent.id).toBeTruthy();
    expect(artifactRunEventToWorkflowEvent(runtimeEvent)).toEqual({
      type: 'step-update',
      stepId: 'design',
      label: 'Creating slide part',
      status: 'active',
    });
  });

  it('repairs presentation fragments without preserving unsafe wrappers or assets', () => {
    const repaired = repairPresentationFragmentHtml(`
      <!doctype html>
      <html>
        <head>
          <link rel="stylesheet" href="https://example.com/fonts.css">
          <style>
            .hero { animation: glow 1s ease; background-image: url("https://example.com/bg.png"); }
            @keyframes glow { from { opacity: .8; } to { opacity: 1; } }
          </style>
        </head>
        <body>
          <div class="reveal">
            <div class="slides">
              <section>
                <div class="slide-content"><div></div><h1>Runtime repair</h1><p></p></div>
                <img src="https://example.com/photo.png" alt="">
              </section>
            </div>
          </div>
          <script>window.bad = true;</script>
        </body>
      </html>
    `);

    expect(repaired.changed).toBe(true);
    expect(repaired.html).toContain('<style>');
    expect(repaired.html).toContain('<section data-background-color="#ffffff">');
    expect(repaired.html).toContain('prefers-reduced-motion');
    expect(repaired.html).toContain('class="slide-content"');
    expect(repaired.html).not.toMatch(/<html|<body|<script|<link|https?:\/\//i);
    expect(repaired.html).not.toContain('<p></p>');
  });

  it('records repaired validation after deterministic presentation repair', async () => {
    const plan = buildArtifactRunPlan({
      runId: 'repair-run',
      prompt: 'Create a polished presentation slide',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const planResult = {
      intent: 'create',
      blueprint: {
        palette: {
          bg: '#ffffff',
        },
      },
    } as PlanResult;
    const html = `<style>
      :root { --bg: #ffffff; --accent: #245c5f; }
      .title { font-size: 84px; animation: fade 1s ease both; }
      @keyframes fade { from { opacity: .9; } to { opacity: 1; } }
    </style>
    <section><h1 class="title">Repair Me</h1></section>`;
    const validation = validatePresentationRuntimeOutput(html, planResult, 1);
    const events: unknown[] = [];

    const repair = await repairPresentationRuntimeOutput(
      html,
      validation,
      planResult,
      1,
      plan,
      (event) => events.push(event),
    );

    expect(validation.passed).toBe(false);
    expect(repair.repaired).toBe(true);
    expect(repair.repairCount).toBe(1);
    expect(repair.validation?.passed).toBe(true);
    expect(repair.validation?.blockingCount).toBe(0);
    expect(repair.summary).toContain('passed validation');
    expect(events).toContainEqual(expect.objectContaining({ type: 'progress' }));
  });

  it('repairs queued presentation slides before whole-deck validation', () => {
    const plan = buildArtifactRunPlan({
      runId: 'queued-slide-repair-run',
      prompt: 'Create 2 slides: opening thesis, next step',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const planResult = {
      intent: 'batch_create',
      blueprint: {
        palette: {
          bg: '#ffffff',
        },
      },
    } as PlanResult;
    const html = `<style>
      :root { --bg: #ffffff; --accent: #245c5f; }
      @keyframes fade { from { opacity: .9; } to { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      .title { font-size: 84px; animation: fade 1s ease both; }
    </style>
    <section><h1 class="title">Opening Thesis</h1></section>
    <section data-background-color="#ffffff"><h2>Next Step</h2></section>`;
    const events: unknown[] = [];

    const repair = repairQueuedPresentationSlideFragments({
      html,
      planResult,
      runPlan: plan,
      onEvent: (event) => events.push(event),
    });

    expect(repair.repaired).toBe(true);
    expect(repair.repairCount).toBe(1);
    expect(repair.repairedPartCount).toBe(1);
    expect(repair.html).toContain('<section data-background-color="#ffffff"><h1 class="title">Opening Thesis</h1></section>');
    expect(repair.validationByPart).toContainEqual(expect.objectContaining({
      partId: 'slide-1',
      validationPassed: true,
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: 'Repairing slide 1 fragment.',
      partId: 'slide-1',
      runId: 'queued-slide-repair-run',
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: 'step-update',
      stepId: 'slide-1',
      label: 'Repaired slide 1 fragment.',
      status: 'done',
    }));
  });

  it('flags viewport contract risks for presentation fragments', () => {
    const validation = validatePresentationViewportContract(`
      <style>
        .deck { width: 100vw; min-width: 720px; }
        .label { font-size: 12px; }
      </style>
      <section><h1 class="label">Too Small</h1></section>
    `);

    expect(validation.passed).toBe(false);
    expect(validation.blockingCount).toBeGreaterThan(0);
    expect(validation.advisoryCount).toBeGreaterThan(0);
    expect(validation.issues.map((issue) => issue.rule)).toEqual(expect.arrayContaining([
      'viewport-units',
      'risky-min-width',
      'tiny-source-type',
      'missing-section-background',
    ]));
  });

  it('requests bounded LLM repair handoff when deterministic repair cannot recover structure', async () => {
    const plan = buildArtifactRunPlan({
      runId: 'llm-repair-run',
      prompt: 'Create a polished presentation slide',
      artifactType: 'presentation',
      operation: 'create',
      activeDocument: null,
      mode: 'execute',
      providerId: 'openai',
      providerModel: 'gpt-4o',
      allowFullRegeneration: false,
    });
    const planResult = {
      intent: 'create',
      blueprint: {
        palette: {
          bg: '#ffffff',
        },
      },
    } as PlanResult;
    const html = `<style>.title { font-size: 84px; }</style><div class="title">No section here</div>`;
    const validation = validatePresentationRuntimeOutput(html, planResult, 1);
    const events: unknown[] = [];

    const repair = await repairPresentationRuntimeOutput(
      html,
      validation,
      planResult,
      1,
      plan,
      (event) => events.push(event),
    );

    expect(validation.passed).toBe(false);
    expect(repair.repaired).toBe(false);
    expect(repair.llmRepairRequested).toBe(true);
    expect(repair.summary).toContain('bounded LLM repair handoff requested');
    expect(events).toContainEqual(expect.objectContaining({
      type: 'progress',
      message: expect.stringContaining('bounded LLM repair handoff requested'),
    }));
  });
});
