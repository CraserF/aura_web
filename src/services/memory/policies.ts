/**
 * Memory Update Policies
 *
 * Enforces update strategies (merge, append, immutable) to ensure
 * memory files are modified consistently with their intended use.
 */

import type {
  MemoryFile,
  UpdateStrategy,
  MemoryContent,
} from './types';

/**
 * Apply an update to an existing memory file based on update strategy
 *
 * - **merge**: Deep merge new content, preserving old facts
 * - **append**: Only append new evidence, don't replace existing content
 * - **immutable**: Reject any updates
 */
export function applyUpdatePolicy(
  existing: MemoryFile,
  updated: MemoryFile,
  strategy: UpdateStrategy
): { success: boolean; result?: MemoryFile; error?: string } {
  switch (strategy) {
    case 'immutable':
      return {
        success: false,
        error: 'Cannot update immutable memory file. Create a new version instead.',
      };

    case 'append':
      return applyAppendPolicy(existing, updated);

    case 'merge':
      return applyMergePolicy(existing, updated);
  }
}

/**
 * Merge strategy: Intelligently combine old and new content
 *
 * Rules:
 * - If new summary is better (longer, more specific), use new; else keep old
 * - Merge details: combine if different, replace if old is outdated
 * - Combine evidence: union of old and new, remove duplicates
 * - Update actionableUse to newer version
 * - Bump version counter
 * - Update timestamps
 */
function applyMergePolicy(
  existing: MemoryFile,
  updated: MemoryFile
): { success: boolean; result: MemoryFile } {
  const merged = structuredClone(existing);

  // Merge content intelligently
  merged.content = mergeContent(existing.content, updated.content);

  // Update metadata
  merged.frontmatter.version++;
  merged.frontmatter.updatedAt = new Date().toISOString();
  merged.frontmatter.tags = [
    ...new Set([...merged.frontmatter.tags, ...updated.frontmatter.tags]),
  ];
  merged.frontmatter.sourceRefs = [
    ...new Set([
      ...merged.frontmatter.sourceRefs,
      ...updated.frontmatter.sourceRefs,
    ]),
  ];

  return { success: true, result: merged };
}

/**
 * Merge content sections intelligently
 */
function mergeContent(
  existing: MemoryContent,
  updated: MemoryContent
): MemoryContent {
  return {
    // Use new summary if it's significantly different/better
    summary:
      updated.summary.length > existing.summary.length * 1.1
        ? updated.summary
        : existing.summary,

    // Merge details: combine if both exist and differ, otherwise prefer non-empty
    details: existing.details && updated.details
      ? (existing.details === updated.details
          ? existing.details
          : `${existing.details}\n\n${updated.details}`)
      : (existing.details || updated.details),

    // Union of evidence (remove duplicates, preserve order)
    evidence: [...new Set([...(existing.evidence || []), ...(updated.evidence || [])])],

    // Use new actionableUse if provided, else keep existing
    actionableUse: updated.actionableUse || existing.actionableUse,
  };
}

/**
 * Append strategy: Only allow adding new evidence, no content replacement
 *
 * Rules:
 * - Summary, details, actionableUse must remain identical
 * - Append new evidence items (union with existing)
 * - Reject update if core content differs
 * - Bump version counter
 */
function applyAppendPolicy(
  existing: MemoryFile,
  updated: MemoryFile
): { success: boolean; result?: MemoryFile; error?: string } {
  // Check that core content hasn't changed
  if (
    updated.content.summary !== existing.content.summary ||
    updated.content.details !== existing.content.details ||
    updated.content.actionableUse !== existing.content.actionableUse
  ) {
    return {
      success: false,
      error:
        'Append strategy does not allow modifying summary, details, or actionableUse. Only new evidence can be appended.',
    };
  }

  const appended = structuredClone(existing);

  // Only add new evidence
  const newEvidence = updated.content.evidence.filter(
    (e) => !existing.content.evidence.includes(e)
  );
  appended.content.evidence = [
    ...existing.content.evidence,
    ...newEvidence,
  ];

  // Update metadata
  appended.frontmatter.version++;
  appended.frontmatter.updatedAt = new Date().toISOString();
  appended.frontmatter.sourceRefs = [
    ...new Set([
      ...appended.frontmatter.sourceRefs,
      ...updated.frontmatter.sourceRefs,
    ]),
  ];

  return { success: true, result: appended };
}

/**
 * Validate that an update conforms to the update strategy
 * (Used before applying policy for early validation)
 */
export function validateUpdateConformance(
  strategy: UpdateStrategy,
  existing: MemoryFile,
  proposed: MemoryFile
): { valid: boolean; error?: string } {
  switch (strategy) {
    case 'immutable':
      // Always fail on immutable
      if (
        JSON.stringify(existing.frontmatter) !==
          JSON.stringify(proposed.frontmatter) ||
        JSON.stringify(existing.content) !==
          JSON.stringify(proposed.content)
      ) {
        return {
          valid: false,
          error: 'Cannot modify immutable memory file',
        };
      }
      return { valid: true };

    case 'append':
      // Only evidence can be added
      if (
        existing.content.summary !== proposed.content.summary ||
        existing.content.details !== proposed.content.details ||
        existing.content.actionableUse !== proposed.content.actionableUse
      ) {
        return {
          valid: false,
          error: 'Append strategy only allows adding evidence',
        };
      }
      return { valid: true };

    case 'merge':
      // Anything goes
      return { valid: true };
  }
}

/**
 * Get the default update strategy for a memory category
 * (Used when strategy is not explicitly specified)
 */
export function getDefaultStrategy(type: string): UpdateStrategy {
  const strategies: Record<string, UpdateStrategy> = {
    identity: 'merge',
    skill: 'merge',
    entity: 'append',
    event: 'immutable',
    case: 'immutable',
    pattern: 'merge',
    tool: 'merge',
    context: 'merge',
  };

  return strategies[type] || 'merge';
}
