// Drives one target (orig | port) through one scenario in headless Chromium.
// Files are served from disk with page.route on a made-up origin: no server,
// no port.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PARITY = path.resolve(HERE, '..');
export const ROOT = path.resolve(PARITY, '..', '..', '..');
export const GAME = path.join(ROOT, 'game');
// The original Defold build comes from another checkout: PARITY_SOURCE_ROOT, or
// by default a worktree of the defold-final tag next to this one
// (git worktree add ../out-of-ruin-defold defold-final). The port always comes
// from this checkout.
export const SOURCE_ROOT = path.resolve(process.env.PARITY_SOURCE_ROOT || path.join(ROOT, '..', 'out-of-ruin-defold'));
export const SOURCE_GAME = path.join(SOURCE_ROOT, 'game');
export const ORIG_ARCHIVE = path.join(GAME, '_work', 'parity', 'archive');
export const ORIGIN = 'http://parity.localhost';
// Same-origin empty page used to restore storage before the game loads.
const BLANK = '/__parity/blank.html';

export const TARGETS = {
  // the Defold build (tag defold-final) with the parity hook baked into its archive
  orig: { page: '/index.html', archive: ORIG_ARCHIVE, ready: 'engine' },
  // the HTML port, the game this checkout serves; signals readiness with __parity.portReady()
  port: { page: '/index.html', archive: null, ready: 'port' },
};

// Default start of the virtual clock (fixtures may set their own):
// 2026-01-01T00:00:00Z.
export const DEFAULT_START = 1767225600000;
export const DEFAULT_SEED = 0x5eed;
// Requests that are gated (delivered on frame boundaries) even during boot.
export const GATE = ['/api/', '/loc\\.json', 'google-analytics\\.com', 'spreadsheets\\.google\\.com'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.txt': 'text/plain',
};

const INIT_SRC = fs.readFileSync(path.join(HERE, 'init.js'), 'utf8');

// A "reload" step stores the next session's settings (startTime) in
// sessionStorage under CFG_KEY before navigating; they override cfg there.
const CFG_KEY = '__parity_cfg';
export function initScript(cfg) {
  return INIT_SRC + '\nparityInit(Object.assign(' + JSON.stringify(cfg) +
    ', (function () { try { return JSON.parse(sessionStorage.getItem(' + JSON.stringify(CFG_KEY) + ') || "{}"); } catch (e) { return {}; } })()));\n';
}

// ---- real-money store stub ------------------------------------------------
// Scenario option "store": { "enabled": true, "checkout": "paid" | "open" |
// "expired", "sessions": { "<cs_test_...>": { "pack": "buygold_2", "status": "paid" } } }.
// Answers /api/status, /api/checkout and /api/claim exactly as game/api/*.js
// do with a Stripe key configured, against an in-memory Stripe: sessions made
// by /api/checkout are cs_test_parity1, 2, ... in the state "checkout"
// (default "paid"); a paid session grants its pack's gold on the first claim
// and "claimed" after that. The redirect to Stripe Checkout is answered with
// 204 No Content, so the page stays where it is; a "reload" step with
// "?checkout=success&session_id=..." then plays the return.
const STORE_PACKS = (() => {
  const src = fs.readFileSync(path.join(SOURCE_GAME, 'packs.js'), 'utf8');
  const module = { exports: {} };
  new Function('module', src).call({}, module);
  return module.exports;
})();
const STRIPE_CHECKOUT = 'https://checkout.stripe.com/c/pay/';

function storeStub(opts) {
  const sessions = new Map(Object.entries(opts.sessions || {}).map(([id, s]) => [id, { pack: s.pack, status: s.status || 'paid', claimed: Boolean(s.claimed) }]));
  let seq = 0;
  const json = (status, body) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const body = (req) => { try { return JSON.parse(req.postData() || 'null'); } catch (e) { return null; } };
  return {
    navigation: (url) => url.startsWith(STRIPE_CHECKOUT),
    answer(pathname, req, log) {
      if (pathname === '/api/status') return json(200, { enabled: true });
      if (pathname === '/api/checkout') {
        if (req.method() !== 'POST') return json(405, { error: 'method_not_allowed' });
        const b = body(req);
        const pack = STORE_PACKS.packs.find((p) => p.id === (b && b.pack));
        if (!pack) return json(400, { error: 'unknown_pack' });
        const id = 'cs_test_parity' + (++seq);
        sessions.set(id, { pack: pack.id, status: opts.checkout || 'paid', claimed: false });
        log.push('[store] checkout ' + id + ' ' + pack.id);
        return json(200, { id, url: STRIPE_CHECKOUT + id });
      }
      if (pathname === '/api/claim') {
        if (req.method() !== 'POST') return json(405, { error: 'method_not_allowed' });
        const b = body(req);
        const id = b && b.session;
        if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id || '')) return json(400, { error: 'bad_session' });
        const s = sessions.get(id);
        let res;
        if (!s) res = json(502, { error: 'stripe_error' }); // Stripe: no such checkout session
        else if (s.status !== 'paid') res = json(200, { status: s.status === 'open' ? 'pending' : 'void', gold: 0 });
        else if (s.claimed) res = json(200, { status: 'claimed', gold: 0 });
        else {
          const pack = STORE_PACKS.packs.find((p) => p.id === s.pack);
          if (!pack) res = json(200, { status: 'void', gold: 0 });
          else { s.claimed = true; res = json(200, { status: 'granted', gold: pack.gold }); }
        }
        log.push('[store] claim ' + id + ' -> ' + res.status + ' ' + res.body);
        return res;
      }
      return json(404, { error: 'parity harness' });
    },
  };
}

function resolveFile(target, pathname) {
  const p = decodeURIComponent(pathname);
  if (target.archive && p.startsWith('/archive/')) return path.join(target.archive, p.slice('/archive/'.length));
  // Each build is served from its own checkout's game/.
  const root = target.archive ? SOURCE_GAME : GAME;
  const f = path.join(root, p);
  if (!f.startsWith(root)) return null;
  return f;
}

export async function route(page, target, log, store) {
  const stub = store && store.enabled ? storeStub(store) : null;
  await page.route('**/*', async (r) => {
    const url = new URL(r.request().url());
    if (url.origin !== ORIGIN) {
      // Third parties: answer the ones the page expects, drop the rest.
      if (/kongregate\.com/.test(url.host)) return r.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
      if (/google-analytics\.com/.test(url.host)) return r.fulfill({ status: 200, contentType: 'text/plain', body: '' });
      if (stub && stub.navigation(url.href)) {
        log.push('[store] redirect to ' + url.href + ' (204, page stays)');
        return r.fulfill({ status: 204, body: '' });
      }
      log.push('blocked ' + url.href);
      return r.abort();
    }
    if (url.pathname === BLANK) return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>parity</title>' });
    if (url.pathname.startsWith('/api/')) {
      if (stub) return r.fulfill(stub.answer(url.pathname, r.request(), log));
      if (url.pathname === '/api/status') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"enabled":false}' });
      return r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"parity harness"}' });
    }
    const file = resolveFile(target, url.pathname);
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      log.push('404 ' + url.pathname);
      return r.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
    }
    return r.fulfill({
      status: 200,
      contentType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      headers: { 'cache-control': 'no-store' },
      body: fs.readFileSync(file),
    });
  });
}

export async function launch() {
  return chromium.launch({
    headless: true,
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--force-color-profile=srgb',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--mute-audio',
    ],
  });
}

export function loadJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadScenario(name) {
  const s = loadJSON(path.join(PARITY, 'scenarios', name + '.json'));
  s.name = name;
  return s;
}

export function loadFixture(name) {
  const f = path.join(PARITY, 'fixtures', name + '.json');
  return loadJSON(f);
}

// ---- viewports ------------------------------------------------------------
// Every scenario runs at each of these unless it lists its own "viewports".
export const DESIGN = { w: 750, h: 1334 };
export const VIEWPORTS = ['750x1334', '1080x2400', '1536x2048'];

export function parseViewport(v) {
  if (v && typeof v === 'object') return { w: v.w, h: v.h, key: `${v.w}x${v.h}` };
  const m = /^(\d+)x(\d+)$/.exec(String(v).trim());
  if (!m) throw new Error('bad viewport ' + v + ' (want WxH, e.g. 1080x2400)');
  return { w: Number(m[1]), h: Number(m[2]), key: `${m[1]}x${m[2]}` };
}

// The viewports a scenario runs at: --viewport (comma list) wins, then the
// scenario's "viewports", then all of VIEWPORTS.
export function scenarioViewports(scenario, override) {
  const list = override ? String(override).split(',') : scenario.viewports || VIEWPORTS;
  return list.map(parseViewport);
}

// Output directory name of one scenario at one viewport: <scenario>@<WxH>.
export const runName = (name, vp) => `${name}@${vp.key}`;

// The canvas the original sizes for a window (index.html: aspect clamped to
// [0.45, 0.75], centred) and the scene's uniform fit scale on it.
export function canvasFor(vp) {
  const aspect = Math.min(Math.max(vp.w / vp.h, 0.45), 0.75);
  let cw = vp.w, ch = vp.h;
  if (vp.w / vp.h > aspect) cw = Math.round(vp.h * aspect);
  else if (vp.w / vp.h < aspect) ch = Math.round(vp.w / aspect);
  const s = Math.min(cw / DESIGN.w, ch / DESIGN.h);
  return { w: cw, h: ch, s, dw: cw / s, dh: ch / s };
}

const ANCHORS = {
  center: [0.5, 0.5], top: [0.5, 0], bottom: [0.5, 1], left: [0, 0.5], right: [1, 0.5],
  topleft: [0, 0], topright: [1, 0], bottomleft: [0, 1], bottomright: [1, 1],
  list: [0.5, 0.25],
};

// Map a design-space point (750x1334, CSS y down) to canvas px for a viewport.
// The scene is drawn uniformly scaled by s; the screen in design units is
// dw x dh (>= 750 x 1334). anchor [ax, ay] says which share of the extra
// width/height lies left of / above the point: 0 = pinned to the left/top
// edge, 0.5 = centred, 1 = pinned to the right/bottom edge.
export function mapPoint(x, y, anchor, vp) {
  const c = canvasFor(vp);
  const [ax, ay] = Array.isArray(anchor) ? anchor : ANCHORS[anchor || 'center'];
  if (ax === undefined) throw new Error('unknown anchor ' + anchor);
  return { x: Math.round((x + ax * (c.dw - DESIGN.w)) * c.s), y: Math.round((y + ay * (c.dh - DESIGN.h)) * c.s) };
}

// Resolve a step's coordinates for a viewport: an explicit per-viewport
// override ("at": { "1080x2400": { "x":..,"y":..,"x2":..,"y2":.. } }) wins,
// otherwise the design-space point is mapped through the step's anchor.
function stepPoints(s, vp) {
  const o = (s.at && vp && s.at[vp.key]) || null;
  if (o) return { x: o.x ?? s.x, y: o.y ?? s.y, x2: o.x2 ?? s.x2, y2: o.y2 ?? s.y2 };
  if (!vp || (vp.w === DESIGN.w && vp.h === DESIGN.h)) return { x: s.x, y: s.y, x2: s.x2, y2: s.y2 };
  const p = mapPoint(s.x, s.y, s.anchor, vp);
  const out = { x: p.x, y: p.y };
  if (s.x2 !== undefined) {
    const q = mapPoint(s.x2, s.y2, s.anchor2 || s.anchor, vp);
    out.x2 = q.x; out.y2 = q.y;
  }
  return out;
}

// Expand scenario steps into per-frame input events and clock advances.
// Returns { events: [{frame,type,x,y,...}], clock: [{frame, ms}] }.
export function expandSteps(steps, vp) {
  const ev = [];
  const clock = [];
  for (const s of steps || []) {
    const f = s.frame;
    if (s.action === 'skip') {
      // app backgrounded: the clock jumps, no frame runs in between
      clock.push({ frame: f, ms: Math.round((s.seconds ?? 0) * 1000) });
      continue;
    }
    // "reload" (leave and reopen the page, e.g. back from Stripe) is run by runScenario
    if (s.action === 'reload') continue;
    if (s.action === 'timelapse') {
      // frames keep running, each one later by an equal share of the time
      const n = Math.max(1, s.frames ?? 60);
      const total = Math.round((s.seconds ?? 0) * 1000);
      for (let i = 0; i < n; i++) clock.push({ frame: f + i, ms: Math.round((total * (i + 1)) / n) - Math.round((total * i) / n) });
      continue;
    }
    const p = stepPoints(s, vp);
    switch (s.action) {
      case 'tap': {
        const hold = s.hold ?? 2;
        ev.push({ frame: f, type: 'move', x: p.x, y: p.y });
        ev.push({ frame: f, type: 'down', x: p.x, y: p.y });
        ev.push({ frame: f + hold, type: 'up', x: p.x, y: p.y });
        break;
      }
      case 'down': ev.push({ frame: f, type: 'move', x: p.x, y: p.y }, { frame: f, type: 'down', x: p.x, y: p.y }); break;
      case 'up': ev.push({ frame: f, type: 'up', x: p.x, y: p.y }); break;
      case 'move': ev.push({ frame: f, type: 'move', x: p.x, y: p.y, buttons: s.buttons || 0 }); break;
      case 'drag': {
        // press at (x,y), move one step per frame to (x2,y2) over `frames`, release
        const n = Math.max(1, s.frames ?? 10);
        ev.push({ frame: f, type: 'move', x: p.x, y: p.y }, { frame: f, type: 'down', x: p.x, y: p.y });
        for (let i = 1; i <= n; i++) {
          const x = p.x + ((p.x2 - p.x) * i) / n;
          const y = p.y + ((p.y2 - p.y) * i) / n;
          ev.push({ frame: f + i, type: 'move', x, y, buttons: 1 });
        }
        ev.push({ frame: f + n + (s.hold ?? 1), type: 'up', x: p.x2, y: p.y2 });
        break;
      }
      case 'wheel': ev.push({ frame: f, type: 'move', x: p.x, y: p.y }, { frame: f, type: 'wheel', x: p.x, y: p.y, delta: s.delta ?? 120 }); break;
      default: throw new Error('unknown action ' + s.action);
    }
  }
  return { events: ev, clock };
}

export function captureFrames(scenario) {
  const set = new Set(scenario.capture?.frames || []);
  const every = scenario.capture?.every;
  if (every) for (let f = 0; f < scenario.frames; f += every) set.add(f);
  set.add(scenario.frames - 1);
  return [...set].filter((f) => f >= 0 && f < scenario.frames).sort((a, b) => a - b);
}

export async function waitBoot(page, target, timeoutMs = 60000) {
  const end = Date.now() + timeoutMs;
  let stableSince = 0;
  let last = '';
  while (Date.now() < end) {
    const st = await page.evaluate(() => window.__parity && window.__parity.bootStatus());
    const ok = st && st.rafQueued > 0 && st.bootTimers === 0 && st.bootInFlight === 0 &&
      (target.ready === 'port' ? st.portReady : true);
    const sig = JSON.stringify(st);
    if (ok) {
      if (sig !== last) stableSince = Date.now();
      if (Date.now() - stableSince > 300) return st;
    } else {
      stableSince = 0;
    }
    last = sig;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('boot timed out: ' + last);
}

// Run a scenario on a target. Returns { frames, captures:[frame], log }.
// Writes PNGs and state JSON under outDir when given.
export async function runScenario(browser, targetName, scenario, opts = {}) {
  const target = TARGETS[targetName];
  if (!target) throw new Error('unknown target ' + targetName);
  const fixture = loadFixture(scenario.fixture || 'fresh');
  const vp = parseViewport(opts.viewport || DESIGN);
  // "away": seconds the app was closed since the fixture's session ended.
  const startTime = (fixture.startTime ?? DEFAULT_START) + Math.round((scenario.away ?? 0) * 1000);
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    timezoneId: 'UTC',
    locale: 'en-US',
    serviceWorkers: 'block',
    hasTouch: false,
    isMobile: false,
  });
  const page = await context.newPage();
  const log = [];
  page.on('console', (m) => log.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', (e) => log.push('[pageerror] ' + (e.stack || e.message)));
  await route(page, target, log, scenario.store);
  await page.addInitScript({
    content: initScript({
      startTime,
      seed: scenario.seed ?? DEFAULT_SEED,
      gate: GATE,
    }),
  });
  try {
    // Restore localStorage + IndexedDB first: Defold syncs IDBFS into its
    // file system before main(), so it must be in place before the page loads.
    await page.goto(ORIGIN + BLANK, { waitUntil: 'load' });
    await page.evaluate((snap) => window.__parity.restoreStorage(snap), { localStorage: fixture.localStorage || {}, indexedDB: fixture.indexedDB || [] });
    await page.goto(ORIGIN + target.page, { waitUntil: 'load' });
    const boot = await waitBoot(page, target);
    log.push('[parity] boot ' + JSON.stringify(boot));
    await page.evaluate(() => {
      window.__parity.canvas().focus();
      window.__parity.start();
    });

    const { events, clock } = expandSteps(scenario.steps, vp);
    const caps = captureFrames(scenario);
    const capSet = new Set(caps);
    const outDir = opts.outDir;
    if (outDir) {
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.mkdirSync(path.join(outDir, 'state'), { recursive: true });
    }
    const states = {};
    let frame = 0;
    // "reload" steps: before frame `frame` runs, the page is left and opened
    // again at its URL + `query`, keeping storage. The new session's clock
    // starts on the next whole second after the old one stopped (+ `away` s),
    // like a fixture's; boot then runs on real time as at the start.
    const reloads = (scenario.steps || []).filter((s) => s.action === 'reload').sort((a, b) => a.frame - b.frame);
    let ri = 0;
    // the page counts its frames from 0 again after a reload; `base` is the
    // scenario frame the current page's frame 0 is
    let base = 0;
    const local = (list) => list.map((x) => ({ ...x, frame: x.frame - base }));
    const doReload = async (s) => {
      const now = await page.evaluate(() => window.__parity.now());
      const next = Math.ceil(now.date / 1000) * 1000 + Math.round((s.away ?? 0) * 1000);
      await page.evaluate(([k, v]) => sessionStorage.setItem(k, v), [CFG_KEY, JSON.stringify({ startTime: next })]);
      await page.goto(ORIGIN + target.page + (s.query || ''), { waitUntil: 'load' });
      base = s.frame;
      const boot = await waitBoot(page, target);
      log.push('[parity] reload at frame ' + s.frame + ' ' + (s.query || '') + ' boot ' + JSON.stringify(boot));
      await page.evaluate(() => {
        window.__parity.canvas().focus();
        window.__parity.start();
      });
    };
    // run frames [frame, to), reloading where a step says so
    const advance = async (to) => {
      while (true) {
        if (ri < reloads.length && reloads[ri].frame <= frame) { await doReload(reloads[ri++]); continue; }
        if (frame >= to) return;
        const stop = ri < reloads.length ? Math.min(to, reloads[ri].frame) : to;
        const evs = events.filter((e) => e.frame >= frame && e.frame < stop);
        const cks = clock.filter((c) => c.frame >= frame && c.frame < stop);
        await page.evaluate(([n, evs, cks]) => window.__parity.step(n, { events: evs, clock: cks }), [stop - frame, local(evs), local(cks)]);
        frame = stop;
      }
    };
    for (const cf of caps) {
      // step up to (not including) the capture frame, then the capture frame itself
      await advance(cf);
      const evs = events.filter((e) => e.frame === cf);
      const cks = clock.filter((c) => c.frame === cf);
      const want = opts.save && cf === caps[caps.length - 1] ? 'state,save' : 'state';
      const res = await page.evaluate(async ([evs, cks, want]) => {
        await window.__parity.step(1, { events: evs, clock: cks, want });
        return { state: window.__parity.state(), png: window.__parity.snapshot(), err: window.__parity.lastError() };
      }, [local(evs), local(cks), want]);
      frame = cf + 1;
      if (res.err) throw new Error('frame ' + cf + ' threw: ' + res.err);
      states[cf] = res.state;
      if (outDir) {
        fs.writeFileSync(path.join(outDir, String(cf).padStart(5, '0') + '.png'), Buffer.from(res.png.split(',')[1], 'base64'));
        fs.writeFileSync(path.join(outDir, 'state', String(cf).padStart(5, '0') + '.json'), res.state ?? 'null');
      }
      if (capSet.size && opts.onCapture) opts.onCapture(cf);
    }
    let storage = null;
    if (opts.save) {
      // Let Defold's IDBFS write-back (FS.syncfs, real async) finish first.
      // dmloader stops retrying after _syncMaxTries failed syncs and then
      // leaves _syncInProgress set for good, so give up waiting after 30 s
      // and snapshot what IndexedDB holds (localStorage is written
      // synchronously by defsave either way).
      const idle = () => typeof Module === 'undefined' || !(Module._syncInProgress || Module._syncNeeded);
      for (let pass = 0; pass < 2; pass++) {
        try {
          await page.waitForFunction(idle, null, { timeout: 30000 });
        } catch (e) {
          const st = await page.evaluate(() => typeof Module === 'undefined' ? null : { tries: Module._syncTries, max: Module._syncMaxTries, inProgress: Module._syncInProgress, needed: Module._syncNeeded });
          log.push('[parity] IDBFS sync still busy, snapshotting anyway: ' + JSON.stringify(st));
          console.warn('warning: IDBFS sync still busy after 30 s, snapshotting anyway ' + JSON.stringify(st));
          break;
        }
        if (pass === 0) await page.waitForTimeout(250);
      }
      storage = await page.evaluate(() => window.__parity.snapshotStorage());
    }
    const endClock = await page.evaluate(() => window.__parity.now());
    if (outDir) fs.writeFileSync(path.join(outDir, 'log.txt'), log.join('\n') + '\n');
    // The saves exactly as written (defsave stores JSON whose key order follows
    // Lua's pairs order), compared byte for byte at the end of the run.
    if (outDir) {
      const ls = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
      fs.writeFileSync(path.join(outDir, 'storage.json'), JSON.stringify(ls, null, 1) + '\n');
    }
    return { frames: scenario.frames, captures: caps, states, storage, clock: endClock, log, viewport: vp };
  } finally {
    await context.close();
  }
}
