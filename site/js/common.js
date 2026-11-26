/* Общие функции для всех страниц: данные, плейсхолдеры, модальное окно. */
(function () {
  const DATA = window.BAR_DATA;
  const I = window.I18N || { lang: "ru", t: k => k, plural: (n, ru) => ru[2] };
  const t = I.t;
  const L = I.lang;
  if (!DATA) {
    document.body.innerHTML = `<p style="padding:40px;color:#f2e8da">${t("nodata")}</p>`;
    throw new Error("BAR_DATA missing");
  }

  /* ---------- перевод данных (русский — исходный язык, при отсутствии перевода показываем его) ---------- */
  const RU = L === "ru";
  const terms = (DATA.terms || {})[L] || {};
  const term = v => (!RU && terms[v]) || v;                                   // теги, бокал, метод, единицы…
  const ingName = n => (!RU && ((DATA.ingredients[n] || {}).i18n || {})[L]) || n;  // базовый ингредиент
  const rawName = i => (!RU && (i.i18n || {})[L]) || i.name;                 // ингредиент в рецепте
  const field = (o, f) => (!RU && ((o.i18n || {})[L] || {})[f]) || o[f];    // текстовое поле коктейля/вариации
  const title = c => RU ? c.name_ru : (c.name_en || c.name_ru);
  const subtitle = c => RU ? c.name_en : "";
  const cmp = (a, b) => String(a).localeCompare(String(b), L);
  const byId = Object.fromEntries(DATA.cocktails.map(c => [c.id, c]));

  const esc = s => String(s ?? "").replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  /* ---------- группы тегов ---------- */
  const GROUPS = {
    flavor:   { title: t("group.flavor"),   cls: "g-flavor",   get: c => c.flavor },
    strength: { title: t("group.strength"), cls: "g-strength", get: c => [c.strength] },
    occasion: { title: t("group.occasion"), cls: "g-occasion", get: c => c.occasion },
    base:     { title: t("group.base"),     cls: "g-base",     get: c => [c.base_spirit] },
    extra:    { title: t("group.extra"),    cls: "g-extra",    get: c => c.extra },
  };
  const STRENGTH_ORDER = ["безалкогольный", "лёгкий", "средний", "крепкий"];
  const STRENGTH_CLS = { "безалкогольный": "st-zero", "лёгкий": "st-light", "средний": "st-medium", "крепкий": "st-strong" };
  const tagClass = (g, v) => GROUPS[g].cls + (g === "strength" ? " " + (STRENGTH_CLS[v] || "") : "");
  const tagText = (g, v) => g === "strength" && v === "безалкогольный" ? t("strength.zero") : term(v);

  /* ---------- категории ингредиентов ---------- */
  const CAT_COLORS = ["#e0a458", "#c8743f", "#d9694a", "#b5708f", "#8f6a4a", "#e6c55a",
                      "#d8a0c0", "#7fb3a6", "#e8d8bc", "#7fa35a", "#a99bc7", "#8aa0b8"];
  const catColor = cat => CAT_COLORS[Math.max(0, DATA.categories.indexOf(cat)) % CAT_COLORS.length];
  const ingCategory = name => (DATA.ingredients[name] || {}).category || "";

  /* ---------- иллюстрация: силуэт бокала с деталями ---------- */
  // rim — [левый x, правый x, y] ободка; level — уровень жидкости; hl — блик на стекле
  const SHAPES = {
    coupe:     { body: "M14 30 Q14 70 50 72 Q86 70 86 30 Z", extra: "M50 72 L50 122 M30 124 L70 124", level: 40,
                 rim: [14, 86, 30], hl: "M22 37 Q24 55 35 63", stem: true },
    martini:   { body: "M10 26 L50 78 L90 26 Z", extra: "M50 78 L50 122 M30 124 L70 124", level: 38,
                 rim: [10, 90, 26], hl: "M21 34 L37 55", stem: true },
    rocks:     { body: "M20 56 L80 56 L76 124 L24 124 Z", extra: "", level: 72,
                 rim: [20, 80, 56], hl: "M27 64 L29 114" },
    highball:  { body: "M30 18 L70 18 L68 124 L32 124 Z", extra: "", level: 34,
                 rim: [30, 70, 18], hl: "M36 26 L38 112" },
    flute:     { body: "M37 16 Q35 70 50 88 Q65 70 63 16 Z", extra: "M50 88 L50 122 M34 124 L66 124", level: 30,
                 rim: [37, 63, 16], hl: "M42 24 Q41 52 46 72", stem: true },
    hurricane: { body: "M33 16 Q22 48 38 70 Q26 96 34 114 L66 114 Q74 96 62 70 Q78 48 67 16 Z", extra: "M40 124 L60 124 M50 114 L50 124",
                 level: 32, rim: [33, 67, 16], hl: "M38 24 Q31 46 41 66" },
    wine:      { body: "M27 16 Q22 64 50 72 Q78 64 73 16 Z", extra: "M50 72 L50 122 M30 124 L70 124", level: 38,
                 rim: [27, 73, 16], hl: "M33 24 Q31 48 40 61", stem: true },
    mug:       { body: "M24 34 L72 34 L70 124 L26 124 Z", extra: "M72 52 Q92 54 90 78 Q88 100 71 100", level: 46,
                 rim: [24, 72, 34], hl: "M31 42 L33 114" },
    shot:      { body: "M34 74 L66 74 L63 124 L37 124 Z", extra: "", level: 82,
                 rim: [34, 66, 74], hl: "M40 82 L41 117" },
    beer:      { body: "M28 16 L72 16 L65 124 L35 124 Z", extra: "", level: 30, foam: true,
                 rim: [28, 72, 16], hl: "M34 26 L39 112" },
  };
  const GLASS_RULES = [
    [/мартини/, "martini"], [/маргарит|купе|коктейльн/, "coupe"], [/олд фэшн|рокс/, "rocks"],
    [/хайбол|коллинз|высокий стакан/, "highball"], [/флюте|шампанск/, "flute"],
    [/харрикейн|тики|кокос/, "hurricane"], [/шот/, "shot"], [/пивн|пинта|бутылка пива/, "beer"],
    [/кружк|чашк|чаша|джулеп|ирландск/, "mug"],
    [/винн|баллон|кувшин|бокал/, "wine"],
  ];
  function glassShape(glass) {
    const first = String(glass || "").toLowerCase().split(/ или | \+ /)[0];
    for (const [re, s] of GLASS_RULES) if (re.test(first)) return s;
    return "coupe";
  }
  function liquidColor(c) {
    const ing = c.ingredients.flatMap(i => i.canon).join(" ");
    const f = new Set(c.flavor);
    if (/Блю кюрасао/.test(ing)) return "#3f86d8";
    if (/Кампари|Апероль/.test(ing)) return "#d8452c";
    if (/Мятный ликёр/.test(ing)) return "#5fbf7a";
    if (f.has("кофейный") || f.has("шоколадный")) return "#5a3420";
    if (/Томатный сок/.test(ing) || f.has("ягодный") || f.has("вишнёвый")) return "#b3344c";
    if (f.has("сливочный")) return "#eadbc0";
    if (f.has("тропический")) return "#ee9442";
    if (f.has("мятный") || f.has("травяной") && !f.has("горький")) return "#9cbf63";
    if (f.has("игристый")) return "#ecd98e";
    if (f.has("цитрусовый") && !f.has("древесный")) return "#e8c95c";
    return "#c8843f";
  }
  // цвет отдельного ингредиента — для слоистых шотов
  function layerColor(name) {
    const n = name.toLowerCase();
    if (/кофе|стаут|какао|ягермайстер/.test(n)) return "#4a2a18";
    if (/сливоч|сливки|ирис/.test(n)) return "#e6d3b3";
    if (/блю/.test(n)) return "#3f86d8";
    if (/гренадин|вишн|ягод|кассис|малин/.test(n)) return "#b0243a";
    if (/мят|шартрез|абсент|дын/.test(n)) return "#6fb24f";
    if (/самбук|водк|джин|граппа|текил/.test(n)) return "#efe9dc";
    if (/шампан|игрист|пиво|персик|банан/.test(n)) return "#ecd98e";
    return "#e09a3c";
  }

  const LINE = 'stroke="#efe3d1" stroke-opacity=".7"';
  const BUBBLY = /Содовая|Тоник|Игристое вино|Шампанское|Кола|Имбирное пиво|Имбирный эль|Лимонад|Биттер-лимон|Сидр|Пиво/;
  const CITRUS = [[/лайм/, "#a6cf4f"], [/грейпфрут/, "#f08a6a"], [/апельсин/, "#f0a040"], [/лимон/, "#f0d34a"]];
  const citrusColor = g => (CITRUS.find(([re]) => re.test(g)) || [0, "#f0d34a"])[1];

  /** Детали иллюстрации, выведенные из рецепта. */
  function features(c) {
    const g = String(c.garnish || "").toLowerCase();
    const raw = c.ingredients.map(i => i.name.toLowerCase()).join(" | ");
    const canon = c.ingredients.flatMap(i => i.canon);
    const ice = String(c.ice || "").toLowerCase().split(" / ")[0];
    const method = String(c.method || "").toLowerCase();
    const family = String(c.family || "");
    // украшение, упомянутое первым, — в приоритете («долька или цедра» → долька)
    const firstOf = (...res) => Math.min(...res.map(re => { const m = g.search(re); return m < 0 ? 1e9 : m; }));
    const wheelAt = firstOf(/(долька|кружок|ломтик|половинка|колесо)[^,]*(лайм|лимон|апельсин|грейпфрут)|(лайм|лимон|апельсин|грейпфрут)[а-я]* (долька|кружок)/);
    const twistAt = firstOf(/цедр|спирал/);
    return {
      ice: /дробл/.test(ice) ? "crushed" : /больш/.test(ice) ? "big" : /кубик/.test(ice) ? "cubes" : "none",
      foam: canon.includes("Яичный белок") || /флип/i.test(family) || /драй-шейк/.test(method),
      bubbles: c.flavor.includes("игристый") || canon.some(n => BUBBLY.test(n)),
      layers: /слои|лэйер|флоат|пусс/.test(method) && c.ingredients.length >= 2
        ? c.ingredients.map(i => layerColor(i.canon[0] || i.name)) : null,
      cream: /взбит/.test(raw) || /сливк/.test(g),
      rim: /ободк/.test(raw) || /ободок/.test(g)
        ? (/чили|тахин/.test(raw + g) ? "#e0866a" : /сахар/.test(raw + " " + g) && !/соль|солян/.test(raw + " " + g) ? "#f3e2b8" : "#f6f1e6")
        : null,
      tiki: /тики/i.test(family) || /тики|харрикейн/.test(String(c.glass).toLowerCase()),
      hot: /горяч/i.test(family) || /нагрев/.test(method),
      wheel: wheelAt < 1e9 && wheelAt <= twistAt ? citrusColor(g.slice(wheelAt)) : null,
      twist: twistAt < 1e9 && twistAt < wheelAt ? citrusColor(g.slice(twistAt)) : null,
      cherry: /вишн/.test(g), olive: /оливк/.test(g),
      mint: /мят|базилик/.test(g), pineapple: /ананас/.test(g),
      cucumber: /огур/.test(g), berry: /клубник|малин|ягод/.test(g),
      dust: /мускат|кориц|шоколад|какао/.test(g) && !/палочк/.test(g),
      stick: /палочк[а-я]* кориц/.test(g),
      beans: /кофейн[а-я]* зерн/.test(g),
    };
  }

  // маленький «рандом» по id коктейля — чтобы осколки льда и пузырьки не были одинаковыми
  function rng(seed) {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
  }

  let svgSeq = 0;
  /** SVG-иллюстрация коктейля. opts.mini — упрощённая версия для значков 28px. */
  function glassSVG(c, opts = {}) {
    const s = SHAPES[glassShape(c.glass)];
    const f = features(c);
    const col = liquidColor(c);
    const id = "gl" + (++svgSeq);
    const rand = rng(c.id || "x");
    const [xl, xr, ry] = s.rim;
    const w = xr - xl, cx = (xl + xr) / 2;
    const lv = s.level;
    const bottom = 124;
    const parts = { inside: "", above: "" };

    // жидкость: слои или градиент
    let liquid;
    if (f.layers) {
      const h = (bottom - lv) / f.layers.length;
      liquid = f.layers.map((lc, i) =>
        `<rect x="0" y="${(bottom - h * (i + 1)).toFixed(1)}" width="100" height="${(h + .5).toFixed(1)}" fill="${lc}" opacity=".92"/>`).join("")
        + f.layers.slice(1).map((_, i) =>
          `<rect x="0" y="${(bottom - h * (i + 1)).toFixed(1)}" width="100" height=".8" fill="rgba(255,255,255,.25)"/>`).join("");
    } else {
      liquid = `<rect x="0" y="${lv}" width="100" height="140" fill="url(#${id}g)"/>`;
    }

    // лёд
    if (f.ice === "cubes" || f.ice === "big") {
      const big = f.ice === "big";
      const size = Math.min(big ? 30 : 17, w * (big ? .5 : .3));
      const n = big ? 1 : (w > 45 ? 3 : 2);
      for (let i = 0; i < n; i++) {
        const x = big ? cx - size / 2 : cx - (n * size * .8) / 2 + i * size * .8 + (rand() - .5) * 3;
        const y = lv + 2 + (i % 2) * size * .55 + rand() * 3;
        const rot = ((rand() - .5) * 24).toFixed(1);
        parts.inside += `<g transform="rotate(${rot} ${(x + size / 2).toFixed(1)} ${(y + size / 2).toFixed(1)})">
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${big ? 4 : 3}"
            fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.4)" stroke-width="1"/>
          <path d="M${(x + 3).toFixed(1)} ${(y + 4).toFixed(1)} l${(size * .35).toFixed(1)} 0" stroke="rgba(255,255,255,.45)" stroke-width="1.2" stroke-linecap="round"/></g>`;
      }
    } else if (f.ice === "crushed") {
      const n = opts.mini ? 6 : 22;
      for (let i = 0; i < n; i++) {
        const x = xl + 3 + rand() * (w - 6), y = lv - 4 + rand() * 30, r = 1.6 + rand() * 2.4;
        parts.inside += `<path d="M${(x - r).toFixed(1)} ${y.toFixed(1)} l${r.toFixed(1)} ${(-r).toFixed(1)} l${r.toFixed(1)} ${(r * .8).toFixed(1)} l${(-r * .6).toFixed(1)} ${(r * .9).toFixed(1)} Z"
          fill="rgba(255,255,255,${(.22 + rand() * .25).toFixed(2)})"/>`;
      }
    }

    // текстура
    if (f.bubbles && !opts.mini) {
      for (let i = 0; i < 7; i++) {
        const x = cx - w * .3 + rand() * w * .6, y = lv + 6 + rand() * (bottom - lv - 12);
        parts.inside += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1 + rand() * 1.1).toFixed(1)}" fill="none" stroke="rgba(255,255,255,.6)" stroke-width=".8"/>`;
      }
    }
    if (f.foam || s.foam) {
      parts.inside += `<rect x="0" y="${lv - 1}" width="100" height="${s.foam ? 10 : 7}" fill="#f3ead6" opacity=".9"/>`;
      if (!opts.mini) for (let i = 0; i < 5; i++)
        parts.inside += `<circle cx="${(xl + 4 + rand() * (w - 8)).toFixed(1)}" cy="${(lv + 1 + rand() * 4).toFixed(1)}" r=".9" fill="rgba(160,130,100,.35)"/>`;
    }
    if (f.cream) parts.inside += `<rect x="0" y="${lv - 1}" width="100" height="11" fill="#f6eedf"/>
      <path d="M0 ${lv + 10} Q25 ${lv + 13} 50 ${lv + 10} T100 ${lv + 10}" stroke="rgba(200,170,130,.5)" stroke-width="1" fill="none"/>`;
    if (!opts.mini && f.dust) for (let i = 0; i < 7; i++)
      parts.inside += `<circle cx="${(cx - w * .25 + rand() * w * .5).toFixed(1)}" cy="${(lv + rand() * 3).toFixed(1)}" r="${(.7 + rand() * .6).toFixed(1)}" fill="#7a4a28"/>`;
    if (!opts.mini && f.beans) for (let i = 0; i < 3; i++)
      parts.inside += `<ellipse cx="${(cx - 6 + i * 6).toFixed(1)}" cy="${lv + 2}" rx="2.4" ry="1.6" fill="#3a2214" transform="rotate(${i * 25 - 20} ${cx - 6 + i * 6} ${lv + 2})"/>`;

    // блик на стекле
    const highlight = `<path d="${s.hl}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="${opts.mini ? 3 : 2.4}" stroke-linecap="round"/>`;

    if (!opts.mini) {
      // ободок соль/сахар
      if (f.rim) parts.above += `<path d="M${xl + 1.5} ${ry + 2.2} L${xr - 1.5} ${ry + 2.2}" stroke="${f.rim}" stroke-width="4.6" stroke-dasharray="1.6 1.1" opacity=".95"/>
        <path d="M${xl + 3} ${ry + 5.6} L${xr - 3} ${ry + 5.6}" stroke="${f.rim}" stroke-width="1.6" stroke-dasharray=".8 3.2" stroke-linecap="round" opacity=".8"/>`;
      // пар
      if (f.hot) parts.above += [0, 1, 2].map(i => {
        const x = cx - 10 + i * 10;
        return `<path d="M${x} ${ry - 4} q-4 -6 0 -12 q4 -6 0 -12" fill="none" stroke="#efe3d1" stroke-opacity="${.32 - i * .06}" stroke-width="1.8" stroke-linecap="round"/>`;
      }).join("");
      // тики: трубочка и зонтик
      if (f.tiki) {
        parts.above += `<path d="M${xr - 9} ${lv + 14} L${xr + 5} ${ry - 26}" stroke="#d9694a" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M${xr - 9} ${lv + 14} L${xr + 5} ${ry - 26}" stroke="#fff" stroke-opacity=".35" stroke-width="1" stroke-dasharray="3 4"/>`;
        const ux = xl + 6, uy = ry - 16;
        parts.above += `<path d="M${ux + 9} ${ry + 10} L${ux} ${uy}" stroke="#c9b27c" stroke-width="1.4"/>
          <g transform="rotate(-18 ${ux} ${uy})">
            <path d="M${ux - 13} ${uy} Q${ux} ${uy - 14} ${ux + 13} ${uy} Z" fill="#7fb3a6"/>
            <path d="M${ux - 13} ${uy} Q${ux - 4} ${uy - 13} ${ux} ${uy - 10} L${ux} ${uy} Z" fill="#e0a458"/>
            <path d="M${ux} ${uy - 10} Q${ux + 6} ${uy - 11} ${ux + 13} ${uy} L${ux + 5} ${uy} Z" fill="#d9694a" opacity=".85"/></g>`;
      }
      // украшения
      const rr = Math.max(6, Math.min(9.5, w * .16));
      if (f.wheel) {
        const wx = xr - rr * .35, wy = ry - rr * .35;
        parts.above += `<g><circle cx="${wx}" cy="${wy}" r="${rr}" fill="${f.wheel}"/>
          <circle cx="${wx}" cy="${wy}" r="${rr - 1.8}" fill="#fbf3d2" opacity=".55"/>
          ${[0, 60, 120].map(a => `<path d="M${wx - (rr - 2) * Math.cos(a * Math.PI / 180)} ${wy - (rr - 2) * Math.sin(a * Math.PI / 180)} L${wx + (rr - 2) * Math.cos(a * Math.PI / 180)} ${wy + (rr - 2) * Math.sin(a * Math.PI / 180)}" stroke="${f.wheel}" stroke-width="1"/>`).join("")}
          <circle cx="${wx}" cy="${wy}" r="${rr}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".8"/></g>`;
      }
      if (f.twist) {
        const tx = xl + 4, ty = ry - 1;
        parts.above += `<path d="M${tx} ${ty} c2 -8 10 -9 11 -3 c1 6 -8 7 -6 1 c1.6 -5 9 -6 12 -1" fill="none" stroke="${f.twist}" stroke-width="2.6" stroke-linecap="round"/>`;
      }
      if (f.pineapple) {
        const px = f.wheel ? xl + 2 : xr - 4, py = ry;
        parts.above += `<path d="M${px - 8} ${py + 2} L${px + 8} ${py + 2} L${px} ${py - 10} Z" fill="#f1c94a" stroke="#c99a2a" stroke-width=".8"/>
          <path d="M${px - 3} ${py - 9} l-3 -8 M${px} ${py - 10} l0 -9 M${px + 3} ${py - 9} l3 -8" stroke="#6fae4f" stroke-width="2" stroke-linecap="round"/>`;
      }
      if (f.cucumber) {
        const kx = f.wheel ? xl + 4 : xr - 3, ky = ry - 3;
        parts.above += `<circle cx="${kx}" cy="${ky}" r="${rr * .85}" fill="#cfe5a2" stroke="#5e8f3a" stroke-width="1.6"/>
          <circle cx="${kx}" cy="${ky}" r="1.3" fill="#9bbf6a"/>`;
      }
      if (f.cherry || f.olive) {
        const x1 = xl + w * .25, y1 = ry - 16, x2 = cx + w * .1, y2 = Math.min(lv + 8, bottom - 8);
        const fx = (x1 + x2) / 2 + 2, fy = (y1 + y2) / 2 + 4;
        parts.above += `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#c9b27c" stroke-width="1.4" stroke-linecap="round"/>`;
        parts.inside += f.cherry
          ? `<circle cx="${fx}" cy="${fy}" r="4.6" fill="#a8172f"/><circle cx="${fx - 1.4}" cy="${fy - 1.5}" r="1.2" fill="#fff" opacity=".5"/>`
          : `<ellipse cx="${fx}" cy="${fy}" rx="5" ry="3.8" fill="#8a9a3a"/><circle cx="${fx + 2}" cy="${fy}" r="1.3" fill="#c0392b"/>`;
      }
      if (f.berry) {
        const bx = f.wheel ? xl + 6 : xr - 4, by = ry - 4;
        parts.above += `<path d="M${bx - 5} ${by - 3} Q${bx} ${by + 9} ${bx + 5} ${by - 3} Q${bx} ${by - 6} ${bx - 5} ${by - 3} Z" fill="#c8324a"/>
          <path d="M${bx - 3} ${by - 4} l3 -3 l3 3" stroke="#6fae4f" stroke-width="1.4" fill="none"/>`;
      }
      if (f.mint) {
        const mx = cx + w * .18, my = ry - 2;
        const leaves = [[-6, -8, -35], [5, -11, 30], [-2, -16, -10], [6, -3, 50]];
        parts.above += `<path d="M${mx} ${my + 6} Q${mx + 1} ${my - 6} ${mx - 1} ${my - 16}" stroke="#4f8a37" stroke-width="1.4" fill="none"/>`
          + leaves.map(([dx, dy, a]) =>
            `<ellipse cx="${mx + dx}" cy="${my + dy}" rx="4.6" ry="2.4" fill="#6fae4f" transform="rotate(${a} ${mx + dx} ${my + dy})"/>`).join("");
      }
      if (f.stick) parts.above += `<rect x="${cx + w * .1}" y="${ry - 20}" width="3.6" height="${lv - ry + 30}" rx="1.5" fill="#8a5a33" transform="rotate(14 ${cx + w * .1} ${ry})"/>`;
    }

    return `<svg viewBox="${opts.mini ? "4 12 92 116" : "-8 -18 116 158"}" aria-hidden="true">
      <defs>
        <clipPath id="${id}"><path d="${s.body}"/></clipPath>
        <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="${col}" stop-opacity=".95"/>
          <stop offset="1" stop-color="${col}" stop-opacity=".62"/></linearGradient>
      </defs>
      <g clip-path="url(#${id})">
        ${liquid}${parts.inside}
        ${f.layers ? "" : `<rect x="0" y="${lv}" width="100" height="1.6" fill="rgba(255,255,255,.35)"/>`}
        ${highlight}
      </g>
      <path d="${s.body}" fill="rgba(255,255,255,.04)" ${LINE} stroke-width="2" stroke-linejoin="round"/>
      ${s.extra ? `<path d="${s.extra}" fill="none" ${LINE} stroke-width="2.2" stroke-linecap="round"/>` : ""}
      ${parts.above}
    </svg>`;
  }
  function thumbHTML(c, opts = {}) {
    const inner = c.image
      ? `<img src="${esc(c.image)}" alt="${esc(title(c))}" loading="lazy">`
      : glassSVG(c);
    const badge = opts.badge ? strengthBadge(c.strength) : "";
    return `<div class="thumb">${inner}${badge}</div>`;
  }
  function strengthBadge(str) {
    const cls = STRENGTH_CLS[str] || "";
    if (str === "безалкогольный") return `<span class="strength-badge ${cls}">${t("badge.zero")}</span>`;
    const n = STRENGTH_ORDER.indexOf(str);
    const dots = [1, 2, 3].map(k => `<i class="${k <= n ? "f" : ""}"></i>`).join("");
    return `<span class="strength-badge ${cls}"><span class="dots">${dots}</span>${esc(term(str))}</span>`;
  }

  function fmtAmount(i) {
    if (!i.amount) return term(i.unit);
    return `${i.amount} ${term(i.unit)}`;
  }

  /* ---------- модальное окно ---------- */
  let back;
  function ensureModal() {
    if (back) return back;
    back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true"></div>`;
    document.body.appendChild(back);
    back.addEventListener("click", e => { if (e.target === back) closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && back.classList.contains("open")) closeModal(); });
    back.addEventListener("click", e => {
      const t = e.target.closest("[data-tag]");
      if (t) {
        e.preventDefault();
        closeModal();
        if (window.BAR.onTagClick) window.BAR.onTagClick(t.dataset.tag);
        else location.href = "index.html#tags=" + encodeURIComponent(t.dataset.tag);
      }
      if (e.target.closest(".modal-close")) closeModal();
    });
    return back;
  }
  function tagChip(group, value, extraCls = "") {
    return `<button class="tag sm ${tagClass(group, value)} ${extraCls}" data-tag="${esc(group + ":" + value)}">${esc(tagText(group, value))}</button>`;
  }
  function openCocktail(id) {
    const c = byId[id];
    if (!c) return;
    const b = ensureModal();
    const facts = [
      ["glass", term(c.glass)], ["method", term(c.method)], ["ice", term(c.ice)], ["garnish", field(c, "garnish")],
      ["family", term(c.family)], ["era", term(c.era)], ["year", c.year], ["origin", field(c, "origin")],
      ["creator", field(c, "creator")], ["iba", c.iba && c.iba !== "—" ? term(c.iba).replace(/^IBA:\s*/, "") : ""],
    ].filter(([, v]) => v).map(([k, v]) => [t("fact." + k), v]);
    const recipe = c.ingredients.map(i => `<li>
        <button type="button" class="ing-link" data-ing-info="${esc(i.canon[0])}"
          title="${esc(t("info.aria", { name: ingName(i.canon[0]) }))}">${esc(rawName(i).replace(/\s*\((опц\.|optional)\)/i, ""))}</button>
        ${i.optional ? `<span class="opt">${t("modal.optional")}</span>` : ""}
        <span class="amt">${esc(fmtAmount(i))}</span></li>`).join("");
    const tags = [
      ...c.flavor.map(t => tagChip("flavor", t)),
      tagChip("strength", c.strength),
      ...c.occasion.map(t => tagChip("occasion", t)),
      ...(c.strength === "безалкогольный" ? [] : [tagChip("base", c.base_spirit)]),
      ...c.extra.filter(t => !(c.strength === "безалкогольный" && t === "безалкогольный")).map(t => tagChip("extra", t)),
    ].join("");
    b.querySelector(".modal").innerHTML = `
      <button class="modal-close" aria-label="${t("modal.close")}">×</button>
      <div class="modal-head">
        <h2>${esc(title(c))}</h2>
        ${subtitle(c) ? `<div class="en">${esc(subtitle(c))}</div>` : ""}
        <div class="modal-tags">${tags}</div>
      </div>
      <div class="modal-row">
        ${thumbHTML(c, { badge: true })}
        <div class="modal-recipe">
          <h3>${t("modal.recipe")}</h3>
          <ul class="recipe">${recipe}</ul>
          <h3>${t("modal.method")}</h3>
          <p class="prose">${esc(field(c, "instructions"))}</p>
        </div>
      </div>
      <h3>${t("modal.facts")}</h3>
      <dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${c.description ? `<h3>${t("modal.history")}</h3><p class="prose">${esc(field(c, "description"))}</p>` : ""}
      ${(c.variations || []).length ? `<h3>${t("modal.variations")}</h3><div class="variations">${c.variations.map(v => `
        <div class="variation">
          <div class="v-head"><b>${esc(title(v))}</b>${subtitle(v) ? `<span class="en">${esc(subtitle(v))}</span>` : ""}
            ${v.strength ? `<span class="tag sm static ${tagClass("strength", v.strength)}">${esc(tagText("strength", v.strength))}</span>` : ""}</div>
          <p class="prose">${esc(field(v, "difference"))}</p>
          <div class="v-recipe">${esc(field(v, "ingredients"))}</div>
        </div>`).join("")}</div>` : ""}`;
    b.classList.add("open");
    document.body.style.overflow = "hidden";
    b.scrollTop = 0;
    b.querySelector(".modal-close").focus({ preventScroll: true });
    if (window.BAR.onModal) window.BAR.onModal(id);
  }
  function closeModal() {
    if (!back) return;
    back.classList.remove("open");
    document.body.style.overflow = "";
    if (window.BAR.onModal) window.BAR.onModal(null);
  }

  /* ---------- хэш-параметры URL ---------- */
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    return Object.fromEntries(p.entries());
  }
  function writeHash(obj) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) if (v) p.set(k, v);
    const s = p.toString();
    history.replaceState(null, "", s ? "#" + s : location.pathname + location.search);
  }

  const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е");

  /* ---------- телефон: иконки нижнего меню ---------- */
  const NAV_ICONS = {
    "index.html": `<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>`,
    "mybar.html": `<path d="M10 2.5h4M10.5 2.5v4.2L8.5 10v10.2c0 .7.6 1.3 1.3 1.3h4.4c.7 0 1.3-.6 1.3-1.3V10l-2-3.3V2.5"/><path d="M8.5 13.5h7v4.5h-7z"/>`,
    "builder.html": `<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="5.5" r="2"/><circle cx="19.5" cy="5.5" r="2"/><circle cx="5.5" cy="19" r="2"/><circle cx="18.5" cy="18.5" r="2"/><path d="m6 7 3.8 3M18 7l-3.8 3M7 17.6l2.8-3.3M17 17l-2.9-2.9"/>`,
    "substitutes.html": `<path d="M4 8h15m-3.5-3.5L19 8l-3.5 3.5M20 16H5m3.5-3.5L5 16l3.5 3.5"/>`,
  };
  document.querySelectorAll(".nav a").forEach(a => {
    const icon = NAV_ICONS[a.getAttribute("href")];
    if (!icon || a.querySelector("svg")) return;
    const label = a.textContent;
    a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg><span>${esc(label)}</span>`;
  });

  /* ---------- телефон: шторка снизу ----------
     sheet(panel, {anchor, title}) — на узком экране panel уезжает в выезжающую снизу шторку,
     перед anchor появляется кнопка-открывашка. На компьютере ничего не меняется
     (обёртка display: contents, кнопка и шапка скрыты стилями). */
  const MOBILE = window.matchMedia("(max-width: 760px), (max-height: 500px)");
  let sheetBack;
  function sheet(panel, opts = {}) {
    const wrap = document.createElement("div");
    wrap.className = "sheet-wrap " + (opts.cls || "");
    wrap.setAttribute("role", "dialog");
    const head = document.createElement("div");
    head.className = "sheet-head";
    head.innerHTML = `<span class="sheet-grip"></span><b>${esc(opts.title || "")}</b>
      <button class="sheet-done" type="button">${esc(t("sheet.done"))}</button>`;
    panel.parentNode.insertBefore(wrap, panel);
    wrap.append(head, panel);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sheet-open";
    const anchor = opts.anchor || wrap;
    anchor.parentNode.insertBefore(btn, anchor);

    if (!sheetBack) {
      sheetBack = document.createElement("div");
      sheetBack.className = "sheet-back";
      document.body.appendChild(sheetBack);
    }
    let isOpen = false;
    const api = {
      open() {
        if (!MOBILE.matches) return;
        isOpen = true;
        wrap.classList.add("open"); sheetBack.classList.add("open");
        document.body.classList.add("sheet-lock");
        sheetBack.onclick = api.close;
      },
      close() {
        if (!isOpen) return;
        isOpen = false;
        wrap.classList.remove("open"); sheetBack.classList.remove("open");
        document.body.classList.remove("sheet-lock");
      },
      /** закрыть, если открыта на телефоне (после выбора в списке с одним вариантом) */
      closeOnMobile() { if (MOBILE.matches) api.close(); },
      setLabel(html) { btn.innerHTML = html; },
      setDone(text) { head.querySelector(".sheet-done").textContent = text; },
      get mobile() { return MOBILE.matches; },
    };
    btn.addEventListener("click", api.open);
    head.querySelector(".sheet-done").addEventListener("click", api.close);
    document.addEventListener("keydown", e => { if (e.key === "Escape") api.close(); });
    MOBILE.addEventListener?.("change", () => { if (!MOBILE.matches) api.close(); });
    return api;
  }

  /* ---------- карточка ингредиента (всплывающая плашка / шторка на телефоне) ----------
     Любой элемент с data-ing-info="Канон. имя" открывает её по клику — перехват в фазе capture,
     поэтому работает и внутри кнопок-карточек, и поверх модалки коктейля. */
  const usageCount = new Map();
  for (const c of DATA.cocktails) for (const n of new Set(c.ingredients.flatMap(i => i.canon)))
    usageCount.set(n, (usageCount.get(n) || 0) + 1);
  function abvClass(abv) {
    const v = parseFloat(String(abv || "").replace(",", "."));
    if (!v) return "st-zero";
    return v < 15 ? "st-light" : v < 30 ? "st-medium" : "st-strong";
  }
  function ingInfoHTML(n, opts = {}) {
    const ing = DATA.ingredients[n] || {};
    const info = ing.info;
    const cat = ing.category || "";
    const k = usageCount.get(n) || 0;
    const rows = info ? `
      <dl class="ii-rows">
        <div><dt>${t("info.made")}</dt><dd>${esc(field(info, "made_from"))}</dd></div>
        <div><dt>${t("info.taste")}</dt><dd>${esc(field(info, "taste"))}</dd></div>
      </dl>` : "";
    const links = opts.links === false ? "" : `<div class="ii-links">
        <a href="builder.html#ing=${encodeURIComponent(n)}">${t("info.pairs")}</a>
        ${(DATA.substitutions || {})[n] ? `<a href="substitutes.html#ing=${encodeURIComponent(n)}">${t("info.swap")}</a>` : ""}
      </div>`;
    return `
      <div class="ii-head">
        <span class="cat-dot" style="background:${catColor(cat)}"></span>
        <b>${esc(ingName(n))}</b>
        ${info ? `<span class="ii-abv ${abvClass(info.abv)}">${esc(info.abv)}</span>` : ""}
      </div>
      <div class="ii-meta">${esc(term(cat))}${k ? ` · ${esc(t("subs.in", { n: k }))}` : ""}</div>
      ${rows}${links}`;
  }
  /** короткая строка для встраивания: «40% · Из чего… · Вкус…» */
  function infoBtn(n) {
    return `<span class="info-btn" data-ing-info="${esc(n)}" role="button" tabindex="0"
      aria-label="${esc(t("info.aria", { name: ingName(n) }))}" title="${esc(t("info.aria", { name: ingName(n) }))}">i</span>`;
  }
  let pop, popBack, popFor = null, popAnchor = null;
  function closeIngInfo() {
    if (!pop || !popFor) return;
    pop.classList.remove("open"); popBack.classList.remove("open");
    popFor = null;
    if (popAnchor && popAnchor.focus) popAnchor.focus({ preventScroll: true });
    popAnchor = null;
  }
  function openIngInfo(n, anchor) {
    if (!DATA.ingredients[n]) return;
    if (!pop) {
      pop = document.createElement("div");
      pop.className = "ing-pop"; pop.setAttribute("role", "dialog");
      popBack = document.createElement("div");
      popBack.className = "ing-pop-back";
      document.body.append(popBack, pop);
    }
    popFor = n; popAnchor = anchor;
    pop.innerHTML = `<button class="ii-close" type="button" aria-label="${t("modal.close")}">×</button>${ingInfoHTML(n)}`;
    pop.setAttribute("aria-label", ingName(n));
    const mobile = MOBILE.matches;
    pop.classList.toggle("as-sheet", mobile);
    popBack.classList.toggle("open", mobile);
    pop.style.left = pop.style.top = "";
    pop.classList.add("open");
    if (!mobile && anchor) {
      const r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, m = 10;
      const left = Math.min(Math.max(m, r.left), innerWidth - w - m);
      const below = r.bottom + 8 + h < innerHeight - m;
      pop.style.left = left + "px";
      pop.style.top = (below ? r.bottom + 8 : Math.max(m, r.top - 8 - h)) + "px";
    }
    pop.querySelector(".ii-close").focus({ preventScroll: true });
  }
  document.addEventListener("click", e => {
    const trg = e.target.closest && e.target.closest("[data-ing-info]");
    if (trg) {
      e.preventDefault(); e.stopPropagation();
      const n = trg.dataset.ingInfo;
      return popFor === n ? closeIngInfo() : openIngInfo(n, trg);
    }
    if (!popFor) return;
    if (pop.contains(e.target)) {
      if (e.target.closest(".ii-close")) { e.preventDefault(); e.stopPropagation(); closeIngInfo(); }
      return;   // ссылки внутри работают как обычно
    }
    e.preventDefault(); e.stopPropagation();   // клик мимо — только закрыть плашку
    closeIngInfo();
  }, true);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && popFor) { e.stopImmediatePropagation(); closeIngInfo(); return; }
    const trg = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-ing-info]");
    if (trg && trg.tagName !== "BUTTON") { e.preventDefault(); e.stopPropagation(); openIngInfo(trg.dataset.ingInfo, trg); }
  }, true);
  window.addEventListener("scroll", () => { if (popFor && !MOBILE.matches) closeIngInfo(); }, true);
  window.addEventListener("resize", () => closeIngInfo());

  window.BAR = {
    DATA, byId, esc, norm, GROUPS, STRENGTH_ORDER, tagClass, tagText,
    t, L, term, ingName, rawName, field, title, subtitle, cmp, plural: I.plural,
    catColor, ingCategory, thumbHTML, glassSVG, strengthBadge,
    openCocktail, closeModal, tagChip, readHash, writeHash, sheet,
    ingInfoHTML, infoBtn, openIngInfo, closeIngInfo, abvClass,
    onTagClick: null, onModal: null,
  };
})();
