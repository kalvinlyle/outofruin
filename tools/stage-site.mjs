#!/usr/bin/env node
// Copies the marketing site (index.html at the repo root, its styles, scripts
// and the images it uses) into site/public/, the folder the outofruin.com
// Vercel project serves. Only referenced images are copied: img/ also holds
// the game's source art. Run from the repo root, then deploy:
//   node tools/stage-site.mjs && vercel deploy --prod --cwd site
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "site/public");
const PAGES = ["index.html", "404.html"];
const DIRS = ["css", "js", "vendor", "fonts"];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const p of PAGES) cpSync(join(ROOT, p), join(OUT, p));
for (const d of DIRS) if (existsSync(join(ROOT, d))) cpSync(join(ROOT, d), join(OUT, d), { recursive: true });

// Images referenced by the pages (src/href="img/...") and the stylesheet (url("../img/...")).
const refs = new Set();
for (const p of PAGES) for (const m of readFileSync(join(ROOT, p), "utf8").matchAll(/(?:src|href)="(img\/[^"?#]+)"/g)) refs.add(m[1]);
for (const m of readFileSync(join(ROOT, "css/styles.css"), "utf8").matchAll(/url\(["']?\.\.\/(img\/[^"')?#]+)/g)) refs.add(m[1]);
let missing = 0;
for (const r of refs) {
  if (!existsSync(join(ROOT, r))) { console.error(`  site: missing ${r}`); missing++; continue; }
  mkdirSync(dirname(join(OUT, r)), { recursive: true });
  cpSync(join(ROOT, r), join(OUT, r));
}
if (missing) process.exit(1);
console.log(`  site: ${PAGES.length} pages, ${refs.size} images -> site/public/`);
