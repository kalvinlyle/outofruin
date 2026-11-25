#!/usr/bin/env node
// @ts-check
/**
 * Out of Ruin — Audio bake pipeline.
 *
 * Reads raw Scenario outputs from `tools/audio/source/` and emits smooth,
 * naturally decaying, loudness-matched AAC-LC (.m4a) files to `game/audio/`:
 *
 *   - SFX (`game/audio/sfx/<id>.m4a` + `.meta`):
 *     - Mono 48 kHz AAC-LC 80 kbps (-movflags +faststart)
 *     - Step 0: leading-silence strip (-42 dB, 5 ms)
 *     - Step A: detect natural decay down to -48 dB (+ 0.18 s headroom) so
 *       reverb/resonance tails ring all the way out without clipping.
 *       (For short multi-hit sources, isolates the first hit cleanly.)
 *     - Step B: linear static loudness normalisation (-16 LUFS, TP -1.5 dBFS)
 *       via two-pass measurement — NEVER dynamic single-pass loudnorm, which
 *       pumps fade-out tails back up and causes abrupt cutoffs.
 *     - Step C: smooth half-sine fade-out (`curve=hsin`) applied AFTER gain,
 *       followed by 50 ms of digital silence (`apad`) so AAC frames never
 *       clip the end of the fade.
 *
 *   - Music (`game/audio/music/<id>.m4a` + `.meta`):
 *     - Stereo 48 kHz AAC-LC 96 kbps (-movflags +faststart)
 *     - Leading-silence strip + 2.0 s equal-power loop-seam crossfade
 *     - `loudnorm=I=-18:TP=-1.5:LRA=11`
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");

const SFX_OUT_DIR = resolve(REPO_ROOT, "game/audio/sfx");
const MUSIC_OUT_DIR = resolve(REPO_ROOT, "game/audio/music");
const SOURCE_DIR = resolve(REPO_ROOT, "tools/audio/source");
const MANIFEST_PATH = resolve(REPO_ROOT, "tools/audio/manifest.json");

const SFX_BITRATE = "80k";
const MUSIC_BITRATE = "96k";
const SILENCE_MISFIRE_THRESHOLD_S = 0.06;
const MIN_SFX_TRIM_S = 0.16;
const MUSIC_LOOP_XFADE_S = 2.0;

const ARG_SPEC = /** @type {const} */ ({
  "sfx-only":   { type: /** @type {const} */ ("boolean"), default: false },
  "music-only": { type: /** @type {const} */ ("boolean"), default: false },
  id:           { type: /** @type {const} */ ("string"), multiple: true },
  "dry-run":    { type: /** @type {const} */ ("boolean"), default: false },
});

async function main() {
  const { values } = parseArgs({ options: ARG_SPEC, allowPositionals: false });
  const dryRun = !!values["dry-run"];
  const idFilter = values.id ? new Set([].concat(values.id)) : null;

  if (!hasFfmpeg() && !dryRun) fail("ffmpeg not found on PATH.");

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  if (!Array.isArray(manifest.cues)) fail("manifest is missing `cues[]`");

  const cues = manifest.cues.filter((c) => !idFilter || idFilter.has(c.id));
  const sfxCues = cues.filter((c) => c.category === "sfx");
  const musicCues = cues.filter((c) => c.category === "music");

  mkdirSync(SFX_OUT_DIR, { recursive: true });
  mkdirSync(MUSIC_OUT_DIR, { recursive: true });

  const sourceIndex = buildSourceIndex();
  let totalBytes = 0;

  if (!values["music-only"]) totalBytes += bakeSfx(sfxCues, sourceIndex, dryRun);
  if (!values["sfx-only"]) totalBytes += bakeMusic(musicCues, sourceIndex, dryRun);

  console.log("");
  if (!dryRun) {
    console.log(`Bake complete — total baked payload: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  }
}

/**
 * @param {any[]} cues
 * @param {Map<string, string>} sourceIndex
 * @param {boolean} dryRun
 */
function bakeSfx(cues, sourceIndex, dryRun) {
  console.log(`Baking SFX — ${cues.length} cues (mono AAC-LC ${SFX_BITRATE}, linear gain + smooth fade)`);
  let bytes = 0;
  for (const cue of cues) {
    const src = sourceIndex.get(cue.id) ?? null;
    if (!src) {
      console.log(`  • ${cue.id} — no source file (skip)`);
      continue;
    }
    const outPath = join(SFX_OUT_DIR, `${cue.id}.m4a`);
    const singleHit = cue.single_hit !== undefined ? !!cue.single_hit : Number(cue.duration) <= 0.85;
    const r = bakeSfxFile(src, outPath, {
      id: cue.id,
      model: cue.model,
      durationHint: cue.duration,
      maxTrimS: cue.max_trim_s ?? null,
      transientAlign: !!cue.transient_align,
      warmFilter: !!cue.warm_filter,
      singleHit,
      dryRun,
    });
    if (dryRun) {
      console.log(`  [dry-run] ${cue.id} (strip ${round3(r.leadingStripped)}s / trim ${round3(r.trimS)}s)`);
      continue;
    }
    const sz = statSync(outPath).size;
    bytes += sz;
    const stripTag = r.leadingStripped > 0.01 ? `strip ${round3(r.leadingStripped)}s` : "tight-lead";
    const modeTag = singleHit ? "1st-sil" : "last-sil";
    const silenceTag = r.silenceStart === null ? "full" : `${modeTag}@${round3(r.silenceStart)}s`;
    console.log(`  ✓ ${cue.id.padEnd(22)} ${stripTag.padEnd(13)} trim=${round3(r.trimS).toFixed(2)}s fade=${round3(r.tailFade).toFixed(2)}s (${silenceTag.padEnd(16)})  ${humanSize(sz)}`);
  }
  return bytes;
}

/**
 * @param {string} src
 * @param {string} outPath
 * @param {{ id?: string, model?: string, durationHint?: number, maxTrimS?: number|null, transientAlign?: boolean, warmFilter?: boolean, singleHit?: boolean, dryRun?: boolean }} opts
 */
export function bakeSfxFile(src, outPath, opts = {}) {
  const maxTrimS = opts.maxTrimS ?? null;
  const singleHit = !!opts.singleHit;
  const sourceDurRaw = ffprobeDuration(src);
  const strippedTmp = join(tmpdir(), `oor-audio-${opts.id || "cue"}-${process.pid}-${Math.random().toString(36).slice(2)}.wav`);
  const trimmedTmp = join(tmpdir(), `oor-trim-${opts.id || "cue"}-${process.pid}-${Math.random().toString(36).slice(2)}.wav`);

  const leadFilter = opts.transientAlign
    ? "silenceremove=start_periods=1:start_threshold=-38dB:start_duration=0.004"
    : "silenceremove=start_periods=1:start_threshold=-46dB:start_duration=0.010";

  runFfmpeg(["-i", src, "-vn", "-af", leadFilter, "-y", strippedTmp], `${opts.id || "cue"}.strip`);
  let fileDur = ffprobeDuration(strippedTmp);
  if (fileDur < 0.06) {
    runFfmpeg(["-i", src, "-vn", "-af", "silenceremove=start_periods=1:start_threshold=-52dB:start_duration=0.005", "-y", strippedTmp], `${opts.id || "cue"}.strip-fb`);
    fileDur = ffprobeDuration(strippedTmp);
  }

  const leadingStripped = Math.max(0, sourceDurRaw - fileDur);
  const silenceStart = detectSilenceBoundary(strippedTmp, singleHit);
  const headroom = singleHit ? 0.14 : 0.22;

  let naturalEnd;
  if (silenceStart !== null && silenceStart > SILENCE_MISFIRE_THRESHOLD_S) {
    naturalEnd = fileDur > 0 ? Math.min(silenceStart + headroom, fileDur) : silenceStart + headroom;
  } else {
    naturalEnd = fileDur > 0 ? fileDur : MIN_SFX_TRIM_S;
  }

  let trimS = Math.max(MIN_SFX_TRIM_S, naturalEnd);
  let wasCapped = false;
  if (typeof maxTrimS === "number" && Number.isFinite(maxTrimS) && maxTrimS > 0 && trimS > maxTrimS) {
    trimS = maxTrimS;
    wasCapped = true;
  }

  // Natural decay fade: if a cue was capped before its source went silent,
  // shape it with an acoustic exponential decay starting right after the
  // transient (at 25% of length) so it sounds like a natural short decay
  // rather than a full-volume gate slamming shut.
  const tailFade = wasCapped
    ? Math.max(0.15, trimS * 0.72)
    : silenceStart === null
      ? Math.min(0.45, Math.max(0.15, trimS * 0.35))
      : Math.min(0.20, Math.max(0.08, trimS * 0.22));
  const fadeCurve = wasCapped ? "exp" : "hsin";

  if (opts.dryRun) {
    try { unlinkSync(strippedTmp); } catch { /* noop */ }
    return { trimS, tailFade, leadingStripped, silenceStart, fileDur };
  }

  // Step 1: Trim + optional warmth filter into temp WAV so we measure exact
  // loudness of the trimmed segment without dynamic loudnorm pumping the tail.
  const preFilters = [
    "aformat=sample_rates=48000:channel_layouts=mono",
    `atrim=duration=${round3(trimS)}`,
    "asetpts=PTS-STARTPTS",
  ];
  if (opts.warmFilter) {
    // Gentle warm rolloff above 3.2 kHz so chime/pluck cues never sound shrill
    preFilters.push("lowpass=f=3600:poles=1");
  }
  runFfmpeg(["-i", strippedTmp, "-vn", "-af", preFilters.join(","), "-y", trimmedTmp], `${opts.id || "cue"}.pre`);

  // Step 2: Measure loudness & true peak of the trimmed clip and compute a
  // constant linear gain (target -16 LUFS, peak capped at -1.5 dBFS).
  // Static linear gain preserves 100% of the natural acoustic decay envelope!
  const gainDb = computeLinearGainDb(trimmedTmp, -16.0, -1.5);

  // Step 3: Apply static gain FIRST, then smooth half-sine fade-out AFTER gain,
  // then 50 ms of pure digital silence (`apad`) so AAC priming never clips the fade.
  mkdirSync(dirname(outPath), { recursive: true });
  const postFilters = [`volume=${gainDb.toFixed(2)}dB`];
  if (opts.transientAlign) postFilters.push("afade=t=in:st=0:d=0.003:curve=hsin");
  postFilters.push(`afade=t=out:st=${round3(Math.max(0, trimS - tailFade))}:d=${round3(tailFade)}:curve=${fadeCurve}`);
  postFilters.push("apad=pad_dur=0.05");

  runFfmpeg(
    ["-i", trimmedTmp, "-vn", "-af", postFilters.join(","), "-c:a", "aac", "-b:a", SFX_BITRATE, "-movflags", "+faststart", "-y", outPath],
    `${opts.id || "cue"}.m4a`,
  );
  try { unlinkSync(strippedTmp); } catch { /* noop */ }
  try { unlinkSync(trimmedTmp); } catch { /* noop */ }

  const bakedDur = ffprobeDuration(outPath);
  const meta = {
    asset: humanPath(outPath),
    pipeline: `tools/audio/bake.mjs (ffmpeg mono AAC-LC ${SFX_BITRATE}, ${singleHit ? "first" : "last"}-silence -48dB trim, static linear gain ${gainDb.toFixed(1)}dB, post-gain hsin fade + 50ms pad)`,
    baked_at: new Date().toISOString(),
    cue: {
      id: opts.id || null,
      model: opts.model || null,
      source_duration_s: round3(sourceDurRaw),
      leading_silence_stripped_s: round3(leadingStripped),
      stripped_duration_s: round3(fileDur),
      silence_start_s: silenceStart === null ? null : round3(silenceStart),
      trim_s: round3(trimS),
      baked_duration_s: round3(bakedDur),
      tail_fade_s: round3(tailFade),
      gain_db: round3(gainDb),
      single_hit: singleHit,
      transient_align: !!opts.transientAlign,
      warm_filter: !!opts.warmFilter,
      manifest_duration_hint_s: opts.durationHint ?? null,
      manifest_max_trim_s: typeof maxTrimS === "number" ? maxTrimS : null,
      source: humanPath(src),
    },
  };
  writeFileSync(`${outPath}.meta`, JSON.stringify(meta, null, 2) + "\n", "utf-8");
  return { trimS, tailFade, leadingStripped, silenceStart, fileDur };
}

/**
 * Measure integrated loudness (LUFS) and max peak (dBFS) and compute a safe
 * constant linear gain that hits targetLufs without exceeding maxPeakDbfs.
 * @param {string} wavPath
 * @param {number} targetLufs
 * @param {number} maxPeakDbfs
 */
function computeLinearGainDb(wavPath, targetLufs, maxPeakDbfs) {
  let gain = 0;
  try {
    const r = spawnSync(
      "ffmpeg",
      ["-hide_banner", "-i", wavPath, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
      { encoding: "utf-8" },
    );
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    const iMatch = out.match(/"input_i"\s*:\s*"([-\d.]+)"/);
    const tpMatch = out.match(/"input_tp"\s*:\s*"([-\d.]+)"/);
    const inputI = iMatch ? Number(iMatch[1]) : NaN;
    const inputTp = tpMatch ? Number(tpMatch[1]) : NaN;
    if (Number.isFinite(inputI) && inputI > -60 && Number.isFinite(inputTp)) {
      const wantGain = targetLufs - inputI;
      const peakHeadroom = maxPeakDbfs - inputTp;
      gain = Math.min(wantGain, peakHeadroom);
      return Math.max(-18, Math.min(6, gain));
    }
  } catch { /* fallback below */ }

  // Fallback for ultra-short cues (< 0.4s) where EBU R128 gating returns -inf:
  // use volumedetect mean/max so short taps stay crisp and peak-safe!
  try {
    const r = spawnSync("ffmpeg", ["-hide_banner", "-i", wavPath, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf-8" });
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    const mean = Number((out.match(/mean_volume:\s*([-\d.]+)/) || [])[1]);
    const max = Number((out.match(/max_volume:\s*([-\d.]+)/) || [])[1]);
    if (Number.isFinite(mean) && Number.isFinite(max)) {
      const wantGain = (targetLufs - 2) - mean;
      const peakHeadroom = maxPeakDbfs - max;
      return Math.max(-18, Math.min(6, Math.min(wantGain, peakHeadroom)));
    }
  } catch { /* default 0 */ }
  return 0;
}

/**
 * @param {any[]} cues
 * @param {Map<string, string>} sourceIndex
 * @param {boolean} dryRun
 */
function bakeMusic(cues, sourceIndex, dryRun) {
  console.log(`Baking music — ${cues.length} tracks (stereo AAC-LC ${MUSIC_BITRATE})`);
  let bytes = 0;
  for (const cue of cues) {
    const src = sourceIndex.get(cue.id) ?? null;
    if (!src) {
      console.log(`  • ${cue.id} — no source file (skip)`);
      continue;
    }
    const outPath = join(MUSIC_OUT_DIR, `${cue.id}.m4a`);
    if (dryRun) {
      console.log(`  [dry-run] would write ${humanPath(outPath)}`);
      continue;
    }
    const r = bakeMusicFile(src, outPath, { id: cue.id, model: cue.model, loop: !!cue.loop });
    const sz = statSync(outPath).size;
    bytes += sz;
    console.log(`  ✓ ${cue.id.padEnd(22)} ${round3(r.dur)}s  (${r.x.toFixed(2)}s seam xfade)  ${humanSize(sz)}`);
  }
  return bytes;
}

/**
 * @param {string} src
 * @param {string} outPath
 * @param {{ id?: string, model?: string, loop?: boolean }} opts
 */
export function bakeMusicFile(src, outPath, opts = {}) {
  const strippedTmp = join(tmpdir(), `oor-music-${opts.id || "bed"}-${process.pid}-${Math.random().toString(36).slice(2)}.wav`);
  runFfmpeg(
    ["-i", src, "-vn", "-af", "silenceremove=start_periods=1:start_threshold=-50dB:start_duration=0.05", "-y", strippedTmp],
    `${opts.id || "music"}.strip`,
  );
  const dur = ffprobeDuration(strippedTmp);
  const x = Math.min(MUSIC_LOOP_XFADE_S, Math.max(0.5, dur / 6));
  const tailStart = Math.max(0, dur - x);

  const loopFilter = [
    "[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[main][tail]",
    `[main]atrim=start=0:end=${round3(tailStart)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${round3(x)}[main_body]`,
    `[tail]atrim=start=${round3(tailStart)}:end=${round3(dur)},asetpts=PTS-STARTPTS,afade=t=out:st=0:d=${round3(x)}[tail_out]`,
    "[main_body][tail_out]amix=inputs=2:duration=first:normalize=0[xfaded]",
    "[xfaded]loudnorm=I=-18:TP=-1.5:LRA=11[out]",
  ].join(";");

  mkdirSync(dirname(outPath), { recursive: true });
  runFfmpeg(
    ["-i", strippedTmp, "-vn", "-filter_complex", loopFilter, "-map", "[out]", "-c:a", "aac", "-b:a", MUSIC_BITRATE, "-movflags", "+faststart", "-y", outPath],
    `${opts.id || "music"}.m4a`,
  );
  try { unlinkSync(strippedTmp); } catch { /* noop */ }

  const bakedDur = ffprobeDuration(outPath);
  const meta = {
    asset: humanPath(outPath),
    pipeline: `tools/audio/bake.mjs (ffmpeg stereo AAC-LC ${MUSIC_BITRATE}, ${x.toFixed(2)}s loop-seam xfade, loudnorm I=-18)`,
    baked_at: new Date().toISOString(),
    cue: {
      id: opts.id || null,
      model: opts.model || null,
      loop: !!opts.loop,
      loop_xfade_s: round3(x),
      source_duration_s: round3(dur),
      baked_duration_s: round3(bakedDur),
      source: humanPath(src),
    },
  };
  writeFileSync(`${outPath}.meta`, JSON.stringify(meta, null, 2) + "\n", "utf-8");
  return { x, dur: bakedDur };
}

/**
 * Detect silence down to -48 dB so natural decay tails ring out cleanly.
 * @param {string} src
 * @param {boolean} pickFirst
 * @returns {number | null}
 */
function detectSilenceBoundary(src, pickFirst) {
  try {
    const res = spawnSync(
      "ffmpeg",
      ["-hide_banner", "-nostats", "-i", src, "-af", "silencedetect=noise=-48dB:d=0.14", "-f", "null", "-"],
      { encoding: "utf-8" },
    );
    if (res.error) return null;
    const combined = `${res.stdout || ""}${res.stderr || ""}`;
    const starts = [...combined.matchAll(/silence_start:\s*([0-9.]+)/g)]
      .map((m) => Number(m[1]))
      .filter((n) => Number.isFinite(n) && n > SILENCE_MISFIRE_THRESHOLD_S);
    if (starts.length === 0) return null;
    return pickFirst ? starts[0] : starts[starts.length - 1];
  } catch {
    return null;
  }
}

function buildSourceIndex() {
  /** @type {Map<string, string>} */
  const map = new Map();
  if (!existsSync(SOURCE_DIR)) return map;
  for (const f of readdirSync(SOURCE_DIR)) {
    if (f.endsWith(".meta")) continue;
    const dot = f.lastIndexOf(".");
    if (dot < 0) continue;
    map.set(f.slice(0, dot), join(SOURCE_DIR, f));
  }
  return map;
}

/** @param {string} src */
function ffprobeDuration(src) {
  try {
    const res = spawnSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", src],
      { encoding: "utf-8" },
    );
    if (res.error || res.status !== 0) return 0;
    const n = Number((res.stdout || "").trim());
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** @param {string[]} args @param {string} label */
function runFfmpeg(args, label) {
  const res = spawnSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"], encoding: "utf-8" });
  if (res.error) throw new Error(`ffmpeg failed for ${label}: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`ffmpeg failed for ${label} (exit ${res.status}): ${(res.stderr || "").slice(-300)}`);
}

function hasFfmpeg() {
  try {
    const res = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return !res.error && res.status === 0;
  } catch {
    return false;
  }
}

/** @param {string} p */
function humanPath(p) { return p.replace(REPO_ROOT + "/", ""); }

/** @param {number} bytes */
function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** @param {number} n */
function round3(n) { return Math.round(n * 1000) / 1000; }

/** @param {string} msg */
function fail(msg) { console.error(`[audio/bake] ${msg}`); process.exit(1); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
