// Which Google Play purchases have already had their gold, by purchase token,
// and the delivery queue that ensures tokens are marked granted and consumed
// ONLY after the game persists the reward pack to Loot storage and calls confirm(token).
// Pure module (no browser/Capacitor/analytics imports) so tests run directly in Node.

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

export type Pack = { id: string; gold: number; amount: number };

type PendingGrant = {
  product: string;
  pack: Pack;
};

export interface PlayDeliveryDeps {
  storage: Storage;
  getPacks: () => Pack[];
  currentGold: () => number | undefined;
  scheduleConsume: (token: string) => void;
  onTrack: (event: string, props: Record<string, unknown>) => void;
}

/**
 * Pure delivery queue for Play purchases:
 *   1. deliver(token, product) queues `{ gold, token }` without marking granted or consuming.
 *   2. take() hands `{ gold, token }` to kongregateController without marking granted or consuming.
 *   3. confirm(token) runs ONLY after lootController persists the reward pack via defsave.save("Loot", true):
 *      it marks the token granted, tracks gold_purchased, and schedules Play consumption.
 * Any crash before defsave.save("Loot", true) completes leaves the token unrecorded and unconsumed,
 * so the next launch's recover() delivers the paid gold cleanly.
 */
export function createPlayDeliveryQueue(deps: PlayDeliveryDeps) {
  const queue: string[] = [];
  const pending = new Map<string, PendingGrant>();

  function pushEvent(payload: Record<string, unknown>): void {
    queue.push(JSON.stringify(payload));
  }

  function deliver(token: string, product: string): boolean {
    const pack = deps.getPacks().find((p) => p.id === product);
    if (!pack) return false;
    if (alreadyGranted(deps.storage, token)) {
      // Already saved to Loot in an earlier session before consumption completed.
      deps.scheduleConsume(token);
      return true;
    }
    if (pending.has(token)) return true;
    pending.set(token, { product, pack });
    queue.push(JSON.stringify({ gold: pack.gold, token }));
    return true;
  }

  function take(): string {
    return queue.shift() ?? '';
  }

  /** Called by lootController only after defsave.save("Loot", true) has persisted the gold pack. */
  function confirm(token: string): boolean {
    if (!token) return false;
    const entry = pending.get(token);
    pending.delete(token);
    if (!entry) return false;
    if (!alreadyGranted(deps.storage, token)) {
      const before = deps.currentGold();
      markGranted(deps.storage, token);
      deps.onTrack('gold_purchased', {
        product: entry.product,
        gold: entry.pack.gold,
        price_usd: entry.pack.amount / 100,
        store: 'google_play',
        transaction_id: token.slice(0, 64),
        ...(before !== undefined ? { gold_before: before, gold_after: before + entry.pack.gold } : {}),
      });
    }
    deps.scheduleConsume(token);
    return true;
  }

  return { deliver, pushEvent, take, confirm };
}
