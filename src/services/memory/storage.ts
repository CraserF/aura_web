/**
 * Memory File Storage — Read/Write Utilities
 *
 * Handles parsing YAML frontmatter, serializing memory files,
 * and persistence to the file system (or IndexedDB in browser context).
 *
 * File format:
 *   ---
 *   memoryId: ...
 *   ...yaml fields...
 *   ---
 *   ## Summary
 *   ...
 *   ## Details
 *   ...
 *   ## Evidence
 *   ...
 *   ## Actionable Use
 *   ...
 */

import type {
  MemoryFile,
  MemoryFrontmatter,
  MemoryContent,
  MemoryId,
  MemoryCategory,
  MemoryScope,
  MemorySensitivity,
  UpdateStrategy,
} from './types';
import {
  validateMemoryFrontmatter,
  validateMemoryContent,
  validateMemoryFile,
  generateMemoryId,
} from './schema';
import { getDefaultStrategy } from './policies';

// ─── YAML Frontmatter Parsing ─────────────────────────────────────────

/**
 * Simple YAML parser for memory frontmatter
 * (Minimal implementation to avoid external dependency)
 */
function parseYaml(yamlText: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yamlText.trim().split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) {
      // Handle arrays and nested structures
      if (line.startsWith('  - ')) {
        // Array item
        continue;
      }
      if (line.includes(':')) {
        // Try to parse as JSON value for complex types
        const keyMatch = line.match(/^(\w+):\s*/);
        if (keyMatch) {
          const key = keyMatch[1];
          const value = line.substring(keyMatch[0].length).trim();
          // Try to parse as JSON
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      }
      continue;
    }

    const [, key, value] = match;

    // Parse different types
    if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else if (!isNaN(Number(value))) {
      result[key] = Number(value);
    } else if (value.startsWith('[') && value.endsWith(']')) {
      // Array
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else if (value.startsWith('{') && value.endsWith('}')) {
      // Object
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else {
      // Remove quotes if present
      result[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return result;
}

/**
 * Serialize frontmatter object to YAML string
 */
function stringifyYaml(frontmatter: MemoryFrontmatter): string {
  const lines: string[] = [];

  lines.push(`memoryId: "${frontmatter.memoryId}"`);
  lines.push(`type: ${frontmatter.type}`);
  lines.push(`scope: ${frontmatter.scope}`);
  lines.push(`sensitivity: ${frontmatter.sensitivity}`);
  lines.push(`owner: "${frontmatter.owner}"`);
  lines.push(`sourceRefs: ${JSON.stringify(frontmatter.sourceRefs)}`);
  lines.push(`updateStrategy: ${frontmatter.updateStrategy}`);
  lines.push(`createdAt: "${frontmatter.createdAt}"`);
  lines.push(`updatedAt: "${frontmatter.updatedAt}"`);
  lines.push(`version: ${frontmatter.version}`);
  lines.push(`tags: ${JSON.stringify(frontmatter.tags)}`);

  return lines.join('\n');
}

// ─── Markdown Content Parsing ──────────────────────────────────────────

/**
 * Extract section content by heading
 * Returns the text between this heading and the next heading (or EOF)
 */
function extractSection(markdown: string, sectionName: string): string {
  const sectionRegex = new RegExp(
    `## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
    'i'
  );
  const match = markdown.match(sectionRegex);
  return match ? match[1].trim() : '';
}

/**
 * Parse memory markdown content (after frontmatter)
 */
function parseMemoryContent(markdown: string): MemoryContent {
  return {
    summary: extractSection(markdown, 'Summary'),
    details: extractSection(markdown, 'Details'),
    evidence: extractEvidenceList(extractSection(markdown, 'Evidence')),
    actionableUse: extractSection(markdown, 'Actionable Use'),
  };
}

/**
 * Extract list of evidence items (simple - and * bullet points)
 */
function extractEvidenceList(text: string): string[] {
  if (!text) return [];
  return text
    .split(/[\n\r]+/)
    .filter((line) => line.match(/^[\s]*[-*]\s+/))
    .map((line) => line.replace(/^[\s]*[-*]\s+/, '').trim())
    .filter((item) => item.length > 0);
}

/**
 * Serialize memory content to markdown sections
 */
function stringifyMemoryContent(content: MemoryContent): string {
  const sections: string[] = [];

  sections.push('## Summary');
  sections.push(content.summary);
  sections.push('');

  if (content.details) {
    sections.push('## Details');
    sections.push(content.details);
    sections.push('');
  }

  if (content.evidence.length > 0) {
    sections.push('## Evidence');
    for (const item of content.evidence) {
      sections.push(`- ${item}`);
    }
    sections.push('');
  }

  if (content.actionableUse) {
    sections.push('## Actionable Use');
    sections.push(content.actionableUse);
    sections.push('');
  }

  return sections.join('\n');
}

// ─── Complete File Serialization ──────────────────────────────────────

/**
 * Parse a complete memory file (frontmatter + markdown content)
 * @param fileContent Raw file text with frontmatter and markdown
 * @throws If frontmatter or content validation fails
 */
export function parseMemoryFile(fileContent: string): MemoryFile {
  // Split frontmatter and content
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Memory file must have YAML frontmatter wrapped in --- delimiters');
  }

  const [, frontmatterText, contentText] = match;

  // Parse and validate frontmatter
  const frontmatterData = parseYaml(frontmatterText);
  const frontmatter = validateMemoryFrontmatter(frontmatterData);

  // Parse and validate content
  const content = validateMemoryContent(parseMemoryContent(contentText));

  return { frontmatter, content };
}

/**
 * Serialize a complete memory file (frontmatter + markdown content)
 */
export function stringifyMemoryFile(file: MemoryFile): string {
  const frontmatterYaml = stringifyYaml(file.frontmatter);
  const contentMarkdown = stringifyMemoryContent(file.content);

  return `---\n${frontmatterYaml}\n---\n\n${contentMarkdown}\n`;
}

// ─── File Naming & Paths ──────────────────────────────────────────────

/**
 * Convert memory file to canonical filename
 * Used for L2 detail files
 * Format: {title-slugified}.md or {memory-id}.md
 */
export function getMemoryFileName(frontmatter: MemoryFrontmatter): string {
  // Use memory ID as stable filename to avoid conflicts
  return `${frontmatter.memoryId}.md`;
}

/**
 * Get the filename for L0 (abstract) summary
 */
export function getL0FileName(): string {
  return '.abstract.md';
}

/**
 * Get the filename for L1 (overview) summary
 */
export function getL1FileName(): string {
  return '.overview.md';
}

/**
 * Build the full path for a memory file in the directory tree
 * @param dirPath Directory path (e.g., "entities", "identity/preferences")
 * @param fileName File name
 */
export function buildMemoryPath(dirPath: string, fileName: string): string {
  return dirPath ? `${dirPath}/${fileName}` : fileName;
}

// ─── Helper: Create New Memory File ────────────────────────────────────

/**
 * Create a new memory file with generated ID and timestamps
 */
export function createMemoryFile(
  type: MemoryCategory,
  scope: MemoryScope,
  sensitivity: MemorySensitivity,
  owner: string,
  content: {
    summary: string;
    details?: string;
    evidence?: string[];
    actionableUse?: string;
  },
  options?: {
    tags?: string[];
    sourceRefs?: string[];
    updateStrategy?: UpdateStrategy;
  }
): MemoryFile {
  const now = new Date().toISOString();

  const file: MemoryFile = {
    frontmatter: {
      memoryId: generateMemoryId(),
      type,
      scope,
      sensitivity,
      owner,
      sourceRefs: options?.sourceRefs || [],
      updateStrategy: options?.updateStrategy || getDefaultStrategy(type),
      createdAt: now,
      updatedAt: now,
      version: 1,
      tags: options?.tags || [],
    },
    content: {
      summary: content.summary,
      details: content.details || '',
      evidence: content.evidence || [],
      actionableUse: content.actionableUse || '',
    },
  };

  return validateMemoryFile(file);
}

// ─── Validation & Safe Operations ─────────────────────────────────────

/**
 * Safely try to parse a memory file
 * Returns null instead of throwing on validation error
 */
export function tryParseMemoryFile(fileContent: string): MemoryFile | null {
  try {
    return parseMemoryFile(fileContent);
  } catch {
    return null;
  }
}

/**
 * Validate that a memory file can be written with a given update strategy
 * @param existing Existing memory file (if any)
 * @param updated The updated memory file
 * @param strategy The update strategy to apply
 */
export function validateUpdate(
  existing: MemoryFile | null,
  updated: MemoryFile,
  strategy: UpdateStrategy
): { valid: boolean; error?: string } {
  if (!existing) {
    return { valid: true };
  }

  switch (strategy) {
    case 'immutable':
      return {
        valid: false,
        error: 'Cannot update immutable memory file',
      };

    case 'append':
      // Only allow appending, not replacing content
      if (
        updated.content.details !== existing.content.details ||
        updated.content.summary !== existing.content.summary ||
        updated.content.actionableUse !== existing.content.actionableUse
      ) {
        return {
          valid: false,
          error:
            'Append strategy only allows adding evidence, not modifying other fields',
        };
      }
      return { valid: true };

    case 'merge':
      // Full merge allowed
      return { valid: true };
  }
}
