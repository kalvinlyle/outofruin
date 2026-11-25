import { assetUrl } from 'playable-kit/runtime';

// Store listing destination — deterministic Play URL for Out of Ruin.
const STORE_URL = 'https://play.google.com/store/apps/details?id=games.misaligned.outofruin';

// Predefined AppLovin playable analytics event constants (exact uppercase names, never COMPLETED).
const EV = {
  LOADING: 'LOADING',
  LOADED: 'LOADED',
  DISPLAYED: 'DISPLAYED',
  CHALLENGE_STARTED: 'CHALLENGE_STARTED',
  CHALLENGE_PASS_25: 'CHALLENGE_PASS_25',
  CHALLENGE_PASS_50: 'CHALLENGE_PASS_50',
  CHALLENGE_PASS_75: 'CHALLENGE_PASS_75',
  CHALLENGE_SOLVED: 'CHALLENGE_SOLVED',
  ENDCARD_SHOWN: 'ENDCARD_SHOWN',
  CTA_CLICKED: 'CTA_CLICKED',
};

const firedOnce = new Set();

function track(event) {
  if (typeof window.ALPlayableAnalytics === 'undefined') return;
  try {
    window.ALPlayableAnalytics.trackEvent(event);
  } catch (e) {}
}

function trackOnce(event) {
  if (firedOnce.has(event)) return;
  firedOnce.add(event);
  track(event);
}

// First line of playable boot code.
trackOnce(EV.LOADING);

function openStore() {
  track(EV.CTA_CLICKED);
  try {
    if (window.ExitApi && typeof window.ExitApi.exit === 'function') {
      window.ExitApi.exit();
      return;
    }
  } catch (e) {}
  try {
    if (window.mraid && typeof window.mraid.open === 'function') {
      window.mraid.open(STORE_URL);
      return;
    }
  } catch (e) {}
  try {
    if (window.FbPlayableAd && typeof window.FbPlayableAd.onCTAClick === 'function') {
      window.FbPlayableAd.onCTAClick();
      return;
    }
  } catch (e) {}
  try {
    if (typeof window.onCTAClick === 'function') {
      window.onCTAClick();
      return;
    }
  } catch (e) {}
  try {
    if (typeof window.install === 'function') {
      window.install();
      return;
    }
  } catch (e) {}
  try {
    window.open(STORE_URL, '_blank');
  } catch (e) {}
}

// ---------- Audio: 100% silent until first user gesture; pause/suspend when hidden ----------
const audio = {
  unlocked: false,
  muted: false,
  ctx: null,
  buffers: {},
  bgmEl: null,
  decodePromise: null,
};

function dataUrlToArrayBuffer(url) {
  const comma = url.indexOf(',');
  const b64 = comma >= 0 ? url.slice(comma + 1) : url;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function ensureAudioUnlocked() {
  if (audio.unlocked) {
    if (!audio.muted && audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume().catch(() => {});
    }
    if (!audio.muted && audio.bgmEl && audio.bgmEl.paused) {
      audio.bgmEl.play().catch(() => {});
    }
    return;
  }
  audio.unlocked = true;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audio.ctx = new AudioCtx();
      if (audio.ctx.state === 'suspended') {
        audio.ctx.resume().catch(() => {});
      }
      const sfxKeys = ['tap', 'hire', 'power', 'chest', 'fanfare'];
      audio.decodePromise = Promise.all(
        sfxKeys.map((k) => {
          const src = assetUrl(`audio/${k}.mp3`);
          if (!src || !src.startsWith('data:')) return Promise.resolve();
          return audio.ctx
            .decodeAudioData(dataUrlToArrayBuffer(src))
            .then((buf) => {
              audio.buffers[k] = buf;
            })
            .catch(() => {});
        }),
      );
    }
    const bgmSrc = assetUrl('audio/bgm.mp3');
    if (bgmSrc && bgmSrc.startsWith('data:')) {
      const el = new Audio(bgmSrc);
      el.loop = true;
      el.volume = 0.24;
      audio.bgmEl = el;
      if (!audio.muted && !document.hidden) {
        el.play().catch(() => {});
      }
    }
  } catch (e) {}
}

function playSfx(name, vol = 0.65) {
  if (!audio.unlocked || audio.muted || document.hidden || !audio.ctx) return;
  const buf = audio.buffers[name];
  if (!buf) return;
  try {
    const src = audio.ctx.createBufferSource();
    const gain = audio.ctx.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(audio.ctx.destination);
    src.start(0);
  } catch (e) {}
}

function suspendAudio() {
  try {
    if (audio.bgmEl && !audio.bgmEl.paused) audio.bgmEl.pause();
    if (audio.ctx && audio.ctx.state === 'running') audio.ctx.suspend().catch(() => {});
  } catch (e) {}
}

function resumeAudioIfAllowed() {
  if (!audio.unlocked || audio.muted || document.hidden) return;
  try {
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
    if (audio.bgmEl && audio.bgmEl.paused) audio.bgmEl.play().catch(() => {});
  } catch (e) {}
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspendAudio();
  else resumeAudioIfAllowed();
});
window.addEventListener('blur', suspendAudio);
window.addEventListener('pagehide', suspendAudio);
window.addEventListener('focus', resumeAudioIfAllowed);

// ---------- Assets ----------
const IMG_KEYS = [
  'map',
  'squire',
  'farmhand',
  'smuggler',
  'carrot',
  'apple',
  'coin',
  'chestClosed',
  'chestOpen',
  'logo',
];
const imgs = {};

function loadImages() {
  return Promise.all(
    IMG_KEYS.map(
      (k) =>
        new Promise((resolve) => {
          const im = new Image();
          im.onload = () => {
            imgs[k] = im;
            resolve();
          };
          im.onerror = () => resolve();
          im.src = assetUrl(`img/${k}.webp`);
        }),
    ),
  );
}

// ---------- Game state ----------
const state = {
  started: false,
  elapsed: 0, // starts ONLY after first user interaction
  taps: 0,
  carrots: 0,
  apples: 0,
  gold: 0,
  farmProgress: 0,
  cellarProgress: 0,
  farmHands: 0,
  cellarHands: 0,
  cellarUnlocked: false,
  heroCharge: 0, // 0..100
  heroReady: false,
  heroUsed: false,
  chestReady: false,
  chestOpened: false,
  chestAnim: 0,
  endCard: false,
  endCardAlpha: 0,
  shake: 0,
  flash: 0,
  pulse: 0,
  particles: [],
  floats: [],
  buttons: [],
};

function spawnParticles(x, y, imgKey, count, spread = 130) {
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
    const sp = 110 + Math.random() * spread;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      size: 24 + Math.random() * 14,
      imgKey,
      life: 0,
      maxLife: 0.75 + Math.random() * 0.35,
      rot: (Math.random() - 0.5) * 0.6,
      vrot: (Math.random() - 0.5) * 5,
    });
  }
}

function spawnFloat(x, y, text, color = '#fff7d6') {
  state.floats.push({ x, y, text, color, life: 0, maxLife: 0.9 });
}

function farmHireCost() {
  return state.farmHands === 0 ? 15 : 25 + state.farmHands * 15;
}

function cellarUnlockCost() {
  return 45;
}

function cellarHireCost() {
  return 20 + state.cellarHands * 20;
}

function addCarrots(amount, x, y) {
  state.carrots += amount;
  state.heroCharge = Math.min(100, state.heroCharge + amount * 1.2);
  if (state.cellarUnlocked && state.heroCharge >= 100 && !state.heroUsed) {
    state.heroReady = true;
  }
  spawnParticles(x, y, 'carrot', Math.min(5, Math.max(2, Math.ceil(amount / 4))));
  spawnFloat(x, y - 16, `+${amount} Carrots`, '#ffcb57');
  if (state.taps >= 3 && state.carrots >= 15) {
    trackOnce(EV.CHALLENGE_PASS_25);
  }
}

function addApples(amount, x, y) {
  state.apples += amount;
  state.gold += amount * 2;
  state.heroCharge = Math.min(100, state.heroCharge + amount * 2.2);
  if (state.heroCharge >= 100 && !state.heroUsed) {
    state.heroReady = true;
  }
  spawnParticles(x, y, 'apple', 4);
  spawnFloat(x, y - 16, `+${amount} Apples`, '#9ff26b');
}

function handleTapFarm(cx, cy) {
  if (!state.started) {
    state.started = true;
    trackOnce(EV.CHALLENGE_STARTED);
  }
  state.taps += 1;
  state.farmProgress += 0.36;
  state.shake = Math.max(state.shake, 4);
  playSfx('tap', 0.65);
  if (state.farmProgress >= 1) {
    state.farmProgress -= 1;
    addCarrots(6 + state.farmHands * 3, cx, cy);
  } else {
    addCarrots(5 + state.farmHands * 2, cx, cy);
  }
}

function handleHireFarm(cx, cy) {
  const cost = farmHireCost();
  if (state.carrots < cost) return;
  state.carrots -= cost;
  state.farmHands += 1;
  playSfx('hire', 0.7);
  spawnParticles(cx, cy, 'farmhand', 4, 100);
  spawnFloat(cx, cy - 20, 'Farm Hand Hired!', '#7ef29d');
  if (state.farmHands >= 1 && state.cellarUnlocked) {
    trackOnce(EV.CHALLENGE_PASS_50);
  }
}

function handleUnlockOrTapCellar(cx, cy) {
  if (!state.cellarUnlocked) {
    const cost = cellarUnlockCost();
    if (state.carrots < cost) return;
    state.carrots -= cost;
    state.cellarUnlocked = true;
    state.cellarHands = 1;
    state.heroCharge = Math.max(state.heroCharge, 72);
    playSfx('hire', 0.8);
    spawnParticles(cx, cy, 'apple', 8, 160);
    spawnFloat(cx, cy - 18, 'CELLAR UNLOCKED!', '#ffe066');
    trackOnce(EV.CHALLENGE_PASS_50);
    return;
  }
  const hireCost = cellarHireCost();
  if (state.apples >= hireCost) {
    state.apples -= hireCost;
    state.cellarHands += 1;
    playSfx('hire', 0.7);
    spawnParticles(cx, cy, 'smuggler', 4, 110);
    spawnFloat(cx, cy - 18, 'Crew Upgraded!', '#7ef29d');
  } else {
    state.cellarProgress += 0.5;
    playSfx('tap', 0.65);
    if (state.cellarProgress >= 1) {
      state.cellarProgress -= 1;
      addApples(8 + state.cellarHands * 4, cx, cy);
    } else {
      addApples(5 + state.cellarHands * 2, cx, cy);
    }
  }
}

function handleHeroPower(cx, cy) {
  if (!state.heroReady || state.heroUsed) return;
  state.heroUsed = true;
  state.heroReady = false;
  state.flash = 0.85;
  state.shake = 14;
  state.carrots += 50;
  state.apples += 35;
  state.gold += 120;
  state.chestReady = true;
  playSfx('power', 0.85);
  spawnParticles(cx, cy, 'coin', 14, 210);
  spawnFloat(cx, cy - 26, 'SQUIRE STRIKE! +120 GOLD', '#ffe86b');
  trackOnce(EV.CHALLENGE_PASS_75);
}

function handleOpenChest(cx, cy) {
  if (!state.chestReady || state.chestOpened) return;
  state.chestOpened = true;
  state.chestAnim = 0;
  state.gold += 250;
  state.flash = 0.9;
  state.shake = 12;
  playSfx('chest', 0.85);
  setTimeout(() => playSfx('fanfare', 0.8), 280);
  spawnParticles(cx, cy, 'coin', 22, 240);
  spawnParticles(cx, cy, 'carrot', 8, 180);
  spawnParticles(cx, cy, 'apple', 8, 180);
  spawnFloat(cx, cy - 30, 'CHAPTER 1 CLEARED!', '#fff3a1');
  trackOnce(EV.CHALLENGE_SOLVED);
}

function resetPlayable() {
  state.elapsed = 0;
  state.taps = 0;
  state.carrots = 0;
  state.apples = 0;
  state.gold = 0;
  state.farmProgress = 0;
  state.cellarProgress = 0;
  state.farmHands = 0;
  state.cellarHands = 0;
  state.cellarUnlocked = false;
  state.heroCharge = 0;
  state.heroReady = false;
  state.heroUsed = false;
  state.chestReady = false;
  state.chestOpened = false;
  state.chestAnim = 0;
  state.endCard = false;
  state.endCardAlpha = 0;
  state.particles.length = 0;
  state.floats.length = 0;
}

// ---------- Canvas & Responsive Layout ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let viewW = 390;
let viewH = 844;
let dpr = 1;

function resize() {
  viewW = Math.max(240, window.innerWidth);
  viewH = Math.max(240, window.innerHeight);
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
}
window.addEventListener('resize', resize);
resize();

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawButton(id, x, y, w, h, opts) {
  state.buttons.push({ id, x, y, w, h, onClick: opts.onClick, disabled: !!opts.disabled });
  const pulse = opts.glow ? 1 + Math.sin(state.pulse * 6) * 0.025 : 1;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-w / 2, -h / 2);

  if (opts.glow) {
    ctx.shadowColor = opts.glowColor || 'rgba(255, 206, 68, 0.7)';
    ctx.shadowBlur = 18;
  }
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (opts.disabled) {
    grad.addColorStop(0, '#5a616d');
    grad.addColorStop(1, '#3d434d');
  } else {
    grad.addColorStop(0, opts.top || '#ffbe3d');
    grad.addColorStop(1, opts.bottom || '#d87812');
  }
  roundRect(0, 0, w, h, opts.radius || 14);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.lineWidth = opts.glow ? 3 : 2;
  ctx.strokeStyle = opts.disabled ? '#727a88' : opts.border || '#fff0b3';
  ctx.stroke();

  ctx.fillStyle = opts.disabled ? '#c2c8d2' : opts.textColor || '#261404';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${opts.fontSize || 17}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  if (opts.sub) {
    ctx.fillText(opts.label, w / 2, h * 0.39);
    ctx.font = `700 ${Math.max(11, (opts.fontSize || 17) - 4)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = opts.disabled ? '#a7b0bd' : opts.subColor || '#4d2807';
    ctx.fillText(opts.sub, w / 2, h * 0.72);
  } else {
    ctx.fillText(opts.label, w / 2, h / 2 + 1);
  }
  ctx.restore();
}

function drawHandHint(x, y) {
  const bob = Math.sin(state.pulse * 7) * 7;
  ctx.save();
  ctx.translate(x, y + bob);
  // Crisp golden pointer badge
  ctx.fillStyle = 'rgba(255, 232, 118, 0.96)';
  ctx.strokeStyle = '#3b2106';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3b2106';
  ctx.font = '900 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAP', 0, 1);
  ctx.restore();
}

function getObjectiveText() {
  if (state.chestOpened) return 'Kingdom Reclaimed! Claim your reward!';
  if (state.chestReady) return 'TAP THE TREASURE CHEST to finish Chapter 1!';
  if (state.heroReady) return 'SQUIRE POWER READY! Tap the glowing hero card!';
  if (!state.started) return 'Tap EXPLORE FARM to gather Carrots!';
  if (state.farmHands === 0) {
    const need = Math.max(0, farmHireCost() - state.carrots);
    return need > 0 ? `Gather ${need} more Carrots to hire a Farm Hand` : 'Hire a FARM HAND to loot automatically!';
  }
  if (!state.cellarUnlocked) {
    const need = Math.max(0, cellarUnlockCost() - state.carrots);
    return need > 0 ? `Collect ${need} more Carrots to unlock the Cellar` : 'Unlock the CELLAR dungeon below!';
  }
  return 'Tap dungeons to charge SQUIRE POWER!';
}

function render(dt) {
  state.pulse += dt;
  if (state.started && !state.endCard) {
    state.elapsed += dt;
    // Auto-production from hired henchmen
    if (state.farmHands > 0) {
      state.farmProgress += dt * (0.42 + state.farmHands * 0.25);
      if (state.farmProgress >= 1) {
        state.farmProgress -= 1;
        state.carrots += 5 * state.farmHands;
        state.heroCharge = Math.min(100, state.heroCharge + 5 * state.farmHands);
        if (state.cellarUnlocked && state.heroCharge >= 100 && !state.heroUsed) {
          state.heroReady = true;
        }
      }
    }
    if (state.cellarUnlocked && state.cellarHands > 0) {
      state.cellarProgress += dt * (0.38 + state.cellarHands * 0.22);
      if (state.cellarProgress >= 1) {
        state.cellarProgress -= 1;
        state.apples += 4 * state.cellarHands;
        state.gold += 6 * state.cellarHands;
        state.heroCharge = Math.min(100, state.heroCharge + 9 * state.cellarHands);
        if (state.heroCharge >= 100 && !state.heroUsed) {
          state.heroReady = true;
        }
      }
    }
  }
  if (state.chestOpened && !state.endCard) {
    state.chestAnim += dt;
    if (state.chestAnim > 1.15) {
      state.endCard = true;
      trackOnce(EV.ENDCARD_SHOWN);
    }
  }
  if (state.endCard) {
    state.endCardAlpha = Math.min(1, state.endCardAlpha + dt * 3.2);
  }
  state.shake = Math.max(0, state.shake - dt * 38);
  state.flash = Math.max(0, state.flash - dt * 2.5);

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life += dt;
    p.vy += 420 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    if (p.life >= p.maxLife) state.particles.splice(i, 1);
  }
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i];
    f.life += dt;
    f.y -= 54 * dt;
    if (f.life >= f.maxLife) state.floats.splice(i, 1);
  }

  state.buttons.length = 0;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Background fill (full-bleed map blurred/darkened at sides in landscape)
  ctx.fillStyle = '#1b2029';
  ctx.fillRect(0, 0, viewW, viewH);

  // Responsive playfield frame: full screen in portrait, centered wide-adaptive layout in landscape
  const landscape = viewW > viewH * 1.1;
  const frameW = landscape ? Math.min(viewW - 24, 760) : Math.min(viewW, 460);
  const frameH = viewH;
  const frameX = (viewW - frameW) / 2;

  const sx = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
  const sy = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
  ctx.translate(sx, sy);

  // Draw kingdom map backdrop across the playfield
  if (imgs.map) {
    const imgRatio = imgs.map.width / imgs.map.height;
    const boxRatio = frameW / frameH;
    let dw = frameW;
    let dh = frameH;
    let dx = frameX;
    let dy = 0;
    if (boxRatio > imgRatio) {
      dh = frameW / imgRatio;
      dy = (frameH - dh) / 2;
    } else {
      dw = frameH * imgRatio;
      dx = frameX + (frameW - dw) / 2;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(frameX, 0, frameW, frameH);
    ctx.clip();
    ctx.drawImage(imgs.map, dx, dy, dw, dh);
    // Atmospheric overlay for crisp UI readability
    const ov = ctx.createLinearGradient(0, 0, 0, frameH);
    ov.addColorStop(0, 'rgba(20, 24, 34, 0.78)');
    ov.addColorStop(0.38, 'rgba(20, 24, 34, 0.25)');
    ov.addColorStop(0.55, 'rgba(18, 22, 32, 0.86)');
    ov.addColorStop(1, 'rgba(14, 18, 26, 0.96)');
    ctx.fillStyle = ov;
    ctx.fillRect(frameX, 0, frameW, frameH);
    ctx.restore();
  }

  // Top Header Bar (Chapter badge + Resources + Persistent Install pill)
  const pad = 12;
  const headerH = landscape ? 52 : 62;
  ctx.fillStyle = 'rgba(23, 27, 36, 0.94)';
  ctx.fillRect(frameX, 0, frameW, headerH);
  ctx.fillStyle = '#4a3a26';
  ctx.fillRect(frameX, headerH - 2, frameW, 2);

  // Chapter pill
  roundRect(frameX + pad, 10, 96, headerH - 20, 10);
  ctx.fillStyle = '#a0422b';
  ctx.fill();
  ctx.strokeStyle = '#f2c15a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff5d1';
  ctx.font = '900 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHAPTER 1', frameX + pad + 48, headerH / 2);

  // Resource counters
  const drawStat = (x, imgKey, val) => {
    if (imgs[imgKey]) ctx.drawImage(imgs[imgKey], x, headerH / 2 - 12, 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 15px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.floor(val)), x + 28, headerH / 2 + 1);
  };
  drawStat(frameX + pad + 108, 'carrot', state.carrots);
  drawStat(frameX + pad + 188, 'coin', state.gold);

  // Persistent Install pill top-right
  const pillW = 86;
  drawButton('install-top', frameX + frameW - pad - pillW, 10, pillW, headerH - 20, {
    label: 'INSTALL',
    fontSize: 12,
    radius: 10,
    top: '#4cd964',
    bottom: '#24993a',
    border: '#c7ffd0',
    textColor: '#ffffff',
    onClick: openStore,
  });

  // Objective banner
  const bannerY = headerH + 8;
  const bannerH = 38;
  roundRect(frameX + pad, bannerY, frameW - pad * 2, bannerH, 10);
  ctx.fillStyle = 'rgba(246, 232, 198, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#9c6e34';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#331f0a';
  ctx.font = `800 ${landscape ? 14 : 13}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getObjectiveText(), frameX + frameW / 2, bannerY + bannerH / 2 + 1);

  // Main Interactive Layout (Portrait: hero/chest on top, dungeons below; Landscape: hero/chest left, dungeons right)
  const contentTop = bannerY + bannerH + 10;
  const contentH = frameH - contentTop - 12;

  let heroBox, dungeonBox;
  if (landscape) {
    const leftW = Math.floor(frameW * 0.36);
    heroBox = { x: frameX + pad, y: contentTop, w: leftW - pad, h: contentH };
    dungeonBox = { x: frameX + leftW + pad, y: contentTop, w: frameW - leftW - pad * 2, h: contentH };
  } else {
    const heroH = Math.min(210, Math.floor(contentH * 0.34));
    heroBox = { x: frameX + pad, y: contentTop, w: frameW - pad * 2, h: heroH };
    dungeonBox = { x: frameX + pad, y: contentTop + heroH + 10, w: frameW - pad * 2, h: contentH - heroH - 10 };
  }

  // ---- Hero / Treasure Chest Showcase Area ----
  if (state.chestReady) {
    const chestSize = Math.min(heroBox.w * 0.78, heroBox.h * 0.84, 175);
    const cx = heroBox.x + (heroBox.w - chestSize) / 2;
    const cy = heroBox.y + (heroBox.h - chestSize) / 2;
    const wobble = !state.chestOpened ? Math.sin(state.pulse * 12) * 0.06 : 0;
    ctx.save();
    ctx.translate(cx + chestSize / 2, cy + chestSize / 2);
    ctx.rotate(wobble);
    ctx.shadowColor = 'rgba(255, 214, 72, 0.9)';
    ctx.shadowBlur = 28;
    const chImg = state.chestOpened ? imgs.chestOpen : imgs.chestClosed;
    if (chImg) ctx.drawImage(chImg, -chestSize / 2, -chestSize / 2, chestSize, chestSize);
    ctx.restore();

    if (!state.chestOpened) {
      state.buttons.push({
        id: 'chest',
        x: heroBox.x,
        y: heroBox.y,
        w: heroBox.w,
        h: heroBox.h,
        onClick: () => handleOpenChest(cx + chestSize / 2, cy + chestSize / 2),
      });
      drawHandHint(cx + chestSize * 0.72, cy + chestSize * 0.65);
    }
  } else {
    // Squire Hero Card
    const cardH = Math.min(heroBox.h - 14, 186);
    const cardW = Math.min(cardH * 0.82, heroBox.w - 20);
    const cx = heroBox.x + (heroBox.w - cardW) / 2;
    const cy = heroBox.y + (heroBox.h - cardH) / 2;
    const heroScale = state.heroReady ? 1 + Math.sin(state.pulse * 7) * 0.04 : 1;

    ctx.save();
    ctx.translate(cx + cardW / 2, cy + cardH / 2);
    ctx.scale(heroScale, heroScale);
    ctx.translate(-cardW / 2, -cardH / 2);

    if (state.heroReady) {
      ctx.shadowColor = 'rgba(255, 208, 64, 0.95)';
      ctx.shadowBlur = 26;
    }
    roundRect(0, 0, cardW, cardH, 14);
    ctx.fillStyle = '#253947';
    ctx.fill();
    ctx.lineWidth = state.heroReady ? 4 : 3;
    ctx.strokeStyle = state.heroReady ? '#ffe366' : '#58b7b0';
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (imgs.squire) {
      ctx.save();
      roundRect(5, 5, cardW - 10, cardH - 36, 10);
      ctx.clip();
      ctx.drawImage(imgs.squire, 5, 5, cardW - 10, cardH - 36);
      ctx.restore();
    }

    // Hero charge bar at bottom of card
    const barX = 10;
    const barY = cardH - 25;
    const barW = cardW - 20;
    const barH = 16;
    roundRect(barX, barY, barW, barH, 8);
    ctx.fillStyle = '#141a24';
    ctx.fill();
    const fillW = Math.max(0, (barW * Math.min(100, state.heroCharge)) / 100);
    if (fillW > 2) {
      roundRect(barX, barY, fillW, barH, 8);
      ctx.fillStyle = state.heroReady ? '#ffd845' : '#43b3f0';
      ctx.fill();
    }
    ctx.fillStyle = state.heroReady ? '#291704' : '#e6f4ff';
    ctx.font = '900 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.heroReady ? 'TAP: SQUIRE STRIKE!' : `SQUIRE POWER ${Math.floor(state.heroCharge)}%`, cardW / 2, barY + barH / 2 + 0.5);
    ctx.restore();

    if (state.heroReady) {
      state.buttons.push({
        id: 'hero-power',
        x: cx - 10,
        y: cy - 10,
        w: cardW + 20,
        h: cardH + 20,
        onClick: () => handleHeroPower(cx + cardW / 2, cy + cardH / 2),
      });
      drawHandHint(cx + cardW * 0.78, cy + cardH * 0.65);
    }
  }

  // ---- Dungeon Rows (Local Farm + Cellar) ----
  const rowGap = 12;
  const rowH = Math.min(148, Math.floor((dungeonBox.h - rowGap) / 2));

  // Row 1: Local Farm
  const r1Y = dungeonBox.y;
  roundRect(dungeonBox.x, r1Y, dungeonBox.w, rowH, 16);
  ctx.fillStyle = 'rgba(26, 33, 46, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#6c5a3e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Farm title + progress bar
  ctx.fillStyle = '#f8e3b2';
  ctx.font = '900 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`LOCAL FARM  ·  Crew: ${state.farmHands}`, dungeonBox.x + 14, r1Y + 12);

  // Progress bar
  const pbX = dungeonBox.x + 14;
  const pbY = r1Y + 36;
  const pbW = dungeonBox.w - 28;
  roundRect(pbX, pbY, pbW, 12, 6);
  ctx.fillStyle = '#111620';
  ctx.fill();
  roundRect(pbX, pbY, Math.max(8, pbW * Math.min(1, state.farmProgress)), 12, 6);
  ctx.fillStyle = '#f5a623';
  ctx.fill();

  // Farm buttons: Explore + Hire Farm Hand
  const btnY1 = r1Y + 58;
  const btnH1 = rowH - 70;
  const halfW = (dungeonBox.w - 38) / 2;
  const exploreGlow = !state.started || (state.farmHands === 0 && state.carrots < farmHireCost());
  drawButton('explore-farm', dungeonBox.x + 14, btnY1, halfW, btnH1, {
    label: 'EXPLORE FARM',
    sub: `+${5 + state.farmHands * 2} Carrots`,
    fontSize: 14,
    glow: exploreGlow,
    onClick: () => handleTapFarm(dungeonBox.x + 14 + halfW / 2, btnY1),
  });

  const fCost = farmHireCost();
  const canHireFarm = state.carrots >= fCost;
  drawButton('hire-farm', dungeonBox.x + 24 + halfW, btnY1, halfW, btnH1, {
    label: 'HIRE FARM HAND',
    sub: `${fCost} Carrots (Auto)`,
    fontSize: 13,
    top: '#52cf66',
    bottom: '#2a8f3e',
    border: '#c7ffd0',
    textColor: '#ffffff',
    subColor: '#e5ffea',
    disabled: !canHireFarm,
    glow: canHireFarm && state.farmHands === 0,
    glowColor: 'rgba(82, 207, 102, 0.85)',
    onClick: () => handleHireFarm(dungeonBox.x + 24 + halfW * 1.5, btnY1),
  });

  if (exploreGlow && !state.heroReady && !state.chestReady) {
    drawHandHint(dungeonBox.x + 14 + halfW - 14, btnY1 + btnH1 - 2);
  } else if (canHireFarm && state.farmHands === 0 && !state.heroReady && !state.chestReady) {
    drawHandHint(dungeonBox.x + 24 + halfW * 2 - 14, btnY1 + btnH1 - 2);
  }

  // Row 2: The Cellar
  const r2Y = r1Y + rowH + rowGap;
  roundRect(dungeonBox.x, r2Y, dungeonBox.w, rowH, 16);
  ctx.fillStyle = state.cellarUnlocked ? 'rgba(26, 36, 48, 0.95)' : 'rgba(20, 25, 34, 0.88)';
  ctx.fill();
  ctx.strokeStyle = state.cellarUnlocked ? '#529b6c' : '#444b59';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = state.cellarUnlocked ? '#c9f5b3' : '#9aa3b2';
  ctx.font = '900 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    state.cellarUnlocked ? `THE CELLAR  ·  Crew: ${state.cellarHands}` : 'THE CELLAR (LOCKED)',
    dungeonBox.x + 14,
    r2Y + 12,
  );

  const pb2Y = r2Y + 36;
  roundRect(pbX, pb2Y, pbW, 12, 6);
  ctx.fillStyle = '#111620';
  ctx.fill();
  const cProg = state.cellarUnlocked
    ? Math.min(1, state.cellarProgress)
    : Math.min(1, state.carrots / cellarUnlockCost());
  roundRect(pbX, pb2Y, Math.max(8, pbW * cProg), 12, 6);
  ctx.fillStyle = state.cellarUnlocked ? '#66d46e' : '#7b8799';
  ctx.fill();

  const btnY2 = r2Y + 58;
  const btnH2 = rowH - 70;
  if (!state.cellarUnlocked) {
    const canUnlock = state.carrots >= cellarUnlockCost();
    drawButton('unlock-cellar', dungeonBox.x + 14, btnY2, dungeonBox.w - 28, btnH2, {
      label: canUnlock ? 'UNLOCK THE CELLAR' : `NEED ${cellarUnlockCost()} CARROTS`,
      sub: canUnlock ? 'Auto-loot Apples & Gold!' : `${Math.floor(state.carrots)} / ${cellarUnlockCost()} Carrots`,
      fontSize: 15,
      top: '#52cf66',
      bottom: '#2a8f3e',
      border: '#c7ffd0',
      textColor: '#ffffff',
      subColor: '#e5ffea',
      disabled: !canUnlock,
      glow: canUnlock,
      glowColor: 'rgba(82, 207, 102, 0.85)',
      onClick: () => handleUnlockOrTapCellar(dungeonBox.x + dungeonBox.w / 2, btnY2),
    });
    if (canUnlock && !state.heroReady && !state.chestReady) {
      drawHandHint(dungeonBox.x + dungeonBox.w * 0.72, btnY2 + btnH2 * 0.52);
    }
  } else {
    drawButton('tap-cellar', dungeonBox.x + 14, btnY2, dungeonBox.w - 28, btnH2, {
      label: state.apples >= cellarHireCost() ? 'UPGRADE CELLAR CREW' : 'LOOT THE CELLAR',
      sub:
        state.apples >= cellarHireCost()
          ? `Cost: ${cellarHireCost()} Apples`
          : `+${5 + state.cellarHands * 2} Apples & Gold`,
      fontSize: 15,
      top: '#58c970',
      bottom: '#2c8a42',
      border: '#c7ffd0',
      textColor: '#ffffff',
      subColor: '#e5ffea',
      glow: !state.heroReady && !state.chestReady && !state.heroUsed,
      onClick: () => handleUnlockOrTapCellar(dungeonBox.x + dungeonBox.w / 2, btnY2),
    });
  }

  // Particles
  for (const p of state.particles) {
    const alpha = Math.max(0, 1 - p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const im = imgs[p.imgKey];
    if (im) ctx.drawImage(im, -p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }

  // Floating text popups
  for (const f of state.floats) {
    const alpha = Math.max(0, 1 - f.life / f.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '900 17px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20, 14, 8, 0.9)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  // Flash overlay on Hero Strike / Chest burst
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 240, 180, ${state.flash * 0.45})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  // ---- End Card Modal (HTML-contained summary + Install CTA) ----
  if (state.endCard) {
    state.buttons.length = 0; // End card owns input
    ctx.save();
    ctx.globalAlpha = state.endCardAlpha;
    ctx.fillStyle = 'rgba(11, 14, 21, 0.84)';
    ctx.fillRect(0, 0, viewW, viewH);

    const mw = Math.min(viewW - 32, 360);
    const mh = Math.min(viewH - 32, 410);
    const mx = (viewW - mw) / 2;
    const my = (viewH - mh) / 2;

    roundRect(mx, my, mw, mh, 22);
    const mg = ctx.createLinearGradient(0, my, 0, my + mh);
    mg.addColorStop(0, '#2c2432');
    mg.addColorStop(1, '#191c26');
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f5c451';
    ctx.stroke();

    if (imgs.logo) {
      const lw = Math.min(mw * 0.68, 220);
      const lh = lw * (imgs.logo.height / imgs.logo.width);
      ctx.drawImage(imgs.logo, mx + (mw - lw) / 2, my + 18, lw, lh);
    }

    const midY = my + mh * 0.47;
    ctx.fillStyle = '#ffe17a';
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHAPTER 1 COMPLETE!', mx + mw / 2, midY);

    ctx.fillStyle = '#d7dce8';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('5 Regions · 25 Heroes · Weekly Live Events', mx + mw / 2, midY + 30);

    drawButton('cta-endcard', mx + 24, my + mh - 122, mw - 48, 60, {
      label: 'INSTALL OUT OF RUIN',
      sub: 'Free on Google Play',
      fontSize: 17,
      top: '#52db6c',
      bottom: '#22963b',
      border: '#d6ffde',
      textColor: '#ffffff',
      subColor: '#e6ffea',
      glow: true,
      glowColor: 'rgba(82, 219, 108, 0.85)',
      onClick: openStore,
    });

    drawButton('replay-endcard', mx + mw / 2 - 64, my + mh - 48, 128, 34, {
      label: 'Play Again',
      fontSize: 13,
      radius: 10,
      top: '#3e4656',
      bottom: '#2a303c',
      border: '#69748a',
      textColor: '#dce2ee',
      onClick: resetPlayable,
    });

    ctx.restore();
  }

  ctx.restore();
}

function onPointer(e) {
  e.preventDefault();
  ensureAudioUnlocked();
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  for (let i = state.buttons.length - 1; i >= 0; i--) {
    const b = state.buttons[i];
    if (b.disabled) continue;
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
      b.onClick();
      return;
    }
  }
}

canvas.addEventListener('pointerdown', onPointer, { passive: false });

// ---------- Boot ----------
let lastTs = 0;
function loop(ts) {
  const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0.016);
  lastTs = ts;
  render(dt);
  requestAnimationFrame(loop);
}

loadImages().then(() => {
  trackOnce(EV.LOADED);
  render(0.016);
  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.add('hidden');
    setTimeout(() => boot.remove(), 280);
  }
  trackOnce(EV.DISPLAYED);
  requestAnimationFrame(loop);
});
