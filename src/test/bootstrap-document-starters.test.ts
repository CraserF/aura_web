import { describe, expect, it } from 'vitest';
import { listDocumentBlueprints } from '@/services/ai/templates/document-blueprints';
import { listDocumentStarters } from '@/services/bootstrap/documentStarters';

describe('document starter registry', () => {
  it('maps starter entries to valid document blueprint ids', () => {
    const starters = listDocumentStarters();
    const blueprintIds = new Set(listDocumentBlueprints().map((blueprint) => String(blueprint.id)));

    expect(starters.length).toBeGreaterThan(0);
    for (const starter of starters) {
      expect(blueprintIds.has(starter.blueprintId)).toBe(true);
    }
  });
});
