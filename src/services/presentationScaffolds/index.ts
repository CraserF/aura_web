export {
  assembleScaffoldDeck,
  buildScaffoldStyleBlock,
  compileScaffoldSlide,
  escapeHtml,
  extractScaffoldSections,
  extractScaffoldSlotInventory,
  patchScaffoldSlotsInHtml,
} from './compiler';
export {
  getPresentationScaffold,
  getScaffoldTheme,
  isScaffoldedPresentationRun,
  listPresentationScaffolds,
  parsePresentationDirectionFromRulesBlock,
  resolveDefaultScaffoldSelection,
  resolveScaffoldForRunPlan,
} from './registry';
export {
  planDeckRhythm,
} from './rhythm';
export {
  runScaffoldedPresentationEditRuntime,
  runScaffoldedPresentationQueue,
} from './runtime';
export {
  validateScaffoldedDeck,
} from './validator';
export type {
  DeckRhythmEntry,
  DeckRhythmPlan,
  PresentationAllowedEditSurface,
  PresentationDesignContextSpec,
  PresentationExportIntent,
  PresentationMediaSlotPlan,
  PresentationScaffold,
  PresentationScaffoldDirectionId,
  PresentationScaffoldId,
  ScaffoldCompileResult,
  ScaffoldDensity,
  ScaffoldMood,
  ScaffoldTheme,
  ScaffoldValidationFinding,
  ScaffoldValidationResult,
  SlideSkeleton,
  SlideSlotDefinition,
  SlideSlotPayload,
} from './types';
