import type {
  ArtifactCompiledOutput,
  ArtifactValidationFinding,
  ArtifactValidationReport,
  ArtifactValidationSeverity,
} from '@/services/artifactPacks/types';
import {
  EXECUTIVE_MEMO_LAYOUTS,
  EXECUTIVE_MEMO_PACK_ID,
  executiveMemoSourceSchema,
  type ExecutiveMemoModule,
  type ExecutiveMemoSource,
} from './schemas';

const HTML_PATTERN = /<\/?[a-z][\s\S]*>/i;
const INLINE_STYLE_PATTERN = /\sstyle\s*=/i;
const STYLE_SYSTEM_PATTERN =
  /<style\b[^>]*data-aura-style-system=["']document\/executive-memo-v1["'][^>]*>/gi;
const ANY_STYLE_PATTERN = /<style\b/gi;
const STYLE_BLOCK_CONTENT_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const SLOT_TOKEN_PATTERN = /\{\{\s*[\w.-]+\s*\}\}/;
const ROOT_SELECTOR_PATTERN = /(?:^|[{}])\s*:root\b/i;
const VIEWPORT_UNIT_PATTERN = /(?:^|[^\w-])-?\d*\.?\d+(?:vw|vh|vmin|vmax)\b/i;
const PRINT_MEDIA_PATTERN = /@media\s+print/i;
const FORBIDDEN_TONE_PATTERN =
  /\b(?:game-changing|world-class|revolutionary|disruptive|best-in-class|awesome|amazing|killer|guaranteed)\b/i;
const EMOJI_PATTERN =
  /[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}]/u;

const report = (findings: ArtifactValidationFinding[]): ArtifactValidationReport => {
  const blockingCount = findings.filter((finding) => finding.severity === 'blocking').length;
  const advisoryCount = findings.filter((finding) => finding.severity === 'advisory').length;

  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    findings,
  };
};

const finding = (
  id: string,
  severity: ArtifactValidationSeverity,
  message: string,
  path?: readonly (string | number)[],
): ArtifactValidationFinding => ({
  id,
  severity,
  message,
  artifactType: 'document',
  path,
  packId: EXECUTIVE_MEMO_PACK_ID,
});

const isModuleArray = (value: unknown): value is readonly ExecutiveMemoModule[] =>
  Array.isArray(value) &&
  value.every(
    (module) =>
      typeof module === 'object' &&
      module !== null &&
      typeof (module as { layoutId?: unknown }).layoutId === 'string' &&
      typeof (module as { slots?: unknown }).slots === 'object' &&
      (module as { slots?: unknown }).slots !== null,
  );

const slotText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const pushSchemaFindings = (
  input: unknown,
  findings: ArtifactValidationFinding[],
): ExecutiveMemoSource | undefined => {
  const parsed = executiveMemoSourceSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  for (const issue of parsed.error.issues) {
    findings.push(
      finding(
        'source.schema_invalid',
        'blocking',
        issue.message,
        issue.path.map((part) => (typeof part === 'symbol' ? part.toString() : part)),
      ),
    );
  }

  return undefined;
};

const pushToneFinding = (
  value: string,
  findings: ArtifactValidationFinding[],
  path: readonly (string | number)[],
) => {
  if (!FORBIDDEN_TONE_PATTERN.test(value)) return;
  findings.push(
    finding(
      'document.tone_unsupported',
      'advisory',
      'Executive memo copy should stay concrete and restrained; remove hype language.',
      path,
    ),
  );
};

const pushModuleFindings = (
  modules: readonly ExecutiveMemoModule[],
  findings: ArtifactValidationFinding[],
) => {
  if (modules[0]?.layoutId !== 'memo-cover') {
    findings.push(
      finding(
        'document.heading_structure_invalid',
        'blocking',
        'Executive memos must start with the memo-cover module so the compiled document has one clear h1.',
        ['modules', 0, 'layoutId'],
      ),
    );
  }

  const hasEvidence = modules.some((module) => module.layoutId === 'evidence-table');
  const hasAction = modules.some((module) => module.layoutId === 'action-plan');
  if (!hasEvidence) {
    findings.push(
      finding(
        'document.evidence_module_missing',
        'advisory',
        'Executive memos should include an evidence-table module so the recommendation is source-backed.',
        ['modules'],
      ),
    );
  }
  if (!hasAction) {
    findings.push(
      finding(
        'document.action_module_missing',
        'advisory',
        'Executive memos should include an action-plan module so the decision has an owner path.',
        ['modules'],
      ),
    );
  }

  modules.forEach((module, moduleIndex) => {
    const layout = EXECUTIVE_MEMO_LAYOUTS[module.layoutId];
    if (!layout) {
      findings.push(
        finding(
          'module.layout_unknown',
          'blocking',
          `Module ${moduleIndex + 1} uses unknown layout "${module.layoutId}".`,
          ['modules', moduleIndex, 'layoutId'],
        ),
      );
      return;
    }

    if (module.role !== layout.role) {
      findings.push(
        finding(
          'module.role_mismatch',
          'blocking',
          `Module ${moduleIndex + 1} role "${module.role}" does not match ${layout.id}.`,
          ['modules', moduleIndex, 'role'],
        ),
      );
    }

    const declaredSlots = new Set([
      ...layout.requiredSlots.map((slot) => slot.id),
      ...layout.optionalSlots.map((slot) => slot.id),
    ]);

    for (const slot of layout.requiredSlots) {
      const value = slotText(module.slots[slot.id]);
      if (!value) {
        findings.push(
          finding(
            'slot.required_missing',
            'blocking',
            `Module ${moduleIndex + 1} is missing required slot "${slot.id}" for ${layout.id}.`,
            ['modules', moduleIndex, 'slots', slot.id],
          ),
        );
      }
      if (value.length > slot.maxLength) {
        findings.push(
          finding(
            slot.kind === 'title' ? 'document.title_too_long' : 'slot.too_long_for_layout',
            slot.kind === 'title' ? 'advisory' : 'blocking',
            `Module ${moduleIndex + 1} slot "${slot.id}" is ${value.length} characters; ${layout.id} allows ${slot.maxLength}.`,
            ['modules', moduleIndex, 'slots', slot.id],
          ),
        );
      }
    }

    for (const [slotId, value] of Object.entries(module.slots)) {
      if (!declaredSlots.has(slotId)) {
        findings.push(
          finding(
            'slot.unknown_key',
            'advisory',
            `Module ${moduleIndex + 1} includes undeclared slot "${slotId}" for ${layout.id}.`,
            ['modules', moduleIndex, 'slots', slotId],
          ),
        );
      }
      if (typeof value === 'string' && HTML_PATTERN.test(value)) {
        findings.push(
          finding(
            'slot.html_detected',
            'blocking',
            `Module ${moduleIndex + 1} slot "${slotId}" contains HTML-like markup; document slots must be plain text.`,
            ['modules', moduleIndex, 'slots', slotId],
          ),
        );
      }
      pushToneFinding(String(value), findings, ['modules', moduleIndex, 'slots', slotId]);
    }

    const items = module.items ?? [];
    const sourceNotes = module.sourceNotes ?? [];

    if (layout.minItems && items.length < layout.minItems) {
      findings.push(
        finding(
          'module.items_missing',
          'blocking',
          `Module ${moduleIndex + 1} needs at least ${layout.minItems} item${layout.minItems === 1 ? '' : 's'} for ${layout.id}.`,
          ['modules', moduleIndex, 'items'],
        ),
      );
    }

    items.forEach((item, itemIndex) => {
      pushToneFinding(item.label, findings, ['modules', moduleIndex, 'items', itemIndex, 'label']);
      if (item.body) pushToneFinding(item.body, findings, ['modules', moduleIndex, 'items', itemIndex, 'body']);
      if (item.value) pushToneFinding(item.value, findings, ['modules', moduleIndex, 'items', itemIndex, 'value']);
    });

    if (layout.requiresTable && !module.table) {
      findings.push(
        finding(
          'module.table_missing',
          'blocking',
          `Module ${moduleIndex + 1} uses ${layout.id}, which requires a bounded table payload.`,
          ['modules', moduleIndex, 'table'],
        ),
      );
    }

    if (module.table) {
      module.table.rows.forEach((row, rowIndex) => {
        if (row.length !== module.table!.columns.length) {
          findings.push(
            finding(
              'module.table_row_width_mismatch',
              'blocking',
              `Module ${moduleIndex + 1} table row ${rowIndex + 1} has ${row.length} cells but ${module.table!.columns.length} columns.`,
              ['modules', moduleIndex, 'table', 'rows', rowIndex],
            ),
          );
        }
        row.forEach((cell, cellIndex) => {
          pushToneFinding(cell, findings, ['modules', moduleIndex, 'table', 'rows', rowIndex, cellIndex]);
        });
      });
    }

    if (layout.requiresSourceNotes && sourceNotes.length === 0) {
      findings.push(
        finding(
          'document.source_notes_missing',
          'blocking',
          `Module ${moduleIndex + 1} uses ${layout.id}, which requires source notes.`,
          ['modules', moduleIndex, 'sourceNotes'],
        ),
      );
    }
  });
};

export const validateExecutiveMemoSource = (input: ExecutiveMemoSource | unknown): ArtifactValidationReport => {
  const findings: ArtifactValidationFinding[] = [];
  const parsedSource = pushSchemaFindings(input, findings);

  const maybeModules = parsedSource?.modules ?? (input as { modules?: unknown } | null | undefined)?.modules;
  if (isModuleArray(maybeModules)) {
    pushModuleFindings(maybeModules, findings);
  }

  return report(findings);
};

export const validateExecutiveMemoCompiledOutput = (
  output: ArtifactCompiledOutput | string,
): ArtifactValidationReport => {
  const content = typeof output === 'string' ? output : output.content;
  const findings: ArtifactValidationFinding[] = [];
  const styleSystemCount = [...content.matchAll(STYLE_SYSTEM_PATTERN)].length;
  const anyStyleCount = [...content.matchAll(ANY_STYLE_PATTERN)].length;
  const styleText = [...content.matchAll(STYLE_BLOCK_CONTENT_PATTERN)]
    .map((match) => match[1] ?? '')
    .join('\n');
  const htmlWithoutStyles = content.replace(STYLE_BLOCK_CONTENT_PATTERN, '');
  const classNames = [...htmlWithoutStyles.matchAll(/\bclass=["']([^"']+)["']/gi)]
    .flatMap((match) => (match[1] ?? '').split(/\s+/).filter(Boolean));
  const cssClasses = new Set([...styleText.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((match) => match[1]));
  const h1Count = [...content.matchAll(/<h1\b/gi)].length;
  const h2Count = [...content.matchAll(/<h2\b/gi)].length;

  if (styleSystemCount !== 1 || anyStyleCount !== 1) {
    findings.push(
      finding(
        'compiled.style_block_invalid',
        'blocking',
        'Compiled output must contain exactly one compiler-owned style block for document/executive-memo-v1.',
        ['content'],
      ),
    );
  }

  if (!/<article\b[^>]*data-pack=["']document\/executive-memo-v1["']/i.test(content)) {
    findings.push(
      finding(
        'compiled.pack_marker_missing',
        'blocking',
        'Compiled executive memo output must include an article marked with data-pack.',
        ['content'],
      ),
    );
  }

  if (h1Count !== 1 || h2Count === 0) {
    findings.push(
      finding(
        'compiled.heading_hierarchy_invalid',
        'blocking',
        'Compiled executive memos must include exactly one h1 and supporting h2 sections.',
        ['content'],
      ),
    );
  }

  if (INLINE_STYLE_PATTERN.test(content)) {
    findings.push(
      finding(
        'compiled.inline_style_detected',
        'blocking',
        'Compiled output must not contain raw inline style attributes.',
        ['content'],
      ),
    );
  }

  if (SLOT_TOKEN_PATTERN.test(content)) {
    findings.push(
      finding(
        'compiled.placeholder_unresolved',
        'blocking',
        'Compiled output contains unresolved {{slot}} placeholders.',
        ['content'],
      ),
    );
  }

  if (ROOT_SELECTOR_PATTERN.test(styleText)) {
    findings.push(
      finding(
        'compiled.global_root_selector_detected',
        'blocking',
        'Compiled pack CSS must not declare :root variables because artifact styles must stay scoped to the document article.',
        ['content'],
      ),
    );
  }

  if (VIEWPORT_UNIT_PATTERN.test(styleText)) {
    findings.push(
      finding(
        'export.viewport_units_detected',
        'blocking',
        'Compiled document output must not use viewport units because it must reflow inside Aura document frames and export surfaces.',
        ['content'],
      ),
    );
  }

  if (!PRINT_MEDIA_PATTERN.test(styleText)) {
    findings.push(
      finding(
        'export.print_rules_missing',
        'blocking',
        'Compiled document output must include print-safe CSS rules.',
        ['content'],
      ),
    );
  }

  if (/<script\b/i.test(content)) {
    findings.push(
      finding(
        'compiled.script_detected',
        'blocking',
        'Compiled document output must not include script tags.',
        ['content'],
      ),
    );
  }

  if (EMOJI_PATTERN.test(htmlWithoutStyles)) {
    findings.push(
      finding(
        'compiled.emoji_icon_detected',
        'advisory',
        'Executive memo output should not use emoji as icons or status markers.',
        ['content'],
      ),
    );
  }

  const undefinedClasses = [...new Set(classNames.filter((className) => !cssClasses.has(className)))];
  if (undefinedClasses.length > 0) {
    findings.push(
      finding(
        'compiled.undefined_class',
        'blocking',
        `Compiled output uses classes not declared in pack CSS: ${undefinedClasses.join(', ')}.`,
        ['content'],
      ),
    );
  }

  return report(findings);
};
