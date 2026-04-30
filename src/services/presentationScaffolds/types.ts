import type { ColorTheme, ProjectMediaAsset } from '@/types/project';
import type { PresentationRecipeId } from '@/services/artifactRuntime/types';

export type PresentationScaffoldId = 'executive-editorial-v1';

export type PresentationScaffoldDirectionId =
  | 'executive'
  | 'launch'
  | 'editorial'
  | 'research'
  | 'teaching';

export type PresentationExportIntent = 'html' | 'pdf' | 'editable-pptx';

export type ScaffoldSlotKind =
  | 'kicker'
  | 'title'
  | 'subtitle'
  | 'paragraph'
  | 'quote'
  | 'metric-value'
  | 'metric-label'
  | 'step-title'
  | 'step-body'
  | 'footer'
  | 'label';

export type ScaffoldSlideRole =
  | 'title-scene'
  | 'context'
  | 'problem'
  | 'metric-proof'
  | 'comparison'
  | 'mechanism'
  | 'recommendation'
  | 'timeline'
  | 'closing-action'
  | 'content';

export type ScaffoldDensity = 'calm' | 'balanced' | 'dense';
export type ScaffoldMood = 'hero-light' | 'hero-dark' | 'light' | 'dark';
export type ScaffoldMotionIntensity = 'none' | 'subtle' | 'moderate';
export type ScaffoldVisualWeight = 'quiet' | 'standard' | 'proof' | 'hero';

export interface SlideSlotDefinition {
  id: string;
  label: string;
  kind: ScaffoldSlotKind;
  required: boolean;
  maxLength: number;
  allowInlineSemanticTags?: boolean;
  placeholder?: string;
}

export interface SlideMediaSlotDefinition {
  id: string;
  label: string;
  required?: boolean;
  aspectRatio: '1:1' | '3:2' | '4:3' | '16:10' | '16:9';
  cropMode: 'contain' | 'cover-top' | 'cover-center';
}

export interface SlideSkeleton {
  id: string;
  label: string;
  role: ScaffoldSlideRole;
  allowedRoles: ScaffoldSlideRole[];
  density: ScaffoldDensity;
  mood: ScaffoldMood;
  visualWeight: ScaffoldVisualWeight;
  layoutFamily: string;
  template: string;
  slots: SlideSlotDefinition[];
  mediaSlots?: SlideMediaSlotDefinition[];
  approvedClasses: string[];
}

export interface ScaffoldTheme {
  id: PresentationScaffoldDirectionId;
  label: string;
  directionId: PresentationScaffoldDirectionId;
  bestFor: string[];
  colorTheme: ColorTheme;
  backgroundColor: string;
  tokens: Record<string, string>;
  moodBySkeleton: Partial<Record<string, ScaffoldMood>>;
  densityBySkeleton?: Partial<Record<string, ScaffoldDensity>>;
}

export interface PresentationScaffold {
  id: PresentationScaffoldId;
  version: number;
  label: string;
  description: string;
  bestFor: string[];
  supportedRecipes: PresentationRecipeId[];
  supportedDirections: PresentationScaffoldDirectionId[];
  supportedExportIntents: PresentationExportIntent[];
  fallbackDirectionId: PresentationScaffoldDirectionId;
  fallbackThemeId: PresentationScaffoldDirectionId;
  themes: ScaffoldTheme[];
  skeletons: SlideSkeleton[];
  roleSkeletonMap: Record<ScaffoldSlideRole, string[]>;
  styleCss: string;
  checklistMarkdown: string;
  exampleDeckHtml: string;
  approvedRuntimeClasses: string[];
}

export interface DeckRhythmEntry {
  slideId: string;
  slideIndex: number;
  title: string;
  role: ScaffoldSlideRole;
  skeletonId: string;
  density: ScaffoldDensity;
  mood: ScaffoldMood;
  motionIntensity: ScaffoldMotionIntensity;
  visualWeight: ScaffoldVisualWeight;
  transitionPurpose: string;
  mediaNeeds: Array<{
    slotId: string;
    purpose: string;
    required: boolean;
  }>;
}

export interface DeckRhythmPlan {
  scaffoldId: PresentationScaffoldId;
  directionId: PresentationScaffoldDirectionId;
  themeId: PresentationScaffoldDirectionId;
  exportIntent: PresentationExportIntent;
  slideCount: number;
  motif: string;
  entries: DeckRhythmEntry[];
  rules: string[];
}

export interface SlideSlotPayload {
  slideId: string;
  skeletonId: string;
  slots: Record<string, string>;
  hiddenSlots?: string[];
  media?: Record<string, {
    assetId: ProjectMediaAsset['id'];
    altText: string;
    cropMode: SlideMediaSlotDefinition['cropMode'];
  }>;
  motifs?: Record<string, string>;
}

export interface ScaffoldCompileResult {
  scaffoldId: PresentationScaffoldId;
  themeId: PresentationScaffoldDirectionId;
  directionId: PresentationScaffoldDirectionId;
  exportIntent: PresentationExportIntent;
  html: string;
  styleBlock: string;
  sections: string[];
  slideCount: number;
}

export interface ScaffoldValidationFinding {
  id:
    | 'undefined-class'
    | 'style-system-count'
    | 'inline-style'
    | 'viewport-unit'
    | 'missing-reduced-motion'
    | 'missing-background'
    | 'placeholder-token'
    | 'emoji-icon'
    | 'repeated-skeleton'
    | 'repeated-density-mood'
    | 'title-length-risk'
    | 'missing-required-slot'
    | 'invalid-theme'
    | 'invalid-export-intent'
    | 'media-aspect-risk';
  severity: 'blocking' | 'advisory';
  message: string;
  slideIndex?: number;
  slotId?: string;
  className?: string;
}

export interface ScaffoldValidationResult {
  passed: boolean;
  blockingCount: number;
  advisoryCount: number;
  findings: ScaffoldValidationFinding[];
}

export interface PresentationAllowedEditSurface {
  kind: 'create' | 'text-edit' | 'add-slide' | 'restyle' | 'restructure' | 'full-regeneration' | 'unsupported';
  allowedSlotKinds: ScaffoldSlotKind[];
  lockedAreas: string[];
  reason?: string;
}

export interface PresentationDesignContextSpec {
  source: 'project-rules' | 'runtime-defaults';
  directionId: PresentationScaffoldDirectionId;
  themeId: PresentationScaffoldDirectionId;
  audience: string;
  exportIntent: PresentationExportIntent;
  colorTheme?: ColorTheme;
  notes: string[];
}

export interface PresentationMediaSlotPlan {
  allowedAssetIds: string[];
  requiredSlots: Array<{
    slideId: string;
    slotId: string;
    aspectRatio: SlideMediaSlotDefinition['aspectRatio'];
  }>;
}
