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
- **Pick your level:** a language you haven't started opens with its six levels as big tiles (Beginner A1, Elementary A2, Intermediate B1, Upper-intermediate B2, Advanced C1, Fluent C2). Tap one to start there: every lesson below it unlocks and your next lesson is its first one. **Not sure? Take a quick test** runs the placement test instead. Change it any time with the **Level** bar on the path or **Settings › Your level**. Picking a level never touches XP, streak or finished lessons, and going back down never locks anything you'd already unlocked (`levelStart` in saved progress). The `level` test suite checks all of this.
- **Character writing (Mandarin):** Practice › Character writing lists every character in the app (the ones from your finished lessons first). For each: **Watch** the stroke order, **Trace** it with your finger over the outline (a hint after a wrong stroke), then write it **From memory**. Each stroke is checked as you draw, and the end shows how many strokes were right and how many mistakes you made; a character written from memory with at most one slip gets a check mark. Uses the free [Hanzi Writer](https://hanziwriter.org) (MIT). Its stroke data (from Make Me a Hanzi, Arphic Public License) is copied for just the characters the app uses into `web/public/hanzi/` by `web/scripts/hanzi-data.mjs`, which runs before every build, so new lessons get their characters automatically and writing works offline.
- **Real-life role-plays:** Practice › Real-life role-plays has 30 conversations per language across every level: ordering food, directions, shopping, small talk, the doctor, the airport, the hotel (Elementary to Upper-intermediate), a job interview (Upper-intermediate to Fluent), dating, and flirting behind the 18+ check. Each topic comes back harder at three levels (a café order → the wrong dish → booking a group with allergies). The other person speaks (second voice); on your turn you tap the mic, say your line, and Whisper grades it (50% or more moves on; otherwise try again or skip). Beginner and Elementary show your line; Intermediate and Upper-intermediate show the English with the words a tap away; Advanced and Fluent show only what to say, in English. Stuck? **Hint** shows how your line starts (it also appears after one miss), and after two misses the whole line is shown. Hear it plays the model line. A finished role-play earns 10 XP and keeps your best average. Content is in `shared/scenarios/<lang>.json`; the audio script makes one clip per line in `assets/audio/scenarios/`.
- **Speaking-first:** answer every exercise out loud instead of tapping. On for Mandarin by default; switch it per language on a lesson's start card or in **Settings › Speaking-first**. New words become "repeat after me", words you've seen become "say it" from the English (the words a tap away), single syllables stay as they were (Whisper mishears them) and match-the-pairs rounds are left out. It needs the speech model; without it the lesson says so and you tap as usual.
- **Animated characters (role-plays):** the person you talk to is an original SVG cartoon in the logo's colors (waiter, doctor, receptionist, interviewer, airline agent, shopkeeper, a partner's parent, a friend, a date). It moves its mouth with the voice (each clip's loudness is worked out once from the file, and the mouth follows playback), blinks and breathes while idle, hops happily when your line is right and tilts its head with a "?" when you should try again. **Settings › Animated characters** (on by default) turns it off, and role-plays are then exactly as before. All of it is in `web/src/characters/` (delete the folder and the two lines that use it in `RolePlay.tsx` to remove it).
- **Talk with AI (needs the internet):** Practice › Talk with AI is a spoken back-and-forth with an AI partner, in free talk or any role-play scenario (**Role-play it with the AI** on a role-play's screen). You speak; Whisper turns it into text on the phone; the text goes to the app's free Cloudflare Worker (`worker/`), which asks Google Gemini (free tier) for the next line at your level (simple for Beginner, natural speed and slang for Fluent) and has Workers AI (MeloTTS, free daily allowance) speak it. The reply plays and the mic opens again by itself. Every reply has **Translate**; anything you said that could be better gets a gentle correction under it. **End** shows the new words (added to spaced repetition: course words keep their recording, others are spoken by the phone's own voice) and the mistakes to review, and earns 10 XP. If you're offline, the free quota runs out or the service is down, it says so kindly; if only the voice service is down, the phone's own voice reads the replies. With animated characters on, the partner is on stage. Your voice never leaves the phone; only the text of what you say is sent, and nothing is stored. Everything else in the app stays offline.
- **Culture lessons:** five short optional units per language, Beginner to Advanced: greetings and gestures, food and table manners, holidays, etiquette and mistakes to avoid, and slang, for each language's countries (Spain and Latin America; France, Belgium, Switzerland, Québec and West Africa; mainland China and Taiwan). Each has a culture note, six phrases with audio and a three-question culture quiz (free, and it shows the answer if you miss). `culture` in `shared/course/outline.json` lists them.
- **Pronunciation heatmap:** after you speak (Listen & repeat, "say it" exercises, role-plays, shadowing), your sentence is shown word by word (character by character in Mandarin) in green, yellow or red. Tap a yellow or red word to hear it and try just that word again. In Mandarin, a right syllable with the wrong tone is flagged with the tone it needs.
- **Music & chants:** Practice › Music & chants has an original chant or song-style verse for each level (no copyrighted songs) and Mandarin tone chants. The app's voices sing each line over a soft beat made in the browser, with the words lighting up karaoke-style (edge-tts word timings, saved by the audio script in `assets/audio/chants/<lang>/timings.json`). Sing along: after each line it's your turn on the beat, graded with the heatmap. Content is in `shared/chants/<lang>.json`.
- **Camera (needs the internet):** Practice › Camera: point the camera at something (or pick a photo) and the app names it in the language you're learning, with the word spoken, an example sentence and **Add to my words** (spaced repetition). The photo goes, shrunk to about 512 px, to Gemini through the same free Worker (`/vision`, its own daily cap `VISION_LIMIT`, 100) and isn't kept. Friendly messages when offline, over the limit, or the camera is blocked.
- **Weekly challenge:** on the Progress tab, a goal of about 10% more XP than last week (at least 50), Monday to Sunday, with a bar, the days left and a history of past weeks. Winning it brings up the logo celebration once.
- **Audio, one voice at a time:** phrases, spoken feedback and the phone's own voice share one channel: starting one stops the others, feedback waits for the phrase before it, the next clip waits ~0.65 s after a feedback line, and Continue cuts feedback off cleanly. The `audioq` test checks that no two clips ever overlap.
- **Add to Home Screen:** a card on the welcome screen and the Learn tab. On Android/Chrome its button opens Chrome's own install prompt; on iPhone it opens a short guide whose bouncing arrow points at Safari's own button (Share in the bottom bar, or ⋯ in Safari 26). Hidden once installed, and dismissible for good.
- **Word of the day:** the Learn tab shows one word a day from your level (lessons you've done or can open) with its meaning, pinyin for Mandarin, audio, and a short course sentence that uses it. The same word all day, a new one tomorrow.
- **Flirting (optional topic, 18+):** three more units at Upper-intermediate, Advanced and Fluent: compliments and reading the signals; playful teasing and pick-up lines, smooth and cheesy; flirty texts and dating-app openers (with emojis and slang), plus asking for a number and exiting gracefully. Cultural notes per country on charming versus too forward. Three role-plays and three dialogues per language. Flirty, never sexual. It opens after a one-tap **I'm 18 or older**, and until then its phrases never appear anywhere (not even as wrong answer options). **Settings › Show 18+ topics** hides it again (`adult` in saved progress; `adult` in `shared/course/outline.json` lists the units).
- **Dating & relationships (optional topic):** three extra units, one each at Upper-intermediate, Advanced and Fluent: meeting someone and asking them out; texting and dating apps; and love, couples and meeting the family. Two lessons of six phrases each, with a culture note per unit (Colombia, France, China). They're marked *Optional* on the Learn path, open as soon as you reach their level, and never hold up the main path or count toward finishing a level. There are also three dating dialogues (Stories & dialogues, levels 4–6) and three dating role-plays per language. Elective units are listed under `electives` on their stage in `shared/course/outline.json`.
- **Reading practice:** Practice › Reading has short practice articles at every level (Beginner to Fluent; made up for practice, no real people or events), from five simple sentences about a new park up to opinion pieces. Tap any word for its meaning (and pinyin); a word that isn't in the article's word list shows the whole sentence in English instead. Listen sentence by sentence, turn on English, then answer the questions in the language (English underneath). Content is in `shared/reading/<lang>.json`; their clips go in `assets/audio/stories/`.
- **Daily reminder (free, nothing online):** Settings › Daily reminder walks through an iPhone Shortcuts personal automation, with a drawn screen for each step (the thing to tap highlighted): Time of Day → Show Notification (→ Open URLs, only when you use the app in Safari: Shortcuts opens links in Safari, which keeps separate progress from the Home Screen app). Copy buttons for the message and the address. On the Learn tab, a streak you haven't kept up today shows a warning with the time left and a Practice now button.
- **Stories & dialogues:** Practice › Stories & dialogues has a short story and a dialogue at each of three levels (Beginner, Elementary, Intermediate) in every language, plus conversations about relationships at Upper-intermediate, Advanced and Fluent. Play all reads it aloud line by line (the line being read is highlighted; Slow / Normal / Fast set the speed), tap a line's speaker to replay it, tap any word for its meaning (and pinyin), turn on English to see each line translated, then answer three comprehension questions (in English at first, in the language itself at the Intermediate level). Finishing earns XP and counts toward the streak. Dialogues use a second (male) voice. **Shadow** plays one line, then it's your turn: the mic records you saying it back, Whisper grades it (a score and the words marked green, orange or red under the line), and it moves on to the next line by itself. Again repeats a line, Skip moves on, Stop ends it, and tapping a line's speaker while shadowing restarts from there. A full pass earns 5 XP and keeps your best average. Without the speech model it still plays each line and pauses long enough for you to repeat it, just without a grade. Content is in `shared/stories/<lang>.json` (Chinese lines are split into words with spaces in `seg`); add a story there and run the audio script, which makes one clip per line in `assets/audio/stories/`.
- **Stats:** the Progress tab shows, for each language or all of them, words learned (and how many are mastered: remembered three weeks apart), time practiced (counted while a practice screen is open and you've touched it in the last two minutes), accuracy overall and by week for the last 8 weeks, minutes per day for the last 14 days, and a 5-week streak calendar. Answers and time are logged per day and language from this version on; XP and the overall streak keep their full history.
  - Content lives in `shared/course/`: `outline.json` (levels, stages and units for all languages) and one file per language. Add a unit there, run the audio script, push. `web/scripts/check-course.mjs` runs before every build and stops it if a word id is used twice, a lesson id doesn't match its unit, a Chinese item lacks pinyin tone marks or word tiles that spell it, or a recording is missing.

There are two front ends that share the lessons, audio and matching code:

| Folder | What | How you get it on the iPhone |
|---|---|---|
| `web/` | **Web app** (Vite + React). Works offline once loaded. Whisper runs in Safari via transformers.js | Open the link in Safari → Add to Home Screen |
| `src/` | Native Expo app (whisper.rn) | Xcode + free Apple ID, re-installed every 7 days (see the end of this file) |

## Web app

### Look and feel

- Four tabs: **Learn** (the lesson path: a top bar with your language's flag, streak flame, XP and hearts, today's goal, then each unit as a bright banner with its own sticker and its lessons as round 3D nodes that wind down the screen; finished lessons turn gold, the current one bounces with a Start bubble and the parrot beside it, locked ones are grey), **Practice** (daily review, weak words and the phrasebook), **Progress** (XP and streak, then per language: words learned, time practiced, accuracy by week, minutes per day and a streak calendar) and **Settings**.
- Light and dark mode (follows the phone, or pick one in Settings). Colors and spacing are tokens at the top of `web/src/styles.css`.
- Motion: screen transitions (View Transitions, Safari 18+), press-down buttons, a green flash, bounce and sparkles for right answers, a shake for wrong ones, confetti when a lesson is done. All of it turns off with iPhone **Settings › Accessibility › Motion › Reduce Motion**.
- Logo moments: a short intro when the app opens (the logo pops in with a glow, about 1.3 s, plain CSS in `index.html` so it never delays loading; skipped if the app was open in the last 5 minutes). Big achievements get the logo spinning in with confetti and a sound: finishing a unit or a whole level, 7-, 30- and 100-day streaks, a placement test result, and the first daily goal ever. Regular lesson-complete screens are unchanged and come first. Each achievement shows once (`celebrated` in saved progress); the first time this version opens, everything already earned is marked as celebrated quietly. Reduce Motion gets a plain fade.
- Sound effects are synthesized in the browser (no files). Haptics use `navigator.vibrate` where it exists and the iOS 18 `<input switch>` trick on iPhone; both can be turned off in Settings.
- Branding comes from `Logos/logo.png` (never modified). `cd web && npm run icons` rebuilds everything from it with `sharp` (a free dev dependency) and updates `index.html`:
  - Home-screen icon (180, 192, 512, 1024 and a maskable 512): the parrot and its "Hola" bubble on a light sky background, flattened so no transparency can show as black on iPhone.
  - Favicons (32 and 64), the small header mark (`public/brand/mark.png`), the full logo for the welcome screen (`public/brand/logo.webp`) and 22 launch screens (light and dark, every current iPhone size).
- The color tokens in `web/src/styles.css` are measured from the logo: parrot blue #0164F9 (deep #0142D8 for 3D edges), sky #038CFB / #19B6FC, sun #FCC50E, orange #F8820C, wordmark navy #071334, beak slate #404D6B, face cream #EFE7D0 and the parrot's red mouth #E5303A. Right answers use a green and wrong ones that red, tuned to sit with them; dark mode uses the same palette on navy.
- Chunky, playful style: buttons, cards, answer tiles, lesson nodes and language tiles have a darker bottom edge and squish down into it when tapped. Type is Plus Jakarta Sans (free Google Font, SIL Open Font License, self-hosted via `@fontsource-variable/plus-jakarta-sans` so it works offline; PingFang for Chinese), on one scale (`--text-xs` … `--text-2xl` in `styles.css`): display headings 800 and slightly tight, labels 600–700, body 500. Unit stickers, flags and the tab icons are drawn in SVG in `web/src/art.tsx` (original, no image files or licenses).

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
- A new version you push is downloaded in the background and applied the next time you're on a tab screen (not in the middle of a lesson or story), with a quick reload. The app looks for one every time it comes back to the screen and hourly (a Home Screen app on iPhone usually resumes instead of reloading, so checking only at launch could leave it on an old version for days).
- **Settings › App version** shows which commit you're running and has **Check for updates**. The live site publishes the same thing at `version.json`, so you can compare it with the latest commit.

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
npm run test:e2e -- ui lesson   # just some: mute brand ui lesson feedback listen logo roleplay reading reminder dating update
```

- **Silent:** every test page is muted (WebKit has no `--mute-audio`, so the harness routes all sound through a zero-volume node and mutes audio elements). The `mute` suite checks this.
- **Leaves nothing running:** browsers close on success, failure, Ctrl-C or a 15-minute limit; the runner then stops the test server and any Playwright browser left over. `e2e/kill-strays.sh --list` shows leftovers (it only ever matches Playwright's own browsers and these tests, never Safari or Chrome).
- Screenshots and logs go to `web/e2e/out/` (git-ignored).
- `update` serves its own copy of the build, publishes a newer service worker mid-test and checks the app picks it up when it comes back to the screen, waits during a lesson, and switches once you're back on a tab.
- `SHOTS=after npm run test:e2e -- screens` screenshots every screen at iPhone size (plus a few in dark mode) into `web/e2e/out/shots/after/`, for before/after design comparisons.
- To change saved progress in a test, use `editProgress(page, (p) => …)` from `e2e/harness.mjs`, not `localStorage` directly: the app saves its own copy as the page unloads.

### AI conversation partner (Cloudflare Worker, free)

`worker/` is a small Cloudflare Worker on the free Workers plan (no payment method on the account). It only accepts requests from `https://learnguage.net`, `https://www.learnguage.net` and the old github.io address, counts replies in a KV namespace and stops at `DAILY_LIMIT` (300) a day so nobody can drain the free quotas, and keeps the Gemini key as a Worker secret, never in the repo.

```bash
cd worker
npm install
npx wrangler login                     # once: click Allow in the browser
npx wrangler secret put GEMINI_API_KEY # paste the key from Google AI Studio when asked
npm run deploy                         # after changing src/index.js or wrangler.jsonc
npm run tail                           # watch it live
```

The model is `GEMINI_MODEL` in `wrangler.jsonc` (if Google retires it, the Worker falls back to `gemini-flash-latest`); the daily cap is `DAILY_LIMIT`.

**The key:** at the `secret put` prompt paste only the key itself: one word, 39 characters, starting with `AIza` (copy it with the copy icon at https://aistudio.google.com/apikey). No quotes, no `GEMINI_API_KEY=`, no spaces. If the app says “Google rejected its Gemini key”, run `npm run tail`, send a message, and store the key again.

### Hosting (GitHub Pages, free)

`.github/workflows/deploy-web.yml` builds `web/` and publishes it on every push to `main`. Free GitHub Pages requires the repo to be **public**.

The app lives at **https://learnguage.net/** (custom domain, registered at GoDaddy, DNS at GoDaddy). GitHub Pages serves it with a free Let's Encrypt certificate and "Enforce HTTPS" on; `www.learnguage.net` and the old `https://playbackmediacolombia-ctrl.github.io/language-practice/` redirect to it. DNS records:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 (one record each) |
| AAAA | @ | 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 (one record each) |
| CNAME | www | playbackmediacolombia-ctrl.github.io |

The custom domain is set in the repo's Pages settings (with an Actions deploy, that setting is what counts; `web/public/CNAME` just records it next to the code).

**Moving from the old address:** each web address keeps its own saved progress, so the app at the old github.io address has **Settings › New address** (and a card on Learn once learnguage.net is up): **Copy my progress** puts everything (XP, streak, lessons, review days, settings) on the clipboard as a compact move code; in the new app, **Bring my progress** on the welcome screen (or Settings) pastes it, shows what will come over and asks before replacing anything. Nothing goes through a server. A backup file works too. The `move` test suite checks it.

### Add it to the iPhone home screen

1. Open **https://learnguage.net** in **Safari**.
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
