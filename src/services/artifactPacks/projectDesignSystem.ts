import type { ColorTheme } from '@/types/project';
import type {
  ArtifactColorTokenRole,
  ArtifactDesignTokens,
  ProjectDesignSystemSpec,
  ProjectDesignTokenOverride,
} from './types';

const COLOR_ROLE_ALIASES: Record<string, ArtifactColorTokenRole> = {
  background: 'canvas',
  page: 'canvas',
  canvas: 'canvas',
  base: 'canvas',
  surface: 'surface',
  panel: 'surface',
  card: 'surface',
  raised: 'raisedSurface',
  'raised surface': 'raisedSurface',
  primary: 'text',
  foreground: 'text',
  text: 'text',
  copy: 'text',
  muted: 'mutedText',
  secondary: 'mutedText',
  'muted text': 'mutedText',
  accent: 'accent',
  brand: 'accent',
  highlight: 'accent',
  'accent text': 'accentText',
  'on accent': 'accentText',
  border: 'border',
  rule: 'border',
  line: 'border',
  subtle: 'subtleFill',
  'subtle fill': 'subtleFill',
  fill: 'subtleFill',
  positive: 'positive',
  success: 'positive',
  warning: 'warning',
  caution: 'warning',
  negative: 'negative',
  danger: 'negative',
};

const UNSAFE_COLOR_VALUE_RE = /\b(?:rgb|rgba|hsl|hsla|oklch|linear-gradient|radial-gradient|var)\s*\(/i;

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim().replace(/[;,.}]+$/, '');
  const short = trimmed.match(/^#([0-9a-f]{3})$/i)?.[1];
  if (short) {
    return `#${short.split('').map((part) => part + part).join('')}`.toLowerCase();
  }
  const long = trimmed.match(/^#([0-9a-f]{6})$/i)?.[1];
  return long ? `#${long.toLowerCase()}` : null;
}

function roleFromLabel(label: string): ArtifactColorTokenRole | null {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  return COLOR_ROLE_ALIASES[normalized] ?? null;
}

function buildOverride(
  label: string,
  value: string,
  source: ProjectDesignTokenOverride['source'],
): ProjectDesignTokenOverride | null {
  const role = roleFromLabel(label);
  const color = normalizeHexColor(value);
  if (!role || !color) return null;
  return {
    role,
    value: color,
    source,
    label: label.trim(),
  };
}

function parseColorAssignments(markdown: string): {
  overrides: ProjectDesignTokenOverride[];
  ignoredColorLines: string[];
} {
  const overrides: ProjectDesignTokenOverride[] = [];
  const ignoredColorLines: string[] = [];
  const lines = markdown.split(/\r?\n/);
  let insideCssBlock = false;
  let insideCodeFence = false;

  for (const line of lines) {
    const rawTrimmed = line.trim();
    if (!rawTrimmed) continue;
    if (/^(?:```|~~~)/.test(rawTrimmed)) {
      insideCodeFence = !insideCodeFence;
      continue;
    }
    const hasUnsafeColorValue = UNSAFE_COLOR_VALUE_RE.test(rawTrimmed);
    const hasColorLikeValue = /#[0-9a-f]{3,6}\b/i.test(rawTrimmed) || hasUnsafeColorValue;

    if (insideCodeFence) {
      if (hasColorLikeValue) ignoredColorLines.push(rawTrimmed);
      continue;
    }

    if (insideCssBlock) {
      if (hasColorLikeValue) ignoredColorLines.push(rawTrimmed);
      if (rawTrimmed.includes('}')) insideCssBlock = false;
      continue;
    }

    if (rawTrimmed.includes('{') || rawTrimmed.includes('}') || rawTrimmed.startsWith('--')) {
      if (hasColorLikeValue) ignoredColorLines.push(rawTrimmed);
      if (rawTrimmed.includes('{') && !rawTrimmed.includes('}')) insideCssBlock = true;
      continue;
    }

    const isBulletLine = /^[-*]\s+/.test(rawTrimmed);
    const trimmed = rawTrimmed.replace(/^[-*]\s+/, '');
    if (!trimmed || /^#{1,6}\s/.test(trimmed)) continue;
    if (!isBulletLine && /^[a-z-]+\s*:\s*#[0-9a-f]{3,6}\s*;?$/i.test(trimmed) && trimmed === trimmed.toLowerCase()) {
      ignoredColorLines.push(trimmed);
      continue;
    }

    const assignmentPattern = /([A-Za-z][A-Za-z\s_-]{1,28})\s*[:=]\s*([^;,]+)/g;
    const countBefore = overrides.length;
    let matchedAssignment = false;
    let match: RegExpExecArray | null;
    while ((match = assignmentPattern.exec(trimmed)) !== null) {
      matchedAssignment = true;
      const override = buildOverride(match[1]!, match[2]!, 'project-design-md');
      if (override) {
        overrides.push(override);
      }
    }

    if (!matchedAssignment) continue;
    if (hasColorLikeValue && (hasUnsafeColorValue || overrides.length === countBefore)) {
      ignoredColorLines.push(trimmed);
    }
  }

  return { overrides, ignoredColorLines };
}

function colorThemeOverrides(colorTheme: ColorTheme | undefined): ProjectDesignTokenOverride[] {
  if (!colorTheme) return [];
  return [
    buildOverride('background', colorTheme.background, 'project-color-theme'),
    buildOverride('primary', colorTheme.primary, 'project-color-theme'),
    buildOverride('accent', colorTheme.accent, 'project-color-theme'),
  ].filter((override): override is ProjectDesignTokenOverride => Boolean(override));
}

function uniqueOverrides(overrides: ProjectDesignTokenOverride[]): ProjectDesignTokenOverride[] {
  const byRole = new Map<ArtifactColorTokenRole, ProjectDesignTokenOverride>();
  for (const override of overrides) {
    byRole.set(override.role, override);
  }
  return [...byRole.values()];
}

export function applyProjectDesignSystemTokens(
  tokens: ArtifactDesignTokens,
  overrides: readonly ProjectDesignTokenOverride[],
): ArtifactDesignTokens {
  const colors = { ...tokens.colors };
  for (const override of overrides) {
    colors[override.role] = override.value;
  }
  return { ...tokens, colors };
}

export function resolveProjectDesignSystemSpec(
  markdown: string | undefined,
  colorTheme?: ColorTheme,
): ProjectDesignSystemSpec | undefined {
  const parsed = parseColorAssignments(markdown ?? '');
  const markdownOverrides = uniqueOverrides(parsed.overrides);
  const fallbackOverrides = colorThemeOverrides(colorTheme);
  const colorOverrides = uniqueOverrides([...fallbackOverrides, ...markdownOverrides]);

  if (colorOverrides.length === 0 && parsed.ignoredColorLines.length === 0) return undefined;

  const ignoredColorLines = parsed.ignoredColorLines.slice(0, 8);
  const hasDesignMdOverrides = colorOverrides.some((override) => override.source === 'project-design-md');
  const source = hasDesignMdOverrides
    ? 'project-design-md'
    : colorOverrides.length > 0
      ? 'project-color-theme'
      : 'project-design-md';
  const notes = [
    colorOverrides.length > 0
      ? `Mapped ${colorOverrides.length} project color role${colorOverrides.length === 1 ? '' : 's'} into Aura design tokens.`
      : 'No safe project color role overrides were found.',
    ...(ignoredColorLines.length > 0
      ? ['Ignored CSS-like color values; project design mode accepts hex colors mapped to named roles only.']
      : []),
  ];

  return {
    version: 1,
    source,
    colorOverrides,
    notes,
    preview: {
      summary: source === 'project-design-md'
        ? 'Project DESIGN.md color roles mapped into Aura token roles.'
        : 'Project color theme mapped into Aura token roles.',
      palette: colorOverrides,
      ignoredColorLines,
    },
  };
}
