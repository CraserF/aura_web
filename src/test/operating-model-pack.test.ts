import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildDesignContextSpec } from '@/services/artifactPacks';
import {
  compileOperatingModelPack,
  OPERATING_MODEL_PROJECT_DESIGN_ADAPTER,
  validateOperatingModelCompiledOutput,
  validateOperatingModelSource,
} from '@/services/artifactPacks/packs/spreadsheet/operating-model-v1/compiler';
import type { OperatingModelSource } from '@/services/artifactPacks/packs/spreadsheet/operating-model-v1/schemas';

const PACK_ROOT = 'src/services/artifactPacks/packs/spreadsheet/operating-model-v1';
const SOURCE_PATH = `${PACK_ROOT}/examples/source.json`;
const EXAMPLE_PATH = `${PACK_ROOT}/examples/example.json`;

function loadExampleSource(): OperatingModelSource {
  return JSON.parse(readFileSync(join(process.cwd(), SOURCE_PATH), 'utf8')) as OperatingModelSource;
}

function cloneSource(): OperatingModelSource {
  const source = loadExampleSource();
  return {
    ...source,
    sheets: source.sheets.map((sheet) => ({
      ...sheet,
      columns: sheet.columns.map((column) => ({ ...column })),
      rows: sheet.rows.map((row) => ({ ...row })),
      formulas: sheet.formulas.map((formula) => ({
        ...formula,
        dependsOn: [...formula.dependsOn],
      })),
      charts: sheet.charts.map((chart) => ({
        ...chart,
        yColumns: [...chart.yColumns],
      })),
      sourceNotes: [...sheet.sourceNotes],
    })),
  };
}

describe('spreadsheet/operating-model-v1 pack', () => {
  it('compiles source payloads into deterministic workbook JSON with spreadsheet theme tokens', () => {
    const source = loadExampleSource();
    const designContext = buildDesignContextSpec({
      artifactType: 'spreadsheet',
      packId: 'spreadsheet/operating-model-v1',
      packVersion: '1.0.0',
      directionId: 'data-utility',
      project: {
        projectRules: {
          markdown: '- Accent: #115e59\n- Border: #94a3b8\n.card { color: #000000 }',
          updatedAt: 1,
        },
      },
    });

    const result = compileOperatingModelPack({ source, designContext, outputMode: 'xlsx' });
    const compiled = JSON.parse(result.output.content) as {
      workbook: { sheets: Array<{ name: string; formulas: unknown[] }> };
      data: Record<string, unknown[]>;
      theme: { target: string; roles: Record<string, string> };
      charts: Array<{ id: string }>;
    };

    expect(result.validation.findings).toEqual([]);
    expect(result.validation.passed).toBe(true);
    expect(result.output.mode).toBe('xlsx');
    expect(compiled.workbook.sheets.map((sheet) => sheet.name)).toEqual(['Inputs', 'Model', 'Summary']);
    expect(compiled.workbook.sheets[1]?.formulas).toHaveLength(2);
    expect(compiled.data.inputs).toHaveLength(3);
    expect(compiled.charts.map((chart) => chart.id)).toEqual(['variance-chart']);
    expect(compiled.theme.target).toBe('spreadsheet-theme');
    expect(compiled.theme.roles.sheetTab).toBe('#115e59');
    expect(compiled.theme.roles.gridLine).toBe('#94a3b8');
    expect(result.output.content).not.toMatch(/<\/?[a-z][\s\S]*>/i);
  });

  it('materializes formula columns instead of trusting model-authored calculation values', () => {
    const source = cloneSource();
    source.sheets[1]!.rows[0] = {
      ...source.sheets[1]!.rows[0]!,
      Variance: 999999,
      Margin: -999999,
    };

    const result = compileOperatingModelPack({ source, outputMode: 'xlsx' });
    const compiled = JSON.parse(result.output.content) as {
      data: { model: Array<Record<string, unknown>> };
    };

    expect(result.validation.passed).toBe(true);
    expect(compiled.data.model[0]).toMatchObject({
      Variance: 70000,
      Margin: 560000,
    });
  });

  it('keeps the checked-in example semantically generated from the source', () => {
    const source = loadExampleSource();
    const result = compileOperatingModelPack({ source, outputMode: 'xlsx' });
    const example = JSON.parse(readFileSync(join(process.cwd(), EXAMPLE_PATH), 'utf8'));

    expect(result.validation.passed).toBe(true);
    expect(JSON.parse(result.output.content)).toEqual(example);
  });

  it('declares the spreadsheet design-token adapter and rejects unsafe token values', () => {
    expect(OPERATING_MODEL_PROJECT_DESIGN_ADAPTER).toMatchObject({
      artifactType: 'spreadsheet',
      target: 'spreadsheet-theme',
    });

    expect(OPERATING_MODEL_PROJECT_DESIGN_ADAPTER.mapColorOverrides([
      { role: 'accent', value: '#0f766e', source: 'project-design-md', label: 'Accent' },
      { role: 'border', value: '#cbd5e1', source: 'project-design-md', label: 'Border' },
      { role: 'text', value: 'var(--bad)', source: 'project-design-md', label: 'Unsafe' },
    ])).toEqual({
      sheetTab: '#0f766e',
      gridLine: '#cbd5e1',
    });
  });

  it('catches formula, chart, duplicate, row, and workbook-shape defects', () => {
    const source = cloneSource();
    source.sheets[1]!.formulas[0] = {
      ...source.sheets[1]!.formulas[0]!,
      dependsOn: ['ActualRevenue', 'MissingPlan'],
    };
    source.sheets[1]!.rows[0] = {
      ...source.sheets[1]!.rows[0]!,
      UnknownColumn: 1,
    };
    source.sheets[2]!.charts[0] = {
      ...source.sheets[2]!.charts[0]!,
      yColumns: ['MissingMetric'],
    };
    source.sheets[2]!.tableName = source.sheets[1]!.tableName;
    source.sheets[0]!.formulas = [{
      id: 'bad-input-write',
      column: 'ActualRevenue',
      expression: '"PlanRevenue" - "Cost"',
      dependsOn: ['PlanRevenue', 'Cost'],
    }];
    source.sheets[0]!.rows[1] = {
      ...source.sheets[0]!.rows[1]!,
      PlanRevenue: 'not a number',
      Cost: null,
    };

    const report = validateOperatingModelSource(source);
    const ids = report.findings.map((finding) => finding.id);

    expect(report.passed).toBe(false);
    expect(ids).toContain('formula.dependency_missing');
    expect(ids).toContain('row.unknown_column');
    expect(ids).toContain('chart.y_column_missing');
    expect(ids).toContain('sheet.table_name_duplicate');
    expect(ids).toContain('formula.output_column_not_generated');
    expect(ids).toContain('row.cell_type_mismatch');
    expect(ids).toContain('row.required_cell_null');
  });

  it('rejects unsupported formulas that bypass declared column dependencies', () => {
    const source = cloneSource();
    source.sheets[1]!.formulas[0] = {
      ...source.sheets[1]!.formulas[0]!,
      expression: 'SUM("ActualRevenue") + Sheet2!A1',
      dependsOn: ['ActualRevenue'],
    };
    source.sheets[1]!.formulas[1] = {
      ...source.sheets[1]!.formulas[1]!,
      expression: '"ActualRevenue" - "MissingCost"',
      dependsOn: ['ActualRevenue'],
    };

    const report = validateOperatingModelSource(source);
    const ids = report.findings.map((finding) => finding.id);

    expect(report.passed).toBe(false);
    expect(ids).toContain('formula.expression_unsupported');
    expect(ids).toContain('formula.expression_column_missing');
    expect(ids).toContain('formula.reference_not_declared');
  });

  it('rejects cell strings that would execute as spreadsheet formulas', () => {
    const source = cloneSource();
    source.sheets[0]!.rows[0] = {
      ...source.sheets[0]!.rows[0]!,
      Region: '=IMPORTXML("https://example.com")',
    };

    const report = validateOperatingModelSource(source);
    const ids = report.findings.map((finding) => finding.id);

    expect(report.passed).toBe(false);
    expect(ids).toContain('cell.formula_injection');
    expect(ids).toContain('source.schema_invalid');
  });

  it('rejects compiled output that is markup or lacks workbook/theme structure', () => {
    const markup = validateOperatingModelCompiledOutput('<style>.bad {}</style>');
    expect(markup.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      'compiled.markup_detected',
      'compiled.json_invalid',
    ]));

    const missingTheme = validateOperatingModelCompiledOutput(JSON.stringify({ workbook: { sheets: [] } }));
    expect(missingTheme.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      'compiled.workbook_missing',
      'compiled.theme_missing',
    ]));
  });

  it('rejects compiled workbook JSON with unsafe cells, formulas, or chart references', () => {
    const source = cloneSource();
    const result = compileOperatingModelPack({ source, outputMode: 'xlsx' });
    const compiled = JSON.parse(result.output.content);
    compiled.data.model[0].Variance = 999999;
    compiled.data.inputs[0].Region = '=IMPORTXML("https://example.com")';
    compiled.workbook.sheets[1].formulas[0].dependsOn = ['MissingPlan'];
    compiled.charts[0].yColumns = ['MissingMetric'];

    const report = validateOperatingModelCompiledOutput(JSON.stringify(compiled));
    const ids = report.findings.map((finding) => finding.id);

    expect(report.passed).toBe(false);
    expect(ids).toContain('compiled.formula_value_mismatch');
    expect(ids).toContain('compiled.cell_formula_injection');
    expect(ids).toContain('compiled.formula_dependency_missing');
    expect(ids).toContain('compiled.chart_y_column_missing');
  });

  it('rejects compiled workbook JSON with missing sheet data or invalid cell types', () => {
    const source = cloneSource();
    const result = compileOperatingModelPack({ source, outputMode: 'xlsx' });
    const compiled = JSON.parse(result.output.content);
    delete compiled.data.model;
    compiled.data.inputs[0].PlanRevenue = 'not a number';
    compiled.data.inputs[1].Cost = null;

    const report = validateOperatingModelCompiledOutput(JSON.stringify(compiled));
    const ids = report.findings.map((finding) => finding.id);

    expect(report.passed).toBe(false);
    expect(ids).toContain('compiled.sheet_data_missing');
    expect(ids).toContain('compiled.row.cell_type_mismatch');
    expect(ids).toContain('compiled.row.required_cell_null');
  });
});
