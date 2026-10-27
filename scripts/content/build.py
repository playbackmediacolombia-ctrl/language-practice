"""Writes a language's course JSON from scripts/content/course_<lang>.py.

Run:  python3 scripts/content/build.py pt it
Item ids are made from the text (accents dropped), with the unit's prefix (dt-, fl-, cu-) for the
dating, flirting and culture units, unless an item gives its own "id". Lesson ids are
<lang>-<unit>-<n>, the same outline as every other language.
"""

import importlib.util
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# A word as the app splits story lines for tap-to-translate (see shared/tokens.ts).
WORD = re.compile(r"[^\W\d_]+(?:['’-][^\W\d_]+)*")
HERE = Path(__file__).resolve().parent


def slug(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:48].strip("-")


def load(name: str):
    spec = importlib.util.spec_from_file_location(name, HERE / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build_course(lang: str) -> dict:
    units = []
    seen: set[str] = set()
    for unit in load(f"course_{lang}").UNITS:
        uid, title, *rest = unit
        prefix = rest[0] if isinstance(rest[0], str) else ""
        lessons_raw = rest[-1]
        n = int(uid[1:])
        lessons = []
        for i, lesson in enumerate(lessons_raw, 1):
            ltitle, items_raw, *quiz = lesson
            items = []
            for raw in items_raw:
                text, en, *extra = raw
                extra = dict(extra[0]) if extra else {}
                iid = extra.pop("id", None) or prefix + slug(text)
                assert iid not in seen, f"{lang}: duplicate id {iid}"
                seen.add(iid)
                items.append({"id": iid, "text": text, "en": en, **extra})
            entry = {"id": f"{lang}-{n}-{i}", "title": ltitle, "items": items}
            if quiz:
                entry["quiz"] = quiz[0]
            lessons.append(entry)
        units.append({"id": uid, "title": title, "lessons": lessons})
    return {"units": units}


def lesson_order(course: dict) -> dict[str, int]:
    return {l["id"]: i for i, l in enumerate(l for u in course["units"] for l in u["lessons"])}


def item_id(course: dict, text: str, lesson_id: str) -> str:
    """The id of the course item with this text, preferring the tip's own lesson."""
    lessons = [l for u in course["units"] for l in u["lessons"]]
    for l in sorted(lessons, key=lambda l: l["id"] != lesson_id):
        for item in l["items"]:
            if item["text"] == text:
                return item["id"]
    raise SystemExit(f"tip for {lesson_id}: no course item “{text}”")


def build_grammar(lang: str, course: dict) -> dict:
    order = lesson_order(course)
    tips = []
    for lesson, title, body, table, examples in load(f"grammar_{lang}").TIPS:
        assert lesson in order, f"{lang}: tip for unknown lesson {lesson}"
        tips.append({"lesson": lesson, "title": title, "body": body, "table": table, "examples": [item_id(course, t, lesson) for t in examples]})
    tips.sort(key=lambda t: order[t["lesson"]])
    return {"tips": tips}


def write(kind: str, lang: str, data: dict) -> Path:
    out = ROOT / "shared" / kind / f"{lang}.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    return out


def main(langs: list[str]) -> None:
    for lang in langs:
        course = build_course(lang)
        out = write("course", lang, course)
        items = sum(len(l["items"]) for u in course["units"] for l in u["lessons"])
        print(f"{lang}: {len(course['units'])} units, {sum(len(u['lessons']) for u in course['units'])} lessons, {items} items -> {out.relative_to(ROOT)}")
        if (HERE / f"grammar_{lang}.py").exists():
            grammar = build_grammar(lang, course)
            print(f"{lang}: {len(grammar['tips'])} tips -> {write('grammar', lang, grammar).relative_to(ROOT)}")
        if (HERE / f"stories_{lang}.py").exists():
            stories = {"stories": [story(s) for s in load(f"stories_{lang}").STORIES]}
            print(f"{lang}: {len(stories['stories'])} stories -> {write('stories', lang, stories).relative_to(ROOT)}")
        if (HERE / f"reading_{lang}.py").exists():
            articles = {"articles": [story({**a, "kind": "article"}) for a in load(f"reading_{lang}").ARTICLES]}
            print(f"{lang}: {len(articles['articles'])} articles -> {write('reading', lang, articles).relative_to(ROOT)}")
        if (HERE / f"scenarios_{lang}.py").exists():
            scenarios = {"scenarios": [scenario(s) for s in load(f"scenarios_{lang}").SCENARIOS]}
            print(f"{lang}: {len(scenarios['scenarios'])} role-plays -> {write('scenarios', lang, scenarios).relative_to(ROOT)}")
        if (HERE / f"extras_{lang}.py").exists():
            extras = load(f"extras_{lang}")
            chants = {"chants": [{**c, "lines": [{"text": t, "en": e} for t, e in c["lines"]]} for c in extras.CHANTS]}
            print(f"{lang}: {len(chants['chants'])} chants -> {write('chants', lang, chants).relative_to(ROOT)}")
            merge_phrases(lang, extras.PHRASES)
            merge_feedback(lang, extras.FEEDBACK)


def story(raw: dict) -> dict:
    """Lines as dicts; warns about words the glossary doesn't cover (they fall back to the line's English)."""
    lines = [{"speaker": l[0], "text": l[1], "en": l[2]} if len(l) == 3 else {"text": l[0], "en": l[1]} for l in raw["lines"]]
    words = {m.group(0).lower().replace("’", "'") for l in lines for m in WORD.finditer(l["text"])}
    missing = sorted(words - set(raw["glossary"]))
    if missing:
        print(f"  {raw['id']}: not glossed: {', '.join(missing)}")
    order = ["id", "level", "kind", "topic", "title", "en", "place", "speakers"]
    out = {k: raw[k] for k in order if k in raw}
    return {**out, "lines": lines, "glossary": raw["glossary"], "questions": raw["questions"]}


def scenario(raw: tuple) -> dict:
    sid, level, topic, title, en, setting, them, lines = raw
    out = []
    for who, text, line_en, *alt in lines:
        line = {"who": "them" if who == "t" else "you", "text": text, "en": line_en}
        if alt:
            line["alt"] = alt[0]
        out.append(line)
    return {"id": sid, "topic": topic, "level": level, "title": title, "en": en, "setting": setting, "them": them, "lines": out}


def merge_phrases(lang: str, phrases: dict[str, str]) -> None:
    path = ROOT / "shared" / "phrases.json"
    data = json.loads(path.read_text())
    ids = {p["id"] for t in data["topics"] for p in t["phrases"]}
    assert ids == set(phrases), f"{lang} phrasebook: missing {ids - set(phrases)}, extra {set(phrases) - ids}"
    for t in data["topics"]:
        for p in t["phrases"]:
            p[lang] = phrases[p["id"]]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"{lang}: {len(phrases)} phrasebook phrases -> shared/phrases.json")


def merge_feedback(lang: str, feedback: dict) -> None:
    path = ROOT / "shared" / "feedback.json"
    data = json.loads(path.read_text())
    assert set(feedback) == set(data["es"]), f"{lang} feedback categories"
    data[lang] = {k: [{"text": t, "en": e} for t, e in v] for k, v in feedback.items()}
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"{lang}: coach lines -> shared/feedback.json")


if __name__ == "__main__":
    main(sys.argv[1:] or ["pt", "it"])
