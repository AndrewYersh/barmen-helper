/* Языки сайта: словарь интерфейса, выбор языка, переключатель-глобус.
   Подключается до common.js. Переводы данных (теги, ингредиенты, тексты коктейлей)
   приходят из data.js (поля i18n и terms), их готовит src/export_site_data.py. */
(function () {
  const LANGS = { ru: "Русский", en: "English" };
  const KEY = "bar.lang";

  const UI = {
    ru: {
      "title.search": "Барная карта — коктейль по настроению",
      "title.builder": "Конструктор — Барная карта",
      "title.subs": "Замены — Барная карта",
      "logo": "Барная <span>карта</span>",
      "nav.search": "Поиск", "nav.builder": "Конструктор", "nav.subs": "Замены", "nav.mybar": "Мой бар",
      "title.mybar": "Мой бар — Барная карта",
      "mybar.title": "Мой бар",
      "mybar.text": "Отметьте, что у вас есть, — покажем, что из этого можно сделать. Весь алкоголь рецепта должен быть в баре, а если не хватает до трёх безалкогольных ингредиентов, коктейль появится с пометкой «докупить». Воду, лёд, сахар и соль считаем всегда доступными.",
      "mybar.mode.all": "Всё, что есть", "mybar.mode.alc": "Только алкоголь",
      "mybar.hint.all": "учитываем все отмеченные ингредиенты",
      "mybar.hint.alc": "отмечаете только бутылки — остальное перечислим",
      "mybar.have": "В баре", "mybar.selected": "выбрано {n}", "mybar.clear": "очистить",
      "mybar.start.title": "Что есть в баре?",
      "mybar.start.text": "Отметьте бутылки и продукты в списке или начните с самых ходовых:",
      "mybar.start.alc": "Отметьте бутылки в списке или начните с самых ходовых:",
      "mybar.summary": "Можно сделать сразу: {a} · докупив немного: {b}",
      "mybar.summary.alc": "Коктейлей, где весь алкоголь из вашего бара: {a}",
      "mybar.unlock": "Докупите — и откроется больше:",
      "mybar.unlock.tip": "Сразу станет доступно ещё коктейлей: {n}",
      "mybar.group.0": "Можно сделать прямо сейчас", "mybar.group.1": "Не хватает одного ингредиента",
      "mybar.group.2": "Не хватает двух ингредиентов", "mybar.group.3": "Не хватает трёх ингредиентов",
      "mybar.buy": "докупить", "mybar.need": "ещё нужно",
      "mybar.empty.title": "Пока ничего не получается",
      "mybar.empty.text": "Добавьте ещё ингредиентов — например, основу и что-нибудь кислое или сладкое.",
      "mybar.empty.alc": "Нет коктейлей, где весь алкоголь — из отмеченных бутылок. Добавьте ещё одну.",
      "lang.label": "Язык",
      "sheet.done": "Готово", "filters.title": "Фильтры", "filters.show": "Показать: {n}", "subs.pick": "Выбрать ингредиент",
      "info.made": "Из чего", "info.taste": "Вкус", "info.pairs": "С чем сочетается →", "info.swap": "Чем заменить →", "info.aria": "Об ингредиенте: {name}",
      "nodata": "Нет данных. Запустите <code>python src/export_site_data.py</code>.",

      "hero.title": "Что нальём <em>сегодня?</em>",
      "hero.text": "Выберите вкус, крепость и настроение — или просто найдите коктейль по названию или ингредиенту.",
      "search.placeholder": "Негрони, мята, освежающий, на вечеринку…",
      "search.aria": "Поиск коктейля или тега",
      "results.title": "Коктейли",
      "results.clear": "сбросить всё",
      "results.empty.title": "Ничего не нашлось",
      "results.empty.text": "Попробуйте убрать один из тегов — фильтр показывает только коктейли, где есть все выбранные.",
      "tags.more": "показать все ({n})", "tags.less": "свернуть", "tags.remove": "Убрать",
      "suggest.tags": "Теги", "suggest.cocktails": "Коктейли",
      "group.flavor": "Вкус", "group.strength": "Крепость", "group.occasion": "Настроение и повод",
      "group.base": "База", "group.extra": "Ещё",
      "strength.zero": "безалкогольный · 0%", "badge.zero": "0% · без алкоголя",

      "modal.close": "Закрыть", "modal.recipe": "Состав", "modal.method": "Приготовление",
      "modal.facts": "Подача и происхождение", "modal.history": "История", "modal.variations": "Вариации",
      "modal.optional": "по желанию", "modal.pairings": "Посмотреть сочетания", "modal.swap": "Чем заменить",
      "fact.glass": "Бокал", "fact.method": "Метод", "fact.ice": "Лёд", "fact.garnish": "Украшение",
      "fact.family": "Семейство", "fact.era": "Эпоха", "fact.year": "Год", "fact.origin": "Откуда",
      "fact.creator": "Автор", "fact.iba": "IBA",

      "builder.title": "Конструктор",
      "builder.text": "Выберите ингредиент — увидите, с чем он чаще всего встречается в коктейлях. Нажимайте на соседей в схеме, чтобы собирать набор и смотреть, что подходит ко всему сразу.",
      "builder.badge": "черновик · сборка рецептов скоро",
      "builder.ingredients": "Ингредиенты", "builder.expand": "развернуть", "builder.collapse": "свернуть",
      "builder.find": "Найти ингредиент…", "builder.nothing": "Ничего не нашлось",
      "builder.add": "Добавить к набору", "builder.set": "Набор:", "builder.reset": "очистить",
      "builder.remove": "Убрать {name}",
      "builder.start.title": "Выберите ингредиент", "builder.start.text": "в списке ингредиентов или начните с популярных:",
      "builder.pairs": "Чаще всего идёт с",
      "builder.pairs.none": "Больше ничего не встречается вместе с этим набором.",
      "builder.pair.tip": "Вместе в {k} из {n} коктейлей ({p}%)",
      "builder.in": "Встречается в {n} {word}",
      "builder.in.none": "Нет коктейлей со всеми выбранными ингредиентами.",
      "builder.hint": "толщина линии — как часто встречаются вместе · нажмите на узел, чтобы добавить его в набор",
      "builder.graph.none": "С этим набором больше ничего не встречается",
      "builder.graph.more": "+ ещё {n}", "builder.graph.aria": "Схема сочетаний",
      "builder.node.tip": "{name}: вместе в {n} коктейлях — нажмите, чтобы добавить к набору",
      "builder.node.aria": "Добавить {name}",

      "subs.title": "Замены",
      "subs.text": "Нет нужной бутылки? Выберите основу или ликёр — подскажем, чем его заменить и что при этом изменится во вкусе.",
      "subs.find": "Найти основу или ликёр…", "subs.other": "Другое", "subs.count": "{n} зам.",
      "subs.start.title": "Чего не хватает?",
      "subs.start.text": "Выберите ингредиент в списке или начните с самых ходовых:",
      "subs.level.1": "почти без потерь", "subs.level.2": "заметно иначе", "subs.level.3": "в крайнем случае",
      "subs.hint.1": "можно менять один к одному",
      "subs.hint.2": "коктейль получится, но с другим характером",
      "subs.hint.3": "если совсем нечего взять",
      "subs.in": "в {n} коктейлях", "subs.goto": "чем заменить его →", "subs.pairs": "с чем сочетается",
      "subs.where": "Где пригодится замена", "subs.where.none": "Пока нет коктейлей с этим ингредиентом.",
    },
    en: {
      "title.search": "Bar Map — find a cocktail for your mood",
      "title.builder": "Builder — Bar Map",
      "title.subs": "Substitutes — Bar Map",
      "logo": "Bar <span>Map</span>",
      "nav.search": "Search", "nav.builder": "Builder", "nav.subs": "Substitutes", "nav.mybar": "My bar",
      "title.mybar": "My Bar — Bar Map",
      "mybar.title": "My bar",
      "mybar.text": "Tick what you have and we'll show what you can make. Every spirit in the recipe must be in your bar; if up to three non-alcoholic ingredients are missing, the cocktail shows up with a “to buy” note. Water, ice, sugar and salt are assumed to be on hand.",
      "mybar.mode.all": "Everything I have", "mybar.mode.alc": "Spirits only",
      "mybar.hint.all": "all ticked ingredients are taken into account",
      "mybar.hint.alc": "tick only bottles — we'll list the rest",
      "mybar.have": "In my bar", "mybar.selected": "{n} selected", "mybar.clear": "clear",
      "mybar.start.title": "What's in your bar?",
      "mybar.start.text": "Tick bottles and mixers in the list, or start with the most common ones:",
      "mybar.start.alc": "Tick bottles in the list, or start with the most common ones:",
      "mybar.summary": "Ready to make: {a} · with a quick shop: {b}",
      "mybar.summary.alc": "Cocktails where every spirit is from your bar: {a}",
      "mybar.unlock": "Buy these to unlock more:",
      "mybar.unlock.tip": "Cocktails that become ready right away: {n}",
      "mybar.group.0": "Ready to make now", "mybar.group.1": "Missing one ingredient",
      "mybar.group.2": "Missing two ingredients", "mybar.group.3": "Missing three ingredients",
      "mybar.buy": "to buy", "mybar.need": "also needs",
      "mybar.empty.title": "Nothing yet",
      "mybar.empty.text": "Add a few more ingredients — say, a base spirit plus something sour or sweet.",
      "mybar.empty.alc": "No cocktail uses only the bottles you ticked. Add one more.",
      "lang.label": "Language",
      "sheet.done": "Done", "filters.title": "Filters", "filters.show": "Show {n}", "subs.pick": "Pick an ingredient",
      "info.made": "Made from", "info.taste": "Taste", "info.pairs": "Pairs well with →", "info.swap": "Substitutes →", "info.aria": "About {name}",
      "nodata": "No data. Run <code>python src/export_site_data.py</code>.",

      "hero.title": "What are we pouring <em>tonight?</em>",
      "hero.text": "Pick a flavour, strength and mood — or just search for a cocktail by name or ingredient.",
      "search.placeholder": "Negroni, mint, refreshing, party…",
      "search.aria": "Search for a cocktail or tag",
      "results.title": "Cocktails",
      "results.clear": "clear all",
      "results.empty.title": "Nothing found",
      "results.empty.text": "Try removing one of the tags — the filter only shows cocktails that match all of them.",
      "tags.more": "show all ({n})", "tags.less": "show less", "tags.remove": "Remove",
      "suggest.tags": "Tags", "suggest.cocktails": "Cocktails",
      "group.flavor": "Flavour", "group.strength": "Strength", "group.occasion": "Mood & occasion",
      "group.base": "Base", "group.extra": "More",
      "strength.zero": "non-alcoholic · 0%", "badge.zero": "0% · alcohol-free",

      "modal.close": "Close", "modal.recipe": "Ingredients", "modal.method": "Method",
      "modal.facts": "Serving & origin", "modal.history": "History", "modal.variations": "Variations",
      "modal.optional": "optional", "modal.pairings": "See pairings", "modal.swap": "Substitutes",
      "fact.glass": "Glass", "fact.method": "Method", "fact.ice": "Ice", "fact.garnish": "Garnish",
      "fact.family": "Family", "fact.era": "Era", "fact.year": "Year", "fact.origin": "Origin",
      "fact.creator": "Created by", "fact.iba": "IBA",

      "builder.title": "Builder",
      "builder.text": "Pick an ingredient to see what it is most often paired with. Click neighbours in the diagram to build a set and see what goes with all of them at once.",
      "builder.badge": "draft · recipe builder coming soon",
      "builder.ingredients": "Ingredients", "builder.expand": "expand", "builder.collapse": "collapse",
      "builder.find": "Find an ingredient…", "builder.nothing": "Nothing found",
      "builder.add": "Add to set", "builder.set": "Set:", "builder.reset": "clear",
      "builder.remove": "Remove {name}",
      "builder.start.title": "Pick an ingredient", "builder.start.text": "in the ingredient list, or start with a popular one:",
      "builder.pairs": "Most often paired with",
      "builder.pairs.none": "Nothing else appears together with this set.",
      "builder.pair.tip": "Together in {k} of {n} cocktails ({p}%)",
      "builder.in": "Used in {n} {word}",
      "builder.in.none": "No cocktails contain all of the selected ingredients.",
      "builder.hint": "line thickness — how often they appear together · click a node to add it to the set",
      "builder.graph.none": "Nothing else appears with this set",
      "builder.graph.more": "+ {n} more", "builder.graph.aria": "Pairing diagram",
      "builder.node.tip": "{name}: together in {n} cocktails — click to add to the set",
      "builder.node.aria": "Add {name}",

      "subs.title": "Substitutes",
      "subs.text": "Missing a bottle? Pick a base spirit or liqueur to see what can replace it and how the taste will change.",
      "subs.find": "Find a spirit or liqueur…", "subs.other": "Other", "subs.count": "{n} subs",
      "subs.start.title": "What are you missing?",
      "subs.start.text": "Pick an ingredient from the list, or start with the most common ones:",
      "subs.level.1": "almost identical", "subs.level.2": "noticeably different", "subs.level.3": "last resort",
      "subs.hint.1": "swap one for one",
      "subs.hint.2": "the drink works, but with a different character",
      "subs.hint.3": "only if there is nothing else",
      "subs.in": "in {n} cocktails", "subs.goto": "substitutes for it →", "subs.pairs": "pairings",
      "subs.where": "Where the swap comes in handy", "subs.where.none": "No cocktails with this ingredient yet.",
    },
  };

  function detect() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && LANGS[saved]) return saved;
    } catch (_) { /* приватный режим */ }
    const nav = (navigator.languages || [navigator.language || ""]).map(l => String(l).toLowerCase());
    return nav.some(l => /^(ru|uk|be|kk)/.test(l)) ? "ru" : "en";
  }
  const lang = detect();

  /** Строка интерфейса: t("builder.in", {n: 5}) */
  function t(key, vars) {
    let s = (UI[lang] && UI[lang][key]) ?? UI.ru[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
    return s;
  }

  /** Склонение: plural(n, ["коктейль","коктейля","коктейлей"], ["cocktail","cocktails"]) */
  function plural(n, ru, en) {
    if (lang === "en") return n === 1 ? en[0] : en[1];
    const m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? ru[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? ru[1] : ru[2];
  }

  function setLang(l) {
    try { localStorage.setItem(KEY, l); } catch (_) { /* ignore */ }
    location.reload();
  }

  /* ---------- статичный текст страниц: data-i18n, data-i18n-html, data-i18n-placeholder ---------- */
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    const title = document.querySelector("title[data-i18n-title]");
    if (title) document.title = t(title.dataset.i18nTitle);
  }

  /* ---------- переключатель-глобус ---------- */
  function mountSwitcher() {
    const bar = document.querySelector(".topbar");
    if (!bar) return;
    const wrap = document.createElement("div");
    wrap.className = "lang";
    wrap.innerHTML = `
      <button class="lang-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${t("lang.label")}" title="${t("lang.label")}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/>
        </svg>
        <span>${lang.toUpperCase()}</span>
      </button>
      <ul class="lang-menu" role="listbox">
        ${Object.entries(LANGS).map(([code, name]) => `
          <li><button role="option" aria-selected="${code === lang}" data-lang="${code}" class="${code === lang ? "on" : ""}">
            <b>${code.toUpperCase()}</b>${name}</button></li>`).join("")}
      </ul>`;
    bar.appendChild(wrap);
    const btn = wrap.querySelector(".lang-btn");
    const open = on => { wrap.classList.toggle("open", on); btn.setAttribute("aria-expanded", on); };
    btn.addEventListener("click", e => { e.stopPropagation(); open(!wrap.classList.contains("open")); });
    wrap.querySelector(".lang-menu").addEventListener("click", e => {
      const b = e.target.closest("[data-lang]");
      if (b && b.dataset.lang !== lang) setLang(b.dataset.lang);
      else open(false);
    });
    document.addEventListener("click", () => open(false));
    document.addEventListener("keydown", e => { if (e.key === "Escape") open(false); });
  }

  window.I18N = { lang, langs: LANGS, t, plural, setLang };
  applyStatic();
  mountSwitcher();
})();
