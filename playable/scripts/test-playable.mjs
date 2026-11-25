#!/usr/bin/env node
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { smokePlayable } from 'playable-kit/smoke';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const FILE = path.join(REPO_ROOT, 'ads/playable/out-of-ruin.html');
const html = readFileSync(FILE, 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

// 1. Static checks: size, fuse, <head> async scripts, no COMPLETED, no vercel.app
const bytes = Buffer.byteLength(html);
assert(bytes <= 5 * 1024 * 1024, `size ${bytes} exceeds 5 MB`);
const lo = html.toLowerCase();
const firstClose = lo.indexOf('</head>');
const lastClose = lo.lastIndexOf('</head>');
assert(firstClose > 0 && html.slice(Math.max(0, firstClose - 6), firstClose).includes('<!--'), 'missing <!-- </head> --> fuse as first close');
assert(lastClose > firstClose, 'missing real </head> after fuse');
const headBeforeLast = html.slice(0, lastClose);
const blockingScripts = [...headBeforeLast.matchAll(/<script\b[^>]*src[^>]*>/gi)]
  .map((m) => m[0])
  .filter((t) => !/async|defer/i.test(t));
assert(blockingScripts.length === 0, `blocking head <script src>: ${blockingScripts.join(', ')}`);
assert(!html.includes('vercel.app'), 'stale vercel.app reference found in playable');
assert(html.includes('https://play.google.com/store/apps/details?id=games.misaligned.outofruin'), 'missing Play Store URL');
assert(!/\bCOMPLETED\b/.test(html), 'deprecated COMPLETED event name present');
console.log(`✓ static checks passed (${(bytes / 1024).toFixed(0)} KB, fuse ok, async scripts ok)`);

// 2. playable-kit smokePlayable
const smoke = await smokePlayable(FILE, { settleMs: 2500 });
assert(smoke.ok, `smokePlayable failed: ${smoke.failures.join('; ')}`);
console.log('✓ playable-kit smoke passed');

const browser = await chromium.launch({ headless: true });

try {
  // 3. Sadbundle tidy-then-splice + stalled tpc.googlesyndication.com FCP test
  {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 480 } });
    const page = await ctx.newPage();
    // Simulate Google's sadbundle: stall tpc.googlesyndication.com forever
    await page.route('https://tpc.googlesyndication.com/**', () => {
      /* deliberately never fulfill */
    });
    // Simulate Google tidying #boot into <body> and splicing two parser-blocking scripts at FIRST </head>
    const spliceTags =
      '<script src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi-impl.js"></script>' +
      '<script src="https://tpc.googlesyndication.com/pagead/gadgets/html5/addata.js"></script>';
    const fIdx = html.toLowerCase().indexOf('</head>');
    const sadHtml = html.slice(0, fIdx) + spliceTags + html.slice(fIdx);
    const tmpSad = FILE.replace(/\.html$/, '.sad-test.html');
    writeFileSync(tmpSad, sadHtml);
    try {
      await page.goto(pathToFileURL(tmpSad).href, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await page.waitForTimeout(1500);
      const fcp = await page.evaluate(() => {
        const entries = performance.getEntriesByType('paint');
        const fp = entries.find((e) => e.name === 'first-contentful-paint');
        return fp ? fp.startTime : 0;
      });
      const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
      assert(fcp > 0, `sadbundle stall produced no FCP (${fcp})`);
      assert(hasCanvas, 'sadbundle stall prevented canvas boot');
      console.log(`✓ sadbundle stall FCP passed (FCP ${fcp.toFixed(0)} ms)`);
    } finally {
      unlinkSync(tmpSad);
      await ctx.close();
    }
  }

  // 4. Built-file audio silence spy test (0 calls before gesture, audible after gesture)
  {
    const spy = `<script>
      window.__AUDIO_LOG__ = [];
      const origPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function() {
        this.muted = true;
        window.__AUDIO_LOG__.push({ kind: 'play', active: !!(navigator.userActivation && navigator.userActivation.hasBeenActive) });
        return origPlay.apply(this, arguments);
      };
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        const origResume = AC.prototype.resume;
        AC.prototype.resume = function() {
          window.__AUDIO_LOG__.push({ kind: 'resume', active: !!(navigator.userActivation && navigator.userActivation.hasBeenActive) });
          return origResume.apply(this, arguments);
        };
      }
    </script>`;
    const headOpen = html.toLowerCase().indexOf('<head>') + 6;
    const spiedHtml = html.slice(0, headOpen) + spy + html.slice(headOpen);
    const tmpSpy = FILE.replace(/\.html$/, '.audio-spy.html');
    writeFileSync(tmpSpy, spiedHtml);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    try {
      await page.goto(pathToFileURL(tmpSpy).href, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      const before = await page.evaluate(() => window.__AUDIO_LOG__.slice());
      assert(before.length === 0, `audio attempted before user gesture: ${JSON.stringify(before)}`);
      await page.mouse.click(120, 420);
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => window.__AUDIO_LOG__.slice());
      assert(after.length > 0 && after.some((x) => x.active), `audio did not start after gesture: ${JSON.stringify(after)}`);
      console.log(`✓ audio silence spy passed (0 before gesture, ${after.length} after with hasBeenActive=true)`);
    } finally {
      unlinkSync(tmpSpy);
      await ctx.close();
    }
  }

  // 5. Full playthrough + ALPlayableAnalytics event sequence + CTA hook + landscape check
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__EVENTS__ = [];
      window.__MRAID_OPEN__ = [];
      window.ALPlayableAnalytics = { trackEvent: (ev) => window.__EVENTS__.push(ev) };
      window.mraid = { open: (url) => window.__MRAID_OPEN__.push(url) };
    });
    await page.goto(pathToFileURL(FILE).href, { waitUntil: 'load' });
    await page.waitForTimeout(800);

    // Check first tap does NOT redirect to store
    await page.mouse.click(110, 450); // Explore Farm
    await page.waitForTimeout(150);
    const mraidAfterFirst = await page.evaluate(() => window.__MRAID_OPEN__.length);
    assert(mraidAfterFirst === 0, 'first tap redirected to store');

    // Play through: tap farm 3 more times, hire farm hand, tap farm until cellar unlocks, unlock cellar, tap cellar until squire ready, trigger squire, open chest!
    for (let i = 0; i < 4; i++) {
      await page.mouse.click(110, 450);
      await page.waitForTimeout(90);
    }
    await page.mouse.click(280, 450); // Hire Farm Hand
    await page.waitForTimeout(120);
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(110, 450);
      await page.waitForTimeout(90);
    }
    await page.mouse.click(195, 620); // Unlock Cellar
    await page.waitForTimeout(150);
    for (let i = 0; i < 8; i++) {
      await page.mouse.click(195, 620);
      await page.waitForTimeout(90);
    }
    await page.mouse.click(195, 220); // Squire Hero Strike
    await page.waitForTimeout(250);
    await page.mouse.click(195, 220); // Open Golden Chest
    await page.waitForTimeout(1500); // Wait for end card
    await page.mouse.click(195, 535); // Tap Install Out of Ruin CTA on end card
    await page.waitForTimeout(200);

    const events = await page.evaluate(() => window.__EVENTS__);
    const mraidUrls = await page.evaluate(() => window.__MRAID_OPEN__);
    const expected = [
      'LOADING',
      'LOADED',
      'DISPLAYED',
      'CHALLENGE_STARTED',
      'CHALLENGE_PASS_25',
      'CHALLENGE_PASS_50',
      'CHALLENGE_PASS_75',
      'CHALLENGE_SOLVED',
      'ENDCARD_SHOWN',
      'CTA_CLICKED',
    ];
    assert(JSON.stringify(events) === JSON.stringify(expected), `event sequence mismatch:\n  got:      ${JSON.stringify(events)}\n  expected: ${JSON.stringify(expected)}`);
    assert(
      mraidUrls.length === 1 && mraidUrls[0] === 'https://play.google.com/store/apps/details?id=games.misaligned.outofruin',
      `mraid.open mismatch: ${JSON.stringify(mraidUrls)}`,
    );
    console.log(`✓ full playthrough & ALPlayableAnalytics sequence passed (${events.join(' -> ')})`);

    // Landscape orientation check
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);
    const dims = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return { w: c.width, h: c.height };
    });
    assert(dims.w > dims.h, `landscape canvas did not resize: ${JSON.stringify(dims)}`);
    console.log(`✓ landscape orientation passed (${dims.w}x${dims.h})`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
