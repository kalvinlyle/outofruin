// Float32 vector math matching Defold's scalar vectormath (dmsdk/vectormath/cpp),
// every operation rounded to float32 in the same evaluation order as the C++.
import { COS_TABLE } from './tables';

export const f = Math.fround;

/** Vector4 / Point as a 4-tuple of float32 values. */
export type V4 = [number, number, number, number];
/** Column-major 4x4 matrix: m[col*4 + row]. */
export type M4 = Float64Array;

export function v4(x = 0, y = 0, z = 0, w = 0): V4 { return [f(x), f(y), f(z), f(w)]; }

export function identity(): M4 {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}
export function copyM(a: M4): M4 { return new Float64Array(a); }

/** Matrix4 * Vector4: ((c0*x + c1*y) + c2*z) + c3*w */
export function mulV4(m: M4, x: number, y: number, z: number, w: number): V4 {
  const out: V4 = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) {
    let s = f(f(m[r] * x) + f(m[4 + r] * y));
    s = f(s + f(m[8 + r] * z));
    s = f(s + f(m[12 + r] * w));
    out[r] = s;
  }
  return out;
}

/** Matrix4 * Point3 (w = 1): ((c0*x + c1*y) + c2*z) + c3 */
export function mulP3(m: M4, x: number, y: number, z: number): V4 {
  const out: V4 = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) {
    let s = f(f(m[r] * x) + f(m[4 + r] * y));
    s = f(s + f(m[8 + r] * z));
    s = f(s + m[12 + r]);
    out[r] = s;
  }
  return out;
}

export function mulM(a: M4, b: M4): M4 {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    const v = mulV4(a, b[c * 4], b[c * 4 + 1], b[c * 4 + 2], b[c * 4 + 3]);
    out[c * 4] = v[0]; out[c * 4 + 1] = v[1]; out[c * 4 + 2] = v[2]; out[c * 4 + 3] = v[3];
  }
  return out;
}

export function scaleM(sx: number, sy: number, sz: number): M4 {
  const m = new Float64Array(16);
  m[0] = f(sx); m[5] = f(sy); m[10] = f(sz); m[15] = 1;
  return m;
}

/** Matrix4 inverse (adjugate in double precision, rounded to float32). */
export function inverse(m: M4): M4 { return inverseD(m); }

function inverseD(m: M4): M4 {
  const inv = new Float64Array(16);
  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
  const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  const r = new Float64Array(16);
  for (let i = 0; i < 16; i++) r[i] = f(inv[i] / det);
  return r;
}

// ---------- dmTrigLookup ----------
export function trigCos(radians: number): number {
  const index0 = (0xffff & Math.trunc(f(radians) * (0x8000 * (1 / Math.PI)))) >>> 0;
  const t = f((index0 & 511) * 0.001953125);
  const index = 127 & (index0 >> (16 - 7));
  const v0 = COS_TABLE[index];
  const v1 = COS_TABLE[(index + 1) & 127];
  return f(f(f(1 - t) * v0) + f(t * v1));
}
export function trigSin(radians: number): number {
  return trigCos(f(f(radians) - f(Math.PI / 2)));
}

const HALF_RAD_FACTOR = f(0.008726646);

/** dmVMath::EulerToQuat (degrees, YZX) -> [x, y, z, w] */
export function eulerToQuat(x: number, y: number, z: number): V4 {
  const mask = (z !== 0 ? 4 : 0) | (y !== 0 ? 2 : 0) | (x !== 0 ? 1 : 0);
  if (mask === 0) return [0, 0, 0, 1];
  if (mask === 1 || mask === 2 || mask === 4) {
    const ha = f(f(f(x + y) + z) * HALF_RAD_FACTOR);
    const q: V4 = [0, 0, 0, trigCos(ha)];
    q[mask >> 1] = trigSin(ha);
    return q;
  }
  const t1 = f(y * HALF_RAD_FACTOR), t2 = f(z * HALF_RAD_FACTOR), t3 = f(x * HALF_RAD_FACTOR);
  const c1 = trigCos(t1), s1 = trigSin(t1), c2 = trigCos(t2), s2 = trigSin(t2), c3 = trigCos(t3), s3 = trigSin(t3);
  const c1c2 = f(c1 * c2), s2s3 = f(s2 * s3);
  const w = f(f(-f(s1 * s2s3)) + f(c1c2 * c3));
  const qx = f(f(f(s1 * s2) * c3) + f(s3 * c1c2));
  const qy = f(f(f(s1 * c2) * c3) + f(s2s3 * c1));
  const qz = f(f(-f(f(s1 * s3) * c2)) + f(f(s2 * c1) * c3));
  return [qx, qy, qz, w];
}

export function normalizeQ(q: V4): V4 {
  const n = f(f(f(f(q[0] * q[0]) + f(q[1] * q[1])) + f(q[2] * q[2])) + f(q[3] * q[3]));
  const inv = f(1 / f(Math.sqrt(n)));
  return [f(q[0] * inv), f(q[1] * inv), f(q[2] * inv), f(q[3] * inv)];
}

/** Matrix3::rotation(quat) as 3 columns of 3 */
export function quatToM3(q: V4): number[] {
  const [qx, qy, qz, qw] = q;
  const qx2 = f(qx + qx), qy2 = f(qy + qy), qz2 = f(qz + qz);
  const qxqx2 = f(qx * qx2), qxqy2 = f(qx * qy2), qxqz2 = f(qx * qz2), qxqw2 = f(qw * qx2);
  const qyqy2 = f(qy * qy2), qyqz2 = f(qy * qz2), qyqw2 = f(qw * qy2);
  const qzqz2 = f(qz * qz2), qzqw2 = f(qw * qz2);
  return [
    f(f(1 - qyqy2) - qzqz2), f(qxqy2 + qzqw2), f(qxqz2 - qyqw2),
    f(qxqy2 - qzqw2), f(f(1 - qxqx2) - qzqz2), f(qyqz2 + qxqw2),
    f(qxqz2 + qyqw2), f(qyqz2 - qxqw2), f(f(1 - qxqx2) - qyqy2),
  ];
}
