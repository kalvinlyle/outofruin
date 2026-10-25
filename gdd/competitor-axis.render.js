// Generic renderer for the competitive positioning plot. Reused VERBATIM across
// projects EXCEPT the four axis-caption strings marked "EDIT" below — everything
// else (games, axes, rubrics, target, categories) comes from competitor-axis.data.js.
const { CATEGORIES, GAMES, TARGET, QUADRANTS, RUBRICS, F2P } = window.CHART_DATA;

const W = 1400, H = 880;
const M = { top: 70, right: 60, bottom: 80, left: 70 };
const innerW = W - M.left - M.right;
const innerH = H - M.top - M.bottom;
const xScale = (v) => M.left + (v / 100) * innerW;
// Y: 0 at bottom, 100 at top.
const yScale = (mod) => H - M.bottom - (mod / 100) * innerH;

const sizeToRadius = (s) => 5 + Math.sqrt(Math.max(0, s) / 100) * 36;

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, children = []) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    e.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c == null) continue;
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  }
  return e;
};

const svg = document.getElementById("chart");

// --- Quadrant labels (background, faint) ---
for (const q of QUADRANTS) {
  svg.appendChild(el("text", {
    class: "quadrant-label" + (q.target ? " target" : ""),
    x: xScale(q.x),
    y: yScale(100 - q.y),
    "text-anchor": "middle",
  }, [q.text]));
}

// --- Grid ---
const grid = el("g", { class: "grid" });
for (let i = 0; i <= 10; i++) {
  const x = xScale(i * 10);
  grid.appendChild(el("line", { x1: x, x2: x, y1: M.top, y2: H - M.bottom }));
  const y = yScale(i * 10);
  grid.appendChild(el("line", { x1: M.left, x2: W - M.right, y1: y, y2: y }));
}
svg.appendChild(grid);

// Midline crosshair
svg.appendChild(el("line", { class: "midline", x1: xScale(50), x2: xScale(50), y1: M.top, y2: H - M.bottom }));
svg.appendChild(el("line", { class: "midline", x1: M.left, x2: W - M.right, y1: yScale(50), y2: yScale(50) }));

// Frame
svg.appendChild(el("rect", { class: "axis-frame", x: M.left, y: M.top, width: innerW, height: innerH }));

// Axis caps — EDIT these four strings for your axes.
svg.appendChild(el("text", { class: "axis-cap", x: M.left,      y: H - M.bottom + 28, "text-anchor": "start" }, ["\u2190 X-axis LOW label"]));
svg.appendChild(el("text", { class: "axis-cap", x: W - M.right, y: H - M.bottom + 28, "text-anchor": "end" },   ["X-axis HIGH label \u2192"]));
svg.appendChild(el("text", { class: "axis-cap", x: 22, y: M.top + 14,       "text-anchor": "start" }, ["\u2191 Y-axis HIGH label"]));
svg.appendChild(el("text", { class: "axis-cap", x: 22, y: H - M.bottom - 4, "text-anchor": "start" }, ["\u2193 Y-axis LOW label"]));

// --- Place games at true (x, mod) and run a soft relaxation pass to push overlapping bubbles apart ---
const placement = GAMES.map((g) => ({
  ...g,
  r: sizeToRadius(g.size),
  targetX: xScale(g.x),
  targetY: yScale(g.mod),
  cx: xScale(g.x),
  cy: yScale(g.mod),
}));

const padding = 2;
const iterations = 80;
for (let iter = 0; iter < iterations; iter++) {
  for (let i = 0; i < placement.length; i++) {
    for (let j = i + 1; j < placement.length; j++) {
      const a = placement[i], b = placement[j];
      const dx = b.cx - a.cx;
      const dy = b.cy - a.cy;
      const distSq = dx * dx + dy * dy;
      const minDist = a.r + b.r + padding;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.01;
        const overlap = (minDist - dist) / 2;
        const ux = dx / dist, uy = dy / dist;
        a.cx -= ux * overlap;
        a.cy -= uy * overlap;
        b.cx += ux * overlap;
        b.cy += uy * overlap;
      }
    }
  }
  const pull = 0.06;
  for (const g of placement) {
    g.cx += (g.targetX - g.cx) * pull;
    g.cy += (g.targetY - g.cy) * pull;
    const minX = M.left + g.r, maxX = W - M.right - g.r;
    const minY = M.top + g.r, maxY = H - M.bottom - g.r;
    if (g.cx < minX) g.cx = minX;
    if (g.cx > maxX) g.cx = maxX;
    if (g.cy < minY) g.cy = minY;
    if (g.cy > maxY) g.cy = maxY;
  }
}

// --- Render ---
const gameLayer = el("g", { class: "games" });
svg.appendChild(gameLayer);

const hover = document.getElementById("hover");
const showHover = (g, evt) => {
  const cat = CATEGORIES.find((c) => c.id === g.cat);
  const deadTag = g.dead ? `<span class="dead-tag">discontinued</span>` : "";
  hover.innerHTML = `
    <div class="name">${g.name} ${deadTag}</div>
    <div class="meta">${g.year} \u00b7 ${cat ? cat.label : g.cat} \u00b7 reach ${g.size}</div>
    <div class="row"><span class="k">${RUBRICS.xLabel || "X"}</span><span class="v">${g.x}</span></div>
    <div class="row"><span class="k">${RUBRICS.modLabel || "Y"}</span><span class="v">${g.mod}</span></div>
    <div class="row"><span class="k liked">Players liked</span><span class="v">${g.liked}</span></div>
    <div class="row"><span class="k pain">Main complaint</span><span class="v">${g.pain}</span></div>
  `;
  hover.style.display = "block";
  const pad = 14;
  const rect = hover.getBoundingClientRect();
  let left = evt.clientX + pad;
  let top = evt.clientY + pad;
  if (left + rect.width > window.innerWidth - 8) left = evt.clientX - rect.width - pad;
  if (top + rect.height > window.innerHeight - 8) top = evt.clientY - rect.height - pad;
  hover.style.left = `${left}px`;
  hover.style.top = `${top}px`;
};
const hideHover = () => { hover.style.display = "none"; };

const renderOrder = [...placement].sort((a, b) => b.size - a.size);
const gameNodes = new Map();

for (const g of renderOrder) {
  const cat = CATEGORIES.find((c) => c.id === g.cat);
  const fill = cat ? cat.color : "var(--accent)";
  const classes = "game" + (g.dead ? " dead" : "");
  const node = el("g", { class: classes, "data-cat": g.cat });

  node.appendChild(el("circle", { class: "bubble", cx: g.cx, cy: g.cy, r: g.r, fill }));

  if (g.r >= 26) {
    node.appendChild(el("text", { class: "label", x: g.cx, y: g.cy + 4, "text-anchor": "middle", "font-size": 12 }, [g.name]));
  } else if (g.r >= 14) {
    node.appendChild(el("text", { class: "label small", x: g.cx + g.r + 4, y: g.cy + 3, "text-anchor": "start" }, [g.name]));
  } else {
    node.appendChild(el("text", { class: "label small", x: g.cx + g.r + 3, y: g.cy + 3, "text-anchor": "start", "font-size": 9 }, [g.name]));
  }

  node.addEventListener("pointerenter", (evt) => { node.classList.add("hovered"); showHover(g, evt); });
  node.addEventListener("pointermove",  (evt) => showHover(g, evt));
  node.addEventListener("pointerleave", () => { node.classList.remove("hovered"); hideHover(); });
  gameLayer.appendChild(node);
  gameNodes.set(g.name, node);
}

// --- Target marker ---
const tg = el("g", { class: "target-marker" });
const tx = xScale(TARGET.x);
const ty = yScale(TARGET.mod);
tg.appendChild(el("circle", { class: "ring",       cx: tx, cy: ty, r: 32 }));
tg.appendChild(el("circle", { class: "ring-inner", cx: tx, cy: ty, r: 20 }));
tg.appendChild(el("circle", { class: "core",       cx: tx, cy: ty, r: 7 }));
// Flip the label to the side that keeps it inside the frame.
const labelLeft = TARGET.x > 60;
tg.appendChild(el("text", { x: labelLeft ? tx - 40 : tx + 40, y: ty + 4, "text-anchor": labelLeft ? "end" : "start" }, [labelLeft ? `${TARGET.label} \u2605` : `\u2605 ${TARGET.label}`]));
svg.appendChild(tg);

// --- Filters (also serve as legend) ---
const active = new Set(CATEGORIES.map((c) => c.id));
const filtersDiv = document.getElementById("filters");
const counts = new Map();
for (const g of GAMES) counts.set(g.cat, (counts.get(g.cat) ?? 0) + 1);

for (const cat of CATEGORIES) {
  const row = document.createElement("label");
  row.className = "filter-row";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = true;
  cb.addEventListener("change", () => { cb.checked ? active.add(cat.id) : active.delete(cat.id); applyFilters(); });
  const sw = document.createElement("span");
  sw.className = "swatch";
  sw.style.background = cat.color;
  const lbl = document.createElement("span");
  lbl.textContent = cat.label;
  const ct = document.createElement("span");
  ct.className = "count";
  ct.textContent = String(counts.get(cat.id) ?? 0);
  row.append(cb, sw, lbl, ct);
  filtersDiv.appendChild(row);
}

let f2pOnly = false;
function applyFilters() {
  for (const g of placement) {
    const on = active.has(g.cat) && (!f2pOnly || F2P.has(g.name));
    const node = gameNodes.get(g.name);
    if (node) node.classList.toggle("dim", !on);
  }
}

const f2pCheckbox = document.getElementById("f2pOnly");
const f2pTally = document.getElementById("f2pTally");
const f2pCount = GAMES.filter((g) => F2P.has(g.name)).length;
if (f2pTally) f2pTally.textContent = `${f2pCount} of ${GAMES.length} games are F2P.`;
if (f2pCheckbox) f2pCheckbox.addEventListener("change", () => { f2pOnly = f2pCheckbox.checked; applyFilters(); });

// --- Size key ---
const sizeKey = document.getElementById("sizeKey");
for (const s of [10, 50, 100]) {
  const r = sizeToRadius(s);
  const wrap = document.createElement("div");
  wrap.className = "row";
  const dot = document.createElement("div");
  dot.className = "b";
  dot.style.width = `${r * 2}px`;
  dot.style.height = `${r * 2}px`;
  const lab = document.createElement("div");
  lab.className = "lab";
  lab.textContent = String(s);
  wrap.append(dot, lab);
  sizeKey.appendChild(wrap);
}

// --- Rubric ladders ---
function renderRubric(targetId, rubric) {
  const target = document.getElementById(targetId);
  if (!target || !rubric) return;
  for (const rung of rubric) {
    const row = document.createElement("div");
    row.className = "rubric-row";
    const score = document.createElement("div");
    score.className = "rubric-score";
    score.textContent = rung.score;
    const label = document.createElement("div");
    label.className = "rubric-label";
    label.textContent = rung.label;
    const hint = document.createElement("div");
    hint.className = "rubric-hint";
    hint.textContent = rung.hint;
    row.append(score, label, hint);
    target.appendChild(row);
  }
}
renderRubric("rubricX", RUBRICS.x);
renderRubric("rubricMod", RUBRICS.mod);

// --- Live / discontinued tally ---
const deadCount = GAMES.filter((g) => g.dead).length;
const tally = document.getElementById("tally");
if (tally) tally.textContent = `${GAMES.length - deadCount} live \u00b7 ${deadCount} discontinued`;
