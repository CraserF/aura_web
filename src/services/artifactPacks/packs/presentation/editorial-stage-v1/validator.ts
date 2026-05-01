import type {
  ArtifactCompiledOutput,
  ArtifactValidationFinding,
  ArtifactValidationReport,
  ArtifactValidationSeverity,
} from '@/services/artifactPacks/types';
import {
  EDITORIAL_STAGE_LAYOUT_BY_ID,
  type EditorialStageLayout,
  type EditorialStageLayoutId,
} from './layouts';
import {
  editorialStageLayoutIds,
  editorialStageSourceSchema,
  type EditorialStageSlide,
  type EditorialStageSource,
} from './schemas';

const PACK_ID = 'presentation/editorial-stage-v1';
const TITLE_RISK_LENGTH = 92;
const HTML_PATTERN = /<\/?[a-z][\s\S]*>/i;
const INLINE_STYLE_PATTERN = /\sstyle\s*=/i;
const STYLE_SYSTEM_PATTERN =
  /<style\b[^>]*data-aura-style-system=["']presentation\/editorial-stage-v1["'][^>]*>/gi;
const ANY_STYLE_PATTERN = /<style\b/gi;
const STYLE_BLOCK_CONTENT_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const SLOT_TOKEN_PATTERN = /\{\{\s*[\w.-]+\s*\}\}/;
const ROOT_SELECTOR_PATTERN = /(?:^|[{}])\s*:root\b/i;
const VIEWPORT_UNIT_PATTERN = /(?:^|[^\w-])-?\d*\.?\d+(?:vw|vh|vmin|vmax)\b/i;
const MOTION_DECLARATION_PATTERN = /\b(?:animation|transition)\s*:/i;
const REDUCED_MOTION_PATTERN = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i;
const PPTX_UNSUPPORTED_CSS_PATTERN =
  /\b(?:backdrop-filter|filter|mix-blend-mode|clip-path|mask(?:-image|-mode|-repeat|-size)?|shape-outside)\s*:/i;
const PPTX_NESTED_SPAN_PATTERN = /<span\b[^>]*>[\s\S]*?<span\b/i;
const TEXT_AS_IMAGE_PATTERN =
  /<svg\b[\s\S]*?<text\b|data-text-as-image|data-rendered-text-image/i;
const FALLBACK_COPY_PATTERNS: Array<[RegExp, string]> = [
  [/\bA clearer path forward\b/i, 'A clearer path forward'],
  [/\bFrame the point\b/i, 'Frame the point'],
  [/\bFocused point\b/i, 'Focused point'],
  [/\bCurrent\s*\/\s*Proposed\b/i, 'Current / Proposed'],
];

type SourceLike = EditorialStageSource | unknown;

const isSlideArray = (value: unknown): value is readonly EditorialStageSlide[] =>
  Array.isArray(value) &&
  value.every(
    (slide) =>
      typeof slide === 'object' &&
      slide !== null &&
      typeof (slide as { layoutId?: unknown }).layoutId === 'string' &&
      typeof (slide as { slots?: unknown }).slots === 'object' &&
      (slide as { slots?: unknown }).slots !== null,
  );

const report = (findings: ArtifactValidationFinding[]): ArtifactValidationReport => {
  const blockingCount = findings.filter((finding) => finding.severity === 'blocking').length;
  const advisoryCount = findings.filter((finding) => finding.severity === 'advisory').length;

  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    findings,
  };
};

const finding = (
  id: string,
  severity: ArtifactValidationSeverity,
  message: string,
  path?: readonly (string | number)[],
): ArtifactValidationFinding => ({
  id,
  severity,
  message,
  artifactType: 'presentation',
  path,
  packId: PACK_ID,
});

const layoutForSlide = (slide: { layoutId: string }): EditorialStageLayout | undefined =>
  EDITORIAL_STAGE_LAYOUT_BY_ID[slide.layoutId as EditorialStageLayoutId];

const slotText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const pushSchemaFindings = (input: SourceLike, findings: ArtifactValidationFinding[]) => {
  const parsed = editorialStageSourceSchema.safeParse(input);
  if (parsed.success) {
    return;
  }

  for (const issue of parsed.error.issues) {
    findings.push(
      finding(
        'source.schema_invalid',
        'blocking',
        issue.message,
        issue.path.map((part) => (typeof part === 'symbol' ? part.toString() : part)),
      ),
    );
  }
};

const pushSlotFindings = (
  slides: readonly EditorialStageSlide[],
  findings: ArtifactValidationFinding[],
) => {
  slides.forEach((slide, slideIndex) => {
    const layout = layoutForSlide(slide);

    if (!layout) {
      findings.push(
        finding(
          'slide.layout_unknown',
          'blocking',
          `Slide ${slideIndex + 1} uses unknown layout "${slide.layoutId}".`,
          ['slides', slideIndex, 'layoutId'],
        ),
      );
      return;
    }

    const declaredSlots = new Set(layout.slots.map((slot) => slot.id));
    const declaredMediaSlots = new Map(layout.mediaSlots.map((slot) => [slot.id, slot]));

    for (const slot of layout.slots) {
      const value = slotText(slide.slots[slot.id]);

      if (slot.required && value.length === 0) {
        findings.push(
          finding(
            'slot.required_missing',
            'blocking',
            `Slide ${slideIndex + 1} is missing required slot "${slot.id}" for ${layout.id}.`,
            ['slides', slideIndex, 'slots', slot.id],
          ),
        );
      }

      if (value.length > slot.maxLength) {
        findings.push(
          finding(
            slot.kind === 'title' ? 'title.too_long_for_layout' : 'slot.too_long_for_layout',
            slot.kind === 'title' ? 'advisory' : 'blocking',
            `Slide ${slideIndex + 1} slot "${slot.id}" is ${value.length} characters; ${layout.id} allows ${slot.maxLength}.`,
            ['slides', slideIndex, 'slots', slot.id],
          ),
        );
      }

      if (
        slot.kind === 'metric-value' &&
        value.length > 0 &&
        slide.sourceNotes.length === 0
      ) {
        findings.push(
          finding(
            'presentation.fake_metric',
            'advisory',
            `Slide ${slideIndex + 1} metric slot "${slot.id}" needs a source note or explicit evidence reference.`,
            ['slides', slideIndex, 'slots', slot.id],
          ),
        );
      }

      const fallbackPattern = FALLBACK_COPY_PATTERNS.find(([pattern]) => pattern.test(value));
      if (fallbackPattern) {
        findings.push(
          finding(
            'presentation.fallback_copy',
            'advisory',
            `Slide ${slideIndex + 1} still contains fallback copy "${fallbackPattern[1]}"; replace it with source-derived language.`,
            ['slides', slideIndex, 'slots', slot.id],
          ),
        );
      }
    }

    for (const [slotId, value] of Object.entries(slide.slots)) {
      if (!declaredSlots.has(slotId)) {
        findings.push(
          finding(
            'slot.unknown_key',
            'advisory',
            `Slide ${slideIndex + 1} includes undeclared slot "${slotId}" for ${layout.id}.`,
            ['slides', slideIndex, 'slots', slotId],
          ),
        );
      }

      if (typeof value === 'string' && HTML_PATTERN.test(value)) {
        findings.push(
          finding(
            'slot.html_detected',
            'blocking',
            `Slide ${slideIndex + 1} slot "${slotId}" contains HTML-like markup; slots must be plain text.`,
            ['slides', slideIndex, 'slots', slotId],
          ),
        );
      }
    }

    for (const mediaSlot of layout.mediaSlots) {
      const binding = slide.media.find((media) => media.slotId === mediaSlot.id);
      if (mediaSlot.required && !binding) {
        findings.push(
          finding(
            'presentation.asset_missing_when_required',
            'blocking',
            `Slide ${slideIndex + 1} uses ${layout.id}, which requires media slot "${mediaSlot.id}". Bind an asset or choose a non-media layout.`,
            ['slides', slideIndex, 'media', mediaSlot.id],
          ),
        );
      }
    }

    for (const [mediaIndex, media] of slide.media.entries()) {
      const mediaSlot = declaredMediaSlots.get(media.slotId);
      if (!mediaSlot) {
        findings.push(
          finding(
            'media.slot_unknown',
            'blocking',
            `Slide ${slideIndex + 1} binds undeclared media slot "${media.slotId}" for ${layout.id}.`,
            ['slides', slideIndex, 'media', mediaIndex, 'slotId'],
          ),
        );
        continue;
      }

      if (!mediaSlot.aspectRatios.includes(media.aspectRatio)) {
        findings.push(
          finding(
            'media.aspect_invalid',
            'blocking',
            `Slide ${slideIndex + 1} media slot "${media.slotId}" uses unsupported aspect ratio "${media.aspectRatio}".`,
            ['slides', slideIndex, 'media', mediaIndex, 'aspectRatio'],
          ),
        );
      }

      if (!mediaSlot.cropModes.includes(media.cropMode)) {
        findings.push(
          finding(
            'media.crop_invalid',
            'blocking',
            `Slide ${slideIndex + 1} media slot "${media.slotId}" uses unsafe crop mode "${media.cropMode}".`,
            ['slides', slideIndex, 'media', mediaIndex, 'cropMode'],
          ),
        );
      }
    }

    const titleSlot = layout.slots.find((slot) => slot.kind === 'title');
    const title = titleSlot ? slotText(slide.slots[titleSlot.id]) : '';
    if (title.length > TITLE_RISK_LENGTH) {
      findings.push(
        finding(
          'title.too_long_for_layout',
          'advisory',
          `Slide ${slideIndex + 1} title is ${title.length} characters and may overflow the ${layout.id} composition.`,
          ['slides', slideIndex, 'slots', titleSlot?.id ?? 'title'],
        ),
      );
    }
  });
};

const pushRhythmFindings = (
  slides: readonly EditorialStageSlide[],
  findings: ArtifactValidationFinding[],
) => {
  slides.forEach((slide, index) => {
    if (index > 0 && slide.layoutId === slides[index - 1]?.layoutId) {
      findings.push(
        finding(
          'rhythm.adjacent_repeated_layout',
          'advisory',
          `Slides ${index} and ${index + 1} repeat ${slide.layoutId}; vary layout rhythm unless this is intentional.`,
          ['slides', index, 'layoutId'],
        ),
      );
    }
  });

  if (slides.length >= 6) {
    for (let start = 0; start < slides.length; start += 4) {
      const window = slides.slice(start, Math.min(start + 4, slides.length));
      const hasBreaker = window.some(
        (slide) =>
          slide.visualWeight === 'hero' ||
          slide.role === 'title-scene' ||
          slide.role === 'transition' ||
          slide.role === 'question' ||
          slide.layoutId === 'cover' ||
          slide.layoutId === 'section-divider' ||
          slide.layoutId === 'question-hero',
      );

      if (window.length >= 3 && !hasBreaker) {
        findings.push(
          finding(
            'rhythm.hero_breaker_gap',
            'advisory',
            `Slides ${start + 1}-${start + window.length} need a hero or breaker to reset attention every 3-4 slides.`,
            ['slides', start],
          ),
        );
      }
    }
  }

  let mediaWallRun = 0;
  slides.forEach((slide, index) => {
    const isCardOrMediaWall =
      slide.layoutId === 'media-grid' ||
      slide.layoutId === 'lead-media' ||
      slide.layoutId === 'comparison' ||
      slide.density === 'dense';

    mediaWallRun = isCardOrMediaWall ? mediaWallRun + 1 : 0;

    if (mediaWallRun >= 3) {
      findings.push(
        finding(
          'rhythm.repeated_card_media_wall_risk',
          'advisory',
          `Slides ${index - mediaWallRun + 2}-${index + 1} may read as a repeated card/media wall.`,
          ['slides', index],
        ),
      );
    }
  });
};

export const validateEditorialStageSource = (input: SourceLike): ArtifactValidationReport => {
  const findings: ArtifactValidationFinding[] = [];

  pushSchemaFindings(input, findings);

  const maybeSlides = (input as { slides?: unknown } | null | undefined)?.slides;
  if (isSlideArray(maybeSlides)) {
    pushSlotFindings(maybeSlides, findings);
    pushRhythmFindings(maybeSlides, findings);
  }

  return report(findings);
};

export const validateEditorialStageCompiledOutput = (
  output: ArtifactCompiledOutput | string,
): ArtifactValidationReport => {
  const content = typeof output === 'string' ? output : output.content;
  const outputMode = typeof output === 'string' ? 'html' : output.mode;
  const findings: ArtifactValidationFinding[] = [];
  const styleSystemCount = [...content.matchAll(STYLE_SYSTEM_PATTERN)].length;
  const anyStyleCount = [...content.matchAll(ANY_STYLE_PATTERN)].length;
  const styleText = [...content.matchAll(STYLE_BLOCK_CONTENT_PATTERN)]
    .map((match) => match[1] ?? '')
    .join('\n');
  const sectionCount = [...content.matchAll(/<section\b/gi)].length;
  const markerCount = [...content.matchAll(/<section\b(?=[^>]*(?:data-pack|data-scaffold)=)/gi)].length;
  const backgroundMarkerCount = [...content.matchAll(/<section\b(?=[^>]*\sdata-background-color=)/gi)].length;

  if (styleSystemCount !== 1 || anyStyleCount !== 1) {
    findings.push(
      finding(
        'compiled.style_block_invalid',
        'blocking',
        'Compiled output must contain exactly one compiler-owned style block for presentation/editorial-stage-v1.',
        ['content'],
      ),
    );
  }

  if (INLINE_STYLE_PATTERN.test(content)) {
    findings.push(
      finding(
        'compiled.inline_style_detected',
        'blocking',
        'Compiled output must not contain raw inline style attributes.',
        ['content'],
      ),
    );
  }

  if (SLOT_TOKEN_PATTERN.test(content)) {
    findings.push(
      finding(
        'compiled.placeholder_unresolved',
        'blocking',
        'Compiled output contains unresolved {{slot}} placeholders.',
        ['content'],
      ),
    );
  }

  if (sectionCount > 0 && markerCount !== sectionCount) {
    findings.push(
      finding(
        'compiled.section_marker_missing',
        'blocking',
        'Every compiled section must include data-pack or data-scaffold metadata.',
        ['content'],
      ),
    );
  }

  if (sectionCount > 0 && backgroundMarkerCount !== sectionCount) {
    findings.push(
      finding(
        'export.background_color_missing',
        'blocking',
        'Every compiled section must declare a concrete data-background-color for export surfaces.',
        ['content'],
      ),
    );
  }

  if (ROOT_SELECTOR_PATTERN.test(styleText)) {
    findings.push(
      finding(
        'compiled.global_root_selector_detected',
        'blocking',
        'Compiled pack CSS must not declare :root variables because artifact styles must stay scoped to compiled sections.',
        ['content'],
      ),
    );
  }

  if (VIEWPORT_UNIT_PATTERN.test(styleText)) {
    findings.push(
      finding(
        'export.viewport_units_detected',
        'blocking',
        'Compiled presentation output must not use viewport units inside the fixed 1280x720 export stage.',
        ['content'],
      ),
    );
  }

  if (MOTION_DECLARATION_PATTERN.test(styleText) && !REDUCED_MOTION_PATTERN.test(styleText)) {
    findings.push(
      finding(
        'export.reduced_motion_missing',
        'blocking',
        'Compiled presentation output with CSS motion must include a prefers-reduced-motion fallback.',
        ['content'],
      ),
    );
  }

  if (/<script\b/i.test(content)) {
    findings.push(
      finding(
        'compiled.script_detected',
        'blocking',
        'Compiled presentation output must not include script tags.',
        ['content'],
      ),
    );
  }

  if (outputMode === 'editable-pptx' && PPTX_UNSUPPORTED_CSS_PATTERN.test(styleText)) {
    findings.push(
      finding(
        'export.pptx_unsupported_css',
        'blocking',
        'Editable PPTX output forbids filter, mask, blend, clip-path, and shape CSS that cannot round-trip safely.',
        ['content'],
      ),
    );
  }

  if (outputMode === 'editable-pptx' && PPTX_NESTED_SPAN_PATTERN.test(content)) {
    findings.push(
      finding(
        'export.pptx_nested_span_risk',
        'blocking',
        'Editable PPTX output forbids nested span text structures because they do not produce reliable editable text boxes.',
        ['content'],
      ),
    );
  }

  if (outputMode === 'editable-pptx' && TEXT_AS_IMAGE_PATTERN.test(content)) {
    findings.push(
      finding(
        'export.pptx_text_as_image_detected',
        'blocking',
        'Editable PPTX output must keep text semantic instead of rendering text as SVG/image content.',
        ['content'],
      ),
    );
  }

  if (/<div\b[^>]*class=["'][^"']*\bes-media-bound\b[^"']*["'][^>]*>\s*<span>/i.test(content)) {
    findings.push(
      finding(
        'compiled.media_unresolved_placeholder',
        'advisory',
        'Compiled output contains a bound media placeholder without a resolved image asset.',
        ['content'],
      ),
    );
  }

  return report(findings);
};

export const validateEditorialStageLayoutSequence = (
  layoutIds: readonly string[],
): ArtifactValidationReport => {
  const slides = layoutIds
    .filter((layoutId): layoutId is EditorialStageLayoutId =>
      editorialStageLayoutIds.includes(layoutId as EditorialStageLayoutId),
    )
    .map((layoutId, index): EditorialStageSlide => ({
      slideId: `slide-${index + 1}`,
      layoutId,
      role: EDITORIAL_STAGE_LAYOUT_BY_ID[layoutId].role as EditorialStageSlide['role'],
      mood: EDITORIAL_STAGE_LAYOUT_BY_ID[layoutId].defaultMood,
      density: EDITORIAL_STAGE_LAYOUT_BY_ID[layoutId].defaultDensity,
      visualWeight: EDITORIAL_STAGE_LAYOUT_BY_ID[layoutId].defaultMood.startsWith('hero')
        ? 'hero'
        : 'standard',
      motion: EDITORIAL_STAGE_LAYOUT_BY_ID[layoutId].motion,
      slots: {},
      media: [],
      sourceNotes: [],
    }));

  const findings: ArtifactValidationFinding[] = [];
  pushRhythmFindings(slides, findings);
  return report(findings);
};
