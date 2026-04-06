import { get, set, del } from 'idb-keyval';
import type { ProjectData } from '@/types/project';

const AUTOSAVE_KEY = 'aura-project-autosave';
const DEBOUNCE_MS = 2000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface ProjectAutosaveData {
  project: ProjectData;
  savedAt: number;
}

/** Save project state to IndexedDB (debounced) */
export function autosaveProject(project: ProjectData): void {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    const autosaveData: ProjectAutosaveData = {
      project: { ...project, updatedAt: Date.now() },
      savedAt: Date.now(),
    };
    await set(AUTOSAVE_KEY, autosaveData);
  }, DEBOUNCE_MS);
}

/** Force an immediate save (bypasses debounce) */
export async function saveProjectNow(project: ProjectData): Promise<void> {
  if (debounceTimer) clearTimeout(debounceTimer);

  const autosaveData: ProjectAutosaveData = {
    project: { ...project, updatedAt: Date.now() },
    savedAt: Date.now(),
  };
  await set(AUTOSAVE_KEY, autosaveData);
}

/** Check if there's an auto-saved project to restore */
export async function getProjectAutosave(): Promise<ProjectAutosaveData | null> {
  const data = await get<ProjectAutosaveData>(AUTOSAVE_KEY);
  return data ?? null;
}

/** Clear the auto-save */
export async function clearProjectAutosave(): Promise<void> {
  if (debounceTimer) clearTimeout(debounceTimer);
  await del(AUTOSAVE_KEY);
}
