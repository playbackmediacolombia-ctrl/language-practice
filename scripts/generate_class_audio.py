"""Record the Classes (shared/classes/<lang>.json) with the free Edge online voices.

The teacher speaks English, slowly and warmly (en-US-AvaNeural, the voice of the app's spoken
feedback); letter names and pre-taught words use each language's own course voice.
Clips go in assets/audio/class/<lang>/ and are skipped if they already exist.
Also records any course meaning still missing from shared/en-audio.json.

Run:  scripts/.venv/bin/python scripts/generate_class_audio.py
"""

import asyncio
import json
import sys
from pathlib import Path

import edge_tts

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_audio import EN_DIR, EN_INDEX, EN_VOICE, VOICES, english_file, spoken_english  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio"
TEACHER = "en-US-AvaNeural"
TEACHER_RATE = "-12%"  # slow and clear
WORD_RATE = "-15%"


async def synth(text: str, voice: str, out: Path, rate: str, required: bool = True) -> bool:
    for attempt in range(6):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(out))
            if out.stat().st_size > 0:
                return True
        except Exception as err:  # network hiccups and throttling happen; back off and retry
            if attempt == 5:
                if required:
                    raise
                # A bare sound like “mah” gets no audio back: leave it without an English clip.
                out.unlink(missing_ok=True)
                print(f"  skipped {out.name}: {err}", flush=True)
                return False
            print(f"  retrying {out.name}: {err}", flush=True)
            await asyncio.sleep(3 * (attempt + 1))
    return False


def clips(lang: str, data: dict) -> dict:
    """Every clip a Class needs: path → (text, voice, rate)."""
    out = {}

    def walk(o):
        if isinstance(o, dict):
            a = o.get("audio")
            if isinstance(a, str) and a.startswith(f"class/{lang}/"):
                name = a.rsplit("/", 1)[1]
                if name.startswith("n-"):
                    out[a] = (o["text"], TEACHER, TEACHER_RATE)
                elif name.startswith("w-"):
                    out[a] = (o["text"], VOICES[lang], WORD_RATE)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(data)
    for _letter, name, path in data["letters"]:
        out[path] = (name, VOICES[lang], WORD_RATE)
    return out


async def main():
    todo = {}
    for lang in ["es", "fr", "zh", "pt", "it"]:
        data = json.loads((ROOT / "shared" / "classes" / f"{lang}.json").read_text(encoding="utf-8"))
        (AUDIO / "class" / lang).mkdir(parents=True, exist_ok=True)
        wanted = clips(lang, data)
        for path, job in wanted.items():
            f = AUDIO / path
            if not (f.exists() and f.stat().st_size > 0):
                todo[f] = job
        for old in (AUDIO / "class" / lang).glob("*.mp3"):  # clips no longer used
            if f"class/{lang}/{old.name}" not in wanted:
                old.unlink()
    # Course meanings still without an English clip.
    index = json.loads(EN_INDEX.read_text(encoding="utf-8"))
    for lang in ["es", "fr", "zh", "pt", "it"]:
        for u in json.loads((ROOT / "shared" / "course" / f"{lang}.json").read_text(encoding="utf-8"))["units"]:
            for l in u["lessons"]:
                for i in l["items"]:
                    if i["en"] not in index and i.get("kind") != "sound":
                        index[i["en"]] = english_file(i["en"])
                        todo[EN_DIR / index[i["en"]]] = (spoken_english(i["en"]), EN_VOICE, "-10%", i["en"])
    print(f"{len(todo)} clips to record", flush=True)
    limit = asyncio.Semaphore(6)
    done = 0

    async def one(f, job):
        nonlocal done
        async with limit:
            ok = await synth(job[0], job[1], f, job[2], required=len(job) < 4)
            if not ok and len(job) == 4:
                index.pop(job[3], None)
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(todo)}", flush=True)

    await asyncio.gather(*(one(f, j) for f, j in todo.items()))
    EN_INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print("done", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
