# Датасет коктейлей

496 коктейлей (из них 57 шотов и 34 безалкогольных) + 127 альтернативных версий.

Все файлы — UTF-8 (с BOM), разделитель `,`. Связь между таблицами — по `id` / `cocktail_id` / `parent_id`.
Многозначные поля (`flavor_tags`, `occasion_tags`, `extra_tags`, `ingredients`, `listed_in`) разделены `;`.

| Файл | Строка = | Ключевые колонки |
|---|---|---|
| `cocktails.csv` | коктейль | `id`, названия, `base_spirit`, `ingredients`, `method`, `glass`, `ice`, `garnish`, `instructions`, `flavor_tags`, `strength`, `family`, `iba_category`, `era`, `occasion_tags`, `extra_tags`, `n_variations`, `listed_in` |
| `cocktail_descriptions.csv` | коктейль | `origin`, `year_approx`, `creator`, `description` (абзац) |
| `cocktail_variations.csv` | альтернативная версия | `variation_id`, `parent_id`, рецепт, `strength`, `difference` (чем отличается), `listed_in` |
| `cocktail_ingredients.csv` | ингредиент в рецепте | `cocktail_id`, `variation_id` (пусто = базовый рецепт), `position`, `ingredient`, `amount`, `unit` |
| `shots.csv` | шот | срез `cocktails.csv`: `family == "Шот"` или тег `шот` |
| `mocktails.csv` | безалкогольный коктейль | срез `cocktails.csv`: `strength == "безалкогольный"` (ещё 8 безалкогольных версий — в `cocktail_variations.csv`) |

`flavor_tags` — закрытый словарь: сладкий, кислый, горький, солёный, острый, пикантный, сухой, цитрусовый, фруктовый, ягодный, вишнёвый, яблочный, тропический, травяной, мятный, анисовый, цветочный, пряный, имбирный, медовый, ореховый, кофейный, шоколадный, сливочный, древесный, дымный, освежающий, игристый, солодовый, чайный.

`strength`: безалкогольный / лёгкий / средний / крепкий. `era` вычисляется из `year_approx`.

`listed_in` — в каких внешних каталогах встречается коктейль с таким названием (сопоставление по нормализованному английскому названию): TheCocktailDB (выгрузка 2021 г.), IBA (iba-world.com и teijo/iba-cocktails), Hotaling & Co. (Kaggle). Пусто — не найден в этих каталогах (современная/региональная классика, шоты баров России и т.д.). Рецепты и описания написаны заново, а не скопированы из каталогов.

Пересборка: `python src/build.py .` (данные — в `src/data*.py`, `src/variations*.py`, списки названий каталогов — в `src/aggregator_names.json`). Скрипт проверяет уникальность id и названий, словарь тегов и ссылки вариаций.
