// What each build's env.js carries, and the keys a shipping build must have.
// Used by stage-web.mjs; separate so the tests can import it without staging.

// The keys this build ships with, from its own environment: Vercel's for the web
// and OTA bundle, the GitHub secrets for the app. The game reads them as
// import.meta.env.VITE_* (port/package.json maps each to window.OOR_ENV).
const ENV_KEYS = [
  "VITE_POSTHOG_KEY",
  "VITE_POSTHOG_HOST",
  "VITE_APPSFLYER_DEV_KEY",
  "VITE_SNOWPLOW_APP_ID",
  "VITE_SNOWPLOW_COLLECTOR",
];

/** The env.js a build ships: its keys, plus the web bundle version as game_version. */
export function envScript(env, gameVersion) {
  const values = Object.fromEntries(ENV_KEYS.map((k) => [k, (env[k] ?? "").trim()]));
  values.VITE_POSTHOG_HOST ||= "https://eu.i.posthog.com";
  values.VITE_GAME_VERSION = gameVersion;
  return `// Written by game/scripts/stage-web.mjs for this build. See game/env.js.\nwindow.OOR_ENV = ${JSON.stringify(values, null, 2)};\n`;
}

/**
 * A production build without the AppsFlyer key would ship an app (or an OTA
 * bundle) whose every paid install reads as Organic, silently. Required on
 * Vercel production and in GitHub Actions; optional everywhere else.
 */
export function missingRequiredKeys(env) {
  const required = env.VERCEL_ENV === "production" || env.GITHUB_ACTIONS === "true";
  if (!required) return [];
  return ["VITE_APPSFLYER_DEV_KEY", "VITE_POSTHOG_KEY"].filter((k) => !(env[k] ?? "").trim());
}
