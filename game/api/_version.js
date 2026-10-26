// Dotted numeric version comparison, shared by the update endpoint, the OTA
// packer and the game (port/src/systems/live-updates.ts bundles this file).
// One copy, because the endpoint and the app disagreeing about which version is
// newer means one side offers a bundle the other refuses, silently.
//
// The leading underscore keeps Vercel from deploying this as a function.

/**
 * True when `candidate` is strictly newer than `current`.
 *
 * Segments compare numerically, so "1.0.10" beats "1.0.9". Missing segments
 * read as 0, so "1.0" equals "1.0.0". Junk reads as 0, so a device reporting
 * something unparseable is offered the update instead of being stranded.
 *
 * @param {string} candidate
 * @param {string} current
 * @returns {boolean}
 */
function isNewer(candidate, current) {
  const a = String(candidate).split(".").map((n) => parseInt(n, 10) || 0);
  const b = String(current).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/**
 * Can an app shell reporting `nativeVersion` (its versionName) run this bundle?
 *
 * A bundle that calls a plugin, permission or config the installed shell lacks
 * fails whenever that thing is first touched, minutes into a session, and looks
 * like a crash. A bundle with no `min_native` runs anywhere, and an unknown
 * native version is allowed: blocking a device whose state could not be read
 * turns a reporting gap into a permanent update outage.
 *
 * @param {{ min_native?: string | null } | null | undefined} bundle
 * @param {string | null | undefined} nativeVersion
 * @returns {boolean}
 */
function bundleRunsOn(bundle, nativeVersion) {
  const min = bundle && bundle.min_native;
  if (!min) return true;
  if (!nativeVersion) return true;
  return !isNewer(min, nativeVersion);
}

module.exports = { isNewer, bundleRunsOn };
