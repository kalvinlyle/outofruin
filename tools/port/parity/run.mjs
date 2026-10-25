#!/usr/bin/env node
// Parity harness CLI.
//
//   node run.mjs --target orig|port --scenario <name> | --all [--viewport 750x1334]
//   node run.mjs --selftest [--scenario <name>]
//        run orig twice per scenario and require 100% identical pixels and state
//   node run.mjs --make-fixture <name> --scenario <name>
//        run a scenario on orig, force a save on its last frame and write
//        fixtures/<name>.json from localStorage
//   node run.mjs --build      rebake game/_work/parity (also done automatically when stale)
//
// Output: out/<scenario>/<target>/<frame>.png, state/<frame>.json, log.txt
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PARITY, ROOT, ORIG_ARCHIVE, launch, loadScenario, runScenario } from './lib/harness.mjs';
import { compareRuns } from './lib/diff.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);

function newestMtime(dir) {
  let t = 0;
  if (!fs.existsSync(dir)) return t;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newestMtime(p) : fs.statSync(p).mtimeMs);
  }
  return t;
}

function ensureOrigBuilt(force) {
  const stamp = path.join(ORIG_ARCHIVE, 'archive_files.json');
  const inputs = Math.max(
    newestMtime(path.join(ROOT, 'game-src')),
    newestMtime(path.join(PARITY, 'hook')),
    fs.statSync(path.join(ROOT, 'tools', 'patch_game.py')).mtimeMs,
    fs.statSync(path.join(PARITY, 'build_orig.py')).mtimeMs,
  );
  if (!force && fs.existsSync(stamp) && fs.statSync(stamp).mtimeMs >= inputs) return;
  console.log('baking parity variant -> game/_work/parity');
  execFileSync('python3', [path.join(PARITY, 'build_orig.py')], { stdio: ['ignore', 'ignore', 'inherit'] });
}

function scenarioNames() {
  if (opt('--scenario')) return [opt('--scenario')];
  return fs.readdirSync(path.join(PARITY, 'scenarios')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
}

function viewport() {
  const v = opt('--viewport');
  if (!v) return undefined;
  const [w, h] = v.split('x').map(Number);
  return { w, h };
}

async function runOne(browser, target, name, outRoot) {
  const scenario = loadScenario(name);
  const outDir = path.join(outRoot, name, target);
  const t = Date.now();
  const res = await runScenario(browser, target, scenario, { outDir, viewport: viewport() });
  console.log(`${name} [${target}] ${res.frames} frames, ${res.captures.length} captures, ${((Date.now() - t) / 1000).toFixed(1)}s`);
  return res;
}

async function main() {
  if (flag('--build')) { ensureOrigBuilt(true); return; }
  ensureOrigBuilt(false);
  const browser = await launch();
  try {
    if (flag('--selftest')) {
      const out = path.join(PARITY, 'out', '_selftest');
      let fail = 0;
      for (const name of scenarioNames()) {
        await runOne(browser, 'orig', name, path.join(out, 'a'));
        await runOne(browser, 'orig', name, path.join(out, 'b'));
        const r = compareRuns(path.join(out, 'a', name, 'orig'), path.join(out, 'b', name, 'orig'));
        const ok = r.frames.every((f) => f.identical && f.stateEqual);
        if (!ok) fail++;
        const minMatch = Math.min(...r.frames.map((f) => f.match));
        console.log(`  selftest ${name}: ${ok ? 'PASS' : 'FAIL'} - ${r.frames.length} frames, ` +
          `byte-identical PNGs ${r.frames.filter((f) => f.identical).length}/${r.frames.length}, ` +
          `min pixel match ${(minMatch * 100).toFixed(4)}%, state equal ${r.frames.filter((f) => f.stateEqual).length}/${r.frames.length}`);
        for (const f of r.frames.filter((f) => !(f.identical && f.stateEqual)).slice(0, 5)) {
          console.log(`    frame ${f.frame}: match ${(f.match * 100).toFixed(4)}% state ${f.stateEqual ? 'equal' : 'DIFF ' + f.stateDiff}`);
        }
      }
      console.log(fail ? `SELFTEST FAILED (${fail} scenario(s))` : 'SELFTEST PASSED');
      process.exitCode = fail ? 1 : 0;
      return;
    }
    if (opt('--make-fixture')) {
      const name = opt('--make-fixture');
      const scenario = loadScenario(opt('--scenario'));
      const res = await runScenario(browser, 'orig', scenario, { save: true, outDir: path.join(PARITY, 'out', '_fixture', name) });
      // The next session starts where this one stopped, on the next whole second.
      const startTime = Math.ceil(res.clock.date / 1000) * 1000;
      const fixture = {
        name,
        description: `localStorage after scenario "${scenario.name}" (${scenario.frames} frames) on the original build`,
        startTime,
        localStorage: res.storage.localStorage,
        indexedDB: res.storage.indexedDB,
      };
      fs.writeFileSync(path.join(PARITY, 'fixtures', name + '.json'), JSON.stringify(fixture, null, 2) + '\n');
      const records = res.storage.indexedDB.map((d) => `${d.name}: ${d.stores.map((s) => s.records.map((r) => r.key).join(', ')).join('; ')}`);
      console.log(`wrote fixtures/${name}.json (${Object.keys(res.storage.localStorage).length} localStorage keys, IndexedDB ${records.join(' | ') || 'none'}, startTime ${startTime})`);
      return;
    }
    const target = opt('--target') || 'orig';
    const names = flag('--all') ? scenarioNames() : opt('--scenario') ? [opt('--scenario')] : null;
    if (!names) throw new Error('give --scenario <name> or --all');
    for (const name of names) await runOne(browser, target, name, path.join(PARITY, 'out'));
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
