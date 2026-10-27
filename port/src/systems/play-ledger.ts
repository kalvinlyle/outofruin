// Which Google Play purchases have already had their gold, by purchase token,
// so play-store.ts grants each one exactly once: a purchase stays "unfinished"
// in Play until it is consumed, and it is found again on every launch until then.
// Takes a Storage so it can be tested without a browser.

export const GRANTED_KEY = 'oor.play.granted';
/** Tokens are only needed until their purchase is consumed, seconds later; keep a generous tail. */
const KEEP = 200;

function read(store: Storage): string[] {
  try {
    const v = JSON.parse(store.getItem(GRANTED_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function alreadyGranted(store: Storage, token: string): boolean {
  return read(store).includes(token);
}

export function markGranted(store: Storage, token: string): void {
  const list = read(store).filter((t) => t !== token);
  list.push(token);
  try {
    store.setItem(GRANTED_KEY, JSON.stringify(list.slice(-KEEP)));
  } catch {
    /* storage full: the worst case is a crash-interrupted purchase granted twice */
  }
}
