// Lua 5.1 string library semantics (lstrlib.c, lobject.c) for the ported game code.
// Strings are JS strings; patterns operate on UTF-16 code units, which matches
// Lua's byte semantics for the ASCII text the game matches against.

// ---------- number <-> string ----------

// JS toFixed/toExponential round exact ties away from zero; C printf rounds
// them to even. Both work from the exact binary value, so a tie can only show
// up as a trailing "5" with nothing after it.
function fixedC(x: number, f: number): string {
  if (x >= 1e21) return BigInt(x).toString() + (f > 0 ? '.' + '0'.repeat(f) : '');
  const s = x.toFixed(f);
  if (f > 98) return s;
  const wide = x.toFixed(Math.min(100, f + 40));
  const tail = wide.slice(wide.length - (Math.min(100, f + 40) - f));
  if (!/^50*$/.test(tail)) return s;
  const down = wide.slice(0, wide.length - tail.length).replace(/\.$/, '');
  const lastDigit = Number(down.replace('.', '').slice(-1));
  return lastDigit % 2 === 0 ? down : s;
}

function expC(x: number, p: number): string {
  // p digits after the point
  const s = x.toExponential(p);
  if (p > 98) return s;
  const wide = x.toExponential(Math.min(100, p + 40));
  const [wm, we] = wide.split('e');
  const tail = wm.slice(wm.length - (Math.min(100, p + 40) - p));
  if (!/^50*$/.test(tail)) return s;
  const down = wm.slice(0, wm.length - tail.length).replace(/\.$/, '');
  const lastDigit = Number(down.replace('.', '').slice(-1));
  return lastDigit % 2 === 0 ? down + 'e' + we : s;
}

/** C printf %.<p>g */
export function fmtG(n: number, p = 14, alt = false): string {
  if (!isFinite(n)) return isNaN(n) ? 'nan' : n > 0 ? 'inf' : '-inf';
  if (p === 0) p = 1;
  if (n === 0) return (Object.is(n, -0) ? '-0' : '0') + (alt && p > 1 ? '.' + '0'.repeat(p - 1) : '');
  const neg = n < 0;
  const x = Math.abs(n);
  const exp = Number(expC(x, p - 1).split('e')[1]);
  let s: string;
  if (exp < -4 || exp >= p) {
    let [m, e] = expC(x, p - 1).split('e');
    if (!alt && m.includes('.')) m = m.replace(/\.?0+$/, '');
    const en = Number(e);
    s = m + 'e' + (en < 0 ? '-' : '+') + String(Math.abs(en)).padStart(2, '0');
  } else {
    s = fixedC(x, Math.max(0, p - 1 - exp));
    if (!alt && s.includes('.')) s = s.replace(/\.?0+$/, '');
  }
  return (neg ? '-' : '') + s;
}

/** tostring(number) — LUA_NUMBER_FMT "%.14g" */
export function numToStr(n: number): string {
  // Integers below 1e14 print as their digits under %.14g.
  if (Number.isInteger(n) && n < 1e14 && n > -1e14 && !Object.is(n, -0)) return String(n);
  return fmtG(n, 14);
}

export function tostring(v: unknown): string {
  if (v === undefined || v === null) return 'nil';
  if (typeof v === 'number') return numToStr(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return v;
  if (typeof v === 'function') return 'function: 0x00000000';
  if (typeof v === 'object' && typeof (v as any).__tostring === 'function') return (v as any).__tostring();
  return 'table: 0x00000000';
}

/** tonumber(v [, base]) — lobject.c luaO_str2d: strtod, then hex fallback; surrounding spaces allowed. */
export function tonumber(v: unknown, base?: number): number | undefined {
  if (typeof v === 'number' && base === undefined) return v;
  if (typeof v !== 'string') return undefined;
  if (base !== undefined && base !== 10) {
    const s = v.trim().toLowerCase();
    if (!s) return undefined;
    let neg = false, i = 0;
    if (s[0] === '-') { neg = true; i = 1; }
    let n = 0;
    if (i >= s.length) return undefined;
    for (; i < s.length; i++) {
      const c = s.charCodeAt(i);
      const d = c >= 48 && c <= 57 ? c - 48 : c >= 97 && c <= 122 ? c - 87 : 99;
      if (d >= base) return undefined;
      n = n * base + d;
    }
    return neg ? -n : n;
  }
  const s = v.replace(/^[\s]+|[\s]+$/g, '');
  if (s === '') return undefined;
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return Number(s);
  if (/^[+-]?0[xX][0-9a-fA-F]+$/.test(s)) {
    const neg = s[0] === '-';
    const n = parseInt(s.replace(/^[+-]?0[xX]/, ''), 16);
    return neg ? -n : n;
  }
  if (/^[+-]?(inf|infinity)$/i.test(s)) return s[0] === '-' ? -Infinity : Infinity;
  if (/^[+-]?nan$/i.test(s)) return NaN;
  return undefined;
}

// ---------- string.format ----------

function pad(s: string, flags: string, width: number, numeric: boolean): string {
  if (s.length >= width) return s;
  if (flags.includes('-')) return s + ' '.repeat(width - s.length);
  if (numeric && flags.includes('0')) {
    const m = /^([+\- ]|0[xX])?/.exec(s)!;
    const sign = m[0];
    return sign + '0'.repeat(width - s.length) + s.slice(sign.length);
  }
  return ' '.repeat(width - s.length) + s;
}

function signed(s: string, n: number, flags: string): string {
  if (n >= 0 && !Object.is(n, -0)) {
    if (flags.includes('+')) return '+' + s;
    if (flags.includes(' ')) return ' ' + s;
  }
  return s;
}

function toInt(v: unknown): number {
  const n = typeof v === 'number' ? v : tonumber(v);
  if (n === undefined) throw new Error('bad argument to format (number expected)');
  return n;
}

export function format(fmt: string, ...args: unknown[]): string {
  let out = '';
  let ai = 0;
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt[i];
    if (c !== '%') { out += c; continue; }
    if (fmt[i + 1] === '%') { out += '%'; i++; continue; }
    const m = /^([-+ #0]*)(\d*)(?:\.(\d*))?([cdiouxXeEfgGqs])/.exec(fmt.slice(i + 1));
    if (!m) throw new Error("invalid option to 'format'");
    i += m[0].length;
    const [, flags, w, prec, conv] = m;
    const width = w ? Number(w) : 0;
    const p = prec === undefined ? undefined : prec === '' ? 0 : Number(prec);
    const arg = args[ai++];
    let s: string;
    switch (conv) {
      case 'd': case 'i': {
        const n = Math.trunc(toInt(arg));
        s = Math.abs(n).toString();
        if (p !== undefined && s.length < p) s = '0'.repeat(p - s.length) + s;
        if (n < 0) s = '-' + s; else s = signed(s, n, flags);
        out += pad(s, p !== undefined ? flags.replace('0', '') : flags, width, true);
        break;
      }
      case 'u': case 'o': case 'x': case 'X': {
        let n = Math.trunc(toInt(arg));
        if (n < 0) n = n >>> 0;
        s = n.toString(conv === 'o' ? 8 : conv === 'u' ? 10 : 16);
        if (conv === 'X') s = s.toUpperCase();
        if (p !== undefined && s.length < p) s = '0'.repeat(p - s.length) + s;
        if (flags.includes('#') && n !== 0) s = (conv === 'x' ? '0x' : conv === 'X' ? '0X' : conv === 'o' ? '0' : '') + s;
        out += pad(s, flags, width, true);
        break;
      }
      case 'c':
        out += pad(String.fromCharCode(toInt(arg)), flags, width, false);
        break;
      case 'e': case 'E': {
        const n = toInt(arg);
        let t = expC(Math.abs(n), p ?? 6);
        t = t.replace(/e([+-])(\d)$/, 'e$10$2');
        if (conv === 'E') t = t.toUpperCase();
        s = (n < 0 || Object.is(n, -0) ? '-' : '') + t;
        out += pad(n < 0 ? s : signed(s, n, flags), flags, width, true);
        break;
      }
      case 'f': {
        const n = toInt(arg);
        let t = isFinite(n) ? fixedC(Math.abs(n), p ?? 6) : Math.abs(n) === Infinity ? 'inf' : 'nan';
        if (flags.includes('#') && (p ?? 6) === 0) t += '.';
        s = (n < 0 || Object.is(n, -0) ? '-' : '') + t;
        out += pad(n < 0 ? s : signed(s, n, flags), flags, width, isFinite(n));
        break;
      }
      case 'g': case 'G': {
        const n = toInt(arg);
        let t = fmtG(Math.abs(n), p ?? 6, flags.includes('#'));
        if (conv === 'G') t = t.toUpperCase();
        s = (n < 0 || Object.is(n, -0) ? '-' : '') + t;
        out += pad(n < 0 ? s : signed(s, n, flags), flags, width, true);
        break;
      }
      case 'q': {
        const str = tostring(arg);
        let q = '"';
        for (let j = 0; j < str.length; j++) {
          const ch = str[j];
          if (ch === '"' || ch === '\\' || ch === '\n') q += '\\' + ch;
          else if (ch === '\r') q += '\\r';
          else if (ch === '\0') q += '\\000';
          else q += ch;
        }
        out += q + '"';
        break;
      }
      case 's': {
        let str = tostring(arg);
        if (p !== undefined) str = str.slice(0, p);
        out += pad(str, flags, width, false);
        break;
      }
    }
  }
  return out;
}

// ---------- byte helpers ----------

export function sub(s: string, i = 1, j = -1): string {
  const l = s.length;
  if (i < 0) i = l + i + 1;
  if (j < 0) j = l + j + 1;
  if (i < 1) i = 1;
  if (j > l) j = l;
  return i > j ? '' : s.slice(i - 1, j);
}

export function byte(s: string, i = 1, j = i): number[] {
  const out: number[] = [];
  const t = sub(s, i, j);
  for (let k = 0; k < t.length; k++) out.push(t.charCodeAt(k));
  return out;
}

export function char(...codes: number[]): string {
  return String.fromCharCode(...codes);
}

export function rep(s: string, n: number): string {
  return n <= 0 ? '' : s.repeat(Math.floor(n));
}

export const upper = (s: string) => s.replace(/[a-z]/g, c => c.toUpperCase());
export const lower = (s: string) => s.replace(/[A-Z]/g, c => c.toLowerCase());

// ---------- patterns (lstrlib.c match machinery) ----------

const L_ESC = '%';
const SPECIALS = '^$*+?.([%-';
const MAXCCALLS = 200;

type Cap = { init: number; len: number }; // len: -1 = position capture, -2 = unclosed

class MatchState {
  level = 0;
  capture: Cap[] = [];
  depth = 0;
  src: string;
  pat: string;
  constructor(src: string, pat: string) { this.src = src; this.pat = pat; }
}

function classEnd(ms: MatchState, p: number): number {
  const pat = ms.pat;
  const c = pat[p++];
  if (c === L_ESC) {
    if (p >= pat.length) throw new Error('malformed pattern (ends with %)');
    return p + 1;
  }
  if (c === '[') {
    if (pat[p] === '^') p++;
    do {
      if (p >= pat.length) throw new Error('malformed pattern (missing ])');
      const cc = pat[p++];
      if (cc === L_ESC && p < pat.length) p++;
    } while (pat[p] !== ']');
    return p + 1;
  }
  return p;
}

function isalpha(c: number) { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122); }
function isdigit(c: number) { return c >= 48 && c <= 57; }
function islower(c: number) { return c >= 97 && c <= 122; }
function isupper(c: number) { return c >= 65 && c <= 90; }
function isspace(c: number) { return c === 32 || (c >= 9 && c <= 13); }
function iscntrl(c: number) { return c < 32 || c === 127; }
function ispunct(c: number) { return c > 32 && c < 127 && !isalpha(c) && !isdigit(c); }
function isxdigit(c: number) { return isdigit(c) || (c >= 97 && c <= 102) || (c >= 65 && c <= 70); }

function singleClass(c: number, cl: string): boolean {
  let res: boolean;
  switch (cl.toLowerCase()) {
    case 'a': res = isalpha(c); break;
    case 'c': res = iscntrl(c); break;
    case 'd': res = isdigit(c); break;
    case 'l': res = islower(c); break;
    case 'p': res = ispunct(c); break;
    case 's': res = isspace(c); break;
    case 'u': res = isupper(c); break;
    case 'w': res = isalpha(c) || isdigit(c); break;
    case 'x': res = isxdigit(c); break;
    case 'z': res = c === 0; break;
    default: return cl.charCodeAt(0) === c;
  }
  return isupper(cl.charCodeAt(0)) ? !res : res;
}

function matchClass(ms: MatchState, c: number, p: number, ec: number): boolean {
  const pat = ms.pat;
  let sig = true;
  if (pat[p + 1] === '^') { sig = false; p++; }
  while (++p < ec) {
    if (pat[p] === L_ESC) {
      p++;
      if (singleClass(c, pat[p])) return sig;
    } else if (pat[p + 1] === '-' && p + 2 < ec) {
      p += 2;
      if (pat.charCodeAt(p - 2) <= c && c <= pat.charCodeAt(p)) return sig;
    } else if (pat.charCodeAt(p) === c) return sig;
  }
  return !sig;
}

function singleMatch(ms: MatchState, s: number, p: number, ep: number): boolean {
  if (s >= ms.src.length) return false;
  const c = ms.src.charCodeAt(s);
  switch (ms.pat[p]) {
    case '.': return true;
    case L_ESC: return singleClass(c, ms.pat[p + 1]);
    case '[': return matchClass(ms, c, p, ep - 1);
    default: return ms.pat.charCodeAt(p) === c;
  }
}

function matchBalance(ms: MatchState, s: number, p: number): number {
  if (p + 1 >= ms.pat.length) throw new Error('unbalanced pattern');
  if (s >= ms.src.length || ms.src[s] !== ms.pat[p]) return -1;
  const b = ms.pat[p], e = ms.pat[p + 1];
  let cont = 1;
  while (++s < ms.src.length) {
    const ch = ms.src[s];
    if (ch === e) { if (--cont === 0) return s + 1; }
    else if (ch === b) cont++;
  }
  return -1;
}

function maxExpand(ms: MatchState, s: number, p: number, ep: number): number {
  let i = 0;
  while (singleMatch(ms, s + i, p, ep)) i++;
  while (i >= 0) {
    const res = doMatch(ms, s + i, ep + 1);
    if (res !== -1) return res;
    i--;
  }
  return -1;
}

function minExpand(ms: MatchState, s: number, p: number, ep: number): number {
  for (;;) {
    const res = doMatch(ms, s, ep + 1);
    if (res !== -1) return res;
    if (singleMatch(ms, s, p, ep)) s++;
    else return -1;
  }
}

function startCapture(ms: MatchState, s: number, p: number, what: number): number {
  ms.capture[ms.level] = { init: s, len: what };
  ms.level++;
  const res = doMatch(ms, s, p);
  if (res === -1) ms.level--;
  return res;
}

function endCapture(ms: MatchState, s: number, p: number): number {
  let l = -1;
  for (let lv = ms.level - 1; lv >= 0; lv--) if (ms.capture[lv].len === -2) { l = lv; break; }
  if (l < 0) throw new Error('invalid pattern capture');
  ms.capture[l].len = s - ms.capture[l].init;
  const res = doMatch(ms, s, p);
  if (res === -1) ms.capture[l].len = -2;
  return res;
}

function matchCapture(ms: MatchState, s: number, l: string): number {
  const idx = l.charCodeAt(0) - 49;
  if (idx < 0 || idx >= ms.level || ms.capture[idx].len === -2) throw new Error('invalid capture index');
  const cap = ms.src.substr(ms.capture[idx].init, ms.capture[idx].len);
  if (ms.src.length - s >= cap.length && ms.src.substr(s, cap.length) === cap) return s + cap.length;
  return -1;
}

function doMatch(ms: MatchState, s: number, p: number): number {
  if (++ms.depth > MAXCCALLS * 50) throw new Error('pattern too complex');
  try {
    const pat = ms.pat;
    for (;;) {
      if (p >= pat.length) return s;
      switch (pat[p]) {
        case '(':
          if (pat[p + 1] === ')') return startCapture(ms, s, p + 2, -1);
          return startCapture(ms, s, p + 1, -2);
        case ')':
          return endCapture(ms, s, p + 1);
        case L_ESC:
          if (pat[p + 1] === 'b') {
            s = matchBalance(ms, s, p + 2);
            if (s !== -1) { p += 4; continue; }
            return -1;
          }
          if (pat[p + 1] === 'f') {
            p += 2;
            if (pat[p] !== '[') throw new Error("missing '[' after '%f' in pattern");
            const ep = classEnd(ms, p);
            const prev = s === 0 ? 0 : ms.src.charCodeAt(s - 1);
            const cur = s < ms.src.length ? ms.src.charCodeAt(s) : 0;
            if (!matchClass(ms, prev, p, ep - 1) && matchClass(ms, cur, p, ep - 1)) { p = ep; continue; }
            return -1;
          }
          if (isdigit(pat.charCodeAt(p + 1))) {
            s = matchCapture(ms, s, pat[p + 1]);
            if (s !== -1) { p += 2; continue; }
            return -1;
          }
          break;
        case '$':
          if (p + 1 === pat.length) return s === ms.src.length ? s : -1;
          break;
      }
      const ep = classEnd(ms, p);
      const m = singleMatch(ms, s, p, ep);
      switch (pat[ep]) {
        case '?': {
          if (m) {
            const res = doMatch(ms, s + 1, ep + 1);
            if (res !== -1) return res;
          }
          p = ep + 1;
          continue;
        }
        case '*': return maxExpand(ms, s, p, ep);
        case '+': return m ? maxExpand(ms, s + 1, p, ep) : -1;
        case '-': return minExpand(ms, s, p, ep);
        default:
          if (!m) return -1;
          s++;
          p = ep;
          continue;
      }
    }
  } finally {
    ms.depth--;
  }
}

type CapVal = string | number;

function getCapture(ms: MatchState, i: number, s: number, e: number): CapVal {
  if (i >= ms.level) {
    if (i === 0) return ms.src.slice(s, e);
    throw new Error('invalid capture index');
  }
  const c = ms.capture[i];
  if (c.len === -2) throw new Error('unfinished capture');
  if (c.len === -1) return c.init + 1;
  return ms.src.substr(c.init, c.len);
}

function captures(ms: MatchState, s: number, e: number, wholeIfNone: boolean): CapVal[] {
  const n = ms.level === 0 && wholeIfNone ? 1 : ms.level;
  const out: CapVal[] = [];
  for (let i = 0; i < n; i++) out.push(getCapture(ms, i, s, e));
  return out;
}

function hasSpecials(p: string) {
  for (const c of p) if (SPECIALS.includes(c)) return true;
  return false;
}

function strFindAux(s: string, pat: string, init: number | undefined, plain: boolean, find: boolean): any[] {
  const l = s.length;
  let i = init ?? 1;
  if (i < 0) i = l + i + 1;
  if (i < 1) i = 1;
  if (i > l + 1) return [undefined];
  if (find && (plain || !hasSpecials(pat))) {
    const idx = s.indexOf(pat, i - 1);
    return idx === -1 ? [undefined] : [idx + 1, idx + pat.length];
  }
  let p = 0;
  const anchor = pat[0] === '^';
  if (anchor) p = 1;
  let s1 = i - 1;
  do {
    const ms = new MatchState(s, pat);
    const e = doMatch(ms, s1, p);
    if (e !== -1) {
      if (find) return [s1 + 1, e, ...captures(ms, -1, -1, false)];
      return captures(ms, s1, e, true);
    }
    s1++;
  } while (s1 <= l && !anchor);
  return [undefined];
}

/** string.find -> [start, end, ...captures] or [undefined] */
export function find(s: string, pat: string, init?: number, plain = false): any[] {
  return strFindAux(s, pat, init, plain, true);
}

/** string.match -> captures (or whole match) or [undefined] */
export function match(s: string, pat: string, init?: number): any[] {
  return strFindAux(s, pat, init, false, false);
}

/** First return value of string.match. */
export function match1(s: string, pat: string, init?: number): any {
  return match(s, pat, init)[0];
}

export function* gmatch(s: string, pat: string): Generator<any[]> {
  let src = 0;
  while (src <= s.length) {
    let e = -1;
    let ms!: MatchState;
    for (; src <= s.length; src++) {
      ms = new MatchState(s, pat);
      e = doMatch(ms, src, 0);
      if (e !== -1) break;
    }
    if (e === -1) return;
    const caps = captures(ms, src, e, true);
    src = e === src ? e + 1 : e;
    yield caps;
  }
}

export type GsubRepl = string | Record<string, any> | ((...caps: any[]) => any);

export function gsub(s: string, pat: string, repl: GsubRepl, maxN?: number): [string, number] {
  const anchor = pat[0] === '^';
  const p0 = anchor ? 1 : 0;
  let src = 0;
  let n = 0;
  let out = '';
  const max = maxN ?? s.length + 1;
  while (n < max) {
    const ms = new MatchState(s, pat);
    const e = doMatch(ms, src, p0);
    if (e !== -1) {
      n++;
      const whole = s.slice(src, e);
      let val: any;
      if (typeof repl === 'string') {
        let r = '';
        for (let i = 0; i < repl.length; i++) {
          const c = repl[i];
          if (c !== L_ESC) { r += c; continue; }
          i++;
          const d = repl[i];
          if (!isdigit(d?.charCodeAt(0) ?? 0)) r += d;
          else if (d === '0') r += whole;
          else r += tostring(getCapture(ms, d.charCodeAt(0) - 49, src, e));
        }
        val = r;
      } else {
        const cap = getCapture(ms, 0, src, e);
        val = typeof repl === 'function' ? repl(...captures(ms, src, e, true)) : repl[cap as any];
        if (val === undefined || val === null || val === false) val = whole;
        else if (typeof val === 'number') val = numToStr(val);
        else if (typeof val !== 'string') throw new Error('invalid replacement value');
      }
      out += val;
    }
    if (e !== -1 && e > src) src = e;
    else if (src < s.length) out += s[src++];
    else break;
    if (anchor) break;
  }
  out += s.slice(src);
  return [out, n];
}
