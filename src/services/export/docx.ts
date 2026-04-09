import { saveAs } from 'file-saver';
import { sanitizeFilename } from '@/lib/sanitizeFilename';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

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

function htmlToMarkdownFallback(html: string): string {
  if (!html.trim()) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const lines: string[] = [];

  doc.body.querySelectorAll('h1, h2, h3, p, li, blockquote, pre').forEach((el) => {
    const text = el.textContent?.replace(/\s+/g, ' ').trim();
    if (!text) return;

    switch (el.tagName.toLowerCase()) {
      case 'h1':
        lines.push(`# ${text}`);
        break;
      case 'h2':
        lines.push(`## ${text}`);
        break;
      case 'h3':
        lines.push(`### ${text}`);
        break;
      case 'li':
        lines.push(`- ${text}`);
        break;
      case 'blockquote':
        lines.push(`> ${text}`);
        break;
      case 'pre':
        lines.push('```');
        lines.push(text);
        lines.push('```');
        break;
      default:
        lines.push(text);
        break;
    }
  });

  return lines.join('\n').trim();
}

function parseInlineRuns(text: string, base?: InlineRunStyle): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);

  return parts.map((part) => {
    const boldMatch = part.match(/^\*\*([\s\S]+)\*\*$/);
    if (boldMatch) {
      return new TextRun({ text: boldMatch[1], bold: true, ...base });
    }

    const italicMatch = part.match(/^\*([^*]+)\*$/);
    if (italicMatch) {
      return new TextRun({ text: italicMatch[1], italics: true, ...base });
    }

    const codeMatch = part.match(/^`([^`]+)`$/);
    if (codeMatch) {
      return new TextRun({ text: codeMatch[1], font: 'Courier New', ...base });
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return new TextRun({
        text: `${linkMatch[1]} (${linkMatch[2]})`,
        color: '2457A6',
        underline: { type: 'single' },
        ...base,
      });
    }

    return new TextRun({ text: part, ...base });
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
        children: [new TextRun({ text: title, bold: true, size: 34, color: '162235' })],
      }),
    );
  }

  return paragraphs;
}

export async function exportDocumentDocx(job: DocumentDocxJob): Promise<void> {
  const markdown = job.markdown?.trim() || htmlToMarkdownFallback(job.html ?? '') || `# ${job.title}`;
  const paragraphs = markdownToParagraphs(markdown, job.title);

  const doc = new Document({
    creator: 'Aura',
    title: job.title,
    description: 'Exported from Aura',
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
                  new TextRun({ text: 'Generated with Aura', color: '7A869A', size: 18 }),
                ],
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${sanitizeFilename(job.title)}.docx`);
}
