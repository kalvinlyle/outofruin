// A known-good copy of the save, taken while a public (released) bundle runs.
//
// Leaving the beta is a code downgrade: the updater drops back to the bundle
// inside the app, which then reads a save newer code wrote. defsave falls back
// to an empty table on anything it cannot parse, so a changed save shape would
// not crash, it would read as a fresh game. The checkpoint is taken at the only
// moment it is guaranteed readable by public code: while public code is running.
//
// The game's saves are localStorage keys (defsave's `<appname>_<file>`), so the
// checkpoint is every key except the ones below. Everything takes a Storage so
// it can be tested without a browser.

/** Where the checkpoint lives. */
export const CHECKPOINT_KEY = 'oor.ota.checkpoint';
/** The save as it was when the player left the beta, kept so it is recoverable. */
export const BETA_SAVE_KEY = 'oor.ota.betasave';
/** The player's Beta updates choice. */
export const BETA_KEY = 'oor.ota.beta';
/** Set when leaving the beta; the next boot restores the checkpoint before the game reads its save. */
export const RESTORE_KEY = 'oor.ota.restore';

/** Keys that never travel in a checkpoint. */
const EXCLUDED = new Set([
  CHECKPOINT_KEY,
  BETA_SAVE_KEY,
  // Restoring it would put the player straight back into the beta they left.
  BETA_KEY,
  RESTORE_KEY,
  // Gold purchases still being claimed (game/store.js). Rolling the list back
  // could drop a paid checkout that has not been credited yet.
  'oor.checkouts',
]);

function isSaveKey(k: string) {
  return !EXCLUDED.has(k);
}

export function collectSave(store: Storage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (!k || !isSaveKey(k)) continue;
    const v = store.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
}

/** Write a checkpoint stamped with the bundle that produced it. */
export function writeCheckpoint(store: Storage, bundle: string, at: number): boolean {
  try {
    store.setItem(CHECKPOINT_KEY, JSON.stringify({ bundle, at, keys: collectSave(store) }));
    return true;
  } catch {
    // Storage full. A safety net failing must never break the game.
    return false;
  }
}

export function readCheckpoint(store: Storage): { bundle: string; at: number; keys: Record<string, string> } | null {
  try {
    const raw = store.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !d.keys || typeof d.keys !== 'object') return null;
    return { bundle: String(d.bundle ?? ''), at: Number(d.at) || 0, keys: d.keys };
  } catch {
    return null;
  }
}

/**
 * Put the checkpoint back, setting the current save aside first so progress
 * made on the beta is recoverable. Keys the checkpoint does not have are
 * removed: a key the public code has never seen is how a downgrade produces a
 * half-migrated save.
 */
export function restoreCheckpoint(store: Storage): boolean {
  const cp = readCheckpoint(store);
  if (!cp) return false;
  const current = collectSave(store);
  try {
    store.setItem(BETA_SAVE_KEY, JSON.stringify({ at: cp.at, keys: current }));
  } catch {
    /* best-effort; the restore still matters more */
  }
  for (const k of Object.keys(current)) if (!(k in cp.keys)) store.removeItem(k);
  for (const [k, v] of Object.entries(cp.keys)) store.setItem(k, v);
  return true;
}

/**
 * Ask the next boot to restore the checkpoint. Restoring in the running game
 * would race its autosave, which writes the in-memory beta save straight back.
 */
export function requestRestore(store: Storage): boolean {
  if (!readCheckpoint(store)) return false;
  try {
    store.setItem(RESTORE_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Run at the very top of boot, before defsave loads anything. True when a
 * checkpoint was put back.
 */
export function applyPendingRestore(store: Storage): boolean {
  try {
    if (store.getItem(RESTORE_KEY) !== '1') return false;
    store.removeItem(RESTORE_KEY);
    return restoreCheckpoint(store);
  } catch {
    return false;
  }
}

/**
 * Would reverting lose anything? Compared by value: a player who took a beta
 * bundle and played nothing has nothing to lose and is not warned.
 */
export function saveDivergedFromCheckpoint(store: Storage): boolean {
  const cp = readCheckpoint(store);
  if (!cp) return false;
  const now = collectSave(store);
  const keys = new Set([...Object.keys(cp.keys), ...Object.keys(now)]);
  for (const k of keys) if (cp.keys[k] !== now[k]) return true;
  return false;
}
