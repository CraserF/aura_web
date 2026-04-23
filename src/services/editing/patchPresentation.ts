import { applyPatches, parsePatchBlocks } from '@/services/ai/workflow/patchUtils';
import type { ProjectDocument } from '@/types/project';

import type { ResolvedTarget, TargetSelector } from '@/services/editing/types';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractSections(html: string): string[] {
  return html.match(/<section[\s\S]*?<\/section>/gi) ?? [];
}

export function resolvePresentationTargets(
  document: ProjectDocument,
  selectors: TargetSelector[],
): ResolvedTarget[] {
  const sections = extractSections(document.contentHtml);
  const resolved: ResolvedTarget[] = [];

  for (const selector of selectors) {
    if (selector.type === 'deck-style') {
      resolved.push({
        selector,
        artifactType: 'presentation',
        label: selector.label ?? 'Deck style tokens',
      });
      continue;
    }

    if (selector.type === 'current-slide') {
      const first = sections[0];
      if (first) {
        resolved.push({
          selector,
          artifactType: 'presentation',
          slideIndex: 0,
          label: selector.label ?? 'Current slide',
          matchedText: stripHtml(first),
        });
      }
      continue;
    }

    if (selector.type === 'slide-number') {
      const index = Math.max(0, Number.parseInt(selector.value ?? '1', 10) - 1);
      const section = sections[index];
      if (section) {
        resolved.push({
          selector,
          artifactType: 'presentation',
          slideIndex: index,
          label: selector.label ?? `Slide ${index + 1}`,
          matchedText: stripHtml(section),
        });
      }
      continue;
    }

    if (selector.type === 'slide-title') {
      const needle = selector.value?.trim().toLowerCase();
      if (!needle) continue;
      sections.forEach((section, index) => {
        if (stripHtml(section).toLowerCase().includes(needle)) {
          resolved.push({
            selector,
            artifactType: 'presentation',
            slideIndex: index,
            label: selector.label ?? `Slide ${index + 1}`,
            matchedText: stripHtml(section),
          });
        }
      });
    }
  }

  return resolved;
}

export function applyPresentationPatchBlocks(existingHtml: string, draftText: string): {
  success: boolean;
  html: string;
  dryRunFailures: string[];
  patchCount: number;
} {
  const patches = parsePatchBlocks(draftText);
  if (patches.length === 0) {
    return {
      success: false,
      html: existingHtml,
      dryRunFailures: [],
      patchCount: 0,
    };
  }

  const patchResult = applyPatches(existingHtml, patches);
  return {
    success: patchResult.success,
    html: patchResult.html,
    dryRunFailures: patchResult.failedPatches.map((patch) => patch.find.slice(0, 120)),
    patchCount: patches.length,
  };
}
