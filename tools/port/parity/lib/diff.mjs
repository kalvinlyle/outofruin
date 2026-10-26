// Per-frame comparison of two run directories (out/<scenario>/<target>/).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export const THRESHOLD = 0.1;   // pixelmatch per-pixel colour threshold
export const PASS_MATCH = 0.99; // a frame passes at >= 99% matching pixels

export function listFrames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).map((f) => Number(f.slice(0, -4))).sort((a, b) => a - b);
}

const pad = (f) => String(f).padStart(5, '0');

// First differences between two canonical JSON strings, as path: a -> b lines.
export function jsonDiff(a, b, limit = 20) {
  const out = [];
  let A, B;
  try { A = JSON.parse(a); } catch { A = a; }
  try { B = JSON.parse(b); } catch { B = b; }
  (function walk(x, y, p) {
    if (out.length >= limit) return;
    const ox = x && typeof x === 'object', oy = y && typeof y === 'object';
    if (ox && oy) {
      const keys = [...new Set([...Object.keys(x), ...Object.keys(y)])].sort();
      for (const k of keys) {
        if (!(k in x)) out.push(`${p}/${k}: <missing> -> ${short(y[k])}`);
        else if (!(k in y)) out.push(`${p}/${k}: ${short(x[k])} -> <missing>`);
        else walk(x[k], y[k], p + '/' + k);
        if (out.length >= limit) return;
      }
    } else if (JSON.stringify(x) !== JSON.stringify(y)) {
      out.push(`${p || '/'}: ${short(x)} -> ${short(y)}`);
    }
  })(A, B, '');
  return out;
}

function short(v) {
  const s = JSON.stringify(v);
  return s === undefined ? 'undefined' : s.length > 120 ? s.slice(0, 117) + '...' : s;
}

export function compareFrame(dirA, dirB, frame, diffOut) {
  const fa = path.join(dirA, pad(frame) + '.png');
  const fb = path.join(dirB, pad(frame) + '.png');
  const res = { frame, match: 0, mismatched: 0, identical: false, stateEqual: false, stateDiff: '', sizeMismatch: false };
  if (!fs.existsSync(fa) || !fs.existsSync(fb)) {
    res.missing = !fs.existsSync(fa) ? 'a' : 'b';
    return res;
  }
  const bufA = fs.readFileSync(fa), bufB = fs.readFileSync(fb);
  const a = PNG.sync.read(bufA), b = PNG.sync.read(bufB);
  if (a.width !== b.width || a.height !== b.height) {
    res.sizeMismatch = true;
    res.stateDiff = `size ${a.width}x${a.height} vs ${b.width}x${b.height}`;
  } else {
    const diff = diffOut ? new PNG({ width: a.width, height: a.height }) : null;
    const n = pixelmatch(a.data, b.data, diff ? diff.data : null, a.width, a.height, { threshold: THRESHOLD, diffMask: false });
    res.mismatched = n;
    res.match = 1 - n / (a.width * a.height);
    res.identical = Buffer.compare(a.data, b.data) === 0;
    if (diffOut && n > 0) fs.writeFileSync(diffOut, PNG.sync.write(diff));
  }
  const sa = path.join(dirA, 'state', pad(frame) + '.json');
  const sb = path.join(dirB, 'state', pad(frame) + '.json');
  const ta = fs.existsSync(sa) ? fs.readFileSync(sa, 'utf8') : null;
  const tb = fs.existsSync(sb) ? fs.readFileSync(sb, 'utf8') : null;
  res.stateEqual = ta !== null && ta === tb;
  if (!res.stateEqual) res.stateDiffs = ta === null || tb === null ? [`state missing in ${ta === null ? 'a' : 'b'}`] : jsonDiff(ta, tb);
  if (res.stateDiffs) res.stateDiff = res.stateDiffs[0] || '';
  return res;
}

export function compareRuns(dirA, dirB, opts = {}) {
  const frames = [...new Set([...listFrames(dirA), ...listFrames(dirB)])].sort((a, b) => a - b);
  if (opts.diffDir) fs.mkdirSync(opts.diffDir, { recursive: true });
  const results = frames.map((f) => compareFrame(dirA, dirB, f, opts.diffDir ? path.join(opts.diffDir, pad(f) + '.png') : null));
  return { dirA, dirB, frames: results };
}
