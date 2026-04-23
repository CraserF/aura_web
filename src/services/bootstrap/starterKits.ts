import type { ProjectStarterKit } from './types';
import {
  getStarterKitContextPolicyOverrides,
  getStarterKitRulesMarkdown,
  getStarterKitWorkflowPresets,
} from './defaultRules';

const STARTER_KITS: ProjectStarterKit[] = [
  {
    id: 'executive-briefing',
    label: 'Executive Briefing',
    description: 'A briefing project with one executive document, one presentation, and leadership-focused rules defaults.',
    defaultProjectTitle: 'Executive Briefing',
    artifacts: [
      {
        key: 'brief',
        type: 'document',
        starterId: 'executive-brief',
        initialTitle: 'Executive Brief',
      },
      {
        key: 'deck',
        type: 'presentation',
        starterId: 'corporate',
        initialTitle: 'Executive Deck',
      },
    ],
    projectRulesMarkdown: getStarterKitRulesMarkdown('executive-briefing'),
    contextPolicyOverrides: getStarterKitContextPolicyOverrides('executive-briefing'),
    workflowPresets: getStarterKitWorkflowPresets('executive-briefing'),
  },
  {
    id: 'research-pack',
    label: 'Research Pack',
    description: 'A research project with one summary document and one structured analysis spreadsheet.',
    defaultProjectTitle: 'Research Pack',
    artifacts: [
      {
        key: 'summary',
        type: 'document',
        starterId: 'research-summary',
        initialTitle: 'Research Summary',
      },
      {
        key: 'analysis',
        type: 'spreadsheet',
        starterId: 'analysis-grid',
        initialTitle: 'Analysis Grid',
      },
    ],
    projectRulesMarkdown: getStarterKitRulesMarkdown('research-pack'),
    contextPolicyOverrides: getStarterKitContextPolicyOverrides('research-pack'),
    workflowPresets: getStarterKitWorkflowPresets('research-pack'),
  },
  {
    id: 'launch-plan',
    label: 'Launch Plan',
    description: 'A launch project with a playbook document, tracker spreadsheet, and kickoff presentation.',
    defaultProjectTitle: 'Launch Plan',
    artifacts: [
      {
        key: 'playbook',
        type: 'document',
        starterId: 'process-playbook',
        initialTitle: 'Launch Playbook',
      },
      {
        key: 'tracker',
        type: 'spreadsheet',
        starterId: 'project-tracker',
        initialTitle: 'Project Tracker',
      },
      {
        key: 'deck',
        type: 'presentation',
        starterId: 'pitch-deck',
        initialTitle: 'Launch Deck',
      },
    ],
    projectRulesMarkdown: getStarterKitRulesMarkdown('launch-plan'),
    contextPolicyOverrides: getStarterKitContextPolicyOverrides('launch-plan'),
    workflowPresets: getStarterKitWorkflowPresets('launch-plan'),
  },
];

export function listProjectStarterKits(): ProjectStarterKit[] {
  return STARTER_KITS;
}

export function getProjectStarterKit(id: string): ProjectStarterKit | undefined {
  return STARTER_KITS.find((kit) => kit.id === id);
}
