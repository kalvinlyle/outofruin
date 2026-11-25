// Which Google Play purchases have already had their gold, by purchase token,
// and the delivery queue that ensures tokens are marked granted and consumed
// ONLY once the live game takes the reward via OOR_STORE.take().
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

type QueueItem = {
  payload: string;
  onTaken?: () => void;
};

export interface PlayDeliveryDeps {
  storage: Storage;
  getPacks: () => Pack[];
  currentGold: () => number | undefined;
  scheduleConsume: (token: string) => void;
  onTrack: (event: string, props: Record<string, unknown>) => void;
}

/**
 * Pure delivery queue for Play purchases: neither the granted ledger nor Play
 * consumption runs until take() hands the gold to the live game loop, so a
 * crash or long boot before take() leaves the purchase recoverable on next launch.
 */
export function createPlayDeliveryQueue(deps: PlayDeliveryDeps) {
  const queue: QueueItem[] = [];
  const inFlightTokens = new Set<string>();

  function pushEvent(payload: Record<string, unknown>): void {
    queue.push({ payload: JSON.stringify(payload) });
  }

  function deliver(token: string, product: string): boolean {
    const pack = deps.getPacks().find((p) => p.id === product);
    if (!pack) return false;
    if (alreadyGranted(deps.storage, token)) {
      // Already handed to the game in an earlier session before consumption completed.
      deps.scheduleConsume(token);
      return true;
    }
    if (inFlightTokens.has(token)) return true;
    inFlightTokens.add(token);
    queue.push({
      payload: JSON.stringify({ gold: pack.gold }),
      onTaken: () => {
        inFlightTokens.delete(token);
        if (!alreadyGranted(deps.storage, token)) {
          const before = deps.currentGold();
          markGranted(deps.storage, token);
          deps.onTrack('gold_purchased', {
            product,
            gold: pack.gold,
            price_usd: pack.amount / 100,
            store: 'google_play',
            transaction_id: token.slice(0, 64),
            ...(before !== undefined ? { gold_before: before, gold_after: before + pack.gold } : {}),
          });
        }
        deps.scheduleConsume(token);
      },
    });
    return true;
  }

  function take(): string {
    const item = queue.shift();
    if (!item) return '';
    item.onTaken?.();
    return item.payload;
  }

  return { deliver, pushEvent, take };
}
