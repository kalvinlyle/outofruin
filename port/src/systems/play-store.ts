// Gold packs through Google Play Billing in the Android app. Google requires
// Play Billing for digital goods in a Play-distributed app, so on native this
// replaces game/store.js's Stripe checkout behind the same window.OOR_STORE
// interface the shop already calls (kongregateController.ts): price(id) for the
// card labels, buy(id) to start a purchase, take() for what happened
// ({gold}, {error}, {closed}, {products}). See docs/play-billing.md.
//
// Purchases are granted on the device from Play's own result: no server, so gold
// arrives at once, offline included. Each purchase token is granted exactly once
// (play-ledger.ts) and consumed a moment later, so a crash between the two grants
// it on the next launch instead of losing a paid purchase, and never twice.
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { track } from './analytics';
import { alreadyGranted, markGranted } from './play-ledger';

/** How long the gold has to reach the save before the purchase is consumed. */
const CONSUME_DELAY_MS = 10_000;
const RETRY_MS = 15_000;

type Pack = { id: string; gold: number; amount: number };

const events: string[] = [];
const prices = new Map<string, string>();
let buying = false;

function packs(): Pack[] {
  return ((globalThis as any).OOR_PACKS?.packs ?? []) as Pack[];
}

function currentGold(): number | undefined {
  try {
    // defsave's HTML5 key for the Currency file (controller.script.ts sets the appname).
    const v = JSON.parse(localStorage.getItem('out_of_ruin_Currency') || '{}');
    if (typeof v?.Gold === 'number') return v.Gold;
  } catch { /* unknown */ }
  return undefined;
}

function consumeSoon(token: string) {
  setTimeout(() => {
    NativePurchases.consumePurchase({ purchaseToken: token }).catch(() => { /* still unfinished: the next launch consumes it */ });
  }, CONSUME_DELAY_MS);
}

/**
 * Deliver one paid purchase: its pack's gold (from packs.js, never from the
 * purchase), once per token, then consume it so the pack can be bought again.
 */
function deliver(token: string, product: string): boolean {
  const pack = packs().find((p) => p.id === product);
  if (!pack) return false;
  if (!alreadyGranted(localStorage, token)) {
    const before = currentGold();
    markGranted(localStorage, token);
    events.push(JSON.stringify({ gold: pack.gold }));
    track('gold_purchased', {
      product,
      gold: pack.gold,
      price_usd: pack.amount / 100,
      store: 'google_play',
      transaction_id: token.slice(0, 64),
      ...(before !== undefined ? { gold_before: before, gold_after: before + pack.gold } : {}),
    });
  }
  consumeSoon(token);
  return true;
}

let recovering = false;
/**
 * Deliver every purchase Play still holds unfinished: paid while the app was
 * closed, interrupted by a crash, or a pending payment that has since cleared.
 */
async function recover() {
  if (recovering) return;
  recovering = true;
  try {
    const { transactions } = await NativePurchases.getUnfinishedTransactions();
    for (const tx of transactions ?? []) {
      if (tx.purchaseToken && tx.productIdentifier && tx.purchaseState === '1') deliver(tx.purchaseToken, tx.productIdentifier);
    }
  } catch { /* Play unreachable: the next launch tries again */ } finally {
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
      isConsumable: false, // consumed by deliver(), after the gold is handed over
      autoAcknowledgePurchases: false,
    });
    if (!tx?.purchaseToken) { events.push(JSON.stringify({ closed: true })); return; }
    if (tx.purchaseState && tx.purchaseState !== '1') {
      // Paid by a method that has not cleared (cash at a shop): the gold arrives once it does.
      events.push(JSON.stringify({ closed: true }));
      setTimeout(() => { void recover(); }, RETRY_MS);
      return;
    }
    if (!deliver(tx.purchaseToken, id)) events.push(JSON.stringify({ error: true }));
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
    const { products } = await NativePurchases.getProducts({ productIdentifiers: packs().map((p) => p.id), productType: PURCHASE_TYPE.INAPP });
    for (const p of products ?? []) if (p.identifier && p.priceString) prices.set(p.identifier, p.priceString);
    if (prices.size) events.push(JSON.stringify({ products: true }));
  } catch (err) {
    // No Play on this device, or offline at boot: packs show as unavailable.
    console.warn('[play-store] products unavailable', err);
  }
  void recover();
  // A pending payment can clear while the app sits in the background.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void recover(); });
}
