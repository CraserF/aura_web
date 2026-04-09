/**
 * Template examples section — injects rich HTML template as reference.
 * Uses the actual template files from the registry instead of generic examples.
 */
import type { ExemplarPackId, TemplateId } from '../../templates';
import { getExemplarPack, getTemplateHtml } from '../../templates';

/**
 * Extract a representative subset of slides from a template HTML to keep
 * the prompt within reasonable token limits (~3 slides).
 */
function extractExcerpt(html: string, maxSlides: number = 2): string {
  const sectionRegex = /<section[\s\S]*?<\/section>/gi;
  const sections: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(html)) !== null) {
    sections.push(match[0]);
  }

  if (sections.length === 0) return '';

  const picks: string[] = [];
  const first = sections[0];
  if (first) picks.push(first);

  if (sections.length > 2) {
    const mid = Math.floor(sections.length / 2);
    const midSection = sections[mid];
    if (midSection) picks.push(midSection);
  }

  if (sections.length > 4) {
    const late = Math.floor(sections.length * 0.75);
    const lateSection = sections[late];
    if (lateSection && !picks.includes(lateSection)) {
      picks.push(lateSection);
    }
  }

  return picks.slice(0, maxSlides).join('\n\n');
}

const EXAMPLE_SANITIZERS: Array<[RegExp, string]> = [
  [/\bWaterBorne\s+Capital\b/gi, 'Example Company'],
  [/\bWaterbourne\s+Capital\b/gi, 'Example Company'],
  [/\bThe Future of WaterBorne\b/gi, 'Strategic Future'],
  [/\bKahoot Quiz Time\b/gi, 'Interactive Quiz Time'],
  [/\bKahoot\b/gi, 'Interactive Quiz'],
  [/Presented by\s+[^<\n]+/gi, 'Presented by [Your Team]'],
  [/\bWater and Data Centre Opportunities in Africa\b/gi, 'Strategic Opportunity Landscape'],
];

function sanitizeExampleHtml(html: string): string {
  return EXAMPLE_SANITIZERS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    html,
  );
}

export async function buildTemplateExamplesSection(
  templateId: TemplateId,
  exemplarPackId: ExemplarPackId,
  existingExamples?: string,
): Promise<string> {
  let templateHtml = '';
  try {
    templateHtml = await getTemplateHtml(templateId);
  } catch {
    templateHtml = '';
  }

  const excerpt = sanitizeExampleHtml(extractExcerpt(templateHtml));
  const exemplarPack = getExemplarPack(exemplarPackId);
  const sanitizedExemplarExcerpt = sanitizeExampleHtml(exemplarPack.htmlExcerpt);
  const sanitizedExamples = existingExamples ? sanitizeExampleHtml(existingExamples) : '';

  const blueprintBlock = !excerpt && sanitizedExamples
    ? `\n\n### Backup Example:\n\`\`\`html\n${sanitizedExamples}\n\`\`\``
    : '';

  if (!excerpt && !sanitizedExamples && !sanitizedExemplarExcerpt) return '';

  return `## TARGET REFERENCE — Match the Design Quality, Not the Wording

Use this as the visual truth source for spacing, hierarchy, and component rhythm.
Treat all example nouns, numbers, and labels as placeholders only.
Never copy example brands, taglines, or presenter names.

### Recipe: ${exemplarPack.name}
- Visual thesis: ${exemplarPack.visualThesis}
- Composition: ${exemplarPack.compositionRules.slice(0, 3).join(' ')}
- Components: ${exemplarPack.componentRules.slice(0, 3).join(' ')}
- Motion: ${exemplarPack.motionRules.slice(0, 2).join(' ')}

### Primary Excerpt
\`\`\`html
${sanitizedExemplarExcerpt}
\`\`\`

### Target Structure (${templateId})
\`\`\`html
${excerpt}
\`\`\`${blueprintBlock}`;
}