// Behavioral smoke test for a built playable — the check the marketing
// dashboard's regexes can't do. Loads the file over file:// (the harshest
// case: no server, like an ad container's local hosting) in headless Chromium
// and asserts the ad actually RUNS:
//   1. a <canvas> renders (the game booted),
//   2. zero page errors,
//   3. zero http(s) requests outside the allowlist (mraid.js + Google Fonts —
//      the same two exemptions team-dashboard's marketing rules make).
// Local file:// side-requests (e.g. graceful-degrade images with onerror
// handlers) are reported as warnings, not failures: in an ad container they
// become same-host 404s, not external calls.
import { pathToFileURL } from 'node:url';

const DEFAULT_ALLOW = [/mraid\.js$/i, /^https?:\/\/fonts\.googleapis\.com\//i, /^https?:\/\/fonts\.gstatic\.com\//i];

/**
 * @param {string} file  Absolute path to the built playable html.
 * @param {object} [opts]
 * @param {RegExp[]} [opts.allow]      Extra allowed request patterns.
 * @param {number}   [opts.settleMs]   How long to let the game run (default 8000).
 * @param {string}   [opts.executablePath] Chromium override (or env PLAYABLE_SMOKE_EXECUTABLE).
 * @returns {Promise<{ok: boolean, failures: string[], warnings: string[]}>}
 */
export async function smokePlayable(file, opts = {}) {
  const { chromium } = await import('playwright');
  const allow = [...DEFAULT_ALLOW, ...(opts.allow ?? [])];
  const settleMs = opts.settleMs ?? 8000;
  const executablePath = opts.executablePath ?? process.env.PLAYABLE_SMOKE_EXECUTABLE ?? undefined;

  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const external = [];
  const localSide = [];
  const errors = [];
  const selfUrl = pathToFileURL(file).href;

  page.on('request', (req) => {
    const url = req.url();
    if (url === selfUrl) return;
    if (allow.some((re) => re.test(url))) return;
    if (url.startsWith('file://')) localSide.push(url);
    else if (/^https?:/i.test(url)) external.push(url);
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(selfUrl, { waitUntil: 'load' });
  await page.waitForTimeout(settleMs);
  const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
  await browser.close();

  const failures = [];
  if (!hasCanvas) failures.push('no <canvas> rendered — the game did not boot');
  for (const e of errors) failures.push(`page error: ${e}`);
  for (const u of external) failures.push(`external request: ${u}`);
  const warnings = localSide.map((u) => `local side-request (404s harmlessly in an ad container): ${u}`);

  return { ok: failures.length === 0, failures, warnings };
}
