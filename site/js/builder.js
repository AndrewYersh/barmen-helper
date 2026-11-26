/* Конструктор: ингредиенты и их сочетания. */
(function () {
  const { DATA, esc, norm, catColor, ingCategory, glassSVG, openCocktail, closeModal, readHash, writeHash, sheet, infoBtn,
          t, term, ingName, title, cmp, plural } = window.BAR;
  const $ = id => document.getElementById(id);
  const GRAPH_N = 12;   // соседей на схеме
  const LIST_N = 20;    // соседей в списке

  // уникальные базовые ингредиенты каждого коктейля
  const sets = DATA.cocktails.map(c => ({ c, ing: new Set(c.ingredients.flatMap(i => i.canon)) }));
  const total = new Map();
  for (const s of sets) for (const i of s.ing) total.set(i, (total.get(i) || 0) + 1);

  let sel = [];   // выбранный набор
  let filter = "";

  /* ---------- расчёт ---------- */
  function analyse() {
    const hits = sets.filter(s => sel.every(i => s.ing.has(i)));
    const partners = new Map();
    for (const s of hits) for (const i of s.ing) if (!sel.includes(i)) partners.set(i, (partners.get(i) || 0) + 1);
    const ranked = [...partners.entries()].sort((a, b) =>
      b[1] - a[1] || (total.get(b[0]) - total.get(a[0])) || cmp(ingName(a[0]), ingName(b[0])));
    return { hits, ranked };
  }

  /* ---------- левая панель ---------- */
  function renderList() {
    const f = norm(filter);
    let html = "";
    for (const cat of DATA.categories) {
      const names = Object.keys(DATA.ingredients)
        .filter(n => DATA.ingredients[n].category === cat && (!f || norm(n + " " + ingName(n)).includes(f)))
        .sort((a, b) => (total.get(b) || 0) - (total.get(a) || 0) || cmp(ingName(a), ingName(b)));
      if (!names.length) continue;
      html += `<div class="cat-title"><span class="cat-dot" style="background:${catColor(cat)}"></span>${esc(term(cat))}</div>`;
      html += names.map(n => `<button class="ing-item ${sel.includes(n) ? "on" : ""}" data-ing="${esc(n)}">
          <span>${esc(ingName(n))}</span><span class="n">${total.get(n) || 0}</span>
          <span class="add" data-add title="${t("builder.add")}">+</span></button>`).join("");
    }
    $("ingList").innerHTML = html || `<p style="color:var(--muted);padding:12px">${t("builder.nothing")}</p>`;
  }

  /* ---------- схема ---------- */
  function graphSVG(ranked, hits) {
    const small = window.matchMedia("(max-width: 760px), (max-height: 500px)").matches;   // телефон: крупнее подписи — меньше круг
    const W = 740, C = W / 2, R = small ? 150 : 210, CR = small ? 56 : 62, FS = small ? 22 : 14;
    const top = ranked.slice(0, GRAPH_N);
    if (!top.length) {
      return `<svg viewBox="0 0 ${W} ${W}"><text x="${C}" y="${C}" text-anchor="middle" fill="#a8988a"
              font-size="15">${t("builder.graph.none")}</text></svg>`;
    }
    const max = top[0][1];
    const pos = top.map(([name, n], i) => {
      const a = -Math.PI / 2 + (i / top.length) * Math.PI * 2;
      return { name, n, a, x: C + R * Math.cos(a), y: C + R * Math.sin(a), r: 12 + 14 * (n / max) };
    });
    // связи между соседями (внутри найденных коктейлей)
    let cross = "";
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const k = hits.filter(s => s.ing.has(pos[i].name) && s.ing.has(pos[j].name)).length;
      if (k >= 2) cross += `<line x1="${pos[i].x}" y1="${pos[i].y}" x2="${pos[j].x}" y2="${pos[j].y}"
        stroke="#efe3d1" stroke-opacity="${Math.min(.05 + k * .03, .22)}" stroke-width="1"/>`;
    }
    const edges = pos.map(p => `<line x1="${C}" y1="${C}" x2="${p.x}" y2="${p.y}"
        stroke="${catColor(ingCategory(p.name))}" stroke-opacity="${.25 + .55 * p.n / max}"
        stroke-width="${1.5 + 8 * p.n / max}" stroke-linecap="round"/>`).join("");
    const nodes = pos.map(p => {
      const cos = Math.cos(p.a), sin = Math.sin(p.a);
      const anchor = cos > .3 ? "start" : cos < -.3 ? "end" : "middle";
      const lx = p.x + cos * (p.r + 8), ly = p.y + sin * (p.r + 8) + (Math.abs(cos) <= .3 ? (sin > 0 ? 12 : -4) : 4);
      return `<g class="node" data-add-ing="${esc(p.name)}" tabindex="0" role="button" aria-label="${esc(t("builder.node.aria", { name: ingName(p.name) }))}">
        <title>${esc(t("builder.node.tip", { name: ingName(p.name), n: p.n }))}</title>
        <circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${catColor(ingCategory(p.name))}" fill-opacity=".9" stroke="#120f0d" stroke-width="3"/>
        <text x="${p.x}" y="${p.y + 4}" text-anchor="middle" class="cnt" style="fill:#1a1310;font-weight:600">${p.n}</text>
        <text x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(ingName(p.name))}</text></g>`;
    }).join("");
    const names = sel.map(ingName);
    const lines = names.length > 2 ? [names.slice(0, 2).join(" + "), t("builder.graph.more", { n: names.length - 2 })] : names;
    const label = lines.map((l, i) => `<text x="${C}" y="${C + FS / 3 + (i - (lines.length - 1) / 2) * FS * 1.25}"
        text-anchor="middle" fill="#1a1310" font-weight="600" font-size="${FS}">${esc(l)}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="${t("builder.graph.aria")}">
      ${cross}${edges}
      <circle cx="${C}" cy="${C}" r="${CR}" fill="#e0a458" stroke="#120f0d" stroke-width="4"/>
      <circle cx="${C}" cy="${C}" r="${CR + 10}" fill="none" stroke="#e0a458" stroke-opacity=".3"/>
      ${label}${nodes}</svg>`;
  }

  /* ---------- правая панель ---------- */
  function renderDetail() {
    const box = $("detail");
    if (!sel.length) {
      const popular = [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      box.innerHTML = `<div class="placeholder-start"><div>
        <b>${t("builder.start.title")}</b>
        ${t("builder.start.text")}
        <div class="mini-cards" style="justify-content:center;margin-top:16px">
          ${popular.map(([n, k]) => `<button class="tag" data-pick="${esc(n)}">${esc(ingName(n))}<span class="n">${k}</span></button>`).join("")}
        </div></div></div>`;
      return;
    }
    const { hits, ranked } = analyse();
    const max = ranked.length ? ranked[0][1] : 1;
    const chips = sel.map(n => `<span class="set-chip"><span class="cat-dot" style="background:${catColor(ingCategory(n))}"></span>
        ${esc(ingName(n))}${infoBtn(n)}<button data-remove="${esc(n)}" aria-label="${esc(t("builder.remove", { name: ingName(n) }))}">×</button></span>`)
      .join(`<span class="set-plus">+</span>`);
    const pairs = ranked.slice(0, LIST_N).map(([n, k]) => `<button class="pair" data-add-ing="${esc(n)}"
        title="${t("builder.pair.tip", { k, n: hits.length, p: Math.round(100 * k / hits.length) })}">
        <span class="nm"><span class="cat-dot" style="background:${catColor(ingCategory(n))}"></span><span>${esc(ingName(n))}</span></span>
        <span class="bar"><i style="width:${100 * k / max}%;background:${catColor(ingCategory(n))}"></i></span>
        <span class="v">${k}</span></button>`).join("");
    const cocktails = hits.map(s => `<button class="mini-card" data-id="${esc(s.c.id)}">
        <span class="ph">${s.c.image ? "" : glassSVG(s.c, { mini: true })}</span>${esc(title(s.c))}</button>`).join("");
    const word = n => plural(n, ["коктейле", "коктейлях", "коктейлях"], ["cocktail", "cocktails"]);

    box.innerHTML = `
      <div class="set-bar"><span class="label">${t("builder.set")}</span>${chips}
        ${sel.length > 1 ? `<button class="clear-btn" data-reset>${t("builder.reset")}</button>` : ""}</div>
      <div class="detail-grid">
        <div>
          <div class="graph-box">${graphSVG(ranked, hits)}</div>
          <div class="graph-hint">${t("builder.hint")}</div>
        </div>
        <div>
          <h4 class="section-title">${t("builder.pairs")}</h4>
          <div class="pairs">${pairs || `<p style="color:var(--muted)">${t("builder.pairs.none")}</p>`}</div>
        </div>
      </div>
      <h4 class="section-title" style="margin-top:26px">${t("builder.in", { n: hits.length, word: word(hits.length) })}</h4>
      <div class="mini-cards">${cocktails || `<span style="color:var(--muted)">${t("builder.in.none")}</span>`}</div>`;
  }

  const picker = sheet(document.querySelector(".ing-panel"), { title: t("builder.ingredients"), anchor: $("builder") });
  function render() {
    renderList();
    renderDetail();
    picker.setLabel(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span class="lbl">${sel.length ? esc(sel.map(ingName).join(" + ")) : t("builder.ingredients")}</span><span class="chev">▾</span>`);
    writeHash({ ing: sel.join(",") });
  }

  /* ---------- события ---------- */
  const add = n => { if (!sel.includes(n)) sel.push(n); render(); };
  const only = n => { sel = [n]; render(); };

  $("ingQ").addEventListener("input", e => { filter = e.target.value; renderList(); });
  $("ingList").addEventListener("click", e => {
    const item = e.target.closest("[data-ing]");
    if (!item) return;
    if (e.target.closest("[data-add]")) return add(item.dataset.ing);
    picker.closeOnMobile();
    only(item.dataset.ing);
  });
  $("detail").addEventListener("click", e => {
    const t = e.target;
    const a = t.closest("[data-add-ing]");
    if (a) return add(a.dataset.addIng);
    const r = t.closest("[data-remove]");
    if (r) { sel = sel.filter(n => n !== r.dataset.remove); return render(); }
    if (t.closest("[data-reset]")) { sel = []; return render(); }
    const p = t.closest("[data-pick]");
    if (p) return only(p.dataset.pick);
    const c = t.closest("[data-id]");
    if (c) openCocktail(c.dataset.id);
  });
  $("detail").addEventListener("keydown", e => {
    const a = e.target.closest && e.target.closest("[data-add-ing]");
    if (a && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); add(a.dataset.addIng); }
  });

  /* ---------- компактная / развёрнутая панель ингредиентов ---------- */
  const KEY = "bar.ingPanelExpanded";
  function setExpanded(on) {
    $("builder").classList.toggle("compact", !on);
    $("ingToggle").setAttribute("aria-expanded", on);
    $("ingToggle").querySelector("b").textContent = on ? t("builder.collapse") : t("builder.expand");
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (_) { /* приватный режим */ }
  }
  $("ingToggle").addEventListener("click", () =>
    setExpanded($("builder").classList.contains("compact")));
  try { setExpanded(localStorage.getItem(KEY) === "1"); } catch (_) { setExpanded(false); }

  function fromHash() {
    const h = readHash();
    sel = (h.ing || "").split(",").filter(n => DATA.ingredients[n]);
    closeModal();
    render();
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();
