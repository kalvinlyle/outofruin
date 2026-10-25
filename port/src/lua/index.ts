// Lua 5.1 runtime semantics for translated game code.
// import { tostring, pairs, t, os, S, T, M } from '../lua';

export * as S from './string';
export { tostring, tonumber, format } from './string';
export { pairs, pairsKeys, literal, tracked, tset, len } from './table';
import * as lib from './lib';
import { numToStr, fmtG } from './string';

/** table.* */
export const T = { insert: lib.insert, remove: lib.remove, sort: lib.sort, concat: lib.concat };

/** math.* (only the ones whose JS spelling differs or whose behaviour must match libc) */
export const M = {
  random: lib.random,
  randomseed: lib.randomseed,
  mod: lib.mod,
  /** math.pow / ^ */
  pow: Math.pow,
  huge: Infinity,
};

/** Lua truthiness: only nil and false are false. Use it wherever a value might be 0 or "". */
export function t(v: unknown): boolean {
  return v !== undefined && v !== null && v !== false;
}

/** `a .. b .. c` — numbers formatted the way Lua does (%.14g). */
export function cat(...parts: (string | number)[]): string {
  let s = '';
  for (const p of parts) {
    if (typeof p === 'number') s += numToStr(p);
    else if (typeof p === 'string') s += p;
    else throw new Error('attempt to concatenate a ' + (p === undefined || p === null ? 'nil' : typeof p) + ' value');
  }
  return s;
}

/** Lua `#` on a string: byte length of its UTF-8 encoding. */
export function strlen(s: string): number {
  return new TextEncoder().encode(s).length;
}

// ---------- os ----------
// The clock is virtual under the parity harness: Date.now / performance.now are
// injected before boot, so these read whatever the page sees.

export const os = {
  /** controller.script replaces this with socket.gettime, as the Lua did. */
  clock: (): number => performance.now() / 1000,
  /** os.time([t]) — seconds since the epoch; with a table, local time like mktime. */
  time(tbl?: { year: number; month: number; day: number; hour?: number; min?: number; sec?: number; isdst?: boolean }): number {
    if (!tbl) return Math.floor(Date.now() / 1000);
    const d = new Date(tbl.year, tbl.month - 1, tbl.day, tbl.hour ?? 12, tbl.min ?? 0, tbl.sec ?? 0);
    return Math.floor(d.getTime() / 1000);
  },
  /** os.date(format [, time]) — C strftime subset; "*t" / "!*t" return tables. */
  date(fmt = '%c', time?: number): any {
    let utc = false;
    if (fmt.startsWith('!')) { utc = true; fmt = fmt.slice(1); }
    const d = new Date((time ?? Math.floor(Date.now() / 1000)) * 1000);
    const g = {
      year: utc ? d.getUTCFullYear() : d.getFullYear(),
      month: (utc ? d.getUTCMonth() : d.getMonth()) + 1,
      day: utc ? d.getUTCDate() : d.getDate(),
      hour: utc ? d.getUTCHours() : d.getHours(),
      min: utc ? d.getUTCMinutes() : d.getMinutes(),
      sec: utc ? d.getUTCSeconds() : d.getSeconds(),
      wday: (utc ? d.getUTCDay() : d.getDay()) + 1,
      yday: 0,
      isdst: false,
    };
    const start = utc ? Date.UTC(g.year, 0, 1) : new Date(g.year, 0, 1).getTime();
    const cur = utc ? Date.UTC(g.year, g.month - 1, g.day) : new Date(g.year, g.month - 1, g.day).getTime();
    g.yday = Math.round((cur - start) / 86400000) + 1;
    if (fmt === '*t') return g;
    const p2 = (n: number) => String(n).padStart(2, '0');
    // ISO 8601 week number
    const isoWeek = () => {
      const dt = new Date(Date.UTC(g.year, g.month - 1, g.day));
      const dayNum = (dt.getUTCDay() + 6) % 7;
      dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
      const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
      return 1 + Math.round(((dt.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
    };
    return fmt.replace(/%([a-zA-Z%])/g, (_, c: string) => {
      switch (c) {
        case 'Y': return String(g.year);
        case 'y': return p2(g.year % 100);
        case 'm': return p2(g.month);
        case 'd': return p2(g.day);
        case 'H': return p2(g.hour);
        case 'M': return p2(g.min);
        case 'S': return p2(g.sec);
        case 'j': return String(g.yday).padStart(3, '0');
        case 'V': return p2(isoWeek());
        case '%': return '%';
        default: throw new Error('os.date: unsupported %' + c);
      }
    });
  },
  remove(_path: string): [boolean | undefined, string?] { return [undefined, 'not supported']; },
  rename(_a: string, _b: string): [boolean | undefined, string?] { return [undefined, 'not supported']; },
};

export { numToStr, fmtG };
