#!/usr/bin/env node
// Packages game/dist/ (scripts/stage-web.mjs) as an over-the-air update, into
// the deployment that serves it:
//
//   dist/ota/out-of-ruin-<version>.zip   the whole bundle, the fallback path
//   dist/ota/blobs/<sha256>              every bundle file once, by content
//   dist/ota/index.json                  hosted versions + audience pointers, read by api/updates.js
//
// Previously published versions are fetched from the live site and hosted
// again, so `public` can point at any of the last `keep` versions to release or
// roll back. See docs/ota-updates.md.
//
// Run from game/: `node scripts/build-ota-bundle.mjs`.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bundleFiles, writeBlobs, deltaBytes } from "./ota-blobs.mjs";
import { writeZip } from "./zip.mjs";
import { parseRelease, checkPointers } from "./ota-release.mjs";

const zipName = (v) => `out-of-ruin-${v}.zip`;

/**
 * Host the previously published bundles again: their zip and every blob their
 * manifest names. A version missing any piece is dropped, because a device
 * offered it would fail the download. Best-effort: a first deploy has nothing
 * to copy, and checkPointers decides whether what survived is enough.
 */
async function carryForward(liveOrigin, otaDir, keep, freshVersion) {
  let previous = [];
  try {
    const res = await fetch(`${liveOrigin}/ota/index.json`, { cache: "no-store" });
    if (res.ok) previous = (await res.json())?.bundles ?? [];
  } catch {
    console.warn("  ota: no live index to carry forward (first deploy?)");
    return [];
  }
  const kept = [];
  for (const b of previous) {
    if (kept.length >= keep - 1) break;
    if (!b?.version || b.version === freshVersion) continue;
    try {
      const res = await fetch(`${liveOrigin}/ota/${zipName(b.version)}`);
      if (!res.ok) throw new Error(`zip HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const sum = createHash("sha256").update(buf).digest("hex");
      if (b.checksum && sum !== b.checksum) throw new Error("zip checksum drifted");
      for (const f of b.files ?? []) {
        const dest = join(otaDir, "blobs", f.file_hash);
        if (existsSync(dest)) continue;
        const r = await fetch(`${liveOrigin}/ota/blobs/${f.file_hash}`);
        if (!r.ok) throw new Error(`blob ${f.file_name} HTTP ${r.status}`);
        const blob = Buffer.from(await r.arrayBuffer());
        if (createHash("sha256").update(blob).digest("hex") !== f.file_hash) throw new Error(`blob ${f.file_name} drifted`);
        writeFileSync(dest, blob);
      }
      writeFileSync(join(otaDir, zipName(b.version)), buf);
      kept.push({ ...b, checksum: sum, bytes: buf.length });
      console.log(`  ota: carried forward ${b.version}`);
    } catch (e) {
      console.warn(`  ota: could not carry forward ${b.version}: ${e.message}`);
    }
  }
  return kept;
}

async function main() {
  const ROOT = process.cwd();
  const DIST = join(ROOT, "dist");
  const OTA_DIR = join(DIST, "ota");
  if (!existsSync(join(DIST, "index.html"))) {
    console.error("dist/index.html not found — run `node scripts/stage-web.mjs` first.");
    process.exit(1);
  }

  const release = parseRelease(JSON.parse(readFileSync(join(ROOT, "ota-version.json"), "utf8")));
  const { version, publicVersion, beta, keep, delta, minNative } = release;

  // From scratch, or the previous payload would be swept into this one.
  rmSync(OTA_DIR, { recursive: true, force: true });
  mkdirSync(OTA_DIR, { recursive: true });

  const files = await writeBlobs(DIST, OTA_DIR);
  const zipPath = join(OTA_DIR, zipName(version));
  writeZip(zipPath, await bundleFiles(DIST));
  const zipBytes = readFileSync(zipPath);

  const liveOrigin = process.env.OTA_LIVE_ORIGIN || "https://out-of-ruin.vercel.app";
  const carried = process.env.OTA_NO_CARRY ? [] : await carryForward(liveOrigin, OTA_DIR, keep, version);

  const entry = {
    version,
    path: `/ota/${zipName(version)}`,
    checksum: createHash("sha256").update(zipBytes).digest("hex"),
    bytes: zipBytes.length,
    builtAt: new Date().toISOString(),
    // Per bundle: a carried-forward bundle keeps the floor it was published with.
    ...(minNative ? { min_native: minNative } : {}),
    files,
  };
  const bundles = [entry, ...carried].slice(0, keep);
  checkPointers(release, bundles);

  const index = { delta, beta, public: publicVersion, bundles };
  writeFileSync(join(OTA_DIR, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

  const mb = (n) => (n / 1048576).toFixed(2);
  console.log(`  ota: ${zipName(version)} ${mb(zipBytes.length)} MB, ${files.length} files`);
  const prev = carried[0];
  if (prev?.files?.length) {
    const d = deltaBytes(files, prev.files);
    console.log(`  ota: a device on ${prev.version} downloads ${d.files} file(s), ${mb(d.bytes)} MB of ${mb(d.total)} MB`);
  }
  console.log(
    `  ota: version=${version} public=${publicVersion ?? "(none released)"} beta=${beta ?? "(none)"} ` +
      `minNative=${minNative ?? "(any)"} delta=${delta ? "on" : "OFF (zip only)"} hosted=${bundles.map((b) => b.version).join(",")}`,
  );
}

main().catch((e) => {
  console.error(`  ota: ${e.message}`);
  process.exit(1);
});
