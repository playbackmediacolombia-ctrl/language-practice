"""Builds the Classes: shared/classes/<lang>.json, what each unit teaches before it tests.

Each unit's Class introduces every word and phrase of its lessons one at a time (with an example
sentence and pronunciation tips), then its rule cards (the grammar tips, each with a "why it works
this way" note). The first unit's Class is Day 1, for someone who knows nothing.

It also enforces "never test what hasn't been taught":
  * Each role-play, story and article opens with a unit (by its level). Every word in it must
    have been taught in a Class at or before that unit; any line (role-plays) or word (stories,
    articles) that isn't is taught in that unit's Class, and shown again just before it as
    "Words you'll need".
  * A grammar tip whose example sentences come up in an earlier unit moves to that unit's Class.
  * Finally every line of every role-play, story and article is checked against what has been
    taught by then; the build fails if anything slips through.

Writes docs/teach-first.md, the list of what moved and what is taught where.
Run: python3 scripts/content/classes.py   (then scripts/generate_class_audio.py for the clips)
"""

import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from classes_text import ALPHABETS, DAY1, DONE_LINE, EXTRA_INTRO, NEW_RULES, RULE_LINE, SOUND_TIPS, UNIT_INTRO  # noqa: E402
from classes_why import WHY  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SHARED = ROOT / "shared"
LANGS = ["es", "fr", "zh", "pt", "it"]
NAMES = {"es": "Spanish", "fr": "French", "zh": "Mandarin", "pt": "Portuguese", "it": "Italian"}

# Role-play, story and article levels (1 Beginner … 6 Fluent) → the main-path units of that level.
# Day 1 (u1) is only sounds and a greeting, so nothing opens with it.
BANDS = {1: ["u2", "u3", "u4", "u5", "u6"], 2: ["u7", "u8", "u9"], 3: ["u10", "u11"], 4: ["u12", "u13", "u14"], 5: ["u15", "u16", "u17"], 6: ["u18", "u19", "u20"]}
# Dating and flirting content belongs with those optional topics.
TOPIC_UNITS = {"dating": ["u21", "u22", "u23"], "flirting": ["u24", "u25", "u26"]}


def h(text: str) -> str:
    return hashlib.sha1(text.encode()).hexdigest()[:10]


def narration(lang: str, text: str) -> dict:
    """Something the teacher says: its text and its clip (recorded in English)."""
    return {"text": text, "audio": f"class/{lang}/n-{h(text)}.mp3"}


def tokens(text: str, lang: str) -> list:
    text = text.lower()
    if lang == "zh":
        return [c for c in text if "一" <= c <= "鿿"]
    return [w.strip("'’") for w in re.findall(r"[\w’']+", text) if not w.isdigit() and w.strip("'’")]


def load(name: str, lang: str):
    return json.loads((SHARED / name / f"{lang}.json").read_text(encoding="utf-8"))


def build(lang: str, report: list) -> dict:
    outline = json.loads((SHARED / "course" / "outline.json").read_text(encoding="utf-8"))
    course = {u["id"]: u for u in load("course", lang)["units"]}
    order = []  # every unit in path order, main units and optional topics as they appear
    core = []
    stage_of = {}
    for s in outline["stages"]:
        for u in s["units"]:
            order.append(u)
            core.append(u)
            stage_of[u] = s["id"]
        for u in s.get("electives", []):
            if u in course:
                order.append(u)
                stage_of[u] = s["id"]
    unit_of_item = {}
    items = {}
    for u in order:
        for l in course[u]["lessons"]:
            for i in l["items"]:
                unit_of_item.setdefault(i["id"], u)
                items[i["id"]] = i
    unit_of_lesson = {l["id"]: u for u in order for l in course[u]["lessons"]}

    # ---- Rule cards: the grammar tips (with why), moved earlier if their examples come up sooner ----
    tips = load("grammar", lang)["tips"]
    why = WHY[lang]
    assert len(why) == len(tips), f"{lang}: {len(tips)} tips but {len(why)} why-notes"
    rules = {u: [] for u in order}
    for tip, note in zip(tips, why):
        unit = unit_of_lesson[tip["lesson"]]
        if unit in core:
            earliest = min((core.index(unit_of_item[e]) for e in tip.get("examples", []) if unit_of_item.get(e) in core), default=core.index(unit))
            if earliest < core.index(unit):
                report.append(f"- **{NAMES[lang]}**: the rule “{tip['title']}” moved from {unit} to {core[earliest]}'s Class, because its example sentences are first used there.")
                unit = core[earliest]
        rules[unit].append(
            {
                "title": tip["title"],
                "culture": tip["title"].startswith("Culture"),
                "body": [narration(lang, p) for p in tip["body"]],
                "table": tip.get("table", []),
                "examples": [e for e in tip.get("examples", []) if e in items],
                "why": narration(lang, note),
                "lesson": tip["lesson"],
            }
        )
    for unit, r in NEW_RULES.get(lang, {}).items():
        assert all(e in items for e in r["examples"]), (lang, unit, r["examples"])
        rules[unit].append({"title": r["title"], "culture": False, "body": [narration(lang, p) for p in r["body"]], "table": r["table"], "examples": r["examples"], "why": narration(lang, r["why"])})
        report.append(f"- **{NAMES[lang]}**: new rule card for {unit} ({course[unit]['title']}): “{r['title']}”.")
    for u in core:
        if u != "u1" and not rules[u]:
            raise SystemExit(f"{lang} {u}: no rule card")

    # ---- Words: every item, one at a time, with an example sentence and pronunciation tips ----
    tip_rules = [(re.compile(p), t) for p, t in SOUND_TIPS.get(lang, [])]

    def example_for(item: dict, unit: str):
        """A longer phrase from this unit (or an earlier one) that uses the word."""
        if item.get("kind") == "sound":
            return None
        mine = tokens(item["text"], lang)
        if not mine or len(mine) > 3:
            return None
        upto = order[: order.index(unit) + 1]
        for u in [unit] + list(reversed(upto[:-1])):
            for l in course[u]["lessons"]:
                for o in l["items"]:
                    if o["id"] == item["id"] or len(tokens(o["text"], lang)) <= len(mine):
                        continue
                    if lang == "zh":
                        if item["text"] in o["text"]:
                            return o["id"]
                    elif all(t in tokens(o["text"], lang) for t in mine):
                        return o["id"]
        return None

    def sound_tips(text: str) -> list:
        if lang == "zh":
            return []
        word = text.lower()
        return [t for rx, t in tip_rules if rx.search(word)][:2]

    # ---- What each unit teaches, and what role-plays, stories and articles need ----
    scenarios = load("scenarios", lang)["scenarios"]
    stories = load("stories", lang)["stories"]
    articles = load("reading", lang)["articles"]

    def place(kind: str, entries: list) -> list:
        placed = []
        by_topic = {}
        for e in entries:
            topic = e.get("topic")
            if kind == "story" and "-dt-" in e["id"]:
                topic = "dating"
            if kind == "story" and "-fl-" in e["id"]:
                topic = "flirting"
            key = topic if topic in TOPIC_UNITS else int(e["level"])
            by_topic.setdefault(key, []).append(e)
        for key, group in by_topic.items():
            band = TOPIC_UNITS[key] if isinstance(key, str) else BANDS[key]
            band = [u for u in band if u in course]
            for i, e in enumerate(group):
                # Spread them out, toward the end of the level (where more has been taught).
                at = len(band) - len(group) + i if len(group) <= len(band) else i * len(band) // len(group)
                placed.append((band[at], kind, e))
        return placed

    placed = place("roleplay", scenarios) + place("story", stories) + place("article", articles)
    gates = {}
    units = {}
    taught = set()
    elective_taught = {}
    for u in order:
        is_core = u in core
        base = set(taught) if is_core else set(taught) | elective_taught.get(stage_of[u], set())
        unit_items = [i for l in course[u]["lessons"] for i in l["items"]]
        for i in unit_items:
            base |= set(tokens(i["text"], lang))
        words = []
        for i in unit_items:
            entry = {"id": i["id"]}
            ex = example_for(i, u)
            if ex:
                entry["ex"] = ex
            tips_here = sound_tips(i["text"])
            if tips_here:
                entry["tips"] = tips_here
            words.append(entry)
        extras = []
        for unit, kind, e in [p for p in placed if p[0] == u]:
            key = f"{kind}:{e['id']}"
            gates[key] = u
            title = e.get("en") or e["title"]
            lines, new_words = [], []
            folder = "scenarios" if kind == "roleplay" else "stories"
            gloss = {k.lower(): v for k, v in (e.get("glossary") or {}).items()}
            for n, line in enumerate(e["lines"]):
                missing = [t for t in tokens(line["text"], lang) if t not in base]
                if not missing:
                    continue
                if kind == "roleplay" or lang == "zh" or any(t not in gloss for t in missing):
                    lines.append({k: v for k, v in {"text": line["text"], "en": line.get("en"), "pinyin": line.get("pinyin"), "audio": f"{folder}/{lang}/{e['id']}-{n}.mp3"}.items() if v})
                    base |= set(tokens(line["text"], lang))
                else:
                    for t in dict.fromkeys(missing):
                        new_words.append({"text": t, "en": gloss[t], "audio": f"class/{lang}/w-{h(lang + '|' + t)}.mp3"})
                        base.add(t)
            if lines or new_words:
                extras.append({"kind": kind, "id": e["id"], "title": title, "intro": narration(lang, EXTRA_INTRO[kind].format(title=title)), "lines": lines, "words": new_words})
                report.append(f"- **{NAMES[lang]}** {kind} “{title}” opens with {u} ({course[u]['title']}); its Class now teaches {len(lines)} line{'s' * (len(lines) != 1)} and {len(new_words)} word{'s' * (len(new_words) != 1)} it uses that weren't taught before.")
            else:
                report.append(f"- **{NAMES[lang]}** {kind} “{title}” opens with {u}; every word in it is already taught by then.")
        n = len(words)
        rule_line = RULE_LINE if rules[u] else ""
        intro_text = WELCOME_DAY1(lang) if u == "u1" else UNIT_INTRO.format(title=course[u]["title"], n=n, rule=rule_line)
        units[u] = {"intro": narration(lang, intro_text), "words": words, "rules": rules[u], "extras": extras, "done": narration(lang, DONE_LINE)}
        if is_core:
            taught = base
        else:
            elective_taught[stage_of[u]] = elective_taught.get(stage_of[u], set()) | (base - taught)

    # ---- The check: nothing in a role-play, story or article that hasn't been taught by then ----
    taught_by = {}
    acc = set()
    extra_tokens = {}
    for u in order:
        here = set()
        for i in (i for l in course[u]["lessons"] for i in l["items"]):
            here |= set(tokens(i["text"], lang))
        for x in units[u]["extras"]:
            for line in x["lines"]:
                here |= set(tokens(line["text"], lang))
            for w in x["words"]:
                here.add(w["text"])
        if u in core:
            acc |= here
            taught_by[u] = set(acc)
        else:
            extra_tokens[stage_of[u]] = extra_tokens.get(stage_of[u], set()) | here
            taught_by[u] = acc | extra_tokens[stage_of[u]]
    for unit, kind, e in placed:
        known = taught_by[unit]
        for line in e["lines"]:
            bad = [t for t in tokens(line["text"], lang) if t not in known]
            if bad:
                raise SystemExit(f"{lang} {kind} {e['id']}: not taught by {unit}: {bad}")
    # Every lesson only uses what its unit's Class (and earlier ones) taught.
    for u in order:
        for l in course[u]["lessons"]:
            for i in l["items"]:
                bad = [t for t in tokens(i["text"], lang) if t not in taught_by[u]]
                if bad:
                    raise SystemExit(f"{lang} lesson {l['id']}: not taught: {bad}")

    day1 = []
    for step in DAY1[lang]:
        s = {k: v for k, v in step.items() if k != "say"}
        s["say"] = narration(lang, step["say"])
        if "item" in s:
            assert s["item"] in items, (lang, s["item"])
        day1.append(s)
    letters = [[letter, name, f"class/{lang}/l-{h(lang + '|' + name)}.mp3"] for letter, name in ALPHABETS.get(lang, [])]
    return {"day1": day1, "letters": letters, "units": units, "gates": gates}


def WELCOME_DAY1(lang: str) -> str:
    return f"This is Day 1 of {NAMES[lang]}. Let's start from the very beginning."


def main():
    out = SHARED / "classes"
    out.mkdir(exist_ok=True)
    report = []
    for lang in LANGS:
        data = build(lang, report)
        (out / f"{lang}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        words = sum(len(u["words"]) for u in data["units"].values())
        rules = sum(len(u["rules"]) for u in data["units"].values())
        extras = sum(len(x["lines"]) + len(x["words"]) for u in data["units"].values() for x in u["extras"])
        print(f"{lang}: {len(data['units'])} classes, {words} words, {rules} rule cards, {extras} pre-taught lines and words, {len(data['gates'])} gated activities")
    doc = ROOT / "docs" / "teach-first.md"
    doc.parent.mkdir(exist_ok=True)
    doc.write_text(
        "# Teach before testing: what changed\n\n"
        "Generated by `scripts/content/classes.py`. Every unit now starts with a Class that teaches each of its words and rules before any exercise uses them. "
        "Each role-play, story and article opens with one unit; anything in it that no Class had taught yet is now taught in that unit's Class, "
        "and shown again just before it as “Words you'll need”. The build checks that nothing in a lesson, role-play, story or article is used before it's taught.\n\n"
        + "\n".join(report)
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {doc.relative_to(ROOT)} ({len(report)} lines)")


if __name__ == "__main__":
    main()
