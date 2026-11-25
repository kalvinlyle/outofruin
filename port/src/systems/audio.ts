// Out of Ruin — Web Audio engine, Scale-Locked Harmonic Cascade Engine & Adaptive Music.
//
// Architecture:
//   - Per-cue AudioBuffers (unbounded polyphony, never sprite atlases).
//   - Dedicated sfxBus -> true-peak limiter (only on SFX so rapid tapping never pumps music).
//   - Dedicated musicBus -> sidechain duckGain -> menu low-pass filter -> destination.
//   - Max 2 decoded music buffers in memory (evicts old track after crossfade).
//   - Gapless scheduled music looping via overlapping AudioBufferSourceNodes (immune to AAC priming).
//   - All tonal cues locked to D major / D Dorian; cascades climb a D pentatonic scale.
//   - Audio preferences stored in dedicated localStorage keys outside defsave so progress
//     resets and OTA rollbacks never unmute a player.

const KEY_SFX_ON = 'oor_sound_on';
const KEY_MUSIC_ON = 'oor_music_on';
const KEY_SFX_VOL = 'oor_sound_vol';
const KEY_MUSIC_VOL = 'oor_music_vol';

const SFX_LEVEL = 0.85;
// Full-fidelity music bus: default 75% slider (~0.39) sits cleanly under SFX;
// 100% slider (0.70) delivers full, punchy, unmuffled soundtrack energy.
const MUSIC_LEVEL = 0.70;
const POPUP_DUCK_GAIN = 0.85;      // gentle -1.4 dB transparency dip on reading popups only

const LOOP_START_PAD_S = 0.06;     // trims AAC encoder priming on start
const LOOP_XFADE_S = 1.8;          // overlapping equal-power crossfade inside buffer
const TRACK_XFADE_S = 1.4;         // crossfade between two different music beds

// Warm D major pentatonic intervals (max +9 semitones so cascades never get shrill)
const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9];
const semiToRate = (semi: number) => Math.pow(2, semi / 12);

export type MusicTrackId = 'music_homeland' | 'music_ruins' | 'music_event_mystic' | 'music_event_siege' | 'upgrade_bed';

const SFX_IDS = [
  'tap_hit_1', 'tap_hit_2', 'tap_hit_3', 'tap_hit_4', 'tap_hit_5', 'tap_hit_6',
  'enemy_hit_1', 'enemy_hit_2', 'enemy_hit_3',
  'enemy_kill_1', 'enemy_kill_2', 'enemy_wave_horn', 'boss_defeat',
  'level_clear', 'loot_crit', 'loot_lucky', 'scale_pluck',
  'hire_land',
  'ui_tap_1', 'ui_tap_2', 'ui_back', 'ui_tab', 'ui_toggle', 'ui_refuse', 'scroll_open', 'coin_collect', 'drop_add',
  'chest_shake', 'chest_open',
  'card_reveal_common', 'card_reveal_rare', 'card_reveal_epic', 'card_reveal_legendary',
  'card_reveal_gold', 'card_reveal_xp', 'patron_pop',
  'xp_fly_tick', 'card_levelup', 'upgrade_open', 'upgrade_charge', 'upgrade_impact',
  'quest_ready', 'quest_collect', 'level_unlock',
  'rank_up_fanfare', 'hero_unlock',
  'shop_purchase', 'timewarp_whoosh', 'worldmap_unfurl',
  'power_strike', 'power_lightning', 'power_lightning_2', 'power_lightning_3', 'power_arcane', 'power_buff',
] as const;

const TAP_IDS = ['tap_hit_1', 'tap_hit_2', 'tap_hit_3', 'tap_hit_4', 'tap_hit_5', 'tap_hit_6'] as const;
const ENEMY_HIT_IDS = ['enemy_hit_1', 'enemy_hit_2', 'enemy_hit_3'] as const;
const ENEMY_KILL_IDS = ['enemy_kill_1', 'enemy_kill_2'] as const;
const UI_TAP_IDS = ['ui_tap_1', 'ui_tap_2'] as const;
const LIGHTNING_IDS = ['power_lightning', 'power_lightning_2', 'power_lightning_3'] as const;

function audioBaseUrl(): string {
  try {
    // port/main.js lives in game/port/main.js -> ../audio/ resolves to game/audio/
    return new URL('../audio/', import.meta.url).href;
  } catch {
    return 'audio/';
  }
}

function isParityOrMutedEnv(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    if ((window as any).__parity) return true;
    const params = new URLSearchParams(window.location.search);
    if (params.has('mute') || params.has('scene')) return true;
    return false;
  } catch {
    return true;
  }
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === 'off' || v === '0' || v === 'false') return false;
    if (v === 'on' || v === '1' || v === 'true') return true;
    return fallback;
  } catch {
    return fallback;
  }
}

function readVol(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch { /* private mode */ }
}

interface ActiveMusicVoice {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

interface MusicChannel {
  id: MusicTrackId;
  buffer: AudioBuffer;
  channelGain: GainNode;
  voices: Set<ActiveMusicVoice>;
  timer: ReturnType<typeof setTimeout> | null;
  stopped: boolean;
}

class AudioEngine {
  private disabled = isParityOrMutedEnv();
  private ac: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicDuck: GainNode | null = null;
  private musicMenuGain: GainNode | null = null;

  private sfxBuffers = new Map<string, AudioBuffer>();
  private sfxLoading = false;
  private sfxLoaded = false;

  // Max 2 decoded music buffers in memory (active + crossfade target)
  private musicBuffers = new Map<MusicTrackId, AudioBuffer>();
  private musicFetching = new Map<MusicTrackId, Promise<AudioBuffer | null>>();
  private activeChannel: MusicChannel | null = null;
  private fadingChannels = new Set<MusicChannel>();
  private desiredTrack: MusicTrackId = 'music_homeland';

  private soundOn = readBool(KEY_SFX_ON, true);
  private musicOn = readBool(KEY_MUSIC_ON, true);
  private soundVol = readVol(KEY_SFX_VOL, 0.85);
  private musicVol = readVol(KEY_MUSIC_VOL, 0.75);

  private suppressDepth = 0;
  private suppressUntilMs = 0;
  private backgrounded = false;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;

  // View / context tracking for off-screen gating and adaptive music
  private currentScreen = 'boot';
  private currentMapId = 1;
  private currentDungeonId = 1;
  private popupOpen = false;
  private menuFiltered = false;

  // Round-robin, rate-limiting & harmonic cascade state
  private lastPick = new Map<string, number>();
  private lastPlayedAt = new Map<string, number>();
  private clearComboStep = 0;
  private clearComboAt = 0;
  private cascadeStep = new Map<string, number>();
  private cascadeAt = new Map<string, number>();
  private activeReveal: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private activeChestShake: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private tileDropWindowStart = 0;
  private tileDropCount = 0;
  private tileDropScheduledUntil = 0;
  private dropTimestamps: number[] = [];
  private lightningBurstAt = 0;
  private lightningBurstCount = 0;

  private listenersInstalled = false;

  constructor() {
    this.installGlobalListeners();
  }

  private installGlobalListeners(): void {
    if (this.listenersInstalled || typeof window === 'undefined' || this.disabled) return;
    this.listenersInstalled = true;

    const unlock = () => { this.initOrResume(); };
    window.addEventListener('pointerdown', unlock, { passive: true, capture: true });
    window.addEventListener('keydown', unlock, { passive: true, capture: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.suspend();
      else if (document.hasFocus()) this.resume();
    });
    document.addEventListener('freeze', () => this.suspend());
    window.addEventListener('blur', () => this.suspend());
    window.addEventListener('focus', () => {
      if (!document.hidden) this.resume();
    });
    window.addEventListener('pagehide', () => this.suspend());
    window.addEventListener('pageshow', () => {
      if (!document.hidden && document.hasFocus()) this.resume();
    });

    // Capacitor native iOS/Android lifecycle (`@capacitor/app` is installed in native/)
    try {
      const cap = (window as any).Capacitor;
      const appPlugin = cap?.Plugins?.App;
      if (appPlugin && typeof appPlugin.addListener === 'function') {
        appPlugin.addListener('appStateChange', (state: { isActive: boolean }) => {
          if (state?.isActive) this.resume();
          else this.suspend();
        });
        // `pause` / `resume` fire on notification shade, app switcher, and incoming calls.
        appPlugin.addListener('pause', () => this.suspend());
        appPlugin.addListener('resume', () => this.resume());
      }
    } catch { /* web browser */ }
  }

  public initOrResume(): void {
    if (this.disabled) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this.backgrounded = false;
    if (!this.ac) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      try {
        this.ac = new Ctx();
        this.buildGraph();
        void this.preloadSfx();
        void this.switchMusic(this.desiredTrack, 1.8);
      } catch {
        this.ac = null;
      }
      return;
    }
    this.resume();
  }

  private buildGraph(): void {
    const ac = this.ac!;
    // SFX path: sfxBus -> warm high-shelf -> true-peak limiter -> destination
    // (limiter sits on SFX only so rapid tapping never pumps the music)
    this.sfxBus = ac.createGain();
    this.sfxBus.gain.value = this.targetSfxGain();

    const sfxWarmth = ac.createBiquadFilter();
    sfxWarmth.type = 'highshelf';
    sfxWarmth.frequency.value = 5500;
    sfxWarmth.gain.value = -2.5;

    const sfxLimiter = ac.createDynamicsCompressor();
    sfxLimiter.threshold.value = -1;
    sfxLimiter.knee.value = 0;
    sfxLimiter.ratio.value = 20;
    sfxLimiter.attack.value = 0.001;
    sfxLimiter.release.value = 0.05;
    this.sfxBus.connect(sfxWarmth);
    sfxWarmth.connect(sfxLimiter);
    sfxLimiter.connect(ac.destination);

    // Music path: pure full-frequency path (musicBus -> musicDuck -> musicMenuGain -> destination)
    // No low-pass muffle filter — keeps EDM highs, kicks, and clarity intact.
    this.musicBus = ac.createGain();
    this.musicBus.gain.value = this.targetMusicGain();

    this.musicDuck = ac.createGain();
    this.musicDuck.gain.value = 1;

    this.musicMenuGain = ac.createGain();
    this.musicMenuGain.gain.value = this.menuFiltered ? POPUP_DUCK_GAIN : 1;

    this.musicBus.connect(this.musicDuck);
    this.musicDuck.connect(this.musicMenuGain);
    this.musicMenuGain.connect(ac.destination);
  }

  private targetSfxGain(): number {
    return this.soundOn && !this.backgrounded ? SFX_LEVEL * this.soundVol * this.soundVol : 0;
  }

  private targetMusicGain(): number {
    return this.musicOn && !this.backgrounded ? MUSIC_LEVEL * this.musicVol * this.musicVol : 0;
  }

  public isBackgrounded(): boolean {
    return this.backgrounded;
  }

  public suspend(): void {
    this.backgrounded = true;
    if (!this.ac) return;
    try {
      const t = this.ac.currentTime;
      // Mute immediately (0 ms) before async suspend() resolves on mobile WebViews.
      if (this.sfxBus) {
        this.sfxBus.gain.cancelScheduledValues(t);
        this.sfxBus.gain.setValueAtTime(0, t);
      }
      if (this.musicBus) {
        this.musicBus.gain.cancelScheduledValues(t);
        this.musicBus.gain.setValueAtTime(0, t);
      }
      if (this.ac.state === 'running') void this.ac.suspend();
    } catch { /* ignore */ }
  }

  public resume(): void {
    this.backgrounded = false;
    if (!this.ac || this.disabled) return;
    try {
      const state = this.ac.state as string;
      if (state === 'suspended' || state === 'interrupted') {
        void this.ac.resume().catch(() => {});
      }
      const t = this.ac.currentTime;
      if (this.sfxBus) {
        this.sfxBus.gain.cancelScheduledValues(t);
        this.sfxBus.gain.setTargetAtTime(this.targetSfxGain(), t, 0.04);
      }
      if (this.musicBus) {
        this.musicBus.gain.cancelScheduledValues(t);
        this.musicBus.gain.setTargetAtTime(this.targetMusicGain(), t, 0.25);
      }
    } catch { /* ignore */ }
  }

  // ---- Settings API ---------------------------------------------------------

  public isSoundOn(): boolean { return this.soundOn; }
  public isMusicOn(): boolean { return this.musicOn; }
  public getSoundVol(): number { return this.soundVol; }
  public getMusicVol(): number { return this.musicVol; }

  public setSoundOn(on: boolean): void {
    this.soundOn = on;
    writeStorage(KEY_SFX_ON, on ? 'on' : 'off');
    if (this.ac && this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.targetSfxGain(), this.ac.currentTime, 0.04);
    }
  }

  public setMusicOn(on: boolean): void {
    this.musicOn = on;
    writeStorage(KEY_MUSIC_ON, on ? 'on' : 'off');
    if (this.ac && this.musicBus) {
      this.musicBus.gain.setTargetAtTime(this.targetMusicGain(), this.ac.currentTime, 0.25);
    }
    if (on && this.ac && !this.activeChannel) {
      void this.switchMusic(this.desiredTrack, 1.2);
    }
  }

  public setSoundVol(v: number): void {
    this.soundVol = Math.min(1, Math.max(0, v));
    writeStorage(KEY_SFX_VOL, String(Math.round(this.soundVol * 100) / 100));
    if (this.soundVol > 0 && !this.soundOn) this.setSoundOn(true);
    if (this.ac && this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.targetSfxGain(), this.ac.currentTime, 0.04);
    }
  }

  public setMusicVol(v: number): void {
    this.musicVol = Math.min(1, Math.max(0, v));
    writeStorage(KEY_MUSIC_VOL, String(Math.round(this.musicVol * 100) / 100));
    if (this.musicVol > 0 && !this.musicOn) this.setMusicOn(true);
    if (this.ac && this.musicBus) {
      this.musicBus.gain.setTargetAtTime(this.targetMusicGain(), this.ac.currentTime, 0.06);
    }
  }

  // ---- Suppression & View Context -------------------------------------------

  public suppress<T>(fn: () => T): T {
    this.suppressDepth += 1;
    try {
      return fn();
    } finally {
      this.suppressDepth = Math.max(0, this.suppressDepth - 1);
    }
  }

  public suppressFor(ms: number): void {
    this.suppressUntilMs = Math.max(this.suppressUntilMs, performance.now() + ms);
  }

  private isSuppressed(): boolean {
    return this.disabled || this.backgrounded || this.suppressDepth > 0 || performance.now() < this.suppressUntilMs;
  }

  public setScreen(screen: string): void {
    this.currentScreen = screen || 'boot';
    this.updateMenuFilter();
    const next = this.trackForCurrentState();
    if (next !== this.desiredTrack || (this.activeChannel && this.activeChannel.id !== next)) {
      this.desiredTrack = next;
      const fade = next === 'upgrade_bed' ? 0.28 : TRACK_XFADE_S;
      if (this.ac) void this.switchMusic(next, fade);
    }
  }

  public setPopupOpen(open: boolean): void {
    this.popupOpen = open;
    this.updateMenuFilter();
  }

  public setLocation(mapId: number, dungeonId: number): void {
    if (typeof mapId === 'number' && mapId > 0) this.currentMapId = mapId;
    if (typeof dungeonId === 'number' && dungeonId > 0) this.currentDungeonId = dungeonId;
    const next = this.trackForCurrentState();
    if (next !== this.desiredTrack) {
      this.desiredTrack = next;
      if (this.ac) void this.switchMusic(next, TRACK_XFADE_S);
    }
  }

  public isViewingDungeon(mapId?: number, dungeonId?: number): boolean {
    if (this.currentScreen !== 'dungeonmine' || this.popupOpen) return false;
    if (mapId !== undefined && mapId !== this.currentMapId) return false;
    if (dungeonId !== undefined && dungeonId !== this.currentDungeonId) return false;
    return true;
  }

  private trackForCurrentState(): MusicTrackId {
    if (this.currentScreen === 'upgradecard' || this.currentScreen === 'unlockcards') {
      return 'upgrade_bed';
    }
    return this.trackForLocation(this.currentMapId, this.currentDungeonId);
  }

  private trackForLocation(mapId: number, dungeonId: number): MusicTrackId {
    if (mapId === 2 || mapId === 4) return 'music_event_mystic'; // Wererabbit, Midnight Carnival
    if (mapId === 3 || mapId === 5 || mapId === 6) return 'music_event_siege'; // Titans Well, Longest Night, Blackmaw
    return dungeonId <= 1 ? 'music_homeland' : 'music_ruins';
  }

  private updateMenuFilter(): void {
    // Only apply a subtle -1.4 dB transparency dip on reading popups (never muffle EQ,
    // and never dip in Settings so the player hears true volume while adjusting sliders).
    const filtered = this.popupOpen;
    if (filtered === this.menuFiltered) return;
    this.menuFiltered = filtered;
    if (this.ac && this.musicMenuGain) {
      const t = this.ac.currentTime;
      this.musicMenuGain.gain.setTargetAtTime(filtered ? POPUP_DUCK_GAIN : 1, t, 0.2);
    }
  }

  private duckMusic(dbFactor: number, holdMs: number): void {
    if (!this.ac || !this.musicDuck) return;
    if (this.duckTimer) clearTimeout(this.duckTimer);
    const t = this.ac.currentTime;
    this.musicDuck.gain.setTargetAtTime(dbFactor, t, 0.04);
    this.duckTimer = setTimeout(() => {
      this.duckTimer = null;
      if (this.ac && this.musicDuck) {
        this.musicDuck.gain.setTargetAtTime(1, this.ac.currentTime, 0.45);
      }
    }, holdMs);
  }

  // ---- Asset Loading --------------------------------------------------------

  private async preloadSfx(): Promise<void> {
    if (this.sfxLoading || this.sfxLoaded || !this.ac) return;
    this.sfxLoading = true;
    const base = audioBaseUrl();
    const ac = this.ac;
    await Promise.all(SFX_IDS.map(async (id) => {
      try {
        const res = await fetch(`${base}sfx/${id}.m4a`);
        if (!res.ok) return;
        const buf = await ac.decodeAudioData(await res.arrayBuffer());
        this.sfxBuffers.set(id, buf);
      } catch { /* missing cue stays silent */ }
    }));
    this.sfxLoaded = true;
    this.sfxLoading = false;
    // Warm the tiny 16s upgrade sanctum bed so entering Upgrade Card is instant.
    void this.fetchMusicBuffer('upgrade_bed');
  }

  private async fetchMusicBuffer(id: MusicTrackId): Promise<AudioBuffer | null> {
    const cached = this.musicBuffers.get(id);
    if (cached) return cached;
    const inflight = this.musicFetching.get(id);
    if (inflight) return inflight;
    if (!this.ac) return null;

    const ac = this.ac;
    const promise = (async () => {
      try {
        const res = await fetch(`${audioBaseUrl()}music/${id}.m4a`);
        if (!res.ok) return null;
        const buf = await ac.decodeAudioData(await res.arrayBuffer());
        this.musicBuffers.set(id, buf);
        this.evictUnusedMusicBuffers();
        return buf;
      } catch {
        return null;
      } finally {
        this.musicFetching.delete(id);
      }
    })();
    this.musicFetching.set(id, promise);
    return promise;
  }

  private evictUnusedMusicBuffers(): void {
    // Keep active + fading/desired + the tiny 16s upgrade_bed cached for instant transitions
    const keep = new Set<MusicTrackId>([this.desiredTrack, 'upgrade_bed']);
    if (this.activeChannel) keep.add(this.activeChannel.id);
    for (const ch of this.fadingChannels) keep.add(ch.id);
    for (const id of [...this.musicBuffers.keys()]) {
      if (!keep.has(id) && this.musicBuffers.size > 3) {
        this.musicBuffers.delete(id);
      }
    }
  }

  // ---- Gapless Scheduled Music Loop -----------------------------------------

  private async switchMusic(id: MusicTrackId, fadeSec: number): Promise<void> {
    this.desiredTrack = id;
    if (!this.ac || !this.musicBus || this.disabled) return;
    if (this.activeChannel && this.activeChannel.id === id) return;

    const buf = await this.fetchMusicBuffer(id);
    // Track may have changed again while fetching
    if (!buf || this.desiredTrack !== id || !this.ac || !this.musicBus) return;
    if (this.activeChannel && this.activeChannel.id === id) return;

    // Fade out existing channel cleanly and evict its buffer once silent
    if (this.activeChannel) {
      const old = this.activeChannel;
      this.activeChannel = null;
      this.fadeOutChannel(old, fadeSec);
    }

    const channelGain = this.ac.createGain();
    const targetGain = id === 'upgrade_bed' ? 1.15 : 1.0;
    const t = this.ac.currentTime;
    channelGain.gain.setValueAtTime(0.0001, t);
    channelGain.gain.linearRampToValueAtTime(targetGain, t + Math.max(0.15, fadeSec));
    channelGain.connect(this.musicBus);

    const ch: MusicChannel = {
      id,
      buffer: buf,
      channelGain,
      voices: new Set(),
      timer: null,
      stopped: false,
    };
    this.activeChannel = ch;
    this.scheduleNextMusicVoice(ch, this.ac.currentTime, true);
  }

  private scheduleNextMusicVoice(ch: MusicChannel, startAt: number, isFirst: boolean): void {
    if (ch.stopped || !this.ac) return;
    const ac = this.ac;
    const dur = ch.buffer.duration;
    const offset = Math.min(LOOP_START_PAD_S, dur * 0.05);
    const playable = Math.max(2, dur - offset - 0.06);
    const xfade = Math.min(LOOP_XFADE_S, playable * 0.25);

    const src = ac.createBufferSource();
    src.buffer = ch.buffer;
    const g = ac.createGain();

    if (isFirst) {
      g.gain.setValueAtTime(1, startAt);
    } else {
      g.gain.setValueAtTime(0.0001, startAt);
      g.gain.linearRampToValueAtTime(1, startAt + xfade);
    }
    const fadeOutAt = startAt + playable - xfade;
    g.gain.setValueAtTime(1, Math.max(startAt + 0.05, fadeOutAt));
    g.gain.linearRampToValueAtTime(0.0001, startAt + playable);

    src.connect(g);
    g.connect(ch.channelGain);

    const voice: ActiveMusicVoice = { src, gain: g };
    ch.voices.add(voice);
    src.onended = () => {
      ch.voices.delete(voice);
      try { src.disconnect(); g.disconnect(); } catch { /* ignore */ }
    };

    src.start(startAt, offset, playable + 0.04);

    // Schedule next overlapping voice slightly ahead of fadeOutAt
    const nextStartAt = fadeOutAt;
    const wakeInMs = Math.max(250, (nextStartAt - ac.currentTime - 0.4) * 1000);
    ch.timer = setTimeout(() => {
      this.scheduleNextMusicVoice(ch, Math.max(ac.currentTime + 0.05, nextStartAt), false);
    }, wakeInMs);
  }

  private fadeOutChannel(ch: MusicChannel, fadeSec: number): void {
    ch.stopped = true;
    if (ch.timer) { clearTimeout(ch.timer); ch.timer = null; }
    this.fadingChannels.add(ch);
    const dur = Math.max(0.12, fadeSec);
    if (this.ac) {
      const t = this.ac.currentTime;
      ch.channelGain.gain.cancelScheduledValues(t);
      ch.channelGain.gain.setValueAtTime(ch.channelGain.gain.value, t);
      ch.channelGain.gain.linearRampToValueAtTime(0, t + dur);
    }
    setTimeout(() => {
      for (const v of ch.voices) {
        try { v.src.stop(); v.src.disconnect(); v.gain.disconnect(); } catch { /* ignore */ }
      }
      ch.voices.clear();
      try { ch.channelGain.disconnect(); } catch { /* ignore */ }
      this.fadingChannels.delete(ch);
      this.evictUnusedMusicBuffers();
    }, Math.round(dur * 1000) + 120);
  }

  // ---- Core One-Shot Playback -----------------------------------------------

  private canPlay(key: string, minGapMs: number): boolean {
    const now = performance.now();
    const prev = this.lastPlayedAt.get(key) ?? 0;
    if (now - prev < minGapMs) return false;
    this.lastPlayedAt.set(key, now);
    return true;
  }

  private pickNoRepeat<T extends string>(group: string, list: readonly T[]): T {
    const n = list.length;
    if (n <= 1) return list[0];
    const last = this.lastPick.get(group) ?? -1;
    let idx = Math.floor(Math.random() * n);
    if (idx === last) idx = (idx + 1 + Math.floor(Math.random() * (n - 1))) % n;
    this.lastPick.set(group, idx);
    return list[idx];
  }

  private playBuffer(
    id: string,
    vol = 1,
    rate = 1,
    delayS = 0,
  ): { src: AudioBufferSourceNode; gain: GainNode } | null {
    if (this.isSuppressed() || !this.soundOn || !this.ac || !this.sfxBus) return null;
    if (this.ac.state !== 'running') return null;
    const buf = this.sfxBuffers.get(id);
    if (!buf) return null;

    const src = this.ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.max(0.5, Math.min(2.2, rate));

    const g = this.ac.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.sfxBus);

    const when = delayS > 0 ? this.ac.currentTime + delayS : this.ac.currentTime;
    src.start(when);
    src.onended = () => {
      try { src.disconnect(); g.disconnect(); } catch { /* ignore */ }
    };
    return { src, gain: g };
  }

  // ---- High-Level Gameplay Audio API ----------------------------------------

  /** Direct tap on a dungeon bar (mining/foraging) or enemy row. */
  public playTap(isEnemy = false): void {
    if (!this.canPlay('tap', 45)) return;
    if (isEnemy) {
      const id = this.pickNoRepeat('enemy_hit', ENEMY_HIT_IDS);
      this.playBuffer(id, 0.85, 0.96 + Math.random() * 0.08);
    } else {
      const id = this.pickNoRepeat('tap_hit', TAP_IDS);
      this.playBuffer(id, 0.78, 0.95 + Math.random() * 0.1);
    }
  }

  /** Enemy hit from hero power (gated to viewed dungeon). */
  public playEnemyHit(mapId: number, dungeonId: number): void {
    if (!this.isViewingDungeon(mapId, dungeonId)) return;
    if (!this.canPlay('enemy_hit_fx', 85)) return;
    const id = this.pickNoRepeat('enemy_hit', ENEMY_HIT_IDS);
    this.playBuffer(id, 0.68, 0.94 + Math.random() * 0.12);
  }

  /** Enemy kill or boss defeat (gated to viewed dungeon). */
  public playEnemyKill(mapId: number, dungeonId: number, isBoss = false): void {
    if (!this.isViewingDungeon(mapId, dungeonId)) return;
    if (isBoss) {
      if (!this.canPlay('boss_defeat', 400)) return;
      this.duckMusic(0.42, 1600);
      this.playBuffer('boss_defeat', 1.0, 1.0);
      return;
    }
    if (!this.canPlay('enemy_kill', 90)) return;
    const id = this.pickNoRepeat('enemy_kill', ENEMY_KILL_IDS);
    this.playBuffer(id, 0.82, 0.96 + Math.random() * 0.08);
  }

  /** New enemy wave arrival horn. */
  public playEnemyWave(mapId: number, dungeonId: number): void {
    if (!this.isViewingDungeon(mapId, dungeonId)) return;
    if (!this.canPlay('enemy_wave', 800)) return;
    this.duckMusic(0.65, 900);
    this.playBuffer('enemy_wave_horn', 0.88, 1.0);
  }

  /** Manual level completion: single warm, understated wooden pop with subtle pitch drift. */
  public playLevelClear(isManual: boolean, mapId?: number, dungeonId?: number): void {
    // Auto-henchman clears are silent by default to prevent late-game noise fatigue.
    if (!isManual) return;
    if (mapId !== undefined && !this.isViewingDungeon(mapId, dungeonId)) return;
    if (!this.canPlay('level_clear', 90)) return;

    const now = performance.now();
    if (now - this.clearComboAt > 2400) this.clearComboStep = 0;
    else this.clearComboStep = Math.min(3, this.clearComboStep + 1);
    this.clearComboAt = now;

    // Gentle subtle pitch lift (1.0 -> 1.08 max) so consecutive runs feel warm, never shrill.
    const rate = 0.97 + this.clearComboStep * 0.03 + Math.random() * 0.02;
    this.playBuffer('level_clear', 0.52, rate);
  }

  /** Loot crit or Seraphine lucky crit (only for currently viewed dungeon). */
  public playCrit(isLucky: boolean, mapId?: number, dungeonId?: number): void {
    if (mapId !== undefined && !this.isViewingDungeon(mapId, dungeonId)) return;
    if (!this.canPlay(isLucky ? 'loot_lucky' : 'loot_crit', 220)) return;
    this.playBuffer(isLucky ? 'loot_lucky' : 'loot_crit', 0.62, 0.98 + Math.random() * 0.04);
  }

  /** Henchman hire button: normal tactile button click regardless of hire count. */
  public playHire(_amount: number): void {
    this.playUi('tap');
  }

  /** Compute subtle drop-added gain from recent drop density (fades to 0 when constant). */
  public dropGainForRate(recentCount: number, isContinuous: boolean): number {
    if (isContinuous) return 0;
    if (recentCount <= 3) return 0.38;
    if (recentCount === 4) return 0.26;
    if (recentCount === 5) return 0.14;
    if (recentCount === 6) return 0.06;
    return 0;
  }

  /** Subtle crop/drop added pop: plays when intermittent, fades out & stops when constant. */
  public playDropAdded(mapId?: number, dungeonId?: number, isContinuous = false): void {
    if (mapId !== undefined && !this.isViewingDungeon(mapId, dungeonId)) return;
    const now = performance.now();
    // Prune sliding 2.5 s window and always record the tick so constant streams stay muted.
    const cutoff = now - 2500;
    while (this.dropTimestamps.length > 0 && this.dropTimestamps[0] < cutoff) {
      this.dropTimestamps.shift();
    }
    this.dropTimestamps.push(now);

    const gain = this.dropGainForRate(this.dropTimestamps.length, isContinuous);
    if (gain <= 0) return;
    if (!this.canPlay('drop_add', 130)) return;
    this.playBuffer('drop_add', gain, 0.94 + Math.random() * 0.14);
  }

  /** Staggered wooden/stone tile clatter when Sell Items tiles drop and bounce onto the board. */
  public playTileDrop(impactDelayS: number, isValuable = false): void {
    if (this.isSuppressed() || !this.soundOn || !this.ac || !this.sfxBus) return;
    if (this.ac.state !== 'running') return;
    const now = performance.now();
    if (now - this.tileDropWindowStart > 900) {
      this.tileDropWindowStart = now;
      this.tileDropCount = 0;
      this.tileDropScheduledUntil = 0;
    }
    // Budget to ~14 organic clacks across the full tumble so 45 tiles sound like
    // a crisp handful of carved tiles settling onto wood rather than a buzz.
    if (this.tileDropCount >= 14) return;
    const targetDelay = Math.max(0.02, impactDelayS + (Math.random() - 0.5) * 0.04);
    const minSlot = this.tileDropScheduledUntil + 0.038;
    const delayS = Math.max(targetDelay, minSlot);
    if (delayS > 0.92) return;

    this.tileDropScheduledUntil = delayS;
    this.tileDropCount += 1;

    const pool = ['hire_land', 'ui_tap_1', 'ui_tap_2'] as const;
    const cue = this.pickNoRepeat('tile_drop', pool);
    const vol = (isValuable ? 0.52 : 0.34) * (0.75 + Math.random() * 0.35);
    const rate = (isValuable ? 1.04 : 0.88) + Math.random() * 0.22;
    this.playBuffer(cue, vol, rate, delayS);
    // Tiny softer second bounce settle for early tiles
    if (this.tileDropCount <= 6 && delayS + 0.14 < 0.95) {
      this.playBuffer(cue, vol * 0.42, rate * 1.06, delayS + 0.14);
    }
  }

  /** Scale-locked ascending arpeggio tick for flying XP, sell coins, and hire landings. */
  public playCascadeTick(kind: 'xp' | 'coin' | 'hire'): void {
    if (!this.canPlay(`cascade_${kind}`, 65)) return;
    const now = performance.now();
    const prevAt = this.cascadeAt.get(kind) ?? 0;
    let step = now - prevAt > 750 ? 0 : ((this.cascadeStep.get(kind) ?? 0) + 1) % PENTATONIC_SEMITONES.length;
    this.cascadeAt.set(kind, now);
    this.cascadeStep.set(kind, step);

    const rate = semiToRate(PENTATONIC_SEMITONES[step]);
    if (kind === 'xp') {
      this.playBuffer('xp_fly_tick', 0.46, rate);
    } else if (kind === 'hire') {
      this.playBuffer('hire_land', 0.5, rate);
    } else {
      this.playBuffer('coin_collect', 0.62, rate);
    }
  }

  /** UI button feedback. */
  public playUi(kind: 'tap' | 'back' | 'tab' | 'toggle' | 'refuse' | 'purchase' | 'patron' | 'quest_ready' | 'scroll'): void {
    const gap = kind === 'tap' ? 40 : 60;
    if (!this.canPlay(`ui_${kind}`, gap)) return;
    switch (kind) {
      case 'tap':
        this.playBuffer(this.pickNoRepeat('ui_tap', UI_TAP_IDS), 0.55, 0.97 + Math.random() * 0.06);
        break;
      case 'back':
        this.playBuffer('ui_back', 0.65, 1.0);
        break;
      case 'tab':
        this.playBuffer('ui_tab', 0.65, 0.98 + Math.random() * 0.04);
        break;
      case 'toggle':
        this.playBuffer('ui_toggle', 0.65, 1.0);
        break;
      case 'refuse':
        this.playBuffer('ui_refuse', 0.72, 1.0);
        break;
      case 'purchase':
        this.playBuffer('shop_purchase', 0.88, 1.0);
        break;
      case 'patron':
        this.playBuffer('patron_pop', 0.82, 1.0);
        break;
      case 'quest_ready':
        this.playBuffer('quest_ready', 0.68, 1.0);
        break;
      case 'scroll':
        this.playBuffer('scroll_open', 0.95, 0.98 + Math.random() * 0.04);
        break;
    }
  }

  /** Chest shake buildup (automatically choked when chest pops open). */
  public playChestShake(): void {
    this.stopChestShake();
    this.activeChestShake = this.playBuffer('chest_shake', 0.78, 1.0);
  }

  public stopChestShake(): void {
    if (this.activeChestShake && this.ac) {
      const { src, gain } = this.activeChestShake;
      this.activeChestShake = null;
      try {
        const t = this.ac.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.16);
        src.stop(t + 0.18);
      } catch { /* ignore */ }
    }
  }

  /** Pack / chest card reveal with smooth tail-choking for rapid mashing. */
  public playCardReveal(rarity: string): void {
    if (this.activeReveal && this.ac) {
      const prev = this.activeReveal;
      this.activeReveal = null;
      try {
        const t = this.ac.currentTime;
        prev.gain.gain.cancelScheduledValues(t);
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, t);
        prev.gain.gain.linearRampToValueAtTime(0, t + 0.18);
        prev.src.stop(t + 0.2);
      } catch { /* ignore */ }
    }

    const r = String(rarity || 'Common').toLowerCase();
    let cue = 'card_reveal_common';
    let vol = 0.8;
    if (r === 'gold') { cue = 'card_reveal_gold'; vol = 0.85; }
    else if (r === 'xp') { cue = 'card_reveal_xp'; vol = 0.84; }
    else if (r === 'mabb') { cue = 'patron_pop'; vol = 0.88; }
    else if (r === 'legendary' || r === 'exotic') {
      cue = 'card_reveal_legendary';
      vol = 0.96;
      this.duckMusic(0.45, 1400);
    } else if (r === 'epic') {
      cue = 'card_reveal_epic';
      vol = 0.9;
      this.duckMusic(0.65, 800);
    } else if (r === 'rare') {
      cue = 'card_reveal_rare';
      vol = 0.85;
    }
    this.activeReveal = this.playBuffer(cue, vol, 1.0);
  }

  /** Epic card-upgrade screen audio arc: open -> charge -> climbing impacts -> level-up climax. */
  public playUpgradeOpen(): void {
    if (!this.canPlay('upgrade_open', 150)) return;
    this.playBuffer('upgrade_open', 0.88, 1.0);
  }

  public playUpgradeCharge(): void {
    if (!this.canPlay('upgrade_charge', 150)) return;
    this.duckMusic(0.68, 950);
    this.playBuffer('upgrade_charge', 0.9, 1.0);
  }

  public playUpgradeImpact(step: number, total: number): void {
    if (!this.canPlay('upgrade_impact', 50)) return;
    const frac = Math.max(0, Math.min(1, total > 1 ? (step - 1) / (total - 1) : 1));
    const idx = Math.min(PENTATONIC_SEMITONES.length - 1, Math.floor(frac * PENTATONIC_SEMITONES.length));
    const rate = semiToRate(PENTATONIC_SEMITONES[idx]);
    const vol = 0.62 + 0.24 * frac;
    this.playBuffer('upgrade_impact', vol, rate);
  }

  /** Major celebration / milestone fanfares with smooth music sidechain ducking. */
  public playFanfare(
    kind: 'chest_open' | 'card_levelup' | 'quest_collect' | 'level_unlock' | 'rank_up' | 'hero_unlock' | 'timewarp' | 'worldmap' | 'gold_shower',
  ): void {
    if (!this.canPlay(`fanfare_${kind}`, 180)) return;
    switch (kind) {
      case 'chest_open':
        this.stopChestShake();
        this.duckMusic(0.55, 1100);
        this.playBuffer('chest_open', 0.95, 1.0);
        break;
      case 'card_levelup':
        this.duckMusic(0.38, 1800);
        this.playBuffer('card_levelup', 1.0, 1.0);
        break;
      case 'quest_collect':
        this.duckMusic(0.68, 800);
        this.playBuffer('quest_collect', 0.88, 1.0);
        break;
      case 'level_unlock':
        this.duckMusic(0.65, 900);
        this.playBuffer('level_unlock', 0.88, 1.0);
        break;
      case 'rank_up':
        this.duckMusic(0.35, 2200);
        this.playBuffer('rank_up_fanfare', 1.0, 1.0);
        break;
      case 'hero_unlock':
        this.duckMusic(0.38, 1900);
        this.playBuffer('hero_unlock', 0.98, 1.0);
        break;
      case 'timewarp':
        this.duckMusic(0.5, 1300);
        this.playBuffer('timewarp_whoosh', 0.92, 1.0);
        break;
      case 'worldmap':
        this.playBuffer('worldmap_unfurl', 0.78, 1.0);
        break;
      case 'gold_shower':
        this.playBuffer('card_reveal_gold', 0.9, 1.0);
        break;
    }
  }

  /** Hero active power audio (strictly gated to viewed dungeon & rate-limited). */
  public playHeroPower(kind: string, mapId?: number, dungeonId?: number): void {
    if (mapId !== undefined && !this.isViewingDungeon(mapId, dungeonId)) return;
    const k = String(kind || '').toLowerCase();
    if (k === 'turret') {
      if (!this.canPlay('hero_turret', 260)) return;
      this.playBuffer('ui_tap_2', 0.35, 1.35 + Math.random() * 0.15);
      return;
    }
    if (k.includes('lightning') || k === 'chainlightning') {
      // One crisp electric zap per struck row, staggered cleanly so you hear the bolt chain down the rows.
      const now = performance.now();
      if (now - this.lightningBurstAt > 250) {
        this.lightningBurstAt = now;
        this.lightningBurstCount = 0;
      }
      const idx = this.lightningBurstCount;
      if (idx >= 5) return;
      this.lightningBurstCount += 1;
      const cue = this.pickNoRepeat('lightning_zap', LIGHTNING_IDS);
      const delayS = idx * 0.085;
      const rate = 0.94 + idx * 0.065 + Math.random() * 0.04;
      this.playBuffer(cue, 0.86, rate, delayS);
      return;
    }
    if (!this.canPlay(`hero_${k}`, 250)) return;
    if (k === 'cleave' || k === 'breach' || k === 'pounce' || k === 'hop' || k === 'sword_strike') {
      this.playBuffer('power_strike', 0.8, 0.95 + Math.random() * 0.1);
    } else if (k === 'hex' || k === 'transmute' || k === 'echo' || k === 'stealresources' || k === 'steal') {
      this.duckMusic(0.78, 550);
      this.playBuffer('power_arcane', 0.92, 0.97 + Math.random() * 0.06);
    } else {
      this.duckMusic(0.78, 550);
      this.playBuffer('power_buff', 0.9, 0.98 + Math.random() * 0.04);
    }
  }
  /** Debug/diagnostics snapshot of live audio state. */
  public getState() {
    return {
      screen: this.currentScreen,
      popupOpen: this.popupOpen,
      desiredTrack: this.desiredTrack,
      activeTrack: this.activeChannel?.id ?? null,
      fadingCount: this.fadingChannels.size,
      acState: this.ac?.state ?? 'uninitialized',
      sfxCount: this.sfxBuffers.size,
      musicCached: [...this.musicBuffers.keys()],
    };
  }
}

export const audio = new AudioEngine();
if (typeof window !== 'undefined') (window as any).__oorAudio = audio;
export default audio;
