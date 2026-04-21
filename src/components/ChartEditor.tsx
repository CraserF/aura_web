/**
 * ChartEditor — Dialog for editing a ChartSpec's data, labels, type and title.
 *
 * Usage:
 *   <ChartEditor spec={spec} open={open} onSave={handleSave} onClose={() => setOpen(false)} />
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuraChartType, ChartDataset, ChartSpec } from '@/services/charts';

const CHART_TYPES: { value: AuraChartType; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'horizontal-bar', label: 'Horizontal Bar' },
  { value: 'stacked-bar', label: 'Stacked Bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'doughnut', label: 'Doughnut' },
  { value: 'sparkline', label: 'Sparkline' },
];

export interface ChartEditorProps {
  spec: ChartSpec;
  open: boolean;
  onSave: (spec: ChartSpec) => void;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseValues(raw: string): number[] {
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    });
}

function formatValues(values: number[]): string {
  return values.join(', ');
}

// ── Internal state helpers ────────────────────────────────────────────────────

interface EditableDataset {
  label: string;
  valuesRaw: string; // comma-separated string for the input field
  color?: string;
}

function fromSpec(spec: ChartSpec): {
  title: string;
  type: AuraChartType;
  labelsRaw: string;
  datasets: EditableDataset[];
  unit: string;
  illustrative: boolean;
} {
  return {
    title: spec.title ?? '',
    type: spec.type ?? 'bar',
    labelsRaw: spec.labels.join(', '),
    datasets: spec.datasets.map((d) => ({
      label: d.label,
      valuesRaw: formatValues(d.values),
      color: d.color,
    })),
    unit: spec.unit ?? '',
    illustrative: spec.illustrative ?? false,
  };
}

function toSpec(base: ChartSpec, editable: ReturnType<typeof fromSpec>): ChartSpec {
  const labels = editable.labelsRaw
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  const datasets: ChartDataset[] = editable.datasets.map((d) => ({
    label: d.label,
    values: parseValues(d.valuesRaw),
    ...(d.color ? { color: d.color } : {}),
  }));

  return {
    ...base,
    title: editable.title || undefined,
    type: editable.type,
    labels,
    datasets,
    unit: editable.unit || undefined,
    illustrative: editable.illustrative || undefined,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChartEditor({ spec, open, onSave, onClose }: ChartEditorProps) {
  const [state, setState] = useState(() => fromSpec(spec));

  const updateDataset = useCallback(
    (index: number, patch: Partial<EditableDataset>) => {
      setState((prev) => {
        const datasets = [...prev.datasets];
        datasets[index] = { ...datasets[index]!, ...patch };
        return { ...prev, datasets };
      });
    },
    [],
  );

  const addDataset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      datasets: [...prev.datasets, { label: `Series ${prev.datasets.length + 1}`, valuesRaw: '' }],
    }));
  }, []);

  const removeDataset = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      datasets: prev.datasets.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(toSpec(spec, state));
  }, [onSave, spec, state]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Chart</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="chart-title">Title</Label>
            <Input
              id="chart-title"
              value={state.title}
              onChange={(e) => setState((p) => ({ ...p, title: e.target.value }))}
              placeholder="Chart title (optional)"
            />
          </div>

          {/* Type */}
          <div className="grid gap-1.5">
            <Label htmlFor="chart-type">Type</Label>
            <select
              id="chart-type"
              value={state.type}
              onChange={(e) => setState((p) => ({ ...p, type: e.target.value as AuraChartType }))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {CHART_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>

          {/* Labels */}
          <div className="grid gap-1.5">
            <Label htmlFor="chart-labels">Labels (comma-separated)</Label>
            <Input
              id="chart-labels"
              value={state.labelsRaw}
              onChange={(e) => setState((p) => ({ ...p, labelsRaw: e.target.value }))}
              placeholder="Q1, Q2, Q3, Q4"
            />
          </div>

          {/* Unit */}
          <div className="grid gap-1.5">
            <Label htmlFor="chart-unit">Unit (optional)</Label>
            <Input
              id="chart-unit"
              value={state.unit}
              onChange={(e) => setState((p) => ({ ...p, unit: e.target.value }))}
              placeholder="e.g. $M, %, items"
            />
          </div>

          {/* Illustrative toggle */}
          <div className="flex items-center gap-2">
            <input
              id="chart-illustrative"
              type="checkbox"
              checked={state.illustrative}
              onChange={(e) => setState((p) => ({ ...p, illustrative: e.target.checked }))}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <Label htmlFor="chart-illustrative" className="cursor-pointer font-normal">
              Mark as illustrative data
            </Label>
          </div>

          {/* Datasets */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Data series</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addDataset}>
                <Plus className="size-3.5 mr-1" />
                Add series
              </Button>
            </div>

            {state.datasets.map((dataset, idx) => (
              <div key={idx} className="grid gap-1.5 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={dataset.label}
                    onChange={(e) => updateDataset(idx, { label: e.target.value })}
                    placeholder="Series name"
                    className="flex-1 text-sm"
                    aria-label={`Series ${idx + 1} name`}
                  />
                  {state.datasets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDataset(idx)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-label={`Remove series ${idx + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <Input
                  value={dataset.valuesRaw}
                  onChange={(e) => updateDataset(idx, { valuesRaw: e.target.value })}
                  placeholder="10, 20, 30, 40"
                  className="text-sm font-mono"
                  aria-label={`Series ${idx + 1} values`}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save chart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
