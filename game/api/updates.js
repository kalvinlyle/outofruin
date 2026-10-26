// POST (Capgo self-hosted contract) -> which web bundle this installed app
// should run. Called by @capgo/capacitor-updater on every launch and return to
// the app; see docs/ota-updates.md.
//
//   request  { version_name, version_build, custom_id, platform, app_id, ... }
//   response { version, url, checksum, manifest? }   download and stage this
//            { message }                             nothing to do / refused
//
// The index, the zips and the per-file blobs are static files in the same
// deployment (game/scripts/build-ota-bundle.mjs), so a bundle can never be
// advertised by one deployment and fetched from another.
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { isNewer, bundleRunsOn } = require("./_version.js");

// device_id/app_id come from an unauthenticated client. app_id is the one field
// worth gating on. Matches capacitor's appId in native/capacitor.config.json.
const APP_ID = "games.misaligned.outofruin";

async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST only — this is the Capgo update endpoint" });
    return;
  }

  let index;
  try {
    // Read per request so a redeploy is picked up without a cold start.
    const indexPath = process.env.OTA_INDEX_PATH || join(process.cwd(), "dist/ota/index.json");
    index = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    // Nothing published yet: the app keeps running the copy inside it.
    res.status(200).json({ message: "no update available" });
    return;
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (body.app_id && body.app_id !== APP_ID) {
    res.status(200).json({ message: "unknown app" });
    return;
  }
  const current = body.version_name || "0.0.0";

  // Beta is always the player's choice (the Beta updates row in settings sets
  // custom_id). With no beta running, opted-in players get the public release:
  // opting in must never mean receiving less than everyone else.
  const custom = typeof body.custom_id === "string" ? body.custom_id.trim().toLowerCase() : "";
  const wanted = custom === "beta" ? index.beta || index.public : index.public;
  if (!wanted) {
    logDecision(body, "no bundle for this audience");
    res.status(200).json({ message: "no update available" });
    return;
  }

  const bundle = (index.bundles || []).find((b) => b && b.version === wanted);
  if (!bundle) {
    // The packer refuses to publish a pointer at an unhosted version, so this
    // only happens with a hand-edited index. Serving nothing beats a 404 download.
    logDecision(body, `pointer ${wanted} not hosted`);
    res.status(200).json({ message: "no update available" });
    return;
  }

  if (!isNewer(bundle.version, current)) {
    logDecision(body, `up to date (has ${current}, offered ${bundle.version})`);
    res.status(200).json({ message: "up to date" });
    return;
  }

  // version_build is the shell's versionName. The plugin checks natively before
  // any game code runs, so refusing here is the only place that can stop a
  // bundle the shell cannot run. Still a 200: anything else makes it retry.
  if (!bundleRunsOn(bundle, body.version_build)) {
    logDecision(body, `held back (${bundle.version} needs native ${bundle.min_native}, device has ${body.version_build ?? "unknown"})`);
    res.status(200).json({ message: "app update required" });
    return;
  }

  // Absolute URLs from this request's own host, so a preview deployment serves
  // its own bundles.
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;

  // The per-file manifest keeps an update to the size of what changed: the
  // plugin reuses every file it already holds, including the ones inside the
  // app, because blobs are named by their sha256. A code fix costs kilobytes
  // instead of the full ~75 MB of art. `delta: false` in ota-version.json
  // falls back to the plain zip without a new app build.
  const useDelta = index.delta !== false;
  const manifest = !useDelta ? [] : (bundle.files || []).map((f) => ({
    file_name: f.file_name,
    file_hash: f.file_hash,
    download_url: `${origin}/ota/blobs/${f.file_hash}`,
  }));

  logDecision(body, `serving ${bundle.version}${useDelta ? "" : " (zip only)"}`, manifest.length);
  res.status(200).json({
    version: bundle.version,
    url: `${origin}${bundle.path}`,
    checksum: bundle.checksum,
    ...(manifest.length > 0 ? { manifest } : {}),
  });
}

// One line per check in the Vercel function log, beside api/stats.js's device
// reports. No device_id: the question is what it asked for and what it got.
function logDecision(body, decision, files) {
  try {
    console.log("[ota]", JSON.stringify({
      version_name: body?.version_name ?? null,
      version_build: body?.version_build ?? null,
      custom_id: body?.custom_id || "(none)",
      platform: body?.platform ?? null,
      decision,
      ...(files == null ? {} : { files }),
    }));
  } catch {
    /* logging must never break the endpoint */
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

module.exports = handler;
module.exports.APP_ID = APP_ID;
