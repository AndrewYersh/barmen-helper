/* Мой бар: отмечаем, что есть, — показываем, что из этого можно сделать.
   Правила подбора:
   - весь алкоголь рецепта должен быть в баре (строго);
   - безалкогольных ингредиентов может не хватать до MAX_MISS — тогда пометка «докупить»;
   - вода, лёд, сахар, соль считаются всегда доступными (BASICS);
   - ингредиенты «по желанию» не обязательны;
   - режим «только алкоголь»: учитываются только бутылки, остальное просто перечисляется. */
(function () {
  const { DATA, esc, norm, catColor, ingCategory, thumbHTML, openCocktail, closeModal, sheet, infoBtn,
          t, term, ingName, title, subtitle, cmp } = window.BAR;
  const $ = id => document.getElementById(id);

  const MAX_MISS = 3;
  const UNLOCK_N = 8;
  const ALC_CATS = new Set(["Крепкий алкоголь", "Ликёры", "Вермуты и аперитивы", "Вино, игристое, пиво"]);
  const NOT_ALC = new Set(["Безалкогольный аперитив"]);
  const BASICS = new Set(["Вода", "Лёд", "Сахар", "Сахарный сироп", "Соль"]);
  // что ещё «есть», если отмечено это: из фрукта можно выжать сок, игристое = шампанское
  const IMPLIES = {
    "Лайм": ["Сок лайма"], "Лимон": ["Сок лимона"], "Апельсин": ["Апельсиновый сок"],
    "Ананас": ["Ананасовый сок"], "Яблоко": ["Яблочный сок"],
    "Игристое вино": ["Шампанское"], "Шампанское": ["Игристое вино"],
  };
  const KEY_SEL = "bar.myBar", KEY_MODE = "bar.myBarMode";

  const isAlc = n => ALC_CATS.has(ingCategory(n)) && !NOT_ALC.has(n);

  // по каждому коктейлю: обязательный алкоголь, прочее обязательное, всё (с опциональными)
  const recs = DATA.cocktails.map(c => {
    const req = new Set(), all = new Set();
    for (const i of c.ingredients) for (const n of i.canon) {
      all.add(n);
      if (!i.optional) req.add(n);
    }
    const alc = [...req].filter(isAlc);
    const other = [...req].filter(n => !isAlc(n) && !BASICS.has(n));
    return { c, alc, other, all: [...all].filter(n => !BASICS.has(n)) };
  });
  const total = new Map();
  for (const r of recs) for (const n of r.all) total.set(n, (total.get(n) || 0) + 1);

  let sel = new Set();
  let mode = "all";   // "all" | "alc"
  let filter = "";

  function load() {
    try {
      sel = new Set(JSON.parse(localStorage.getItem(KEY_SEL) || "[]").filter(n => DATA.ingredients[n]));
      mode = localStorage.getItem(KEY_MODE) === "alc" ? "alc" : "all";
    } catch (_) { /* приватный режим */ }
  }
  function save() {
    try {
      localStorage.setItem(KEY_SEL, JSON.stringify([...sel]));
      localStorage.setItem(KEY_MODE, mode);
    } catch (_) { /* приватный режим */ }
  }

  /* ---------- подбор ---------- */
  function match() {
    const avail = new Set(sel);
    for (const n of sel) for (const m of IMPLIES[n] || []) avail.add(m);
    const has = n => avail.has(n);
    const out = [];
    const unlock = new Map();   // ингредиент -> сколько коктейлей станут «можно сейчас»
    for (const r of recs) {
      const lackAlc = r.alc.filter(n => !has(n));
      if (mode === "alc") {
        if (!r.alc.length) continue;
        const have = r.alc.filter(n => has(n));
        if (!have.length) continue;
        if (!lackAlc.length) out.push({ ...r, have, miss: [], need: r.other });
        else if (lackAlc.length === 1) unlock.set(lackAlc[0], (unlock.get(lackAlc[0]) || 0) + 1);
        continue;
      }
      const have = r.all.filter(n => has(n));
      if (!have.length) continue;
      const miss = r.other.filter(n => !has(n));
      const lack = [...lackAlc, ...miss];
      if (lack.length === 1) unlock.set(lack[0], (unlock.get(lack[0]) || 0) + 1);
      if (!lackAlc.length && miss.length <= MAX_MISS) out.push({ ...r, have, miss, need: [] });
    }
    out.sort((a, b) =>
      a.miss.length - b.miss.length ||
      b.alc.length - a.alc.length ||                 // сначала больше совпадений по алкоголю
      b.have.length - a.have.length ||
      (mode === "alc" ? a.need.length - b.need.length : 0) ||
      cmp(title(a.c), title(b.c)));
    const unl = [...unlock.entries()].filter(([n]) => !has(n))
      .sort((a, b) => b[1] - a[1] || cmp(ingName(a[0]), ingName(b[0]))).slice(0, UNLOCK_N);
    return { out, unl };
  }

  /* ---------- левая панель ---------- */
  function renderList() {
    const f = norm(filter);
    let html = "";
    for (const cat of DATA.categories) {
      const names = Object.keys(DATA.ingredients)
        .filter(n => DATA.ingredients[n].category === cat && !BASICS.has(n) && (mode === "all" || isAlc(n)))
        .filter(n => !f || norm(n + " " + ingName(n)).includes(f))
        .sort((a, b) => (total.get(b) || 0) - (total.get(a) || 0) || cmp(ingName(a), ingName(b)));
      if (!names.length) continue;
      const on = names.filter(n => sel.has(n)).length;
      html += `<div class="cat-title"><span class="cat-dot" style="background:${catColor(cat)}"></span>${esc(term(cat))}
        ${on ? `<span class="cat-on">${on}</span>` : ""}</div>`;
      html += names.map(n => `<button class="ing-item check ${sel.has(n) ? "on" : ""}" data-ing="${esc(n)}"
          role="checkbox" aria-checked="${sel.has(n)}">
          <span class="box" style="--c:${catColor(cat)}"></span>
          <span>${esc(ingName(n))}</span><span class="n">${total.get(n) || 0}</span>${infoBtn(n)}</button>`).join("");
    }
    $("barList").innerHTML = html || `<p style="color:var(--muted);padding:12px">${t("builder.nothing")}</p>`;
    const n = [...sel].filter(x => mode === "all" || isAlc(x)).length;
    $("barCount").innerHTML = n
      ? `${esc(t("mybar.selected", { n }))} · <button class="clear-btn" data-clear>${t("mybar.clear")}</button>`
      : "";
  }

  /* ---------- выдача ---------- */
  const chip = (n, cls) => `<span class="need-chip ${cls}" data-ing-info="${esc(n)}" role="button" tabindex="0"><span class="cat-dot" style="background:${catColor(ingCategory(n))}"></span>${esc(ingName(n))}</span>`;

  function cardHTML(r) {
    const c = r.c;
    const sub = [subtitle(c), term(c.base_spirit)].filter(Boolean).join(" · ");
    let extra = "";
    if (r.miss.length) extra = `<div class="need"><span class="lbl buy">${t("mybar.buy")}</span>${r.miss.map(n => chip(n, "buy")).join("")}</div>`;
    else if (r.need.length) extra = `<div class="need"><span class="lbl">${t("mybar.need")}</span>${r.need.map(n => chip(n, "")).join("")}</div>`;
    const flavors = c.flavor.slice(0, 3).map(f => `<span class="tag sm static g-flavor">${esc(term(f))}</span>`).join("");
    return `<button class="card ${r.miss.length ? "lacks" : ""}" data-id="${esc(c.id)}">
      ${thumbHTML(c, { badge: true })}
      <div class="card-body">
        <h3 class="card-title">${esc(title(c))}</h3>
        <div class="card-sub">${esc(sub)}</div>
        ${extra}
        <div class="card-tags">${flavors}</div>
      </div></button>`;
  }

  function renderResults() {
    const box = $("barResults");
    const pool = [...sel].filter(n => mode === "all" || isAlc(n));
    if (!pool.length) {
      const popular = [...total.entries()].filter(([n]) => mode === "all" || isAlc(n))
        .sort((a, b) => b[1] - a[1]).slice(0, 14);
      box.innerHTML = `<div class="placeholder-start"><div>
        <b>${t("mybar.start.title")}</b>${t(mode === "alc" ? "mybar.start.alc" : "mybar.start.text")}
        <div class="mini-cards" style="justify-content:center;margin-top:16px;max-width:620px">
          ${popular.map(([n, k]) => `<button class="tag" data-add="${esc(n)}">${esc(ingName(n))}<span class="n">${k}</span></button>`).join("")}
        </div></div></div>`;
      return;
    }
    const { out, unl } = match();
    const ready = out.filter(r => !r.miss.length).length;
    const summary = mode === "alc"
      ? t("mybar.summary.alc", { a: out.length })
      : t("mybar.summary", { a: ready, b: out.length - ready });
    const unlock = unl.length ? `<div class="unlock"><span class="lbl">${t("mybar.unlock")}</span>
        ${unl.map(([n, k]) => `<button class="tag sm" data-add="${esc(n)}" style="--c:${catColor(ingCategory(n))}"
          title="${esc(t("mybar.unlock.tip", { n: k }))}">+ ${esc(ingName(n))}<span class="n">+${k}</span></button>`).join("")}
      </div>` : "";

    let body = "";
    if (!out.length) {
      body = `<div class="empty"><b>${t("mybar.empty.title")}</b>${t(mode === "alc" ? "mybar.empty.alc" : "mybar.empty.text")}</div>`;
    } else if (mode === "alc") {
      body = `<div class="grid">${out.map(cardHTML).join("")}</div>`;
    } else {
      for (let k = 0; k <= MAX_MISS; k++) {
        const part = out.filter(r => r.miss.length === k);
        if (!part.length) continue;
        body += `<h4 class="section-title bar-group ${k ? "" : "ready"}">${t("mybar.group." + k)} <span>${part.length}</span></h4>
          <div class="grid">${part.map(cardHTML).join("")}</div>`;
      }
    }
    box.innerHTML = `<div class="bar-summary">${esc(summary)}</div>${unlock}${body}`;
  }

  function renderMode() {
    document.querySelectorAll("[data-mode]").forEach(b => {
      b.classList.toggle("on", b.dataset.mode === mode);
      b.setAttribute("aria-pressed", b.dataset.mode === mode);
    });
    $("modeHint").textContent = t("mybar.hint." + mode);
  }

  const picker = sheet(document.querySelector(".ing-panel"), { title: t("mybar.have"), anchor: document.querySelector(".builder") });
  function render() {
    renderMode();
    const cnt = [...sel].filter(x => mode === "all" || isAlc(x)).length;
    picker.setLabel(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span class="lbl">${t("mybar.have")}${cnt ? ` <span class="badge">${cnt}</span>` : ""}</span><span class="chev">▾</span>`);
    renderList();
    renderResults();
    save();
  }

  /* ---------- события ---------- */
  const toggle = n => { sel.has(n) ? sel.delete(n) : sel.add(n); render(); };

  $("barQ").addEventListener("input", e => { filter = e.target.value; renderList(); });
  $("barList").addEventListener("click", e => {
    const item = e.target.closest("[data-ing]");
    if (item) toggle(item.dataset.ing);
  });
  $("barCount").addEventListener("click", e => {
    if (!e.target.closest("[data-clear]")) return;
    for (const n of [...sel]) if (mode === "all" || isAlc(n)) sel.delete(n);
    render();
  });
  $("barResults").addEventListener("click", e => {
    const a = e.target.closest("[data-add]");
    if (a) { sel.add(a.dataset.add); return render(); }
    const c = e.target.closest("[data-id]");
    if (c) openCocktail(c.dataset.id);
  });
  document.querySelector(".mode-switch").addEventListener("click", e => {
    const b = e.target.closest("[data-mode]");
    if (b && b.dataset.mode !== mode) { mode = b.dataset.mode; render(); }
  });

  load();
  closeModal();
  render();
})();
