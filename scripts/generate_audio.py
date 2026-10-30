"""Generate one MP3 per phrase per language with the free Edge online voices.

Run:  scripts/.venv/bin/python scripts/generate_audio.py
Files that already exist are skipped, so this only does work for new phrases.
It also rewrites src/data/audio.ts, the static require() map the app uses.
"""

import asyncio
import hashlib
import json
import re
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
PHRASES = ROOT / "shared" / "phrases.json"
AUDIO_DIR = ROOT / "assets" / "audio"
INDEX = ROOT / "src" / "data" / "audio.ts"
# Spoken feedback after Listen & repeat (web app only); lessons use COACH below.
FEEDBACK_DIR = ROOT / "web" / "public" / "feedback"
FEEDBACK_VOICE = "en-US-AvaNeural"
FEEDBACK = {
    "great": "Great!",
    "close": "Close, try again.",
    "retry": "Not quite, listen again.",
    "nohear": "I didn't hear you, tap the mic to try again.",
    "off-sound": "One of the sounds was a little off.",
    "tone-1": "Check the tone. Stay high and flat, like holding one long note.",
    "tone-2": "Check the tone. Start in the middle and rise, like asking what?",
    "tone-3": "Check the tone. Start lower and dip down, then rise.",
    "tone-4": "Check the tone. Start high and drop fast, like a firm no!",
    "tone-5": "Check the tone. Keep it light and short.",
}
# Varied praise and encouragement in lessons: assets/audio/feedback/<voice>/<category>-<n>.mp3.
COACH = ROOT / "shared" / "feedback.json"
COACH_AUDIO_DIR = AUDIO_DIR / "feedback"
# The lesson path: one clip per course item, in assets/audio/course/<lang>/<item id>.mp3.
COURSE_DIR = ROOT / "shared" / "course"
COURSE_AUDIO_DIR = AUDIO_DIR / "course"

VOICES = {
    "es": "es-CO-SalomeNeural",
    "fr": "fr-FR-DeniseNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "pt": "pt-BR-FranciscaNeural",
    "it": "it-IT-ElsaNeural",
}
# Stories and dialogues: assets/audio/stories/<lang>/<story id>-<line>.mp3. Narration and dialogue
# speakers with "voice": "a" use VOICES; speakers with "voice": "b" use this second (male) voice.
STORIES_DIR = ROOT / "shared" / "stories"
STORIES_AUDIO_DIR = AUDIO_DIR / "stories"
# Role-plays: assets/audio/scenarios/<lang>/<id>-<line>.mp3. The other person speaks in the
# second voice; your lines (the model to copy) in the first.
SCENARIOS_DIR = ROOT / "shared" / "scenarios"
# Reading practice: news-style articles, read aloud sentence by sentence like stories
# (their clips go in the stories folder, since the app plays them the same way).
READING_DIR = ROOT / "shared" / "reading"
# Chants and songs (music mode): one clip per line plus each word's timing, for karaoke.
CHANTS_DIR = ROOT / "shared" / "chants"
CHANTS_AUDIO_DIR = AUDIO_DIR / "chants"
SCENARIOS_AUDIO_DIR = AUDIO_DIR / "scenarios"
SECOND_VOICES = {
    "es": "es-CO-GonzaloNeural",
    "fr": "fr-FR-HenriNeural",
    "zh": "zh-CN-YunxiNeural",
    "pt": "pt-BR-AntonioNeural",
    "it": "it-IT-DiegoNeural",
}
# Slightly slower than normal speech, easier for a learner to follow.
RATE = "-10%"
# Hands-free mode says each word's English meaning first: one clip per distinct meaning (course
# and phrasebook), assets/audio/en/<slug>-<hash>.mp3, listed in shared/en-audio.json (text → file).
EN_DIR = AUDIO_DIR / "en"
EN_INDEX = ROOT / "shared" / "en-audio.json"
EN_VOICE = "en-US-AndrewNeural"


def spoken_english(text: str) -> str:
    """How a meaning is read aloud: notes like "(woman)" and "lit." spelled out, "/" as "or"."""
    text = text.replace(" / ", ", or ").replace("(lit. ", "(literally, ")
    text = re.sub(r"\((man|woman)\)", r"(said by a \1)", text)
    # Emoji are for the eye only; the voice would read them out (or fail on them).
    return re.sub(r"\s*[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200D]+", "", text).strip()


def english_file(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40].strip("-")
    return f"{slug}-{hashlib.sha1(text.encode()).hexdigest()[:8]}.mp3"


def text_for(phrase: dict, lang: str) -> str:
    value = phrase[lang]
    return value["hanzi"] if lang == "zh" else value


async def synth(text: str, voice: str, out: Path) -> None:
    for attempt in range(5):
        try:
            await edge_tts.Communicate(text, voice, rate=RATE).save(str(out))
            return
        except Exception as err:  # network hiccups and throttling happen; back off and retry
            if attempt == 4:
                raise
            print(f"  retrying {out.name}: {err}")
            await asyncio.sleep(3 * (attempt + 1))


async def synth_words(text: str, voice: str, out: Path) -> list:
    """Like synth, but also returns each word's [start ms, length ms, text] (edge-tts word boundaries)."""
    for attempt in range(5):
        try:
            words, audio = [], bytearray()
            async for chunk in edge_tts.Communicate(text, voice, rate=RATE, boundary="WordBoundary").stream():
                if chunk["type"] == "audio":
                    audio += chunk["data"]
                elif chunk["type"] == "WordBoundary":
                    words.append([round(chunk["offset"] / 10_000), round(chunk["duration"] / 10_000), chunk["text"]])
            if not audio:
                raise RuntimeError("no audio")
            out.write_bytes(bytes(audio))
            return words
        except Exception as err:
            if attempt == 4:
                raise
            print(f"  retrying {out.name}: {err}")
            await asyncio.sleep(3 * (attempt + 1))


class Texts:
    """What each clip in a folder says (texts.json), so a clip is remade when its text changes.
    A clip that exists but isn't listed yet is taken to match its current text."""

    def __init__(self, folder: Path):
        self.file = folder / "texts.json"
        self.data = json.loads(self.file.read_text(encoding="utf-8")) if self.file.exists() else {}

    def stale(self, name: str, out: Path, text: str) -> bool:
        if not (out.exists() and out.stat().st_size > 0):
            return True
        self.data.setdefault(name, text)
        return self.data[name] != text

    def made(self, name: str, text: str) -> None:
        self.data[name] = text

    def save(self) -> None:
        self.file.write_text(json.dumps(self.data, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


# Clips are made a few at a time: each one is a round trip to the voice service.
PARALLEL = 6


async def run_jobs(jobs: list) -> int:
    """Runs (label, make) jobs, PARALLEL at a time; `make` is an async function doing one clip."""
    limit = asyncio.Semaphore(PARALLEL)

    async def one(label, make):
        async with limit:
            print(label, flush=True)
            await make()

    await asyncio.gather(*(one(label, make) for label, make in jobs))
    return len(jobs)


async def main() -> None:
    data = json.loads(PHRASES.read_text(encoding="utf-8"))
    phrases = [p for topic in data["topics"] for p in topic["phrases"]]

    made = 0
    for lang, voice in VOICES.items():
        (AUDIO_DIR / lang).mkdir(parents=True, exist_ok=True)
        texts = Texts(AUDIO_DIR / lang)
        jobs = []
        for phrase in phrases:
            out = AUDIO_DIR / lang / f"{phrase['id']}.mp3"
            text = text_for(phrase, lang)
            if not texts.stale(phrase["id"], out, text):
                continue

            async def make(text=text, out=out, name=phrase["id"], voice=voice, texts=texts):
                await synth(text, voice, out)
                texts.made(name, text)

            jobs.append((f"{lang}  {phrase['id']}: {text}", make))
        made += await run_jobs(jobs)
        texts.save()

    for lang, voice in VOICES.items():
        course = json.loads((COURSE_DIR / f"{lang}.json").read_text(encoding="utf-8"))
        (COURSE_AUDIO_DIR / lang).mkdir(parents=True, exist_ok=True)
        texts = Texts(COURSE_AUDIO_DIR / lang)
        jobs = []
        for unit in course["units"]:
            for lesson in unit["lessons"]:
                for item in lesson["items"]:
                    out = COURSE_AUDIO_DIR / lang / f"{item['id']}.mp3"
                    text = item.get("say", item["text"])
                    if not texts.stale(item["id"], out, text):
                        continue

                    async def make(text=text, out=out, name=item["id"], voice=voice, texts=texts):
                        await synth(text, voice, out)
                        texts.made(name, text)

                    jobs.append((f"course {lang}  {item['id']}: {text}", make))
        made += await run_jobs(jobs)
        texts.save()

    # Clips are named by position, so remember each one's text and remake it if that changes.
    coach = json.loads(COACH.read_text(encoding="utf-8"))
    for lang, voice in {**VOICES, "en": FEEDBACK_VOICE}.items():
        folder = COACH_AUDIO_DIR / lang
        folder.mkdir(parents=True, exist_ok=True)
        texts_file = folder / "texts.json"
        texts = json.loads(texts_file.read_text(encoding="utf-8")) if texts_file.exists() else {}
        jobs = []
        for category, lines in coach[lang].items():
            for i, line in enumerate(lines):
                name = f"{category}-{i}"
                out = folder / f"{name}.mp3"
                if out.exists() and out.stat().st_size > 0 and texts.get(name) == line["text"]:
                    continue

                async def make(text=line["text"], out=out, name=name, voice=voice, texts=texts):
                    await synth(text, voice, out)
                    texts[name] = text

                jobs.append((f"feedback {lang}  {name}: {line['text']}", make))
        made += await run_jobs(jobs)
        texts_file.write_text(json.dumps(texts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for lang, voice in VOICES.items():
        file = STORIES_DIR / f"{lang}.json"
        if not file.exists():
            continue
        folder = STORIES_AUDIO_DIR / lang
        folder.mkdir(parents=True, exist_ok=True)
        texts_file = folder / "texts.json"
        texts = json.loads(texts_file.read_text(encoding="utf-8")) if texts_file.exists() else {}
        stories = json.loads(file.read_text(encoding="utf-8"))["stories"]
        reading = READING_DIR / f"{lang}.json"
        if reading.exists():
            stories += json.loads(reading.read_text(encoding="utf-8"))["articles"]
        jobs = []
        for story in stories:
            speakers = story.get("speakers", {})
            for i, line in enumerate(story["lines"]):
                name = f"{story['id']}-{i}"
                who = speakers.get(line.get("speaker"), {}).get("voice", "a")
                line_voice = SECOND_VOICES[lang] if who == "b" else voice
                key = f"{line_voice}|{line['text']}"
                out = folder / f"{name}.mp3"
                if out.exists() and out.stat().st_size > 0 and texts.get(name) == key:
                    continue

                async def make(text=line["text"], out=out, name=name, voice=line_voice, key=key, texts=texts):
                    await synth(text, voice, out)
                    texts[name] = key

                jobs.append((f"story {lang}  {name}: {line['text']}", make))
        made += await run_jobs(jobs)
        texts_file.write_text(json.dumps(texts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for lang, voice in VOICES.items():
        file = SCENARIOS_DIR / f"{lang}.json"
        if not file.exists():
            continue
        folder = SCENARIOS_AUDIO_DIR / lang
        folder.mkdir(parents=True, exist_ok=True)
        texts = Texts(folder)
        jobs = []
        for scenario in json.loads(file.read_text(encoding="utf-8"))["scenarios"]:
            for i, line in enumerate(scenario["lines"]):
                name = f"{scenario['id']}-{i}"
                line_voice = SECOND_VOICES[lang] if line["who"] == "them" else voice
                key = f"{line_voice}|{line['text']}"
                out = folder / f"{name}.mp3"
                if not texts.stale(name, out, key):
                    continue

                async def make(text=line["text"], out=out, name=name, voice=line_voice, key=key, texts=texts):
                    await synth(text, voice, out)
                    texts.made(name, key)

                jobs.append((f"role-play {lang}  {name}: {line['text']}", make))
        made += await run_jobs(jobs)
        texts.save()

    for lang, voice in VOICES.items():
        file = CHANTS_DIR / f"{lang}.json"
        if not file.exists():
            continue
        folder = CHANTS_AUDIO_DIR / lang
        folder.mkdir(parents=True, exist_ok=True)
        texts = Texts(folder)
        timings_file = folder / "timings.json"
        timings = json.loads(timings_file.read_text(encoding="utf-8")) if timings_file.exists() else {}
        jobs = []
        for chant in json.loads(file.read_text(encoding="utf-8"))["chants"]:
            for i, line in enumerate(chant["lines"]):
                name = f"{chant['id']}-{i}"
                key = f"{voice}|{line['text']}"
                out = folder / f"{name}.mp3"
                if not texts.stale(name, out, key) and name in timings:
                    continue

                async def make(text=line["text"], out=out, name=name, voice=voice, key=key, texts=texts, timings=timings):
                    timings[name] = await synth_words(text, voice, out)
                    texts.made(name, key)

                jobs.append((f"chant {lang}  {name}: {line['text']}", make))
        made += await run_jobs(jobs)
        texts.save()
        timings_file.write_text(json.dumps(timings, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")

    meanings = {p["en"] for p in phrases}
    for lang in VOICES:
        course = json.loads((COURSE_DIR / f"{lang}.json").read_text(encoding="utf-8"))
        meanings |= {i["en"] for u in course["units"] for le in u["lessons"] for i in le["items"] if i.get("kind") != "sound"}
    EN_DIR.mkdir(parents=True, exist_ok=True)
    index = {text: english_file(text) for text in sorted(meanings)}
    todo = [t for t, f in index.items() if not ((EN_DIR / f).exists() and (EN_DIR / f).stat().st_size > 0)]
    # Several at a time: there are hundreds of these and each one is a round trip.
    limit = asyncio.Semaphore(3)

    async def english(text: str) -> None:
        async with limit:
            print(f"english  {text}", flush=True)
            await synth(spoken_english(text), EN_VOICE, EN_DIR / index[text])

    await asyncio.gather(*(english(t) for t in todo))
    made += len(todo)
    for old in EN_DIR.glob("*.mp3"):  # meanings no longer used
        if old.name not in index.values():
            old.unlink()
    EN_INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")

    FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
    for name, text in FEEDBACK.items():
        out = FEEDBACK_DIR / f"{name}.mp3"
        if out.exists() and out.stat().st_size > 0:
            continue
        print(f"feedback  {name}")
        await synth(text, FEEDBACK_VOICE, out)
        made += 1

    lines = [
        "// Generated by scripts/generate_audio.py. Do not edit by hand.",
        "export const audio: Record<string, Record<string, number>> = {",
    ]
    for lang in VOICES:
        lines.append(f"  {lang}: {{")
        for phrase in phrases:
            lines.append(f"    '{phrase['id']}': require('../../assets/audio/{lang}/{phrase['id']}.mp3'),")
        lines.append("  },")
    lines.append("};")
    INDEX.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Done. {made} new file(s); index written to {INDEX.relative_to(ROOT)}")


if __name__ == "__main__":
    asyncio.run(main())
