import type { RunResult } from '@/services/contracts/runResult';

export interface RenderedRunResult {
  content: string;
  statusMessage: string;
  clarifyOptions?: RunResult['assistantMessage']['clarifyOptions'];
}

export function renderRunResult(result: RunResult): RenderedRunResult {
  const content = result.assistantMessage.content || result.structuredStatus.detail;
  const warningSuffix = result.warnings.length > 0
    ? ` Warning: ${result.warnings.map((warning) => warning.message).join(' ')}`
    : '';

  return {
    content: `${content}${warningSuffix}`.trim(),
    statusMessage: result.structuredStatus.detail,
    ...(result.assistantMessage.clarifyOptions
      ? { clarifyOptions: result.assistantMessage.clarifyOptions }
      : {}),
  };
}
