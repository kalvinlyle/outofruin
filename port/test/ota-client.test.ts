// The app-side rules: which channel a bundle is on, when the player is told to
// update from the store, and the save checkpoint that makes leaving the beta safe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { channelOf, storeUpdateNeeded } from '../src/systems/live-updates';
import {
  BETA_KEY, CHECKPOINT_KEY, BETA_SAVE_KEY, writeCheckpoint, restoreCheckpoint,
  saveDivergedFromCheckpoint, requestRestore, applyPendingRestore,
} from '../src/systems/save-checkpoint';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

test('channelOf: beta means ahead of the public release', () => {
  assert.equal(channelOf({ id: 'builtin', version: '1.0' }, null), 'public', 'the store build is public');
  assert.equal(channelOf({ id: 'x', version: '1.0.3' }, { public: '1.0.2' }), 'beta');
  assert.equal(channelOf({ id: 'x', version: '1.0.2' }, { public: '1.0.2' }), 'public');
  assert.equal(channelOf({ id: 'x', version: '1.0.1' }, { public: '1.0.2' }), 'public', 'an older public bundle is not a beta');
  assert.equal(channelOf({ id: 'x', version: '1.0.2' }, { public: null }), 'beta', 'nothing released yet');
  assert.equal(channelOf({ id: 'x', version: '1.0.2' }, null), null, 'unknown is never guessed');
});

test('storeUpdateNeeded: only for a newer bundle this shell cannot run', () => {
  const index = { public: '1.0.3', bundles: [{ version: '1.0.3', min_native: '1.1' }] };
  assert.equal(storeUpdateNeeded(index, false, '1.0.2', '1.0'), '1.0.3');
  assert.equal(storeUpdateNeeded(index, false, '1.0.2', '1.1'), null, 'the shell can run it');
  assert.equal(storeUpdateNeeded(index, false, '1.0.3', '1.0'), null, 'already on it');
  assert.equal(storeUpdateNeeded(null, false, '1.0.2', '1.0'), null);
});

test('the checkpoint round-trips the save and leaves the beta flag and checkouts alone', () => {
  const s = new MemStorage();
  s.setItem('OoR_profile', 'public-save');
  s.setItem('oor.checkouts', '["cs_1"]');
  writeCheckpoint(s, '1.0.2', 1);
  s.setItem('OoR_profile', 'beta-save');
  s.setItem('OoR_newfile', 'beta-only');
  s.setItem(BETA_KEY, '0');
  s.setItem('oor.checkouts', '["cs_1","cs_2"]');
  assert.equal(saveDivergedFromCheckpoint(s), true);
  assert.equal(restoreCheckpoint(s), true);
  assert.equal(s.getItem('OoR_profile'), 'public-save');
  assert.equal(s.getItem('OoR_newfile'), null, 'keys public code never saw are removed');
  assert.equal(s.getItem(BETA_KEY), '0', 'restoring must not re-join the beta');
  assert.equal(s.getItem('oor.checkouts'), '["cs_1","cs_2"]', 'an uncredited purchase is never rolled back');
  assert.match(s.getItem(BETA_SAVE_KEY)!, /beta-save/, 'the beta save is set aside, not deleted');
  assert.ok(!JSON.parse(s.getItem(CHECKPOINT_KEY)!).keys[CHECKPOINT_KEY]);
});

test('no divergence means no warning', () => {
  const s = new MemStorage();
  s.setItem('OoR_profile', 'same');
  writeCheckpoint(s, '1.0.2', 1);
  assert.equal(saveDivergedFromCheckpoint(s), false);
});

test('the restore runs at the next boot, once', () => {
  const s = new MemStorage();
  assert.equal(requestRestore(s), false, 'nothing to restore without a checkpoint');
  s.setItem('OoR_profile', 'public-save');
  writeCheckpoint(s, '1.0.2', 1);
  s.setItem('OoR_profile', 'beta-save');
  assert.equal(requestRestore(s), true);
  // The beta keeps autosaving until the reload; the boot restore must win anyway.
  s.setItem('OoR_profile', 'beta-autosave');
  assert.equal(applyPendingRestore(s), true);
  assert.equal(s.getItem('OoR_profile'), 'public-save');
  assert.equal(applyPendingRestore(s), false, 'and only once');
});
