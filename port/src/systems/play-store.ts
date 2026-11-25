// Gold packs through Google Play Billing in the Android app. Google requires
// Play Billing for digital goods in a Play-distributed app, so on native this
// replaces game/store.js's Stripe checkout behind the same window.OOR_STORE
// interface the shop already calls (kongregateController.ts): price(id) for the
// card labels, buy(id) to start a purchase, take() for what happened
// ({gold}, {error}, {closed}, {products}). See docs/play-billing.md.
//
// Purchases are granted on the device from Play's own result: no server, so gold
// arrives at once, offline included. A token is marked granted in play-ledger.ts
// and scheduled for consumption ONLY when the live game actually takes the grant
// via OOR_STORE.take() (after start_game). A crash or slow boot before take()
// therefore leaves the purchase unfinished in Play and unrecorded in the ledger,
// so the next launch recovers and delivers the paid gold instead of losing it.
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { track } from './analytics';
import { createPlayDeliveryQueue, type Pack } from './play-ledger';

/** How long the gold has to reach the save after take() before the purchase is consumed. */
const CONSUME_DELAY_MS = 10_000;
const RETRY_MS = 15_000;

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

let delivery: ReturnType<typeof createPlayDeliveryQueue> | null = null;
function getDelivery() {
  if (!delivery) {
    delivery = createPlayDeliveryQueue({
      storage: localStorage,
      getPacks: packs,
      currentGold,
      scheduleConsume: consumeSoon,
      onTrack: track,
    });
  }
  return delivery;
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
      if (tx.purchaseToken && tx.productIdentifier && tx.purchaseState === '1') {
        getDelivery().deliver(tx.purchaseToken, tx.productIdentifier);
      }
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
      isConsumable: false, // consumed after take() hands gold to the live game
      autoAcknowledgePurchases: false,
    });
    if (!tx?.purchaseToken) { getDelivery().pushEvent({ closed: true }); return; }
    if (tx.purchaseState && tx.purchaseState !== '1') {
      // Paid by a method that has not cleared (cash at a shop): the gold arrives once it does.
      getDelivery().pushEvent({ closed: true });
      setTimeout(() => { void recover(); }, RETRY_MS);
      return;
    }
    if (!getDelivery().deliver(tx.purchaseToken, id)) getDelivery().pushEvent({ error: true });
  } catch (err: any) {
    const cancelled = /cancel/i.test(String(err?.message ?? err)) || err?.code === 'USER_CANCELLED';
    getDelivery().pushEvent(cancelled ? { closed: true } : { error: true });
    if (!cancelled) console.warn('[play-store] purchase failed', err);
  } finally {
    buying = false;
  }
}

/** Replace the web store with Play Billing. Android only; iOS keeps no store until StoreKit is wired. */
export async function installPlayStore() {
  if (Capacitor.getPlatform() !== 'android') return;
  const q = getDelivery();
  (globalThis as any).OOR_STORE = {
    price: (id: string) => prices.get(id) ?? '',
    buy: (id: string) => { void buy(id); return ''; },
    take: () => q.take(),
  };
  try {
    const { products } = await NativePurchases.getProducts({ productIdentifiers: packs().map((p) => p.id), productType: PURCHASE_TYPE.INAPP });
    for (const p of products ?? []) if (p.identifier && p.priceString) prices.set(p.identifier, p.priceString);
    if (prices.size) q.pushEvent({ products: true });
  } catch (err) {
    // No Play on this device, or offline at boot: packs show as unavailable.
    console.warn('[play-store] products unavailable', err);
  }
  void recover();
  // A pending payment can clear while the app sits in the background.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void recover(); });
}
