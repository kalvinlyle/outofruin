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
export const ORIG_ARCHIVE = path.join(GAME, '_work', 'parity', 'archive');
export const ORIGIN = 'http://parity.localhost';
// Same-origin empty page used to restore storage before the game loads.
const BLANK = '/__parity/blank.html';

export const TARGETS = {
  // the shipped Defold build with the parity hook baked into its archive
  orig: { page: '/index.html', archive: ORIG_ARCHIVE, ready: 'engine' },
  // the HTML port; signals readiness with __parity.portReady()
  port: { page: '/port/index.html', archive: null, ready: 'port' },
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

export function initScript(cfg) {
  return INIT_SRC + '\nparityInit(' + JSON.stringify(cfg) + ');\n';
}

function resolveFile(target, pathname) {
  const p = decodeURIComponent(pathname);
  if (target.archive && p.startsWith('/archive/')) return path.join(target.archive, p.slice('/archive/'.length));
  const f = path.join(GAME, p);
  if (!f.startsWith(GAME)) return null;
  return f;
}

async function route(page, target, log) {
  await page.route('**/*', async (r) => {
    const url = new URL(r.request().url());
    if (url.origin !== ORIGIN) {
      // Third parties: answer the ones the page expects, drop the rest.
      if (/kongregate\.com/.test(url.host)) return r.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
      if (/google-analytics\.com/.test(url.host)) return r.fulfill({ status: 200, contentType: 'text/plain', body: '' });
      log.push('blocked ' + url.href);
      return r.abort();
    }
    if (url.pathname === BLANK) return r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>parity</title>' });
    if (url.pathname.startsWith('/api/')) {
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

// Expand scenario steps into per-frame input events.
export function expandSteps(steps) {
  const ev = [];
  for (const s of steps || []) {
    const f = s.frame;
    switch (s.action) {
      case 'tap': {
        const hold = s.hold ?? 2;
        ev.push({ frame: f, type: 'move', x: s.x, y: s.y });
        ev.push({ frame: f, type: 'down', x: s.x, y: s.y });
        ev.push({ frame: f + hold, type: 'up', x: s.x, y: s.y });
        break;
      }
      case 'down': ev.push({ frame: f, type: 'move', x: s.x, y: s.y }, { frame: f, type: 'down', x: s.x, y: s.y }); break;
      case 'up': ev.push({ frame: f, type: 'up', x: s.x, y: s.y }); break;
      case 'move': ev.push({ frame: f, type: 'move', x: s.x, y: s.y, buttons: s.buttons || 0 }); break;
      case 'drag': {
        // press at (x,y), move one step per frame to (x2,y2) over `frames`, release
        const n = Math.max(1, s.frames ?? 10);
        ev.push({ frame: f, type: 'move', x: s.x, y: s.y }, { frame: f, type: 'down', x: s.x, y: s.y });
        for (let i = 1; i <= n; i++) {
          const x = s.x + ((s.x2 - s.x) * i) / n;
          const y = s.y + ((s.y2 - s.y) * i) / n;
          ev.push({ frame: f + i, type: 'move', x, y, buttons: 1 });
        }
        ev.push({ frame: f + n + (s.hold ?? 1), type: 'up', x: s.x2, y: s.y2 });
        break;
      }
      case 'wheel': ev.push({ frame: f, type: 'move', x: s.x, y: s.y }, { frame: f, type: 'wheel', x: s.x, y: s.y, delta: s.delta ?? 120 }); break;
      default: throw new Error('unknown action ' + s.action);
    }
  }
  return ev;
}

export function captureFrames(scenario) {
  const set = new Set(scenario.capture?.frames || []);
  const every = scenario.capture?.every;
  if (every) for (let f = 0; f < scenario.frames; f += every) set.add(f);
  set.add(scenario.frames - 1);
  return [...set].filter((f) => f >= 0 && f < scenario.frames).sort((a, b) => a - b);
}

async function waitBoot(page, target, timeoutMs = 60000) {
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
  const vp = opts.viewport || scenario.viewport || { w: 750, h: 1334 };
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
  await route(page, target, log);
  await page.addInitScript({
    content: initScript({
      startTime: fixture.startTime ?? DEFAULT_START,
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

    const events = expandSteps(scenario.steps);
    const caps = captureFrames(scenario);
    const capSet = new Set(caps);
    const outDir = opts.outDir;
    if (outDir) {
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.mkdirSync(path.join(outDir, 'state'), { recursive: true });
    }
    const states = {};
    let frame = 0;
    for (const cf of caps) {
      // step up to (not including) the capture frame, then the capture frame itself
      if (cf > frame) {
        const evs = events.filter((e) => e.frame >= frame && e.frame < cf);
        await page.evaluate(([n, evs]) => window.__parity.step(n, { events: evs }), [cf - frame, evs]);
        frame = cf;
      }
      const evs = events.filter((e) => e.frame === cf);
      const want = opts.save && cf === caps[caps.length - 1] ? 'state,save' : 'state';
      const res = await page.evaluate(async ([evs, want]) => {
        await window.__parity.step(1, { events: evs, want });
        return { state: window.__parity.state(), png: window.__parity.snapshot(), err: window.__parity.lastError() };
      }, [evs, want]);
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
      await page.waitForFunction(() => typeof Module === 'undefined' || !(Module._syncInProgress || Module._syncNeeded), null, { timeout: 10000 });
      await page.waitForTimeout(250);
      await page.waitForFunction(() => typeof Module === 'undefined' || !(Module._syncInProgress || Module._syncNeeded), null, { timeout: 10000 });
      storage = await page.evaluate(() => window.__parity.snapshotStorage());
    }
    const clock = await page.evaluate(() => window.__parity.now());
    if (outDir) fs.writeFileSync(path.join(outDir, 'log.txt'), log.join('\n') + '\n');
    return { frames: scenario.frames, captures: caps, states, storage, clock, log };
  } finally {
    await context.close();
  }
}
