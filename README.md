# Learnguage

A personal app for practicing Spanish, French and Mandarin. It costs $0: there are no paid services, and no accounts beyond the GitHub account that hosts it.

- **Lessons:** 5 topics (greetings, food, travel, numbers, directions) with 8 phrases each, in `shared/phrases.json`.
- **Voices:** made once with the free Microsoft Edge voices (`edge-tts`) and bundled as MP3s in `assets/audio/`.
- **Listen & repeat:** Whisper runs on the phone and colors each word green (right), orange (almost) or red (missed). Chinese is compared by sound (pinyin), so a same-sounding character isn't marked wrong. In the web app recording stops by itself when you finish talking, and a voice says "Great job!", "Close, try again." or "Not quite" (clips in `web/public/feedback/`, made by the same audio script).
- **Flashcards** (Leitner boxes) and a **quiz**. Progress is saved on the device.

- **Lesson path (web app):** 20 units of short lessons (61 per language) that unlock one after another, in six levels that follow how a child grows into an adult: **Beginner** (sounds, first words, family, I want/have/like, colors and numbers, where things are), **Elementary** (meeting people, shopping and restaurants, my day and the past), **Intermediate** (telling stories, describing people, messages, invitations and plans), **Upper-intermediate** (work and money, the doctor and feelings, travel problems), **Advanced** (news and opinions, debate, formal vs. casual speech) and **Fluent** (idioms and sayings, slang, fluent conversation). Mandarin is in simplified characters with pinyin tone marks; Spanish follows Colombian/Latin American usage (the voice is Colombian). Each lesson mixes listen-and-pick, word tiles, match the pairs, type what you hear and say it out loud (Whisper). Every answer gets a banner and a chime; a voice cheers now and then (mostly in the language you're learning, louder for streaks and at the end), gently encourages after mistakes, and can be turned off in Settings. Phrases are in `shared/feedback.json`. XP, daily streak, daily goal, hearts (one back every 30 minutes, or by reviewing) and a review of your weakest words. Everything is saved on the phone; no account.
- **Placement test:** the Learn tab offers an optional test per language (and a "Retake the placement test" button at the end of the path once taken). It's a binary search over the path's eight stages: four multiple-choice questions from one stage at a time (read it, produce it, or hear it), three right means you know that stage, and the next round jumps up or down until the level is found, usually in about a dozen questions. "I don't know" is there so guessing doesn't skew it. Every lesson below your level is unlocked and marked "Tested out" (still playable; it turns into a check once you do it), the first lesson of your level becomes the current one, and nothing already unlocked or finished is ever locked again. XP, streak and stats are untouched. Logic in `web/src/lib/placement.ts`.
- **Mistakes:** every word or phrase you get wrong (in lessons, reviews, flashcards and the quiz) goes on a per-language Mistakes list; misses that aren't really mistakes (a new word the first time you see it, Whisper mishearing you) don't count. **Practice › Mistakes** drills up to 7 of them per session, each three times in three different exercise types, never twice in a row. Each needs 3 right answers in Mistakes sessions to be cleared (dots on each word show how far along it is), and getting it wrong again anywhere starts it over. Words you'd already missed that are still weak were put on the list when this was added.
- **Hands-free audio:** Practice › Hands-free audio (or "Hands-free (audio only)" on any lesson's start screen) plays a unit, a lesson, today's due words or your mistakes like a podcast: a voice says the English, there's a pause to answer out loud, then the native answer, then a pause to say it again. Answer time can be Short, Medium or Long. The session is built in the browser into **one continuous WAV track** (`web/src/lib/handsfree.ts`) rather than clips started one by one, because iOS stops JavaScript timers when the phone is locked but keeps playing a single audio track; it also sets the lock-screen title and play/pause/skip buttons (Media Session). If iOS still pauses it when locked in the Home Screen app, playing it from a Safari tab is the fallback. Answers aren't graded (the mic can't record with the screen off). Finishing earns 5 XP and counts the listening time. The English is spoken by a second Edge voice (`en-US-AndrewNeural`): one clip per distinct meaning in `assets/audio/en/`, listed in `shared/en-audio.json`, made by the audio script.
- **Listening speed:** Settings › Lessons › Listening speed sets the default for every recording (lessons, phrasebook, stories, hands-free): Slow (0.8×), Normal or Fast (1.25×), with a sample played when you change it. Slow buttons in exercises stay slower still (0.7×). Stories and hands-free also have their own Slow / Normal / Fast chips for the session. Safari keeps the voice's pitch when it speeds up or slows down.
- **Grammar tips:** 24 Spanish, 24 French and 27 Mandarin tips, each attached to the lesson where a rule first shows up (gender and articles, ser/estar, gustar, the past tenses, the subjunctive, tu/vous, measure words, 了, 把, 被…). A tip pops up by itself the first time you open that lesson: a few plain-English sentences, a small table when it helps, and example sentences from the course you can tap to hear. After that it's one tap away: the "Grammar tip" button on the lesson's start screen and the book icon at the top of the lesson. Tips are in `shared/grammar/<lang>.json`; the build checks that each points at a real lesson and real words.
- **Spaced repetition (web app):** every word and phrase you practice (lessons, flashcards, quiz, listen & repeat) gets a review day, using SM-2, the algorithm behind Anki. Right on its review day, the gap grows (1 day, 3 days, then about ×2.5 each time: ~8, ~20, ~50 days…); missed, it comes back tomorrow and grows more slowly from then on. Practicing a word early doesn't stretch its gap, and Whisper mishearing you never counts as forgetting. **Practice › Daily review** shows how many are due today and runs them as mixed exercises (up to 20 per session, no hearts at stake). The scheduler is `web/src/lib/srs.ts`.
- **Tone practice (Mandarin):** in Listen & repeat and in lessons' "say it" exercises, your pitch is drawn as a line next to the native voice's, with one label per syllable and a match score. Pitch is found in the browser with the YIN algorithm (`web/src/lib/pitch.ts`, no library); both lines are in semitones around each speaker's own middle pitch, so a deep and a high voice compare by shape, which is what a tone is. Tap or drag across the chart to read both lines at that point.
- **Character writing (Mandarin):** Practice › Character writing lists every character in the app (the ones from your finished lessons first). For each: **Watch** the stroke order, **Trace** it with your finger over the outline (a hint after a wrong stroke), then write it **From memory**. Each stroke is checked as you draw, and the end shows how many strokes were right and how many mistakes you made; a character written from memory with at most one slip gets a check mark. Uses the free [Hanzi Writer](https://hanziwriter.org) (MIT). Its stroke data (from Make Me a Hanzi, Arphic Public License) is copied for just the characters the app uses into `web/public/hanzi/` by `web/scripts/hanzi-data.mjs`, which runs before every build, so new lessons get their characters automatically and writing works offline.
- **Stories & dialogues:** Practice › Stories & dialogues has a short story and a dialogue at each of three levels (Beginner, Elementary, Intermediate) in every language. Play all reads it aloud line by line (the line being read is highlighted; Slow / Normal / Fast set the speed), tap a line's speaker to replay it, tap any word for its meaning (and pinyin), turn on English to see each line translated, then answer three comprehension questions (in English at first, in the language itself at the Intermediate level). Finishing earns XP and counts toward the streak. Dialogues use a second (male) voice. **Shadow** plays one line, then it's your turn: the mic records you saying it back, Whisper grades it (a score and the words marked green, orange or red under the line), and it moves on to the next line by itself. Again repeats a line, Skip moves on, Stop ends it, and tapping a line's speaker while shadowing restarts from there. A full pass earns 5 XP and keeps your best average. Without the speech model it still plays each line and pauses long enough for you to repeat it, just without a grade. Content is in `shared/stories/<lang>.json` (Chinese lines are split into words with spaces in `seg`); add a story there and run the audio script, which makes one clip per line in `assets/audio/stories/`.
- **Stats:** the Progress tab shows, for each language or all of them, words learned (and how many are mastered: remembered three weeks apart), time practiced (counted while a practice screen is open and you've touched it in the last two minutes), accuracy overall and by week for the last 8 weeks, minutes per day for the last 14 days, and a 5-week streak calendar. Answers and time are logged per day and language from this version on; XP and the overall streak keep their full history.
  - Content lives in `shared/course/`: `outline.json` (levels, stages and units for all languages) and one file per language. Add a unit there, run the audio script, push. `web/scripts/check-course.mjs` runs before every build and stops it if a word id is used twice, a lesson id doesn't match its unit, a Chinese item lacks pinyin tone marks or word tiles that spell it, or a recording is missing.

There are two front ends that share the lessons, audio and matching code:

| Folder | What | How you get it on the iPhone |
|---|---|---|
| `web/` | **Web app** (Vite + React). Works offline once loaded. Whisper runs in Safari via transformers.js | Open the link in Safari → Add to Home Screen |
| `src/` | Native Expo app (whisper.rn) | Xcode + free Apple ID, re-installed every 7 days (see the end of this file) |

## Web app

### Look and feel

- Four tabs: **Learn** (the lesson path), **Practice** (daily review, weak words and the phrasebook), **Progress** (XP and streak, then per language: words learned, time practiced, accuracy by week, minutes per day and a streak calendar) and **Settings**.
- Light and dark mode (follows the phone, or pick one in Settings). Colors and spacing are tokens at the top of `web/src/styles.css`.
- Motion: screen transitions (View Transitions, Safari 18+), press-down buttons, a green flash, bounce and sparkles for right answers, a shake for wrong ones, confetti when a lesson is done. All of it turns off with iPhone **Settings › Accessibility › Motion › Reduce Motion**.
- Logo moments: a short intro when the app opens (the logo pops in with a glow, about 1.3 s, plain CSS in `index.html` so it never delays loading; skipped if the app was open in the last 5 minutes). Big achievements get the logo spinning in with confetti and a sound: finishing a unit or a whole level, 7-, 30- and 100-day streaks, a placement test result, and the first daily goal ever. Regular lesson-complete screens are unchanged and come first. Each achievement shows once (`celebrated` in saved progress); the first time this version opens, everything already earned is marked as celebrated quietly. Reduce Motion gets a plain fade.
- Sound effects are synthesized in the browser (no files). Haptics use `navigator.vibrate` where it exists and the iOS 18 `<input switch>` trick on iPhone; both can be turned off in Settings.
- Branding comes from `Logos/logo.png` (never modified). `cd web && npm run icons` rebuilds everything from it with `sharp` (a free dev dependency) and updates `index.html`:
  - Home-screen icon (180, 192, 512, 1024 and a maskable 512): the parrot and its "Hola" bubble on a light sky background, flattened so no transparency can show as black on iPhone.
  - Favicons (32 and 64), the small header mark (`public/brand/mark.png`), the full logo for the welcome screen (`public/brand/logo.webp`) and 22 launch screens (light and dark, every current iPhone size).
- The color tokens in `web/src/styles.css` come from the logo: navy text, the parrot's blues for buttons and links, its yellow and orange for XP and streaks.

### Which Whisper model

Each model transcribed all 120 of the app's own phrase recordings. The table shows the average score:

| Model (8-bit) | Download | Spanish | French | Chinese |
|---|---|---|---|---|
| tiny | 41 MB | 89% | 76% | 80% |
| **base (default)** | **77 MB** | **89%** | **91%** | **95%** |
| small (optional) | 249 MB | 98% | 95% | 98% |

Tiny marks too many correct phrases as wrong, so **base** is the smallest one that works. You can switch to small in the app under *Speech checking* for better accuracy, at the cost of speed. All the models fail on single words spoken alone, which is why the Numbers lesson uses short phrases.

The model downloads once from Hugging Face (free, no login) into Safari's storage. After that, speech checking works offline, and your voice never leaves the phone.

### Backup and restore

Progress only lives on the phone, so **Settings › Backup › Export my progress** saves everything (lessons, XP, streak, review days, writing, stories, stats and settings) to a file, `learnguage-backup-<date>.json`. On iPhone this opens the share sheet: pick **Save to Files** (iCloud Drive keeps it safe if the phone is lost). **Import a backup…** reads such a file, shows what's in it next to what's on the phone, and replaces your progress only if you tap Replace. Nothing is uploaded anywhere.

### Offline

Everything works with no signal once the app has been opened online once:

- The service worker stores the app, every lesson, story and phrase recording, the feedback voices and the characters' stroke data (about 770 files) on first launch, so the app opens instantly from the Home Screen in airplane mode.
- The Whisper model and the ONNX speech engine are stored by transformers.js when you download the model (Settings › Speech checking).
- The app asks Safari to keep its storage (`navigator.storage.persist()`), so it isn't cleared when space runs low.
- **Settings › Offline** shows whether the app and the speech model are saved and how much space they use.
- A new version you push is downloaded in the background and applied the next time you're on a tab screen (not in the middle of a lesson or story), with a quick reload.

### Run it on your Mac

```bash
cd web
npm install
npm run dev        # http://localhost:5173 (also shown with your Mac's network address)
npm run build      # production build in web/dist
npm run preview    # serve the build at http://localhost:4173
```

The microphone only works over HTTPS or on `localhost`. To try it on the iPhone, use the hosted version.

### Browser tests

End-to-end tests in WebKit (Safari's engine) with iPhone emulation, in `web/e2e/`. They build the app, serve it, and play through lessons with a fake microphone that plays the app's own recordings.

```bash
cd web
npx playwright install webkit   # first time only (free download)
npm run test:e2e                # all suites
npm run test:e2e -- ui lesson   # just some: mute brand ui lesson feedback listen
```

- **Silent:** every test page is muted (WebKit has no `--mute-audio`, so the harness routes all sound through a zero-volume node and mutes audio elements). The `mute` suite checks this.
- **Leaves nothing running:** browsers close on success, failure, Ctrl-C or a 15-minute limit; the runner then stops the test server and any Playwright browser left over. `e2e/kill-strays.sh --list` shows leftovers (it only ever matches Playwright's own browsers and these tests, never Safari or Chrome).
- Screenshots and logs go to `web/e2e/out/` (git-ignored).
- To change saved progress in a test, use `editProgress(page, (p) => …)` from `e2e/harness.mjs`, not `localStorage` directly: the app saves its own copy as the page unloads.

### Hosting (GitHub Pages, free)

`.github/workflows/deploy-web.yml` builds `web/` and publishes it on every push to `main`. The site is
`https://<github-user>.github.io/<repo>/`. Free GitHub Pages requires the repo to be **public**.

### Add it to the iPhone home screen

1. Open the site link in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open it from the home screen (it opens full screen with its own icon and launch screen). In the **Settings** tab, download the speech model (77 MB, Wi-Fi recommended).
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
