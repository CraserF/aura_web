/**
 * Template system barrel export.
 * Backward-compatible — all old exports from templates.ts still available.
 */

export {
  detectTemplateStyle,
  detectAnimationLevel,
  getTemplateBlueprint,
  getPalette,
  type TemplateStyle,
  type TemplatePalette,
  type TemplateBlueprint,
} from './palettes';

export {
  TEMPLATE_REGISTRY,
  getTemplateHtml,
  getTemplateEntry,
  type TemplateId,
  type TemplateEntry,
} from './registry';

export {
  selectTemplate,
} from './selector';

export {
  resolveTemplatePlan,
  type ExemplarPackId,
  type StyleManifest,
  type TemplatePlan,
} from './resolver';

export {
  getExemplarPack,
  type ExemplarPack,
} from './exemplar-packs';
