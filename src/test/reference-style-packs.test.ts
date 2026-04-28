import { describe, expect, it } from 'vitest';

import {
  formatReferenceQualityProfileForPrompt,
  listReferenceQualityProfiles,
  listReferenceStylePacks,
  resolveReferenceQualityProfileId,
} from '@/services/ai/templates';
import { WORKFLOW_BENCHMARK_CASES } from '@/test/fixtures/workflow-benchmark-cases';

const FORBIDDEN_REFERENCE_PATTERNS = [
  /https?:\/\//i,
  /mailto:/i,
  /presented by/i,
  /\b20\d{2}\b/,
  /[$€£]\s?\d/,
];

const FORBIDDEN_CORPUS_CONTENT_PATTERNS = [
  ...FORBIDDEN_REFERENCE_PATTERNS,
  /<\s*(?:section|article|header|div|style)\b/i,
  /\bdata-background-color\b/i,
  /\bclass=["']/i,
  /\bDecision Ready\b/i,
  /\bMake the Move Visible\b/i,
  /\bTwo Systems\b/i,
  /\bCustomer Education Refresh\b/i,
  /\b482 users\b/i,
];

describe('reference style packs', () => {
  it('provides confidentiality guidance for every sanitized style pack', () => {
    for (const pack of listReferenceStylePacks()) {
      expect(pack.confidentialityRules.length).toBeGreaterThan(0);
      expect(pack.syntheticExample.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps sanitized style examples free from obvious confidential markers or external assets', () => {
    for (const pack of listReferenceStylePacks()) {
      for (const pattern of FORBIDDEN_REFERENCE_PATTERNS) {
        expect(pack.syntheticExample).not.toMatch(pattern);
      }
    }
  });

  it('keeps benchmark fixtures synthetic and free of direct reference-leak markers', () => {
    for (const benchmark of WORKFLOW_BENCHMARK_CASES) {
      for (const pattern of FORBIDDEN_REFERENCE_PATTERNS) {
        expect(benchmark.fixturePrompt).not.toMatch(pattern);
        expect(benchmark.expectedFocus).not.toMatch(pattern);
      }
    }
  });

  it('normalizes every style pack into a trait-only reference quality profile', () => {
    const stylePackIds = listReferenceStylePacks().map((pack) => pack.id).sort();
    const qualityProfileIds = listReferenceQualityProfiles().map((profile) => profile.id).sort();

    expect(qualityProfileIds).toEqual(stylePackIds);

    for (const profile of listReferenceQualityProfiles()) {
      expect(profile.sourceKinds.length).toBeGreaterThan(0);
      expect(profile.rhythm.length).toBeGreaterThan(0);
      expect(profile.density.length).toBeGreaterThan(0);
      expect(profile.moduleGrammar.length).toBeGreaterThan(0);
      expect(profile.layoutVariety.length).toBeGreaterThan(0);
      expect(profile.typographyScale.length).toBeGreaterThan(0);
      expect(profile.componentFamilies.length).toBeGreaterThan(0);
      expect(profile.antiPatterns.length).toBeGreaterThan(0);
      expect(profile.confidentialityRules.length).toBeGreaterThan(0);

      const serialized = JSON.stringify(profile);
      for (const pattern of FORBIDDEN_CORPUS_CONTENT_PATTERNS) {
        expect(serialized).not.toMatch(pattern);
      }
    }
  });

  it('routes quality bars to compatible reference quality profiles', () => {
    expect(resolveReferenceQualityProfileId({
      artifactType: 'presentation',
      outputMode: 'Launch',
    })).toBe('presentation-launch-narrative');
    expect(resolveReferenceQualityProfileId({
      artifactType: 'presentation',
      outputMode: 'Data Story',
    })).toBe('presentation-finance-grid-light');
    expect(resolveReferenceQualityProfileId({
      artifactType: 'document',
      outputMode: 'Executive',
    })).toBe('document-professional-light');
    expect(resolveReferenceQualityProfileId({
      artifactType: 'presentation',
      requestedReferenceStylePackId: 'document-professional-light',
    })).toBe('presentation-executive-starter');
  });

  it('formats prompt guidance as style metadata without source content', () => {
    const promptPack = formatReferenceQualityProfileForPrompt('presentation-executive-starter');

    expect(promptPack).toContain('REFERENCE QUALITY TARGET');
    expect(promptPack).toContain('Style metadata only');
    expect(promptPack).toContain('Rhythm/density');
    expect(promptPack).not.toMatch(/<section|class=|data-background-color/i);
    expect(promptPack).not.toMatch(/Decision Ready|Make the Move Visible|482 users/i);
  });
});
