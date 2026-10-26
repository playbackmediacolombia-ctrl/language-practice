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
    "great": "Great job!",
    "close": "Close, try again.",
    "retry": "Not quite. Listen, and try again.",
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
}
# Stories and dialogues: assets/audio/stories/<lang>/<story id>-<line>.mp3. Narration and dialogue
# speakers with "voice": "a" use VOICES; speakers with "voice": "b" use this second (male) voice.
STORIES_DIR = ROOT / "shared" / "stories"
STORIES_AUDIO_DIR = AUDIO_DIR / "stories"
SECOND_VOICES = {
    "es": "es-CO-GonzaloNeural",
    "fr": "fr-FR-HenriNeural",
    "zh": "zh-CN-YunxiNeural",
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
    return text


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


async def main() -> None:
    data = json.loads(PHRASES.read_text(encoding="utf-8"))
    phrases = [p for topic in data["topics"] for p in topic["phrases"]]

    made = 0
    for lang, voice in VOICES.items():
        (AUDIO_DIR / lang).mkdir(parents=True, exist_ok=True)
        for phrase in phrases:
            out = AUDIO_DIR / lang / f"{phrase['id']}.mp3"
            if out.exists() and out.stat().st_size > 0:
                continue
            print(f"{lang}  {phrase['id']}")
            await synth(text_for(phrase, lang), voice, out)
            made += 1

    for lang, voice in VOICES.items():
        course = json.loads((COURSE_DIR / f"{lang}.json").read_text(encoding="utf-8"))
        (COURSE_AUDIO_DIR / lang).mkdir(parents=True, exist_ok=True)
        for unit in course["units"]:
            for lesson in unit["lessons"]:
                for item in lesson["items"]:
                    out = COURSE_AUDIO_DIR / lang / f"{item['id']}.mp3"
                    if out.exists() and out.stat().st_size > 0:
                        continue
                    print(f"course {lang}  {item['id']}")
                    await synth(item.get("say", item["text"]), voice, out)
                    made += 1

    # Clips are named by position, so remember each one's text and remake it if that changes.
    coach = json.loads(COACH.read_text(encoding="utf-8"))
    for lang, voice in {**VOICES, "en": FEEDBACK_VOICE}.items():
        folder = COACH_AUDIO_DIR / lang
        folder.mkdir(parents=True, exist_ok=True)
        texts_file = folder / "texts.json"
        texts = json.loads(texts_file.read_text(encoding="utf-8")) if texts_file.exists() else {}
        for category, lines in coach[lang].items():
            for i, line in enumerate(lines):
                name = f"{category}-{i}"
                out = folder / f"{name}.mp3"
                if out.exists() and out.stat().st_size > 0 and texts.get(name) == line["text"]:
                    continue
                print(f"feedback {lang}  {name}: {line['text']}")
                await synth(line["text"], voice, out)
                texts[name] = line["text"]
                made += 1
        texts_file.write_text(json.dumps(texts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for lang, voice in VOICES.items():
        file = STORIES_DIR / f"{lang}.json"
        if not file.exists():
            continue
        folder = STORIES_AUDIO_DIR / lang
        folder.mkdir(parents=True, exist_ok=True)
        texts_file = folder / "texts.json"
        texts = json.loads(texts_file.read_text(encoding="utf-8")) if texts_file.exists() else {}
        for story in json.loads(file.read_text(encoding="utf-8"))["stories"]:
            speakers = story.get("speakers", {})
            for i, line in enumerate(story["lines"]):
                name = f"{story['id']}-{i}"
                who = speakers.get(line.get("speaker"), {}).get("voice", "a")
                line_voice = SECOND_VOICES[lang] if who == "b" else voice
                key = f"{line_voice}|{line['text']}"
                out = folder / f"{name}.mp3"
                if out.exists() and out.stat().st_size > 0 and texts.get(name) == key:
                    continue
                print(f"story {lang}  {name}: {line['text']}")
                await synth(line["text"], line_voice, out)
                texts[name] = key
                made += 1
        texts_file.write_text(json.dumps(texts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

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
