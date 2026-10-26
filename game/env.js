// Build-time keys the game reads as import.meta.env.VITE_* (port's esbuild maps
// each one here). This committed copy is empty, so local play sends nothing;
// game/scripts/stage-web.mjs writes dist/env.js from the environment of the build
// that ships: Vercel for the web and OTA bundle, GitHub Actions for the app.
window.OOR_ENV = {
  VITE_POSTHOG_KEY: "",
  VITE_POSTHOG_HOST: "https://eu.i.posthog.com",
  VITE_APPSFLYER_DEV_KEY: "",
  VITE_SNOWPLOW_APP_ID: "",
  VITE_SNOWPLOW_COLLECTOR: "",
  VITE_GAME_VERSION: "",
};
