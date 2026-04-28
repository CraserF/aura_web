export type BenchmarkFailureClassification =
  | 'routing-bug'
  | 'workflow-bug'
  | 'provider-capability-mismatch'
  | 'model-quality-limitation'
  | 'prompt-tuning-issue'
  | 'quality-depth'
  | 'quality-visual'
  | 'quality-continuity'
  | 'none';

export type BenchmarkCaseResult = 'pass' | 'fail' | 'error' | 'skipped';

export type BenchmarkQualityGrade = 'excellent' | 'strong' | 'adequate' | 'needs-polish';

export interface BenchmarkCaseScore {
  compositeScore: number;
  qualityScore: number;
  validationScore: number;
  performanceScore: number;
  consistencyScore: number;
}

export interface BenchmarkRunResult {
  caseId: string;
  artifactType: string;
  provider: 'ollama';
  model: string;
  runIndex: number;
  timings: {
    firstProgressMs: number | null;
    firstUsableOutputMs: number | null;
    totalMs: number;
  };
  score: BenchmarkCaseScore;
  qualityGrade: BenchmarkQualityGrade;
  failedSignals: string[];
  failureClassification: BenchmarkFailureClassification;
  result: BenchmarkCaseResult;
  notes: string;
}

export interface BenchmarkSummary {
  timestamp: string;
  model: string;
  baseUrl: string;
  totalCases: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  skippedCount: number;
  averageCompositeScore: number;
  results: BenchmarkRunResult[];
}

export interface BenchmarkCaseTelemetry {
  qualityScore: number;
  qualityGrade: BenchmarkQualityGrade;
  validationPassed: boolean;
  validationBlockingCount: number;
  failedSignalIds: string[];
  firstProgressMs: number | null;
  firstUsableOutputMs: number | null;
  totalMs: number;
  routingKind?: string;
  error?: string;
}
