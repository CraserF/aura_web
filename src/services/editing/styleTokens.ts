export type StyleTokenMap = Record<string, string>;

const ROOT_TOKEN_BLOCK_RE = /:root\s*\{([\s\S]*?)\}/i;
const TOKEN_DECLARATION_RE = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;

function extractFirstStyleBlock(html: string): string | null {
  return html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] ?? null;
}

export function extractStyleTokens(html: string): StyleTokenMap {
  const styleBlock = extractFirstStyleBlock(html);
  if (!styleBlock) return {};

  const tokenSource = ROOT_TOKEN_BLOCK_RE.exec(styleBlock)?.[1] ?? styleBlock;
  const tokens: StyleTokenMap = {};
  let match: RegExpExecArray | null;

  while ((match = TOKEN_DECLARATION_RE.exec(tokenSource)) !== null) {
    const token = match[1]?.trim();
    const value = match[2]?.trim();
    if (token && value) {
      tokens[token] = value;
    }
  }

  return tokens;
}

export function applyStyleTokens(html: string, nextTokens: StyleTokenMap): string {
  if (Object.keys(nextTokens).length === 0) {
    return html;
  }

  return html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/i, (_match, attrs: string, css: string) => {
    const rootMatch = ROOT_TOKEN_BLOCK_RE.exec(css);
    const tokenLines = Object.entries(nextTokens)
      .map(([token, value]) => `  ${token}: ${value};`)
      .join('\n');

    if (rootMatch) {
      const rootBody = rootMatch[1] ?? '';
      const updatedRoot = Object.entries(nextTokens).reduce((acc, [token, value]) => {
        const tokenRe = new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*)([^;]+)(;)`, 'i');
        if (tokenRe.test(acc)) {
          return acc.replace(tokenRe, `$1${value}$3`);
        }
        return `${acc.trimEnd()}\n  ${token}: ${value};\n`;
      }, rootBody);

      return `<style${attrs}>${css.replace(ROOT_TOKEN_BLOCK_RE, `:root {\n${updatedRoot.trim()}\n}`)}</style>`;
    }

    return `<style${attrs}>:root {\n${tokenLines}\n}\n${css}</style>`;
  });
}

export function mergeStyleTokens(existingHtml: string, generatedHtml: string): string {
  const generatedTokens = extractStyleTokens(generatedHtml);
  return applyStyleTokens(existingHtml, generatedTokens);
}
