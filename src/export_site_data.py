"""Собирает данные для сайта из CSV.

Запуск (из корня проекта):
    python src/export_site_data.py

Читает cocktails.csv, cocktail_descriptions.csv, cocktail_ingredients.csv,
data/ingredient_map.csv, data/substitutions.csv и data/ingredient_info.csv,
пишет site/data/data.js.

Фото: положите файл site/images/<id>.jpg (или .png / .webp) — он подхватится
при следующем запуске, иначе на сайте будет плейсхолдер.
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import i18n_tool

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = SITE / "data" / "data.js"

CATEGORY_ORDER = [
    "Крепкий алкоголь", "Ликёры", "Вермуты и аперитивы", "Вино, игристое, пиво",
    "Биттеры", "Соки и цитрусы", "Сиропы и сладкое", "Газировки и вода",
    "Сливки, молоко, яйца", "Травы, специи, приправы", "Кофе и прочее",
]
FALLBACK_CATEGORY = "Кофе и прочее"
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp")

# Безалкогольные: strength = «безалкогольный» (синонимы ниже тоже принимаются)
NA_STRENGTH = {"безалкогольный", "без алкоголя", "0%", "0", "нет", "б/а"}
NA_BASE = "без алкоголя"
SUB_LEVELS = {"1": "почти без потерь", "2": "заметно иначе", "3": "в крайнем случае"}
LANGS = ["en"]  # дополнительные языки; переводы лежат в data/i18n/<lang>/


def read(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def split_tags(s):
    return [t.strip() for t in (s or "").split(";") if t.strip()]


def main():
    cocktails = read(ROOT / "cocktails.csv")
    descs = {r["id"]: r for r in read(ROOT / "cocktail_descriptions.csv")}
    ingr_rows = read(ROOT / "cocktail_ingredients.csv")
    mapping = {r["raw"]: r for r in read(ROOT / "data" / "ingredient_map.csv")}
    tr = {lang: {k: i18n_tool.load(lang, k) for k in i18n_tool.KINDS} for lang in LANGS}

    def tr_fields(kind, key, ru_fields, fields):
        """{lang: {поле: перевод}} — только если перевод сделан с текущего русского текста."""
        hh = i18n_tool.h([ru_fields.get(f, "") for f in fields])
        out = {}
        for lang in LANGS:
            t = tr[lang][kind].get(key)
            if t and t.get("h") == hh:
                out[lang] = {f: t[f] for f in fields if t.get(f)}
        return out

    ingredients = {}  # canonical -> {category}
    # категория базового ингредиента: сначала из строк с одним canonical, потом из составных
    canon_cat = {}
    for r in sorted(mapping.values(), key=lambda r: "|" in r["canonical"]):
        for n in r["canonical"].split("|"):
            canon_cat.setdefault(n, r["category"])
    unmapped = set()

    def canon_of(raw):
        m = mapping.get(raw)
        if m:
            names, cat = m["canonical"].split("|"), m["category"]
        else:
            unmapped.add(raw)
            names = [re.sub(r"\s*\((опц\.|отдельно)\)\s*$", "", raw).strip()]
            cat = FALLBACK_CATEGORY
        for n in names:
            ingredients.setdefault(n, {"category": canon_cat.get(n, cat)})
        return names

    by_cocktail = defaultdict(list)
    for r in sorted(ingr_rows, key=lambda r: (r["cocktail_id"], int(r["position"] or 0))):
        if (r.get("variation_id") or "").strip():
            continue  # ингредиенты вариаций — не часть базового рецепта
        raw = r["ingredient"]
        by_cocktail[r["cocktail_id"]].append({
            "name": raw,
            "i18n": {lang: tr[lang]["ingredients"][raw] for lang in LANGS if tr[lang]["ingredients"].get(raw)},
            "amount": r["amount"],
            "unit": r["unit"],
            "optional": "(опц.)" in raw,
            "canon": canon_of(raw),
        })

    variations = defaultdict(list)
    var_path = ROOT / "cocktail_variations.csv"
    if var_path.exists():
        for v in read(var_path):
            vru = {f: v.get(f, "") for f in i18n_tool.VARIATION_FIELDS}
            variations[v["parent_id"]].append({
                "i18n": tr_fields("variations", v["variation_id"], vru, i18n_tool.VARIATION_FIELDS),
                "id": v["variation_id"], "name_ru": v["name_ru"], "name_en": v["name_en"],
                "ingredients": v["ingredients"], "method": v.get("method", ""), "glass": v.get("glass", ""),
                "garnish": v.get("garnish", ""), "strength": v.get("strength", ""),
                "difference": v.get("difference", ""),
            })

    out = []
    for c in cocktails:
        strength = (c["strength"] or "").strip().lower()
        is_na = strength in NA_STRENGTH
        if is_na:
            strength = "безалкогольный"
        d = descs.get(c["id"], {})
        cru = {"instructions": c["instructions"], "description": d.get("description", ""),
               "garnish": c["garnish"], "origin": d.get("origin", ""), "creator": d.get("creator", "")}
        image = next((f"images/{c['id']}{ext}" for ext in IMAGE_EXT
                      if (SITE / "images" / f"{c['id']}{ext}").exists()), None)
        out.append({
            "id": c["id"],
            "name_en": c["name_en"],
            "name_ru": c["name_ru"],
            "base_spirit": NA_BASE if is_na and not c["base_spirit"].strip("—- ") else c["base_spirit"],
            "method": c["method"],
            "glass": c["glass"],
            "ice": c["ice"],
            "garnish": c["garnish"],
            "instructions": c["instructions"],
            "flavor": split_tags(c["flavor_tags"]),
            "strength": strength,
            "family": c["family"],
            "iba": c["iba_category"],
            "era": c["era"],
            "occasion": split_tags(c["occasion_tags"]),
            "extra": split_tags(c["extra_tags"]),
            "origin": d.get("origin", ""),
            "year": d.get("year_approx", ""),
            "creator": d.get("creator", ""),
            "description": d.get("description", ""),
            "image": image,
            "ingredients": by_cocktail.get(c["id"], []),
            "variations": variations.get(c["id"], []),
            "i18n": tr_fields("cocktails", c["id"], cru, i18n_tool.COCKTAIL_FIELDS),
        })

    cats = [c for c in CATEGORY_ORDER if any(v["category"] == c for v in ingredients.values())]
    cats += sorted({v["category"] for v in ingredients.values()} - set(cats))
    # замены: data/substitutions.csv
    subs = {}
    unknown_subs = set()
    sub_path = ROOT / "data" / "substitutions.csv"
    if sub_path.exists():
        for r in read(sub_path):
            ing, level = r["ingredient"].strip(), r["level"].strip()
            if ing not in ingredients:
                unknown_subs.add(ing)
            name, note = r["substitute"].strip(), r["note"].strip()
            i18n = tr_fields("substitutions", f"{ing}|{name}", {"note": note}, ["note"])
            for lang in LANGS:
                if tr[lang]["ingredients"].get(name):
                    i18n.setdefault(lang, {})["name"] = tr[lang]["ingredients"][name]
            subs.setdefault(ing, []).append({
                "name": name, "level": int(level) if level in SUB_LEVELS else 3,
                "note": note, "i18n": i18n,
            })
        for lst in subs.values():
            lst.sort(key=lambda x: x["level"])

    # справки об ингредиентах: data/ingredient_info.csv (крепость, из чего, вкус)
    info_path = ROOT / "data" / "ingredient_info.csv"
    info = {r["name"].strip(): r for r in read(info_path)} if info_path.exists() else {}
    for n, v in ingredients.items():
        v["i18n"] = {lang: tr[lang]["ingredients"][n] for lang in LANGS if tr[lang]["ingredients"].get(n)}
        r = info.get(n)
        if r:
            ru = {f: r[f].strip() for f in i18n_tool.INFO_FIELDS}
            v["info"] = {"abv": r["abv"].strip(), **ru,
                         "i18n": tr_fields("ingredient_info", n, ru, i18n_tool.INFO_FIELDS)}
    no_info = sorted(n for n in ingredients if n not in info)
    unknown_info = sorted(set(info) - set(ingredients))
    payload = {"cocktails": out, "ingredients": ingredients, "categories": cats,
               "substitutions": subs, "sub_levels": SUB_LEVELS,
               "langs": ["ru"] + LANGS,
               "terms": {lang: tr[lang]["terms"] for lang in LANGS}}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "// Сгенерировано src/export_site_data.py — не редактировать вручную.\n"
        "window.BAR_DATA = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    print(f"{len(out)} коктейлей, {len(ingredients)} ингредиентов -> {OUT.relative_to(ROOT)}")
    print(f"замены для {len(subs)} ингредиентов")
    for lang in LANGS:
        m = i18n_tool.missing(lang)
        left = {k: len(v) for k, v in m.items() if v}
        print(f"перевод [{lang}]: " + (", ".join(f"{k} {n}" for k, n in left.items()) + " не переведено"
                                     + " — запустите src/i18n_tool.py todo" if left else "всё переведено"))
    if no_info:
        print("\nНет справки в data/ingredient_info.csv:", ", ".join(no_info), file=sys.stderr)
    if unknown_info:
        print("\nВ ingredient_info.csv есть лишние имена (проверьте написание):", ", ".join(unknown_info), file=sys.stderr)
    if unknown_subs:
        print("\nВ substitutions.csv есть ингредиенты, которых нет в рецептах (проверьте имена):",
              ", ".join(sorted(unknown_subs)), file=sys.stderr)
    if unmapped:
        print("\nНет в data/ingredient_map.csv (добавлены как есть, категория «"
              f"{FALLBACK_CATEGORY}»):", file=sys.stderr)
        for u in sorted(unmapped):
            print("  -", u, file=sys.stderr)


if __name__ == "__main__":
    main()
