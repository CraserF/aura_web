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
const SLOT_TOKEN_PATTERN = /\{\{\s*[\w.-]+\s*\}\}/;

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
  const findings: ArtifactValidationFinding[] = [];
  const styleSystemCount = [...content.matchAll(STYLE_SYSTEM_PATTERN)].length;
  const anyStyleCount = [...content.matchAll(ANY_STYLE_PATTERN)].length;
  const sectionCount = [...content.matchAll(/<section\b/gi)].length;
  const markerCount = [...content.matchAll(/<section\b(?=[^>]*(?:data-pack|data-scaffold)=)/gi)].length;

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
