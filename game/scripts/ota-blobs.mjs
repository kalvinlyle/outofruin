// Content-addressed file store for OTA bundles.
//
// Each bundle file is stored once under its own sha256 at dist/ota/blobs/<hash>.
// Two versions that share a file share its blob, and a file that shipped inside
// the app has the same hash as its OTA copy, so the updater's manifest download
// fetches only what genuinely changed. The textures are almost all of the
// ~75 MB and rarely change, so a code or balance fix costs kilobytes.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Directories inside dist that are not part of the web bundle. */
const NOT_BUNDLE = new Set(["ota", "store"]); // store/: the legal pages, served from the web, never fetched by the app

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/**
 * @typedef {{ file_name: string, file_hash: string, size: number }} BlobEntry
 */

/**
 * List every bundle file in `distDir`, forward-slashed and bundle-relative,
 * sorted so identical trees give identical manifests.
 *
 * @param {string} distDir
 * @returns {Promise<{ name: string, path: string }[]>}
 */
export async function bundleFiles(distDir) {
  const out = [];
  for await (const file of walk(distDir)) {
    const name = relative(distDir, file).split(sep).join("/");
    if (NOT_BUNDLE.has(name.split("/")[0])) continue;
    out.push({ name, path: file });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * Write every bundle file into `<otaDir>/blobs/<sha256>` and return the
 * manifest describing them.
 *
 * @param {string} distDir
 * @param {string} otaDir
 * @returns {Promise<BlobEntry[]>}
 */
export async function writeBlobs(distDir, otaDir) {
  const blobDir = join(otaDir, "blobs");
  await mkdir(blobDir, { recursive: true });
  /** @type {BlobEntry[]} */
  const entries = [];
  for (const { name, path } of await bundleFiles(distDir)) {
    const buf = await readFile(path);
    const hash = createHash("sha256").update(buf).digest("hex");
    const dest = join(blobDir, hash);
    if (!existsSync(dest)) await writeFile(dest, buf);
    entries.push({ file_name: name, file_hash: hash, size: buf.length });
  }
  return entries;
}

/**
 * What a device on `previous` downloads to reach `next`. Reported at build
 * time, because the bundle size and what an existing player fetches are very
 * different numbers and only the second matters.
 *
 * @param {BlobEntry[]} next
 * @param {BlobEntry[]} previous
 */
export function deltaBytes(next, previous) {
  const held = new Set(previous.map((e) => e.file_hash));
  let bytes = 0;
  let files = 0;
  for (const e of next) {
    if (held.has(e.file_hash)) continue;
    bytes += e.size;
    files += 1;
  }
  return { bytes, files, total: next.reduce((a, e) => a + e.size, 0) };
}
