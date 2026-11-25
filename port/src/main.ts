// Port entry: game/port/index.html loads the bundle built from this file.
//   index.html                            -> boots the game
//   index.html?scene=main/kingdom/kingdom -> renders that GUI scene statically (no scripts)
import { startGame, startViewer } from './engine/boot';
import { engine, parityHooks, Vector3, Vector4, idbfs } from './engine';
import { applyPendingRestore } from './systems/save-checkpoint';
import { initAnalytics, track } from './systems/analytics';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const params = new URLSearchParams(location.search);
const scene = params.get('scene');
// Assets sit next to the bundle (game/port/assets/), wherever the page is.
const base = new URL('assets/', import.meta.url).href;

/** Lua values as the parity hook dumps them: userdata become their tostring, functions vanish. */
function luaView(v: any, seen: Set<any>): any {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'function') return undefined;
  if (typeof v !== 'object') return v;
  if (v instanceof Vector3 || v instanceof Vector4) return v.toString();
  if (typeof v.__tostring === 'function') return v.__tostring();
  if (seen.has(v)) return '<cycle>';
  seen.add(v);
  let out: any;
  const extra = Array.isArray(v) ? Object.keys(v).filter((k) => !/^\d+$/.test(k)) : [];
  if (Array.isArray(v) && extra.length === 0) {
    out = v.map((x) => luaView(x, seen));
  } else if (Array.isArray(v)) {
    // a Lua table with an array part and named fields
    out = {};
    v.forEach((x, i) => { const y = luaView(x, seen); if (y !== undefined) out[String(i + 1)] = y; });
    for (const k of extra) { const y = luaView((v as any)[k], seen); if (y !== undefined) out[k] = y; }
  } else {
    out = {};
    for (const [k, x] of Object.entries(v)) {
      const y = luaView(x, seen);
      if (y !== undefined) out[k] = y;
    }
  }
  seen.delete(v);
  return out;
}

const CONTROLLERS = ['gear', 'henchmen', 'hero', 'loot', 'map', 'navigation', 'rep', 'vault'];

async function loadScripts() {
  await import('./game/scripts');
  // googleanalytics/internal/file keeps io.open files in a Map: back it with the /data IDBFS mirror
  const gaFile: any = await import('./game/googleanalytics/internal/file');
  const files: Map<string, string> | undefined = gaFile.files;
  if (files) {
    const dec = new TextDecoder(), enc = new TextEncoder();
    for (const [p, data] of idbfs.files) files.set(p, dec.decode(data));
    const set = files.set.bind(files), del = files.delete.bind(files);
    files.set = (k: string, v: string) => { idbfs.write(k, enc.encode(v)); return set(k, v); };
    files.delete = (k: string) => { idbfs.remove(k); return del(k); };
  }
  const ds: any = (await import('./game/defsave/defsave')).default;
  engine.onFrameEnd = () => { ds.flush_pending?.(); };
  const ctrls: Record<string, any> = {};
  await Promise.all(CONTROLLERS.map(async (c) => {
    const m: any = await import(`./game/controllers/${c}Controller.ts`);
    ctrls[c] = m.default;
  }));
  parityHooks.save = () => { ds.save_all(true); };
  parityHooks.state = () => {
    const save: any = {};
    for (const [file, entry] of Object.entries<any>(ds.loaded ?? {})) save[file] = entry ? entry.data : undefined;
    const controllers: any = {};
    for (const c of CONTROLLERS) {
      const M = ctrls[c];
      // module-level locals, if the translation exposes them (parity_hook.lua parity_locals)
      const own: any = {};
      if (M) for (const [k, v] of Object.entries<any>(M)) if (typeof v !== 'function') own[k] = v;
      controllers[c] = { ...own, ...(M && typeof M.__parity_locals === 'function' ? M.__parity_locals() : {}) };
    }
    return luaView({ controllers, save }, new Set());
  };
}

// Leaving the beta asks this boot to put the public-code save back, before defsave reads it.
if (!scene) applyPendingRestore(localStorage);

// Analytics before the game boots, so a failure during boot is still a session;
// AppsFlyer after it, since it hands PostHog's device id to AppsFlyer.
if (!scene) {
  initAnalytics();
  void import('./systems/appsflyer').then((m) => m.initAppsFlyer());
  // Android sells gold through Google Play instead of game/store.js's Stripe checkout.
  void import('./systems/play-store').then((m) => m.installPlayStore());
}

(scene ? startViewer(canvas, base, scene) : startGame(canvas, base, loadScripts).then(startLiveUpdates)).catch((e) => {
  console.error('[port] boot failed', e);
});

/** Native app only: OTA updates (systems/live-updates.ts). Every call no-ops in a browser. */
async function startLiveUpdates() {
  const ota = await import('./systems/live-updates');
  if (!ota.isNative()) return;
  ota.onOtaEvent((e) => track(e.name, e.props));
  // After the first frame is on screen, so a bundle that dies before drawing is rolled back.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await ota.notifyBootOk();
  void ota.installUpdateTelemetry();
  await ota.applyBetaChannel();
  await ota.checkpointIfPublic();
  const ds: any = (await import('./game/defsave/defsave')).default;
  ota.checkOnResume({ beforeReload: () => { try { ds.save_all(true); } catch (e) { console.warn('[port] save before update failed', e); } } });
}
