#!/usr/bin/env node
// Compare two targets' runs frame by frame.
//
//   node compare.mjs --a orig --b port [--scenario <name>] [--viewport WxH[,WxH]] [--no-report]
//
// Reads out/<scenario>@<WxH>/<a>/ and .../<b>/ (written by run.mjs) for every
// run directory that has both, writes diff heatmaps to
// out/<scenario>@<WxH>/diff-<a>-<b>/, the results to
// out/compare-<a>-<b>.json, then builds parity-report/index.html.
// A frame passes when >= 99% of pixels match (pixelmatch threshold 0.1) and
// the state dumps are byte-identical. Exit code 1 if any frame fails.
import fs from 'node:fs';
import path from 'node:path';
import { PARITY } from './lib/harness.mjs';
import { compareRuns, PASS_MATCH, THRESHOLD } from './lib/diff.mjs';
import { writeReport } from './report.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const a = opt('--a', 'orig');
const b = opt('--b', 'port');
const OUT = path.join(PARITY, 'out');

// Run directories are <scenario>@<WxH>; older ones without a viewport are ignored.
const wantScenario = opt('--scenario');
const wantVps = opt('--viewport') ? opt('--viewport').split(',') : null;
const scenarios = fs.readdirSync(OUT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && d.name.includes('@'))
  .filter((d) => {
    const [sc, vp] = d.name.split('@');
    return (!wantScenario || sc === wantScenario) && (!wantVps || wantVps.includes(vp));
  })
  .filter((d) => fs.existsSync(path.join(OUT, d.name, a)) && fs.existsSync(path.join(OUT, d.name, b)))
  .map((d) => d.name).sort();
if (!scenarios.length) {
  console.error(`no run has both out/<scenario>@<WxH>/${a} and .../${b}; run: node run.mjs --target ${b} --all`);
  process.exit(2);
}

const results = { a, b, threshold: THRESHOLD, passMatch: PASS_MATCH, when: new Date().toISOString(), scenarios: [] };
let failed = 0;
for (const name of scenarios) {
  const dirA = path.join(OUT, name, a);
  const dirB = path.join(OUT, name, b);
  const diffDir = path.join(OUT, name, `diff-${a}-${b}`);
  fs.rmSync(diffDir, { recursive: true, force: true });
  const r = compareRuns(dirA, dirB, { diffDir });
  const frames = r.frames.map((f) => ({ ...f, pass: !f.missing && !f.sizeMismatch && f.match >= PASS_MATCH && f.stateEqual }));
  const fails = frames.filter((f) => !f.pass);
  failed += fails.length;
  // Saved bytes at the end of the run (storage.json): same keys, same strings.
  const readLs = (d) => { try { return JSON.parse(fs.readFileSync(path.join(d, 'storage.json'), 'utf8')); } catch { return null; } };
  const lsA = readLs(dirA), lsB = readLs(dirB);
  let storageDiff = null;
  if (!lsA || !lsB) storageDiff = `storage.json missing in ${!lsA ? a : b}`;
  else {
    for (const k of [...new Set([...Object.keys(lsA), ...Object.keys(lsB)])].sort()) {
      const x = lsA[k], y = lsB[k];
      if (x === y) continue;
      if (x === undefined || y === undefined) { storageDiff = `${k}: only in ${x === undefined ? b : a}`; break; }
      let i = 0; while (i < x.length && x[i] === y[i]) i++;
      storageDiff = `${k} differs at byte ${i}: ${JSON.stringify(x.slice(Math.max(0, i - 40), i + 60))} vs ${JSON.stringify(y.slice(Math.max(0, i - 40), i + 60))}`;
      break;
    }
  }
  if (storageDiff) failed++;
  const s = {
    name, scenario: name.split('@')[0], viewport: name.split('@')[1], dirA, dirB, diffDir,
    frames,
    total: frames.length,
    passed: frames.length - fails.length,
    pixelPass: frames.filter((f) => f.match >= PASS_MATCH).length,
    statePass: frames.filter((f) => f.stateEqual).length,
    identical: frames.filter((f) => f.identical).length,
    minMatch: frames.length ? Math.min(...frames.map((f) => f.match)) : 0,
    firstStateDiff: frames.find((f) => !f.stateEqual) || null,
    storageEqual: !storageDiff,
    storageDiff,
  };
  results.scenarios.push(s);
  console.log(`${name}: ${s.passed}/${s.total} frames pass  pixels>=99%: ${s.pixelPass}  state equal: ${s.statePass}  ` +
    `identical: ${s.identical}  min match: ${(s.minMatch * 100).toFixed(3)}%  saves: ${s.storageEqual ? 'identical' : 'DIFFER'}`);
  if (storageDiff) console.log('  saves: ' + storageDiff);
  if (s.firstStateDiff) {
    console.log(`  first state difference at frame ${s.firstStateDiff.frame}:`);
    for (const l of (s.firstStateDiff.stateDiffs || []).slice(0, 8)) console.log('    ' + l);
  }
}
fs.writeFileSync(path.join(OUT, `compare-${a}-${b}.json`), JSON.stringify(results, null, 1));
if (!argv.includes('--no-report')) {
  const file = writeReport(results);
  console.log('report: ' + file);
}
console.log(failed ? `FAIL: ${failed} frame(s) or save(s)` : 'PASS');
process.exitCode = failed ? 1 : 0;
