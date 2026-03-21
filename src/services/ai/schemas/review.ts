/**
 * Zod schema for review results produced by the reviewer agent.
 * Used with AI SDK's Output.object() for validated structured output.
 */
import { z } from 'zod';

export const ReviewIssueSchema = z.object({
  slide: z.number().int().min(0).describe('Slide number (0 = deck-wide issue)'),
  severity: z.enum(['error', 'warning']).describe('Issue severity'),
  rule: z.string().min(1).describe('Which design rule was violated'),
  fix: z.string().min(1).describe('Specific fix instruction'),
});

export const ReviewResultSchema = z.object({
  passed: z.boolean().describe('Whether the deck passes review (score >= 75)'),
  score: z.number().int().min(0).max(100).describe('Quality score 0-100'),
  issues: z.array(ReviewIssueSchema).describe('List of design issues found'),
  summary: z.string().min(1).describe('1-2 sentence overall assessment'),
});

export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;
export type ReviewResult = z.infer<typeof ReviewResultSchema>;
