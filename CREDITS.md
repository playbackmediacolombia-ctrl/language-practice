# Credits

Everything Learnguage ships is free to use, and nothing here needs a paid licence or account.
Every asset is bundled with the app, so it works offline.

## Characters and animation

**Characters: [Open Peeps](https://www.openpeeps.com/) by [Pablo Stanley](https://twitter.com/pablostanley) ([CC0](https://creativecommons.org/publicdomain/zero/1.0/)), via [DiceBear](https://www.dicebear.com/styles/open-peeps/).**
Shown in the app under Settings › About › Credits, with the same links.

| Asset | Where it's used | Source | License | Checked |
| --- | --- | --- | --- | --- |
| **Open Peeps** by Pablo Stanley: the bust, 24 hairstyles, 3 beards and moustaches, 2 glasses, and parts of 6 faces (smile, calm, smileLOL, concerned, cheeky, tired) | Role-play and phone-call characters, the AI partner (`web/src/characters/`) | [openpeeps.com](https://www.openpeeps.com/), taken from DiceBear's [`@dicebear/open-peeps`](https://www.npmjs.com/package/@dicebear/open-peeps) 9.4.2 package ([dicebear.com](https://www.dicebear.com/)) by `web/scripts/peeps.mjs` and bundled in the app; the DiceBear API is never called | Drawings: **CC0 1.0** (public domain, commercial use allowed, no attribution required). Package code: MIT, © 2024 Florian Körner | Read in the package's `LICENSE` file ("Design … Source: Open Peeps … Designer: Pablo Stanley … License: CC0 1.0") |
| The Class teacher | `web/src/screens/Class.tsx` | The existing Open Peeps teacher character (below), lip-synced to the narration | CC0 (drawing), ours (rig) | — |
| Our own additions to the Open Peeps characters: the rig (breathing, blinks, glances, head motion), the talking mouth, the waving hand, outfit details (bow tie, coat, tie, badge, apron, lanyard and so on), cheeks, "?", thought dots and sparkles | `web/src/characters/Character.tsx`, `characters.css` | Original, drawn in code for this app | Ours | — |
| Lip sync | `web/src/characters/lipsync.ts` | Original: reads each recording's loudness and brightness; the phone's voice follows the text | Ours | — |
| **The macaw** (all poses and animations) | The in-app version of the logo bird: lesson path, lessons, hints, celebrations (`web/src/Bird.tsx`) | Original drawing of our logo's bird, hand-drawn to match the Open Peeps style | Ours | — |
| Icons, stickers, hint pictures, confetti, the reward chest, tab icons, flags | `web/scripts/ink-art.mjs` (drawings), `web/scripts/inkbrush.mjs` (the hand-drawn brush), generated into `web/src/ink.gen.ts` and `web/src/pictures.gen.ts` | Original, drawn for this app in the Open Peeps style | Ours | — |
| `svg-path-properties` (build tool only, not shipped) | Measures the drawings' lines for the brush | npm package | ISC | `package.json` |

Open Peeps is CC0, so no credit is required, but we give it gladly. The colors were changed to
match the app: skin, hair and clothing come from our palette, and the ink is our navy.

### Considered and skipped

- **LottieFiles animations.** We left these out because the licence isn't clear. LottieFiles'
  *Lottie Simple License* allows commercial use of its free files. But its
  [Terms and Conditions](https://lottiefiles.com/page/terms-and-conditions) (last modified 22 Aug
  2025) also say "The Individual Plan and Free Plan are strictly for non-commercial use only",
  and they forbid downloading with automated tools. Free Lottie characters also wouldn't match
  the Open Peeps characters, so they couldn't lip-sync or change expression with them. All the
  motion is code we wrote instead.

## Other free components

| Component | Use | License |
| --- | --- | --- |
| Plus Jakarta Sans (`@fontsource-variable/plus-jakarta-sans`) | The app's typeface | SIL Open Font License 1.1 |
| Whisper (`onnx-community/whisper-base`, `whisper-small`) via `@huggingface/transformers` | Speech recognition on the phone | Model: MIT (OpenAI); library: Apache-2.0 |
| Hanzi Writer and `hanzi-writer-data` | Chinese stroke order | MIT; character data under the Arphic Public License |
| pinyin-pro | Pinyin | MIT |
| Recorded phrases | Lessons, stories, role-plays | Generated with Microsoft Edge's free online voices through the open-source `edge-tts` tool (see `scripts/generate_audio.py`) |
| The teacher's voice in Classes | Class explanations (English), letter names and pre-taught words | The same free Edge voices through `edge-tts` (`scripts/generate_class_audio.py`); the teacher speaks with Ava, the voice of the app's spoken feedback |
| Google Gemini (free tier) and Cloudflare Workers (free plan) | The AI partner, camera mode | Free services under their own terms; no assets are bundled |
