import { describe, expect, it } from 'vitest';
import { listDocumentStarters } from '@/services/bootstrap/documentStarters';
import { buildStarterArtifact, listPresentationStarters } from '@/services/bootstrap/projectStarter';
import { listSpreadsheetStarters } from '@/services/bootstrap/spreadsheetStarters';
import { listProjectStarterKits } from '@/services/bootstrap/starterKits';

describe('project starter kits', () => {
  it('exposes only curated presentation quick-starts', () => {
    const starters = listPresentationStarters();
    expect(starters.map((starter) => starter.id)).toEqual(['corporate', 'pitch-deck']);
    expect(starters.map((starter) => starter.templateId)).toEqual([
      'executive-briefing-light',
      'launch-narrative-light',
    ]);
  });

  it('reference valid starter ids for each artifact type', () => {
    const documentIds = new Set(listDocumentStarters().map((starter) => starter.id));
    const presentationIds = new Set(listPresentationStarters().map((starter) => starter.id));
    const spreadsheetIds = new Set(listSpreadsheetStarters().map((starter) => starter.id));

    const starterKits = listProjectStarterKits();
    expect(starterKits.map((kit) => kit.id)).toEqual([
      'executive-briefing',
      'research-pack',
      'launch-plan',
    ]);

    for (const kit of starterKits) {
      expect(kit.artifacts.length).toBeGreaterThan(0);
      for (const artifact of kit.artifacts) {
        const registry = artifact.type === 'document'
          ? documentIds
          : artifact.type === 'presentation'
            ? presentationIds
            : spreadsheetIds;
        expect(registry.has(artifact.starterId)).toBe(true);
      }
    }

    const researchPack = starterKits.find((kit) => kit.id === 'research-pack');
    expect(researchPack?.artifacts.map((artifact) => artifact.type)).toEqual(['document', 'spreadsheet']);
  });

  it('persists starter design families through workflow preset defaults', () => {
    const starterKits = listProjectStarterKits();
    const executiveKit = starterKits.find((kit) => kit.id === 'executive-briefing');
    const launchKit = starterKits.find((kit) => kit.id === 'launch-plan');

    expect(executiveKit?.workflowPresets?.defaultPresetByArtifact.presentation)
      .toBe('executive-presentation-default');
    expect(launchKit?.workflowPresets?.defaultPresetByArtifact.presentation)
      .toBe('launch-presentation-default');
    expect(executiveKit?.workflowPresets?.presets.find((preset) => preset.id === 'executive-presentation-default')?.rulesAppendix)
      .toContain('executive-briefing-light');
    expect(launchKit?.workflowPresets?.presets.find((preset) => preset.id === 'launch-presentation-default')?.rulesAppendix)
      .toContain('launch-narrative-light');
  });

  it('builds presentation starter artifacts with scoped CSS and resolved hero content', async () => {
    const presentationArtifacts = listProjectStarterKits()
      .flatMap((kit) =>
        kit.artifacts
          .filter((artifact) => artifact.type === 'presentation')
          .map((artifact) => ({ artifact, starterKitId: kit.id })));

    expect(presentationArtifacts.length).toBeGreaterThan(0);

    for (const { artifact, starterKitId } of presentationArtifacts) {
      const result = await buildStarterArtifact(artifact, starterKitId);

      expect(result.type).toBe('presentation');
      const sectionCount = result.contentHtml.match(/<section\b/gi)?.length ?? 0;

      expect(result.contentHtml).toContain('@scope (.reveal .slides)');
      expect(result.themeCss).toBe('');
      expect(sectionCount).toBe(result.slideCount);
      expect(sectionCount).toBeGreaterThanOrEqual(3);
      expect(sectionCount).toBeLessThanOrEqual(5);
      expect(result.contentHtml).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
      expect(result.contentHtml).not.toMatch(/<(?:html|body)\b/i);
      expect(result.contentHtml).not.toMatch(/\sstyle=/i);
      expect(result.contentHtml).not.toMatch(/https?:\/\/|mailto:|presented by|[$€£]\s?\d/i);
      expect(result.contentHtml).not.toMatch(/<p\b[^>]*>\s*<\/p>/i);
    }
  });
});
