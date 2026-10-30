import { useEffect, useRef, useState } from 'react';
import { Sticker } from '../art';
import { playAndWait, primePlayer, speakDevice } from '../lib/audio';
import { type Lang, LANGS } from '../lib/content';
import { courseItemFor } from '../lib/course';
import { tapFeedback } from '../lib/fx';
import { addTalkWords } from '../lib/progress';
import { audioUrl, nameObject, type Named, PROBLEM_TEXT, type TalkError, type TalkProblem } from '../lib/talk';
import { Icon, Screen } from '../ui';

// Practice › Camera: point the camera at something and the app names it in the language you're
// learning, with audio, an example sentence and "Add to my words" (spaced repetition). The photo
// goes, shrunk to ~512 px, to Google Gemini through the app's free Worker, and isn't kept.

const MAX_SIDE = 512;

/** A frame (video or picked photo) as a small JPEG, base64 without the data: prefix. */
function toJpeg(source: CanvasImageSource, w: number, h: number): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72).split(',')[1];
}

export function CameraScreen({ lang }: { lang: Lang }) {
  const name = LANGS.find((l) => l.id === lang)!.name;
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [camera, setCamera] = useState<'starting' | 'on' | 'blocked' | 'none'>('starting');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<TalkProblem | null>(null);
  const [result, setResult] = useState<(Named & { shot: string }) | null>(null);
  const [added, setAdded] = useState(false);
  const clip = useRef<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [result]);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setCamera('none');
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
        if (!live) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setCamera('on');
      } catch {
        if (live) setCamera('blocked');
      }
    })();
    return () => {
      live = false;
      stream.current?.getTracks().forEach((t) => t.stop());
      if (clip.current) URL.revokeObjectURL(clip.current);
    };
  }, []);

  async function identify(image: string) {
    setBusy(true);
    setProblem(null);
    setResult(null);
    setAdded(false);
    try {
      const named = await nameObject(lang, image);
      setResult({ ...named, shot: `data:image/jpeg;base64,${image}` });
      if (named.found) void say(named);
    } catch (e) {
      setProblem((e as TalkError).problem ?? 'unavailable');
    } finally {
      setBusy(false);
    }
  }

  async function say(named: Named) {
    if (named.audio) {
      if (clip.current) URL.revokeObjectURL(clip.current);
      clip.current = audioUrl(named.audio);
      if (await playAndWait(clip.current)) return;
    }
    await speakDevice(named.word, lang); // the voice service is resting: the phone's own voice
  }

  const snap = () => {
    tapFeedback();
    primePlayer();
    const v = video.current;
    if (!v || !v.videoWidth) return;
    void identify(toJpeg(v, v.videoWidth, v.videoHeight));
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    primePlayer();
    const img = new Image();
    img.onload = () => {
      void identify(toJpeg(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  const add = () => {
    if (!result) return;
    tapFeedback();
    const item = courseItemFor(lang, result.word);
    const slug = result.word.toLowerCase().replace(/\s+/g, '-').slice(0, 40);
    addTalkWords([item ? { key: `${lang}:${item.id}` } : { key: `${lang}:ai:${slug}`, word: { text: result.word, en: result.meaning, pinyin: result.pinyin || undefined } }]);
    setAdded(true);
  };

  return (
    <Screen title="Camera" back="/practice">
      <div className="camera-frame" data-testid="camera-frame">
        <video ref={video} playsInline muted autoPlay className={camera === 'on' ? 'camera-video on' : 'camera-video'} aria-label="Camera view" />
        {camera !== 'on' && (
          <div className="camera-empty">
            <Sticker name="pin" size={64} />
            <p className="muted">
              {camera === 'starting'
                ? 'Starting the camera…'
                : camera === 'blocked'
                  ? 'The camera is blocked. Allow it in Settings › Safari › Camera, or pick a photo instead.'
                  : "This browser can't use the camera here. Pick a photo instead."}
            </p>
          </div>
        )}
        {busy && (
          <div className="camera-busy">
            <span className="spinner" />
          </div>
        )}
      </div>

      <div className="row">
        <button className="btn flex" onClick={snap} disabled={camera !== 'on' || busy} data-testid="camera-snap">
          <Icon name="target" size={20} /> What's this in {name}?
        </button>
        <button className="btn secondary" onClick={() => file.current?.click()} disabled={busy} aria-label="Pick a photo" data-testid="camera-pick">
          <Icon name="download" size={20} />
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} data-testid="camera-file" />
      </div>

      {problem && (
        <div className="card talk-problem" role="alert" data-testid="camera-problem">
          <p style={{ margin: 0, fontWeight: 600 }}>{PROBLEM_TEXT[problem]}</p>
        </div>
      )}

      {result && !result.found && (
        <div className="card" data-testid="camera-none">
          <p style={{ margin: 0 }}>I couldn't make out one clear thing there. Try a single object, close up and in good light.</p>
        </div>
      )}

      {result?.found && (
        <div className="card camera-result" data-testid="camera-result" ref={resultRef}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <img className="camera-thumb" src={result.shot} alt="" width={64} height={64} />
            <div className="grow">
              <div className="word-day-word" lang={lang}>
                {result.word}
              </div>
              {result.pinyin && <div className="pinyin">{result.pinyin}</div>}
              <div className="word-day-en">{result.meaning}</div>
            </div>
            <button className="audio-btn" onClick={() => void say(result)} aria-label={`Hear ${result.word}`} data-testid="camera-hear">
              <Icon name="speaker" size={22} />
            </button>
          </div>
          <div className="word-day-example">
            <Icon name="chat" size={18} />
            <span className="grow">
              <span className="word-day-sentence" lang={lang}>
                {result.example}
              </span>
              {result.examplePinyin && <span className="pinyin small">{result.examplePinyin}</span>}
              <span className="muted small">{result.exampleTranslation}</span>
            </span>
          </div>
          <button className="btn" onClick={add} disabled={added} data-testid="camera-add">
            <Icon name={added ? 'check' : 'download'} size={20} /> {added ? 'Added: it comes back in Daily review' : 'Add to my words'}
          </button>
        </div>
      )}

      <p className="muted small" style={{ margin: '0 4px' }}>
        Needs the internet. The photo goes, made small, to Google's Gemini AI through Learnguage's own free server to be recognized, and isn't kept.
        Point it at things, not people.
      </p>
    </Screen>
  );
}
