// Pure release rules for the OTA packer (build-ota-bundle.mjs), split out so
// the tests can import them without running a build.
import versionLib from "../api/_version.js";

const { isNewer } = versionLib;

/**
 * The versionName of the oldest app shell still installed. On a fresh install
 * the updater reports it as the running version, so a bundle at or below it is
 * never offered. Raise it only when no older shell remains.
 */
export const NATIVE_VERSION_NAME = "1.0";

const DOTTED = /^\d+(\.\d+)*$/;

/**
 * Read and check ota-version.json. Throws on anything that would publish a
 * bundle no device is offered, or a pointer at nothing.
 *
 * @param {any} d the parsed file
 */
export function parseRelease(d) {
  const version = String(d?.version ?? "");
  if (!DOTTED.test(version)) throw new Error(`ota-version.json: version "${version}" is not a dotted numeric version`);
  if (!isNewer(version, NATIVE_VERSION_NAME)) {
    throw new Error(
      `ota-version.json: version ${version} is not above the app shell's versionName ${NATIVE_VERSION_NAME}, ` +
        "so no fresh install would ever be offered it",
    );
  }
  const ptr = (k) => {
    if (d[k] == null) return null;
    const v = String(d[k]);
    if (!DOTTED.test(v)) throw new Error(`ota-version.json: ${k} "${v}" is not a dotted numeric version`);
    if (isNewer(v, version)) throw new Error(`ota-version.json: ${k} ${v} is newer than the version being built (${version})`);
    return v;
  };
  const publicVersion = ptr("public");
  const beta = ptr("beta");
  if (beta && publicVersion && isNewer(publicVersion, beta)) {
    throw new Error(`ota-version.json: beta ${beta} is behind public ${publicVersion}; set beta to null instead`);
  }
  return {
    version,
    publicVersion,
    beta,
    keep: Number.isFinite(Number(d.keep)) ? Math.max(1, Number(d.keep)) : 3,
    delta: d.delta !== false,
    minNative: d.minNative == null ? null : String(d.minNative),
  };
}

/**
 * Every pointer must name a version this deployment actually hosts. A pointer
 * at an evicted version hands every device a download that 404s, on every
 * launch, forever (match-merge shipped exactly that). Failing the build keeps
 * the previous deployment, which still hosts it, live.
 *
 * @param {{ publicVersion: string | null, beta: string | null }} release
 * @param {{ version: string }[]} bundles
 */
export function checkPointers(release, bundles) {
  const hosted = new Set(bundles.map((b) => b.version));
  for (const [k, v] of [["public", release.publicVersion], ["beta", release.beta]]) {
    if (v && !hosted.has(v)) {
      throw new Error(
        `ota-version.json: ${k} points at ${v}, which this deployment does not host ` +
          `(hosted: ${[...hosted].join(", ") || "none"}). Raise keep, or point it at a hosted version.`,
      );
    }
  }
}
