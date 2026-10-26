// POST -> 200. Sink for @capgo/capacitor-updater's device-side events
// (download_complete, download_fail, checksum_fail, unzip_fail, set, set_fail,
// update_fail, app_launch_timeout), which would otherwise go to Capgo's cloud.
// One line each in the Vercel function log, next to api/updates.js's decisions,
// so one stream shows what a device was offered and what it then did with it.

const KEEP = [
  "action",
  "version_name",
  "old_version_name",
  "version_build",
  "version_os",
  "plugin_version",
  "platform",
  "custom_id",
];

async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST only — this is the Capgo stats endpoint" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const line = {};
    for (const k of KEEP) {
      if (body[k] !== undefined && body[k] !== null && body[k] !== "") line[k] = body[k];
    }
    if (body.message) line.message = String(body.message).slice(0, 300);
    console.log("[ota-stats]", JSON.stringify(line));
  } catch {
    // A malformed body is not worth failing over.
  }
  // Always 200: the plugin retries failed stats posts, and nothing here is
  // worth making a device retry.
  res.status(200).json({ ok: true });
}

module.exports = handler;
