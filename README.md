# Language Practice

A personal app for practicing Spanish, French and Mandarin. It costs $0: there are no paid services, and no accounts beyond the GitHub account that hosts it.

- **Lessons:** 5 topics (greetings, food, travel, numbers, directions) with 8 phrases each, in `shared/phrases.json`.
- **Voices:** made once with the free Microsoft Edge voices (`edge-tts`) and bundled as MP3s in `assets/audio/`.
- **Listen & repeat:** Whisper runs on the phone and colors each word green (right), orange (almost) or red (missed). Chinese is compared by sound (pinyin), so a same-sounding character isn't marked wrong. In the web app recording stops by itself when you finish talking, and a voice says "Great job!", "Close, try again." or "Not quite" (clips in `web/public/feedback/`, made by the same audio script).
- **Flashcards** (Leitner boxes) and a **quiz**. Progress is saved on the device.

- **Lesson path (web app):** short lessons that unlock one after another, from sounds to first words, then sentences, conversation, reading & writing and adult topics. Each lesson mixes listen-and-pick, word tiles, match the pairs, type what you hear and say it out loud (Whisper). Every answer gets a banner and a chime; a voice cheers now and then (mostly in the language you're learning, louder for streaks and at the end), gently encourages after mistakes, and can be turned off in Settings. Phrases are in `shared/feedback.json`. XP, daily streak, daily goal, hearts (one back every 30 minutes, or by reviewing) and a review of your weakest words. Everything is saved on the phone; no account.
  - Content lives in `shared/course/`: `outline.json` (stages and units for all languages) and one file per language. Add a unit there, run the audio script, push.

There are two front ends that share the lessons, audio and matching code:

| Folder | What | How you get it on the iPhone |
|---|---|---|
| `web/` | **Web app** (Vite + React). Works offline once loaded. Whisper runs in Safari via transformers.js | Open the link in Safari → Add to Home Screen |
| `src/` | Native Expo app (whisper.rn) | Xcode + free Apple ID, re-installed every 7 days (see the end of this file) |

## Web app

### Which Whisper model

Each model transcribed all 120 of the app's own phrase recordings. The table shows the average score:

| Model (8-bit) | Download | Spanish | French | Chinese |
|---|---|---|---|---|
| tiny | 41 MB | 89% | 76% | 80% |
| **base (default)** | **77 MB** | **89%** | **91%** | **95%** |
| small (optional) | 249 MB | 98% | 95% | 98% |

Tiny marks too many correct phrases as wrong, so **base** is the smallest one that works. You can switch to small in the app under *Speech checking* for better accuracy, at the cost of speed. All the models fail on single words spoken alone, which is why the Numbers lesson uses short phrases.

The model downloads once from Hugging Face (free, no login) into Safari's storage. After that, speech checking works offline, and your voice never leaves the phone.

### Run it on your Mac

```bash
cd web
npm install
npm run dev        # http://localhost:5173 (also shown with your Mac's network address)
npm run build      # production build in web/dist
npm run preview    # serve the build at http://localhost:4173
```

The microphone only works over HTTPS or on `localhost`. To try it on the iPhone, use the hosted version.

### Hosting (GitHub Pages, free)

`.github/workflows/deploy-web.yml` builds `web/` and publishes it on every push to `main`. The site is
`https://<github-user>.github.io/<repo>/`. Free GitHub Pages requires the repo to be **public**.

### Add it to the iPhone home screen

1. Open the site link in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open it from the home screen. Go to **Speech checking** and download the model (77 MB, Wi-Fi recommended).
4. Allow the microphone when asked the first time you record.

After that it works in airplane mode. Use the home-screen icon rather than a Safari tab: Safari can clear a site's saved data if you don't visit it for a few weeks, but home-screen apps keep theirs.

## Adding phrases

1. Add entries to `shared/phrases.json`. Each one needs `id`, `en`, `es`, `fr` and `zh: { hanzi, pinyin }`. You can also add `alt` with other accepted transcriptions, such as `"123"`.
2. Generate audio for the new phrases. Existing files are skipped, and no account is needed:
   ```bash
   python3 -m venv scripts/.venv && scripts/.venv/bin/pip install edge-tts==7.3.1   # first time only
   scripts/.venv/bin/python scripts/generate_audio.py
   ```
3. Commit and push. The site rebuilds itself in about 2 minutes.

Voices are set in `scripts/generate_audio.py`: `es-CO-SalomeNeural`, `fr-FR-DeniseNeural` and `zh-CN-XiaoxiaoNeural`. List the others with `scripts/.venv/bin/edge-tts --list-voices`. `edge-tts` uses Microsoft's free online read-aloud service, which is unofficial. It only runs on your Mac when generating audio.

## Native app (optional)

The original Expo development build in `src/` still works. It needs Xcode (free) and CocoaPods. Plug the iPhone in, turn on Developer Mode, and run `npm install && npm run ios:device`. With a free Apple ID it must be re-installed every 7 days. The web app avoids all of that.
