/**
 * Aura Memory Format (AMF) — Zod Schemas for Validation
 *
 * Provides runtime validation for all memory file components,
 * ensuring type safety and integrity throughout the system.
 */

import { z } from 'zod';
import type {
  MemoryId,
  MemoryCategory,
  MemoryScope,
  MemorySensitivity,
  UpdateStrategy,
  DetailLevel,
  MemoryFrontmatter,
  MemoryContent,
  MemoryFile,
  MemoryCandidate,
  DedupDecision,
  DedupResult,
  CrossReference,
} from './types';

// ─── Basic Primitives ──────────────────────────────────────────────────

/** Memory ID must match pattern "mem_" + alphanumeric */
export const MemoryIdSchema = z
  .string()
  .regex(/^mem_[a-zA-Z0-9]{8}$/, 'Memory ID must be mem_XXXXXXXX format')
  .brand<'MemoryId'>();

/** Category must be one of the defined categories */
export const MemoryCategorySchema = z.enum([
  'identity',
  'skill',
  'entity',
  'event',
  'case',
  'pattern',
  'tool',
  'context',
]) as z.ZodType<MemoryCategory>;

/** Scope: global or project:UUID format */
export const MemoryScopeSchema = z.union([
  z.literal('global'),
  z.string().regex(/^project:[a-f0-9-]{36}$/, 'Project scope must be project:UUID'),
]) as z.ZodType<MemoryScope>;

/** Sensitivity level */
export const MemorySensitivitySchema = z.enum([
  'public',
  'private',
  'encrypted',
]) as z.ZodType<MemorySensitivity>;

/** Update strategy */
export const UpdateStrategySchema = z.enum([
  'merge',
  'append',
  'immutable',
]) as z.ZodType<UpdateStrategy>;

/** Detail level */
export const DetailLevelSchema = z.enum([
  'L0',
  'L1',
  'L2',
]) as z.ZodType<DetailLevel>;

// ─── Frontmatter ──────────────────────────────────────────────────────

export const MemoryFrontmatterSchema: z.ZodType<MemoryFrontmatter> = z.object({
  memoryId: MemoryIdSchema,
  type: MemoryCategorySchema,
  scope: MemoryScopeSchema,
  sensitivity: MemorySensitivitySchema,
  owner: z.string().min(1, 'Owner must not be empty'),
  sourceRefs: z.array(z.string()).default([]),
  updateStrategy: UpdateStrategySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
});

// ─── Content ──────────────────────────────────────────────────────────

export const MemoryContentSchema: z.ZodType<MemoryContent> = z.object({
  summary: z.string().min(10, 'Summary must be at least 10 characters').max(500),
  details: z.string().default(''),
  evidence: z.array(z.string()).default([]),
  actionableUse: z.string().default(''),
});

// ─── Memory File ──────────────────────────────────────────────────────

export const MemoryFileSchema: z.ZodType<MemoryFile> = z.object({
  frontmatter: MemoryFrontmatterSchema,
  content: MemoryContentSchema,
});

// ─── Memory Candidate ──────────────────────────────────────────────────

export const MemoryCandidateSchema: z.ZodType<MemoryCandidate> = z.object({
  type: MemoryCategorySchema,
  scope: MemoryScopeSchema,
  sensitivity: MemorySensitivitySchema,
  title: z.string().min(1, 'Title must not be empty').max(200),
  summary: z.string().min(10, 'Summary must be at least 10 characters').max(500),
  details: z.string().default(''),
  evidence: z.array(z.string()).default([]),
  actionableUse: z.string().default(''),
  tags: z.array(z.string()).default([]),
});

// ─── Dedup ────────────────────────────────────────────────────────────

export const DedupDecisionSchema = z.enum([
  'skip',
  'create',
  'merge',
  'delete',
]) as z.ZodType<DedupDecision>;

export const DedupResultSchema: z.ZodType<DedupResult> = z.object({
  candidate: MemoryCandidateSchema,
  decision: DedupDecisionSchema,
  existingMemoryId: MemoryIdSchema.optional(),
  reason: z.string().min(1),
});

// ─── Cross-Reference ──────────────────────────────────────────────────

export const CrossReferenceSchema: z.ZodType<CrossReference> = z.object({
  text: z.string().min(1),
  target: z.string().min(1),
  startPos: z.number().nonnegative(),
  endPos: z.number().nonnegative(),
});

// ─── Validators (User-Facing Functions) ────────────────────────────────

/**
 * Validate and parse memory frontmatter from raw object
 * @throws ZodError if validation fails
 */
export function validateMemoryFrontmatter(data: unknown): MemoryFrontmatter {
  return MemoryFrontmatterSchema.parse(data);
}

/**
 * Validate and parse memory content from raw object
 * @throws ZodError if validation fails
 */
export function validateMemoryContent(data: unknown): MemoryContent {
  return MemoryContentSchema.parse(data);
}

/**
 * Validate and parse complete memory file
 * @throws ZodError if validation fails
 */
export function validateMemoryFile(data: unknown): MemoryFile {
  return MemoryFileSchema.parse(data);
}

/**
 * Validate and parse memory candidate
 * @throws ZodError if validation fails
 */
export function validateMemoryCandidate(data: unknown): MemoryCandidate {
  return MemoryCandidateSchema.parse(data);
}

/**
 * Validate dedup result
 * @throws ZodError if validation fails
 */
export function validateDedupResult(data: unknown): DedupResult {
  return DedupResultSchema.parse(data);
}

/**
 * Safe validation wrapper — returns null instead of throwing
 */
export function tryValidateMemoryFile(data: unknown): MemoryFile | null {
  const result = MemoryFileSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Generate a new memory ID
 */
export function generateMemoryId(): MemoryId {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'mem_';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id as MemoryId;
}
