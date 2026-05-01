import type {
  ArtifactCompiledOutput,
  ArtifactOutputMode,
  ArtifactPackCompileResult,
  ArtifactStructurePlan,
  DesignContextSpec,
  ProjectDesignTokenAdapter,
} from '@/services/artifactPacks/types';
import {
  EXECUTIVE_MEMO_PACK_ID,
  type ExecutiveMemoItem,
  type ExecutiveMemoModule,
  type ExecutiveMemoSource,
  type ExecutiveMemoTable,
} from './schemas';
import {
  validateExecutiveMemoCompiledOutput,
  validateExecutiveMemoSource,
} from './validator';
import styleCss from 'virtual:artifact-pack-css/document-executive-memo-v1';

const STYLE_SYSTEM_ATTRIBUTE = `data-aura-style-system="${EXECUTIVE_MEMO_PACK_ID}"`;

export const EXECUTIVE_MEMO_PROJECT_DESIGN_ADAPTER: ProjectDesignTokenAdapter<Record<string, string>> = {
  id: `${EXECUTIVE_MEMO_PACK_ID}/document-token-adapter`,
  artifactType: 'document',
  target: 'document-tokens',
  supportedColorRoles: [
    'canvas',
    'surface',
    'raisedSurface',
    'text',
    'mutedText',
    'border',
    'accent',
    'accentText',
    'subtleFill',
    'positive',
    'warning',
    'negative',
  ],
  mapColorOverrides: (overrides) => {
    const variableByRole: Record<string, string> = {
      canvas: '--em-canvas',
      surface: '--em-surface',
      raisedSurface: '--em-raised',
      text: '--em-ink',
      mutedText: '--em-muted',
      border: '--em-line',
      accent: '--em-accent',
      accentText: '--em-accent-text',
      subtleFill: '--em-subtle',
      positive: '--em-positive',
      warning: '--em-warning',
      negative: '--em-negative',
    };
    return Object.fromEntries(
      overrides
        .filter((override) => EXECUTIVE_MEMO_PROJECT_DESIGN_ADAPTER.supportedColorRoles.includes(override.role))
        .filter((override) => /^#[0-9a-f]{6}$/i.test(override.value))
        .map((override) => [variableByRole[override.role], override.value.toLowerCase()]),
    );
  },
};

export interface ExecutiveMemoCompileInput {
  source: ExecutiveMemoSource;
  structure?: ArtifactStructurePlan;
  designContext?: DesignContextSpec;
  outputMode?: ArtifactOutputMode;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const kebab = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'memo';

const slot = (module: ExecutiveMemoModule, slotId: string): string =>
  escapeHtml(module.slots[slotId] ?? '');

const optionalSlot = (module: ExecutiveMemoModule, slotId: string): string | undefined => {
  const value = module.slots[slotId]?.trim();
  return value ? escapeHtml(value) : undefined;
};

const tokenDeclarations = (designContext: DesignContextSpec | undefined): string[] => {
  if (!designContext) return [];
  const tokens = designContext.tokens;
  return [
    ['--em-canvas', tokens.colors.canvas],
    ['--em-surface', tokens.colors.surface],
    ['--em-raised', tokens.colors.raisedSurface],
    ['--em-ink', tokens.colors.text],
    ['--em-muted', tokens.colors.mutedText],
    ['--em-accent', tokens.colors.accent],
    ['--em-accent-text', tokens.colors.accentText],
    ['--em-line', tokens.colors.border],
    ['--em-subtle', tokens.colors.subtleFill],
    ['--em-positive', tokens.colors.positive],
    ['--em-warning', tokens.colors.warning],
    ['--em-negative', tokens.colors.negative],
    ['--em-display', designContext.typography.families.display],
    ['--em-body', designContext.typography.families.body],
    ['--em-mono', designContext.typography.families.mono],
  ]
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
    .map(([name, value]) => `  ${name}: ${value};`);
};

const projectDesignCss = (designContext: DesignContextSpec | undefined): string => {
  const declarations = tokenDeclarations(designContext);
  const overrides = designContext?.projectDesignSystem?.colorOverrides ?? [];
  const projectDeclarations = Object.entries(EXECUTIVE_MEMO_PROJECT_DESIGN_ADAPTER.mapColorOverrides(overrides))
    .map(([cssVariable, value]) => `  ${cssVariable}: ${value};`);
  const merged = [...declarations, ...projectDeclarations];

  if (merged.length === 0) return '';

  return `
.em-doc[data-pack="${EXECUTIVE_MEMO_PACK_ID}"] {
${merged.join('\n')}
}`;
};

const styleBlock = (designContext: DesignContextSpec | undefined): string => `<style ${STYLE_SYSTEM_ATTRIBUTE}>
${styleCss.trim()}${projectDesignCss(designContext)}
</style>`;

const renderMeta = (module: ExecutiveMemoModule): string => {
  const entries = [
    ['Audience', optionalSlot(module, 'audience')],
    ['Date', optionalSlot(module, 'date')],
    ['Owner', optionalSlot(module, 'owner')],
    ['Status', optionalSlot(module, 'status')],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (entries.length === 0) return '';

  return `<dl class="em-meta">${entries
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`)
    .join('')}</dl>`;
};

const renderSectionHeading = (kicker: string, heading: string): string => `
<div class="em-section-heading">
  <p class="em-section-kicker">${escapeHtml(kicker)}</p>
  <h2>${heading}</h2>
</div>`.trim();

const renderItems = (items: readonly ExecutiveMemoItem[]): string =>
  `<ol class="em-step-list">${items
    .map((item, index) => `
  <li class="em-step">
    <span class="em-step-index">${String(index + 1).padStart(2, '0')}</span>
    <div>
      <h3>${escapeHtml(item.label)}</h3>
      ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}
      ${item.value ? `<span class="em-status">${escapeHtml(item.value)}</span>` : ''}
    </div>
  </li>`.trim())
    .join('')}</ol>`;

const renderTable = (table: ExecutiveMemoTable | undefined): string => {
  if (!table) return '';
  return `
<div class="em-table-wrap">
  <table class="em-table">
    <thead><tr>${table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
    <tbody>${table.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('')}</tbody>
  </table>
</div>`.trim();
};

const renderSources = (sourceNotes: readonly string[]): string => {
  if (sourceNotes.length === 0) return '';
  return `
<aside class="em-source-block">
  <p class="em-source-title">Sources</p>
  <ul class="em-source-list">${sourceNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>
</aside>`.trim();
};

const renderCards = (items: readonly ExecutiveMemoItem[]): string =>
  `<div class="em-card-grid">${items
    .map((item) => `
  <article class="em-card">
    <h3>${escapeHtml(item.label)}</h3>
    ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}
    ${item.status ? `<span class="em-status">${escapeHtml(item.status)}</span>` : ''}
  </article>`.trim())
    .join('')}</div>`;

const moduleClass = (module: ExecutiveMemoModule): string =>
  `em-module em-${kebab(module.layoutId)} em-density-${module.density}`;

const moduleAttrs = (module: ExecutiveMemoModule): string =>
  `class="${moduleClass(module)}" data-module-id="${escapeHtml(module.moduleId)}" data-layout="${escapeHtml(module.layoutId)}"`;

const renderModule = (module: ExecutiveMemoModule): string => {
  switch (module.layoutId) {
    case 'memo-cover':
      return `
<header ${moduleAttrs(module)}>
  ${optionalSlot(module, 'kicker') ? `<p class="em-kicker">${optionalSlot(module, 'kicker')}</p>` : ''}
  <h1>${slot(module, 'title')}</h1>
  <p class="em-lead">${slot(module, 'lead')}</p>
  ${renderMeta(module)}
</header>`.trim();
    case 'decision-summary':
      return `
<section ${moduleAttrs(module)}>
  ${renderSectionHeading('Decision', slot(module, 'heading'))}
  <p class="em-recommendation">${slot(module, 'recommendation')}</p>
  <div class="em-proof-strip">
    <div class="em-proof-item"><strong>Decision</strong><span>${slot(module, 'decision')}</span></div>
    <div class="em-proof-item"><strong>Confidence</strong><span>${slot(module, 'confidence')}</span></div>
    <div class="em-proof-item"><strong>Ask</strong><span>${optionalSlot(module, 'ask') ?? 'Confirm owner and timing.'}</span></div>
  </div>
  ${optionalSlot(module, 'rationale') ? `<p class="em-note">${optionalSlot(module, 'rationale')}</p>` : ''}
</section>`.trim();
    case 'context':
      return `
<section ${moduleAttrs(module)}>
  ${renderSectionHeading('Context', slot(module, 'heading'))}
  <p class="em-section-body">${slot(module, 'body')}</p>
  ${optionalSlot(module, 'note') ? `<aside class="em-note">${optionalSlot(module, 'note')}</aside>` : ''}
</section>`.trim();
    case 'recommendation':
      return `
<section ${moduleAttrs(module)}>
  ${renderSectionHeading('Recommendation', slot(module, 'heading'))}
  <p class="em-intro">${slot(module, 'intro')}</p>
  ${renderItems(module.items)}
</section>`.trim();
    case 'evidence-table':
      return `
<section ${moduleAttrs(module)}>
  ${renderSectionHeading('Evidence', slot(module, 'heading'))}
  <p class="em-intro">${slot(module, 'intro')}</p>
  ${renderTable(module.table)}
  ${renderSources(module.sourceNotes)}
</section>`.trim();
    case 'risk-register':
      return `
<section ${moduleAttrs(module)}>
  ${renderSectionHeading('Risks', slot(module, 'heading'))}
  <p class="em-intro">${slot(module, 'intro')}</p>
  ${renderCards(module.items)}
</section>`.trim();
    case 'action-plan':
      return `
<section ${moduleAttrs(module)}>
  ${renderSectionHeading('Action', slot(module, 'heading'))}
  <p class="em-intro">${slot(module, 'intro')}</p>
  ${renderTable(module.table)}
</section>`.trim();
    case 'source-notes':
      return `
<section ${moduleAttrs(module)}>
  ${renderSectionHeading('Sources', slot(module, 'heading'))}
  ${optionalSlot(module, 'body') ? `<p class="em-intro">${optionalSlot(module, 'body')}</p>` : ''}
  ${renderSources(module.sourceNotes)}
</section>`.trim();
    default:
      return '';
  }
};

const collectAssets = (): readonly string[] => [];

const buildArticle = (
  source: ExecutiveMemoSource,
  designContext: DesignContextSpec | undefined,
): string => {
  const projectDesignAttr = designContext?.projectDesignSystem
    ? ` data-project-design-system="${escapeHtml(designContext.projectDesignSystem.source)}"`
    : '';
  return `
<article class="em-doc em-direction-${escapeHtml(source.directionId)}" data-pack="${EXECUTIVE_MEMO_PACK_ID}" data-direction="${escapeHtml(source.directionId)}" aria-label="${escapeHtml(source.title)}"${projectDesignAttr}>
${source.modules.map(renderModule).join('\n')}
</article>`.trim();
};

const mergeReports = (...reports: ArtifactPackCompileResult['validation'][]): ArtifactPackCompileResult['validation'] => {
  const findings = reports.flatMap((report) => [...report.findings]);
  const blockingCount = findings.filter((finding) => finding.severity === 'blocking').length;
  const advisoryCount = findings.filter((finding) => finding.severity === 'advisory').length;

  return {
    passed: blockingCount === 0,
    blockingCount,
    advisoryCount,
    findings,
  };
};

export const compileExecutiveMemoDocument = (
  source: ExecutiveMemoSource,
  designContext?: DesignContextSpec,
): string => [styleBlock(designContext), buildArticle(source, designContext)].join('\n');

export const compileExecutiveMemoPack = (
  input: ExecutiveMemoCompileInput,
): ArtifactPackCompileResult => {
  const sourceValidation = validateExecutiveMemoSource(input.source);
  const output: ArtifactCompiledOutput = {
    mode: input.outputMode ?? input.source.outputMode,
    content: compileExecutiveMemoDocument(input.source, input.designContext),
    assets: collectAssets(),
    generatedAt: Date.now(),
  };
  const compiledValidation = validateExecutiveMemoCompiledOutput(output);

  return {
    output,
    validation: mergeReports(sourceValidation, compiledValidation),
  };
};

export { validateExecutiveMemoCompiledOutput, validateExecutiveMemoSource };
