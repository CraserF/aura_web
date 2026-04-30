import type {
  ArtifactCompiledOutput,
  ArtifactMediaResolver,
  ArtifactOutputMode,
  ArtifactPackCompileResult,
  ArtifactStructurePlan,
  ArtifactValidationFinding,
  ArtifactValidationReport,
  DesignContextSpec,
} from '@/services/artifactPacks/types';
import {
  EDITORIAL_STAGE_LAYOUT_BY_ID,
  type EditorialStageLayout,
} from './layouts';
import type { EditorialStageSlide, EditorialStageSource } from './schemas';
import {
  validateEditorialStageCompiledOutput,
  validateEditorialStageSource,
} from './validator';
import styleCss from 'virtual:artifact-pack-css/presentation-editorial-stage-v1';

const PACK_ID = 'presentation/editorial-stage-v1';
const STYLE_SYSTEM_ATTRIBUTE = `data-aura-style-system="${PACK_ID}"`;

export interface EditorialStageCompileInput {
  source: EditorialStageSource;
  structure?: ArtifactStructurePlan;
  designContext?: DesignContextSpec;
  outputMode?: ArtifactOutputMode;
  mediaResolver?: ArtifactMediaResolver;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const styleBlock = (): string => `<style ${STYLE_SYSTEM_ATTRIBUTE}>
${styleCss.trim()}
</style>`;

const mergeReports = (...reports: ArtifactValidationReport[]): ArtifactValidationReport => {
  const findings = reports.flatMap((report) => [...report.findings]);
  const blockingCount = findings.filter((finding) => finding.severity === 'blocking').length;
  const advisoryCount = findings.filter((finding) => finding.severity === 'advisory').length;

  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    findings,
  };
};

const compilerFinding = (
  id: string,
  message: string,
  path?: readonly (string | number)[],
): ArtifactValidationFinding => ({
  id,
  severity: 'blocking',
  message,
  artifactType: 'presentation',
  path,
  packId: PACK_ID,
});

const replaceSlots = (template: string, slide: EditorialStageSlide, layout: EditorialStageLayout) => {
  const declaredSlots = new Set(layout.slots.map((slot) => slot.id));

  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (token, slotId: string) => {
    if (slotId === 'mood') {
      return escapeHtml(slide.mood);
    }

    if (!declaredSlots.has(slotId)) {
      return token;
    }

    return escapeHtml(slide.slots[slotId] ?? '');
  });
};

const stripEmptyOptionalSlotWrappers = (html: string, layout: EditorialStageLayout): string =>
  layout.slots
    .filter((slot) => !slot.required)
    .reduce((nextHtml, slot) => {
      const slotId = slot.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const emptySimpleElement = new RegExp(
        `\\s*<(p|footer|figcaption|span|small)([^>]*\\sdata-slot=["']${slotId}["'][^>]*)>\\s*</\\1>`,
        'gi',
      );

      return nextHtml.replace(emptySimpleElement, '');
    }, html);

const stripUnboundOptionalMediaWrappers = (html: string, slide: EditorialStageSlide, layout: EditorialStageLayout): string => {
  const boundMediaSlots = new Set(slide.media.map((media) => media.slotId));

  return layout.mediaSlots
    .filter((slot) => !slot.required && !boundMediaSlots.has(slot.id))
    .reduce((nextHtml, slot) => {
      const slotId = slot.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mediaFigure = new RegExp(
        `\\s*<figure\\b[^>]*\\sdata-media-slot=["']${slotId}["'][^>]*>[\\s\\S]*?<\\/figure>`,
        'gi',
      );
      return nextHtml.replace(mediaFigure, '');
    }, html);
};

const enrichBoundMediaWrappers = (
  html: string,
  slide: EditorialStageSlide,
  mediaResolver: ArtifactMediaResolver | undefined,
): string =>
  slide.media.reduce((nextHtml, media) => {
    const slotId = media.slotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const figurePattern = new RegExp(
      `(<figure\\b[^>]*\\sdata-media-slot=["']${slotId}["'][^>]*>\\s*)<div[^>]*><\\/div>`,
      'i',
    );
    const cropClass = `es-crop-${media.cropMode}`;
    const label = escapeHtml(media.altText);
    return nextHtml.replace(figurePattern, (_match, figureStart: string) => {
      const asset = mediaResolver?.resolveById(media.assetId);
      const mediaContent = asset?.url
        ? `<img src="${escapeHtml(asset.url)}" alt="${label}" />`
        : `<span>${label}</span>`;
      return `${figureStart}<div class="es-media-placeholder es-media-bound ${cropClass}" data-asset-id="${escapeHtml(media.assetId)}" role="img" aria-label="${label}">${mediaContent}</div>`;
    });
  }, html);

const optionalMediaClass = (slide: EditorialStageSlide): string | undefined => {
  const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[slide.layoutId];
  if (!layout?.mediaSlots.some((slot) => !slot.required)) return undefined;
  if (slide.layoutId === 'cover') return undefined;
  return slide.media.length > 0 ? undefined : 'es-no-media';
};

const addSectionMarkers = (html: string, slide: EditorialStageSlide, source: EditorialStageSource): string =>
  html.replace(/<section\b([^>]*)>/i, (section, attrs: string) => {
    const hasPackMarker = /\sdata-pack\s*=/.test(attrs);
    const hasSlideId = /\sdata-slide-id\s*=/.test(attrs);
    const hasBackground = /\sdata-background-color\s*=/.test(attrs);
    const hasDirection = /\sdata-direction\s*=/.test(attrs);
    const background = slide.mood === 'hero-dark' || slide.mood === 'dark'
      ? '#111318'
      : slide.mood === 'hero-light'
        ? '#fffdf7'
        : '#f7f3e8';
    const missingOptionalMediaClass = optionalMediaClass(slide);
    const directionClass = `es-direction-${source.directionId}`;
    const enrichedSection = section.replace(/\sclass=(["'])([^"']*)\1/i, (_classAttr, quote: string, className: string) => {
      const classes = new Set(className.split(/\s+/).filter(Boolean));
      classes.add(directionClass);
      if (missingOptionalMediaClass) classes.add(missingOptionalMediaClass);
      return ` class=${quote}${[...classes].join(' ')}${quote}`;
    });
    const additions = [
      hasPackMarker ? '' : ` data-pack="${PACK_ID}"`,
      hasSlideId ? '' : ` data-slide-id="${escapeHtml(slide.slideId)}"`,
      hasDirection ? '' : ` data-direction="${escapeHtml(source.directionId)}"`,
      hasBackground ? '' : ` data-background-color="${background}"`,
    ].join('');

    return enrichedSection.replace('>', `${additions}>`);
  });

const compileSlide = (
  slide: EditorialStageSlide,
  index: number,
  source: EditorialStageSource,
  mediaResolver: ArtifactMediaResolver | undefined,
) => {
  const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[slide.layoutId];

  if (!layout) {
    return {
      html: '',
      finding: compilerFinding(
        'compiler.layout_unknown',
        `Slide ${index + 1} uses unknown layout "${slide.layoutId}".`,
        ['slides', index, 'layoutId'],
      ),
    };
  }

  const withSlots = replaceSlots(layout.template, slide, layout);
  const withoutEmptySlots = stripEmptyOptionalSlotWrappers(withSlots, layout);
  const withoutUnboundMedia = stripUnboundOptionalMediaWrappers(withoutEmptySlots, slide, layout);
  const withBoundMedia = enrichBoundMediaWrappers(withoutUnboundMedia, slide, mediaResolver);
  const marked = addSectionMarkers(withBoundMedia, slide, source);

  return { html: marked };
};

const collectAssets = (source: EditorialStageSource): readonly string[] => {
  const assetIds = new Set<string>();

  for (const slide of source.slides) {
    for (const media of slide.media) {
      assetIds.add(media.assetId);
    }
  }

  return [...assetIds];
};

const collectMediaResolutionFindings = (
  source: EditorialStageSource,
  mediaResolver: ArtifactMediaResolver | undefined,
): readonly ArtifactValidationFinding[] => {
  if (!mediaResolver) return [];
  const findings: ArtifactValidationFinding[] = [];
  source.slides.forEach((slide, slideIndex) => {
    const layout = EDITORIAL_STAGE_LAYOUT_BY_ID[slide.layoutId];
    for (const [mediaIndex, media] of slide.media.entries()) {
      if (mediaResolver.resolveById(media.assetId)) continue;
      const mediaSlot = layout?.mediaSlots.find((slot) => slot.id === media.slotId);
      const required = mediaSlot?.required ?? false;
      findings.push({
        id: required ? 'media.required_unresolved' : 'media.asset_unresolved',
        severity: required ? 'blocking' : 'advisory',
        message: `Slide ${slideIndex + 1} media slot "${media.slotId}" references unresolved asset "${media.assetId}".`,
        artifactType: 'presentation',
        path: ['slides', slideIndex, 'media', mediaIndex, 'assetId'],
        packId: PACK_ID,
      });
    }
  });
  return findings;
};

export const compileEditorialStageSlides = (
  source: EditorialStageSource,
  mediaResolver?: ArtifactMediaResolver,
): { html: string; findings: readonly ArtifactValidationFinding[] } => {
  const findings: ArtifactValidationFinding[] = [
    ...collectMediaResolutionFindings(source, mediaResolver),
  ];
  const slides = source.slides.map((slide, index) => {
    const compiled = compileSlide(slide, index, source, mediaResolver);
    if (compiled.finding) {
      findings.push(compiled.finding);
    }
    return compiled.html;
  });

  return {
    html: [styleBlock(), ...slides.filter(Boolean)].join('\n'),
    findings,
  };
};

export const compileEditorialStagePack = (
  input: EditorialStageCompileInput,
): ArtifactPackCompileResult => {
  const sourceValidation = validateEditorialStageSource(input.source);
  const compiledSlides = compileEditorialStageSlides(input.source, input.mediaResolver);
  const output: ArtifactCompiledOutput = {
    mode: input.outputMode ?? input.source.outputMode,
    content: compiledSlides.html,
    assets: collectAssets(input.source),
    generatedAt: Date.now(),
  };
  const compilerReport = mergeReports({
    passed: compiledSlides.findings.every((finding) => finding.severity !== 'blocking'),
    blockingCount: compiledSlides.findings.filter((finding) => finding.severity === 'blocking').length,
    advisoryCount: compiledSlides.findings.filter((finding) => finding.severity === 'advisory').length,
    findings: compiledSlides.findings,
  });
  const compiledValidation = validateEditorialStageCompiledOutput(output);

  return {
    output,
    validation: mergeReports(sourceValidation, compilerReport, compiledValidation),
  };
};

export { validateEditorialStageCompiledOutput, validateEditorialStageSource };
