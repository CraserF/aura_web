export type ConfigDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface ConfigDiagnostic {
  source: 'projectRules' | 'contextPolicy' | 'workflowPresets' | 'doctor';
  path: string;
  severity: ConfigDiagnosticSeverity;
  code: string;
  message: string;
  suggestion?: string;
}
