import type {
  DeckRhythmPlan,
  PresentationExportIntent,
  PresentationScaffold,
  ScaffoldValidationFinding,
  ScaffoldValidationResult,
} from './types';
import { extractScaffoldSections, extractScaffoldSlotInventory } from './compiler';

export interface ValidateScaffoldedDeckInput {
  html: string;
  scaffold: PresentationScaffold;
  rhythmPlan?: DeckRhythmPlan;
  exportIntent?: PresentationExportIntent;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function extractStyleBlocks(html: string): string[] {
  return html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? [];
}

function extractStyleText(html: string): string {
  return extractStyleBlocks(html)
    .map((block) => block.replace(/<\/?style[^>]*>/gi, ''))
    .join('\n');
}

function extractCssClasses(styleText: string): string[] {
  return unique(Array.from(styleText.matchAll(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g))
    .map((match) => match[1])
    .filter((className): className is string => Boolean(className)));
}

function extractHtmlClasses(sections: string[]): string[] {
  return unique(sections.flatMap((section) =>
    Array.from(section.matchAll(/\bclass=["']([^"']+)["']/gi))
      .flatMap((match) => (match[1] ?? '').split(/\s+/))
      .map((className) => className.trim())
      .filter(Boolean)));
}

function hasConcreteBackground(section: string): boolean {
  return /\bdata-background-color=["']#[0-9a-f]{6}["']/i.test(section);
}

function sectionTitle(section: string): string {
  const match = section.match(/<h[12][^>]*\bdata-slot=["']title["'][^>]*>([\s\S]*?)<\/h[12]>/i);
  return (match?.[1] ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function addFinding(
  findings: ScaffoldValidationFinding[],
  finding: ScaffoldValidationFinding,
) {
  findings.push(finding);
}

function validateClassCoverage(input: {
  findings: ScaffoldValidationFinding[];
  sections: string[];
  styleText: string;
  scaffold: PresentationScaffold;
}) {
  const cssClasses = new Set([
    ...extractCssClasses(input.styleText),
    ...input.scaffold.approvedRuntimeClasses,
    ...input.scaffold.skeletons.flatMap((skeleton) => skeleton.approvedClasses),
  ]);

  for (const className of extractHtmlClasses(input.sections)) {
    if (cssClasses.has(className)) continue;
    addFinding(input.findings, {
      id: 'undefined-class',
      severity: 'blocking',
      className,
      message: `Class "${className}" is not defined in the scaffold CSS or approved runtime class list.`,
    });
  }
}

function validateRhythm(input: {
  findings: ScaffoldValidationFinding[];
  rhythmPlan?: DeckRhythmPlan;
}) {
  const entries = input.rhythmPlan?.entries ?? [];
  if (entries.length === 0) return;

  for (let index = 1; index < entries.length - 1; index += 1) {
    const prev = entries[index - 1];
    const current = entries[index];
    const next = entries[index + 1];
    if (!prev || !current || !next) continue;
    if (prev.mood === current.mood && current.mood === next.mood && prev.density === current.density && current.density === next.density) {
      addFinding(input.findings, {
        id: 'repeated-density-mood',
        severity: 'advisory',
        slideIndex: current.slideIndex,
        message: 'Three-slide run repeats the same mood and density.',
      });
    }
  }

  for (let index = 1; index < entries.length; index += 1) {
    const prev = entries[index - 1];
    const current = entries[index];
    if (!prev || !current) continue;
    const bothContent = !['cover', 'closing-action'].includes(prev.skeletonId)
      && !['cover', 'closing-action'].includes(current.skeletonId);
    if (bothContent && prev.skeletonId === current.skeletonId) {
      addFinding(input.findings, {
        id: 'repeated-skeleton',
        severity: 'advisory',
        slideIndex: current.slideIndex,
        message: `Adjacent content slides repeat the "${current.skeletonId}" skeleton.`,
      });
    }
  }
}

function validateExportIntent(input: {
  findings: ScaffoldValidationFinding[];
  exportIntent?: PresentationExportIntent;
  styleText: string;
  html: string;
}) {
  if (input.exportIntent !== 'editable-pptx') return;
  if (/\b(?:filter|backdrop-filter|mix-blend-mode)\s*:/i.test(input.styleText)) {
    addFinding(input.findings, {
      id: 'invalid-export-intent',
      severity: 'blocking',
      message: 'Editable PPTX mode forbids complex CSS filters and blend modes.',
    });
  }

  const nestedSpanRisk = (input.html.match(/<span\b/gi) ?? []).length;
  if (nestedSpanRisk > 24) {
    addFinding(input.findings, {
      id: 'invalid-export-intent',
      severity: 'advisory',
      message: 'Editable PPTX mode should avoid excessive nested text spans.',
    });
  }
}

export function validateScaffoldedDeck(input: ValidateScaffoldedDeckInput): ScaffoldValidationResult {
  const findings: ScaffoldValidationFinding[] = [];
  const styleBlocks = extractStyleBlocks(input.html);
  const styleText = extractStyleText(input.html);
  const sections = extractScaffoldSections(input.html);

  if (styleBlocks.length !== 1) {
    addFinding(findings, {
      id: 'style-system-count',
      severity: 'blocking',
      message: `Expected exactly one scaffold style block, found ${styleBlocks.length}.`,
    });
  }

  validateClassCoverage({ findings, sections, styleText, scaffold: input.scaffold });

  if (/\sstyle\s*=/i.test(input.html)) {
    addFinding(findings, {
      id: 'inline-style',
      severity: 'blocking',
      message: 'Inline style attributes are not allowed in scaffolded presentation output.',
    });
  }

  if (/\b(?:font-size|width|height|min-width|min-height|max-width|max-height|inset|top|right|bottom|left|padding|margin|gap)\s*:[^;{}]*(?:vw|vh|dvw|dvh|vmin|vmax)\b/i.test(styleText)) {
    addFinding(findings, {
      id: 'viewport-unit',
      severity: 'blocking',
      message: 'Viewport units are not allowed for scaffolded type or layout sizing.',
    });
  }

  if (/\b(?:animation\s*:|@keyframes\b)/i.test(styleText) && !/prefers-reduced-motion/i.test(styleText)) {
    addFinding(findings, {
      id: 'missing-reduced-motion',
      severity: 'blocking',
      message: 'Animation exists without a prefers-reduced-motion fallback.',
    });
  }

  sections.forEach((section, index) => {
    if (!hasConcreteBackground(section)) {
      addFinding(findings, {
        id: 'missing-background',
        severity: 'blocking',
        slideIndex: index + 1,
        message: 'Slide is missing a concrete data-background-color value.',
      });
    }

    const title = sectionTitle(section);
    if (title.length > 96) {
      addFinding(findings, {
        id: 'title-length-risk',
        severity: 'advisory',
        slideIndex: index + 1,
        message: 'Title may be too long for the selected scaffold layout.',
      });
    }
  });

  if (/\{\{[^}]+\}\}|PLACEHOLDER|TODO|Lorem ipsum/i.test(input.html)) {
    addFinding(findings, {
      id: 'placeholder-token',
      severity: 'blocking',
      message: 'Scaffolded deck still contains placeholder or template tokens.',
    });
  }

  if (/[\p{Extended_Pictographic}]/u.test(input.html)) {
    addFinding(findings, {
      id: 'emoji-icon',
      severity: 'blocking',
      message: 'Emoji pictographs are not allowed as presentation icons.',
    });
  }

  for (const inventoryItem of extractScaffoldSlotInventory(input.html)) {
    const skeleton = input.scaffold.skeletons.find((candidate) => candidate.id === inventoryItem.skeletonId);
    const slot = skeleton?.slots.find((candidate) => candidate.id === inventoryItem.slotId);
    if (slot?.required && !inventoryItem.value.trim()) {
      addFinding(findings, {
        id: 'missing-required-slot',
        severity: 'blocking',
        slideIndex: inventoryItem.slideIndex,
        slotId: inventoryItem.slotId,
        message: `Required slot "${inventoryItem.slotId}" is empty.`,
      });
    }
  }

  validateRhythm({ findings, rhythmPlan: input.rhythmPlan });
  validateExportIntent({
    findings,
    exportIntent: input.exportIntent ?? input.rhythmPlan?.exportIntent,
    styleText,
    html: input.html,
  });

  const blockingCount = findings.filter((finding) => finding.severity === 'blocking').length;
  const advisoryCount = findings.length - blockingCount;

  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    findings,
  };
}
