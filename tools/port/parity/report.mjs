#!/usr/bin/env node
// Build parity-report/index.html (repo root, gitignored) from a compare run.
//
//   node report.mjs [--a orig --b port]     reads out/compare-<a>-<b>.json
//
// Summary table per scenario x viewport, then each run's failing frames ranked by
// pixel mismatch, with <a> | <b> | diff heatmap images and the first state
// differences.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARITY, ROOT } from './lib/harness.mjs';

const REPORT = path.join(ROOT, 'parity-report');
const MAX_FAILS = 60; // per scenario

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (f) => String(f).padStart(5, '0');
const pct = (x) => (x * 100).toFixed(3) + '%';

function copy(src, rel) {
  if (!fs.existsSync(src)) return null;
  const dst = path.join(REPORT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return rel;
}

export function writeReport(results) {
  fs.rmSync(REPORT, { recursive: true, force: true });
  fs.mkdirSync(REPORT, { recursive: true });
  const { a, b } = results;
  const rows = results.scenarios.map((s) => `
    <tr class="${s.passed === s.total ? 'ok' : 'bad'}">
      <td><a href="#${esc(s.name)}">${esc(s.scenario || s.name)}</a></td><td>${esc(s.viewport || '')}</td>
      <td>${s.passed}/${s.total}</td><td>${s.pixelPass}</td><td>${s.statePass}</td>
      <td>${s.identical}</td><td>${pct(s.minMatch)}</td>
      <td>${s.firstStateDiff ? 'frame ' + s.firstStateDiff.frame : '-'}</td>
    </tr>`).join('');

  const sections = results.scenarios.map((s) => {
    const fails = s.frames.filter((f) => !f.pass)
      .sort((x, y) => (y.mismatched - x.mismatched) || (x.frame - y.frame));
    const cards = fails.slice(0, MAX_FAILS).map((f) => {
      const ia = copy(path.join(s.dirA, pad(f.frame) + '.png'), `img/${s.name}/${a}-${pad(f.frame)}.png`);
      const ib = copy(path.join(s.dirB, pad(f.frame) + '.png'), `img/${s.name}/${b}-${pad(f.frame)}.png`);
      const id = copy(path.join(s.diffDir, pad(f.frame) + '.png'), `img/${s.name}/diff-${pad(f.frame)}.png`);
      const img = (src, label) => `<figure>${src ? `<a href="${src}"><img src="${src}" loading="lazy" alt="${esc(label)}"></a>` : '<div class="none">none</div>'}<figcaption>${esc(label)}</figcaption></figure>`;
      const diffs = (f.stateDiffs || []).map((l) => `<li><code>${esc(l)}</code></li>`).join('');
      return `<article class="frame">
        <h3>frame ${f.frame} <span class="tag">${pct(f.match)} match, ${f.mismatched} px</span>
          ${f.stateEqual ? '<span class="tag ok">state equal</span>' : '<span class="tag bad">state differs</span>'}
          ${f.missing ? `<span class="tag bad">missing in ${f.missing}</span>` : ''}</h3>
        <div class="imgs">${img(ia, a)}${img(ib, b)}${img(id, 'diff')}</div>
        ${diffs ? `<ul class="diffs">${diffs}</ul>` : ''}
      </article>`;
    }).join('');
    return `<section id="${esc(s.name)}">
      <h2>${esc(s.name)} <span class="tag ${s.passed === s.total ? 'ok' : 'bad'}">${s.passed}/${s.total} pass</span></h2>
      ${fails.length ? `<p>${fails.length} failing frame(s), worst first${fails.length > MAX_FAILS ? ` (first ${MAX_FAILS} shown)` : ''}.</p>${cards}` : '<p>Every frame passes.</p>'}
    </section>`;
  }).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Parity Report</title>
<style>
:root { --bg:#fbfbfa; --fg:#1d1d1b; --muted:#6b6b66; --line:#e2e2dd; --ok:#1f7a3a; --bad:#b3261e; --card:#fff; }
@media (prefers-color-scheme: dark) { :root { --bg:#161615; --fg:#ececea; --muted:#a3a39d; --line:#2e2e2b; --ok:#5cc27a; --bad:#ff7a70; --card:#1e1e1c; } }
body { background:var(--bg); color:var(--fg); font:14px/1.45 system-ui, sans-serif; margin:0; padding:24px 16px; }
main { max-width:1200px; margin:0 auto; }
h1 { font-size:22px; margin:0 0 4px; } h2 { font-size:18px; margin:32px 0 8px; } h3 { font-size:14px; margin:0 0 8px; }
p.meta { color:var(--muted); margin:0 0 16px; }
.table-wrap { overflow-x:auto; }
table { border-collapse:collapse; width:100%; } th, td { text-align:left; padding:6px 10px; border-bottom:1px solid var(--line); white-space:nowrap; }
th { color:var(--muted); font-weight:600; } tr.bad td:first-child a { color:var(--bad); } tr.ok td:first-child a { color:var(--ok); }
a { color:inherit; }
.tag { font-size:12px; font-weight:500; color:var(--muted); border:1px solid var(--line); border-radius:10px; padding:1px 8px; margin-left:6px; }
.tag.ok { color:var(--ok); } .tag.bad { color:var(--bad); }
.frame { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:12px; margin:12px 0; }
.imgs { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; }
figure { margin:0; } figure img { width:100%; height:auto; display:block; border:1px solid var(--line); image-rendering:auto; }
figcaption { color:var(--muted); font-size:12px; margin-top:2px; } .none { color:var(--muted); padding:20px; border:1px dashed var(--line); }
.diffs { margin:8px 0 0; padding-left:18px; max-height:200px; overflow:auto; } code { font-size:12px; word-break:break-all; }
</style></head><body><main>
<h1>Parity: ${esc(a)} vs ${esc(b)}</h1>
<p class="meta">A frame passes at &ge; ${results.passMatch * 100}% matching pixels (pixelmatch threshold ${results.threshold}) and an identical state dump. Generated ${esc(results.when)}.</p>
<div class="table-wrap"><table>
<thead><tr><th>scenario</th><th>viewport</th><th>pass</th><th>pixels &ge; 99%</th><th>state equal</th><th>identical</th><th>min match</th><th>first state diff</th></tr></thead>
<tbody>${rows}</tbody></table></div>
${sections}
</main></body></html>
`;
  const file = path.join(REPORT, 'index.html');
  fs.writeFileSync(file, html);
  return file;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const argv = process.argv.slice(2);
  const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  const src = path.join(PARITY, 'out', `compare-${opt('--a', 'orig')}-${opt('--b', 'port')}.json`);
  if (!fs.existsSync(src)) {
    console.error(`no ${path.relative(PARITY, src)}; run compare.mjs first`);
    process.exit(2);
  }
  console.log(writeReport(JSON.parse(fs.readFileSync(src, 'utf8'))));
}
