import { Directory, File, Paths } from 'expo-file-system';
import { initWhisper, WhisperContext } from 'whisper.rn';
import type { Lang } from './content';

// Multilingual "small" model (~465 MB). Downloaded once from Hugging Face (free, no account),
// then everything runs offline on the phone.
export const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin';
export const MODEL_SIZE_MB = 465;
const MIN_VALID_BYTES = 400 * 1024 * 1024;

const dir = new Directory(Paths.document, 'whisper');
const modelFile = new File(dir, 'ggml-small.bin');
const partialFile = new File(dir, 'ggml-small.bin.part');

let context: WhisperContext | null = null;
let loading: Promise<WhisperContext> | null = null;

export function isModelDownloaded(): boolean {
  return modelFile.exists && (modelFile.size ?? 0) > MIN_VALID_BYTES;
}

export async function downloadModel(onProgress: (fraction: number) => void): Promise<void> {
  if (!dir.exists) dir.create({ intermediates: true });
  if (partialFile.exists) partialFile.delete();
  const task = File.createDownloadTask(MODEL_URL, partialFile, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      const total = totalBytes > 0 ? totalBytes : MODEL_SIZE_MB * 1024 * 1024;
      onProgress(Math.min(1, bytesWritten / total));
    },
  });
  const result = await task.downloadAsync();
  if (!result || !partialFile.exists || (partialFile.size ?? 0) < MIN_VALID_BYTES) {
    if (partialFile.exists) partialFile.delete();
    throw new Error('Download did not finish. Check your connection and try again.');
  }
  if (modelFile.exists) modelFile.delete();
  await partialFile.move(modelFile);
}

export async function deleteModel(): Promise<void> {
  await releaseWhisper();
  if (modelFile.exists) modelFile.delete();
  if (partialFile.exists) partialFile.delete();
}

async function getContext(): Promise<WhisperContext> {
  if (context) return context;
  if (!loading) {
    loading = initWhisper({ filePath: modelFile.uri, useGpu: true })
      .then((ctx) => (context = ctx))
      .finally(() => (loading = null));
  }
  return loading;
}

/** Load the model ahead of time so the first transcription is not slow. */
export function warmUpWhisper() {
  if (isModelDownloaded()) getContext().catch(() => {});
}

export async function releaseWhisper() {
  if (context) await context.release();
  context = null;
}

// A short hint in the target language nudges Whisper toward the right script and spelling.
const PROMPTS: Record<Lang, string> = {
  es: 'Hola, ¿cómo estás?',
  fr: 'Bonjour, comment ça va ?',
  zh: '以下是普通话的句子。',
};

export async function transcribe(wavUri: string, lang: Lang): Promise<string> {
  const ctx = await getContext();
  const { promise } = ctx.transcribe(wavUri, {
    language: lang,
    prompt: PROMPTS[lang],
    maxThreads: 4,
    temperature: 0,
  });
  const { result } = await promise;
  const text = result.trim();
  // On silence Whisper sometimes just repeats the hint back; treat that as "heard nothing".
  return text === PROMPTS[lang] ? '' : text;
}
