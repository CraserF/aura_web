import { describe, it, expect } from 'vitest';
import { parseMarkdownTable } from '@/services/charts';

describe('parseMarkdownTable', () => {
  it('parses labels and numeric datasets', () => {
    const parsed = parseMarkdownTable(`| Quarter | Revenue | Cost |
|---|---:|---:|
| Q1 | 100 | 60 |
| Q2 | 120 | 70 |`);

    expect(parsed).not.toBeNull();
    expect(parsed?.labels).toEqual(['Q1', 'Q2']);
    expect(parsed?.datasets[0]?.label).toBe('Revenue');
    expect(parsed?.datasets[0]?.values).toEqual([100, 120]);
  });

  it('returns null for malformed table', () => {
    const parsed = parseMarkdownTable('Quarter,Revenue\nQ1,100');
    expect(parsed).toBeNull();
  });
});
