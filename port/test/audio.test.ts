import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import audio from '../src/systems/audio';

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
});
