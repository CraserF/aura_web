export type OperatingModelFormulaRow = Record<string, string | number | boolean | null>;

export interface OperatingModelFormulaEvaluation {
  referencedColumns: readonly string[];
  missingColumns: readonly string[];
  nonNumericColumns: readonly string[];
  unsupported: boolean;
  value?: number;
}

const FORMULA_REFERENCE_PATTERN = /"([^"]+)"/g;
const FORMULA_UNSUPPORTED_REFERENCE_PATTERN = /(?:!|\$|\[|\]|:|https?:|@)/i;

type ArithmeticToken =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' };

export const extractOperatingModelFormulaReferences = (expression: string): string[] =>
  Array.from(expression.matchAll(FORMULA_REFERENCE_PATTERN), (match) => match[1] ?? '')
    .filter(Boolean);

const tokenizeArithmetic = (expression: string): ArithmeticToken[] | undefined => {
  const tokens: ArithmeticToken[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index]!;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[+\-*/]/.test(char)) {
      tokens.push({ type: 'operator', value: char as '+' | '-' | '*' | '/' });
      index += 1;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }

    const numberMatch = expression.slice(index).match(/^\d+(?:\.\d+)?/);
    if (numberMatch?.[0]) {
      tokens.push({ type: 'number', value: Number(numberMatch[0]) });
      index += numberMatch[0].length;
      continue;
    }

    return undefined;
  }

  return tokens;
};

const evaluateArithmetic = (expression: string): number | undefined => {
  const tokens = tokenizeArithmetic(expression);
  if (!tokens || tokens.length === 0) return undefined;
  let index = 0;

  const peek = (): ArithmeticToken | undefined => tokens[index];
  const take = (): ArithmeticToken | undefined => {
    const token = tokens[index];
    index += 1;
    return token;
  };

  const parseFactor = (): number | undefined => {
    const token = take();
    if (!token) return undefined;

    if (token.type === 'operator' && (token.value === '+' || token.value === '-')) {
      const value = parseFactor();
      if (value === undefined) return undefined;
      return token.value === '-' ? -value : value;
    }

    if (token.type === 'number') return token.value;

    if (token.type === 'paren' && token.value === '(') {
      const value = parseExpression();
      const close = take();
      if (!close || close.type !== 'paren' || close.value !== ')') return undefined;
      return value;
    }

    return undefined;
  };

  const parseTerm = (): number | undefined => {
    let value = parseFactor();
    if (value === undefined) return undefined;

    while (peek()?.type === 'operator' && (peek() as { value: string }).value.match(/^[*/]$/)) {
      const operator = take() as Extract<ArithmeticToken, { type: 'operator' }>;
      const right = parseFactor();
      if (right === undefined) return undefined;
      value = operator.value === '*' ? value * right : value / right;
    }

    return value;
  };

  function parseExpression(): number | undefined {
    let value = parseTerm();
    if (value === undefined) return undefined;

    while (peek()?.type === 'operator' && (peek() as { value: string }).value.match(/^[+-]$/)) {
      const operator = take() as Extract<ArithmeticToken, { type: 'operator' }>;
      const right = parseTerm();
      if (right === undefined) return undefined;
      value = operator.value === '+' ? value + right : value - right;
    }

    return value;
  }

  const value = parseExpression();
  if (value === undefined || index !== tokens.length || !Number.isFinite(value)) return undefined;
  return Number(value.toFixed(10));
};

export const evaluateOperatingModelFormulaExpression = (
  expression: string,
  row: OperatingModelFormulaRow,
): OperatingModelFormulaEvaluation => {
  const referencedColumns = extractOperatingModelFormulaReferences(expression);
  const missingColumns: string[] = [];
  const nonNumericColumns: string[] = [];
  const arithmeticExpression = expression.replace(FORMULA_REFERENCE_PATTERN, (_match, column: string) => {
    if (!(column in row)) {
      missingColumns.push(column);
      return '0';
    }
    const value = row[column];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      nonNumericColumns.push(column);
      return '0';
    }
    return String(value);
  });
  const value = evaluateArithmetic(arithmeticExpression);
  const unsupported =
    referencedColumns.length === 0 ||
    FORMULA_UNSUPPORTED_REFERENCE_PATTERN.test(expression) ||
    missingColumns.length > 0 ||
    nonNumericColumns.length > 0 ||
    value === undefined;

  return {
    referencedColumns,
    missingColumns,
    nonNumericColumns,
    unsupported,
    ...(value !== undefined ? { value } : {}),
  };
};
