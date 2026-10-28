"""Recordings for Practice › Play (shared/play/<lang>.json), with the same free Edge voices as
the rest of the app: assets/audio/play/<lang>/<hash>.mp3.

A clip is named by the FNV-1a hash of "<voice>|<text>" (see clip() in web/src/lib/play.ts):
"n" is the narrator, the bird and your own lines (the language's main voice); "t" is the other
person on a phone call (the second voice). Lines the app asks for that aren't here are read by
the phone's own voice, so nothing breaks if a recording is missing.

Run:  scripts/.venv/bin/python scripts/generate_play_audio.py [es fr zh pt it]
"""

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_audio import AUDIO_DIR, ROOT, SECOND_VOICES, VOICES, Texts, run_jobs, synth  # noqa: E402

PLAY_DIR = ROOT / "shared" / "play"
OUT_DIR = AUDIO_DIR / "play"


def fnv(text: str) -> str:
    h = 0x811C9DC5
    for b in text.encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def clips(data: dict) -> list[tuple[str, str]]:
    """Every (voice, text) the Play screens may say."""
    out: list[tuple[str, str]] = []
    for a in data["adventures"]:
        for s in a["scenes"].values():
            out.append(("n", s["text"]))
            out += [("n", c["text"]) for c in s.get("choices", [])]
    for c in data["calls"]:
        out += [("t" if line["who"] == "them" else "n", line["text"]) for line in c["lines"]]
    lines = data["teach"]["lines"]
    out += [("n", lines["yes"]["text"]), ("n", lines["no"]["text"])]
    for w in data["teach"]["words"]:
        out += [("n", lines["intro"]["text"].replace("{w}", w["word"])), ("n", w["explain"])]
    for s in data["spot"]:
        right = [s["fix"] if i == s["bad"] else w for i, w in enumerate(s["words"])]
        out += [("n", data["join"].join(s["words"])), ("n", data["join"].join(right))]
    for m in data["missions"]:
        out += [("n", p["text"]) for p in m["phrases"]]
    out += [("n", p["text"]) for p in data["debate"]["phrases"]]
    seen, unique = set(), []
    for v, t in out:
        if (v, t) not in seen:
            seen.add((v, t))
            unique.append((v, t))
    return unique


async def main(langs: list[str]) -> None:
    made = 0
    for lang in langs:
        file = PLAY_DIR / f"{lang}.json"
        if not file.exists():
            continue
        folder = OUT_DIR / lang
        folder.mkdir(parents=True, exist_ok=True)
        texts = Texts(folder)
        wanted = set()
        jobs = []
        for who, text in clips(json.loads(file.read_text(encoding="utf-8"))):
            name = fnv(f"{who}|{text}")
            wanted.add(f"{name}.mp3")
            voice = SECOND_VOICES[lang] if who == "t" else VOICES[lang]
            key = f"{voice}|{text}"
            out = folder / f"{name}.mp3"
            if not texts.stale(name, out, key):
                continue

            async def make(text=text, out=out, name=name, voice=voice, key=key):
                await synth(text, voice, out)
                texts.made(name, key)

            jobs.append((f"play {lang}  {name}: {text}", make))
        made += await run_jobs(jobs)
        for old in folder.glob("*.mp3"):  # lines no longer in the content
            if old.name not in wanted:
                old.unlink()
                texts.data.pop(old.stem, None)
        texts.save()
        print(f"play {lang}: {len(wanted)} clips")
    print(f"Done. {made} new file(s).")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:] or list(VOICES)))
