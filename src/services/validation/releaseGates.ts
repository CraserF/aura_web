export type ReleaseValidationLevel = 1 | 2 | 3 | 4 | 5;

export type ReleaseGateMode = 'automated' | 'manual' | 'hybrid';

export interface ReleaseGateDefinition {
  id: string;
  label: string;
  level: ReleaseValidationLevel;
  mode: ReleaseGateMode;
  purpose: string;
  commands: string[];
  requiredEvidence: string[];
  blocksRelease: boolean;
}

export interface ReleaseGateSummary {
  totalGateCount: number;
  blockingGateCount: number;
  levelsCovered: ReleaseValidationLevel[];
  automatedCommands: string[];
  manualEvidence: string[];
  blockingGateIds: string[];
}

export const VALUE_REALIGNMENT_RELEASE_GATES: ReleaseGateDefinition[] = [
  {
    id: 'unit-scaffold-guardrails',
    label: 'Unit Scaffold Guardrails',
    level: 1,
    mode: 'automated',
    purpose: 'Keep variants, layouts, slots, motion presets, SVG motifs, and document section modules typed and bounded.',
    commands: [
      'npm test -- src/test/scaffolding-guardrails.test.ts src/test/document-section-modules.test.ts',
    ],
    requiredEvidence: [
      'Passing guardrail tests for slide layout, motion, SVG motif, and document section registries.',
    ],
    blocksRelease: true,
  },
  {
    id: 'integration-release-smoke',
    label: 'Integration Release Smoke',
    level: 2,
    mode: 'automated',
    purpose: 'Prove starter variants, queued presentation generation, targeted edits, and benchmark fixtures stay wired together.',
    commands: [
      'npm test -- src/test/release-smoke.test.ts src/test/workflow-benchmark-cases.test.ts src/test/benchmark-harness.test.ts',
    ],
    requiredEvidence: [
      'Passing release smoke tests with runtime telemetry and benchmark matrix coverage.',
    ],
    blocksRelease: true,
  },
  {
    id: 'render-contracts',
    label: 'Render And Viewport Contracts',
    level: 3,
    mode: 'automated',
    purpose: 'Catch blank or structurally broken presentation/document output before manual review.',
    commands: [
      'npm test -- src/test/presentation-template-design-system.test.ts src/test/presentation-quality-checklist.test.ts src/test/document-quality-checklist.test.ts',
    ],
    requiredEvidence: [
      'Passing viewport, quality checklist, font-size, motion, and static render contract tests.',
    ],
    blocksRelease: true,
  },
  {
    id: 'local-product-benchmark',
    label: 'Local Product Benchmark',
    level: 4,
    mode: 'hybrid',
    purpose: 'Run representative presentation, document, and spreadsheet benchmark cases through local-model workflows.',
    commands: [
      'npm run typecheck:benchmark',
      'npm run benchmark:ollama',
    ],
    requiredEvidence: [
      'Ollama scorecard with summary.json and per-case telemetry/events/output artifacts.',
      'Documented classification for every fail, error, or skipped case.',
      'Browser/in-app evidence for spreadsheet cases skipped by the Node runner because Worker is unavailable.',
    ],
    blocksRelease: true,
  },
  {
    id: 'agent-in-app-visual-qa',
    label: 'Agent-In-App Visual QA',
    level: 5,
    mode: 'manual',
    purpose: 'Confirm the real app experience: progress continuity, generated quality, viewport fit, and export/readiness behavior.',
    commands: [],
    requiredEvidence: [
      'One frontier single-slide capture with diagnostics.',
      'One frontier queued-deck capture with diagnostics.',
      'One Ollama queued-deck or documented safe-budget-exhausted capture.',
      'Desktop wide, tablet portrait, mobile portrait, and mobile landscape viewport captures for reviewed artifacts.',
    ],
    blocksRelease: true,
  },
];

export function summarizeReleaseGateDefinitions(
  gates: ReleaseGateDefinition[] = VALUE_REALIGNMENT_RELEASE_GATES,
): ReleaseGateSummary {
  const levelsCovered = Array.from(new Set(gates.map((gate) => gate.level))).sort();
  const automatedCommands = gates.flatMap((gate) => gate.commands);
  const manualEvidence = gates
    .filter((gate) => gate.mode === 'manual' || gate.mode === 'hybrid')
    .flatMap((gate) => gate.requiredEvidence);
  const blockingGateIds = gates
    .filter((gate) => gate.blocksRelease)
    .map((gate) => gate.id);

  return {
    totalGateCount: gates.length,
    blockingGateCount: blockingGateIds.length,
    levelsCovered,
    automatedCommands,
    manualEvidence,
    blockingGateIds,
  };
}
