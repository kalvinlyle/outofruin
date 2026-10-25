// gooey/internal/utf8.lua (also re-exported as defsave/utf8)
//
// Only the functions the game reaches are translated: utf8.sub and
// utf8.gmatch (gooey/internal/input.lua), plus utf8len / utf8charbytes which
// they call. utf8.gmatch is translated for the one pattern the game passes,
// ".", without the 330-line pattern matcher; any other pattern throws.
// Omitted: utf8.reverse, utf8.char, utf8.unicode / utf8.byte, utf8.gensub,
// utf8.find, utf8.match, utf8.gsub, utf8.dump, binsearch, classMatchGenerator,
// matcherGenerator. utf8.format/lower/upper/rep are the string library's.
//
// Lua strings are byte strings: these functions work on the UTF-8 bytes of
// the JS string, exactly as the Lua does on its bytes.
import { format, S } from '../../../lua';

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesOf(s: string): Uint8Array {
  return enc.encode(s);
}

// string.byte(s, i) on the byte array: nil when out of range.
function byteAt(b: Uint8Array, i: number): number | undefined {
  return i >= 1 && i <= b.length ? b[i - 1] : undefined;
}

// string.sub(s, i, j) on the byte array.
function byteSub(b: Uint8Array, i: number, j: number): string {
  const l = b.length;
  if (i < 0) i = l + i + 1;
  if (j < 0) j = l + j + 1;
  if (i < 1) i = 1;
  if (j > l) j = l;
  return i > j ? '' : dec.decode(b.subarray(i - 1, j));
}

function luaType(v: unknown): string {
  if (v === undefined || v === null) return 'nil';
  if (typeof v === 'object') return 'table';
  return typeof v;
}

function charbytesB(b: Uint8Array, i: number): number {
  const c = byteAt(b, i);
  if (c === undefined) throw new Error('attempt to compare nil with number');

  if (c > 0 && c <= 127) {
    return 1;
  } else if (c >= 194 && c <= 223) {
    const c2 = byteAt(b, i + 1);
    if (c2 === undefined) throw new Error("UTF-8 string terminated early");
    if (c2 < 128 || c2 > 191) throw new Error("Invalid UTF-8 character");
    return 2;
  } else if (c >= 224 && c <= 239) {
    const c2 = byteAt(b, i + 1);
    const c3 = byteAt(b, i + 2);
    if (c2 === undefined || c3 === undefined) throw new Error("UTF-8 string terminated early");
    if (c === 224 && (c2 < 160 || c2 > 191)) {
      throw new Error("Invalid UTF-8 character");
    } else if (c === 237 && (c2 < 128 || c2 > 159)) {
      throw new Error("Invalid UTF-8 character");
    } else if (c2 < 128 || c2 > 191) {
      throw new Error("Invalid UTF-8 character");
    }
    if (c3 < 128 || c3 > 191) throw new Error("Invalid UTF-8 character");
    return 3;
  } else if (c >= 240 && c <= 244) {
    const c2 = byteAt(b, i + 1);
    const c3 = byteAt(b, i + 2);
    const c4 = byteAt(b, i + 3);
    if (c2 === undefined || c3 === undefined || c4 === undefined) throw new Error("UTF-8 string terminated early");
    if (c === 240 && (c2 < 144 || c2 > 191)) {
      throw new Error("Invalid UTF-8 character");
    } else if (c === 244 && (c2 < 128 || c2 > 143)) {
      throw new Error("Invalid UTF-8 character");
    } else if (c2 < 128 || c2 > 191) {
      throw new Error("Invalid UTF-8 character");
    }
    if (c3 < 128 || c3 > 191) throw new Error("Invalid UTF-8 character");
    if (c4 < 128 || c4 > 191) throw new Error("Invalid UTF-8 character");
    return 4;
  } else {
    throw new Error("Invalid UTF-8 character");
  }
}

function utf8charbytes(s: any, i?: any): number {
  i = i ?? 1;
  if (typeof s !== 'string') {
    throw new Error("bad argument #1 to 'utf8charbytes' (string expected, got " + luaType(s) + ")");
  }
  if (typeof i !== 'number') {
    throw new Error("bad argument #2 to 'utf8charbytes' (number expected, got " + luaType(i) + ")");
  }
  return charbytesB(bytesOf(s), i);
}

function lenB(b: Uint8Array): number {
  let pos = 1;
  const bytes = b.length;
  let length = 0;
  while (pos <= bytes) {
    length = length + 1;
    pos = pos + charbytesB(b, pos);
  }
  return length;
}

function utf8len(s: any): number {
  if (typeof s !== 'string') {
    throw new Error("bad argument #1 to 'utf8len' (string expected, got " + luaType(s) + ")");
  }
  return lenB(bytesOf(s));
}

function utf8sub(s: string, i: number, j?: number): string {
  j = j ?? -1;

  const b = bytesOf(s);
  let pos = 1;
  const bytes = b.length;
  let length = 0;

  const both = i >= 0 && j >= 0;
  const l = both ? 0 : utf8len(s);
  const startChar = (i >= 0) ? i : l + i + 1;
  const endChar = (j >= 0) ? j : l + j + 1;

  if (startChar > endChar) {
    return "";
  }

  let startByte = 1, endByte = bytes;

  while (pos <= bytes) {
    length = length + 1;

    if (length === startChar) {
      startByte = pos;
    }

    pos = pos + charbytesB(b, pos);

    if (length === endChar) {
      endByte = pos - 1;
      break;
    }
  }

  if (startChar > length) startByte = bytes + 1;
  if (endChar < 1) endByte = 0;

  return byteSub(b, startByte, endByte);
}

/** utf8.gmatch(str, regex, all) for regex "." — yields each UTF-8 character. */
function* utf8gmatch(str: string, regex: string, _all?: boolean): Generator<string> {
  regex = (utf8sub(regex, 1, 1) !== '^') ? regex : '%' + regex;
  // PARITY: only the "." pattern is translated (the only one the game uses); the generic matcher is omitted.
  if (regex !== '.') throw new Error('utf8.gmatch: pattern not translated: ' + regex);
  let lastChar = 1;
  for (;;) {
    const b = bytesOf(str);
    // find "." from character lastChar: the character itself, if there is one
    let n = 0, pos = 1;
    while (pos <= b.length && n < lastChar) {
      n++;
      if (n === lastChar) break;
      pos = pos + charbytesB(b, pos);
    }
    if (pos > b.length || n < lastChar) return;
    const found1 = lastChar, found2 = lastChar;
    lastChar = found2 + 1;
    yield utf8sub(str, found1, found2);
  }
}

const utf8 = {
  len: utf8len,
  sub: utf8sub,
  charbytes: utf8charbytes,
  gmatch: utf8gmatch,
  format: format,
  lower: S.lower,
  upper: S.upper,
  rep: S.rep,
};

export default utf8;
