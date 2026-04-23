import type { ConfigDiagnostic } from '@/services/configValidate/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function validateWorkflowPresets(presets: unknown): ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];

  if (presets == null) return diagnostics;
  if (!isRecord(presets)) {
    return [{
      source: 'workflowPresets',
      path: 'workflowPresets',
      severity: 'error',
      code: 'invalid-type',
      message: 'Workflow presets must be an object.',
    }];
  }

  const allowedKeys = new Set(['version', 'presets', 'defaultPresetByArtifact']);
  for (const key of Object.keys(presets)) {
    if (!allowedKeys.has(key)) {
      diagnostics.push({
        source: 'workflowPresets',
        path: `workflowPresets.${key}`,
        severity: 'warning',
        code: 'unknown-key',
        message: `Unknown workflow presets key "${key}" will be ignored.`,
      });
    }
  }

  if ('version' in presets && (typeof presets.version !== 'number' || !Number.isFinite(presets.version))) {
    diagnostics.push({
      source: 'workflowPresets',
      path: 'workflowPresets.version',
      severity: 'error',
      code: 'invalid-type',
      message: 'workflowPresets.version must be a finite number.',
    });
  }

  const ids = new Set<string>();
  if ('presets' in presets) {
    if (!Array.isArray(presets.presets)) {
      diagnostics.push({
        source: 'workflowPresets',
        path: 'workflowPresets.presets',
        severity: 'error',
        code: 'invalid-type',
        message: 'workflowPresets.presets must be an array.',
      });
    } else {
      presets.presets.forEach((preset, index) => {
        const path = `workflowPresets.presets[${index}]`;
        if (!isRecord(preset)) {
          diagnostics.push({
            source: 'workflowPresets',
            path,
            severity: 'error',
            code: 'invalid-type',
            message: 'Each workflow preset must be an object.',
          });
          return;
        }

        const presetAllowedKeys = new Set([
          'id',
          'name',
          'artifactType',
          'rulesAppendix',
          'contextPolicyOverrides',
          'documentStylePreset',
          'enabled',
          'stylePreset',
        ]);

        for (const key of Object.keys(preset)) {
          if (!presetAllowedKeys.has(key)) {
            diagnostics.push({
              source: 'workflowPresets',
              path: `${path}.${key}`,
              severity: 'warning',
              code: 'unknown-key',
              message: `Unknown workflow preset key "${key}" will be ignored.`,
            });
          }
        }

        if ('stylePreset' in preset) {
          diagnostics.push({
            source: 'workflowPresets',
            path: `${path}.stylePreset`,
            severity: 'warning',
            code: 'deprecated-field',
            message: 'stylePreset is deprecated.',
            suggestion: 'Use documentStylePreset instead.',
          });
        }

        if (typeof preset.id !== 'string' || !preset.id.trim()) {
          diagnostics.push({
            source: 'workflowPresets',
            path: `${path}.id`,
            severity: 'error',
            code: 'invalid-type',
            message: 'Preset id must be a non-empty string.',
          });
        } else if (ids.has(preset.id)) {
          diagnostics.push({
            source: 'workflowPresets',
            path: `${path}.id`,
            severity: 'error',
            code: 'duplicate-id',
            message: `Duplicate preset id "${preset.id}" found.`,
          });
        } else {
          ids.add(preset.id);
        }

        if (typeof preset.name !== 'string' || !preset.name.trim()) {
          diagnostics.push({
            source: 'workflowPresets',
            path: `${path}.name`,
            severity: 'error',
            code: 'invalid-type',
            message: 'Preset name must be a non-empty string.',
          });
        }

        if ('enabled' in preset && typeof preset.enabled !== 'boolean') {
          diagnostics.push({
            source: 'workflowPresets',
            path: `${path}.enabled`,
            severity: 'error',
            code: 'invalid-type',
            message: 'Preset enabled must be a boolean.',
          });
        }
      });
    }
  }

  if ('defaultPresetByArtifact' in presets) {
    if (!isRecord(presets.defaultPresetByArtifact)) {
      diagnostics.push({
        source: 'workflowPresets',
        path: 'workflowPresets.defaultPresetByArtifact',
        severity: 'error',
        code: 'invalid-type',
        message: 'defaultPresetByArtifact must be an object.',
      });
    } else {
      for (const [key, value] of Object.entries(presets.defaultPresetByArtifact)) {
        if (key !== 'document' && key !== 'presentation' && key !== 'spreadsheet') {
          diagnostics.push({
            source: 'workflowPresets',
            path: `workflowPresets.defaultPresetByArtifact.${key}`,
            severity: 'warning',
            code: 'unknown-key',
            message: `Unknown default preset mapping "${key}" will be ignored.`,
          });
          continue;
        }
        if (typeof value !== 'string') {
          diagnostics.push({
            source: 'workflowPresets',
            path: `workflowPresets.defaultPresetByArtifact.${key}`,
            severity: 'error',
            code: 'invalid-type',
            message: 'Default preset ids must be strings.',
          });
        }
      }
    }
  }

  return diagnostics;
}
