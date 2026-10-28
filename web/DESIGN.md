# Learnguage design system

The rules every screen follows, so new screens look and feel like the old ones. The tokens live
at the top of `src/styles.css` (light under `:root`, dark under `[data-theme='dark']` and
`prefers-color-scheme: dark`); never hard-code a color that has a token.

## Brand

- **The macaw** (`src/Bird.tsx`): our own drawing in the logo's colors. Poses: `peek`, `hop`,
  `wave`, `read`, `globe`, `nap` (the lesson path, one per unit), `think` (hints), `cheer` and
  `streak` (right answers), `oops` (wrong), `dance` (lesson complete, big achievements). It
  plays its pose when it comes into view and stands still with Reduce Motion.
- **The characters** (`src/characters/`): Open Peeps by Pablo Stanley (CC0), recolored in our
  palette with navy ink, and rigged in code. They breathe, blink at random moments, glance
  around, move their lips with the voice (loudness and roundness from the recording, or the
  text for the phone's voice), and cross-fade between expressions: `idle`, `wave` (hello),
  `happy`, `confused`, `thinking`, `celebrate`. Each role has an outfit detail (bow tie, coat,
  tie, badge, apron, lanyard…). See every one at `#/gallery?test`. Credits in `CREDITS.md`.
- The bird blinks, breathes, glances and cross-fades between poses too.
- **The logo** (`public/brand/`): the full logo on the welcome and celebration screens, the
  mark in headers and, at 5% opacity, behind every lesson.
- Original art only: no other app's characters, mascots or drawings.

## Color

| Token | Use |
| --- | --- |
| `--bg`, `--card`, `--card-2` | page, cards, soft fills (sticker discs, shimmer) |
| `--text`, `--muted`, `--faint` | body text, secondary text, hints and locked labels |
| `--accent` / `--accent-fill` / `--accent-press` | text and icons / filled buttons / their 3D edge |
| `--ok*`, `--close*`, `--wrong*` | right, nearly right, wrong (with `-bg` for banners) |
| `--sun`, `--flame`, `--xp` | streaks, XP, rewards (chests, the +XP pill) |
| `.tone-blue/orange/sky/sun/navy/red/cream` | a unit's color: banner, coins, lesson popup |

Text on a fill meets 4.5:1 (white on `--accent-fill`, navy on sun, sky and cream).

## Type

Plus Jakarta Sans (bundled, works offline). Sizes: `--text-xs` 12 · `--text-sm` 14 ·
`--text-base` 16 · `--text-md` 18 · `--text-lg` 22 · `--text-xl` 28 · `--text-2xl` 34.
Headings 700–800 with `--tight` letter spacing. Settings › Text size scales whole pages
(`zoom` 1.12 / 1.25) so layouts never break.

## Shape and depth

- Radii: `--r-sm` 12, `--r` 16, `--r-lg` 20; coins and avatars are circles.
- Pressable things are **3D**: a solid top and a darker edge below (`box-shadow: 0 4–7px 0`
  the deep color). Pressed, they sink onto the edge (`translateY` by the edge height).
- Cards: `--card`, a 2px `--border` and a 4px `--border` edge.

## Components

- **Buttons**: `.btn` (filled), `.btn.secondary` (card), `.btn.ghost`, `.icon-btn`. Minimum 44×44.
- **Answer tiles**: `.btn.option`, 66px tall, bounce when picked (`tile-pick`); "How do you
  say…" tiles carry a speaker and say themselves.
- **Lesson path**: coins (`.lesson-node`), the lesson popup, reward chests, the sticky unit
  banner and the jump-to-lesson button.
- **Banners**: `.banner.ok / .bad` slide up with the coach's line and the bird.
- **Hints**: `HintBubble` (bird + thought bubble + Hint button).
- **Stickers** (`Sticker`, `UnitArt` in `src/art.tsx`): drawn icons for units and topics. Use
  them instead of emoji for anything that is an icon; emoji stay only inside phrases.
- **Icons** (`Icon` in `src/ui.tsx`): 24×24 line icons in `currentColor`.
- **Loading**: `.shimmer` placeholders (the AI partner thinking) or a spinner inside the button
  that started it; never a blank screen.

## Motion

- Springy (`--spring`) for things that pop in; `--ease-out` for slides. 150–500 ms.
- Celebrations: confetti, the bird dancing, the logo glow. Always skippable (Continue).
- **Reduce Motion**: every animation stops (see the `prefers-reduced-motion` block); the bird
  keeps its pose, chests and coins keep their colors, nothing slides.

## Sound

- One voice at a time through the queue in `lib/audio.ts` (phrases, coach lines, hints).
- Soft synthesized effects (`lib/fx.ts`), off with Settings › Sound effects or the speaker
  button in a lesson's header (which also mutes spoken feedback).

## Accessibility

- Every button, field and image has a name (checked by `e2e/audit.mjs`).
- `lang` on text in the language being learned, so VoiceOver reads it in that language.
- Status changes (`role="status"` / `aria-live`) for results, hints and downloads.
- Light and dark mode for every screen; iPhone sizes first, 16px side gutter.
