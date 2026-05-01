import type {
  ArtifactCompiledOutput,
  ArtifactValidationFinding,
  ArtifactValidationReport,
  ArtifactValidationSeverity,
} from '@/services/artifactPacks/types';
import {
  OPERATING_MODEL_PACK_ID,
  operatingModelSourceSchema,
  type OperatingModelChart,
  type OperatingModelSheet,
  type OperatingModelSource,
} from './schemas';
import {
  evaluateOperatingModelFormulaExpression,
  extractOperatingModelFormulaReferences,
} from './formula';

const HTML_PATTERN = /<\/?[a-z][\s\S]*>/i;
const FORMULA_RISK_PATTERN = /\b(?:importxml|importhtml|hyperlink|webservice|now|rand|randbetween)\s*\(/i;
const FORMULA_UNSUPPORTED_REFERENCE_PATTERN = /(?:!|\$|\[|\]|:|https?:|@)/i;
const FORMULA_SAFE_RESIDUAL_PATTERN = /^[\s\d+\-*/().]*$/;
const SCRIPT_OR_STYLE_PATTERN = /<(?:script|style)\b/i;
const CELL_FORMULA_PREFIX_PATTERN = /^\s*[=+\-@]/;

const report = (findings: ArtifactValidationFinding[]): ArtifactValidationReport => {
  const blockingCount = findings.filter((finding) => finding.severity === 'blocking').length;
  const advisoryCount = findings.filter((finding) => finding.severity === 'advisory').length;
  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    findings,
  };
};

const finding = (
  id: string,
  severity: ArtifactValidationSeverity,
  message: string,
  path?: readonly (string | number)[],
): ArtifactValidationFinding => ({
  id,
  severity,
  message,
  artifactType: 'spreadsheet',
  path,
  packId: OPERATING_MODEL_PACK_ID,
});

const textValues = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(textValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(textValues);
  return [];
};

const pushSchemaFindings = (
  input: unknown,
  findings: ArtifactValidationFinding[],
): OperatingModelSource | undefined => {
  const parsed = operatingModelSourceSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  for (const issue of parsed.error.issues) {
    findings.push(
      finding(
        'source.schema_invalid',
        'blocking',
        issue.message,
        issue.path.map((part) => (typeof part === 'symbol' ? part.toString() : part)),
      ),
    );
  }
  return undefined;
};

const pushRawCellSafetyFindings = (
  input: unknown,
  findings: ArtifactValidationFinding[],
) => {
  const sheets = (input as { sheets?: unknown } | null)?.sheets;
  if (!Array.isArray(sheets)) return;

  sheets.forEach((sheet, sheetIndex) => {
    const rows = (sheet as { rows?: unknown } | null)?.rows;
    if (!Array.isArray(rows)) return;

    rows.forEach((row, rowIndex) => {
      if (!row || typeof row !== 'object') return;

      Object.entries(row).forEach(([key, value]) => {
        if (typeof value !== 'string' || !CELL_FORMULA_PREFIX_PATTERN.test(value)) return;
        findings.push(
          finding(
            'cell.formula_injection',
            'blocking',
            `Cell "${key}" starts with a formula-control character. Put calculations in declared formula columns only.`,
            ['sheets', sheetIndex, 'rows', rowIndex, key],
          ),
        );
      });
    });
  });
};

const pushDuplicateFinding = (
  seen: Set<string>,
  value: string,
  id: string,
  message: string,
  path: readonly (string | number)[],
  findings: ArtifactValidationFinding[],
) => {
  const key = value.trim().toLowerCase();
  if (seen.has(key)) {
    findings.push(finding(id, 'blocking', message, path));
  }
  seen.add(key);
};

const pushChartFindings = (
  chart: OperatingModelChart,
  chartIndex: number,
  sheetIndex: number,
  sheetById: Map<string, OperatingModelSheet>,
  findings: ArtifactValidationFinding[],
) => {
  const sourceSheet = sheetById.get(chart.sourceSheetId);
  if (!sourceSheet) {
    findings.push(
      finding(
        'chart.source_sheet_missing',
        'blocking',
        `Chart "${chart.id}" references missing source sheet "${chart.sourceSheetId}".`,
        ['sheets', sheetIndex, 'charts', chartIndex, 'sourceSheetId'],
      ),
    );
    return;
  }

  const columns = new Set(sourceSheet.columns.map((column) => column.name));
  if (!columns.has(chart.xColumn)) {
    findings.push(
      finding(
        'chart.x_column_missing',
        'blocking',
        `Chart "${chart.id}" references missing x column "${chart.xColumn}".`,
        ['sheets', sheetIndex, 'charts', chartIndex, 'xColumn'],
      ),
    );
  }
  chart.yColumns.forEach((column, columnIndex) => {
    if (columns.has(column)) return;
    findings.push(
      finding(
        'chart.y_column_missing',
        'blocking',
        `Chart "${chart.id}" references missing y column "${column}".`,
        ['sheets', sheetIndex, 'charts', chartIndex, 'yColumns', columnIndex],
      ),
    );
  });
};

type OperatingModelColumnDefinition = OperatingModelSheet['columns'][number];

const hasOwn = (row: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(row, key);

const cellValueMatchesColumnType = (
  value: unknown,
  column: Pick<OperatingModelColumnDefinition, 'type'>,
): boolean => {
  switch (column.type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
    case 'text':
      return typeof value === 'string';
  }
};

const pushRowValueFindings = (input: {
  row: Record<string, unknown>;
  rowIndex: number;
  sheetName: string;
  sheetPath: readonly (string | number)[];
  columns: readonly OperatingModelColumnDefinition[];
  formulaOutputColumns: ReadonlySet<string>;
  idPrefix: 'row' | 'compiled.row';
  findings: ArtifactValidationFinding[];
}) => {
  input.columns.forEach((column) => {
    const path = [...input.sheetPath, 'rows', input.rowIndex, column.name] as const;
    const hasValue = hasOwn(input.row, column.name);
    if (!hasValue) {
      if (!column.nullable && !input.formulaOutputColumns.has(column.name)) {
        input.findings.push(finding(
          `${input.idPrefix}.required_cell_missing`,
          'blocking',
          `Row ${input.rowIndex + 1} in "${input.sheetName}" is missing required column "${column.name}".`,
          path,
        ));
      }
      return;
    }

    const value = input.row[column.name];
    if (value === null) {
      if (!column.nullable && !input.formulaOutputColumns.has(column.name)) {
        input.findings.push(finding(
          `${input.idPrefix}.required_cell_null`,
          'blocking',
          `Row ${input.rowIndex + 1} in "${input.sheetName}" has null for required column "${column.name}".`,
          path,
        ));
      }
      return;
    }

    if (input.formulaOutputColumns.has(column.name)) return;
    if (cellValueMatchesColumnType(value, column)) return;

    input.findings.push(finding(
      `${input.idPrefix}.cell_type_mismatch`,
      'blocking',
      `Row ${input.rowIndex + 1} in "${input.sheetName}" has ${typeof value} for "${column.name}", expected ${column.type}.`,
      path,
    ));
  });
};

const extractFormulaReferences = (expression: string): {
  references: Set<string>;
  residual: string;
} => {
  const references = new Set(extractOperatingModelFormulaReferences(expression));
  const residual = expression.replace(/"([^"]+)"/g, () => {
    return ' 1 ';
  });
  return { references, residual };
};

const pushFormulaExpressionFindings = (
  formula: OperatingModelSheet['formulas'][number],
  formulaIndex: number,
  sheetIndex: number,
  validColumns: Set<string>,
  findings: ArtifactValidationFinding[],
) => {
  const { references, residual } = extractFormulaReferences(formula.expression);

  if (
    references.size === 0
    || FORMULA_UNSUPPORTED_REFERENCE_PATTERN.test(formula.expression)
    || !FORMULA_SAFE_RESIDUAL_PATTERN.test(residual)
  ) {
    findings.push(
      finding(
        'formula.expression_unsupported',
        'blocking',
        `Formula "${formula.id}" must use only double-quoted declared columns, numbers, parentheses, and arithmetic operators.`,
        ['sheets', sheetIndex, 'formulas', formulaIndex, 'expression'],
      ),
    );
  }

  references.forEach((reference) => {
    if (validColumns.has(reference)) return;
    findings.push(
      finding(
        'formula.expression_column_missing',
        'blocking',
        `Formula "${formula.id}" references undeclared column "${reference}".`,
        ['sheets', sheetIndex, 'formulas', formulaIndex, 'expression'],
      ),
    );
  });

  formula.dependsOn.forEach((dependency, dependencyIndex) => {
    if (references.has(dependency)) return;
    findings.push(
      finding(
        'formula.dependency_not_referenced',
        'blocking',
        `Formula "${formula.id}" declares dependency "${dependency}" but does not reference it in the expression.`,
        ['sheets', sheetIndex, 'formulas', formulaIndex, 'dependsOn', dependencyIndex],
      ),
    );
  });

  references.forEach((reference) => {
    if (formula.dependsOn.includes(reference)) return;
    findings.push(
      finding(
        'formula.reference_not_declared',
        'blocking',
        `Formula "${formula.id}" references "${reference}" but does not declare it in dependsOn.`,
        ['sheets', sheetIndex, 'formulas', formulaIndex, 'expression'],
      ),
    );
  });
};

const pushSheetFindings = (
  source: OperatingModelSource,
  findings: ArtifactValidationFinding[],
) => {
  const sheetIds = new Set<string>();
  const sheetNames = new Set<string>();
  const tableNames = new Set<string>();
  const sheetById = new Map(source.sheets.map((sheet) => [sheet.sheetId, sheet]));

  source.sheets.forEach((sheet, sheetIndex) => {
    pushDuplicateFinding(
      sheetIds,
      sheet.sheetId,
      'sheet.id_duplicate',
      `Sheet id "${sheet.sheetId}" is duplicated.`,
      ['sheets', sheetIndex, 'sheetId'],
      findings,
    );
    pushDuplicateFinding(
      sheetNames,
      sheet.name,
      'sheet.name_duplicate',
      `Sheet name "${sheet.name}" is duplicated.`,
      ['sheets', sheetIndex, 'name'],
      findings,
    );
    pushDuplicateFinding(
      tableNames,
      sheet.tableName,
      'sheet.table_name_duplicate',
      `Table name "${sheet.tableName}" is duplicated.`,
      ['sheets', sheetIndex, 'tableName'],
      findings,
    );

    const columnNames = new Set<string>();
    sheet.columns.forEach((column, columnIndex) => {
      pushDuplicateFinding(
        columnNames,
        column.name,
        'column.name_duplicate',
        `Column "${column.name}" is duplicated in sheet "${sheet.name}".`,
        ['sheets', sheetIndex, 'columns', columnIndex, 'name'],
        findings,
      );
    });

    const validColumns = new Set(sheet.columns.map((column) => column.name));
    const columnRoleByName = new Map(sheet.columns.map((column) => [column.name, column.role]));
    const formulaOutputColumns = new Set(sheet.formulas.map((formula) => formula.column));
    sheet.rows.forEach((row, rowIndex) => {
      for (const key of Object.keys(row)) {
        if (validColumns.has(key)) continue;
        findings.push(
          finding(
            'row.unknown_column',
            'blocking',
            `Row ${rowIndex + 1} in "${sheet.name}" uses undeclared column "${key}".`,
            ['sheets', sheetIndex, 'rows', rowIndex, key],
          ),
        );
      }
      pushRowValueFindings({
        row,
        rowIndex,
        sheetName: sheet.name,
        sheetPath: ['sheets', sheetIndex],
        columns: sheet.columns,
        formulaOutputColumns,
        idPrefix: 'row',
        findings,
      });
    });

    sheet.formulas.forEach((formula, formulaIndex) => {
      if (!validColumns.has(formula.column)) {
        findings.push(
          finding(
            'formula.output_column_missing',
            'blocking',
            `Formula "${formula.id}" writes to undeclared column "${formula.column}".`,
            ['sheets', sheetIndex, 'formulas', formulaIndex, 'column'],
          ),
        );
      }
      const outputColumnRole = columnRoleByName.get(formula.column);
      if (outputColumnRole === 'source' || outputColumnRole === 'input') {
        findings.push(
          finding(
            'formula.output_column_not_generated',
            'blocking',
            `Formula "${formula.id}" writes to "${formula.column}", but formula outputs must use generated, calculation, or output columns.`,
            ['sheets', sheetIndex, 'formulas', formulaIndex, 'column'],
          ),
        );
      }

      formula.dependsOn.forEach((dependency, dependencyIndex) => {
        if (validColumns.has(dependency)) return;
        findings.push(
          finding(
            'formula.dependency_missing',
            'blocking',
            `Formula "${formula.id}" depends on missing column "${dependency}".`,
            ['sheets', sheetIndex, 'formulas', formulaIndex, 'dependsOn', dependencyIndex],
          ),
        );
      });

      if (FORMULA_RISK_PATTERN.test(formula.expression)) {
        findings.push(
          finding(
            'formula.unsafe_function',
            'blocking',
            `Formula "${formula.id}" uses volatile or external-data functions that are not allowed in pack output.`,
            ['sheets', sheetIndex, 'formulas', formulaIndex, 'expression'],
          ),
        );
      }

      pushFormulaExpressionFindings(formula, formulaIndex, sheetIndex, validColumns, findings);
    });

    sheet.charts.forEach((chart, chartIndex) =>
      pushChartFindings(chart, chartIndex, sheetIndex, sheetById, findings));
  });

  if (!source.sheets.some((sheet) => sheet.role === 'inputs')) {
    findings.push(finding('workbook.inputs_missing', 'blocking', 'Operating model packs require an inputs sheet.', ['sheets']));
  }
  if (!source.sheets.some((sheet) => sheet.role === 'summary' || sheet.role === 'dashboard')) {
    findings.push(finding('workbook.output_sheet_missing', 'blocking', 'Operating model packs require a summary or dashboard sheet.', ['sheets']));
  }

  const allText = textValues(source).join('\n');
  if (HTML_PATTERN.test(allText)) {
    findings.push(finding('source.html_detected', 'blocking', 'Spreadsheet source payload must not include HTML-like markup.', ['source']));
  }
};

export const validateOperatingModelSource = (input: OperatingModelSource | unknown): ArtifactValidationReport => {
  const findings: ArtifactValidationFinding[] = [];
  pushRawCellSafetyFindings(input, findings);
  const parsed = pushSchemaFindings(input, findings);
  if (parsed) pushSheetFindings(parsed, findings);
  return report(findings);
};

interface CompiledWorkbookSheet {
  id?: unknown;
  name?: unknown;
  schema?: unknown;
  formulas?: unknown;
}

interface CompiledColumn {
  name: string;
  type: OperatingModelColumnDefinition['type'];
  nullable: boolean;
  role: OperatingModelColumnDefinition['role'];
}

interface CompiledFormula {
  id?: unknown;
  column?: unknown;
  expression?: unknown;
  dependsOn?: unknown;
}

interface CompiledChart {
  id?: unknown;
  sourceSheetId?: unknown;
  xColumn?: unknown;
  yColumns?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isSafeCellValue = (value: unknown): value is string | number | boolean | null =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null;

const pushCompiledWorkbookSafetyFindings = (
  parsed: unknown,
  findings: ArtifactValidationFinding[],
) => {
  if (!isRecord(parsed)) return;
  const workbook = parsed.workbook;
  if (!isRecord(workbook) || !Array.isArray(workbook.sheets)) return;

  const data = isRecord(parsed.data) ? parsed.data : {};
  const formatting = isRecord(parsed.formatting) ? parsed.formatting : {};
  const sheetById = new Map<string, {
    sheet: CompiledWorkbookSheet;
    index: number;
    columns: Map<string, CompiledColumn>;
    generatedColumns: Set<string>;
  }>();

  workbook.sheets.forEach((sheet, sheetIndex) => {
    if (!isRecord(sheet) || typeof sheet.id !== 'string') return;
    const sheetId = sheet.id;
    const schema = Array.isArray(sheet.schema) ? sheet.schema : [];
    const compiledColumns: CompiledColumn[] = schema
      .filter((column): column is { name: string; type?: unknown; nullable?: unknown } =>
        isRecord(column) && typeof column.name === 'string')
      .map((column) => ({
        name: column.name,
        type: column.type === 'number' || column.type === 'date' || column.type === 'boolean'
          ? column.type
          : 'text',
        nullable: typeof column.nullable === 'boolean' ? column.nullable : true,
        role: 'source',
      }));
    const columns = new Map(compiledColumns.map((column) => [column.name, column]));
    const sheetFormatting = formatting[sheetId];
    const generatedColumns = new Set(
      isRecord(sheetFormatting) && Array.isArray(sheetFormatting.generatedColumns)
        ? sheetFormatting.generatedColumns.filter((column): column is string => typeof column === 'string')
        : [],
    );
    sheetById.set(sheetId, { sheet, index: sheetIndex, columns, generatedColumns });

    const rows = data[sheetId];
    if (!Array.isArray(rows)) {
      findings.push(finding(
        'compiled.sheet_data_missing',
        'blocking',
        `Compiled spreadsheet output must include row data for sheet "${sheetId}".`,
        ['data', sheetId],
      ));
    } else {
      const formulaOutputColumns = new Set(
        (Array.isArray(sheet.formulas) ? sheet.formulas : [])
          .filter((formula): formula is { column: string } => isRecord(formula) && typeof formula.column === 'string')
          .map((formula) => formula.column),
      );
      rows.forEach((row, rowIndex) => {
        if (!isRecord(row)) {
          findings.push(finding(
            'compiled.row_invalid',
            'blocking',
            `Compiled row ${rowIndex + 1} in sheet "${sheetId}" must be an object.`,
            ['data', sheetId, rowIndex],
          ));
          return;
        }

        Object.entries(row).forEach(([key, value]) => {
          if (!columns.has(key)) {
            findings.push(finding(
              'compiled.row_unknown_column',
              'blocking',
              `Compiled row ${rowIndex + 1} in sheet "${sheetId}" uses undeclared column "${key}".`,
              ['data', sheetId, rowIndex, key],
            ));
          }
          if (!isSafeCellValue(value)) {
            findings.push(finding(
              'compiled.cell_invalid',
              'blocking',
              `Compiled cell "${key}" in sheet "${sheetId}" must be a primitive spreadsheet value.`,
              ['data', sheetId, rowIndex, key],
            ));
          }
          if (typeof value === 'string' && CELL_FORMULA_PREFIX_PATTERN.test(value)) {
            findings.push(finding(
              'compiled.cell_formula_injection',
              'blocking',
              `Compiled cell "${key}" in sheet "${sheetId}" starts with a formula-control character.`,
              ['data', sheetId, rowIndex, key],
            ));
          }
        });

        pushRowValueFindings({
          row,
          rowIndex,
          sheetName: sheetId,
          sheetPath: ['data', sheetId],
          columns: compiledColumns,
          formulaOutputColumns,
          idPrefix: 'compiled.row',
          findings,
        });
      });
    }

    const formulas = Array.isArray(sheet.formulas) ? sheet.formulas : [];
    formulas.forEach((formula: CompiledFormula, formulaIndex) => {
      if (!isRecord(formula)) return;
      const id = typeof formula.id === 'string' ? formula.id : `formula-${formulaIndex + 1}`;
      if (typeof formula.column !== 'string' || typeof formula.expression !== 'string' || !Array.isArray(formula.dependsOn)) {
        findings.push(finding(
          'compiled.formula_invalid',
          'blocking',
          `Formula "${id}" in sheet "${sheetId}" must declare column, expression, and dependsOn.`,
          ['workbook', 'sheets', sheetIndex, 'formulas', formulaIndex],
        ));
        return;
      }
      const formulaColumn = formula.column;
      const formulaExpression = formula.expression;
      const formulaDependsOn = formula.dependsOn;

      if (!columns.has(formulaColumn)) {
        findings.push(finding(
          'compiled.formula_output_column_missing',
          'blocking',
          `Formula "${id}" writes to undeclared column "${formulaColumn}".`,
          ['workbook', 'sheets', sheetIndex, 'formulas', formulaIndex, 'column'],
        ));
      }
      if (!generatedColumns.has(formulaColumn)) {
        findings.push(finding(
          'compiled.formula_output_column_not_generated',
          'blocking',
          `Formula "${id}" output column "${formulaColumn}" is not marked as generated/protected formatting.`,
          ['workbook', 'sheets', sheetIndex, 'formulas', formulaIndex, 'column'],
        ));
      }

      formulaDependsOn.forEach((dependency, dependencyIndex) => {
        if (typeof dependency === 'string' && columns.has(dependency)) return;
        findings.push(finding(
          'compiled.formula_dependency_missing',
          'blocking',
          `Formula "${id}" depends on missing column "${String(dependency)}".`,
          ['workbook', 'sheets', sheetIndex, 'formulas', formulaIndex, 'dependsOn', dependencyIndex],
        ));
      });

      if (FORMULA_RISK_PATTERN.test(formulaExpression)) {
        findings.push(finding(
          'compiled.formula_unsafe_function',
          'blocking',
          `Formula "${id}" uses volatile or external-data functions that are not allowed in compiled output.`,
          ['workbook', 'sheets', sheetIndex, 'formulas', formulaIndex, 'expression'],
        ));
      }

      const rows = data[sheetId];
      if (!Array.isArray(rows)) return;
      rows.forEach((row, rowIndex) => {
        if (!isRecord(row)) return;
        const safeRow = Object.fromEntries(
          Object.entries(row).filter((entry): entry is [string, string | number | boolean | null] =>
            isSafeCellValue(entry[1])),
        );
        const evaluation = evaluateOperatingModelFormulaExpression(formulaExpression, safeRow);
        if (evaluation.unsupported) {
          findings.push(finding(
            'compiled.formula_expression_unsupported',
            'blocking',
            `Formula "${id}" cannot be evaluated safely against row ${rowIndex + 1}.`,
            ['data', sheetId, rowIndex, formulaColumn],
          ));
          return;
        }
        if (row[formulaColumn] !== evaluation.value) {
          findings.push(finding(
            'compiled.formula_value_mismatch',
            'blocking',
            `Formula "${id}" value for row ${rowIndex + 1} does not match its declared expression.`,
            ['data', sheetId, rowIndex, formulaColumn],
          ));
        }
      });
    });
  });

  const charts = Array.isArray(parsed.charts) ? parsed.charts : [];
  charts.forEach((chart: CompiledChart, chartIndex) => {
    if (!isRecord(chart)) return;
    const id = typeof chart.id === 'string' ? chart.id : `chart-${chartIndex + 1}`;
    if (typeof chart.sourceSheetId !== 'string') {
      findings.push(finding('compiled.chart_source_sheet_missing', 'blocking', `Chart "${id}" must declare a source sheet.`, ['charts', chartIndex, 'sourceSheetId']));
      return;
    }
    const sourceSheetId = chart.sourceSheetId;
    const sourceSheet = sheetById.get(sourceSheetId);
    if (!sourceSheet) {
      findings.push(finding('compiled.chart_source_sheet_missing', 'blocking', `Chart "${id}" references missing source sheet "${sourceSheetId}".`, ['charts', chartIndex, 'sourceSheetId']));
      return;
    }
    const xColumn = chart.xColumn;
    if (typeof xColumn !== 'string' || !sourceSheet.columns.has(xColumn)) {
      findings.push(finding('compiled.chart_x_column_missing', 'blocking', `Chart "${id}" references a missing x column.`, ['charts', chartIndex, 'xColumn']));
    }
    if (!Array.isArray(chart.yColumns) || chart.yColumns.length === 0) {
      findings.push(finding('compiled.chart_y_columns_missing', 'blocking', `Chart "${id}" must declare y columns.`, ['charts', chartIndex, 'yColumns']));
      return;
    }
    chart.yColumns.forEach((column, columnIndex) => {
      if (typeof column === 'string' && sourceSheet.columns.has(column)) return;
      findings.push(finding('compiled.chart_y_column_missing', 'blocking', `Chart "${id}" references missing y column "${String(column)}".`, ['charts', chartIndex, 'yColumns', columnIndex]));
    });
  });
};

export const validateOperatingModelCompiledOutput = (
  output: ArtifactCompiledOutput | string,
): ArtifactValidationReport => {
  const content = typeof output === 'string' ? output : output.content;
  const findings: ArtifactValidationFinding[] = [];

  if (SCRIPT_OR_STYLE_PATTERN.test(content) || HTML_PATTERN.test(content)) {
    findings.push(
      finding(
        'compiled.markup_detected',
        'blocking',
        'Compiled spreadsheet pack output must be structured workbook JSON, not HTML or CSS.',
        ['content'],
      ),
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    findings.push(finding('compiled.json_invalid', 'blocking', 'Compiled spreadsheet output must be valid JSON.', ['content']));
    return report(findings);
  }

  const workbook = (parsed as { workbook?: { sheets?: unknown } } | null)?.workbook;
  if (!workbook || !Array.isArray(workbook.sheets) || workbook.sheets.length === 0) {
    findings.push(finding('compiled.workbook_missing', 'blocking', 'Compiled spreadsheet output must include workbook sheets.', ['content']));
  }

  const theme = (parsed as { theme?: { target?: unknown; roles?: unknown } } | null)?.theme;
  if (theme?.target !== 'spreadsheet-theme' || !theme.roles) {
    findings.push(finding('compiled.theme_missing', 'blocking', 'Compiled spreadsheet output must include a spreadsheet-theme token map.', ['content']));
  }

  pushCompiledWorkbookSafetyFindings(parsed, findings);

  return report(findings);
};
