import { saveAs } from 'file-saver';
import { sanitizeFilename } from '@/lib/sanitizeFilename';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { extractChartSpecsFromHtml } from '@/services/charts';
import { prerenderChartToDataUrl } from '@/services/charts';

export interface DocumentDocxJob {
  title: string;
  markdown?: string;
  html?: string;
}

interface InlineRunStyle {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
  font?: string;
}

const DOCX_FONT_FAMILY = 'Aptos';
const DOCX_LINK_COLOR = '1F4B99';

function htmlToMarkdownFallback(html: string): string {
  if (!html.trim()) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const lines: string[] = [];

  const cleanText = (value?: string | null): string => value?.replace(/\s+/g, ' ').trim() ?? '';
  const pushLine = (value?: string | null) => {
    const text = cleanText(value);
    if (text) lines.push(text);
  };

  const summarizeCard = (el: Element): string => {
    const label = cleanText(el.querySelector('.doc-kpi-label, strong, h3, h4')?.textContent);
    const value = cleanText(el.querySelector('.doc-kpi-value')?.textContent);
    const fullText = cleanText(el.textContent);

    if (value && label) return `- **${label}**: ${value}`;
    if (label && fullText && fullText !== label) return `- **${label}**: ${fullText.replace(label, '').trim()}`;
    if (fullText) return `- ${fullText}`;
    return '';
  };

  const visit = (el: Element) => {
    if (el.matches('.doc-kpi, .doc-compare-card, .doc-timeline-item, .doc-meta-grid > div, .doc-story-card, .doc-aside')) {
      pushLine(summarizeCard(el));
      return;
    }

    if (el.matches('.doc-progress-step')) {
      pushLine(`1. ${cleanText(el.textContent)}`);
      return;
    }

    if (el.matches('.doc-proof-strip, .doc-infographic-band, .doc-callout, blockquote')) {
      pushLine(`> ${cleanText(el.textContent)}`);
      return;
    }

    switch (el.tagName.toLowerCase()) {
      case 'h1':
        pushLine(`# ${cleanText(el.textContent)}`);
        return;
      case 'h2':
        pushLine(`## ${cleanText(el.textContent)}`);
        return;
      case 'h3':
        pushLine(`### ${cleanText(el.textContent)}`);
        return;
      case 'p':
        pushLine(cleanText(el.textContent));
        return;
      case 'li':
        pushLine(`- ${cleanText(el.textContent)}`);
        return;
      case 'pre':
        pushLine('```');
        pushLine(el.textContent);
        pushLine('```');
        return;
      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr')).map((row) => Array.from(row.querySelectorAll('th, td')).map((cell) => cleanText(cell.textContent)).filter(Boolean));
        const headerRow = rows[0] ?? [];
        if (headerRow.length > 0) {
          pushLine(`| ${headerRow.join(' | ')} |`);
          pushLine(`| ${headerRow.map(() => '---').join(' | ')} |`);
          rows.slice(1).forEach((row) => pushLine(`| ${row.join(' | ')} |`));
        }
        return;
      }
      default:
        Array.from(el.children).forEach(visit);
    }
  };

  Array.from(doc.body.children).forEach(visit);
  return lines.join('\n').trim();
}

function parseInlineRuns(text: string, base?: InlineRunStyle): TextRun[] {
  const parts = text.split(/(\*\*[\s\S]+?\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  const resolvedBase: InlineRunStyle = {
    font: DOCX_FONT_FAMILY,
    color: '243447',
    ...base,
  };

  return parts.map((part) => {
    const boldMatch = part.match(/^\*\*([\s\S]+)\*\*$/);
    if (boldMatch) {
      return new TextRun({ text: boldMatch[1], bold: true, ...resolvedBase });
    }

    const italicMatch = part.match(/^\*([^*]+)\*$/);
    if (italicMatch) {
      return new TextRun({ text: italicMatch[1], italics: true, ...resolvedBase });
    }

    const codeMatch = part.match(/^`([^`]+)`$/);
    if (codeMatch) {
      return new TextRun({ text: codeMatch[1], font: 'Courier New', ...resolvedBase });
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return new TextRun({
        text: `${linkMatch[1]} (${linkMatch[2]})`,
        color: DOCX_LINK_COLOR,
        underline: { type: 'single' },
        ...resolvedBase,
      });
    }

    return new TextRun({ text: part, ...resolvedBase });
  });
}

function markdownToParagraphs(markdown: string, title: string): Paragraph[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const paragraphs: Paragraph[] = [];
  let buffer: string[] = [];

  const flushParagraph = () => {
    if (buffer.length === 0) return;
    const text = buffer.join(' ').trim();
    if (!text) {
      buffer = [];
      return;
    }

    paragraphs.push(
      new Paragraph({
        children: parseInlineRuns(text, { size: 24, color: '243447' }),
        spacing: { after: 180, line: 360 },
      }),
    );
    buffer = [];
  };

  const pushHeading = (text: string, level: 1 | 2 | 3) => {
    const size = level === 1 ? 34 : level === 2 ? 28 : 24;
    const color = level === 1 ? '162235' : level === 2 ? '1F4B99' : '243447';

    paragraphs.push(
      new Paragraph({
        children: parseInlineRuns(text, { bold: true, size, color }),
        spacing: { before: level === 1 ? 0 : 240, after: 120 },
      }),
    );
  };

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i] ?? '';
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const hashes = headingMatch[1] ?? '#';
      const headingText = headingMatch[2] ?? title;
      const headingLevel = Math.min(3, hashes.length) as 1 | 2 | 3;
      pushHeading(headingText.trim(), headingLevel);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      const quoteLines = [line.replace(/^>\s?/, '')];
      while (i + 1 < lines.length && /^>\s?/.test((lines[i + 1] ?? '').trim())) {
        i += 1;
        quoteLines.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
      }

      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(quoteLines.join(' '), { italics: true, color: '5D6D82', size: 23 }),
          spacing: { before: 120, after: 180, line: 360 },
          indent: { left: 320 },
          border: {
            left: { color: '8BB5FF', size: 18, space: 8, style: BorderStyle.SINGLE },
          },
        }),
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(line.replace(/^\s*[-*]\s+/, ''), { size: 24, color: '243447' }),
          numbering: { reference: 'aura-bullets', level: 0 },
          spacing: { after: 80, line: 320 },
        }),
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph();
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(line.replace(/^\s*\d+\.\s+/, ''), { size: 24, color: '243447' }),
          numbering: { reference: 'aura-numbered', level: 0 },
          spacing: { after: 80, line: 320 },
        }),
      );
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      flushParagraph();
      paragraphs.push(
        new Paragraph({
          border: {
            bottom: { color: 'D8E1EC', size: 10, space: 1, style: BorderStyle.SINGLE },
          },
          spacing: { before: 120, after: 120 },
        }),
      );
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) {
      flushParagraph();
      const headerCells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
      i += 2;
      while (i < lines.length && (lines[i] ?? '').includes('|')) {
        const cells = (lines[i] ?? '').split('|').map((cell) => cell.trim()).filter(Boolean);
        const rowText = cells.map((cell, index) => `${headerCells[index] ?? `Col ${index + 1}`}: ${cell}`).join(' • ');
        paragraphs.push(
          new Paragraph({
            children: parseInlineRuns(rowText, { size: 23, color: '243447' }),
            spacing: { after: 80, line: 320 },
          }),
        );
        i += 1;
      }
      i -= 1;
      continue;
    }

    if (/^```/.test(line)) {
      flushParagraph();
      const codeLines: string[] = [];
      while (i + 1 < lines.length) {
        i += 1;
        const codeLine = lines[i] ?? '';
        if (/^```/.test(codeLine.trim())) break;
        codeLines.push(codeLine);
      }

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeLines.join('\n'),
              font: 'Courier New',
              size: 21,
              color: '0F172A',
            }),
          ],
          spacing: { before: 120, after: 180 },
          border: {
            left: { color: 'D8E1EC', size: 12, space: 6, style: BorderStyle.SINGLE },
          },
          indent: { left: 220 },
        }),
      );
      continue;
    }

    buffer.push(line);
  }

  flushParagraph();

  if (paragraphs.length === 0) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 34, color: '162235', font: DOCX_FONT_FAMILY })],
      }),
    );
  }

  return paragraphs;
}

/**
 * Build Paragraph objects for each chart found in the HTML.
 * Charts are rendered to PNG via Chart.js and embedded as ImageRun elements.
 * Returns an empty array if there are no charts or rendering fails.
 */
async function buildChartParagraphs(html: string): Promise<Paragraph[]> {
  const specs = extractChartSpecsFromHtml(html);
  const specEntries = Object.values(specs);
  if (specEntries.length === 0) return [];

  const paragraphs: Paragraph[] = [];

  for (const spec of specEntries) {
    const result = prerenderChartToDataUrl(spec);
    if (!result) continue;

    // Strip the data URL prefix to get raw base64
    const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, '');

    if (spec.title) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: spec.title, bold: true, size: 24, font: DOCX_FONT_FAMILY, color: '162235' })],
          spacing: { before: 240, after: 80 },
        }),
      );
    }

    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: 'png',
            data: base64,
            transformation: { width: 480, height: 240 },
            altText: { title: spec.title ?? 'Chart', description: spec.title ?? 'Chart', name: spec.id },
          }),
        ],
        spacing: { before: 80, after: 200 },
      }),
    );

    if (spec.illustrative) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: 'Illustrative data', italics: true, size: 18, color: '6B7280', font: DOCX_FONT_FAMILY })],
          spacing: { after: 160 },
        }),
      );
    }
  }

  return paragraphs;
}

export async function exportDocumentDocx(job: DocumentDocxJob): Promise<void> {
  const markdown = job.markdown?.trim() || htmlToMarkdownFallback(job.html ?? '') || `# ${job.title}`;
  const paragraphs = markdownToParagraphs(markdown, job.title);

  // Append chart images if HTML was provided (charts are not representable in markdown).
  const chartParagraphs = job.html ? await buildChartParagraphs(job.html) : [];
  const allParagraphs = [...paragraphs, ...chartParagraphs];

  const doc = new Document({
    creator: 'Aura',
    title: job.title,
    description: 'Exported from Aura',
    styles: {
      default: {
        document: {
          run: {
            font: DOCX_FONT_FAMILY,
            color: '243447',
            size: 24,
          },
          paragraph: {
            spacing: {
              after: 180,
              line: 360,
            },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'aura-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 260 } } },
            },
          ],
        },
        {
          reference: 'aura-numbered',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080,
              right: 1080,
              bottom: 1080,
              left: 1080,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Generated with Aura', color: '7A869A', size: 18, font: DOCX_FONT_FAMILY }),
                ],
              }),
            ],
          }),
        },
        children: allParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${sanitizeFilename(job.title)}.docx`);
}
