import styleCss from 'virtual:presentation-scaffold-css/executive-editorial-v1';
import coverTemplate from './slides/cover.html?raw';
import contextTemplate from './slides/context.html?raw';
import metricProofTemplate from './slides/metric-proof.html?raw';
import comparisonTemplate from './slides/comparison.html?raw';
import mechanismProcessTemplate from './slides/mechanism-process.html?raw';
import closingActionTemplate from './slides/closing-action.html?raw';
import checklistMarkdown from './references/checklist.md?raw';
import exampleDeckHtml from './examples/example-deck.html?raw';
import { EXECUTIVE_EDITORIAL_THEMES } from './themes';
import type {
  PresentationScaffold,
  ScaffoldSlotKind,
  ScaffoldSlideRole,
  SlideSkeleton,
  SlideSlotDefinition,
} from '@/services/presentationScaffolds/types';

function slot(
  id: string,
  label: string,
  kind: ScaffoldSlotKind,
  required: boolean,
  maxLength: number,
  placeholder?: string,
): SlideSlotDefinition {
  return {
    id,
    label,
    kind,
    required,
    maxLength,
    ...(placeholder ? { placeholder } : {}),
  };
}

function collectClasses(template: string): string[] {
  return Array.from(template.matchAll(/class=["']([^"']+)["']/gi))
    .flatMap((match) => (match[1] ?? '').split(/\s+/))
    .map((className) => className.trim())
    .filter(Boolean)
    .filter((className) => !className.includes('{{'))
    .filter((className, index, list) => list.indexOf(className) === index);
}

function skeleton(input: Omit<SlideSkeleton, 'approvedClasses'>): SlideSkeleton {
  return {
    ...input,
    approvedClasses: collectClasses(input.template),
  };
}

const titleRoles: ScaffoldSlideRole[] = ['title-scene', 'content'];
const contextRoles: ScaffoldSlideRole[] = ['context', 'problem', 'content'];
const proofRoles: ScaffoldSlideRole[] = ['metric-proof', 'recommendation', 'content'];
const comparisonRoles: ScaffoldSlideRole[] = ['comparison', 'problem', 'recommendation', 'content'];
const processRoles: ScaffoldSlideRole[] = ['mechanism', 'timeline', 'content'];
const closingRoles: ScaffoldSlideRole[] = ['closing-action', 'recommendation', 'content'];

const skeletons: SlideSkeleton[] = [
  skeleton({
    id: 'cover',
    label: 'Cover Scene',
    role: 'title-scene',
    allowedRoles: titleRoles,
    density: 'calm',
    mood: 'hero-dark',
    visualWeight: 'hero',
    layoutFamily: 'hero title lockup with motif and compact proof rail',
    template: coverTemplate,
    slots: [
      slot('kicker', 'Kicker', 'kicker', true, 48, 'Executive Brief'),
      slot('title', 'Title', 'title', true, 96, 'A clear decision path'),
      slot('subtitle', 'Subtitle', 'subtitle', true, 180, 'Frame the promise, audience, and outcome.'),
      slot('metric_value', 'Proof Value', 'metric-value', false, 14, '2026'),
      slot('metric_label', 'Proof Label', 'metric-label', false, 48, 'Decision window'),
      slot('footer', 'Footer', 'footer', false, 72, 'Prepared for review'),
    ],
  }),
  skeleton({
    id: 'context',
    label: 'Context Split',
    role: 'context',
    allowedRoles: contextRoles,
    density: 'balanced',
    mood: 'light',
    visualWeight: 'standard',
    layoutFamily: 'context panel plus insight stack',
    template: contextTemplate,
    slots: [
      slot('kicker', 'Kicker', 'kicker', true, 42, 'Context'),
      slot('title', 'Title', 'title', true, 92, 'Why this matters now'),
      slot('panel_label', 'Panel Label', 'label', true, 32, 'Signal'),
      slot('panel_title', 'Panel Title', 'title', true, 70, 'The situation has changed'),
      slot('panel_body', 'Panel Body', 'paragraph', true, 180, 'Summarize the context in one concrete statement.'),
      slot('body', 'Body', 'paragraph', true, 240, 'Explain the implication without becoming a text wall.'),
      slot('quote', 'Pull Quote', 'quote', false, 120, 'A short phrase that sharpens the point.'),
      slot('note', 'Note', 'paragraph', false, 140, 'Add a caveat, source note, or transition.'),
      slot('footer', 'Footer', 'footer', false, 72, '02 / 06'),
    ],
  }),
  skeleton({
    id: 'metric-proof',
    label: 'Metric Proof',
    role: 'metric-proof',
    allowedRoles: proofRoles,
    density: 'balanced',
    mood: 'light',
    visualWeight: 'proof',
    layoutFamily: 'three dominant metrics plus interpretation',
    template: metricProofTemplate,
    slots: [
      slot('kicker', 'Kicker', 'kicker', true, 42, 'Proof'),
      slot('title', 'Title', 'title', true, 86, 'The numbers support the move'),
      slot('metric_1_value', 'Metric 1 Value', 'metric-value', true, 16, '3x'),
      slot('metric_1_label', 'Metric 1 Label', 'metric-label', true, 86, 'Primary signal explained in plain language.'),
      slot('metric_2_value', 'Metric 2 Value', 'metric-value', true, 16, '42%'),
      slot('metric_2_label', 'Metric 2 Label', 'metric-label', true, 86, 'Second proof point tied to the decision.'),
      slot('metric_3_value', 'Metric 3 Value', 'metric-value', true, 16, '01'),
      slot('metric_3_label', 'Metric 3 Label', 'metric-label', true, 86, 'One risk or priority that must be resolved.'),
      slot('proof_label', 'Proof Label', 'label', true, 32, 'Interpretation'),
      slot('proof_statement', 'Proof Statement', 'quote', true, 150, 'What the evidence means for the audience.'),
      slot('note', 'Note', 'paragraph', false, 120, 'Short caveat or source note.'),
      slot('footer', 'Footer', 'footer', false, 72, '03 / 06'),
    ],
  }),
  skeleton({
    id: 'comparison',
    label: 'Comparison',
    role: 'comparison',
    allowedRoles: comparisonRoles,
    density: 'balanced',
    mood: 'light',
    visualWeight: 'standard',
    layoutFamily: 'two lanes and a verdict',
    template: comparisonTemplate,
    slots: [
      slot('kicker', 'Kicker', 'kicker', true, 42, 'Trade-off'),
      slot('title', 'Title', 'title', true, 86, 'Two paths, one clearer choice'),
      slot('left_label', 'Left Label', 'label', true, 28, 'Current'),
      slot('left_title', 'Left Title', 'title', true, 56, 'What we do today'),
      slot('left_body', 'Left Body', 'paragraph', true, 190, 'Describe the current path and its limitation.'),
      slot('right_label', 'Right Label', 'label', true, 28, 'Proposed'),
      slot('right_title', 'Right Title', 'title', true, 56, 'What changes next'),
      slot('right_body', 'Right Body', 'paragraph', true, 190, 'Describe the new path and why it improves the outcome.'),
      slot('verdict', 'Verdict', 'paragraph', true, 150, 'End with the decision bridge.'),
      slot('footer', 'Footer', 'footer', false, 72, '04 / 06'),
    ],
  }),
  skeleton({
    id: 'mechanism-process',
    label: 'Mechanism Process',
    role: 'mechanism',
    allowedRoles: processRoles,
    density: 'balanced',
    mood: 'dark',
    visualWeight: 'standard',
    layoutFamily: 'explanation plus three-step mechanism',
    template: mechanismProcessTemplate,
    slots: [
      slot('kicker', 'Kicker', 'kicker', true, 42, 'Mechanism'),
      slot('title', 'Title', 'title', true, 86, 'How the system creates leverage'),
      slot('body', 'Body', 'paragraph', true, 220, 'Explain the mechanism with one clear cause-and-effect path.'),
      slot('takeaway', 'Takeaway', 'quote', false, 130, 'The operating principle in one line.'),
      slot('step_1_title', 'Step 1 Title', 'step-title', true, 44, 'Prepare'),
      slot('step_1_body', 'Step 1 Body', 'step-body', true, 110, 'Define the first step and owner.'),
      slot('step_2_title', 'Step 2 Title', 'step-title', true, 44, 'Activate'),
      slot('step_2_body', 'Step 2 Body', 'step-body', true, 110, 'Define the second step and dependency.'),
      slot('step_3_title', 'Step 3 Title', 'step-title', true, 44, 'Measure'),
      slot('step_3_body', 'Step 3 Body', 'step-body', true, 110, 'Define the third step and signal.'),
      slot('footer', 'Footer', 'footer', false, 72, '05 / 06'),
    ],
  }),
  skeleton({
    id: 'closing-action',
    label: 'Closing Action',
    role: 'closing-action',
    allowedRoles: closingRoles,
    density: 'calm',
    mood: 'hero-light',
    visualWeight: 'hero',
    layoutFamily: 'closing headline plus action rail',
    template: closingActionTemplate,
    slots: [
      slot('kicker', 'Kicker', 'kicker', true, 42, 'Next'),
      slot('title', 'Title', 'title', true, 88, 'Make the decision concrete'),
      slot('subtitle', 'Subtitle', 'subtitle', true, 160, 'Close with the action, ownership, and review point.'),
      slot('action_1_title', 'Action 1 Title', 'step-title', true, 44, 'Decide'),
      slot('action_1_body', 'Action 1 Body', 'step-body', true, 110, 'State the decision or approval request.'),
      slot('action_2_title', 'Action 2 Title', 'step-title', true, 44, 'Assign'),
      slot('action_2_body', 'Action 2 Body', 'step-body', true, 110, 'Name the owner or working group.'),
      slot('action_3_title', 'Action 3 Title', 'step-title', true, 44, 'Review'),
      slot('action_3_body', 'Action 3 Body', 'step-body', true, 110, 'Set the next signal or checkpoint.'),
      slot('footer', 'Footer', 'footer', false, 72, '06 / 06'),
    ],
  }),
];

export const EXECUTIVE_EDITORIAL_SCAFFOLD: PresentationScaffold = {
  id: 'executive-editorial-v1',
  version: 1,
  label: 'Executive Editorial',
  description: 'A production presentation scaffold with locked CSS, six section skeletons, and curated direction themes.',
  bestFor: ['executive decks', 'launch narratives', 'editorial explainers', 'research summaries', 'teaching decks'],
  supportedRecipes: [
    'title-opening',
    'stage-setting',
    'editorial-explainer',
    'finance-grid',
    'metrics-summary',
    'comparison',
    'closing-action',
    'general-polished',
  ],
  supportedDirections: ['executive', 'launch', 'editorial', 'research', 'teaching'],
  supportedExportIntents: ['html', 'pdf', 'editable-pptx'],
  fallbackDirectionId: 'executive',
  fallbackThemeId: 'executive',
  themes: EXECUTIVE_EDITORIAL_THEMES,
  skeletons,
  roleSkeletonMap: {
    'title-scene': ['cover'],
    context: ['context'],
    problem: ['context', 'comparison'],
    'metric-proof': ['metric-proof'],
    comparison: ['comparison'],
    mechanism: ['mechanism-process'],
    recommendation: ['closing-action', 'metric-proof'],
    timeline: ['mechanism-process'],
    'closing-action': ['closing-action'],
    content: ['context', 'metric-proof', 'comparison', 'mechanism-process'],
  },
  styleCss,
  checklistMarkdown,
  exampleDeckHtml,
  approvedRuntimeClasses: ['fragment', 'fade-in', 'present', 'past', 'future'],
};
