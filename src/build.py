"""Собирает CSV-датасет коктейлей: python build.py <папка_вывода>"""
import csv, sys, collections
from pathlib import Path
import json, re
import data1, data2, data3, data4, data5, data6, data7, data8, data9
import data10, data11, data12, data13, data14, data15
from variations import VARS as VARS1
from variations2 import VARS2
VARS = VARS1 + VARS2
HERE = Path(__file__).parent

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT.mkdir(parents=True, exist_ok=True)
MODS = (data1, data2, data3, data4, data5, data6, data7, data8, data9, data10, data11, data12, data13, data14, data15)
rows = sum((m.DATA for m in MODS), [])

FLAVORS = {"сладкий", "кислый", "горький", "солёный", "острый", "пикантный", "сухой", "цитрусовый",
           "фруктовый", "ягодный", "вишнёвый", "яблочный", "тропический", "травяной", "мятный",
           "анисовый", "цветочный", "пряный", "имбирный", "медовый", "ореховый", "кофейный",
           "шоколадный", "сливочный", "древесный", "дымный", "освежающий", "игристый", "солодовый", "чайный"}
STRENGTH = {"безалкогольный", "лёгкий", "средний", "крепкий"}


def era(y):
    if y < 1920: return "Золотой век (до 1920)"
    if y <= 1933: return "Сухой закон (1920–1933)"
    if y < 1970: return "Середина века и тики (1934–1969)"
    if y < 2000: return "Эпоха диско и 90-х (1970–1999)"
    return "Коктейльный ренессанс (2000+)"


def fmt_amount(a):
    return str(int(a)) if float(a).is_integer() else str(a)


def ingr_text(ingr):
    return "; ".join(f"{n} — {u}" if a is None else f"{n} {fmt_amount(a)} {u}" for n, a, u in ingr)


# ---------- проверки ----------
ids = [r["id"] for r in rows]
dups = [k for k, v in collections.Counter(ids).items() if v > 1]
assert not dups, f"дубли id: {dups}"
names = [r["name_en"].lower() for r in rows]
assert len(set(names)) == len(names), [n for n, c in collections.Counter(names).items() if c > 1]
for r in rows:
    bad = set(r["flavor_tags"].split(";")) - FLAVORS
    assert not bad, (r["id"], bad)
    assert r["strength"] in STRENGTH, r["id"]
    assert len(r["description"]) > 150, (r["id"], len(r["description"]))
idset = set(ids)
vids = [v["variation_id"] for v in VARS]
assert len(set(vids)) == len(vids), [k for k, c in collections.Counter(vids).items() if c > 1]
assert not set(vids) & idset, set(vids) & idset
for v in VARS:
    assert v["parent_id"] in idset, v["variation_id"]
    assert v["strength"] in STRENGTH, v["variation_id"]
n_var = collections.Counter(v["parent_id"] for v in VARS)

# ---------- где ещё встречается (агрегаторы) ----------
def norm(n):
    n = n.lower().replace("&", "and")
    n = re.sub(r"\b(the|cocktail|shot)\b", "", n)
    return re.sub(r"[^a-z0-9]", "", n)
AGG = {src: {norm(x) for x in names} for src, names in json.load(open(HERE / "aggregator_names.json")).items()}
def listed_in(name_en, iba=""):
    keys = {norm(name_en)} | {norm(p) for p in re.split(r"[(/)]", name_en) if p.strip()}
    keys.discard("")
    out = [src for src, names in AGG.items() if keys & names]
    if iba.startswith("IBA") and not any(o.startswith("IBA") for o in out):
        out.insert(0, "IBA (iba-world.com)")
    return ";".join(out)

# ---------- запись ----------
kw = dict(encoding="utf-8-sig", newline="")
main_cols = ["id", "name_en", "name_ru", "base_spirit", "ingredients", "n_ingredients", "method",
             "glass", "ice", "garnish", "instructions", "flavor_tags", "strength", "family",
             "iba_category", "era", "occasion_tags", "extra_tags", "n_variations", "listed_in"]
with open(OUT / "cocktails.csv", "w", **kw) as f:
    w = csv.DictWriter(f, main_cols)
    w.writeheader()
    for r in rows:
        w.writerow({**{c: r.get(c, "") for c in main_cols},
                    "ingredients": ingr_text(r["ingredients"]),
                    "n_ingredients": len(r["ingredients"]),
                    "era": era(r["year"]), "n_variations": n_var.get(r["id"], 0),
                    "listed_in": listed_in(r["name_en"], r["iba_category"])})

desc_cols = ["id", "name_en", "name_ru", "origin", "year_approx", "creator", "description"]
with open(OUT / "cocktail_descriptions.csv", "w", **kw) as f:
    w = csv.DictWriter(f, desc_cols)
    w.writeheader()
    for r in rows:
        w.writerow({"id": r["id"], "name_en": r["name_en"], "name_ru": r["name_ru"],
                    "origin": r["origin"], "year_approx": r["year"],
                    "creator": r["creator"], "description": r["description"]})

names_by_id = {r["id"]: r["name_ru"] for r in rows}
var_cols = ["variation_id", "parent_id", "parent_name_ru", "name_en", "name_ru", "ingredients",
            "n_ingredients", "method", "glass", "garnish", "strength", "difference", "listed_in"]
with open(OUT / "cocktail_variations.csv", "w", **kw) as f:
    w = csv.DictWriter(f, var_cols)
    w.writeheader()
    for v in VARS:
        w.writerow({**{c: v.get(c, "") for c in var_cols},
                    "parent_name_ru": names_by_id[v["parent_id"]],
                    "ingredients": ingr_text(v["ingredients"]),
                    "n_ingredients": len(v["ingredients"]),
                    "listed_in": listed_in(v["name_en"])})

with open(OUT / "cocktail_ingredients.csv", "w", **kw) as f:
    w = csv.writer(f)
    w.writerow(["cocktail_id", "variation_id", "position", "ingredient", "amount", "unit"])
    for r in rows:
        for i, (n, a, u) in enumerate(r["ingredients"], 1):
            w.writerow([r["id"], "", i, n, "" if a is None else fmt_amount(a), u])
    for v in VARS:
        for i, (n, a, u) in enumerate(v["ingredients"], 1):
            w.writerow([v["parent_id"], v["variation_id"], i, n, "" if a is None else fmt_amount(a), u])

import pandas as pd
main = pd.read_csv(OUT / "cocktails.csv")
shots = main[(main.family == "Шот") | main.extra_tags.str.contains(r"(?:^|;)шот(?:;|$)")]
shots.to_csv(OUT / "shots.csv", index=False, encoding="utf-8-sig")
mock = main[main.strength == "безалкогольный"]
mock.to_csv(OUT / "mocktails.csv", index=False, encoding="utf-8-sig")
vm = pd.read_csv(OUT / "cocktail_variations.csv")
print("шотов:", len(shots), "безалкогольных:", len(mock), "+ безалк. вариаций:", (vm.strength == "безалкогольный").sum())
print("в агрегаторах:", (main.listed_in.fillna("") != "").sum(), "из", len(main))
print(len(rows), "коктейлей,", len(VARS), "вариаций,", len(n_var), "коктейлей с вариациями")
for col in ["base_spirit", "family", "strength", "iba_category"]:
    print(col, collections.Counter(r[col] for r in rows).most_common())
