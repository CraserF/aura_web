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
function extractExcerpt(html: string, maxSlides: number = 3): string {
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

export function buildTemplateExamplesSection(
  templateId: TemplateId,
  exemplarPackId: ExemplarPackId,
  existingExamples?: string,
): string {
  const templateHtml = getTemplateHtml(templateId);
  const excerpt = extractExcerpt(templateHtml);
  const exemplarPack = getExemplarPack(exemplarPackId);

  const blueprintBlock = existingExamples
    ? `\n\n### Style Blueprint Examples:\n\`\`\`html\n${existingExamples}\n\`\`\``
    : '';

  if (!excerpt && !existingExamples && !exemplarPack.htmlExcerpt) return '';

  return `## REFERENCE SLIDES — This Is What Great Looks Like

Study these examples carefully and match this level of visual quality.
Adapt the layouts, spacing, and component patterns to the user's content.
Do NOT copy them verbatim — use them as quality benchmarks.
  Treat all nouns, organization names, domain terms, metrics, and footer labels in examples as placeholders only.
  You MUST rewrite every content string to match the user's requested context.
  Never copy example brand names, taglines, or company references into output.

### Exemplar Pack (${exemplarPack.name})
Visual thesis: ${exemplarPack.visualThesis}

Composition rules:
${exemplarPack.compositionRules.map((rule) => `- ${rule}`).join('\n')}

Component rules:
${exemplarPack.componentRules.map((rule) => `- ${rule}`).join('\n')}

Motion rules:
${exemplarPack.motionRules.map((rule) => `- ${rule}`).join('\n')}

Representative excerpt:

\`\`\`html
${exemplarPack.htmlExcerpt}
\`\`\`

### Template Reference (${templateId}):
\`\`\`html
${excerpt}
\`\`\`${blueprintBlock}`;
}