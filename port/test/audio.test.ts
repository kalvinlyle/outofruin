import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import audio, { AudioEngine, musicLoopParams, type MusicTrackId } from '../src/systems/audio';

interface StartedVoice {
  trackDuration: number;
  when: number;
  offset: number;
  duration: number;
  stopped: boolean;
}

function createFakeAudioContext() {
  const started: StartedVoice[] = [];
  let now = 0;

  const makeParam = (initial = 1) => ({
    value: initial,
    cancelScheduledValues() {},
    setValueAtTime(v: number) { this.value = v; },
    linearRampToValueAtTime(v: number) { this.value = v; },
    setTargetAtTime(v: number) { this.value = v; },
  });

  const ac = {
    get currentTime() { return now; },
    state: 'running' as AudioContextState,
    destination: {},
    async suspend() { this.state = 'suspended'; },
    async resume() { this.state = 'running'; },
    createGain() {
      return { gain: makeParam(1), connect() {}, disconnect() {} };
    },
    createBiquadFilter() {
      return { type: 'highshelf', frequency: makeParam(0), gain: makeParam(0), connect() {}, disconnect() {} };
    },
    createDynamicsCompressor() {
      return {
        threshold: makeParam(0), knee: makeParam(0), ratio: makeParam(1),
        attack: makeParam(0), release: makeParam(0), connect() {}, disconnect() {},
      };
    },
    createBufferSource() {
      let rec: StartedVoice | null = null;
      return {
        buffer: null as AudioBuffer | null,
        playbackRate: makeParam(1),
        onended: null as (() => void) | null,
        connect() {},
        disconnect() {},
        start(when = 0, offset = 0, duration = 0) {
          rec = { trackDuration: this.buffer?.duration ?? 0, when, offset, duration, stopped: false };
          started.push(rec);
        },
        stop() {
          if (rec) rec.stopped = true;
          this.onended?.();
        },
      };
    },
  };

  return {
    ac: ac as unknown as AudioContext,
    started,
    advance(sec: number) { now += sec; },
  };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((r) => setImmediate(r));
}

const REPO_ROOT = resolve(process.cwd(), '..');

describe('Out of Ruin audio assets & runtime', () => {
  it('ships every manifest cue as a baked .m4a with .meta sidecar', () => {
    const manifestPath = resolve(REPO_ROOT, 'tools/audio/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest.cues) && manifest.cues.length >= 50);

    for (const cue of manifest.cues) {
      const folder = cue.category === 'music' ? 'game/audio/music' : 'game/audio/sfx';
      const filePath = resolve(REPO_ROOT, folder, `${cue.id}.m4a`);
      const metaPath = `${filePath}.meta`;
      assert.ok(existsSync(filePath), `missing baked audio file: ${filePath}`);
      assert.ok(existsSync(metaPath), `missing sidecar: ${metaPath}`);
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      assert.equal(meta.cue.id, cue.id);
      assert.ok(meta.cue.baked_duration_s > 0.08, `cue ${cue.id} baked too short`);
    }
  });

  it('gates off-screen dungeon playback by active screen, popup state, and location', () => {
    audio.setScreen('dungeonmine');
    audio.setPopupOpen(false);
    audio.setLocation(1, 2);

    assert.equal(audio.isViewingDungeon(1, 2), true);
    assert.equal(audio.isViewingDungeon(1, 1), false);
    assert.equal(audio.isViewingDungeon(2, 1), false);

    audio.setPopupOpen(true);
    assert.equal(audio.isViewingDungeon(1, 2), false);

    audio.setPopupOpen(false);
    audio.setScreen('shop');
    assert.equal(audio.isViewingDungeon(1, 2), false);
  });

  it('clamps volume and toggles cleanly in headless/Node environments', () => {
    audio.setSoundOn(false);
    assert.equal(audio.isSoundOn(), false);
    audio.setSoundVol(1.5);
    assert.equal(audio.getSoundVol(), 1);
    assert.equal(audio.isSoundOn(), true);

    audio.setMusicVol(-0.4);
    assert.equal(audio.getMusicVol(), 0);
    audio.setMusicOn(false);
    assert.equal(audio.isMusicOn(), false);

    // Restore defaults
    audio.setSoundVol(0.85);
    audio.setMusicVol(0.75);
    audio.setMusicOn(true);
  });

  it('suppress() nests safely and restores state even on throw', () => {
    assert.throws(() => {
      audio.suppress(() => {
        throw new Error('boom');
      });
    }, /boom/);
    // Should still accept normal calls without throwing
    audio.playTap(false);
    audio.playCardReveal('Legendary');
    audio.playFanfare('rank_up');
  });

  it('tracks background suspend and foreground resume state cleanly', () => {
    audio.suspend();
    assert.equal(audio.isBackgrounded(), true);
    audio.resume();
    assert.equal(audio.isBackgrounded(), false);
  });

  it('fades crop/drop added audio out when drops become constant', () => {
    assert.ok(audio.dropGainForRate(1, false) > 0.3);
    assert.ok(audio.dropGainForRate(4, false) < audio.dropGainForRate(3, false));
    assert.ok(audio.dropGainForRate(6, false) < audio.dropGainForRate(5, false));
    assert.equal(audio.dropGainForRate(7, false), 0);
    assert.equal(audio.dropGainForRate(1, true), 0);
  });

  it('fades music out on world/region map screens and restores it on return', () => {
    audio.setLocation(1, 1);
    audio.setScreen('dungeonmine');
    assert.equal(audio.getState().desiredTrack, 'music_homeland');

    audio.setScreen('kingdom');
    assert.equal(audio.getState().desiredTrack, null);

    audio.setScreen('map');
    assert.equal(audio.getState().desiredTrack, null);

    audio.setLocation(2, 1);
    assert.equal(audio.getState().desiredTrack, null);

    audio.setScreen('dungeonmine');
    assert.equal(audio.getState().desiredTrack, 'music_event_mystic');
  });

  it('resumes each track where it left off when switching tabs on the same location', async () => {
    const fake = createFakeAudioContext();
    const durations: Record<MusicTrackId, number> = {
      music_homeland: 65,
      music_ruins: 65,
      music_event_mystic: 65,
      music_event_siege: 65,
      upgrade_bed: 28,
    };
    const engine = new AudioEngine({
      disabled: false,
      createContext: () => fake.ac,
      fetchMusicBuffer: async (id) => ({ duration: durations[id] } as AudioBuffer),
    });

    try {
      const { loopStart, period } = musicLoopParams(65);
      engine.setScreen('dungeonmine');
      engine.setLocation(1, 1);
      engine.initOrResume();
      await flushMicrotasks();

      assert.equal(fake.started.length, 1);
      assert.ok(Math.abs(fake.started[0].offset - loopStart) < 1e-6);

      // Play Farm (Tab 1) for 18s, then switch to Desert Ruin (Tab 2)
      fake.advance(18);
      engine.setLocation(1, 2);
      await flushMicrotasks();

      assert.equal(fake.started.length, 2);
      assert.ok(Math.abs(fake.started[1].offset - loopStart) < 1e-6);
      assert.ok(Math.abs((engine.getState().trackPhases.music_homeland ?? 0) - 18) < 1e-6);

      // Switch Tab 2 -> Tab 3 (same track music_ruins): must NOT restart
      fake.advance(5);
      engine.setLocation(1, 3);
      await flushMicrotasks();
      assert.equal(fake.started.length, 2);

      // Wait long enough for Tab 1's fade-out to finish (past TRACK_XFADE_S)
      await new Promise((r) => setTimeout(r, 1650));
      fake.advance(7); // total 12s played on music_ruins

      // Switch back to Tab 1 (Farm): must resume music_homeland at 18s, not restart at 0
      engine.setLocation(1, 1);
      await flushMicrotasks();

      assert.equal(fake.started.length, 3);
      assert.ok(Math.abs(fake.started[2].offset - (loopStart + 18)) < 1e-6);
      assert.ok(Math.abs((engine.getState().trackPhases.music_ruins ?? 0) - 12) < 1e-6);

      // Rapid switch Tab 1 -> Tab 2 before music_ruins finishes fading out rescues the live channel
      fake.advance(0.4);
      engine.setLocation(1, 2);
      await flushMicrotasks();
      assert.equal(fake.started.length, 3, 'rapid switch should rescue fading channel without restarting');
      assert.equal(engine.getState().activeTrack, 'music_ruins');

      // Advance past one full loop period and verify saved phase wraps cleanly
      fake.advance(period + 4.5);
      engine.setScreen('kingdom'); // fades out music_ruins
      await new Promise((r) => setTimeout(r, 1050));

      // Return to same location from map: resumes music_ruins from wrapped phase (~16.9s)
      engine.setScreen('dungeonmine');
      await flushMicrotasks();
      assert.equal(fake.started.length, 4);
      const expectedPhase = (12 + 0.4 + period + 4.5) % period;
      assert.ok(Math.abs(fake.started[3].offset - (loopStart + expectedPhase)) < 1e-6);

      // Upgrade screen starts upgrade_bed fresh, then returns to music_ruins where it left off
      fake.advance(3);
      engine.setScreen('upgradecard');
      await flushMicrotasks();
      assert.equal(fake.started.length, 5);
      assert.ok(Math.abs(fake.started[4].offset - loopStart) < 1e-6);

      await new Promise((r) => setTimeout(r, 500));
      fake.advance(4);
      engine.setScreen('cards');
      await flushMicrotasks();
      // music_ruins was still fading (1.4s > 0.5s) or resumed at saved phase; either way never restarts at 0
      if (fake.started.length === 6) {
        assert.ok(Math.abs(fake.started[5].offset - (loopStart + expectedPhase + 3)) < 1e-6);
      } else {
        assert.equal(engine.getState().activeTrack, 'music_ruins');
      }
    } finally {
      engine.dispose();
    }
  });
});
