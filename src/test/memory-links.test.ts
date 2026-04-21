import { describe, it, expect } from 'vitest';
import {
  parseLinks,
  extractLinksFromMemory,
  buildCrossReferenceIndex,
  normalizeTarget,
  findReferencers,
  findReferences,
  buildLinkGraph,
  validateLinks,
} from '@/services/memory/links';
import { createMemoryFile } from '@/services/memory/storage';

describe('Memory Cross-References & Links', () => {
  describe('parseLinks', () => {
    it('parses simple wikilinks', () => {
      const text = 'Discussed with [[Sarah Chen]] about [[Q1 goals]].';
      const links = parseLinks(text);

      expect(links).toHaveLength(2);
      expect(links[0].target).toBe('Sarah Chen');
      expect(links[1].target).toBe('Q1 goals');
    });

    it('parses multiple links in text', () => {
      const text =
        'The [[sales dashboard]] was discussed with [[Sarah Chen]] and [[John Smith]]. Referenced [[Q1 revenue report]].';
      const links = parseLinks(text);

      expect(links).toHaveLength(4);
      expect(links.map((l) => l.target)).toEqual([
        'sales dashboard',
        'Sarah Chen',
        'John Smith',
        'Q1 revenue report',
      ]);
    });

    it('handles pipe syntax for display text', () => {
      const text = 'Check [[dashboard|sales dashboard]] for details.';
      const links = parseLinks(text);

      expect(links).toHaveLength(1);
      expect(links[0].text).toBe('dashboard|sales dashboard');
      expect(links[0].target).toBe('sales dashboard');
    });

    it('returns empty array for text without links', () => {
      const text = 'No links in this text.';
      const links = parseLinks(text);

      expect(links).toEqual([]);
    });

    it('provides correct position information', () => {
      const text = 'Text with [[Link1]] and [[Link2]] here.';
      const links = parseLinks(text);

      expect(links[0].startPos).toBe(10);
      expect(links[0].endPos).toBeGreaterThan(links[0].startPos);
    });
  });

  describe('extractLinksFromMemory', () => {
    it('extracts links from all sections', () => {
      const memory = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Sarah Chen works at [[TechCorp]]',
          details: 'Reports to [[CEO John Smith]]. Leads [[Product team]].',
          evidence: ['session:123'],
          actionableUse: 'Reference in [[presentation]] context',
        }
      );

      const links = extractLinksFromMemory(memory);
      const targets = links.map((l) => l.target);

      expect(targets).toContain('TechCorp');
      expect(targets).toContain('CEO John Smith');
      expect(targets).toContain('Product team');
      expect(targets).toContain('presentation');
    });

    it('returns empty array if no links in memory', () => {
      const memory = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Sarah Chen is a product manager',
          details: 'She works at TechCorp',
        }
      );

      const links = extractLinksFromMemory(memory);
      expect(links).toEqual([]);
    });
  });

  describe('buildCrossReferenceIndex', () => {
    it('builds index from multiple memories', () => {
      const sarah = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Sarah Chen works at [[TechCorp]] and leads [[Product]]',
        }
      );

      const john = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'John Smith is CEO at [[TechCorp]]',
        }
      );

      const memories = [sarah, john];
      const index = buildCrossReferenceIndex(memories);

      expect(index['TechCorp']).toHaveLength(2); // Both memories reference TechCorp
      expect(index['Product']).toHaveLength(1);
      expect(index['TechCorp']).toContain(sarah.frontmatter.memoryId);
      expect(index['TechCorp']).toContain(john.frontmatter.memoryId);
    });

    it('deduplicates memory IDs', () => {
      const memory = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Presentation skill: use [[reveal.js]] and [[reveal.js]] for slides',
        }
      );

      const index = buildCrossReferenceIndex([memory]);

      expect(index['reveal.js']).toHaveLength(1);
    });

    it('returns empty index for memories without links', () => {
      const memories = [
        createMemoryFile(
          'skill',
          'global',
          'public',
          'user@example.com',
          { summary: 'No links here' }
        ),
      ];

      const index = buildCrossReferenceIndex(memories);
      expect(Object.keys(index)).toEqual([]);
    });
  });

  describe('normalizeTarget', () => {
    it('normalizes to lowercase', () => {
      expect(normalizeTarget('Sarah Chen')).toBe('sarah chen');
      expect(normalizeTarget('TECHCORP')).toBe('techcorp');
    });

    it('strips whitespace', () => {
      expect(normalizeTarget('  Sarah Chen  ')).toBe('sarah chen');
      expect(normalizeTarget('\nTechCorp\t')).toBe('techcorp');
    });

    it('handles already normalized text', () => {
      expect(normalizeTarget('sarah chen')).toBe('sarah chen');
    });
  });

  describe('findReferencers', () => {
    it('finds memories that reference a target', () => {
      const memory1 = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'References [[TechCorp]]' }
      );

      const memory2 = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Also references [[TechCorp]]' }
      );

      const index = buildCrossReferenceIndex([memory1, memory2]);
      const referencers = findReferencers(index, 'TechCorp');

      expect(referencers).toHaveLength(2);
      expect(referencers).toContain(memory1.frontmatter.memoryId);
      expect(referencers).toContain(memory2.frontmatter.memoryId);
    });

    it('finds referencers with case-insensitive matching', () => {
      const memory = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'References [[Sarah Chen]]' }
      );

      const index = buildCrossReferenceIndex([memory]);

      // Should find with different case
      const referencers = findReferencers(index, 'sarah chen');
      expect(referencers).toHaveLength(1);
    });

    it('returns empty array for non-existent target', () => {
      const index = buildCrossReferenceIndex([]);
      const referencers = findReferencers(index, 'Nonexistent');

      expect(referencers).toEqual([]);
    });
  });

  describe('findReferences', () => {
    it('finds all references in a memory', () => {
      const memory = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Sarah Chen works at [[TechCorp]]',
          details: 'Part of [[Product team]]',
          actionableUse: 'Reference in [[presentation]]',
        }
      );

      const references = findReferences(memory);
      expect(references).toEqual(['TechCorp', 'Product team', 'presentation']);
    });

    it('deduplicates references', () => {
      const memory = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Use [[reveal.js]] for [[reveal.js]] presentations',
        }
      );

      const references = findReferences(memory);
      expect(references).toEqual(['reveal.js']);
    });

    it('returns empty array for no references', () => {
      const memory = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        { summary: 'No references here' }
      );

      const references = findReferences(memory);
      expect(references).toEqual([]);
    });
  });

  describe('buildLinkGraph', () => {
    it('builds bidirectional link graph', () => {
      const sarah = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Sarah Chen works at [[TechCorp]]',
        }
      );

      const techcorp = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'TechCorp is a company with [[Product team]]',
        }
      );

      const graph = buildLinkGraph([sarah, techcorp]);

      // Forward refs
      expect(graph.forward.get(sarah.frontmatter.memoryId)).toContain('TechCorp');
      expect(graph.forward.get(techcorp.frontmatter.memoryId)).toContain(
        'Product team'
      );

      // Backlinks
      expect(graph.backlinks.get('TechCorp')).toContain(sarah.frontmatter.memoryId);
      expect(graph.backlinks.get('Product team')).toContain(
        techcorp.frontmatter.memoryId
      );
    });

    it('handles memories with no references', () => {
      const memory1 = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        { summary: 'No references' }
      );

      const memory2 = createMemoryFile(
        'skill',
        'global',
        'public',
        'user@example.com',
        { summary: 'References [[memory1]]' }
      );

      const graph = buildLinkGraph([memory1, memory2]);

      expect(graph.forward.get(memory1.frontmatter.memoryId)).toBeUndefined();
      expect(graph.forward.get(memory2.frontmatter.memoryId)).toContain('memory1');
    });
  });

  describe('validateLinks', () => {
    it('identifies links that are referenced in the system', () => {
      const sarah = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Sarah Chen is a product manager' }
      );

      const memory = createMemoryFile(
        'event',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Meeting with [[Sarah Chen]] about Q1 goals',
        }
      );

      const memoryIds = new Set([
        sarah.frontmatter.memoryId,
        memory.frontmatter.memoryId,
      ]);
      const index = buildCrossReferenceIndex([sarah, memory]);

      const validation = validateLinks(memory, index, memoryIds);

      // Sarah Chen is referenced and appears in the index
      expect(validation.valid).toContain('Sarah Chen');
      // Note: In this system, all references get added to the index, so
      // "broken" links are those that appear in references but not elsewhere
    });

    it('returns all valid if all links exist', () => {
      const sarah = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'Sarah Chen is a trusted collaborator for product planning.' }
      );

      const techcorp = createMemoryFile(
        'entity',
        'global',
        'public',
        'user@example.com',
        { summary: 'TechCorp is a partner organization used in planning discussions.' }
      );

      const summary = createMemoryFile(
        'event',
        'global',
        'public',
        'user@example.com',
        {
          summary: 'Meeting between [[Sarah Chen]] and [[TechCorp]] executives',
        }
      );

      const memoryIds = new Set([
        sarah.frontmatter.memoryId,
        techcorp.frontmatter.memoryId,
        summary.frontmatter.memoryId,
      ]);

      const index = buildCrossReferenceIndex([sarah, techcorp, summary]);
      const validation = validateLinks(summary, index, memoryIds);

      expect(validation.valid).toContain('Sarah Chen');
      expect(validation.valid).toContain('TechCorp');
    });
  });
});
