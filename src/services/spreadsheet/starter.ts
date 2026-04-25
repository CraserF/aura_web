import type { ColumnSchema } from '@/types/project';

export type SpreadsheetStarterKind =
  | 'budget'
  | 'sales'
  | 'inventory'
  | 'pipeline'
  | 'project-tracker'
  | 'custom-columns'
  | 'blank';

export interface SpreadsheetStarterPlan {
  starterKind: SpreadsheetStarterKind;
  workbookTitle: string;
  sheetName: string;
  schema: ColumnSchema[];
  rows: Array<Record<string, string | number | boolean>>;
  summary: string;
  chartHint?: string;
}

const DEFAULT_BLANK_SCHEMA: ColumnSchema[] = [
  { name: 'Item', type: 'text', nullable: true },
  { name: 'Owner', type: 'text', nullable: true },
  { name: 'Status', type: 'text', nullable: true },
];

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function sanitizeColumnName(value: string): string {
  const compact = value.trim().replace(/[^a-zA-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ');
  return compact ? titleCase(compact) : 'Column';
}

function extractColumnList(prompt: string): string[] {
  const match = prompt.match(/(?:columns|fields)\s*[:\-]?\s*([^.;\n]+)/i);
  if (!match?.[1]) return [];

  return match[1]
    .split(/,|\band\b/)
    .map((part) => sanitizeColumnName(part))
    .filter(Boolean)
    .filter((value) => !/(sample|example|demo|data|graph|chart|add)/i.test(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 8);
}

function buildBudgetPlan(): SpreadsheetStarterPlan {
  return {
    starterKind: 'budget',
    workbookTitle: 'Budget Tracker',
    sheetName: 'Budget',
    schema: [
      { name: 'Category', type: 'text', nullable: false },
      { name: 'Planned', type: 'number', nullable: true },
      { name: 'Actual', type: 'number', nullable: true },
      { name: 'Difference', type: 'number', nullable: true },
      { name: 'Notes', type: 'text', nullable: true },
    ],
    rows: [
      { Category: 'Payroll', Planned: 18000, Actual: 18250, Difference: -250, Notes: 'Team salaries' },
      { Category: 'Software', Planned: 2400, Actual: 2260, Difference: 140, Notes: 'Core SaaS stack' },
      { Category: 'Marketing', Planned: 5200, Actual: 4800, Difference: 400, Notes: 'Campaign spend' },
      { Category: 'Travel', Planned: 1200, Actual: 980, Difference: 220, Notes: 'Client meetings' },
    ],
    summary: 'Created a budget tracker with planned vs actual spending and starter rows.',
    chartHint: 'A bar chart of Planned vs Actual by Category will work well once chart binding is wired.',
  };
}

function buildSalesPlan(): SpreadsheetStarterPlan {
  return {
    starterKind: 'sales',
    workbookTitle: 'Sales Overview',
    sheetName: 'Sales Data',
    schema: [
      { name: 'Month', type: 'text', nullable: false },
      { name: 'Revenue', type: 'number', nullable: true },
      { name: 'Customers', type: 'number', nullable: true },
      { name: 'Region', type: 'text', nullable: true },
    ],
    rows: [
      { Month: 'Jan', Revenue: 42000, Customers: 48, Region: 'North America' },
      { Month: 'Feb', Revenue: 46500, Customers: 52, Region: 'North America' },
      { Month: 'Mar', Revenue: 49100, Customers: 57, Region: 'Europe' },
      { Month: 'Apr', Revenue: 53400, Customers: 63, Region: 'Europe' },
      { Month: 'May', Revenue: 55900, Customers: 67, Region: 'APAC' },
      { Month: 'Jun', Revenue: 60300, Customers: 74, Region: 'APAC' },
    ],
    summary: 'Created a sales table with example monthly revenue and customer counts.',
    chartHint: 'This dataset is ready for a monthly revenue line or bar chart.',
  };
}

function buildInventoryPlan(): SpreadsheetStarterPlan {
  return {
    starterKind: 'inventory',
    workbookTitle: 'Inventory Tracker',
    sheetName: 'Inventory',
    schema: [
      { name: 'SKU', type: 'text', nullable: false },
      { name: 'Item', type: 'text', nullable: false },
      { name: 'Category', type: 'text', nullable: true },
      { name: 'On Hand', type: 'number', nullable: true },
      { name: 'Reorder Level', type: 'number', nullable: true },
      { name: 'Status', type: 'text', nullable: true },
    ],
    rows: [
      { SKU: 'A-102', Item: 'Wireless Mouse', Category: 'Accessories', 'On Hand': 84, 'Reorder Level': 30, Status: 'Healthy' },
      { SKU: 'A-118', Item: 'USB-C Dock', Category: 'Accessories', 'On Hand': 22, 'Reorder Level': 25, Status: 'Reorder' },
      { SKU: 'L-044', Item: 'Laptop Stand', Category: 'Office', 'On Hand': 47, 'Reorder Level': 20, Status: 'Healthy' },
      { SKU: 'M-210', Item: '4K Monitor', Category: 'Hardware', 'On Hand': 12, 'Reorder Level': 10, Status: 'Watch' },
    ],
    summary: 'Created an inventory tracker with starter stock levels and reorder flags.',
  };
}

function buildPipelinePlan(): SpreadsheetStarterPlan {
  return {
    starterKind: 'pipeline',
    workbookTitle: 'Lead Pipeline',
    sheetName: 'Pipeline',
    schema: [
      { name: 'Company', type: 'text', nullable: false },
      { name: 'Contact', type: 'text', nullable: true },
      { name: 'Stage', type: 'text', nullable: true },
      { name: 'Deal Value', type: 'number', nullable: true },
      { name: 'Close Month', type: 'text', nullable: true },
    ],
    rows: [
      { Company: 'Northwind Labs', Contact: 'Maya Chen', Stage: 'Qualified', 'Deal Value': 18000, 'Close Month': 'May' },
      { Company: 'Acme Retail', Contact: 'Jordan Bell', Stage: 'Proposal', 'Deal Value': 26500, 'Close Month': 'Jun' },
      { Company: 'Summit AI', Contact: 'Priya Singh', Stage: 'Negotiation', 'Deal Value': 41000, 'Close Month': 'Jun' },
      { Company: 'Blue Harbor', Contact: 'Alex Kim', Stage: 'Discovery', 'Deal Value': 9500, 'Close Month': 'Jul' },
    ],
    summary: 'Created a lead pipeline sheet with starter opportunities and deal stages.',
  };
}

function buildProjectPlan(): SpreadsheetStarterPlan {
  return {
    starterKind: 'project-tracker',
    workbookTitle: 'Project Tracker',
    sheetName: 'Tasks',
    schema: [
      { name: 'Task', type: 'text', nullable: false },
      { name: 'Owner', type: 'text', nullable: true },
      { name: 'Status', type: 'text', nullable: true },
      { name: 'Due Date', type: 'text', nullable: true },
      { name: 'Priority', type: 'text', nullable: true },
    ],
    rows: [
      { Task: 'Finalize requirements', Owner: 'Callum', Status: 'Done', 'Due Date': '2026-04-25', Priority: 'High' },
      { Task: 'Create design review', Owner: 'Mina', Status: 'In Progress', 'Due Date': '2026-04-27', Priority: 'High' },
      { Task: 'Prepare stakeholder demo', Owner: 'Luca', Status: 'Planned', 'Due Date': '2026-04-30', Priority: 'Medium' },
      { Task: 'QA launch checklist', Owner: 'Sam', Status: 'Planned', 'Due Date': '2026-05-02', Priority: 'Medium' },
    ],
    summary: 'Created a project tracker with starter tasks and owners.',
  };
}

function buildCustomColumnPlan(columns: string[], wantsExampleData: boolean): SpreadsheetStarterPlan {
  const schema: ColumnSchema[] = columns.map((column) => ({
    name: column,
    type: /(amount|revenue|cost|price|total|count|score|budget|value)/i.test(column) ? 'number' : 'text',
    nullable: true,
  }));

  const rows = wantsExampleData
    ? [
        Object.fromEntries(schema.map((column, index) => [column.name, column.type === 'number' ? (index + 1) * 10 : `${column.name} 1`])),
        Object.fromEntries(schema.map((column, index) => [column.name, column.type === 'number' ? (index + 2) * 12 : `${column.name} 2`])),
        Object.fromEntries(schema.map((column, index) => [column.name, column.type === 'number' ? (index + 3) * 14 : `${column.name} 3`])),
      ]
    : [];

  return {
    starterKind: 'custom-columns',
    workbookTitle: `${schema[0]?.name ?? 'Custom'} Table`,
    sheetName: 'Sheet Design',
    schema,
    rows,
    summary: wantsExampleData
      ? `Created a custom table with columns ${columns.join(', ')} and starter example rows.`
      : `Created a custom table with columns ${columns.join(', ')}.`,
  };
}

function buildBlankPlan(): SpreadsheetStarterPlan {
  return {
    starterKind: 'blank',
    workbookTitle: 'Starter Spreadsheet',
    sheetName: 'Starter Sheet',
    schema: DEFAULT_BLANK_SCHEMA,
    rows: [],
    summary: 'Created a blank starter sheet you can fill in or refine with another prompt.',
  };
}

export function canCreateSpreadsheetFromPrompt(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  return hasAny(normalized, ['create', 'make', 'build', 'start', 'generate', 'design', 'draft']);
}

export function planSpreadsheetStarter(prompt: string): SpreadsheetStarterPlan {
  const normalized = prompt.toLowerCase();
  const customColumns = extractColumnList(prompt);
  const wantsExampleData = hasAny(normalized, ['sample', 'example', 'demo', 'starter', 'graph', 'chart']);

  if (hasAny(normalized, ['budget', 'expense', 'spend'])) {
    return buildBudgetPlan();
  }

  if (hasAny(normalized, ['sales', 'revenue', 'forecast']) || (hasAny(normalized, ['graph', 'chart']) && !hasAny(normalized, ['inventory', 'budget']))) {
    return buildSalesPlan();
  }

  if (hasAny(normalized, ['inventory', 'stock', 'sku'])) {
    return buildInventoryPlan();
  }

  if (hasAny(normalized, ['lead', 'pipeline', 'crm'])) {
    return buildPipelinePlan();
  }

  if (hasAny(normalized, ['project', 'task', 'roadmap', 'tracker'])) {
    return buildProjectPlan();
  }

  if (customColumns.length >= 2) {
    return buildCustomColumnPlan(customColumns, wantsExampleData);
  }

  return buildBlankPlan();
}
