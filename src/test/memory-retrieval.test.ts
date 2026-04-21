import { describe, expect, it } from 'vitest';
import {
  addMemoryToDirectory,
  assembleMemoryContext,
  createInitialMemoryTree,
  createMemoryFile,
  formatMemoryContext,
  retrieveMemories,
  setL0Summary,
} from '@/services/memory';

describe('memory retrieval', () => {
  const projectScope = 'project:a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' as const;

  it('retrieves project memories ahead of unrelated content for matching queries', () => {
    const tree = createInitialMemoryTree();

    addMemoryToDirectory(
      tree,
      'context',
      createMemoryFile('context', projectScope, 'private', 'user@example.com', {
        summary: 'Q1 revenue forecast assumptions for the enterprise rollout.',
        details: 'Revenue forecast uses a phased activation model with enterprise expansion.',
        actionableUse: 'Use when generating finance documents for the current project.',
      }),
    );

    addMemoryToDirectory(
      tree,
      'skills',
      createMemoryFile('skill', 'global', 'public', 'user@example.com', {
        summary: 'Presentation design guidance for color balance and hierarchy.',
        details: 'Prefer strong typographic hierarchy and limited color accents.',
      }),
    );

    addMemoryToDirectory(
      tree,
      'entities',
      createMemoryFile('entity', 'global', 'public', 'user@example.com', {
        summary: 'Sarah Chen is a collaborator focused on UX research synthesis.',
      }),
    );

    setL0Summary(
      tree.subdirs.find((dir) => dir.path === 'context')!,
      createMemoryFile('context', projectScope, 'private', 'user@example.com', {
        summary: 'Project context includes financial planning and rollout assumptions.',
      }),
    );

    const results = retrieveMemories(tree, 'revenue forecast for rollout', {
      scope: projectScope,
      topK: 2,
    });

    expect(results[0]?.memory.frontmatter.type).toBe('context');
    expect(results[0]?.memory.content.summary).toContain('Q1 revenue forecast');
  });

  it('includes global memories when retrieving inside a project scope', () => {
    const tree = createInitialMemoryTree();

    addMemoryToDirectory(
      tree,
      'skills',
      createMemoryFile('skill', 'global', 'public', 'user@example.com', {
        summary: 'Document design guidance for executive brief typography.',
        details: 'Use compact sections and strong headings for executive readers.',
      }),
    );

    const results = retrieveMemories(tree, 'executive brief typography', {
      scope: projectScope,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.memory.frontmatter.scope).toBe('global');
  });

  it('assembles memory context within the configured token budget', () => {
    const tree = createInitialMemoryTree();

    addMemoryToDirectory(
      tree,
      'context',
      createMemoryFile('context', 'global', 'public', 'user@example.com', {
        summary: 'Memory one about financial planning assumptions.',
        details: 'A'.repeat(600),
      }),
    );

    addMemoryToDirectory(
      tree,
      'context',
      createMemoryFile('context', 'global', 'public', 'user@example.com', {
        summary: 'Memory two about launch operations for the same project.',
        details: 'B'.repeat(600),
      }),
    );

    const results = retrieveMemories(tree, 'project planning assumptions launch operations', {
      topK: 5,
    });
    const assembly = assembleMemoryContext(results, 200);

    expect(assembly.memories.length).toBe(1);
    expect(assembly.budgetExceeded).toBe(true);
    expect(assembly.trimmedMemories).toHaveLength(1);
    expect(formatMemoryContext(assembly)).toContain('Memory 1:');
  });
});