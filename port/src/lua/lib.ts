// Lua 5.1 table and math library behaviour the game depends on.
// Arrays are JS arrays holding Lua index i at arr[i-1].

import { numToStr } from './string';

/** a % b as Lua computes it (luai_nummod) */
export function mod(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

/** Lua's `/`; kept for symmetry so translated code reads the same. */
export const div = (a: number, b: number) => a / b;

// ---------- table ----------

function getn(t: unknown[]): number {
  let n = t.length;
  while (n > 0 && (t[n - 1] === undefined || t[n - 1] === null)) n--;
  return n;
}

/** table.insert(t, v) / table.insert(t, pos, v) */
export function insert<T>(t: T[], posOrV: any, v?: T): void {
  const e = getn(t) + 1;
  if (arguments.length === 2) {
    t[e - 1] = posOrV;
    return;
  }
  let pos = Math.trunc(posOrV);
  let top = e;
  if (pos > top) top = pos;
  for (let i = top; i > pos; i--) t[i - 1] = t[i - 2];
  t[pos - 1] = v as T;
}

/** table.remove(t [, pos]) */
export function remove<T>(t: T[], pos?: number): T | undefined {
  const e = getn(t);
  const p = pos === undefined ? e : Math.trunc(pos);
  if (!(1 <= p && p <= e)) return undefined;
  const res = t[p - 1];
  for (let i = p; i < e; i++) t[i - 1] = t[i];
  t.length = e - 1;
  return res;
}

export function concat(t: unknown[], sep = '', i = 1, j = getn(t)): string {
  const parts: string[] = [];
  for (let k = i; k <= j; k++) {
    const v = t[k - 1];
    parts.push(typeof v === 'number' ? numToStr(v) : String(v));
  }
  return parts.join(sep);
}


function lessThan(a: any, b: any): boolean {
  if (typeof a === 'number' && typeof b === 'number') return a < b;
  if (typeof a === 'string' && typeof b === 'string') return a < b;
  throw new Error('attempt to compare ' + typeof a + ' with ' + typeof b);
}

/** table.sort — Lua 5.1 auxsort, so equal elements end up where the original put them. */
export function sort<T>(t: T[], comp?: (a: T, b: T) => boolean): void {
  const lt = comp ?? (lessThan as (a: T, b: T) => boolean);
  const a = (i: number) => t[i - 1];
  const swap = (i: number, j: number) => { const x = t[i - 1]; t[i - 1] = t[j - 1]; t[j - 1] = x; };
  const aux = (l: number, u: number): void => {
    while (l < u) {
      if (lt(a(u), a(l))) swap(l, u);
      if (u - l === 1) break;
      let i = Math.floor((l + u) / 2);
      if (lt(a(i), a(l))) swap(i, l);
      else if (lt(a(u), a(i))) swap(i, u);
      if (u - l === 2) break;
      const P = a(i);
      swap(i, u - 1);
      i = l;
      let j = u - 1;
      for (;;) {
        while (lt(a(++i), P)) {
          if (i > u) throw new Error('invalid order function for sorting');
        }
        while (lt(P, a(--j))) {
          if (j < l) throw new Error('invalid order function for sorting');
        }
        if (j < i) break;
        swap(i, j);
      }
      swap(u - 1, i);
      if (i - l < u - i) { j = l; i = i - 1; l = i + 2; }
      else { j = i + 1; i = u; u = j - 2; }
      aux(j, i);
    }
  };
  aux(1, getn(t));
}

// ---------- math ----------

// Defold's math.random is its own LCG (verified in the shipped engine by the
// parity harness): seed = seed*214013 + 2531011, r = ((seed >> 16) & 0x7fff) / 32768.
let seed = 0;

export function srand(s: number): void {
  seed = Math.trunc(s) >>> 0;
}

export function rand(): number {
  seed = (Math.imul(seed, 214013) + 2531011) >>> 0;
  return (seed >>> 16) & 0x7fff;
}

export function randomseed(s: number): void {
  srand(s);
}

/** math.random([m [, n]]) */
export function random(m?: number, n?: number): number {
  const r = rand() / 32768;
  if (m === undefined) return r;
  if (n === undefined) {
    const u = Math.trunc(m);
    if (u < 1) throw new Error("bad argument #1 to 'random' (interval is empty)");
    return Math.floor(r * u) + 1;
  }
  const l = Math.trunc(m), u = Math.trunc(n);
  if (l > u) throw new Error("bad argument #2 to 'random' (interval is empty)");
  return Math.floor(r * (u - l + 1)) + l;
}

/** For the parity harness: read and restore the generator. */
export function getRandState(): number { return seed; }
export function setRandState(s: number): void { seed = s >>> 0; }
