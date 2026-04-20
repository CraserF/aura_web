/**
 * Patch utilities for SEARCH/REPLACE edit operations.
 */

export interface SlidePatch {
  find: string;
  replace: string;
}

export interface PatchResult {
  success: boolean;
  html: string;
  failedPatches: SlidePatch[];
}

/**
 * Parse SEARCH/REPLACE blocks from model output.
 * Format:
 *   <<<<<<< FIND
 *   <exact html substring>
 *   =======
 *   <replacement html>
 *   >>>>>>> REPLACE
 */
export function parsePatchBlocks(output: string): SlidePatch[] {
  const patches: SlidePatch[] = [];
  const regex = /<<<<<<< FIND\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(output)) !== null) {
    const find = match[1] ?? '';
    const replace = match[2] ?? '';
    if (find.trim()) {
      patches.push({ find, replace });
    }
  }
  return patches;
}

/**
 * Pre-flight validation: check all FIND blocks exist in the current HTML.
 * Returns the list of patches that failed to find their target.
 */
export function dryRunPatch(currentHtml: string, patches: SlidePatch[]): SlidePatch[] {
  return patches.filter(p => !currentHtml.includes(p.find));
}

/**
 * Apply patches to HTML. All patches must pass dryRun first.
 * If any FIND block is missing, returns the original HTML unchanged.
 */
export function applyPatches(currentHtml: string, patches: SlidePatch[]): PatchResult {
  const failed = dryRunPatch(currentHtml, patches);
  if (failed.length > 0) {
    return { success: false, html: currentHtml, failedPatches: failed };
  }

  let result = currentHtml;
  for (const patch of patches) {
    result = result.replace(patch.find, patch.replace);
  }
  return { success: true, html: result, failedPatches: [] };
}
