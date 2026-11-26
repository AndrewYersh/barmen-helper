/* Главная: поиск, панель тегов, сетка карточек. */
(function () {
  const { DATA, esc, norm, GROUPS, STRENGTH_ORDER, tagClass, tagText, thumbHTML, openCocktail, readHash, writeHash, sheet,
          t, term, ingName, rawName, field, title, subtitle, cmp, plural } = window.BAR;
  const $ = id => document.getElementById(id);
  const EXTRA_MIN = 3;       // доп. теги показываем, если встречаются не реже N раз
  const EXTRA_VISIBLE = 14;  // сколько доп. тегов видно до «показать все»

  const selected = new Set();   // "group:value"
  let query = "";
  let extraExpanded = false;
  // на телефоне панель тегов — шторка по кнопке «Фильтры»
  const filters = sheet($("tagPanel"), { title: t("filters.title"), cls: "sheet-tags" });

  /* ---------- подготовка ---------- */
  const tagsOf = c => {
    const out = new Set();
    for (const [g, def] of Object.entries(GROUPS)) for (const v of def.get(c)) if (v) out.add(g + ":" + v);
    return out;
  };
  const items = DATA.cocktails.map(c => ({
    c,
    tags: tagsOf(c),
    name: norm(c.name_ru + " " + c.name_en),
    // ищем и по-русски, и на текущем языке
    hay: norm([
      c.name_ru, c.name_en, c.family, c.base_spirit, c.strength, c.glass, c.method,
      ...c.flavor, ...c.occasion, ...c.extra,
      ...[c.family, c.base_spirit, c.strength, c.glass, c.method, ...c.flavor, ...c.occasion, ...c.extra].map(term),
      ...c.ingredients.flatMap(i => [i.name, rawName(i), ...i.canon, ...i.canon.map(ingName)]),
    ].join(" | ")),
  }));

  // все значения тегов по группам, с частотой
  const allTags = {};
  for (const g of Object.keys(GROUPS)) {
    const cnt = new Map();
    for (const it of items) for (const v of GROUPS[g].get(it.c)) if (v) cnt.set(v, (cnt.get(v) || 0) + 1);
    let list = [...cnt.entries()].sort((a, b) => b[1] - a[1] || cmp(term(a[0]), term(b[0])));
    if (g === "strength") list.sort((a, b) => STRENGTH_ORDER.indexOf(a[0]) - STRENGTH_ORDER.indexOf(b[0]));
    if (g === "extra") list = list.filter(([, n]) => n >= EXTRA_MIN);
    allTags[g] = list.map(([v]) => v);
  }
  // для подсказок — все теги, включая редкие доп.
  const suggestTags = [];
  for (const g of Object.keys(GROUPS)) {
    const seen = new Set();
    for (const it of items) for (const v of GROUPS[g].get(it.c)) if (v && !seen.has(v)) {
      seen.add(v); suggestTags.push({ g, v, n: norm(tagText(g, v) + " " + v) });
    }
  }

  /* ---------- фильтрация ---------- */
  const words = () => norm(query).split(/\s+/).filter(Boolean);
  function matches(it, tagSet = selected, ws = words()) {
    for (const k of tagSet) if (!it.tags.has(k)) return false;
    for (const w of ws) if (!it.hay.includes(w)) return false;
    return true;
  }
  function results() {
    const ws = words();
    const list = items.filter(it => matches(it, selected, ws));
    const score = it => ws.length && ws.every(w => it.name.includes(w)) ? 0 : 1;
    return list.sort((a, b) => score(a) - score(b) || cmp(title(a.c), title(b.c)));
  }

  /* ---------- отрисовка ---------- */
  function renderPanel(current) {
    let html = "";
    for (const [g, def] of Object.entries(GROUPS)) {
      const vals = allTags[g];
      const chips = vals.map((v, i) => {
        const key = g + ":" + v;
        const on = selected.has(key);
        const n = on ? current.length
          : current.filter(it => it.tags.has(key)).length;
        const hidden = g === "extra" && !extraExpanded && i >= EXTRA_VISIBLE && !on;
        if (hidden) return "";
        return `<button class="tag ${tagClass(g, v)} ${on ? "on" : ""} ${!on && n === 0 ? "off" : ""}"
                  data-key="${esc(key)}" aria-pressed="${on}">${esc(tagText(g, v))}<span class="n">${n}</span></button>`;
      }).join("");
      const more = g === "extra" && vals.length > EXTRA_VISIBLE
        ? `<button class="more-btn" data-more>${extraExpanded ? t("tags.less") : t("tags.more", { n: vals.length })}</button>` : "";
      html += `<div class="tag-group"><div class="tag-group-title">${def.title}</div>
               <div class="tag-list">${chips}${more}</div></div>`;
    }
    $("tagPanel").innerHTML = html;
  }

  function renderActive(n) {
    const chips = [...selected].map(key => {
      const [g, v] = key.split(/:(.*)/s);
      return `<button class="tag on ${tagClass(g, v)}" data-key="${esc(key)}" title="${t("tags.remove")}">${esc(tagText(g, v))}</button>`;
    });
    if (query.trim()) chips.unshift(`<button class="tag on g-extra" data-query title="${t("tags.remove")}">«${esc(query.trim())}»</button>`);
    $("active").innerHTML = chips.join("");
    $("clear").hidden = chips.length === 0;
    $("count").textContent = `${n} ${plural(n, ["коктейль", "коктейля", "коктейлей"], ["cocktail", "cocktails"])}`;
  }

  function cardHTML(c) {
    const short = (field(c, "description") || field(c, "instructions")).split(/(?<=[.!?])\s/)[0];
    const flavors = c.flavor.slice(0, 4).map(f => `<span class="tag sm static g-flavor">${esc(term(f))}</span>`).join("");
    const sub = [subtitle(c), term(c.base_spirit)].filter(Boolean).join(" · ");
    return `<button class="card" data-id="${esc(c.id)}">
      ${thumbHTML(c, { badge: true })}
      <div class="card-body">
        <h3 class="card-title">${esc(title(c))}</h3>
        <div class="card-sub">${esc(sub)}</div>
        <p class="card-desc">${esc(short)}</p>
        <div class="card-tags">${flavors}</div>
      </div>
    </button>`;
  }

  function render() {
    const list = results();
    renderPanel(list);
    renderActive(list.length);
    filters.setLabel(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
      ${t("filters.title")}${selected.size ? `<span class="badge">${selected.size}</span>` : ""}`);
    filters.setDone(t("filters.show", { n: list.length }));
    $("grid").innerHTML = list.length
      ? list.map(it => cardHTML(it.c)).join("")
      : `<div class="empty" style="grid-column:1/-1"><b>${t("results.empty.title")}</b>${t("results.empty.text")}</div>`;
    writeHash({ tags: [...selected].join(","), q: query.trim(), c: openId });
  }

  /* ---------- подсказки в поиске ---------- */
  let hl = -1;
  function renderSuggest() {
    const ws = words();
    const box = $("suggest");
    if (!ws.length) { box.classList.remove("open"); return; }
    const tagHits = suggestTags.filter(t => ws.every(w => t.n.includes(w))).slice(0, 8);
    const ckHits = items.filter(it => ws.every(w => it.name.includes(w))).slice(0, 6);
    if (!tagHits.length && !ckHits.length) { box.classList.remove("open"); return; }
    let html = "";
    if (tagHits.length) html += `<h6>${t("suggest.tags")}</h6>` + tagHits.map(x =>
      `<button data-key="${esc(x.g + ":" + x.v)}"><span class="tag sm static ${tagClass(x.g, x.v)}">${esc(tagText(x.g, x.v))}</span>
       <span class="sub">${GROUPS[x.g].title.toLowerCase()}</span></button>`).join("");
    if (ckHits.length) html += `<h6>${t("suggest.cocktails")}</h6>` + ckHits.map(it =>
      `<button data-id="${esc(it.c.id)}">${esc(title(it.c))}<span class="sub">${esc(subtitle(it.c) || it.c.name_ru)}</span></button>`).join("");
    box.innerHTML = html;
    box.classList.add("open");
    hl = -1;
  }
  function pickSuggestion(btn) {
    if (btn.dataset.key) { selected.add(btn.dataset.key); query = ""; $("q").value = ""; }
    if (btn.dataset.id) { query = ""; $("q").value = ""; openCocktail(btn.dataset.id); }
    $("suggest").classList.remove("open");
    render();
  }

  /* ---------- события ---------- */
  let timer;
  $("q").addEventListener("input", e => {
    query = e.target.value;
    renderSuggest();
    clearTimeout(timer);
    timer = setTimeout(render, 120);
  });
  $("q").addEventListener("keydown", e => {
    const btns = [...$("suggest").querySelectorAll("button")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!btns.length) return;
      e.preventDefault();
      hl = (hl + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length;
      btns.forEach((b, i) => b.classList.toggle("hl", i === hl));
    } else if (e.key === "Enter") {
      if (hl >= 0 && btns[hl]) pickSuggestion(btns[hl]);
      else { $("suggest").classList.remove("open"); render(); }
    } else if (e.key === "Escape") {
      $("suggest").classList.remove("open");
    }
  });
  $("q").addEventListener("focus", renderSuggest);
  document.addEventListener("click", e => {
    if (!e.target.closest(".search-wrap")) $("suggest").classList.remove("open");
  });
  $("suggest").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b) pickSuggestion(b);
  });

  $("tagPanel").addEventListener("click", e => {
    if (e.target.closest("[data-more]")) { extraExpanded = !extraExpanded; render(); return; }
    const b = e.target.closest("[data-key]");
    if (!b) return;
    const k = b.dataset.key;
    selected.has(k) ? selected.delete(k) : selected.add(k);
    render();
  });
  $("active").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.query !== undefined) { query = ""; $("q").value = ""; }
    else selected.delete(b.dataset.key);
    render();
  });
  $("clear").addEventListener("click", () => {
    selected.clear(); query = ""; $("q").value = ""; render();
  });
  $("grid").addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (card) openCocktail(card.dataset.id);
  });

  let openId = "";
  window.BAR.onModal = id => { openId = id || ""; writeHash({ tags: [...selected].join(","), q: query.trim(), c: openId }); };
  window.BAR.onTagClick = key => {
    selected.add(key);
    render();
    (filters.mobile ? document.querySelector(".results-head") : $("tagPanel"))
      .scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------- старт ---------- */
  const h = readHash();
  if (h.tags) h.tags.split(",").filter(k => /^\w+:/.test(k) && GROUPS[k.split(":")[0]]).forEach(k => selected.add(k));
  if (h.q) { query = h.q; $("q").value = h.q; }
  render();
  if (h.c) openCocktail(h.c);
})();
