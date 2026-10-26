// Game-object world: collection instances, script/gui components, message
// passing (dlib/message.cpp + gameobject.cpp DispatchMessages), input focus and
// dispatch, script timers (script_timer.cpp) and the engine frame (engine.cpp Step).
import type { ScriptCallbacks, Url, Action } from './api';
import { Vector3, Vector4 } from './api';
import { f } from './math32';
import { Scene, GuiContext } from './gui_core';
import { GuiComponent } from './comp_gui';
import { pairsKeys, gcStep } from '../lua/table';

// ---------------- URLs ----------------

export class URL implements Url {
  socket: string; path: string; fragment: string | undefined;
  /** function callback carried by http responses (m_FunctionRef) */
  fn?: ((...a: any[]) => void) | undefined;
  constructor(socket: string, path: string, fragment: string | undefined) {
    this.socket = socket; this.path = path; this.fragment = fragment;
  }
  toString() {
    return 'url: [' + (this.socket || '') + ':' + (this.path || '') + (this.fragment ? '#' + this.fragment : '') + ']';
  }
}

// ---------------- components ----------------

export interface GOInstance {
  id: string;            // "/menu"
  index: number;
  components: Component[];
}

export interface Component {
  kind: 'script' | 'gui';
  id: string;
  instance: GOInstance;
  index: number;
  path: string;          // script resource path, e.g. "/main/kingdom/kingdom.gui_script"
  cb: ScriptCallbacks;
  self: any;
  gui?: GuiComponent;
  world: World;
  update: boolean;       // m_Update / m_AddedToUpdate
  url: URL;
}

export interface Message {
  sender: URL;
  receiver: URL;
  id: string;
  data: any;
  ddf: boolean;
  fn?: ((...a: any[]) => void);
}

// ---------------- timers ----------------

interface Timer { handle: number; owner: Component; delay: number; remaining: number; repeat: boolean; alive: boolean; cb: (self: any, handle: number, elapsed: number) => void }

export class TimerWorld {
  timers: Timer[] = [];
  lookup: number[] = new Array(8).fill(0);
  pool: number[] = [0, 1, 2, 3, 4, 5, 6, 7];
  poolSize = 0;
  version = 0;
  inUpdate = false;

  add(owner: Component, delay: number, repeat: boolean, cb: Timer['cb']): number {
    if (this.poolSize === this.pool.length) {
      const old = this.pool.length;
      const cap = Math.min(old + 16, 65000);
      for (let i = old; i < cap; i++) { this.pool[i] = i; this.lookup[i] = 0; }
    }
    const li = this.pool[this.poolSize++];
    const handle = ((this.version << 16) | li) >>> 0;
    this.lookup[li] = this.timers.length;
    this.timers.push({ handle, owner, delay: f(delay), remaining: f(delay), repeat, alive: true, cb });
    return handle;
  }

  private free(t: Timer) {
    const li = t.handle & 0xffff;
    const ti = this.lookup[li];
    this.pool[--this.poolSize] = li;
    const last = this.timers.length - 1;
    const moved = this.timers[last];
    this.timers[ti] = moved;
    this.timers.length = last;
    if (ti < this.timers.length) this.lookup[moved.handle & 0xffff] = ti;
  }

  cancel(handle: number): boolean {
    const li = handle & 0xffff;
    if (li >= this.lookup.length) return false;
    const ti = this.lookup[li];
    if (ti >= this.timers.length) return false;
    const t = this.timers[ti];
    if (t.handle !== handle || !t.alive) return false;
    t.alive = false;
    if (!this.inUpdate) { this.free(t); ++this.version; }
    return true;
  }

  update(dt: number, invoke: (owner: Component, fn: () => void) => void) {
    this.inUpdate = true;
    const size = this.timers.length;
    for (let i = 0; i < size; ++i) {
      let t = this.timers[i];
      if (!t.alive) continue;
      t.remaining = f(t.remaining - dt);
      if (t.remaining > 0) continue;
      const elapsed = f(t.delay - t.remaining);
      const tt = t;
      invoke(tt.owner, () => tt.cb(tt.owner.self, tt.handle, elapsed));
      t = this.timers[i];
      if (!t.alive) continue;
      if (!t.repeat) { t.alive = false; continue; }
      if (t.delay === 0) { t.remaining = 0; continue; }
      const wrapped = f(f(f(-t.remaining) / t.delay) + 1);
      const offset = f(Math.floor(wrapped) * t.delay);
      t.remaining = f(t.remaining + offset);
    }
    this.inUpdate = false;
    let n = this.timers.length;
    const original = n;
    let i = 0;
    while (i < n) {
      if (!this.timers[i].alive) { this.free(this.timers[i]); --n; } else ++i;
    }
    if (n !== original) ++this.version;
  }
}

export class World {
  timers = new TimerWorld();
}

// ---------------- message data copy ----------------

/** dmScript::CheckTable + PushTable: a snapshot of the table, keys in lua_next order. */
export function copyMessageData(v: any, depth = 0): any {
  if (v === null || v === undefined) return v;
  if (typeof v !== 'object') return v;
  if (v instanceof Vector3) return new Vector3(v.x, v.y, v.z);
  if (v instanceof Vector4) return new Vector4(v.x, v.y, v.z, v.w);
  if (v instanceof URL) return new URL(v.socket, v.path, v.fragment);
  if (depth > 32) throw new Error('table too deep');
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out[i] = copyMessageData(v[i], depth + 1);
    for (const k of Object.keys(v)) if (!/^\d+$/.test(k)) (out as any)[k] = copyMessageData((v as any)[k], depth + 1);
    return out;
  }
  if (typeof v === 'object' && (v as any).__node) return v;
  const out: any = {};
  for (const k of pairsKeys(v)) {
    const val = v[k as any];
    if (val === undefined || val === null || typeof val === 'function') continue;
    out[k as any] = copyMessageData(val, depth + 1);
  }
  return out;
}

// DDF message types the game's ids collide with (dmDDF::GetDescriptorFromHash).
const DDF_IDS = new Set(['acquire_input_focus', 'release_input_focus', 'enable', 'disable', 'set_parent', 'request_transform',
  'window_resized', 'draw_text', 'draw_line', 'clear_color', 'set_view_projection', 'layout_changed', 'toggle_profile', 'exit', 'reboot',
  'set_update_frequency', 'toggle_physics_debug', 'start_record', 'stop_record', 'set_time_step', 'resize', 'draw_debug_text']);

function toDDF(id: string, data: any): any {
  const d = data ?? {};
  switch (id) {
    case 'window_resized': return { width: (Math.trunc(Number(d.width) || 0)) >>> 0, height: (Math.trunc(Number(d.height) || 0)) >>> 0 };
    case 'draw_text': return { position: d.position ? new Vector3(d.position.x, d.position.y, d.position.z) : new Vector3(), text: d.text ?? '' };
    case 'clear_color': return { color: d.color ? new Vector4(d.color.x, d.color.y, d.color.z, d.color.w) : new Vector4() };
    case 'layout_changed': return { id: d.id, previous_id: d.previous_id };
    default: return copyMessageData(d);
  }
}

// ---------------- engine ----------------

export interface ContextFrame { comp: Component | null; scene: Scene | null; render?: boolean }

export class Engine {
  instances: GOInstance[] = [];
  byPath = new Map<string, GOInstance>();
  scriptComps: Component[] = [];   // script world, creation order
  guiComps: Component[] = [];      // gui world, creation order
  scriptWorld = new World();
  guiWorld = new World();
  renderWorld = new World();
  focusStack: GOInstance[] = [];
  sockets = new Map<string, Message[]>([['main', []], ['@render', []], ['@system', []]]);
  stack: ContextFrame[] = [];
  guiContext = new GuiContext();
  factories = new Map<string, ScriptCallbacks>();
  errorHandler: ((source: string, message: string, traceback: string) => void) | null = null;
  renderScript: { on_message(id: string, msg: any, sender: URL): void } | null = null;
  onSystemMessage: ((m: Message) => void) | null = null;

  current(): ContextFrame | undefined { return this.stack[this.stack.length - 1]; }
  currentComp(): Component | null { return this.current()?.comp ?? null; }
  currentScene(): Scene {
    const s = this.current()?.scene;
    if (!s) throw new Error('gui functions can only be called from a gui script');
    return s;
  }

  /** Run fn as `comp`'s script, logging (not propagating) errors like dmScript::PCall. */
  run(comp: Component | null, fn: () => any, scene: Scene | null = comp?.gui?.scene ?? null): any {
    this.stack.push({ comp, scene });
    try {
      return fn();
    } catch (e: any) {
      this.reportError(e);
      return undefined;
    } finally {
      this.stack.pop();
      // A script callback has returned: the Lua GC may have run before the next.
      if (this.stack.length === 0) gcStep();
    }
  }

  reportError(e: any) {
    const msg = e && e.message ? e.message : String(e);
    const tb = e && e.stack ? String(e.stack) : '';
    console.error('ERROR:SCRIPT: ' + msg + '\n' + tb);
    if (this.errorHandler) {
      const h = this.errorHandler;
      try { h('lua', msg, tb); } catch (e2) { console.error('ERROR:SCRIPT: ' + String(e2)); }
    }
  }

  // ----- URLs -----
  urlOf(comp: Component): URL { return new URL('main', comp.instance.id, comp.id); }

  /** dmScript::ResolveURL for a string receiver, relative to the running script. */
  resolve(target: string | URL, fragmentDefault = true): URL {
    if (target instanceof URL) return new URL(target.socket, target.path, target.fragment);
    if (target && typeof target === 'object') {
      const t = target as any;
      return new URL(t.socket, t.path, t.fragment);
    }
    const comp = this.currentComp();
    const s = String(target);
    let socket: string | null = null, path: string | null = null, fragment: string | null = null;
    let rest = s;
    const colon = rest.indexOf(':');
    if (colon >= 0) { socket = rest.slice(0, colon); rest = rest.slice(colon + 1); }
    const hashI = rest.indexOf('#');
    if (hashI >= 0) { fragment = rest.slice(hashI + 1); rest = rest.slice(0, hashI); }
    path = rest;
    if (socket !== null && socket !== '') {
      if (socket.startsWith('@')) return new URL(socket, path ? this.absPath(path) : '', fragment || undefined);
      return new URL(socket, path ? this.absPath(path) : '', fragment || undefined);
    }
    // relative to the current instance
    const defSocket = 'main';
    let p: string;
    if (path === '' || path === '.') p = comp ? comp.instance.id : '';
    else p = this.absPath(path);
    let frag: string | undefined;
    if (fragment === null) frag = undefined;
    else if (fragment === '') frag = undefined;
    else frag = fragment;
    void fragmentDefault;
    return new URL(defSocket, p, frag);
  }

  private absPath(p: string): string { return p.startsWith('/') ? p : '/' + p; }

  // ----- messaging -----
  post(receiver: URL, id: string, data: any, sender?: URL) {
    const comp = this.currentComp();
    const s = sender ?? (comp ? this.urlOf(comp) : new URL('', '', undefined));
    const q = this.sockets.get(receiver.socket);
    if (!q) throw new Error(`Could not send message '${id}' from '${s}' to '${receiver}'.`);
    const ddf = DDF_IDS.has(id);
    const payload = ddf ? toDDF(id, data) : (data === undefined || data === null ? {} : copyMessageData(data));
    q.push({ sender: s, receiver, id, data: payload, ddf, fn: receiver.fn });
  }

  /** gameobject.cpp DispatchMessages over the main collection's component socket. */
  dispatchMessages(): void {
    const q = this.sockets.get('main')!;
    let iterate = true;
    let count = 0;
    while (iterate && count < 10) {
      iterate = false;
      if (q.length > 0) {
        const batch = q.splice(0, q.length);
        for (const m of batch) this.dispatchOne(m);
        iterate = true;
      }
      ++count;
    }
  }

  private dispatchOne(m: Message) {
    const inst = this.byPath.get(m.receiver.path);
    if (!inst) {
      console.error(`ERROR:GAMEOBJECT: Instance '${m.receiver.path}' could not be found when dispatching message '${m.id}' sent from ${m.sender.socket}:${m.sender.path}#${m.sender.fragment ?? ''}`);
      return;
    }
    if (m.id === 'acquire_input_focus') { this.acquireInputFocus(inst); return; }
    if (m.id === 'release_input_focus') { this.releaseInputFocus(inst); return; }
    if (m.id === 'set_parent' || m.id === 'request_transform') return;
    if (m.receiver.fragment) {
      const comp = inst.components.find((c) => c.id === m.receiver.fragment);
      if (!comp) {
        console.error(`ERROR:GAMEOBJECT: Component '${m.receiver.path}#${m.receiver.fragment}' could not be found when dispatching message '${m.id}' sent from ${m.sender.socket}:${m.sender.path}#${m.sender.fragment ?? ''}`);
        return;
      }
      this.componentOnMessage(comp, m);
    } else {
      for (const comp of inst.components) this.componentOnMessage(comp, m);
    }
  }

  private componentOnMessage(comp: Component, m: Message) {
    if (comp.kind === 'gui') {
      if (m.id === 'enable') comp.gui!.enabled = true;
      else if (m.id === 'disable') comp.gui!.enabled = false;
    }
    const data = m.data;
    const fn = m.fn;
    if (fn) {
      this.run(comp, () => fn(comp.self, m.id, data, m.sender));
    } else if (comp.cb.on_message) {
      const cb = comp.cb;
      this.run(comp, () => cb.on_message!(comp.self, m.id, data, m.sender));
    }
  }

  acquireInputFocus(inst: GOInstance) {
    const i = this.focusStack.indexOf(inst);
    if (i >= 0) this.focusStack.splice(i, 1);
    this.focusStack.push(inst);
  }
  releaseInputFocus(inst: GOInstance) {
    const i = this.focusStack.indexOf(inst);
    if (i >= 0) this.focusStack.splice(i, 1);
  }

  /** gameobject.cpp DispatchInput: focus stack top to bottom; a consumed action stops at that instance. */
  dispatchInput(actions: { id: string | undefined; make: () => Action }[]) {
    for (const a of actions) {
      const stack = this.focusStack.slice();
      for (let k = stack.length - 1; k >= 0; k--) {
        const inst = stack[k];
        let consumed = false;
        for (const comp of inst.components) {
          if (!comp.cb.on_input) continue;
          if (comp.kind === 'gui' && !comp.gui!.enabled) continue;
          const cb = comp.cb;
          const r = this.run(comp, () => cb.on_input!(comp.self, a.id, a.make()));
          if (r === true) consumed = true;
        }
        if (consumed) break;
      }
    }
  }

  /** dmGameObject::Update: per component type, update then dispatch. */
  update(dt: number) {
    // collectionproxyc (prio 100) has no instances, but its pass still dispatches
    this.dispatchMessages();
    // scriptc (200)
    this.scriptWorld.timers.update(dt, (owner, fn) => this.run(owner, fn));
    for (const c of this.scriptComps) {
      if (c.update && c.cb.update) { const cb = c.cb; this.run(c, () => cb.update!(c.self, dt)); }
    }
    this.dispatchMessages();
    // guic (300)
    this.guiWorld.timers.update(dt, (owner, fn) => this.run(owner, fn));
    for (const c of this.guiComps) {
      const g = c.gui!;
      if (g.enabled && g.addedToUpdate) {
        const scene = g.scene;
        if (c.cb.update) { const cb = c.cb; this.run(c, () => cb.update!(c.self, dt)); }
        scene.updateAnimations(dt);
        scene.flushDeleted();
      }
    }
    this.dispatchMessages();
  }

  /** dmGameObject::PostUpdate: DispatchAllSockets */
  postUpdate() { this.dispatchMessages(); }

  dispatchRenderSocket() {
    const q = this.sockets.get('@render')!;
    const batch = q.splice(0, q.length);
    for (const m of batch) {
      if (m.id === 'draw_text' || m.id === 'draw_line' || m.id === 'draw_debug_text' || m.id === 'resize') continue;
      if (this.renderScript) {
        const rs = this.renderScript;
        this.run(null, () => rs.on_message(m.id, m.data, m.sender));
      }
    }
  }

  dispatchSystemSocket() {
    const q = this.sockets.get('@system')!;
    const batch = q.splice(0, q.length);
    for (const m of batch) this.onSystemMessage?.(m);
  }
}

export const engine = new Engine();
