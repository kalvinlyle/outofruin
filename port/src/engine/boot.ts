// Engine bootstrap and frame loop (engine.cpp Init + Step for html5).
import { loadAssets, AssetBundle } from './assets';
import { Renderer } from './gl';
import { FontMap } from './font';
import { f } from './math32';
import { Scene, AtlasRuntime, GLTex, DisplayProfile } from './gui_core';
import { GuiComponent, setupGuiScene, renderGuiWorld, GuiResources, setLayoutChangedSink } from './comp_gui';
import { engine, Component, GOInstance, URL } from './runtime';
import { RenderScript } from './render_script';
import { InputBinding, installInputListeners } from './input';
import { sysState, windowState, idbfs, jsToDefSend, fireWindowEvent } from './apis';
import { scripts, parityHooks } from './index';
import { literal } from '../lua/table';
import type { ScriptCallbacks } from './api';

/** float32(1/60): Defold html5 runs a fixed step (vsync, refresh rate unknown -> 60). */
export const FIXED_DT = f(1 / 60);

export interface Booted {
  bundle: AssetBundle;
  renderer: Renderer;
  res: GuiResources;
  renderScript: RenderScript;
}

async function prepare(canvas: HTMLCanvasElement, base: string): Promise<Booted> {
  const bundle = await loadAssets(base);
  const gp = bundle.render.game_project;
  sysState.config = gp;
  for (const [k, v] of bundle.data) sysState.resources.set(k, v);
  const renderer = new Renderer(canvas, bundle.shaders);
  const textures = new Map<string, GLTex>();
  for (const [path, tj] of bundle.textures) {
    const alt = tj.alternatives[0];
    const clean = (alt.mips as any[]).map((m) => (alt.compression_flags & 1) !== 0 && (alt.compression_type === 1 || alt.compression_type === 2) && m.size_compressed > 0);
    textures.set(path, renderer.createTexture(bundle.images.get(path)!, alt.width, alt.height, alt.original_width, alt.original_height, 'rgba', clean));
  }
  const atlases = new Map<string, AtlasRuntime>();
  for (const [path, a] of bundle.atlases) {
    const tex = textures.get(a.texture)!;
    const animIndex = new Map<string, number>(Object.entries(a.animation_index ?? {}).map(([k, v]) => [k, v as number]));
    atlases.set(path, {
      path, ddf: a, texture: tex, texCoords: Float32Array.from(a.tex_coords), animIndex,
      geometries: (a.geometries ?? []).map((g: any) => ({ vertices: Float32Array.from(g.vertices), uvs: Float32Array.from(g.uvs), indices: g.indices })),
      frameIndices: a.frame_indices ?? [],
    });
  }
  const fonts = new Map<string, FontMap>();
  for (const [path, fj] of bundle.fonts) {
    const fm = new FontMap(fj, bundle.fontImages.get(path) ?? null);
    renderer.createFontTexture(fm);
    fonts.set(path, fm);
  }
  const width = Number(gp.display?.width ?? 960), height = Number(gp.display?.height ?? 640);
  const rs = new RenderScript(renderer, width, height);
  return { bundle, renderer, res: { atlases, textures, fonts }, renderScript: rs };
}

/** builtins/fonts/system_font: only its metrics matter (gui.new_text_node sizes with it). */
function systemFont(): FontMap {
  return new FontMap({ path: '/builtins/fonts/system_font.fontc', material: '/builtins/fonts/system_font.materialc', max_ascent: 13, max_descent: 4,
    cache_width: 1024, cache_height: 64, cache_cell_width: 12, cache_cell_height: 18, cache_cell_max_ascent: 12, glyph_padding: 1, glyph_channels: 1, glyphs: [] }, null);
}

function displayProfiles(bundle: AssetBundle): DisplayProfile[] {
  const dp = bundle.render.display_profiles ?? {};
  const first = Object.values<any>(dp)[0];
  return first ? first.profiles : [];
}

function physicalSize(canvas: HTMLCanvasElement): [number, number] { return [canvas.width, canvas.height]; }

// ---------------------------------------------------------------- game

export async function startGame(canvas: HTMLCanvasElement, base: string, loadScripts: () => Promise<unknown>) {
  await loadIdbfs();
  const b = await prepare(canvas, base);
  // Lua modules run when the collection's scripts load, after the engine read game.projectc
  await loadScripts();
  const { bundle, renderer, res, renderScript } = b;
  const gp = bundle.render.game_project;
  const ctx = engine.guiContext;
  const [pw, ph] = physicalSize(canvas);
  ctx.physicalWidth = pw; ctx.physicalHeight = ph;
  ctx.defaultProjectWidth = Number(gp.display.width); ctx.defaultProjectHeight = Number(gp.display.height);
  ctx.displayProfiles = displayProfiles(bundle);
  ctx.defaultFont = systemFont();
  windowState.width = pw; windowState.height = ph;
  renderScript.windowWidth = pw; renderScript.windowHeight = ph;
  engine.renderScript = renderScript;
  (window as any).JsToDef = { send: jsToDefSend };

  setLayoutChangedSink((scene, id, previous) => {
    const comp: Component | undefined = scene.userData;
    if (!comp) return;
    const cb = comp.cb;
    if (cb.on_message) engine.run(comp, () => cb.on_message!(comp.self, 'layout_changed', { id, previous_id: previous }, new URL('', '', undefined)));
  });

  const glfwPrev = [0, 0];
  const glfwDpi = Number(gp.display?.high_dpi ?? 0) ? (window.devicePixelRatio || 1) : 1;
  const onWindowResize = (w: number, h: number) => {
    renderScript.windowWidth = w; renderScript.windowHeight = h;
    engine.post(new URL('@render', '', undefined), 'window_resized', { width: w, height: h }, new URL('', '', undefined));
    ctx.setPhysicalResolution(w, h);
    windowState.width = w; windowState.height = h;
    fireWindowEvent(2, literal({ width: w, height: h }, 2));
  };

  // dmGraphics::Flip -> glfwSwapBuffers polls the canvas size; a change (and the
  // very first flip, prevWidth starts at 0) resizes the window and runs OnWindowResize.
  const flip = () => {
    if (glfwPrev[0] !== canvas.width || glfwPrev[1] !== canvas.height) {
      const w = Math.floor(canvas.width * glfwDpi), h = Math.floor(canvas.height * glfwDpi);
      glfwPrev[0] = w; glfwPrev[1] = h;
      canvas.width = w; canvas.height = h;
      onWindowResize(w, h);
    }
  };
  // engine Init clears and flips three times before the render script and the collection load
  for (let i = 0; i < 3; i++) flip();

  // render script init runs before the main collection loads
  engine.run(null, () => renderScript.init());

  // load the main collection: instances in order, components in prototype order
  const coll = bundle.collection.collections['/main/main.collectionc'];
  const callbacksFor = (path: string): ScriptCallbacks => {
    let cb = engine.factories.get(path);
    if (!cb) {
      const factory = scripts.get(path);
      if (!factory) { console.error('ERROR:SCRIPT: no translation registered for ' + path); cb = {}; }
      else cb = factory();
      engine.factories.set(path, cb);
    }
    return cb;
  };
  coll.instances.forEach((inst: any, ii: number) => {
    const go: GOInstance = { id: inst.id, index: ii, components: [] };
    engine.instances.push(go);
    engine.byPath.set(inst.id, go);
    const proto = bundle.collection.game_objects[inst.prototype];
    proto.components.forEach((c: any, ci: number) => {
      const resPath: string = c.component;
      if (resPath.endsWith('.scriptc')) {
        const path = resPath.slice(0, -1);
        const comp: Component = { kind: 'script', id: c.id, instance: go, index: ci, path, cb: callbacksFor(path), self: {}, world: engine.scriptWorld, update: false, url: null as any };
        comp.url = engine.urlOf(comp);
        go.components.push(comp);
        engine.scriptComps.push(comp);
      } else if (resPath.endsWith('.guic')) {
        const desc = bundle.scenes.get(resPath);
        if (!desc) throw new Error('missing scene ' + resPath);
        const scene = new Scene(ctx, desc.max_nodes);
        const path = (desc.script as string).slice(0, -1);
        const comp: Component = { kind: 'gui', id: c.id, instance: go, index: ci, path, cb: callbacksFor(path), self: {}, world: engine.guiWorld, update: false, url: null as any };
        comp.url = engine.urlOf(comp);
        const gc = new GuiComponent(scene, desc, go, c.id);
        comp.gui = gc;
        scene.userData = comp;
        setupGuiScene(scene, desc, res);
        go.components.push(comp);
        engine.guiComps.push(comp);
      }
    });
  });

  // dmGameObject::Init: init every component, add to update, dispatch
  for (const go of engine.instances) {
    for (const comp of go.components) {
      if (comp.cb.init) { const cb = comp.cb; engine.run(comp, () => cb.init!(comp.self)); }
    }
  }
  for (const go of engine.instances) for (const comp of go.components) { comp.update = true; if (comp.gui) comp.gui.addedToUpdate = true; }
  engine.dispatchMessages();

  installInputListeners(canvas);
  const binding = new InputBinding(bundle.inputBinding, Number(gp.input?.repeat_delay ?? 0.5), Number(gp.input?.repeat_interval ?? 0.2));
  const guiComponents = () => engine.guiComps.map((c) => c.gui!);

  let parityState: any = null;
  const parity = (window as any).__parity;
  if (parity && typeof parity.provideState === 'function') {
    parity.provideState(() => parityState);
  }

  const step = () => {
    requestAnimationFrame(step);
    try {
      const dt = FIXED_DT;
      binding.update(dt);
      const actions = binding.activeActions(ctx.physicalWidth, ctx.physicalHeight, ctx.defaultProjectWidth, ctx.defaultProjectHeight, ctx.physicalHeight);
      if (actions.length) engine.dispatchInput(actions);
      engine.update(dt);
      renderer.renderListBegin();
      renderGuiWorld(guiComponents(), renderer);
      engine.dispatchRenderSocket();
      renderScript.update(dt);
      // the parity hook runs at the end of the render script's update
      if (parity && typeof parity.cmd === 'function') {
        const cmd: string = parity.cmd() || '';
        if (cmd) {
          if (cmd.includes('save') && parityHooks.save) engine.run(null, () => parityHooks.save!());
          if (cmd.includes('state') && parityHooks.state) parityState = engine.run(null, () => parityHooks.state!());
        }
      }
      engine.postUpdate();
      engine.dispatchSystemSocket();
      flip();
    } catch (e) {
      console.error('[port] frame error', e);
    }
  };
  requestAnimationFrame(step);
  // dmloader removes the progress bar and splash once the engine is running
  (window as any).__portLoader?.done?.();
  parity?.portReady?.();
}

// ---------------------------------------------------------------- IDBFS

const IDB_NAME = '/data', IDB_STORE = 'FILE_DATA';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 21);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          const st = db.createObjectStore(IDB_STORE);
          st.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function loadIdbfs() {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const st = tx.objectStore(IDB_STORE);
      const req = st.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) { resolve(); return; }
        const v: any = cur.value;
        if (v && v.contents) idbfs.files.set(String(cur.key), new Uint8Array(v.contents));
        cur.continue();
      };
      req.onerror = () => resolve();
    } catch { resolve(); }
  });
  idbfs.onChange = () => {
    const dirty = [...idbfs.dirty], removed = [...idbfs.removed];
    idbfs.dirty.clear(); idbfs.removed.clear();
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const st = tx.objectStore(IDB_STORE);
      for (const p of dirty) {
        const data = idbfs.files.get(p);
        if (data) st.put({ timestamp: new Date(), mode: 33206, contents: data }, p);
      }
      for (const p of removed) st.delete(p);
    } catch (e) { console.warn('[port] idbfs write failed', e); }
  };
}

// ---------------------------------------------------------------- scene viewer

/** Render one scene with its default node state, no scripts. */
export async function startViewer(canvas: HTMLCanvasElement, base: string, scenePath: string) {
  const b = await prepare(canvas, base);
  const { bundle, renderer, res, renderScript } = b;
  const gp = bundle.render.game_project;
  const ctx = engine.guiContext;
  const [pw, ph] = physicalSize(canvas);
  ctx.physicalWidth = pw; ctx.physicalHeight = ph;
  ctx.defaultProjectWidth = Number(gp.display.width); ctx.defaultProjectHeight = Number(gp.display.height);
  ctx.displayProfiles = displayProfiles(bundle);
  ctx.defaultFont = systemFont();
  renderScript.windowWidth = pw; renderScript.windowHeight = ph;
  const key = '/' + scenePath.replace(/^\//, '').replace(/\.guic?$/, '') + '.guic';
  const desc = bundle.scenes.get(key);
  if (!desc) throw new Error('no scene ' + key + ' (have ' + [...bundle.scenes.keys()].join(', ') + ')');
  const scene = new Scene(ctx, desc.max_nodes);
  setupGuiScene(scene, desc, res);
  const gc = new GuiComponent(scene, desc, null, 'viewer');
  gc.addedToUpdate = true;
  renderScript.init();
  const frame = () => {
    requestAnimationFrame(frame);
    scene.updateAnimations(FIXED_DT);
    renderer.renderListBegin();
    renderGuiWorld([gc], renderer);
    renderScript.update(FIXED_DT);
  };
  requestAnimationFrame(frame);
  (window as any).__parity?.portReady?.();
  (window as any).__viewer = { scene, bundle };
}
