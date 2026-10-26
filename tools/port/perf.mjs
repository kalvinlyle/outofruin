// Frame-rate check for the port (and the original, for reference) under CPU throttling.
//   node tools/port/perf.mjs [--target port|orig] [--fixture ch2] [--throttle 4] [--seconds 10] [--viewport 750x1334]
// Serves game/ from disk with page.route (no server). Uses real time: the
// parity harness's virtual clock is not installed. Reports frames per second
// and how long each frame's rAF callbacks took.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './parity/node_modules/playwright/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, '..', '..', 'game');
const ORIGIN = 'http://perf.localhost';
const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const target = opt('--target', 'port');
const fixtureName = opt('--fixture', 'ch2');
const throttle = Number(opt('--throttle', '4'));
const seconds = Number(opt('--seconds', '10'));
const [vw, vh] = opt('--viewport', '750x1334').split('x').map(Number);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm',
  '.webp': 'image/webp', '.png': 'image/png', '.css': 'text/css' };

const fixture = JSON.parse(fs.readFileSync(path.join(HERE, 'parity', 'fixtures', fixtureName + '.json'), 'utf8'));

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.route(ORIGIN + '/**', async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, body: '' });
  let p = path.join(GAME, decodeURIComponent(url.pathname));
  if (target === 'orig' && url.pathname.startsWith('/archive/')) p = path.join(GAME, '_work', 'parity', url.pathname);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
  route.fulfill({ status: 200, body: fs.readFileSync(p), headers: { 'content-type': MIME[path.extname(p)] ?? 'application/octet-stream' } });
});
await page.route(/^https?:\/\/(?!perf\.localhost)/, (r) => r.fulfill({ status: 404, body: '' }));

// restore the fixture's localStorage on a blank same-origin page first
await page.route(ORIGIN + '/__blank', (r) => r.fulfill({ status: 200, body: '<html></html>', headers: { 'content-type': 'text/html' } }));
await page.goto(ORIGIN + '/__blank');
await page.evaluate((ls) => { localStorage.clear(); for (const [k, v] of Object.entries(ls || {})) localStorage.setItem(k, v); }, fixture.localStorage);

await page.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const stats = { work: [], stamps: [] };
  window.__perf = stats;
  window.requestAnimationFrame = (cb) => raf((t) => {
    const s = performance.now();
    cb(t);
    stats.work.push(performance.now() - s);
    stats.stamps.push(t);
  });
});

const consoleErrors = new Map();
page.on('console', (m) => { if (m.type() === 'error') { const k = m.text().split('\n')[0].slice(0, 160); consoleErrors.set(k, (consoleErrors.get(k) ?? 0) + 1); } });
const cdp = await ctx.newCDPSession(page);
await page.goto(ORIGIN + (target === 'port' ? '/port/index.html' : '/index.html'));
// let it boot and settle unthrottled
await page.waitForTimeout(8000);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await page.evaluate(() => { window.__perf.work.length = 0; window.__perf.stamps.length = 0; });
const profile = argv.includes('--profile');
const trace = argv.includes('--trace');
const traceEvents = [];
if (trace) {
  cdp.on('Tracing.dataCollected', (e) => traceEvents.push(...e.value));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8,disabled-by-default-v8.gc,blink.user_timing', transferMode: 'ReportEvents' });
}
if (profile) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
await page.waitForTimeout(seconds * 1000);
const { work, stamps } = await page.evaluate(() => window.__perf);
if (trace) {
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  // long events on the main thread, by name
  const long = traceEvents.filter((e) => e.ph === 'X' && e.dur > 40000).map((e) => [e.name, Math.round(e.dur / 1000), e.args?.data?.type ?? e.args?.type ?? '']);
  const agg = {};
  for (const [n, d] of long) agg[n] = (agg[n] ?? []).concat(d);
  console.log(JSON.stringify(agg).slice(0, 2000));
}
if (profile) {
  const { profile: prof } = await cdp.send('Profiler.stop');
  // self time per function, top 25
  const byId = new Map(prof.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = prof.timeDeltas;
  prof.samples.forEach((id, i) => {
    const n = byId.get(id);
    const key = `${n.callFrame.functionName || '(anon)'} ${path.basename(n.callFrame.url || '')}:${n.callFrame.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0));
  });
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log((100 * v / total).toFixed(1).padStart(5) + '%  ' + k);
  }
}
await browser.close();

const sorted = [...work].sort((a, b) => a - b);
const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
const gaps = stamps.slice(1).map((t, i) => t - stamps[i]);
const slow = gaps.filter((g) => g > 1000 / 60 * 1.5).length;
const fps = stamps.length > 1 ? (stamps.length - 1) / ((stamps[stamps.length - 1] - stamps[0]) / 1000) : 0;
console.log(JSON.stringify({
  target, fixture: fixtureName, throttle, viewport: `${vw}x${vh}`,
  fps: Number(fps.toFixed(1)), frames: stamps.length, droppedFrames: slow,
  errors: Object.fromEntries(consoleErrors),
  spikes: work.map((w, i) => [i, +w.toFixed(1)]).filter(([, w]) => w > 25).slice(0, 30),
  workMs: { p50: +pct(0.5).toFixed(2), p95: +pct(0.95).toFixed(2), p99: +pct(0.99).toFixed(2), max: +pct(1).toFixed(2) },
}));
