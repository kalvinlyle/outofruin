// Build keys, read as literal import.meta.env.VITE_* member accesses. port/package.json's
// build maps each one onto window.OOR_ENV, which game/scripts/stage-web.mjs writes per build.
interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_HOST: string;
  readonly VITE_APPSFLYER_DEV_KEY: string;
  readonly VITE_SNOWPLOW_APP_ID: string;
  readonly VITE_SNOWPLOW_COLLECTOR: string;
  readonly VITE_GAME_VERSION: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
