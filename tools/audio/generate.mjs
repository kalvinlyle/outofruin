#!/usr/bin/env node
// @ts-check
/**
 * Out of Ruin — Audio asset generator (Scenario API).
 *
 * Reads `tools/audio/manifest.json`, calls Scenario's `/v1/generate/custom/{modelId}`
 * per cue, polls until complete, downloads raw audio to `tools/audio/source/<id>.<ext>`,
 * and writes a `.meta` provenance sidecar.
 *
 * Usage:
 *   node tools/audio/generate.mjs                       # generate missing cues
 *   node tools/audio/generate.mjs --category sfx        # SFX only
 *   node tools/audio/generate.mjs --category music      # music only
 *   node tools/audio/generate.mjs --id tap_hit_1        # single cue
 *   node tools/audio/generate.mjs --force               # regenerate existing
 *   node tools/audio/generate.mjs --concurrency 4       # parallel jobs
 *   node tools/audio/generate.mjs --dry-run             # plan only
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { writeFile as writeFileAsync } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");

const API_BASE = "https://api.cloud.scenario.com/v1";

const ARG_SPEC = /** @type {const} */ ({
  manifest:        { type: /** @type {const} */ ("string"), default: "tools/audio/manifest.json" },
  out:             { type: /** @type {const} */ ("string"), default: "tools/audio/source" },
  category:        { type: /** @type {const} */ ("string") },
  id:              { type: /** @type {const} */ ("string"), multiple: true },
  concurrency:     { type: /** @type {const} */ ("string"), default: "4" },
  "poll-interval": { type: /** @type {const} */ ("string"), default: "3" },
  timeout:         { type: /** @type {const} */ ("string"), default: "600" },
  force:           { type: /** @type {const} */ ("boolean"), default: false },
  "dry-run":       { type: /** @type {const} */ ("boolean"), default: false },
  verbose:         { type: /** @type {const} */ ("boolean"), default: false },
});

async function main() {
  const { values } = parseArgs({ options: ARG_SPEC, allowPositionals: false });

  const manifestPath = resolve(REPO_ROOT, String(values.manifest));
  const outDir = resolve(REPO_ROOT, String(values.out));
  const concurrency = Math.max(1, Number(values.concurrency) || 4);
  const pollIntervalMs = (Number(values["poll-interval"]) || 3) * 1000;
  const timeoutMs = (Number(values.timeout) || 600) * 1000;
  const force = !!values.force;
  const dryRun = !!values["dry-run"];
  const verbose = !!values.verbose;

  if (!existsSync(manifestPath)) fail(`manifest not found: ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  if (!Array.isArray(manifest.cues)) fail("manifest is missing `cues[]`");

  const categoryFilter = values.category ? String(values.category) : null;
  const idFilter = values.id ? new Set([].concat(values.id)) : null;

  /** @type {ManifestCue[]} */
  const selected = manifest.cues.filter((cue) => {
    if (categoryFilter && cue.category !== categoryFilter) return false;
    if (idFilter && !idFilter.has(cue.id)) return false;
    return true;
  });

  if (selected.length === 0) {
    console.log("Nothing to generate (filters matched zero cues).");
    return;
  }

  mkdirSync(outDir, { recursive: true });
  console.log(`Audio generator — ${selected.length} cue${selected.length === 1 ? "" : "s"} selected (concurrency=${concurrency})`);
  if (dryRun) {
    for (const cue of selected) {
      console.log(`  [dry-run] ${cue.id} (${cue.category}, ${cue.model}, ${cue.duration}s)`);
    }
    return;
  }

  const auth = getAuthHeader();
  const written = [];
  const skipped = [];
  const failed = [];

  let cursor = 0;
  async function worker() {
    while (cursor < selected.length) {
      const cue = selected[cursor++];
      try {
        const result = await generateOne(cue, { outDir, auth, pollIntervalMs, timeoutMs, force, verbose });
        if (result) {
          written.push({ cue, path: result.path });
          console.log(`  ✓ ${cue.id} → ${result.path.replace(REPO_ROOT + "/", "")}`);
        } else {
          skipped.push(cue);
          console.log(`  • ${cue.id} (exists; --force to redo)`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        failed.push({ cue, error: msg });
        console.log(`  ✗ ${cue.id}: ${msg}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, worker));

  console.log("");
  console.log(`Done — ${written.length} written, ${skipped.length} skipped, ${failed.length} failed`);
  if (failed.length > 0) process.exit(1);
}

/**
 * @typedef {{
 *   id: string,
 *   category: "sfx" | "music",
 *   model: string,
 *   prompt: string,
 *   duration: number,
 *   loop?: boolean,
 *   seed?: number,
 *   max_trim_s?: number,
 *   transient_align?: boolean,
 * }} ManifestCue
 */

/**
 * @param {ManifestCue} cue
 * @param {{ outDir: string, auth: string, pollIntervalMs: number, timeoutMs: number, force: boolean, verbose: boolean }} opts
 */
async function generateOne(cue, opts) {
  if (!opts.force) {
    try {
      const dirContents = readdirSync(opts.outDir);
      if (dirContents.some((f) => f.startsWith(`${cue.id}.`) && f.endsWith(".meta"))) {
        return null;
      }
    } catch { /* dir missing */ }
  }

  /** @type {Record<string, any>} */
  const payload = { prompt: cue.prompt };
  if (cue.model === "model_elevenlabs-music") {
    payload.durationSeconds = Math.min(600, Math.max(3, Math.round(cue.duration)));
    payload.forceInstrumental = true;
    payload.outputFormat = "mp3_44100_192";
  } else if (cue.model.includes("elevenlabs-sound-effects")) {
    payload.text = cue.prompt;
    payload.duration_seconds = cue.duration;
    if (cue.loop) payload.loop = true;
  } else {
    payload.duration = cue.duration;
    if (cue.loop) payload.loop = true;
  }
  if (typeof cue.seed === "number") payload.seed = cue.seed;

  if (opts.verbose) console.log(`  → submitting ${cue.id} (${cue.model})`);

  const submitRes = await fetch(`${API_BASE}/generate/custom/${cue.model}`, {
    method: "POST",
    headers: { Authorization: opts.auth, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!submitRes.ok) {
    throw new Error(`submit HTTP ${submitRes.status} — ${await safeText(submitRes)}`);
  }
  const submitJson = await submitRes.json();
  const jobId = submitJson?.job?.jobId;
  if (!jobId) throw new Error(`submit returned no jobId (${JSON.stringify(submitJson).slice(0, 200)})`);

  const startedAt = Date.now();
  let assetUrl = null;
  let assetId = null;
  while (Date.now() - startedAt < opts.timeoutMs) {
    await sleep(opts.pollIntervalMs);
    const jobRes = await fetch(`${API_BASE}/jobs/${jobId}`, {
      headers: { Authorization: opts.auth },
    });
    if (!jobRes.ok) throw new Error(`poll HTTP ${jobRes.status}`);
    const job = (await jobRes.json())?.job ?? {};
    const status = job.status ?? "unknown";
    if (status === "failure" || status === "cancelled") {
      throw new Error(`job ${status}: ${JSON.stringify(job).slice(0, 200)}`);
    }
    if (status === "success") {
      const assetIds = job?.metadata?.assetIds ?? [];
      if (assetIds.length === 0) throw new Error("job succeeded but returned no assetIds");
      assetId = assetIds[0];
      const assetRes = await fetch(`${API_BASE}/assets/${assetId}`, {
        headers: { Authorization: opts.auth },
      });
      if (!assetRes.ok) throw new Error(`asset fetch HTTP ${assetRes.status}`);
      const assetJson = await assetRes.json();
      assetUrl = assetJson?.asset?.url;
      if (!assetUrl) throw new Error("asset has no url");
      break;
    }
    if (opts.verbose) {
      const elapsedS = Math.round((Date.now() - startedAt) / 1000);
      console.log(`    ${cue.id}: ${status} (${elapsedS}s)`);
    }
  }
  if (!assetUrl) throw new Error("timed out polling job");

  const dlRes = await fetch(assetUrl);
  if (!dlRes.ok) throw new Error(`download HTTP ${dlRes.status}`);
  const buffer = Buffer.from(await dlRes.arrayBuffer());

  const ext = guessExt(assetUrl, dlRes.headers.get("content-type"));
  const outPath = join(opts.outDir, `${cue.id}.${ext}`);
  const sidecarPath = `${outPath}.meta`;
  await writeFileAsync(outPath, buffer);

  const meta = {
    schema: 1,
    asset: `tools/audio/source/${cue.id}.${ext}`,
    category: cue.category,
    bytes: buffer.length,
    duration_s_hint: cue.duration,
    loop: !!cue.loop,
    "scenario:model": cue.model,
    "scenario:prompt": cue.prompt,
    "scenario:job_id": jobId,
    "scenario:asset_id": assetId,
    "scenario:cdn_url": assetUrl,
    "scenario:seed": typeof cue.seed === "number" ? cue.seed : null,
    "scenario:created_at": new Date().toISOString(),
    processing: [],
  };
  writeFileSync(sidecarPath, JSON.stringify(meta, null, 2) + "\n", "utf-8");

  return { path: outPath, sidecar: sidecarPath };
}

function getAuthHeader() {
  let key = process.env.SCENARIO_API_KEY;
  let secret = process.env.SCENARIO_API_SECRET;
  if ((!key || !secret) && hasOpCli()) {
    try {
      key ||= opRead("op://Secrets/Scenario/SCENARIO_API_KEY");
      secret ||= opRead("op://Secrets/Scenario/SCENARIO_API_SECRET");
    } catch { /* fall through */ }
  }
  if (!key || !secret) {
    fail("SCENARIO_API_KEY / SCENARIO_API_SECRET missing (check 1Password `op://Secrets/Scenario/...`).");
  }
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

function hasOpCli() {
  try {
    execSync("command -v op", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** @param {string} ref */
function opRead(ref) {
  return execSync(`op read '${ref.replace(/'/g, "'\\''")}'`, { stdio: ["ignore", "pipe", "ignore"] })
    .toString("utf-8")
    .trim();
}

/** @param {Response} res */
async function safeText(res) {
  try { return (await res.text()).slice(0, 400); } catch { return "(unreadable body)"; }
}

/** @param {number} ms */
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** @param {string} url @param {string | null} contentType */
function guessExt(url, contentType) {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("mpeg")) return "mp3";
  if (ct.includes("wav")) return "wav";
  if (ct.includes("ogg")) return "ogg";
  if (ct.includes("mp4") || ct.includes("aac") || ct.includes("m4a")) return "m4a";
  const m = url.match(/\.([a-zA-Z0-9]{2,4})(?:\?|$)/);
  return m ? m[1].toLowerCase() : "mp3";
}

/** @param {string} msg */
function fail(msg) {
  console.error(`[audio/generate] ${msg}`);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
