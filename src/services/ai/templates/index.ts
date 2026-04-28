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
  PRODUCTION_PRESENTATION_TEMPLATE_IDS,
  LEGACY_PRESENTATION_TEMPLATE_IDS,
  PRESENTATION_TEMPLATE_AUDIT,
  getTemplateHtml,
  getTemplateEntry,
  isLegacyPresentationTemplate,
  isProductionPresentationTemplate,
  listLegacyPresentationTemplateAudit,
  toProductionPresentationTemplate,
  type TemplateId,
  type TemplateEntry,
  type LegacyPresentationTemplateAuditDecision,
  type LegacyPresentationTemplateAuditEntry,
  type LegacyPresentationTemplateId,
  type ProductionPresentationTemplateId,
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

export {
  getReferenceStylePack,
  listReferenceStylePacks,
  type ReferenceStylePack,
  type ReferenceStylePackId,
} from './reference-style-packs';

export {
  formatReferenceQualityProfileForPrompt,
  getReferenceQualityProfile,
  listReferenceQualityProfiles,
  resolveReferenceQualityProfileId,
  summarizeReferenceQualityProfileForScoring,
  type ReferenceQualityProfile,
  type ReferenceQualitySourceKind,
} from './reference-quality-corpus';

export {
  PRESENTATION_LAYOUT_RECIPES,
  PRESENTATION_MOTION_BUDGETS,
  PRESENTATION_TYPE_SCALE,
  buildPresentationDesignSystemPrompt,
  type PresentationLayoutRecipe,
  type PresentationMotionBudget,
  type PresentationTypeScale,
} from './design-system';
