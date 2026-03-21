/**
 * Zod schema for slide outlines produced by the planner agent.
 * Used with AI SDK's Output.object() for validated structured output.
 */
import { z } from 'zod';

export const SlideOutlineSchema = z.object({
  index: z.number().int().min(0).describe('Zero-based slide index'),
  title: z.string().min(1).max(80).describe('Slide title (2-6 words)'),
  layout: z.enum([
    'hero-title',
    'bento-grid',
    'split-text-visual',
    'metrics-row',
    'timeline',
    'comparison',
    'icon-grid',
    'pull-quote',
    'process-steps',
    'card-grid',
    'closing-cta',
  ]).describe('Layout type for this slide'),
  keyPoints: z
    .array(z.string().min(1).max(100))
    .min(1)
    .max(6)
    .describe('Key talking points (2-4 items, max 10 words each)'),
});

export const OutlineArraySchema = z
  .array(SlideOutlineSchema)
  .min(6)
  .max(16)
  .describe('Array of slide outlines for the presentation');

export type SlideOutline = z.infer<typeof SlideOutlineSchema>;
