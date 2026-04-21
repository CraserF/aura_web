/**
 * Memory Cross-Reference System
 *
 * Parses `[[entity-name]]` style links in memory content,
 * builds a cross-reference index, and enables graph-based retrieval.
 *
 * Example usage:
 *   "Discussed the sales dashboard with [[Sarah Chen]].
 *    She referenced the [[Q1 revenue report]]."
 *
 * Produces:
 *   - Link to entity: Sarah Chen
 *   - Link to report: Q1 revenue report
 */

import type {
  CrossReference,
  CrossReferenceIndex,
  MemoryFile,
  MemoryId,
} from './types';

/**
 * Regex pattern for cross-reference links: [[text]]
 * Captures both the display text and allows for variant formats
 */
const LINK_PATTERN = /\[\[([^\[\]]+)\]\]/g;

/**
 * Parse all cross-reference links from a text string
 *
 * @param text The text to parse
 * @returns Array of CrossReference objects with position info
 */
export function parseLinks(text: string): CrossReference[] {
  const links: CrossReference[] = [];
  let match;

  // Reset regex state
  LINK_PATTERN.lastIndex = 0;

  while ((match = LINK_PATTERN.exec(text)) !== null) {
    const linkText = match[1]?.trim();
    if (!linkText) {
      continue;
    }

    // Extract target (everything after | if present, else the text)
    let target = linkText;
    if (linkText.includes('|')) {
      const parts = linkText.split('|');
      target = parts[1]?.trim() || parts[0]?.trim() || linkText;
    }

    links.push({
      text: linkText,
      target,
      startPos: match.index,
      endPos: match.index + match[0].length,
    });
  }

  return links;
}

/**
 * Extract all links from a memory file
 *
 * Searches all text sections (summary, details, actionableUse)
 */
export function extractLinksFromMemory(memory: MemoryFile): CrossReference[] {
  const links: CrossReference[] = [];

  // Parse links from each section
  links.push(...parseLinks(memory.content.summary));
  links.push(...parseLinks(memory.content.details));
  links.push(...parseLinks(memory.content.actionableUse));

  return links;
}

/**
 * Build a complete cross-reference index from all memories in the system
 *
 * Maps target names to the memories that reference them
 *
 * @param memories All memory files in the system
 * @returns Index mapping target -> array of memory IDs
 */
export function buildCrossReferenceIndex(
  memories: MemoryFile[]
): CrossReferenceIndex {
  const index: CrossReferenceIndex = {};

  for (const memory of memories) {
    const links = extractLinksFromMemory(memory);

    for (const link of links) {
      if (!index[link.target]) {
        index[link.target] = [];
      }
      const ids = index[link.target];
      if (ids) {
        ids.push(memory.frontmatter.memoryId);
      }
    }
  }

  // Deduplicate memory IDs for each target
  for (const target in index) {
    index[target] = [...new Set(index[target])];
  }

  return index;
}

/**
 * Normalize a link target for matching
 * (case-insensitive, strips extra whitespace)
 */
export function normalizeTarget(target: string): string {
  return target.toLowerCase().trim();
}

/**
 * Find all memories that reference a given target
 *
 * @param index The cross-reference index
 * @param target The target entity/memory name
 * @returns Array of memory IDs that reference this target
 */
export function findReferencers(
  index: CrossReferenceIndex,
  target: string
): MemoryId[] {
  // Try exact match first
  if (index[target]) {
    return index[target] ?? [];
  }

  // Try normalized match
  const normalized = normalizeTarget(target);
  for (const key in index) {
    if (normalizeTarget(key) === normalized) {
      return index[key] ?? [];
    }
  }

  return [];
}

/**
 * Find all targets that a given memory references
 */
export function findReferences(
  memory: MemoryFile
): string[] {
  const links = extractLinksFromMemory(memory);
  return [...new Set(links.map((l) => l.target))];
}

/**
 * Check if two links refer to the same target (after normalization)
 */
export function linksEqual(link1: CrossReference, link2: CrossReference): boolean {
  return normalizeTarget(link1.target) === normalizeTarget(link2.target);
}

/**
 * Create a bidirectional link graph
 *
 * Returns both forward references (A -> B) and backlinks (B -> A)
 */
export interface LinkGraph {
  /** Forward references: from this memory, what does it reference */
  forward: Map<MemoryId, Set<string>>;
  /** Backlinks: to this memory, what references it */
  backlinks: Map<string, Set<MemoryId>>;
}

/**
 * Build a complete link graph from memories
 */
export function buildLinkGraph(memories: MemoryFile[]): LinkGraph {
  const forward = new Map<MemoryId, Set<string>>();
  const backlinks = new Map<string, Set<MemoryId>>();

  for (const memory of memories) {
    const references = findReferences(memory);

    if (references.length > 0) {
      forward.set(memory.frontmatter.memoryId, new Set(references));
    }

    for (const ref of references) {
      if (!backlinks.has(ref)) {
        backlinks.set(ref, new Set());
      }
      backlinks.get(ref)!.add(memory.frontmatter.memoryId);
    }
  }

  return { forward, backlinks };
}

/**
 * Validate links in a memory file (detect broken references)
 *
 * A link is "broken" if no memory with that name exists in the system
 * (Note: This is informational only; broken links are allowed and can be forward references)
 */
export function validateLinks(
  memory: MemoryFile,
  index: CrossReferenceIndex,
  _memoryIds: Set<MemoryId>
): { broken: string[]; valid: string[] } {
  const references = findReferences(memory);
  const broken: string[] = [];
  const valid: string[] = [];

  for (const ref of references) {
    // A link is valid if something has that exact name OR if it's referenced by existing memories
    // A link is broken if nothing references it AND it doesn't exist as a target
    
    // Check if this reference exists as a key in the index (meaning other memories reference it)
    // or if it's mentioned in memory summaries (would be caught by extracting link sources)
    const hasReferences = ref in index;
    
    if (hasReferences) {
      valid.push(ref);
    } else {
      // This target has no referencing memories, so it's potentially broken
      broken.push(ref);
    }
  }

  return { broken, valid };
}

/**
 * Replace a target link with a new one throughout a memory file
 * (Used when merging/consolidating memories)
 */
export function replaceLinkTarget(
  memory: MemoryFile,
  oldTarget: string,
  newTarget: string
): MemoryFile {
  const updated = structuredClone(memory);

  const replacer = (text: string) =>
    text.replace(
      new RegExp(`\\[\\[${escapeRegex(oldTarget)}(\\|[^\\]]*)?\\]\\]`, 'g'),
      `[[${newTarget}]]`
    );

  updated.content.summary = replacer(updated.content.summary);
  updated.content.details = replacer(updated.content.details);
  updated.content.actionableUse = replacer(updated.content.actionableUse);

  return updated;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format a link target for display
 * (Removes special formatting)
 */
export function formatLinkTarget(target: string): string {
  // Remove common prefixes (project:, doc:, etc.)
  let formatted = target.replace(/^[a-z]+:/, '');
  // Replace hyphens and underscores with spaces for readability
  formatted = formatted.replace(/[-_]/g, ' ');
  // Title case
  formatted = formatted
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return formatted;
}
