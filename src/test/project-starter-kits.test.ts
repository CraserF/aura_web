import { describe, expect, it } from 'vitest';
import { listDocumentStarters } from '@/services/bootstrap/documentStarters';
import { listPresentationStarters } from '@/services/bootstrap/projectStarter';
import { listSpreadsheetStarters } from '@/services/bootstrap/spreadsheetStarters';
import { listProjectStarterKits } from '@/services/bootstrap/starterKits';

describe('project starter kits', () => {
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
  });
});
