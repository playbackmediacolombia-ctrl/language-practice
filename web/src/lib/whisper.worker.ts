/// <reference lib="webworker" />
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

// Runs Whisper off the main thread so the page stays responsive while it thinks.

export type WorkerRequest =
  | { type: 'load'; model: string; base: string }
  | { type: 'transcribe'; id: number; audio: Float32Array; language: string };

export type WorkerResponse =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id?: number; message: string };

const post = (msg: WorkerResponse) => self.postMessage(msg);

let asr: AutomaticSpeechRecognitionPipeline | null = null;
let loading: Promise<void> | null = null;
let loadedModel = '';

async function load(model: string, base: string) {
  if (asr && loadedModel === model) return;
  // Use our own copy of the ONNX runtime instead of the default CDN.
  env.backends.onnx.wasm!.wasmPaths = {
    mjs: new URL('ort/ort-wasm-simd-threaded.mjs', base).href,
    wasm: new URL('ort/ort-wasm-simd-threaded.wasm', base).href,
  };
  if (asr) await asr.dispose();
  asr = null;

  const files = new Map<string, { loaded: number; total: number }>();
  asr = await pipeline('automatic-speech-recognition', model, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p) => {
      if (p.status !== 'progress') return;
      files.set(p.file, { loaded: p.loaded, total: p.total });
      let loaded = 0;
      let total = 0;
      files.forEach((f) => {
        loaded += f.loaded;
        total += f.total;
      });
      post({ type: 'progress', loaded, total });
    },
  });
  loadedModel = model;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === 'load') {
    try {
      loading = load(msg.model, msg.base);
      await loading;
      post({ type: 'ready' });
    } catch (err) {
      post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  try {
    await loading;
    if (!asr) throw new Error('Speech model is not loaded yet.');
    const out = await asr(msg.audio, {
      language: msg.language,
      task: 'transcribe',
      // Our phrases are short; this stops Whisper's occasional runaway repetition loops.
      max_new_tokens: 64,
      no_repeat_ngram_size: 4,
    });
    const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text;
    post({ type: 'result', id: msg.id, text: text.trim() });
  } catch (err) {
    post({ type: 'error', id: msg.id, message: err instanceof Error ? err.message : String(err) });
  }
};
