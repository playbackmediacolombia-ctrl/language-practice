import { chosenModel, type ModelKey, setChosenModel } from './whisper';
import { getProgress, type Progress, replaceProgress } from './progress';

// Backup and restore: all progress (lessons, XP, streak, review days, writing, stories, stats
// and settings) in one JSON file that stays wherever you save it. Nothing is uploaded.

const APP = 'learnguage';
const VERSION = 1;

type Backup = { app: typeof APP; version: number; exported: string; progress: Progress; speechModel: ModelKey };

export function backupFileName(d = new Date()) {
  return `learnguage-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
}

export function makeBackup(): Blob {
  const data: Backup = { app: APP, version: VERSION, exported: new Date().toISOString(), progress: getProgress(), speechModel: chosenModel() };
  return new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
}

/**
 * Saves the backup file. On iPhone the share sheet offers "Save to Files", AirDrop, Mail…;
 * elsewhere it downloads. Resolves false if the share sheet was closed without saving.
 */
export async function saveBackup(): Promise<boolean> {
  const file = new File([makeBackup()], backupFileName(), { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Learnguage backup' });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
      // Sharing failed for another reason: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export type BackupSummary = { exported: Date; xp: number; lessons: number; words: number; streakDays: number };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function summarize(p: Partial<Progress>, exported: Date): BackupSummary {
  return {
    exported,
    xp: p.xp ?? 0,
    lessons: Object.values(p.lessons ?? {}).filter((n) => n > 0).length,
    words: Object.keys(p.srs ?? p.items ?? {}).length,
    streakDays: Object.keys(p.days ?? {}).length,
  };
}

export const currentSummary = () => summarize(getProgress(), new Date());

/** Reads and checks a backup file. Throws an Error with a plain-language message if it isn't one. */
export async function readBackup(file: File): Promise<{ summary: BackupSummary; restore: () => void }> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't a Learnguage backup (it can't be read).");
  }
  if (!isObject(data) || data.app !== APP || !isObject(data.progress)) throw new Error("That file isn't a Learnguage backup.");
  if (typeof data.version !== 'number' || data.version > VERSION) throw new Error('This backup is from a newer version of the app. Update the app, then try again.');
  const p = data.progress as Partial<Progress>;
  const shapes: [keyof Progress, string][] = [
    ['xp', 'number'],
    ['days', 'object'],
    ['lessons', 'object'],
    ['items', 'object'],
    ['cards', 'object'],
  ];
  for (const [key, type] of shapes) if (p[key] !== undefined && typeof p[key] !== type) throw new Error('This backup looks damaged, so nothing was changed.');
  const exported = new Date(typeof data.exported === 'string' ? data.exported : Date.now());
  return {
    summary: summarize(p, exported),
    restore: () => {
      replaceProgress(p);
      if (data.speechModel === 'base' || data.speechModel === 'small') setChosenModel(data.speechModel);
    },
  };
}
