import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { AuraManifest, PresentationData, ChatMessage } from '@/types';
import { countSlides } from '@/services/ai/utils/extractHtml';
import { sanitizeFilename } from '@/lib/sanitizeFilename';

const FORMAT_VERSION = '1.0';

/** Pack presentation data into a .aura zip file and trigger download */
export async function downloadAuraFile(data: PresentationData): Promise<void> {
  const zip = new JSZip();
  const slideCount = countSlides(data.slidesHtml);

  const manifest: AuraManifest = {
    version: FORMAT_VERSION,
    title: data.title,
    slideCount,
    createdAt: data.createdAt,
    updatedAt: Date.now(),
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('slides.html', data.slidesHtml);
  zip.file('theme.css', data.themeCss);
  zip.file(
    'chat-history.json',
    JSON.stringify(data.chatHistory, null, 2),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `${sanitizeFilename(data.title)}.aura`;
  saveAs(blob, filename);
}

/** Read and unpack a .aura zip file */
export async function openAuraFile(file: File): Promise<PresentationData> {
  const zip = await JSZip.loadAsync(file);

  const manifestJson = await zip.file('manifest.json')?.async('string');
  if (!manifestJson) throw new Error('Invalid .aura file: missing manifest.json');

  const manifest = JSON.parse(manifestJson) as AuraManifest;

  const slidesHtml =
    (await zip.file('slides.html')?.async('string')) ?? '';
  const themeCss =
    (await zip.file('theme.css')?.async('string')) ?? '';
  const chatHistoryJson =
    (await zip.file('chat-history.json')?.async('string')) ?? '[]';

  const chatHistory = JSON.parse(chatHistoryJson) as ChatMessage[];

  return {
    title: manifest.title,
    slidesHtml,
    themeCss,
    chatHistory,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
  };
}

