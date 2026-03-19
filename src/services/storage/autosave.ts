import { get, set, del } from 'idb-keyval';
import type { PresentationData, ChatMessage } from '@/types';

const AUTOSAVE_KEY = 'aura-autosave';
const DEBOUNCE_MS = 2000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface AutosaveData {
  presentation: PresentationData;
  savedAt: number;
}

/** Save presentation state to IndexedDB (debounced) */
export function autosave(data: PresentationData): void {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    const autosaveData: AutosaveData = {
      presentation: { ...data, updatedAt: Date.now() },
      savedAt: Date.now(),
    };
    await set(AUTOSAVE_KEY, autosaveData);
  }, DEBOUNCE_MS);
}

/** Force an immediate save (bypasses debounce) */
export async function saveNow(data: PresentationData): Promise<void> {
  if (debounceTimer) clearTimeout(debounceTimer);

  const autosaveData: AutosaveData = {
    presentation: { ...data, updatedAt: Date.now() },
    savedAt: Date.now(),
  };
  await set(AUTOSAVE_KEY, autosaveData);
}

/** Check if there's an auto-saved session to restore */
export async function getAutosave(): Promise<AutosaveData | null> {
  const data = await get<AutosaveData>(AUTOSAVE_KEY);
  return data ?? null;
}

/** Clear the auto-save */
export async function clearAutosave(): Promise<void> {
  if (debounceTimer) clearTimeout(debounceTimer);
  await del(AUTOSAVE_KEY);
}

/** Build PresentationData from current app state */
export function buildPresentationData(
  title: string,
  slidesHtml: string,
  themeCss: string,
  chatHistory: ChatMessage[],
  createdAt?: number,
): PresentationData {
  return {
    title,
    slidesHtml,
    themeCss,
    chatHistory,
    createdAt: createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
}
