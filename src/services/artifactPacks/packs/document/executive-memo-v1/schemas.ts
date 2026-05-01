import { z } from 'zod';

export const EXECUTIVE_MEMO_PACK_ID = 'document/executive-memo-v1';
export const EXECUTIVE_MEMO_PACK_VERSION = '1.0.0';

export const executiveMemoLayoutIds = [
  'memo-cover',
  'decision-summary',
  'context',
  'recommendation',
  'evidence-table',
  'risk-register',
  'action-plan',
  'source-notes',
] as const;

export const executiveMemoDirectionIds = [
  'editorial-magazine',
  'modern-minimal',
  'data-utility',
  'warm-narrative',
  'bold-editorial',
] as const;

export type ExecutiveMemoLayoutId = typeof executiveMemoLayoutIds[number];

export type ExecutiveMemoSlotKind =
  | 'kicker'
  | 'title'
  | 'lead'
  | 'heading'
  | 'body'
  | 'decision'
  | 'metadata'
  | 'source';

export interface ExecutiveMemoSlotDefinition {
  id: string;
  label: string;
  kind: ExecutiveMemoSlotKind;
  required: boolean;
  maxLength: number;
}

export interface ExecutiveMemoLayoutDefinition {
  id: ExecutiveMemoLayoutId;
  label: string;
  role: ExecutiveMemoModuleRole;
  requiredSlots: readonly ExecutiveMemoSlotDefinition[];
  optionalSlots: readonly ExecutiveMemoSlotDefinition[];
  minItems?: number;
  requiresTable?: boolean;
  requiresSourceNotes?: boolean;
}

const slot = (
  id: string,
  label: string,
  kind: ExecutiveMemoSlotKind,
  maxLength: number,
  required = true,
): ExecutiveMemoSlotDefinition => ({ id, label, kind, maxLength, required });

export const executiveMemoModuleRoles = [
  'opening',
  'decision',
  'context',
  'recommendation',
  'evidence',
  'risk',
  'action',
  'sources',
] as const;

export type ExecutiveMemoModuleRole = typeof executiveMemoModuleRoles[number];

export const EXECUTIVE_MEMO_LAYOUTS: Record<ExecutiveMemoLayoutId, ExecutiveMemoLayoutDefinition> = {
  'memo-cover': {
    id: 'memo-cover',
    label: 'Memo Cover',
    role: 'opening',
    requiredSlots: [
      slot('title', 'Title', 'title', 120),
      slot('lead', 'Lead', 'lead', 320),
    ],
    optionalSlots: [
      slot('kicker', 'Kicker', 'kicker', 80, false),
      slot('audience', 'Audience', 'metadata', 100, false),
      slot('date', 'Date', 'metadata', 80, false),
      slot('owner', 'Owner', 'metadata', 100, false),
      slot('status', 'Status', 'metadata', 80, false),
    ],
  },
  'decision-summary': {
    id: 'decision-summary',
    label: 'Decision Summary',
    role: 'decision',
    requiredSlots: [
      slot('heading', 'Heading', 'heading', 90),
      slot('recommendation', 'Recommendation', 'decision', 420),
      slot('decision', 'Decision', 'decision', 180),
      slot('confidence', 'Confidence', 'metadata', 80),
    ],
    optionalSlots: [
      slot('rationale', 'Rationale', 'body', 360, false),
      slot('ask', 'Ask', 'decision', 220, false),
    ],
  },
  context: {
    id: 'context',
    label: 'Context',
    role: 'context',
    requiredSlots: [
      slot('heading', 'Heading', 'heading', 90),
      slot('body', 'Body', 'body', 620),
    ],
    optionalSlots: [
      slot('note', 'Side note', 'body', 260, false),
    ],
  },
  recommendation: {
    id: 'recommendation',
    label: 'Recommendation',
    role: 'recommendation',
    requiredSlots: [
      slot('heading', 'Heading', 'heading', 90),
      slot('intro', 'Intro', 'body', 300),
    ],
    optionalSlots: [],
    minItems: 2,
  },
  'evidence-table': {
    id: 'evidence-table',
    label: 'Evidence Table',
    role: 'evidence',
    requiredSlots: [
      slot('heading', 'Heading', 'heading', 90),
      slot('intro', 'Intro', 'body', 260),
    ],
    optionalSlots: [],
    requiresTable: true,
    requiresSourceNotes: true,
  },
  'risk-register': {
    id: 'risk-register',
    label: 'Risk Register',
    role: 'risk',
    requiredSlots: [
      slot('heading', 'Heading', 'heading', 90),
      slot('intro', 'Intro', 'body', 280),
    ],
    optionalSlots: [],
    minItems: 2,
  },
  'action-plan': {
    id: 'action-plan',
    label: 'Action Plan',
    role: 'action',
    requiredSlots: [
      slot('heading', 'Heading', 'heading', 90),
      slot('intro', 'Intro', 'body', 260),
    ],
    optionalSlots: [],
    requiresTable: true,
  },
  'source-notes': {
    id: 'source-notes',
    label: 'Source Notes',
    role: 'sources',
    requiredSlots: [
      slot('heading', 'Heading', 'heading', 90),
    ],
    optionalSlots: [
      slot('body', 'Body', 'body', 360, false),
    ],
    requiresSourceNotes: true,
  },
};

const plainText = z
  .string()
  .trim()
  .refine((value) => !/[<>]/.test(value), 'Slots must be plain text, not HTML.');

export const executiveMemoItemSchema = z
  .object({
    label: plainText.min(1).max(120),
    body: plainText.max(360).optional(),
    value: plainText.max(160).optional(),
    status: plainText.max(80).optional(),
  })
  .strict();

export const executiveMemoTableSchema = z
  .object({
    columns: z.array(plainText.min(1).max(80)).min(2).max(5),
    rows: z.array(z.array(plainText.max(220)).min(2).max(5)).min(1).max(8),
  })
  .strict();

export const executiveMemoModuleSchema = z
  .object({
    moduleId: z.string().min(1).max(80),
    layoutId: z.enum(executiveMemoLayoutIds),
    role: z.enum(executiveMemoModuleRoles),
    density: z.enum(['calm', 'balanced', 'dense']).default('balanced'),
    slots: z.record(z.string(), plainText.max(900)),
    items: z.array(executiveMemoItemSchema).default([]),
    table: executiveMemoTableSchema.optional(),
    sourceNotes: z.array(plainText.max(220)).default([]),
  })
  .strict();

export const executiveMemoSourceSchema = z
  .object({
    schemaVersion: z.literal(1),
    artifactType: z.literal('document'),
    packId: z.literal(EXECUTIVE_MEMO_PACK_ID),
    packVersion: z.literal(EXECUTIVE_MEMO_PACK_VERSION),
    title: plainText.min(1).max(140),
    audience: plainText.min(1).max(140),
    directionId: z.enum(executiveMemoDirectionIds),
    outputMode: z.enum(['html', 'pdf', 'docx']),
    brief: plainText.min(1).max(1600),
    modules: z.array(executiveMemoModuleSchema).min(3).max(10),
  })
  .strict();

export type ExecutiveMemoItem = z.infer<typeof executiveMemoItemSchema>;
export type ExecutiveMemoTable = z.infer<typeof executiveMemoTableSchema>;
export type ExecutiveMemoModule = z.infer<typeof executiveMemoModuleSchema>;
export type ExecutiveMemoSource = z.infer<typeof executiveMemoSourceSchema>;
