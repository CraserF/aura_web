import type { SpreadsheetStarterTemplate } from './types';

const SPREADSHEET_STARTERS: SpreadsheetStarterTemplate[] = [
  {
    id: 'budget-tracker',
    label: 'Budget Tracker',
    description: 'Starter workbook for planned vs actual spend tracking.',
    starterKind: 'budget',
    seedPrompt: 'Create a budget tracker for monthly expenses',
    initialTitle: 'Budget Tracker',
  },
  {
    id: 'sales-overview',
    label: 'Sales Overview',
    description: 'Revenue and customer starter dataset suitable for charting.',
    starterKind: 'sales',
    seedPrompt: 'Generate sample sales data that I can graph',
    initialTitle: 'Sales Overview',
  },
  {
    id: 'inventory-tracker',
    label: 'Inventory Tracker',
    description: 'Inventory starter with stock levels and reorder flags.',
    starterKind: 'inventory',
    seedPrompt: 'Create an inventory tracker with starter stock levels',
    initialTitle: 'Inventory Tracker',
  },
  {
    id: 'lead-pipeline',
    label: 'Lead Pipeline',
    description: 'Sales pipeline starter with stages and deal values.',
    starterKind: 'pipeline',
    seedPrompt: 'Create a lead pipeline tracker with sample opportunities',
    initialTitle: 'Lead Pipeline',
  },
  {
    id: 'project-tracker',
    label: 'Project Tracker',
    description: 'Task tracker starter with owners, status, and due dates.',
    starterKind: 'project',
    seedPrompt: 'Create a project tracker with starter tasks and owners',
    initialTitle: 'Project Tracker',
  },
  {
    id: 'analysis-grid',
    label: 'Analysis Grid',
    description: 'Structured research table for hypotheses, metrics, evidence, and status.',
    starterKind: 'custom-columns',
    seedPrompt: 'Design a table with columns question, metric, evidence, status and add sample data',
    initialTitle: 'Analysis Grid',
  },
  {
    id: 'blank-sheet',
    label: 'Blank Spreadsheet',
    description: 'Minimal blank sheet starter you can refine after creation.',
    starterKind: 'blank',
    seedPrompt: 'Create a blank starter spreadsheet',
    initialTitle: 'Starter Spreadsheet',
  },
];

export function listSpreadsheetStarters(): SpreadsheetStarterTemplate[] {
  return SPREADSHEET_STARTERS;
}

export function getSpreadsheetStarter(id: string): SpreadsheetStarterTemplate | undefined {
  return SPREADSHEET_STARTERS.find((starter) => starter.id === id);
}
