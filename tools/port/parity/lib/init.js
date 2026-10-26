// Determinism layer injected (page.addInitScript) before any page script runs.
// Shared verbatim by both targets: the original Defold build and the HTML port.
// See ../README.md for the contract. Plain browser JS, no imports: run.mjs
// stringifies parityInit and calls it with a config object.
//
// What it virtualises:
//   clock     Date, new Date(), Date.now, performance.now. Frozen during boot;
//             frame k (0-based) runs at startTime + skew + (k+1) * 1000/60 ms.
//             Date.now() is floored to whole ms, as a real browser's is.
//             skew (whole ms) only grows, through step()'s opts.clock: a time
//             skip moves both clocks forward without running frames.
//   frames    requestAnimationFrame/cancelAnimationFrame queue, run only by
//             __parity.step().
//   timers    setTimeout/setInterval: real during boot (tracked), virtual once
//             stepping starts (fired at the start of the first frame whose
//             time has reached them; ones created while firing wait a frame).
//   random    Math.random: mulberry32 from a fixed seed.
//   network   XMLHttpRequest and fetch. During boot, requests pass through
//             except URLs matching cfg.gate; once stepping starts, every
//             request is gated. A gated response is delivered at the start of
//             the first frame stepped after the request was made, in request
//             order (the harness waits for the bytes first).
//   canvas    getContext('webgl'|'webgl2'|'experimental-webgl') is forced to
//             preserveDrawingBuffer:true so the frame can be read back.
//   storage   not touched here: the harness restores localStorage AND IndexedDB
//             (Defold's IDBFS, where sys.save/io.open files live) on a blank
//             page of the same origin before loading the game; see
//             __parity.restoreStorage / snapshotStorage below.
function parityInit(cfg) {
  if (window.__parity) return;
  const R = {
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    Date: window.Date,
    fetch: window.fetch.bind(window),
    XHR: window.XMLHttpRequest,
    getContext: HTMLCanvasElement.prototype.getContext,
  };

  // ---- random ---------------------------------------------------------
  let seed = (cfg.seed >>> 0) || 0x5eed;
  Math.random = function random() {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ---- clock ----------------------------------------------------------
  const FPS = 60;
  const T0 = cfg.startTime;          // epoch ms at boot
  const P0 = cfg.perfStart || 1000;  // performance.now() at boot
  let tick = 0;                      // frames started; frame k runs at tick k+1
  let skew = 0;                      // whole ms added by time skips
  const elapsed = () => skew + (tick * 1000) / FPS;
  const dateNow = () => Math.floor(T0 + elapsed());
  const perfNow = () => P0 + elapsed();

  const RealDate = R.Date;
  function VDate(...args) {
    if (!new.target) return new RealDate(dateNow()).toString();
    return args.length ? new RealDate(...args) : new RealDate(dateNow());
  }
  VDate.prototype = RealDate.prototype;
  VDate.now = dateNow;
  VDate.parse = RealDate.parse;
  VDate.UTC = RealDate.UTC;
  Object.defineProperty(VDate, 'name', { value: 'Date' });
  window.Date = VDate;
  Performance.prototype.now = perfNow;
  try { performance.now = perfNow; } catch (e) {}

  // ---- requestAnimationFrame ------------------------------------------
  let rafQueue = [];
  let rafId = 0;
  const raf = (cb) => { rafQueue.push({ id: ++rafId, cb }); return rafId; };
  const caf = (id) => { rafQueue = rafQueue.filter((e) => e.id !== id); };
  for (const p of ['', 'webkit', 'moz', 'ms']) {
    window[p ? p + 'RequestAnimationFrame' : 'requestAnimationFrame'] = raf;
    window[p ? p + 'CancelAnimationFrame' : 'cancelAnimationFrame'] = caf;
  }

  // ---- timers ---------------------------------------------------------
  let stepping = false;
  const timers = new Map();  // id -> { fn, args, due, every, real }
  let timerId = 0;
  function callIt(fn, args) {
    try {
      if (typeof fn === 'function') fn(...args);
      else (0, eval)(String(fn));
    } catch (e) {
      console.error('[parity] timer threw', e);
    }
  }
  function addTimer(fn, delay, args, repeat) {
    const id = ++timerId;
    delay = Math.max(0, Number(delay) || 0);
    if (!stepping) {
      const t = { fn, args, every: repeat ? delay : null, boot: true };
      const run = () => {
        if (!timers.has(id)) return;
        if (!repeat) timers.delete(id);
        callIt(fn, args);
      };
      t.real = repeat ? R.setInterval(run, delay) : R.setTimeout(run, delay);
      t.due = perfNow() + delay;
      timers.set(id, t);
    } else {
      timers.set(id, { fn, args, due: perfNow() + delay, every: repeat ? Math.max(1, delay) : null, born: tick });
    }
    return id;
  }
  function clearTimer(id) {
    const t = timers.get(id);
    if (!t) return;
    if (t.real !== undefined) { R.clearTimeout(t.real); R.clearInterval(t.real); }
    timers.delete(id);
  }
  window.setTimeout = (fn, delay, ...args) => addTimer(fn, delay, args, false);
  window.setInterval = (fn, delay, ...args) => addTimer(fn, delay, args, true);
  window.clearTimeout = clearTimer;
  window.clearInterval = clearTimer;
  function fireTimers() {
    const now = perfNow();
    const due = [...timers.entries()]
      .filter(([, t]) => t.born < tick && t.due <= now)
      .sort((a, b) => a[1].due - b[1].due || a[0] - b[0]);
    for (const [id, t] of due) {
      if (!timers.has(id)) continue;
      if (t.every !== null) {
        t.due += t.every;
        if (t.due <= now) t.due = now + t.every;
      } else {
        timers.delete(id);
      }
      callIt(t.fn, t.args);
    }
  }

  // ---- network --------------------------------------------------------
  const gateRes = (cfg.gate || []).map((s) => new RegExp(s));
  const isGated = (url) => stepping || gateRes.some((re) => re.test(url));
  const pending = [];   // gated requests: { seq, settled, deliver }
  let netSeq = 0;
  let bootInFlight = 0;

  function gateRequest(url, start) {
    // start() -> promise of a settled result; returns a promise resolved at delivery
    const entry = { seq: ++netSeq, url, settled: false, result: null };
    pending.push(entry);
    const p = start().then(
      (r) => ({ ok: true, r }),
      (e) => ({ ok: false, e }),
    );
    p.then((res) => { entry.result = res; entry.settled = true; });
    return new Promise((resolve) => { entry.deliver = () => resolve(entry.result); });
  }

  async function fetchAll(input, init) {
    const res = await R.fetch(input, init);
    const body = await res.arrayBuffer();
    return { status: res.status, statusText: res.statusText, headers: [...res.headers.entries()], body, url: res.url };
  }

  window.fetch = function fetch(input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href).href;
    if (!isGated(url)) {
      bootInFlight++;
      const p = R.fetch(input, init);
      p.then(() => bootInFlight--, () => bootInFlight--);
      return p;
    }
    return gateRequest(url, () => fetchAll(input, init)).then((res) => {
      if (!res.ok) throw res.e;
      const r = res.r;
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers: r.headers });
    });
  };

  class ParityXHR extends EventTarget {
    constructor() {
      super();
      this.readyState = 0;
      this.status = 0;
      this.statusText = '';
      this.response = null;
      this.responseText = '';
      this.responseType = '';
      this.responseURL = '';
      this.responseXML = null;
      this.timeout = 0;
      this.withCredentials = false;
      this.upload = new EventTarget();
      this._headers = {};
      this._resHeaders = [];
      for (const t of ['readystatechange', 'loadstart', 'progress', 'load', 'error', 'abort', 'timeout', 'loadend']) {
        this['on' + t] = null;
        this.addEventListener(t, (ev) => { const h = this['on' + t]; if (typeof h === 'function') h.call(this, ev); });
      }
    }
    open(method, url, async = true) {
      this._method = String(method).toUpperCase();
      this._url = new URL(String(url), location.href).href;
      this._async = async !== false;
      this._aborted = false;
      this.readyState = 1;
      this._emit('readystatechange');
    }
    setRequestHeader(k, v) { this._headers[k] = v; }
    overrideMimeType() {}
    getResponseHeader(name) {
      const n = String(name).toLowerCase();
      const hit = this._resHeaders.find(([k]) => k.toLowerCase() === n);
      return hit ? hit[1] : null;
    }
    getAllResponseHeaders() {
      return this._resHeaders.map(([k, v]) => k + ': ' + v + '\r\n').join('');
    }
    abort() { this._aborted = true; }
    _emit(type, loaded, total) {
      const ev = type === 'readystatechange'
        ? new Event(type)
        : new ProgressEvent(type, { lengthComputable: total !== undefined, loaded: loaded || 0, total: total || 0 });
      this.dispatchEvent(ev);
    }
    _syncSend(body) {
      const x = new R.XHR();
      x.open(this._method, this._url, false);
      for (const [k, v] of Object.entries(this._headers)) x.setRequestHeader(k, v);
      if (this.responseType && this.responseType !== 'text') x.responseType = this.responseType;
      x.send(body);
      this.status = x.status;
      this.statusText = x.statusText;
      this.response = x.response;
      if (!this.responseType || this.responseType === 'text') this.responseText = x.responseText;
      this._resHeaders = x.getAllResponseHeaders().trim().split(/\r?\n/).filter(Boolean).map((l) => {
        const i = l.indexOf(':');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      });
      this.readyState = 4;
    }
    send(body) {
      if (!this._async) return this._syncSend(body);
      const init = { method: this._method, headers: this._headers, credentials: this.withCredentials ? 'include' : 'same-origin' };
      if (body !== undefined && body !== null && this._method !== 'GET' && this._method !== 'HEAD') init.body = body;
      const url = this._url;
      const deliver = (res) => this._deliver(res);
      if (!isGated(url)) {
        bootInFlight++;
        fetchAll(url, init).then(
          (r) => { bootInFlight--; deliver({ ok: true, r }); },
          (e) => { bootInFlight--; deliver({ ok: false, e }); },
        );
      } else {
        gateRequest(url, () => fetchAll(url, init)).then(deliver);
      }
    }
    _deliver(res) {
      if (this._aborted) {
        this.readyState = 4;
        this._emit('readystatechange');
        this._emit('abort');
        this._emit('loadend');
        return;
      }
      if (!res.ok) {
        this.readyState = 4;
        this.status = 0;
        this._emit('readystatechange');
        this._emit('error');
        this._emit('loadend');
        return;
      }
      const r = res.r;
      this.status = r.status;
      this.statusText = r.statusText;
      this.responseURL = r.url || this._url;
      this._resHeaders = r.headers;
      this.readyState = 2;
      this._emit('readystatechange');
      const bytes = r.body;
      const text = () => new TextDecoder().decode(bytes);
      switch (this.responseType) {
        case 'arraybuffer': this.response = bytes; break;
        case 'blob': this.response = new Blob([bytes]); break;
        case 'json': try { this.response = JSON.parse(text()); } catch (e) { this.response = null; } break;
        default: this.responseText = text(); this.response = this.responseText;
      }
      this.readyState = 3;
      this._emit('readystatechange');
      this._emit('progress', bytes.byteLength, bytes.byteLength);
      this.readyState = 4;
      this._emit('readystatechange');
      this._emit('load', bytes.byteLength, bytes.byteLength);
      this._emit('loadend', bytes.byteLength, bytes.byteLength);
    }
  }
  ParityXHR.UNSENT = 0; ParityXHR.OPENED = 1; ParityXHR.HEADERS_RECEIVED = 2; ParityXHR.LOADING = 3; ParityXHR.DONE = 4;
  window.XMLHttpRequest = ParityXHR;

  // ---- canvas ---------------------------------------------------------
  HTMLCanvasElement.prototype.getContext = function getContext(type, attrs) {
    if (/webgl/.test(String(type))) attrs = Object.assign({}, attrs, { preserveDrawingBuffer: true });
    return R.getContext.call(this, type, attrs);
  };

  // ---- canonical JSON (same output as the Lua hook) ---------------------
  function g17(n) {
    if (Number.isNaN(n)) return 'nan';
    if (n === Infinity) return 'inf';
    if (n === -Infinity) return '-inf';
    if (n === 0) return Object.is(n, -0) ? '-0' : '0';
    const neg = n < 0;
    const [mant, ex] = Math.abs(n).toExponential(16).split('e');
    const e = Number(ex);
    const digits = mant.replace('.', '');
    let out;
    if (e < -4 || e >= 17) {
      const frac = digits.slice(1).replace(/0+$/, '');
      out = digits[0] + (frac ? '.' + frac : '') + 'e' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
    } else if (e >= 0) {
      const frac = digits.slice(e + 1).replace(/0+$/, '');
      out = digits.slice(0, e + 1) + (frac ? '.' + frac : '');
    } else {
      const frac = ('0'.repeat(-e - 1) + digits).replace(/0+$/, '');
      out = '0.' + frac;
    }
    return (neg ? '-' : '') + out;
  }
  const enc = new TextEncoder();
  function byteCompare(a, b) {
    if (/^[\x00-\x7f]*$/.test(a + b)) return a < b ? -1 : a > b ? 1 : 0;
    const x = enc.encode(a), y = enc.encode(b);
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
    return x.length - y.length;
  }
  function quote(s) {
    return '"' + s.replace(/[\x00-\x1f\x7f"\\]/g, (c) =>
      c === '"' ? '\\"' : c === '\\' ? '\\\\' : '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '"';
  }
  function canon(v, stack = new Set()) {
    if (typeof v === 'number') return Number.isFinite(v) ? g17(v) : quote(g17(v));
    if (typeof v === 'string') return quote(v);
    if (typeof v === 'boolean') return String(v);
    if (v === null || v === undefined) return '{}';
    if (typeof v === 'object') {
      if (stack.has(v)) return '"<cycle>"';
      stack.add(v);
      const entries = Array.isArray(v)
        ? v.map((x, i) => [g17(i + 1), x])
        : (v instanceof Map ? [...v.entries()].map(([k, x]) => [typeof k === 'number' ? g17(k) : String(k), x]) : Object.entries(v));
      const kept = entries.filter(([, x]) => x !== undefined && x !== null && typeof x !== 'function');
      kept.sort((a, b) => byteCompare(a[0], b[0]));
      const out = '{' + kept.map(([k, x]) => quote(k) + ':' + canon(x, stack)).join(',') + '}';
      stack.delete(v);
      return out;
    }
    return quote(String(v));
  }

  // ---- storage snapshot helpers ----------------------------------------
  const idbReq = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => { const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; };
  function tagEncode(v) {
    if (v instanceof RealDate) return { $date: v.getTime() };
    if (v instanceof ArrayBuffer) return { $ab: b64(new Uint8Array(v)) };
    if (ArrayBuffer.isView(v)) return { ['$' + v.constructor.name]: b64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
    if (Array.isArray(v)) return v.map(tagEncode);
    if (v && typeof v === 'object') {
      const o = {};
      for (const k of Object.keys(v).sort()) o[k] = tagEncode(v[k]);
      return o;
    }
    return v;
  }
  function tagDecode(v) {
    if (Array.isArray(v)) return v.map(tagDecode);
    if (v && typeof v === 'object') {
      const ks = Object.keys(v);
      if (ks.length === 1 && ks[0][0] === '$') {
        const t = ks[0].slice(1), x = v[ks[0]];
        if (t === 'date') return new RealDate(x);
        if (t === 'ab') return unb64(x).buffer;
        if (typeof window[t] === 'function') { const u8 = unb64(x); return new window[t](u8.buffer, 0, u8.byteLength / window[t].BYTES_PER_ELEMENT); }
      }
      const o = {};
      for (const k of ks) o[k] = tagDecode(v[k]);
      return o;
    }
    return v;
  }

  // ---- control surface ------------------------------------------------
  let cmd = '';          // commands for the Lua hook: 'state', 'save'
  let putState = null;   // what the Lua hook (or the port) put this frame
  let stateProvider = null;
  let portReady = false;
  let lastFrameError = null;

  const flush = () => new Promise((r) => R.setTimeout(r, 0));

  async function settleNetwork(timeoutMs) {
    const end = RealDate.now() + timeoutMs;
    while (pending.some((p) => !p.settled)) {
      if (RealDate.now() > end) throw new Error('[parity] network did not settle: ' + pending.filter((p) => !p.settled).map((p) => p.url).join(', '));
      await new Promise((r) => R.setTimeout(r, 2));
    }
  }

  function dispatchInput(ev) {
    const canvas = window.__parity.canvas();
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + ev.x;
    const clientY = rect.top + ev.y;
    const base = { bubbles: true, cancelable: true, view: window, clientX, clientY, screenX: clientX, screenY: clientY };
    if (document.activeElement !== canvas) canvas.focus();
    if (ev.type === 'down') canvas.dispatchEvent(new MouseEvent('mousedown', { ...base, button: 0, buttons: 1 }));
    else if (ev.type === 'up') canvas.dispatchEvent(new MouseEvent('mouseup', { ...base, button: 0, buttons: 0 }));
    else if (ev.type === 'move') canvas.dispatchEvent(new MouseEvent('mousemove', { ...base, button: 0, buttons: ev.buttons || 0 }));
    else if (ev.type === 'wheel') {
      // Emscripten's GLFW listens for 'mousewheel' (wheelDelta) and 'DOMMouseScroll'.
      const w = new WheelEvent('mousewheel', { ...base, deltaY: ev.delta });
      Object.defineProperty(w, 'wheelDelta', { value: -ev.delta });
      canvas.dispatchEvent(w);
      canvas.dispatchEvent(new WheelEvent('wheel', { ...base, deltaY: ev.delta, deltaMode: 0 }));
    }
  }

  window.__parity = {
    version: 1,
    config: cfg,
    get frame() { return tick; },            // frames stepped so far
    get stepping() { return stepping; },
    now: () => ({ date: dateNow(), perf: perfNow(), skew }),
    canvas: () => document.querySelector('canvas#canvas') || document.querySelector('canvas'),
    canon,
    g17,

    // -- for the game ------------------------------------------------------
    // Lua hook: polled every frame, returns the pending commands
    cmd: () => cmd,
    // Lua hook / port: hand over this frame's canonical state JSON
    put: (json) => { putState = String(json); },
    // port: register a function returning the state (object or canonical JSON)
    provideState: (fn) => { stateProvider = fn; },
    // port: call once every asset is loaded and the first rAF is requested
    portReady: () => { portReady = true; },

    // -- for the harness ---------------------------------------------------
    bootStatus: () => ({
      rafQueued: rafQueue.length,
      bootTimers: [...timers.values()].filter((t) => t.boot && t.every === null).length,
      bootIntervals: [...timers.values()].filter((t) => t.boot && t.every !== null).length,
      bootInFlight,
      gatedPending: pending.length,
      portReady,
      engine: typeof Module !== 'undefined' && !!(Module.runApp) && !!(window.Module && Module.calledRun),
    }),
    start() {
      // Boot timers still pending become virtual, due at frame 0.
      for (const [, t] of timers) {
        if (t.boot) {
          R.clearTimeout(t.real); R.clearInterval(t.real);
          delete t.real; t.boot = false; t.born = -1; t.due = perfNow();
          if (t.every !== null) t.every = Math.max(1, t.every);
        }
      }
      stepping = true;
    },
    // Run frames. opts.events: [{ frame, type:'down'|'up'|'move'|'wheel', x, y, delta }]
    // delivered just before that frame's timers and rAF callbacks.
    // opts.clock: [{ frame, ms }] advances both clocks by ms (whole, >= 0)
    // just before that frame starts, so the frame runs that much later.
    // opts.want: commands for the last frame stepped ('state', 'save').
    async step(n = 1, opts = {}) {
      if (!stepping) throw new Error('[parity] start() first');
      const events = opts.events || [];
      const clock = opts.clock || [];
      for (let i = 0; i < n; i++) {
        const frame = tick;  // 0-based index of the frame about to run
        const last = i === n - 1;
        await settleNetwork(opts.netTimeout || 10000);
        for (const c of clock) if (c.frame === frame) skew += Math.max(0, Math.round(c.ms));
        tick++;
        const ready = pending.splice(0, pending.length);
        for (const p of ready) p.deliver();
        await flush();
        for (const ev of events) if (ev.frame === frame) dispatchInput(ev);
        fireTimers();
        await flush();
        cmd = last && opts.want ? opts.want : '';
        putState = null;
        const q = rafQueue;
        rafQueue = [];
        const ts = perfNow();
        for (const { cb } of q) {
          try { cb(ts); } catch (e) {
            if (!/SimulateInfiniteLoop|unwind/i.test(String(e))) { lastFrameError = String(e && e.stack || e); console.error('[parity] frame threw', e); }
          }
        }
        await flush();
        cmd = '';
      }
      return tick;
    },
    // The state at the end of the last stepped frame (canonical JSON string)
    state() {
      if (stateProvider) {
        const s = stateProvider();
        return typeof s === 'string' ? s : canon(s);
      }
      return putState;
    },
    // Every persistent store of this origin: localStorage and all IndexedDB
    // databases (schema + records). Values are JSON with tagged binary/Date.
    async snapshotStorage() {
      const ls = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        ls[k] = localStorage.getItem(k);
      }
      const keys = Object.keys(ls).sort();
      const localStorageOut = {};
      for (const k of keys) localStorageOut[k] = ls[k];
      const dbs = [];
      const infos = (await indexedDB.databases()).sort((a, b) => (a.name < b.name ? -1 : 1));
      for (const info of infos) {
        const db = await idbReq(indexedDB.open(info.name));
        const stores = [];
        for (const sn of [...db.objectStoreNames].sort()) {
          const tx = db.transaction(sn, 'readonly');
          const st = tx.objectStore(sn);
          const indexes = [...st.indexNames].sort().map((n) => {
            const ix = st.index(n);
            return { name: n, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry };
          });
          const ks = await idbReq(st.getAllKeys());
          const vs = await idbReq(st.getAll());
          stores.push({
            name: sn, keyPath: st.keyPath, autoIncrement: st.autoIncrement, indexes,
            records: ks.map((k, i) => ({ key: tagEncode(k), value: tagEncode(vs[i]) })),
          });
        }
        dbs.push({ name: info.name, version: db.version, stores });
        db.close();
      }
      return { localStorage: localStorageOut, indexedDB: dbs };
    },
    // Wipe this origin's storage and load a snapshot. Run on a blank page
    // before the game loads (Defold reads IDBFS before main()).
    async restoreStorage(snap) {
      localStorage.clear();
      for (const [k, v] of Object.entries(snap.localStorage || {})) localStorage.setItem(k, v);
      for (const info of await indexedDB.databases()) await idbReq(indexedDB.deleteDatabase(info.name));
      for (const d of snap.indexedDB || []) {
        const req = indexedDB.open(d.name, d.version);
        req.onupgradeneeded = () => {
          const db = req.result;
          for (const s of d.stores) {
            const st = db.createObjectStore(s.name, { keyPath: s.keyPath === null ? undefined : s.keyPath, autoIncrement: s.autoIncrement });
            for (const ix of s.indexes) st.createIndex(ix.name, ix.keyPath, { unique: ix.unique, multiEntry: ix.multiEntry });
          }
        };
        const db = await idbReq(req);
        for (const s of d.stores) {
          if (!s.records.length) continue;
          const tx = db.transaction(s.name, 'readwrite');
          const st = tx.objectStore(s.name);
          for (const r of s.records) {
            if (s.keyPath === null) st.put(tagDecode(r.value), tagDecode(r.key));
            else st.put(tagDecode(r.value));
          }
          await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
        }
        db.close();
      }
    },
    snapshot() {
      return window.__parity.canvas().toDataURL('image/png');
    },
    lastError: () => lastFrameError,
  };
}
if (typeof module !== 'undefined') module.exports = { parityInit };
