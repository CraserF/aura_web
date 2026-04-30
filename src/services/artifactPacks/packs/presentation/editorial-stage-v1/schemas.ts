import { z } from 'zod';

export const editorialStageLayoutIds = [
  'cover',
  'section-divider',
  'big-number',
  'story-split',
  'media-grid',
  'process-pipeline',
  'question-hero',
  'big-quote',
  'comparison',
  'lead-media',
  'decision',
  'closing-action',
] as const;

export const editorialStageDirectionIds = [
  'editorial-magazine',
  'modern-minimal',
  'data-utility',
  'warm-narrative',
  'bold-editorial',
] as const;

const plainText = z
  .string()
  .trim()
  .refine((value) => !/[<>]/.test(value), 'Slots must be plain text, not HTML.');

export const editorialStageMediaBindingSchema = z
  .object({
    slotId: z.string().min(1),
    assetId: z.string().min(1),
    altText: plainText.min(3).max(160),
    aspectRatio: z.enum(['16:9', '16:10', '4:3', '3:2', '1:1', '3:4']),
    cropMode: z.enum(['contain', 'cover-top', 'cover-center']),
    caption: plainText.max(180).optional(),
  })
  .strict();

export const editorialStageSlideSchema = z
  .object({
    slideId: z.string().min(1),
    layoutId: z.enum(editorialStageLayoutIds),
    role: z.enum([
      'title-scene',
      'transition',
      'proof',
      'story',
      'evidence',
      'mechanism',
      'question',
      'quote',
      'comparison',
      'explainer',
      'decision',
      'closing-action',
    ]),
    mood: z.enum(['hero-light', 'hero-dark', 'light', 'dark']),
    density: z.enum(['calm', 'balanced', 'dense']),
    visualWeight: z.enum(['quiet', 'standard', 'proof', 'hero']),
    motion: z.enum(['hero', 'cascade', 'quote', 'directional', 'pipeline', 'static']),
    slots: z.record(z.string(), plainText.max(520)),
    media: z.array(editorialStageMediaBindingSchema).default([]),
    sourceNotes: z.array(plainText.max(220)).default([]),
  })
  .strict();

export const editorialStageRhythmEntrySchema = z
  .object({
    slideIndex: z.number().int().min(1).max(30),
    slideId: z.string().min(1),
    narrativeRole: plainText.max(80),
    layoutId: z.enum(editorialStageLayoutIds),
    mood: z.enum(['hero-light', 'hero-dark', 'light', 'dark']),
    density: z.enum(['calm', 'balanced', 'dense']),
    visualWeight: z.enum(['quiet', 'standard', 'proof', 'hero']),
    motion: z.enum(['hero', 'cascade', 'quote', 'directional', 'pipeline', 'static']),
    transitionPurpose: plainText.max(140),
    mediaNeeds: z
      .array(
        z
          .object({
            slotId: z.string().min(1),
            purpose: plainText.max(120),
            required: z.boolean(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export const editorialStageSourceSchema = z
  .object({
    schemaVersion: z.literal(1),
    artifactType: z.literal('presentation'),
    packId: z.literal('presentation/editorial-stage-v1'),
    packVersion: z.literal('1.0.0'),
    title: plainText.min(1).max(120),
    audience: plainText.min(1).max(120),
    directionId: z.enum(editorialStageDirectionIds),
    outputMode: z.enum(['html', 'pdf', 'editable-pptx']),
    brief: plainText.min(1).max(1200),
    rhythmPlan: z.array(editorialStageRhythmEntrySchema).min(1).max(18),
    slides: z.array(editorialStageSlideSchema).min(1).max(18),
  })
  .strict();

export type EditorialStageSource = z.infer<typeof editorialStageSourceSchema>;
export type EditorialStageSlide = z.infer<typeof editorialStageSlideSchema>;
export type EditorialStageRhythmEntry = z.infer<typeof editorialStageRhythmEntrySchema>;
