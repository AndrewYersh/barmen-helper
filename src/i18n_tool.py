"""Переводы сайта: поиск непереведённого и слияние готовых переводов.

    python src/i18n_tool.py todo [--lang en] [--chunks 6]
        Пишет в data/i18n/_work/ файлы todo_*.json со всем, что ещё не переведено
        (или чей русский текст изменился после перевода).

    python src/i18n_tool.py merge FILE [FILE ...] [--lang en]
        Сливает готовые файлы done_*.json в data/i18n/<lang>/*.json.

Форматы:
  todo_terms.json / todo_ingredients.json — {"русский": null}  →  done_*: {"русский": "english"}
  todo_cocktails_N.json   — [{"id", "h", "ru": {поля}}]        →  done_*: [{"id", "h", "en": {поля}}]
  todo_variations.json    — [{"id", "h", "ru": {поля}}]        →  done_*: [{"id", "h", "en": {поля}}]
  todo_substitutions.json — [{"id": "ингредиент|замена", "h", "ru": {"note"}}] → то же с "en"
  todo_ingredient_info.json — [{"id": "ингредиент", "h", "ru": {"made_from", "taste"}}] → то же с "en"
"""
import argparse
import csv
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "data" / "i18n" / "_work"

COCKTAIL_FIELDS = ["instructions", "description", "garnish", "origin", "creator"]
VARIATION_FIELDS = ["ingredients", "difference", "garnish"]
INFO_FIELDS = ["made_from", "taste"]
KINDS = ["terms", "ingredients", "cocktails", "variations", "substitutions", "ingredient_info"]


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def h(fields):
    return hashlib.sha1("\x1f".join(fields).encode("utf-8")).hexdigest()[:10]


def load(lang, kind):
    p = ROOT / "data" / "i18n" / lang / f"{kind}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def save(lang, kind, data):
    p = ROOT / "data" / "i18n" / lang / f"{kind}.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(dict(sorted(data.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def split_tags(s):
    return [t.strip() for t in (s or "").split(";") if t.strip()]


def sources():
    """Всё, что нужно перевести, из CSV-датасета и словарей проекта."""
    cocktails = read_csv(ROOT / "cocktails.csv")
    descs = {r["id"]: r for r in read_csv(ROOT / "cocktail_descriptions.csv")}
    ingr = read_csv(ROOT / "cocktail_ingredients.csv")
    vpath = ROOT / "cocktail_variations.csv"
    variations = read_csv(vpath) if vpath.exists() else []
    mapping = read_csv(ROOT / "data" / "ingredient_map.csv")
    spath = ROOT / "data" / "substitutions.csv"
    subs = read_csv(spath) if spath.exists() else []
    ipath = ROOT / "data" / "ingredient_info.csv"
    info = read_csv(ipath) if ipath.exists() else []

    terms = set()
    for c in cocktails:
        for col in ["flavor_tags", "occasion_tags", "extra_tags"]:
            terms.update(split_tags(c[col]))
        for col in ["glass", "method", "ice", "family", "era", "iba_category", "base_spirit", "strength"]:
            if c.get(col, "").strip() and c[col].strip() != "—":
                terms.add(c[col].strip())
    for v in variations:
        for col in ["glass", "method", "strength"]:
            if v.get(col, "").strip():
                terms.add(v[col].strip())
    terms.update(r["unit"] for r in ingr if r["unit"])
    terms.update(r["category"] for r in mapping)

    names = {r["ingredient"] for r in ingr if not (r.get("variation_id") or "").strip()}
    for r in mapping:
        names.update(r["canonical"].split("|"))
    for r in subs:
        names.add(r["ingredient"].strip())
        names.add(r["substitute"].strip())

    cock = {}
    for c in cocktails:
        d = descs.get(c["id"], {})
        ru = {"instructions": c["instructions"], "description": d.get("description", ""),
              "garnish": c["garnish"], "origin": d.get("origin", ""), "creator": d.get("creator", "")}
        cock[c["id"]] = ru
    var = {v["variation_id"]: {f: v.get(f, "") for f in VARIATION_FIELDS} for v in variations}
    sub = {f'{r["ingredient"].strip()}|{r["substitute"].strip()}': {"note": r["note"].strip()} for r in subs}
    inf = {r["name"].strip(): {f: r[f].strip() for f in INFO_FIELDS} for r in info}
    return {"terms": terms, "ingredients": names, "cocktails": cock, "variations": var, "substitutions": sub,
            "ingredient_info": inf}


def missing(lang="en"):
    src = sources()
    out = {}
    for kind in ["terms", "ingredients"]:
        have = load(lang, kind)
        out[kind] = sorted(x for x in src[kind] if x and not have.get(x))
    for kind, fields in [("cocktails", COCKTAIL_FIELDS), ("variations", VARIATION_FIELDS),
                         ("substitutions", ["note"]), ("ingredient_info", INFO_FIELDS)]:
        have = load(lang, kind)
        items = []
        for key, ru in src[kind].items():
            hh = h([ru[f] for f in fields])
            if have.get(key, {}).get("h") != hh:
                items.append({"id": key, "h": hh, "ru": {f: ru[f] for f in fields if ru[f]}})
        out[kind] = items
    return out


def cmd_todo(args):
    m = missing(args.lang)
    WORK.mkdir(parents=True, exist_ok=True)
    for old in WORK.glob("todo_*.json"):
        old.unlink()
    written = []

    def dump(name, data):
        p = WORK / name
        p.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        written.append(p)

    if m["terms"]:
        dump("todo_terms.json", {k: None for k in m["terms"]})
    if m["ingredients"]:
        dump("todo_ingredients.json", {k: None for k in m["ingredients"]})
    items = m["cocktails"]
    n = max(1, min(args.chunks, len(items)))
    for i in range(n):
        part = items[i::n]
        if part:
            dump(f"todo_cocktails_{i + 1}.json", part)
    if m["variations"]:
        dump("todo_variations.json", m["variations"])
    if m["substitutions"]:
        dump("todo_substitutions.json", m["substitutions"])
    if m["ingredient_info"]:
        dump("todo_ingredient_info.json", m["ingredient_info"])

    print(f"Не переведено ({args.lang}): терминов {len(m['terms'])}, ингредиентов {len(m['ingredients'])}, "
          f"коктейлей {len(m['cocktails'])}, вариаций {len(m['variations'])}, замен {len(m['substitutions'])}, "
          f"справок об ингредиентах {len(m['ingredient_info'])}")
    for p in written:
        print("  ", p.relative_to(ROOT))


def cmd_merge(args):
    for f in args.files:
        p = Path(f)
        data = json.loads(p.read_text(encoding="utf-8"))
        kind = next((k for k in KINDS if re.search(rf"(^|_){k}(_|\.|$)", p.stem)), None)
        if not kind:
            sys.exit(f"Не понял тип файла по имени: {p.name}")
        have = load(args.lang, kind)
        added = 0
        if kind in ("terms", "ingredients"):
            for k, v in data.items():
                if v and str(v).strip():
                    have[k] = str(v).strip()
                    added += 1
        else:
            for item in data:
                en = {k: v.strip() for k, v in (item.get("en") or {}).items() if isinstance(v, str) and v.strip()}
                if item.get("id") and item.get("h") and en:
                    have[item["id"]] = {"h": item["h"], **en}
                    added += 1
        save(args.lang, kind, have)
        print(f"{p.name}: {kind} +{added}")


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    t = sp.add_parser("todo")
    t.add_argument("--lang", default="en")
    t.add_argument("--chunks", type=int, default=6)
    m = sp.add_parser("merge")
    m.add_argument("files", nargs="+")
    m.add_argument("--lang", default="en")
    a = ap.parse_args()
    {"todo": cmd_todo, "merge": cmd_merge}[a.cmd](a)


if __name__ == "__main__":
    main()
