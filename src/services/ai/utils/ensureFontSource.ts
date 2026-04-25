function extractFontFamilies(html: string): string[] {
  const families = new Set<string>();
  const fontFamilyRegex = /font-family\s*:\s*([^;\n}]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = fontFamilyRegex.exec(html)) !== null) {
    const rawValue = match[1] ?? '';
    for (const part of rawValue.split(',')) {
      const clean = part.trim().replace(/^['"]|['"]$/g, '');
      if (clean) families.add(clean.toLowerCase());
    }
  }

  return [...families];
}

function isGenericSystemFontFamily(family: string): boolean {
  const genericFamilies = new Set([
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'ui-sans-serif',
    'ui-serif',
    'ui-monospace',
    'ui-rounded',
    'emoji',
    'math',
    'fangsong',
  ]);

  const systemAliases = new Set([
    'arial',
    'helvetica',
    'times new roman',
    'georgia',
    'verdana',
    'tahoma',
    'trebuchet ms',
    'courier new',
    'segoe ui',
    '-apple-system',
    'blinkmacsystemfont',
  ]);

  return genericFamilies.has(family) || systemAliases.has(family);
}

export function ensureFontSourceDeclaration(html: string, fontImport?: string): string {
  if (!fontImport) return html;
  if (/fonts\.googleapis\.com/i.test(html) || /@font-face\s*\{/i.test(html)) return html;

  const customFamilies = extractFontFamilies(html).filter((family) => !isGenericSystemFontFamily(family));
  if (customFamilies.length === 0) return html;

  const googleFontsLink = `<link href="https://fonts.googleapis.com/css2?${fontImport}&display=swap" rel="stylesheet">`;
  return `${googleFontsLink}\n${html.trim()}`;
}
