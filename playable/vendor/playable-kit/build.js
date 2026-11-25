// buildPlayable — assemble one self-contained playable-ad HTML from a game's
// asset manifest. Shared by every ai-asylum game; per game only the manifest
// (and a 5-line vite.playable.config.js) differs. See README for the contract
// this enforces (team-dashboard marketing rules): ONE file, ≤ 5 MB, MRAID,
// CTA, no external requests beyond mraid.js + Google Fonts.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const MIME = {
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.json': 'application/json',
};

// `</script` can only appear inside JS strings; escape it so inlined payloads
// can't terminate their own <script> element.
const scriptSafe = (s) => s.replaceAll('</script', '<\\/script');
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

/**
 * @param {object} opts
 * @param {string} opts.root         Game repo root (absolute).
 * @param {string} opts.config       Vite config path rel to root (uses playable-kit/vite's factory).
 * @param {string} opts.entry        The entry html path rel to root (must match the config's entry).
 * @param {string} opts.out          Output html path rel to root (e.g. 'ads/playable/index.html').
 * @param {Array<{file:string, key:string, mime?:string}>} [opts.assets]
 *   Runtime assets to embed: `file` rel to root, `key` the runtime path the
 *   game requests (matched exact-first then by suffix — see runtime.js).
 * @param {Record<string, unknown>} [opts.globals]   Extra window globals to inject
 *   (e.g. { __PLAYABLE_PETS__: ['cat'] }).
 * @param {Record<string, string>} [opts.forceQuery] Query params forced via
 *   history.replaceState at boot (e.g. { ad: '1' }) — ad networks host the file
 *   at arbitrary paths, so path/param-sniffing flags need this.
 * @param {number} [opts.limitMB=5]  Hard budget; the build fails above it.
 * @param {string} [opts.outDir='dist-playable'] The vite outDir (must match config).
 */
export function buildPlayable({
  root,
  config,
  entry,
  out,
  assets = [],
  globals = {},
  forceQuery = {},
  limitMB = 5,
  outDir = 'dist-playable',
}) {
  if (!root || !config || !entry || !out) {
    throw new Error('buildPlayable: root, config, entry and out are all required');
  }
  const LIMIT = limitMB * 1024 * 1024;

  console.log('▸ vite build (playable, single-file)…');
  execFileSync('npx', ['vite', 'build', '--config', config], { cwd: root, stdio: 'inherit' });

  // vite mirrors the entry's directory structure under outDir
  const builtPath = path.join(root, outDir, entry);
  if (!existsSync(builtPath)) {
    throw new Error(`buildPlayable: expected vite output at ${builtPath} — does the config's entry match?`);
  }
  let html = readFileSync(builtPath, 'utf8');

  // ---- embed the runtime asset map + globals + forced query params ----
  const map = {};
  for (const { file, key, mime } of assets) {
    const abs = path.join(root, file);
    const type = mime ?? MIME[path.extname(file).toLowerCase()];
    if (!type) throw new Error(`buildPlayable: no MIME mapping for ${file} — pass an explicit \`mime\``);
    map[key] = `data:${type};base64,${readFileSync(abs).toString('base64')}`;
  }

  const bootLines = [];
  if (Object.keys(forceQuery).length) {
    bootLines.push(
      `try{var u=new URL(location.href);${Object.entries(forceQuery)
        .map(([k, v]) => `u.searchParams.set(${JSON.stringify(k)},${JSON.stringify(v)});`)
        .join('')}history.replaceState(null,'',u);}catch(e){}`,
    );
  }
  for (const [name, value] of Object.entries(globals)) {
    bootLines.push(`window.${name}=${scriptSafe(JSON.stringify(value))};`);
  }
  const mapJson = scriptSafe(JSON.stringify(map));
  bootLines.push(`window.__PLAYABLE_ASSETS__=${mapJson};`);
  const injected = `<script>\n${bootLines.join('\n')}\n</script>`;

  // Must execute before the (inlined) game bundle: splice ahead of the first
  // module script (singlefile may add attributes, so match loosely).
  const marker = /<script type="module"[^>]*>/;
  const m = marker.exec(html);
  if (!m) throw new Error('buildPlayable: no <script type="module"> found in the built html');
  html = html.slice(0, m.index) + injected + '\n' + html.slice(m.index);

  // ---- write + budget ----
  const outAbs = path.join(root, out);
  mkdirSync(path.dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, html);
  const size = Buffer.byteLength(html);

  console.log(`▸ ${out}`);
  console.log(`  assets ${kb(mapJson.length)} · total ${kb(size)}`);
  if (size > LIMIT) {
    throw new Error(`over the ${limitMB} MB playable budget by ${kb(size - LIMIT)}`);
  }
  console.log(`✓ under budget (${kb(LIMIT - size)} headroom)`);
  return { out: outAbs, size };
}
