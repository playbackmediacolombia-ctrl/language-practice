"""Writes shared/play/<lang>.json (Practice › Play) from scripts/content/play_<lang>.py, after
checking it: every story choice leads somewhere and every scene and ending can be reached,
every chat turn has exactly one reply that fits, every "spot the mistake" fix differs from the
mistake, and so on.

Run:  python3 scripts/content/play.py es fr zh pt it
"""

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / "shared" / "play"


def load(lang: str):
    spec = importlib.util.spec_from_file_location(f"play_{lang}", HERE / f"play_{lang}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def fail(msg: str):
    sys.exit(f"play: {msg}")


def adventure(a: dict) -> dict:
    scenes = {}
    for sid, scene in a["scenes"].items():
        text, en, rest = scene
        if isinstance(rest, str):
            if rest not in ("great", "good"):
                fail(f"{a['id']}/{sid}: an ending is 'great' or 'good'")
            scenes[sid] = {"text": text, "en": en, "end": rest}
        else:
            if len(rest) < 2:
                fail(f"{a['id']}/{sid}: needs at least two choices")
            for _, _, to in rest:
                if to not in a["scenes"]:
                    fail(f"{a['id']}/{sid}: choice leads to missing scene {to}")
            if len({c[0] for c in rest}) != len(rest):
                fail(f"{a['id']}/{sid}: two choices say the same thing")
            scenes[sid] = {"text": text, "en": en, "choices": [{"text": t, "en": e, "to": to} for t, e, to in rest]}
    # Everything reachable from the start, and at least one ending.
    seen, todo = set(), ["s1"]
    while todo:
        sid = todo.pop()
        if sid in seen:
            continue
        seen.add(sid)
        todo += [c["to"] for c in scenes[sid].get("choices", [])]
    if seen != set(scenes):
        fail(f"{a['id']}: unreachable scenes {sorted(set(scenes) - seen)}")
    if not any("end" in s for s in scenes.values()):
        fail(f"{a['id']}: no ending")
    return {k: a[k] for k in ("id", "band", "kind", "guide", "title", "en")} | {"start": "s1", "scenes": scenes}


def chat(c: dict) -> dict:
    messages = []
    for who, *rest in c["messages"]:
        if who == "them":
            messages.append({"from": "them", "text": rest[0], "en": rest[1]})
        else:
            options = rest[0]
            if sum(1 for o in options if o[2] is None) != 1:
                fail(f"chat {c['id']}: each of your turns needs exactly one reply that fits")
            messages.append({"from": "you", "options": [{"text": t, "en": e, "why": why} for t, e, why in options]})
    return {k: c[k] for k in ("id", "band", "title", "en", "them", "avatar")} | {
        "slang": [{"term": t, "means": m} for t, m in c["slang"]],
        "messages": messages,
    }


def build(lang: str) -> dict:
    m = load(lang)
    teach_ids = set()
    words = []
    for band, word, en, explain, explain_en, keywords in m.TEACH:
        wid = en.split("/")[0].strip().lower().removeprefix("the ").replace(" ", "-").replace("'", "")
        if wid in teach_ids:
            fail(f"teach: two words with id {wid}")
        teach_ids.add(wid)
        if not keywords:
            fail(f"teach {wid}: needs keywords")
        words.append({"id": wid, "band": band, "word": word, "en": en, "explain": explain, "explainEn": explain_en, "keywords": keywords})
    spot = []
    for i, (band, sentence, bad, fix, wrong, en, why) in enumerate(m.SPOT):
        if not 0 <= bad < len(sentence):
            fail(f"spot {i}: no word {bad}")
        if fix == sentence[bad] or fix in wrong or sentence[bad] in wrong:
            fail(f"spot {i}: the fix must differ from the mistake and from the wrong options")
        spot.append({"id": f"s{i + 1}", "band": band, "words": sentence, "bad": bad, "fix": fix, "options": [fix, *wrong], "en": en, "why": why})
    for kind, items in (("adventures", m.ADVENTURES), ("calls", m.CALLS), ("chats", m.CHATS), ("missions", m.MISSIONS)):
        ids = [x["id"] for x in items]
        if len(ids) != len(set(ids)):
            fail(f"{kind}: duplicate ids")
    lines = {k: {"text": t, "en": e} for k, (t, e) in m.TEACH_LINES.items()}
    if "{w}" not in lines["intro"]["text"]:
        fail("teach intro needs {w}")
    return {
        "join": "" if lang == "zh" else " ",
        "adventures": [adventure(a) for a in m.ADVENTURES],
        "calls": [
            {k: c[k] for k in ("id", "band", "incoming", "title", "en", "them", "number", "setting")} | {"lines": [{"who": w, "text": t, "en": e} for w, t, e in c["lines"]]}
            for c in m.CALLS
        ],
        "chats": [chat(c) for c in m.CHATS],
        "teach": {"lines": lines, "words": words},
        "spot": spot,
        "missions": [{k: x[k] for k in ("id", "band", "title", "en", "task")} | {"phrases": [{"text": t, "en": e} for t, e in x["phrases"]]} for x in m.MISSIONS],
        "debate": {"topics": [{"id": i, "en": e, "title": t} for i, e, t in m.DEBATES], "phrases": [{"text": t, "en": e} for t, e in m.DEBATE_PHRASES]},
    }


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for lang in sys.argv[1:] or ["es", "fr", "zh", "pt", "it"]:
        data = build(lang)
        (OUT / f"{lang}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        n = {k: len(v) for k, v in data.items() if isinstance(v, list)}
        print(f"play {lang}: {n}, {len(data['teach']['words'])} teach words, {len(data['debate']['topics'])} debates")
