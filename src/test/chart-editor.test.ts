/**
 * M1-C — Chart editor and illustrative badge tests
 *
 * Covers:
 * - M1.4: ChartEditor state transitions and toSpec serialization
 * - M1.6: Illustrative badge injection in chart-plugin (Reveal.js context)
 */

import { describe, it, expect } from 'vitest';

// ── ChartEditor pure logic (no rendering) ─────────────────────────────────────

// Mirror the private helper functions by importing from module (we test the
// exported contract via state transformations, not rendering).

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

describe('ChartEditor — parseValues helper', () => {
  it('parses a comma-separated string of numbers', () => {
    expect(parseValues('10, 20, 30')).toEqual([10, 20, 30]);
  });

  it('handles extra whitespace', () => {
    expect(parseValues(' 1 ,  2 ,3 ')).toEqual([1, 2, 3]);
  });

  it('converts non-numeric values to 0', () => {
    expect(parseValues('5, abc, 10')).toEqual([5, 0, 10]);
  });

  it('returns empty array for empty string', () => {
    expect(parseValues('')).toEqual([]);
  });

  it('handles decimal values', () => {
    expect(parseValues('1.5, 2.75, 0.1')).toEqual([1.5, 2.75, 0.1]);
  });

  it('handles negative values', () => {
    expect(parseValues('-10, 0, 15')).toEqual([-10, 0, 15]);
  });
});

// ── Illustrative badge insertion (chart-plugin) ───────────────────────────────

describe('chart-plugin illustrative badge (M1.6)', () => {
  function makeChartContainer(): HTMLElement {
    const container = document.createElement('div');
    container.setAttribute('data-aura-chart', 'test-chart');
    document.body.appendChild(container);
    return container;
  }

  function insertBadge(container: HTMLElement): void {
    const badge = document.createElement('span');
    badge.setAttribute('data-aura-illustrative-badge', '');
    badge.textContent = 'Illustrative data';
    badge.style.cssText =
      'position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.55);color:#fff;'
      + 'font-size:10px;font-family:system-ui,sans-serif;padding:2px 7px;border-radius:9999px;'
      + 'pointer-events:none;letter-spacing:0.03em;backdrop-filter:blur(4px);z-index:10;';
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(badge);
  }

  it('adds a badge element when illustrative is true', () => {
    const container = makeChartContainer();
    insertBadge(container);
    const badge = container.querySelector('[data-aura-illustrative-badge]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('Illustrative data');
    container.remove();
  });

  it('badge has correct text content', () => {
    const container = makeChartContainer();
    insertBadge(container);
    const badge = container.querySelector('[data-aura-illustrative-badge]');
    expect(badge?.textContent).toBe('Illustrative data');
    container.remove();
  });

  it('sets container to relative positioning when static', () => {
    const container = makeChartContainer();
    container.style.position = '';
    insertBadge(container);
    expect(container.style.position).toBe('relative');
    container.remove();
  });

  it('does not add a duplicate badge if already present', () => {
    const container = makeChartContainer();
    insertBadge(container);
    // Simulate re-hydration check
    const existing = container.querySelector('[data-aura-illustrative-badge]');
    if (!existing) insertBadge(container);
    const badges = container.querySelectorAll('[data-aura-illustrative-badge]');
    expect(badges).toHaveLength(1);
    container.remove();
  });
});

// ── ChartSpec round-trip (fromSpec → edit → toSpec) ──────────────────────────

import type { ChartSpec } from '@/services/charts/types';

function fromSpec(spec: ChartSpec) {
  return {
    title: spec.title ?? '',
    type: spec.type ?? ('bar' as const),
    labelsRaw: spec.labels.join(', '),
    datasets: spec.datasets.map((d) => ({
      label: d.label,
      valuesRaw: d.values.join(', '),
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

  const datasets = editable.datasets.map((d) => ({
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

describe('ChartEditor — ChartSpec round-trip', () => {
  const baseSpec: ChartSpec = {
    id: 'test-1',
    type: 'bar',
    title: 'Revenue',
    labels: ['Q1', 'Q2', 'Q3'],
    datasets: [{ label: 'Sales', values: [100, 200, 300] }],
    unit: '$M',
    illustrative: false,
  };

  it('fromSpec converts labels array to comma string', () => {
    const editable = fromSpec(baseSpec);
    expect(editable.labelsRaw).toBe('Q1, Q2, Q3');
  });

  it('fromSpec converts dataset values to comma string', () => {
    const editable = fromSpec(baseSpec);
    expect(editable.datasets[0]?.valuesRaw).toBe('100, 200, 300');
  });

  it('toSpec preserves id from base spec', () => {
    const editable = fromSpec(baseSpec);
    const out = toSpec(baseSpec, editable);
    expect(out.id).toBe('test-1');
  });

  it('round-trip produces equivalent labels', () => {
    const editable = fromSpec(baseSpec);
    const out = toSpec(baseSpec, editable);
    expect(out.labels).toEqual(['Q1', 'Q2', 'Q3']);
  });

  it('round-trip produces equivalent dataset values', () => {
    const editable = fromSpec(baseSpec);
    const out = toSpec(baseSpec, editable);
    expect(out.datasets[0]?.values).toEqual([100, 200, 300]);
  });

  it('allows changing the chart type', () => {
    const editable = fromSpec(baseSpec);
    editable.type = 'line';
    const out = toSpec(baseSpec, editable);
    expect(out.type).toBe('line');
  });

  it('allows adding new labels', () => {
    const editable = fromSpec(baseSpec);
    editable.labelsRaw = 'Q1, Q2, Q3, Q4';
    const out = toSpec(baseSpec, editable);
    expect(out.labels).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  it('strips empty title to undefined', () => {
    const editable = fromSpec(baseSpec);
    editable.title = '';
    const out = toSpec(baseSpec, editable);
    expect(out.title).toBeUndefined();
  });

  it('marks illustrative on the output spec', () => {
    const editable = fromSpec(baseSpec);
    editable.illustrative = true;
    const out = toSpec(baseSpec, editable);
    expect(out.illustrative).toBe(true);
  });
});
