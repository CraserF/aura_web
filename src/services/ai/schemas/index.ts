/**
 * Zod schemas for structured AI output validation.
 *
 * These schemas enforce the exact JSON shape expected from the LLM
 * for the planner outline and reviewer result. Used with AI SDK's
 * generateObject() for automatic validation and retry.
 */
import { z } from 'zod';

// ── Planner Outline ─────────────────────────────────────────

export const SlideOutlineSchema = z.object({
  index: z.number().int().min(0),
  title: z.string().min(1).max(80),
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
  ]),
  keyPoints: z.array(z.string().min(1)).min(1).max(6),
});

export const OutlineArraySchema = z.array(SlideOutlineSchema).min(6).max(20);

export type SlideOutline = z.infer<typeof SlideOutlineSchema>;

// ── Reviewer Result ─────────────────────────────────────────

export const ReviewIssueSchema = z.object({
  slide: z.number().int().min(0),
  severity: z.enum(['error', 'warning']),
  rule: z.string().min(1),
  fix: z.string().min(1),
});

export const ReviewResultSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(ReviewIssueSchema),
  summary: z.string().min(1),
});

export type ReviewIssueZ = z.infer<typeof ReviewIssueSchema>;
export type ReviewResultZ = z.infer<typeof ReviewResultSchema>;

export {
  ChartDatasetSchema,
  ChartSpecSchema,
  type ChartSpecZ,
} from './chart';
