// Lua 5.1 table layout (ltable.c), reproduced so `pairs` visits keys in the
// same order as the original game. Only key placement is modelled; values
// live in the caller's object.

export type LuaKey = string | number | boolean;

const MAXBITS = 26;
const utf8 = new TextEncoder();
const strHashCache = new Map<string, number>();

// lstring.c luaS_newlstr
export function luaStrHash(s: string): number {
  let h = strHashCache.get(s);
  if (h !== undefined) return h;
  const b = utf8.encode(s);
  const l = b.length;
  h = l >>> 0;
  const step = (l >> 5) + 1;
  for (let l1 = l; l1 >= step; l1 -= step) {
    h = (h ^ (((h << 5) >>> 0) + (h >>> 2) + b[l1 - 1])) >>> 0;
  }
  strHashCache.set(s, h);
  return h;
}

const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);

function ceillog2(x: number): number {
  let n = 0;
  x--;
  while (x > 0) { n++; x >>>= 1; }
  return n;
}

function arrayIndex(k: LuaKey): number {
  if (typeof k === 'number' && Number.isInteger(k) && k > 0 && k <= (1 << MAXBITS)) return k;
  return -1;
}

// `dead`: a string key whose value went nil and that a GC cycle has since
// marked LUA_TDEADKEY. Lookups no longer match it, but it holds its slot until
// the next rehash. `cleared`: the GC epoch in which a string key's value went
// nil. Until a GC cycle has run (the epoch moves on), the key still matches and
// a write reuses its node, as luaH_set does for a key holding nil.
interface Node { key: LuaKey | undefined; live: boolean; dead: boolean; next: number; cleared?: number }

/*
 * When a GC cycle may have run. lgc.c traversetable marks a nil-valued string
 * key dead (removeentry) once per cycle, and a cycle needs far more allocation
 * than one script callback makes between two writes of the same key, while the
 * game's saves (a full JSON encode) and message tables between callbacks make
 * plenty. So a key cleared in a callback stays matchable for the rest of that
 * callback and is collected by the next one. The engine calls gcStep() when a
 * top-level script callback returns.
 */
let gcEpoch = 0;
export function gcStep(): void { gcEpoch++; }

export class LuaTableLayout {
  sizearray = 0;
  array: boolean[] = [];
  lsizenode = 0;
  node: Node[] = [];
  dummy = true;
  lastfree = 0;

  constructor(narray = 0, nhash = 0) {
    this.setArray(narray);
    this.setNodes(nhash);
  }

  private setArray(size: number) {
    for (let i = this.sizearray; i < size; i++) this.array[i] = false;
    this.array.length = size;
    this.sizearray = size;
  }

  private setNodes(size: number) {
    if (size === 0) {
      this.node = [{ key: undefined, live: false, dead: false, next: -1 }];
      this.dummy = true;
      this.lsizenode = 0;
      this.lastfree = 1;
      return;
    }
    const lsize = ceillog2(size);
    const n = 1 << lsize;
    this.node = [];
    for (let i = 0; i < n; i++) this.node.push({ key: undefined, live: false, dead: false, next: -1 });
    this.dummy = false;
    this.lsizenode = lsize;
    this.lastfree = n;
  }

  private sizenode() { return 1 << this.lsizenode; }

  private mainposition(k: LuaKey): number {
    const size = this.sizenode();
    if (typeof k === 'string') return luaStrHash(k) & (size - 1);
    if (typeof k === 'boolean') return (k ? 1 : 0) & (size - 1);
    if (k === 0) return 0;
    f64[0] = k;
    const a = (u32[0] + u32[1]) >>> 0;
    return a % ((size - 1) | 1);
  }

  private find(k: LuaKey): number {
    let i = this.mainposition(k);
    while (i !== -1) {
      const n = this.node[i];
      if (n.cleared !== undefined && !n.live && n.cleared < gcEpoch) { n.dead = true; n.cleared = undefined; }
      if (n.key === k && !n.dead) return i;
      i = n.next;
    }
    return -1;
  }

  has(k: LuaKey): boolean {
    const ai = arrayIndex(k);
    if (ai > 0 && ai <= this.sizearray) return this.array[ai - 1];
    const i = this.find(k);
    return i !== -1 && this.node[i].live;
  }

  /** t[k] = non-nil value */
  set(k: LuaKey): void {
    const ai = arrayIndex(k);
    if (ai > 0 && ai <= this.sizearray) { this.array[ai - 1] = true; return; }
    const i = this.find(k);
    if (i !== -1) { this.node[i].live = true; this.node[i].cleared = undefined; return; }
    this.newkey(k);
  }

  /**
   * t[k] = nil. The node keeps its key, as in Lua. A string key is collectable:
   * the next GC cycle (gcStep) marks it dead (lgc.c removeentry), and a write
   * after that takes a new node; until then a write reuses this one. `past`
   * replays a nil store from long ago, already collected. Number keys are not
   * collectable and stay matchable.
   */
  remove(k: LuaKey, past = false): void {
    const ai = arrayIndex(k);
    if (ai > 0 && ai <= this.sizearray) { this.array[ai - 1] = false; return; }
    const i = this.find(k);
    if (i !== -1) {
      const n = this.node[i];
      n.live = false;
      if (typeof k === 'string') {
        if (past) { n.dead = true; n.cleared = undefined; } else if (n.cleared === undefined) n.cleared = gcEpoch;
      }
      return;
    }
    // luaV_settable goes through luaH_set, which creates the key even for a nil store.
    this.newkey(k);
    this.remove(k, past);
  }

  private getfreepos(): number {
    while (this.lastfree-- > 0) {
      if (this.node[this.lastfree].key === undefined) return this.lastfree;
    }
    return -1;
  }

  private newkey(k: LuaKey): void {
    let mp = this.mainposition(k);
    if (this.node[mp].live || this.dummy) {
      const n = this.dummy ? -1 : this.getfreepos();
      if (n === -1) {
        this.rehash(k);
        this.set(k);
        return;
      }
      let othern = this.mainposition(this.node[mp].key as LuaKey);
      if (othern !== mp) {
        while (this.node[othern].next !== mp) othern = this.node[othern].next;
        this.node[othern].next = n;
        this.node[n] = { ...this.node[mp] };
        this.node[mp].next = -1;
        this.node[mp].live = false;
      } else {
        this.node[n].next = this.node[mp].next;
        this.node[mp].next = n;
        mp = n;
      }
    }
    this.node[mp].key = k;
    this.node[mp].live = true;
    this.node[mp].dead = false;
    this.node[mp].cleared = undefined;
  }

  private rehash(ek: LuaKey) {
    const nums = new Array(MAXBITS + 1).fill(0);
    let nasize = 0;
    // numusearray
    let i = 1;
    for (let lg = 0, ttlg = 1; lg <= MAXBITS; lg++, ttlg *= 2) {
      let lc = 0;
      let lim = ttlg;
      if (lim > this.sizearray) {
        lim = this.sizearray;
        if (i > lim) break;
      }
      for (; i <= lim; i++) if (this.array[i - 1]) lc++;
      nums[lg] += lc;
      nasize += lc;
    }
    let totaluse = nasize;
    // numusehash
    let ause = 0;
    for (let j = this.sizenode() - 1; j >= 0; j--) {
      const n = this.node[j];
      if (n.live) {
        const ai = arrayIndex(n.key as LuaKey);
        if (ai > 0) { nums[ceillog2(ai)]++; ause++; }
        totaluse++;
      }
    }
    nasize += ause;
    const eai = arrayIndex(ek);
    if (eai > 0) { nums[ceillog2(eai)]++; nasize++; }
    totaluse++;
    // computesizes
    let a = 0, na = 0, nsize = 0;
    for (let b = 0, twotoi = 1; twotoi / 2 < nasize; b++, twotoi *= 2) {
      if (nums[b] > 0) {
        a += nums[b];
        if (a > twotoi / 2) { nsize = twotoi; na = a; }
      }
      if (a === nasize) break;
    }
    this.resize(nsize, totaluse - na);
  }

  private resize(nasize: number, nhsize: number) {
    const oldasize = this.sizearray;
    const oldArray = this.array.slice();
    const nold = this.node;
    const oldDummy = this.dummy;
    if (nasize > oldasize) this.setArray(nasize);
    this.setNodes(nhsize);
    if (nasize < oldasize) {
      this.sizearray = nasize;
      this.array.length = nasize;
      for (let i = nasize; i < oldasize; i++) if (oldArray[i]) this.set(i + 1);
    }
    if (!oldDummy) {
      for (let i = nold.length - 1; i >= 0; i--) if (nold[i].live) this.set(nold[i].key as LuaKey);
    }
  }

  /** Keys in `next` order: array part, then hash nodes. */
  keys(): LuaKey[] {
    const out: LuaKey[] = [];
    for (let i = 0; i < this.sizearray; i++) if (this.array[i]) out.push(i + 1);
    if (!this.dummy) for (const n of this.node) if (n.live) out.push(n.key as LuaKey);
    return out;
  }
}

// Constructor size hints, for objects that stand in for a Lua table literal.
const HINT = Symbol('luaSizeHint');
// A layout kept alongside an object whose keys were added and removed over time.
const LAYOUT = Symbol('luaLayout');
// Lua keys in the order they were first stored, for objects whose JS key order
// would differ (integer-like string keys such as "1" sort first in JS).
const ORDER = Symbol('luaKeyOrder');

/** Record the Lua keys of `obj` in the order they were stored (json.decode uses this). */
export function withKeyOrder<T extends object>(obj: T, keys: LuaKey[]): T {
  (obj as any)[ORDER] = keys;
  return obj;
}

/** Mark `obj` as built by a Lua constructor `{...}` with this many hash fields. */
export function literal<T extends object>(obj: T, nhash = Object.keys(obj).length, narray = 0): T {
  (obj as any)[HINT] = [narray, fb2int(int2fb(nhash))];
  return obj;
}

/** Mark `obj` as made by lua_createtable(L, narray, nhash): exact sizes, no rounding. */
export function presized<T extends object>(obj: T, nhash: number, narray = 0): T {
  (obj as any)[HINT] = [narray, nhash];
  return obj;
}

// lobject.c luaO_int2fb / luaO_fb2int: OP_NEWTABLE stores sizes as "floating bytes".
function int2fb(x: number): number {
  let e = 0;
  while (x >= 16) { x = (x + 1) >> 1; e++; }
  if (x < 8) return x;
  return ((e + 1) << 3) | (x - 8);
}
function fb2int(x: number): number {
  const e = (x >> 3) & 31;
  if (e === 0) return x;
  return ((x & 7) + 8) << (e - 1);
}

/** Track a table that has keys removed, so later inserts land where Lua puts them. */
export function tracked<T extends object>(obj: T): T {
  (obj as any)[LAYOUT] = simulate(obj);
  return obj;
}

/**
 * t[k] = v for a table iterated with pairs whose keys come and go. The table
 * gets a Lua layout on first use; writes made directly in JS since then are
 * folded in, in key order, before this one.
 */
export function tset(obj: any, k: LuaKey, v: unknown): void {
  let layout: LuaTableLayout | undefined = obj[LAYOUT];
  if (!layout) layout = obj[LAYOUT] = simulate(obj);
  else sync(obj, layout);
  if (v === undefined || v === null) {
    delete obj[k as any];
    layout.remove(k);
  } else {
    obj[k as any] = v;
    layout.set(k);
  }
}

/** Bring a layout up to date with keys written or cleared directly on the object. */
function sync(obj: any, layout: LuaTableLayout): void {
  const arr = Array.isArray(obj);
  const get = (k: LuaKey) => arr && typeof k === 'number' ? obj[k - 1] : obj[k as any];
  for (const k of jsKeys(obj)) {
    const nil = isNil(get(k));
    const live = layout.has(k);
    if (!nil && !live) layout.set(k);
    else if (nil && live) layout.remove(k);
  }
  for (const k of layout.keys()) if (isNil(get(k))) layout.remove(k);
}

function isIndex(k: string): boolean {
  const n = Number(k);
  return k !== '' && String(n) === k && Number.isInteger(n) && n >= 0;
}

function jsKeys(obj: object): LuaKey[] {
  if (Array.isArray(obj)) {
    const out: LuaKey[] = [];
    obj.forEach((v, i) => { if (v !== undefined && v !== null) out.push(i + 1); });
    // Named fields on a Lua sequence (`Powers.Stage = 1`) live in its hash part.
    for (const k of Object.keys(obj)) if (!isIndex(k)) out.push(k);
    return out;
  }
  const order: LuaKey[] | undefined = (obj as any)[ORDER];
  if (order) {
    const seen = new Set(order.map(String));
    const out = order.filter(k => Object.prototype.hasOwnProperty.call(obj, k as any));
    for (const k of Object.keys(obj)) if (!seen.has(k)) out.push(toKey(k));
    return out;
  }
  return Object.keys(obj).map(toKey);
}

function toKey(k: string): LuaKey {
  const c = k.charCodeAt(0);
  if (!((c >= 48 && c <= 57) || c === 45)) return k;
  const n = Number(k);
  return String(n) === k && Number.isInteger(n) ? n : k;
}

function isNil(v: unknown) { return v === undefined || v === null; }

/** Replays `obj`'s keys into a Lua table in insertion order; keys holding nil stay as dead nodes. */
function simulate(obj: any): LuaTableLayout {
  const hint = obj[HINT] ?? [0, 0];
  const sim = new LuaTableLayout(hint[0], hint[1]);
  const keys = jsKeys(obj);
  const get = (k: LuaKey) => Array.isArray(obj) && typeof k === 'number' ? obj[k - 1] : obj[k as any];
  // A key holding nil was stored as nil at its place in the sequence: Lua
  // creates the node then (luaH_set), but it never counts as a live key.
  for (const k of keys) if (isNil(get(k))) sim.remove(k, true); else sim.set(k);
  return sim;
}

/**
 * Keys of `obj` in Lua `pairs` order. Arrays are 1-based sequences (index i+1
 * holds arr[i]). For plain objects, keys are replayed into a Lua table in JS
 * insertion order, which is how json.decode and incremental assignment build
 * them.
 */
export function pairsKeys(obj: object): LuaKey[] {
  const layout: LuaTableLayout | undefined = (obj as any)[LAYOUT];
  if (layout) { sync(obj, layout); return layout.keys(); }
  if (Array.isArray(obj) && !Object.keys(obj).some(k => !isIndex(k))) return jsKeys(obj);
  // The order depends only on the key sequence, the constructor hint and which
  // keys hold nil, so tables with the same shape share one simulation.
  const hint = (obj as any)[HINT];
  let sig = hint ? hint[0] + ',' + hint[1] : '-';
  if (!Array.isArray(obj) && !(obj as any)[ORDER]) {
    // Plain object: its JS key list determines the Lua keys.
    const raw = Object.keys(obj);
    sig += '\u0003' + raw.join('\u0001');
    for (let i = 0; i < raw.length; i++) if (isNil((obj as any)[raw[i]])) sig += '\u0002' + i;
  } else {
    const arr = Array.isArray(obj);
    for (const k of jsKeys(obj)) {
      const v = arr && typeof k === 'number' ? (obj as any)[k - 1] : (obj as any)[k as any];
      sig += (typeof k === 'number' ? '\u0001n' + k : '\u0001s' + k) + (isNil(v) ? '\u0002' : '');
    }
  }
  let order = shapeCache.get(sig);
  if (!order) {
    order = simulate(obj).keys();
    if (shapeCache.size > 20000) shapeCache.clear();
    shapeCache.set(sig, order);
  }
  return order;
}

const shapeCache = new Map<string, LuaKey[]>();

/** for k, v in pairs(obj) */
export function* pairs<V = any>(obj: any): Generator<[LuaKey, V]> {
  for (const k of pairsKeys(obj)) {
    const v = Array.isArray(obj) && typeof k === 'number' ? obj[k - 1] : obj[k as any];
    if (v !== undefined && v !== null) yield [k, v];
  }
}

/** Lua's `#` on a 1-based array stored 0-based. Stops at the first nil, as ipairs does. */
export function len(arr: unknown[]): number {
  let n = arr.length;
  while (n > 0 && (arr[n - 1] === undefined || arr[n - 1] === null)) n--;
  return n;
}
