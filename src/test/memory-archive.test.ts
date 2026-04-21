import { describe, expect, it } from 'vitest';
import {
  addMemoryToDirectory,
  createInitialMemoryTree,
  createMemoryFile,
  exportMemoryTree,
  findDirectory,
  importMemoryTree,
  setL0Summary,
  setL1Summary,
} from '@/services/memory';

describe('memory archive persistence', () => {
  it('round-trips a memory tree through markdown archive entries', () => {
    const tree = createInitialMemoryTree();
    const entity = createMemoryFile(
      'entity',
      'global',
      'public',
      'user@example.com',
      {
        summary: 'Sarah Chen is a product leader for the analytics program.',
        details: 'She prefers concise updates with clear numerical evidence.',
      },
    );

    const abstractSummary = createMemoryFile(
      'context',
      'global',
      'public',
      'user@example.com',
      {
        summary: 'People memories focus on collaborators and communication patterns.',
      },
    );

    const overviewSummary = createMemoryFile(
      'context',
      'global',
      'public',
      'user@example.com',
      {
        summary: 'Entity memory overview for collaborators in the current project.',
        details: 'Contains people, organizations, and tools linked to delivery work.',
      },
    );

    addMemoryToDirectory(tree, 'entities', entity);
    setL0Summary(findDirectory(tree, 'entities')!, abstractSummary);
    setL1Summary(findDirectory(tree, 'entities')!, overviewSummary);

    const entries = exportMemoryTree(tree);
    expect(entries.map((entry) => entry.path)).toContain('memory/entities/.abstract.md');
    expect(entries.map((entry) => entry.path)).toContain('memory/entities/.overview.md');

    const restored = importMemoryTree(entries);
    const restoredEntities = findDirectory(restored, 'entities');

    expect(restoredEntities?.abstractSummary?.content.summary).toBe(abstractSummary.content.summary);
    expect(restoredEntities?.overviewSummary?.content.summary).toBe(overviewSummary.content.summary);
    expect(restoredEntities?.files).toHaveLength(1);
    expect(restoredEntities?.files[0]?.content.summary).toBe(entity.content.summary);
  });
});