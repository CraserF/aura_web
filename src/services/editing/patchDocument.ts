import type { ResolvedTarget, TargetSelector } from '@/services/editing/types';
import { mergeStyleTokens } from '@/services/editing/styleTokens';

type DocumentBlockType =
  | 'document-block'
  | 'heading-section'
  | 'paragraph-cluster'
  | 'callout-block'
  | 'table-block'
  | 'chart-block'
  | 'metadata-band';

export interface DocumentEditBlock {
  id: string;
  type: DocumentBlockType;
  label: string;
  html: string;
  text: string;
}

export interface PreparedDocument {
  html: string;
  blocks: DocumentEditBlock[];
}

function blockTypeForElement(element: HTMLElement): DocumentBlockType {
  const tagName = element.tagName.toLowerCase();
  const className = element.className.toLowerCase();

  if (tagName === 'table' || element.querySelector('table')) return 'table-block';
  if (element.querySelector('[data-aura-chart], script[data-aura-chart-spec]')) return 'chart-block';
  if (tagName === 'blockquote' || /\b(callout|card|quote|highlight)\b/.test(className)) return 'callout-block';
  if (/\b(meta|kpi|stat|summary|overview)\b/.test(className)) return 'metadata-band';
  if (/^h[1-3]$/.test(tagName) || element.querySelector('h1, h2, h3')) return 'heading-section';
  if (tagName === 'p' || tagName === 'ul' || tagName === 'ol' || element.querySelector('p, li')) return 'paragraph-cluster';
  return 'document-block';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildBlockLabel(type: DocumentBlockType, text: string, index: number): string {
  const shortText = text.split(/\s+/).slice(0, 8).join(' ');
  if (shortText) {
    return `${type.replace(/-/g, ' ')} ${index + 1}: ${shortText}`;
  }
  return `${type.replace(/-/g, ' ')} ${index + 1}`;
}

function getEditableElements(doc: Document): HTMLElement[] {
  const bodyChildren = Array.from(doc.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
  if (bodyChildren.length > 0) {
    return bodyChildren;
  }

  return Array.from(doc.body.querySelectorAll<HTMLElement>('h1, h2, h3, p, blockquote, table, section, article, div'));
}

function serializeDocument(doc: Document): string {
  const styles = Array.from(doc.head.querySelectorAll('style'))
    .map((node) => node.outerHTML)
    .join('\n');
  return `${styles}${styles ? '\n' : ''}${doc.body.innerHTML}`.trim();
}

export function prepareDocumentHtmlForEditing(html: string): PreparedDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: DocumentEditBlock[] = [];

  getEditableElements(doc).forEach((element, index) => {
    const type = blockTypeForElement(element);
    const existingId = element.getAttribute('data-aura-block-id');
    const id = existingId || `${type}-${index + 1}`;
    element.setAttribute('data-aura-block-id', id);
    element.setAttribute('data-aura-block-type', type);

    const text = stripHtml(element.outerHTML);
    blocks.push({
      id,
      type,
      label: buildBlockLabel(type, text, index),
      html: element.outerHTML,
      text,
    });
  });

  return {
    html: serializeDocument(doc),
    blocks,
  };
}

function resolveGenericDocumentBlock(blocks: DocumentEditBlock[], prompt: string): DocumentEditBlock[] {
  const keywords = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);

  const scored = blocks
    .map((block) => {
      const haystack = `${block.label} ${block.text}`.toLowerCase();
      const score = keywords.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { block, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return [scored[0]!.block];
  }

  return blocks.slice(0, 1);
}

export function resolveDocumentTargets(
  html: string,
  selectors: TargetSelector[],
  prompt?: string,
): ResolvedTarget[] {
  const prepared = prepareDocumentHtmlForEditing(html);
  const resolved: ResolvedTarget[] = [];

  for (const selector of selectors) {
    let matches: DocumentEditBlock[] = [];

    if (selector.type === 'document-block') {
      matches = resolveGenericDocumentBlock(prepared.blocks, prompt ?? '');
    } else {
      matches = prepared.blocks.filter((block) => {
        if (selector.type !== block.type) return false;
        if (!selector.value) return true;
        return `${block.label} ${block.text}`.toLowerCase().includes(selector.value.toLowerCase());
      });
    }

    matches.forEach((block) => {
      resolved.push({
        selector,
        artifactType: 'document',
        blockId: block.id,
        label: selector.label ?? block.label,
        matchedText: block.text,
      });
    });
  }

  return resolved;
}

function applyBlockReplace(
  existingHtml: string,
  generatedHtml: string,
  targets: ResolvedTarget[],
): { success: boolean; html: string; dryRunFailures: string[] } {
  const parser = new DOMParser();
  const existingPrepared = prepareDocumentHtmlForEditing(existingHtml);
  const generatedPrepared = prepareDocumentHtmlForEditing(generatedHtml);
  const existingDoc = parser.parseFromString(existingPrepared.html, 'text/html');
  const generatedDoc = parser.parseFromString(generatedPrepared.html, 'text/html');
  const dryRunFailures: string[] = [];
  let applied = 0;

  targets.forEach((target) => {
    if (!target.blockId) return;
    const existingNode = existingDoc.body.querySelector<HTMLElement>(`[data-aura-block-id="${target.blockId}"]`);
    const generatedNode = generatedDoc.body.querySelector<HTMLElement>(`[data-aura-block-id="${target.blockId}"]`);
    if (!existingNode || !generatedNode) {
      dryRunFailures.push(target.label);
      return;
    }
    existingNode.outerHTML = generatedNode.outerHTML;
    applied += 1;
  });

  return {
    success: applied > 0 && dryRunFailures.length === 0,
    html: serializeDocument(existingDoc),
    dryRunFailures,
  };
}

function applySearchReplaceFallback(
  existingHtml: string,
  generatedHtml: string,
  targets: ResolvedTarget[],
): { success: boolean; html: string; dryRunFailures: string[] } {
  const parser = new DOMParser();
  const existingPrepared = prepareDocumentHtmlForEditing(existingHtml);
  const generatedPrepared = prepareDocumentHtmlForEditing(generatedHtml);
  const existingDoc = parser.parseFromString(existingPrepared.html, 'text/html');
  const generatedDoc = parser.parseFromString(generatedPrepared.html, 'text/html');
  const dryRunFailures: string[] = [];
  let applied = 0;

  targets.forEach((target) => {
    if (!target.blockId) return;
    const existingNode = existingDoc.body.querySelector<HTMLElement>(`[data-aura-block-id="${target.blockId}"]`);
    const generatedNode = generatedDoc.body.querySelector<HTMLElement>(`[data-aura-block-id="${target.blockId}"]`);
    if (!existingNode || !generatedNode) {
      dryRunFailures.push(target.label);
      return;
    }

    const targetNodes = Array.from(existingNode.querySelectorAll<HTMLElement>('h1, h2, h3, p, li, blockquote, td, th, figcaption, span, strong, em'));
    const sourceNodes = Array.from(generatedNode.querySelectorAll<HTMLElement>('h1, h2, h3, p, li, blockquote, td, th, figcaption, span, strong, em'));
    const limit = Math.min(targetNodes.length, sourceNodes.length);
    if (limit === 0) {
      dryRunFailures.push(target.label);
      return;
    }

    for (let index = 0; index < limit; index += 1) {
      const source = sourceNodes[index];
      const targetElement = targetNodes[index];
      if (source && targetElement) {
        targetElement.innerHTML = source.innerHTML;
      }
    }
    applied += 1;
  });

  return {
    success: applied > 0,
    html: serializeDocument(existingDoc),
    dryRunFailures,
  };
}

export function applyDocumentTargetedEdit(input: {
  existingHtml: string;
  generatedHtml: string;
  targets: ResolvedTarget[];
  strategyHint: 'block-replace' | 'search-replace' | 'style-token' | 'full-regenerate';
  allowFullRegeneration: boolean;
}): {
  html: string;
  strategyUsed: 'block-replace' | 'search-replace' | 'style-token' | 'full-regenerate';
  fallbackUsed: boolean;
  dryRunFailures: string[];
} {
  const { existingHtml, generatedHtml, targets, strategyHint, allowFullRegeneration } = input;

  if (allowFullRegeneration || strategyHint === 'full-regenerate') {
    return {
      html: prepareDocumentHtmlForEditing(generatedHtml).html,
      strategyUsed: 'full-regenerate',
      fallbackUsed: false,
      dryRunFailures: [],
    };
  }

  if (strategyHint === 'style-token') {
    return {
      html: prepareDocumentHtmlForEditing(mergeStyleTokens(existingHtml, generatedHtml)).html,
      strategyUsed: 'style-token',
      fallbackUsed: false,
      dryRunFailures: [],
    };
  }

  const blockResult = applyBlockReplace(existingHtml, generatedHtml, targets);
  if (blockResult.success) {
    return {
      html: blockResult.html,
      strategyUsed: 'block-replace',
      fallbackUsed: false,
      dryRunFailures: [],
    };
  }

  const searchReplaceResult = applySearchReplaceFallback(existingHtml, generatedHtml, targets);
  if (searchReplaceResult.success) {
    return {
      html: searchReplaceResult.html,
      strategyUsed: 'search-replace',
      fallbackUsed: true,
      dryRunFailures: blockResult.dryRunFailures,
    };
  }

  return {
    html: prepareDocumentHtmlForEditing(existingHtml).html,
    strategyUsed: 'search-replace',
    fallbackUsed: true,
    dryRunFailures: [...blockResult.dryRunFailures, ...searchReplaceResult.dryRunFailures],
  };
}
