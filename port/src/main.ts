// Port entry: game/port/index.html loads the bundle built from this file.
//   index.html                            -> boots the game
//   index.html?scene=main/kingdom/kingdom -> renders that GUI scene statically (no scripts)
import { startGame, startViewer } from './engine/boot';
import { parityHooks, Vector3, Vector4, idbfs } from './engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const params = new URLSearchParams(location.search);
const scene = params.get('scene');
const base = 'assets/';

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

(scene ? startViewer(canvas, base, scene) : startGame(canvas, base, loadScripts)).catch((e) => {
  console.error('[port] boot failed', e);
});
