/* Замены: чем заменить основу или ликёр. */
(function () {
  const { DATA, esc, norm, catColor, ingCategory, glassSVG, openCocktail, closeModal, readHash, writeHash, sheet, infoBtn, abvClass,
          t, term, ingName, field, title, cmp } = window.BAR;
  const $ = id => document.getElementById(id);
  const SUBS = DATA.substitutions || {};
  const subName = s => field(s, "name") !== s.name ? field(s, "name") : ingName(s.name);

  const usage = new Map();   // ингредиент -> коктейли
  for (const c of DATA.cocktails)
    for (const n of new Set(c.ingredients.flatMap(i => i.canon))) {
      if (!usage.has(n)) usage.set(n, []);
      usage.get(n).push(c);
    }
  const count = n => (usage.get(n) || []).length;

  let current = "";
  let filter = "";

  function renderList() {
    const f = norm(filter);
    const names = Object.keys(SUBS).filter(n => !f || norm(n + " " + ingName(n)).includes(f));
    const cats = [...DATA.categories, ""];
    let html = "";
    for (const cat of cats) {
      const inCat = names.filter(n => (ingCategory(n) || "") === cat)
        .sort((a, b) => count(b) - count(a) || cmp(ingName(a), ingName(b)));
      if (!inCat.length) continue;
      html += `<div class="cat-title"><span class="cat-dot" style="background:${catColor(cat)}"></span>${esc(cat ? term(cat) : t("subs.other"))}</div>`;
      html += inCat.map(n => `<button class="ing-item ${n === current ? "on" : ""}" data-ing="${esc(n)}">
          <span>${esc(ingName(n))}</span><span class="n">${t("subs.count", { n: SUBS[n].length })}</span></button>`).join("");
    }
    $("subList").innerHTML = html || `<p style="color:var(--muted);padding:12px">${t("builder.nothing")}</p>`;
  }

  // справка о выбранном ингредиенте: крепость · из чего · вкус
  function infoLine(n) {
    const info = (DATA.ingredients[n] || {}).info;
    if (!info) return "";
    return `<dl class="ii-inline">
      <span class="ii-abv ${abvClass(info.abv)}">${esc(info.abv)}</span>
      <div><dt>${t("info.made")}</dt><dd>${esc(field(info, "made_from"))}</dd></div>
      <div><dt>${t("info.taste")}</dt><dd>${esc(field(info, "taste"))}</dd></div></dl>`;
  }

  function renderDetail() {
    const box = $("subDetail");
    if (!current) {
      const popular = Object.keys(SUBS).sort((a, b) => count(b) - count(a)).slice(0, 12);
      box.innerHTML = `<div class="placeholder-start"><div>
        <b>${t("subs.start.title")}</b>
        ${t("subs.start.text")}
        <div class="mini-cards" style="justify-content:center;margin-top:16px">
          ${popular.map(n => `<button class="tag" data-ing="${esc(n)}">${esc(ingName(n))}<span class="n">${count(n)}</span></button>`).join("")}
        </div></div></div>`;
      return;
    }
    const list = SUBS[current] || [];
    const levels = [1, 2, 3].map(lv => {
      const items = list.filter(s => s.level === lv);
      if (!items.length) return "";
      const cards = items.map(s => {
        const known = count(s.name);
        const hasOwn = SUBS[s.name] && s.name !== current;
        return `<div class="sub-card lv-${lv}">
          <div class="nm">${esc(subName(s))}${DATA.ingredients[s.name] ? infoBtn(s.name) : ""}${known ? `<small>${t("subs.in", { n: known })}</small>` : ""}</div>
          <p>${esc(field(s, "note"))}</p>
          ${hasOwn ? `<button class="go" data-ing="${esc(s.name)}">${t("subs.goto")}</button>` : ""}
        </div>`;
      }).join("");
      return `<div class="sub-level lv-${lv}">
        <h4><i></i>${esc(t("subs.level." + lv))} <span>— ${t("subs.hint." + lv)}</span></h4>
        <div class="sub-cards">${cards}</div></div>`;
    }).join("");
    const used = usage.get(current) || [];
    box.innerHTML = `
      <div class="sub-head">
        <h2>${esc(ingName(current))}</h2>
        <span class="meta"><span class="cat-dot" style="display:inline-block;background:${catColor(ingCategory(current))}"></span>
          ${esc(term(ingCategory(current)))} · ${t("subs.in", { n: used.length })} ·
          <a href="builder.html#ing=${encodeURIComponent(current)}">${t("subs.pairs")}</a></span>
      </div>
      ${infoLine(current)}
      ${levels}
      <h4 class="section-title" style="margin-top:28px">${t("subs.where")}</h4>
      <div class="mini-cards">${used.map(c => `<button class="mini-card" data-id="${esc(c.id)}">
        <span class="ph">${glassSVG(c, { mini: true })}</span>${esc(title(c))}</button>`).join("")
        || `<span style="color:var(--muted)">${t("subs.where.none")}</span>`}</div>`;
  }

  const picker = sheet(document.querySelector(".ing-panel"), { title: t("subs.pick"), anchor: document.querySelector(".builder") });
  function render() {
    renderList();
    renderDetail();
    picker.setLabel(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span class="lbl">${current ? esc(ingName(current)) : t("subs.pick")}</span><span class="chev">▾</span>`);
    writeHash({ ing: current });
  }

  const select = n => { current = n; render(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  $("subQ").addEventListener("input", e => { filter = e.target.value; renderList(); });
  $("subList").addEventListener("click", e => {
    const b = e.target.closest("[data-ing]");
    if (b) { picker.closeOnMobile(); select(b.dataset.ing); }
  });
  $("subDetail").addEventListener("click", e => {
    const b = e.target.closest("[data-ing]");
    if (b) return select(b.dataset.ing);
    const c = e.target.closest("[data-id]");
    if (c) openCocktail(c.dataset.id);
  });

  function fromHash() {
    const h = readHash();
    current = SUBS[h.ing] ? h.ing : "";
    closeModal();
    render();
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();
