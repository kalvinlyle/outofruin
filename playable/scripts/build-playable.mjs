#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlayable } from 'playable-kit/build';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYABLE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PLAYABLE_ROOT, '..');
const CACHE = path.join(PLAYABLE_ROOT, '.assets-cache');

rmSync(CACHE, { recursive: true, force: true });
mkdirSync(path.join(CACHE, 'img'), { recursive: true });
mkdirSync(path.join(CACHE, 'audio'), { recursive: true });

// 1. Downscale real Out of Ruin art to crisp, tiny WebP files
const IMAGES = [
  { key: 'map', src: 'img/map/map_region-1.png', maxW: 540, maxH: 960, q: 78 },
  { key: 'squire', src: 'img/heroes/heroes_squire.png', maxW: 256, maxH: 256, q: 82 },
  { key: 'farmhand', src: 'img/henchmen/henchmen_farm-hand-icon.png', maxW: 160, maxH: 160, q: 82 },
  { key: 'smuggler', src: 'img/henchmen/henchmen_carrot-smuggler-icon.png', maxW: 160, maxH: 160, q: 82 },
  { key: 'carrot', src: 'img/items/items_carrot.png', maxW: 128, maxH: 128, q: 82 },
  { key: 'apple', src: 'img/items/items_apple.png', maxW: 128, maxH: 128, q: 82 },
  { key: 'coin', src: 'img/items/items_grave-coin.png', maxW: 128, maxH: 128, q: 82 },
  { key: 'chestClosed', src: 'img/lootbox/lootbox_wood-closed.png', maxW: 256, maxH: 256, q: 82 },
  { key: 'chestOpen', src: 'img/lootbox/lootbox_wood-open.png', maxW: 256, maxH: 256, q: 82 },
  { key: 'logo', src: 'img/logo_oor.png', maxW: 440, maxH: 440, q: 84 },
];

const pyScript = `
import json, sys
from PIL import Image
items = json.loads(sys.argv[1])
for it in items:
    im = Image.open(it["src"]).convert("RGBA")
    im.thumbnail((it["maxW"], it["maxH"]), Image.Resampling.LANCZOS)
    im.save(it["dst"], format="WEBP", quality=it["q"], alpha_quality=92, method=4)
`;
const imgJobs = IMAGES.map((it) => ({
  src: path.join(REPO_ROOT, it.src),
  dst: path.join(CACHE, 'img', `${it.key}.webp`),
  maxW: it.maxW,
  maxH: it.maxH,
  q: it.q,
}));
const pyBin = ['python3', '/usr/bin/python3'].find((bin) => {
  try {
    execFileSync(bin, ['-c', 'import PIL'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}) || 'python3';
execFileSync(pyBin, ['-c', pyScript, JSON.stringify(imgJobs)], { stdio: 'inherit' });

// 2. Re-encode real game audio cues to lightweight mono MP3s via ffmpeg
const AUDIO = [
  { key: 'tap', src: 'game/audio/sfx/tap_hit_1.m4a', args: ['-ac', '1', '-ar', '22050', '-b:a', '48k'] },
  { key: 'hire', src: 'game/audio/sfx/hire_single.m4a', args: ['-ac', '1', '-ar', '22050', '-b:a', '48k'] },
  { key: 'power', src: 'game/audio/sfx/power_strike.m4a', args: ['-ac', '1', '-ar', '22050', '-b:a', '48k'] },
  { key: 'chest', src: 'game/audio/sfx/chest_open.m4a', args: ['-ac', '1', '-ar', '22050', '-b:a', '48k'] },
  { key: 'fanfare', src: 'game/audio/sfx/rank_up_fanfare.m4a', args: ['-ac', '1', '-ar', '22050', '-b:a', '48k'] },
  {
    key: 'bgm',
    src: 'game/audio/music/music_homeland.m4a',
    args: ['-t', '10', '-af', 'afade=t=in:st=0:d=0.4,afade=t=out:st=9.2:d=0.8', '-ac', '1', '-ar', '22050', '-b:a', '40k'],
  },
];

const ffmpegBin = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
for (const a of AUDIO) {
  const src = path.join(REPO_ROOT, a.src);
  const dst = path.join(CACHE, 'audio', `${a.key}.mp3`);
  execFileSync(ffmpegBin, ['-y', '-loglevel', 'error', '-i', src, ...a.args, dst], { stdio: 'inherit' });
}

const assets = [
  ...IMAGES.map((it) => ({
    file: path.relative(PLAYABLE_ROOT, path.join(CACHE, 'img', `${it.key}.webp`)),
    key: `img/${it.key}.webp`,
  })),
  ...AUDIO.map((a) => ({
    file: path.relative(PLAYABLE_ROOT, path.join(CACHE, 'audio', `${a.key}.mp3`)),
    key: `audio/${a.key}.mp3`,
  })),
];

// 3. Build single-file HTML via playable-kit
const outRel = path.relative(PLAYABLE_ROOT, path.join(REPO_ROOT, 'ads/playable/out-of-ruin.html'));
const { out } = buildPlayable({
  root: PLAYABLE_ROOT,
  config: 'vite.playable.config.mjs',
  entry: 'playable.html',
  out: outRel,
  assets,
  limitMB: 5,
});

// 4. Plant Google sadbundle fuse (`<!-- </head> -->`) BEFORE `#boot` and the real `</head>`
//    so Google's parser-blocking splice lands inside a comment while `#boot` still paints FCP.
let html = readFileSync(out, 'utf8');
const bootMarker = '<div id="boot"';
const bootIdx = html.indexOf(bootMarker);
if (bootIdx === -1) {
  throw new Error('Expected #boot splash inside <head>');
}
const headCloseIdx = html.toLowerCase().indexOf('</head>');
if (headCloseIdx === -1 || bootIdx > headCloseIdx) {
  throw new Error('#boot must appear before the real </head>');
}
html = html.slice(0, bootIdx) + '<!-- </head> -->\n  ' + html.slice(bootIdx);
writeFileSync(out, html);

const finalBytes = Buffer.byteLength(html);
console.log(`▸ planted sadbundle fuse · final ${(finalBytes / 1024).toFixed(0)} KB (${out})`);
if (finalBytes > 5 * 1024 * 1024) {
  throw new Error('Playable exceeds 5 MB after fuse');
}
