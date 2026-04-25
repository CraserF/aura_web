import type { DocumentStarterTemplate } from './types';
import {
  listDocumentBlueprints,
  type DocumentBlueprintId,
} from '@/services/ai/templates/document-blueprints';

const STARTER_OVERRIDES: Partial<Record<DocumentBlueprintId, Partial<DocumentStarterTemplate>>> = {
  'executive-brief': {
    documentType: 'brief',
    documentStylePreset: 'executive',
    initialTitle: 'Executive Brief',
    seedPrompt: 'Create an executive-ready brief with a premium summary, KPI row, and recommendation.',
  },
  'editorial-report': {
    documentType: 'report',
    documentStylePreset: 'editorial',
    initialTitle: 'Editorial Report',
    seedPrompt: 'Create an editorial report with evidence blocks and varied visual rhythm.',
  },
  'infographic-onepager': {
    documentType: 'article',
    documentStylePreset: 'infographic',
    initialTitle: 'Infographic One-Pager',
    seedPrompt: 'Create a visual one-pager with a hero band, KPI grid, and compact insights.',
  },
  'process-playbook': {
    documentType: 'notes',
    documentStylePreset: 'playbook',
    initialTitle: 'Process Playbook',
    seedPrompt: 'Create a structured playbook with sequence, checkpoints, and operational callouts.',
  },
  'research-summary': {
    documentType: 'report',
    documentStylePreset: 'research',
    initialTitle: 'Research Summary',
    seedPrompt: 'Create a concise research summary with methodology, findings, and implications.',
  },
  'proposal-board': {
    documentType: 'proposal',
    documentStylePreset: 'proposal',
    initialTitle: 'Launch Proposal',
    seedPrompt: 'Create a persuasive proposal board with the move, rationale, and next steps.',
  },
};

const DOCUMENT_STARTERS: DocumentStarterTemplate[] = listDocumentBlueprints().map((blueprint) => ({
  id: blueprint.id,
  label: blueprint.label,
  description: blueprint.description,
  blueprintId: blueprint.id,
  ...STARTER_OVERRIDES[blueprint.id],
}));

export function listDocumentStarters(): DocumentStarterTemplate[] {
  return DOCUMENT_STARTERS;
}

export function getDocumentStarter(id: string): DocumentStarterTemplate | undefined {
  return DOCUMENT_STARTERS.find((starter) => starter.id === id);
}
