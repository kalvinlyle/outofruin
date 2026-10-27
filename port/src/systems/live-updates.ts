// Over-the-air web-bundle updates for the native app (@capgo/capacitor-updater).
//
// The app packages game/dist, so without this every fix waits on a store
// review. The plugin asks game/api/updates.js on launch and on every return to
// the app, downloads only the files that changed, and the app swaps to the new
// bundle; the packaged copy stays as the fallback. See docs/ota-updates.md.
//
// Everything here is a no-op in a browser: the web build is always the latest.
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater, type BundleInfo } from '@capgo/capacitor-updater';
import { isNewer, bundleRunsOn } from '../../../game/api/_version.js';
import {
  BETA_KEY, writeCheckpoint, requestRestore, saveDivergedFromCheckpoint,
} from './save-checkpoint';

/** Serves the bundles and their index. Same host as native/capacitor.config.json's updateUrl. */
export const OTA_ORIGIN = 'https://app.outofruin.com';

export const isNative = () => Capacitor.isNativePlatform();

// Imported, never returned from an async function: a Capacitor plugin is a Proxy
// that throws on .then(), so `await` on it rejects ("CapacitorUpdater.then() is
// not implemented") and every call behind it, notifyAppReady included, never runs.
const updater = () => CapacitorUpdater;

// ---------------------------------------------------------------- events

/** Update funnel events, for analytics to subscribe to once it is wired. */
export type OtaEvent = { name: string; props: Record<string, unknown> };
const sinks: ((e: OtaEvent) => void)[] = [];
export function onOtaEvent(fn: (e: OtaEvent) => void) { sinks.push(fn); }
function track(name: string, props: Record<string, unknown> = {}) {
  for (const s of sinks) {
    try { s({ name, props }); } catch { /* a sink must never break the updater */ }
  }
}

// ---------------------------------------------------------------- what is running

/** What this device runs, learned at boot; settings shows it. */
export const otaStatus: { version: string | null; channel: 'public' | 'beta' | null } = { version: null, channel: null };

/**
 * Mark the running bundle good. Unless this lands within appReadyTimeout
 * (10 s), the plugin assumes the bundle is broken and reverts to the previous
 * one, so a bundle that dies on launch rolls itself back. It must run on every
 * successful boot, the packaged bundle's included, and only once the game has
 * drawn: calling it earlier marks a bundle good before it has proved anything.
 */
export async function notifyBootOk() {
  if (!isNative()) return;
  try {
    const u = updater();
    await u.notifyAppReady();
    const cur = await u.current().catch(() => null);
    otaStatus.version = String(cur?.bundle?.version || cur?.native || '') || null;
    track('ota_boot_ok', { ota_bundle: cur?.bundle?.version ?? null, ota_native: cur?.native ?? null });
  } catch (err) {
    console.warn('[live-updates] notifyAppReady failed', err);
    track('ota_boot_notify_failed', { error_message: String(err).slice(0, 300) });
  }
}

/** Report what the updater does, so a bad bundle shows up as a funnel drop instead of a mystery. */
export async function installUpdateTelemetry() {
  if (!isNative()) return;
  try {
    const u: any = updater();
    const on = (ev: string, name: string, props?: (s: any) => Record<string, unknown>) => {
      u.addListener(ev, (s: any) => track(name, props ? props(s ?? {}) : {})).catch(() => {});
    };
    const version = (s: any) => ({ ota_bundle: s?.bundle?.version ?? null });
    on('updateAvailable', 'ota_update_available', version);
    on('downloadComplete', 'ota_download_complete', version);
    on('set', 'ota_bundle_applied', version);
    on('noNeedUpdate', 'ota_no_update', version);
    on('downloadFailed', 'ota_download_failed', (s) => ({ ota_bundle: s?.version ?? null }));
    on('updateFailed', 'ota_update_failed', version);
  } catch (err) {
    console.warn('[live-updates] update telemetry not installed', err);
  }
}

// ---------------------------------------------------------------- the published index

type Index = { public?: string | null; beta?: string | null; bundles?: { version: string; min_native?: string }[] };

/**
 * The published index, or null. Absolute on native: the app is served from
 * https://localhost/, where a relative URL would ask the running bundle for a
 * copy it does not contain.
 */
async function fetchIndex(): Promise<Index | null> {
  try {
    const res = await fetch(`${OTA_ORIGIN}/ota/index.json`, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Which channel a bundle is on. Beta means AHEAD of the public release: an older
 * public bundle is not a beta. The packaged bundle came from the store, so it is
 * public. Null means unknown and is never shown or acted on as either.
 */
export function channelOf(bundle: { id?: string; version?: string } | null | undefined, index: Index | null | undefined): 'public' | 'beta' | null {
  if (!bundle) return null;
  if (bundle.id === 'builtin') return 'public';
  if (!index) return null;
  if (!index.public) return 'beta';
  return isNewer(String(bundle.version ?? ''), String(index.public)) ? 'beta' : 'public';
}

/**
 * Is there a newer bundle this shell is too old to run? The endpoint refuses
 * it, which from the device looks exactly like having nothing new, so without
 * this the player would stop receiving updates and never learn why.
 */
export function storeUpdateNeeded(index: Index | null, beta: boolean, running: string, native: string): string | null {
  if (!index) return null;
  const wanted = beta ? index.beta || index.public : index.public;
  if (!wanted) return null;
  const bundle = (index.bundles || []).find((b) => b?.version === wanted);
  if (!bundle || !isNewer(bundle.version, running) || bundleRunsOn(bundle, native)) return null;
  return bundle.version;
}

// ---------------------------------------------------------------- beta channel

export function betaEnabled(): boolean {
  try { return localStorage.getItem(BETA_KEY) === '1'; } catch { return false; }
}

/**
 * Tell the plugin which channel to ask for. Every launch, not just on the
 * toggle: installing a new app version clears the plugin's copy of the id
 * while the player's choice in localStorage survives.
 */
export async function applyBetaChannel() {
  if (!isNative()) return;
  try {
    await updater().setCustomId({ customId: betaEnabled() ? 'beta' : '' });
  } catch (err) {
    console.warn('[live-updates] could not set the update channel', err);
  }
}

/**
 * The Beta updates switch. Turning it on fetches the beta now rather than
 * three launches later. Turning it off while running an unreleased bundle is a
 * downgrade: the save goes back to the last checkpoint taken on public code,
 * after the player confirms, and the app drops to the packaged bundle.
 */
export async function setBetaEnabled(on: boolean) {
  if (on === betaEnabled()) return;
  if (!on && (await betaRevertWouldLoseProgress())) {
    const ok = window.confirm(
      'Leaving the beta puts your save back to where it was when you joined. ' +
        'Progress made on beta versions will not carry over.\n\nLeave the beta?',
    );
    if (!ok) return;
  }
  try { localStorage.setItem(BETA_KEY, on ? '1' : '0'); } catch { /* the custom id below still applies */ }
  await applyBetaChannel();
  if (on) await fetchAndApplyNow();
  else await leaveBeta();
}

async function leaveBeta() {
  if (!isNative()) return;
  try {
    const u = updater();
    const cur = await u.current().catch(() => null);
    const channel = channelOf(cur?.bundle, await fetchIndex());
    // On public code (or unknown, after a network blip) there is nothing to undo.
    if (channel !== 'beta') {
      track('ota_beta_opt_out', { ota_bundle: cur?.bundle?.version ?? null, save_restored: false, channel_known: channel !== null });
      return;
    }
    const restore = requestRestore(localStorage);
    track('ota_beta_opt_out', { ota_bundle: cur?.bundle?.version ?? null, save_restored: restore });
    hooks.beforeReload?.();
    await u.reset();
  } catch (err) {
    console.warn('[live-updates] could not leave the beta', err);
  }
}

async function betaRevertWouldLoseProgress(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const cur = await updater().current().catch(() => null);
    if (channelOf(cur?.bundle, await fetchIndex()) !== 'beta') return false;
    return saveDivergedFromCheckpoint(localStorage);
  } catch {
    return false;
  }
}

/**
 * Checkpoint the save, but only while a public bundle runs: a copy taken
 * mid-beta is in whatever shape the beta writes, which public code cannot read.
 */
export async function checkpointIfPublic() {
  if (!isNative()) return;
  try {
    const cur = await updater().current().catch(() => null);
    const bundle = cur?.bundle;
    if (!bundle) return;
    const index = bundle.id === 'builtin' ? null : await fetchIndex();
    const channel = channelOf(bundle, index);
    otaStatus.channel = channel;
    if (channel === 'public') writeCheckpoint(localStorage, bundle.id === 'builtin' ? `native:${cur?.native ?? ''}` : bundle.version, Date.now());
  } catch {
    /* a safety net must never be louder than the game */
  }
}

// ---------------------------------------------------------------- applying updates

const hooks: { beforeReload?: () => void } = {};

let overlay: HTMLDivElement | null = null;
function say(text: string | null) {
  if (text === null) { overlay?.remove(); overlay = null; return; }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;'
      + 'background:#1e2226;color:#e8e2d0;font:600 18px/1.4 Georgia,serif;text-align:center;padding:24px;';
    document.body.appendChild(overlay);
  }
  overlay.textContent = text;
}

/**
 * Check, download and switch to the newest bundle now. The plugin's own
 * automatic path only downloads (directUpdate is false) and swaps on the next
 * trip to the background, which from the player's side reads as nothing
 * happening. notifyAppReady still guards the result.
 *
 * The screen only changes once there is something to download: an idle game
 * is reopened constantly, and covering it on every return to check for nothing
 * would make every reopen slower.
 */
export async function fetchAndApplyNow(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const u = updater();
    const latest: any = await u.getLatest();
    if (!latest?.version || (!latest.url && !latest.manifest?.length)) return false;
    const cur = await u.current().catch(() => null);
    if (cur?.bundle?.version === latest.version) return false;
    say('Updating Out of Ruin…');
    track('ota_manual_check', { ota_bundle: latest.version });
    const bundle: BundleInfo = await u.download({
      url: latest.url,
      version: latest.version,
      checksum: latest.checksum,
      ...(latest.manifest?.length ? { manifest: latest.manifest } : {}),
    });
    if (!bundle?.id) { say(null); return false; }
    await u.set({ id: bundle.id });
    // set() swaps the WebView; flush the save first, or the last moments of play are lost.
    hooks.beforeReload?.();
    await u.reload();
    return true;
  } catch (err) {
    console.warn('[live-updates] immediate update failed; the next launch will retry', err);
    say(null);
    return false;
  }
}

let checking = false;

/**
 * Check for an update at boot and every time the app returns to the
 * foreground, and apply it there and then. Call only after notifyBootOk: the
 * check can end in a reload, and swapping the bundle before notifyAppReady
 * lands would let the rollback timer condemn a healthy bundle.
 */
export function checkOnResume(opts: { beforeReload: () => void }) {
  if (!isNative()) return;
  hooks.beforeReload = opts.beforeReload;
  const run = async () => {
    if (checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      if (await fetchAndApplyNow()) return;
      const u = updater();
      const cur = await u.current().catch(() => null);
      const native = cur?.native;
      if (!native) return;
      const blocked = storeUpdateNeeded(await fetchIndex(), betaEnabled(), cur?.bundle?.version || native, native);
      if (blocked) {
        track('ota_store_update_required', { ota_bundle: blocked, native });
        say('A new version of Out of Ruin is waiting. Update the app from the store to get it.');
        setTimeout(() => say(null), 3500);
      }
    } catch {
      say(null);
    } finally {
      checking = false;
    }
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void run(); });
  // A cold start never fires visibilitychange.
  void run();
}
