import type { DocumentType } from '@/types/project';

export interface WorkflowBenchmarkCaseDefinition {
  id: string;
  artifactType: DocumentType;
  title: string;
  caseFamily:
    | 'create'
    | 'content-edit'
    | 'style-theme'
    | 'structural-rewrite'
    | 'queued-work'
    | 'validation-export'
    | 'explain-dry-run';
  fixturePrompt: string;
  expectedFocus: string;
}

export const WORKFLOW_BENCHMARK_CASES: WorkflowBenchmarkCaseDefinition[] = [
  {
    id: 'presentation-title-opening',
    artifactType: 'presentation',
    title: 'Presentation title opening',
    caseFamily: 'create',
    fixturePrompt: 'Create a polished opening title slide for a strategic transformation briefing.',
    expectedFocus: 'Split-scene or seam-led opening composition with premium hierarchy.',
  },
  {
    id: 'presentation-stage-setting',
    artifactType: 'presentation',
    title: 'Presentation stage-setting create',
    caseFamily: 'create',
    fixturePrompt: 'Create a setting-the-stage slide that explains why the current shift matters.',
    expectedFocus: 'Context framing, scene-plus-insight composition, and editorial clarity.',
  },
  {
    id: 'presentation-narrative-create',
    artifactType: 'presentation',
    title: 'Presentation narrative create',
    caseFamily: 'create',
    fixturePrompt: 'Create a narrative keynote deck about a product relaunch.',
    expectedFocus: 'Visual hierarchy, polished cover treatment, and deck rhythm.',
  },
  {
    id: 'presentation-metrics-create',
    artifactType: 'presentation',
    title: 'Presentation metrics create',
    caseFamily: 'create',
    fixturePrompt: 'Create a metrics-heavy executive scorecard deck with a premium visual system.',
    expectedFocus: 'Data clarity without generic KPI wall repetition.',
  },
  {
    id: 'presentation-finance-grid-create',
    artifactType: 'presentation',
    title: 'Presentation finance grid create',
    caseFamily: 'create',
    fixturePrompt: 'Create a finance-grid explainer slide with layered support mechanics and a refined light visual system.',
    expectedFocus: 'Embedded mechanism visuals and structured light infographic rhythm.',
  },
  {
    id: 'presentation-style-edit',
    artifactType: 'presentation',
    title: 'Presentation style edit',
    caseFamily: 'style-theme',
    fixturePrompt: 'Restyle this deck into a cleaner executive palette while preserving content.',
    expectedFocus: 'Preserve content, improve visual identity.',
  },
  {
    id: 'presentation-queued-slides',
    artifactType: 'presentation',
    title: 'Presentation queued slides',
    caseFamily: 'queued-work',
    fixturePrompt: 'Add 3 slides: proof points, rollout plan, next steps.',
    expectedFocus: 'Per-slide queue progression and continuity.',
  },
  {
    id: 'presentation-full-rewrite',
    artifactType: 'presentation',
    title: 'Presentation full rewrite',
    caseFamily: 'structural-rewrite',
    fixturePrompt: 'Rewrite this entire deck from scratch as a sharper investor narrative.',
    expectedFocus: 'Explicit rewrite path with improved design coherence.',
  },
  {
    id: 'document-long-form-create',
    artifactType: 'document',
    title: 'Document long-form create',
    caseFamily: 'create',
    fixturePrompt: 'Create a long-form transformation report with a framed, high-quality layout.',
    expectedFocus: 'Readable layout and strong editorial structure.',
  },
  {
    id: 'document-style-edit',
    artifactType: 'document',
    title: 'Document style edit',
    caseFamily: 'style-theme',
    fixturePrompt: 'Keep the same content but restyle this document into a premium editorial brief.',
    expectedFocus: 'Preserve substance while improving typography and layout.',
  },
  {
    id: 'document-proposal-create',
    artifactType: 'document',
    title: 'Document proposal create',
    caseFamily: 'create',
    fixturePrompt: 'Create a strategy proposal board with a cleaner professional light theme.',
    expectedFocus: 'Proposal framing, proof strips, and premium light-mode structure.',
  },
  {
    id: 'document-structural-rewrite',
    artifactType: 'document',
    title: 'Document structural rewrite',
    caseFamily: 'structural-rewrite',
    fixturePrompt: 'Keep the topic but reorganize this document into a tighter executive brief structure.',
    expectedFocus: 'Structural changes without quality collapse.',
  },
  {
    id: 'document-research-create',
    artifactType: 'document',
    title: 'Document research create',
    caseFamily: 'create',
    fixturePrompt: 'Create a research summary with a refined light editorial system and tidy findings modules.',
    expectedFocus: 'Evidence-led structure and professional palette restraint.',
  },
  {
    id: 'document-readiness-export',
    artifactType: 'document',
    title: 'Document readiness/export',
    caseFamily: 'validation-export',
    fixturePrompt: 'Validate this document for export readiness and verify the blocked/override behavior.',
    expectedFocus: 'Readiness clarity and correct export gating.',
  },
  {
    id: 'spreadsheet-create',
    artifactType: 'spreadsheet',
    title: 'Spreadsheet create',
    caseFamily: 'create',
    fixturePrompt: 'Create a workbook to track regional performance.',
    expectedFocus: 'Deterministic workbook creation and clear routing.',
  },
  {
    id: 'spreadsheet-formula-query',
    artifactType: 'spreadsheet',
    title: 'Spreadsheet formula/query',
    caseFamily: 'content-edit',
    fixturePrompt: 'Add a computed margin column and create a grouped query-derived view by region.',
    expectedFocus: 'Deterministic formula and query handling.',
  },
  {
    id: 'spreadsheet-explain-dry-run',
    artifactType: 'spreadsheet',
    title: 'Spreadsheet explain/dry-run',
    caseFamily: 'explain-dry-run',
    fixturePrompt: 'Explain and dry-run a spreadsheet update without mutating the workbook.',
    expectedFocus: 'Correct non-mutating behavior and target reporting.',
  },
];
