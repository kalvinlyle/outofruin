// Gold packs through Google Play Billing in the Android app. Google requires
// Play Billing for digital goods in a Play-distributed app, so on native this
// replaces game/store.js's Stripe checkout behind the same window.OOR_STORE
// interface the shop already calls (kongregateController.ts): price(id) for the
// card labels, buy(id) to start a purchase, take() for what happened
// ({gold}, {error}, {closed}, {products}). See docs/play-billing.md.
//
// Every purchase is checked by game/api/play-claim.js against Google before its
// gold is granted, and consumed only afterwards, so a crash in between re-grants
// on the next launch instead of losing a paid purchase.
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { OTA_ORIGIN } from './live-updates';
import { track } from './analytics';

/** Same host as the update endpoint: the deployment that holds packs.js's prices and gold amounts. */
const API = OTA_ORIGIN;
const PENDING_KEY = 'oor.play.pending';
/** How long gold has to reach the save before the purchase is consumed. */
const CONSUME_DELAY_MS = 10_000;
const RETRY_MS = 15_000;

type Pack = { id: string; gold: number; amount: number };
type Pending = { token: string; product: string; t: number };

const events: string[] = [];
const prices = new Map<string, string>();
let buying = false;

function packs(): Pack[] {
  return ((globalThis as any).OOR_PACKS?.packs ?? []) as Pack[];
}

function readPending(): Pending[] {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; }
}
function writePending(list: Pending[]) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch { /* the token is re-found at next launch */ }
}
function remember(token: string, product: string) {
  writePending([...readPending().filter((p) => p.token !== token), { token, product, t: Date.now() }]);
}
function forget(token: string) {
  writePending(readPending().filter((p) => p.token !== token));
}

async function post(path: string, body: unknown): Promise<any> {
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

/**
 * Ask the server about one purchase and act on the answer. True when the token
 * is settled (granted, consumed or invalid); false to ask again later.
 */
async function claim(p: { token: string; product: string }): Promise<boolean> {
  let r: any;
  try {
    r = await post('/api/play-claim', { product: p.product, token: p.token });
  } catch {
    return false;
  }
  if (r.status === 'granted') {
    const before = currentGold();
    events.push(JSON.stringify({ gold: r.gold }));
    const pack = packs().find((x) => x.id === p.product);
    track('gold_purchased', {
      product: p.product,
      gold: r.gold,
      price_usd: pack ? pack.amount / 100 : undefined,
      store: 'google_play',
      transaction_id: p.token.slice(0, 64),
      ...(before !== undefined ? { gold_before: before, gold_after: before + Number(r.gold) } : {}),
    });
    setTimeout(() => {
      NativePurchases.consumePurchase({ purchaseToken: p.token }).then(() => forget(p.token), () => { /* retried next launch */ });
    }, CONSUME_DELAY_MS);
    return true;
  }
  if (r.status === 'pending') return false;
  // consumed or invalid: nothing is owed
  if (r.status === 'consumed') {
    NativePurchases.consumePurchase({ purchaseToken: p.token }).catch(() => {});
  }
  forget(p.token);
  return true;
}

function currentGold(): number | undefined {
  try {
    // defsave's HTML5 key for the Currency file (controller.script.ts sets the appname).
    const v = JSON.parse(localStorage.getItem('out_of_ruin_Currency') || '{}');
    if (typeof v?.Gold === 'number') return v.Gold;
  } catch { /* unknown */ }
  return undefined;
}

let recovering = false;
/** Settle every purchase not yet delivered: our own list, plus anything Google still holds unacknowledged. */
async function recover() {
  if (recovering) return;
  recovering = true;
  try {
    const seen = new Map(readPending().map((p) => [p.token, p]));
    try {
      const { transactions } = await NativePurchases.getUnfinishedTransactions();
      for (const tx of transactions ?? []) {
        if (tx.purchaseToken && tx.productIdentifier && !seen.has(tx.purchaseToken) && tx.purchaseState === '1') {
          remember(tx.purchaseToken, tx.productIdentifier);
          seen.set(tx.purchaseToken, { token: tx.purchaseToken, product: tx.productIdentifier, t: Date.now() });
        }
      }
    } catch { /* Play unreachable: our own list still runs */ }
    let retry = false;
    for (const p of seen.values()) if (!(await claim(p))) retry = true;
    if (retry) setTimeout(() => { void recover(); }, RETRY_MS);
  } finally {
    recovering = false;
  }
}

async function buy(id: string) {
  if (buying) return;
  buying = true;
  try {
    const tx = await NativePurchases.purchaseProduct({
      productIdentifier: id,
      productType: PURCHASE_TYPE.INAPP,
      isConsumable: false, // consumed by us, after the server has confirmed it
      autoAcknowledgePurchases: false,
    });
    if (!tx?.purchaseToken) { events.push(JSON.stringify({ closed: true })); return; }
    remember(tx.purchaseToken, id);
    if (tx.purchaseState && tx.purchaseState !== '1') {
      // Paid by a method that has not cleared: the gold arrives once it does.
      events.push(JSON.stringify({ closed: true }));
      setTimeout(() => { void recover(); }, RETRY_MS);
      return;
    }
    if (!(await claim({ token: tx.purchaseToken, product: id }))) {
      events.push(JSON.stringify({ closed: true }));
      setTimeout(() => { void recover(); }, RETRY_MS);
    }
  } catch (err: any) {
    const cancelled = /cancel/i.test(String(err?.message ?? err)) || err?.code === 'USER_CANCELLED';
    events.push(JSON.stringify(cancelled ? { closed: true } : { error: true }));
    if (!cancelled) console.warn('[play-store] purchase failed', err);
  } finally {
    buying = false;
  }
}

/** Replace the web store with Play Billing. Android only; iOS keeps no store until StoreKit is wired. */
export async function installPlayStore() {
  if (Capacitor.getPlatform() !== 'android') return;
  (globalThis as any).OOR_STORE = {
    price: (id: string) => prices.get(id) ?? '',
    buy: (id: string) => { void buy(id); return ''; },
    take: () => events.shift() ?? '',
  };
  try {
    const status = await fetch(API + '/api/status').then((r) => r.json());
    if (!status?.play) return; // packs stay unavailable until the server can verify purchases
    const { products } = await NativePurchases.getProducts({ productIdentifiers: packs().map((p) => p.id), productType: PURCHASE_TYPE.INAPP });
    for (const p of products ?? []) if (p.identifier && p.priceString) prices.set(p.identifier, p.priceString);
    if (prices.size) events.push(JSON.stringify({ products: true }));
  } catch (err) {
    console.warn('[play-store] products unavailable', err);
  }
  void recover();
}
