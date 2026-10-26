#!/usr/bin/env node
// Copies the playable game out of game/ into game/dist/: the folder Vercel
// serves and the app shell packages (native/capacitor.config.json's webDir).
// The app's built-in copy and every OTA bundle come from this one step, so
// their files hash identically and the first update reuses nearly all of them.
//
// Run from game/: `node scripts/stage-web.mjs`.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { envScript, missingRequiredKeys } from "./web-env.mjs";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

if (!existsSync(join(ROOT, "port/main.js"))) {
  console.error("port/main.js not found — run `npm run build` in port/ first.");
  process.exit(1);
}

// Not part of what a player runs. Everything else in game/ is.
const EXCLUDE = new Set([
  "dist", // this output
  "api", // Vercel functions, deployed from game/api, never fetched as files
  "scripts", // these build scripts
  "_work",
  "archive", // asset source for tools/port/export_assets.py
  "port/assets/lua", // translation reference
  "port/main.js.map",
  "ota-version.json",
  "vercel.json",
  ".vercel",
  ".vercelignore",
  ".gitignore",
  ".DS_Store",
]);

function keep(src) {
  const rel = relative(ROOT, src).split(sep).join("/");
  if (rel === "") return true;
  if (rel.split("/").some((p) => p.startsWith(".env") || p === ".DS_Store")) return false;
  for (const x of EXCLUDE) if (rel === x || rel.startsWith(x + "/")) return false;
  return true;
}

function main() {
  const missing = missingRequiredKeys(process.env);
  if (missing.length) {
    console.error(
      `  stage: ${missing.join(", ")} empty. This build would ship without attribution or analytics.\n` +
        "  Set them in GitHub Actions secrets AND Vercel Production (Vercel builds the OTA bundle).",
    );
    process.exit(1);
  }
  rmSync(DIST, { recursive: true, force: true });
  // Entry by entry: cpSync refuses to copy a folder into its own subfolder.
  for (const name of readdirSync(ROOT)) {
    const src = join(ROOT, name);
    if (keep(src)) cpSync(src, join(DIST, name), { recursive: true, filter: keep });
  }
  const { version } = JSON.parse(readFileSync(join(ROOT, "ota-version.json"), "utf8"));
  writeFileSync(join(DIST, "env.js"), envScript(process.env, version));
  console.log(`  stage: game/ -> dist/ (game_version ${version})`);
}

main();
