// One shared <audio> element. iOS only lets a page play sound after a tap; once this element
// has played inside a tap, later plays (like the quiz's next question) are allowed too.
const player = new Audio();
player.preload = 'auto';

export function playPhrase(url: string, slow = false) {
  player.pause();
  if (!player.src.endsWith(url)) player.src = url;
  player.currentTime = 0;
  player.playbackRate = slow ? 0.7 : 1;
  player.play().catch(() => {
    // Autoplay blocked before the first tap; the user can press the play button.
  });
}

export type Recording = { stop: () => Promise<Float32Array> };

/** Starts recording from the mic. `stop()` resolves with 16 kHz mono samples for Whisper. */
export async function startRecording(): Promise<Recording> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot record audio. Open the app in Safari.');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    throw new Error('Microphone access was blocked. Allow it in Settings › Safari › Microphone (or tap "aA" › Website Settings).');
  }

  player.pause();
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start();

  return {
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop()); // turn the mic indicator off
          try {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            resolve(await to16kMono(await blob.arrayBuffer()));
          } catch (e) {
            reject(e);
          }
        };
        recorder.stop();
      }),
  };
}

async function to16kMono(data: ArrayBuffer): Promise<Float32Array> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(data);
  void ctx.close();
  const length = Math.ceil(decoded.duration * 16000);
  if (!length) return new Float32Array(0);
  const offline = new OfflineAudioContext(1, length, 16000);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}
