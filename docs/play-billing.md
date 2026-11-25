# Gold packs in the Android app (Google Play Billing)

Google requires Play Billing for digital goods in a Play-distributed app, so
the Android app sells the six gold packs through Google Play instead of the
web's Stripe checkout. The shop does not know the difference: both sit behind
`window.OOR_STORE` (`price(id)`, `buy(id)`, `take()`), which
`port/src/game/controllers/kongregateController.ts` calls.

| Where | What |
|---|---|
| `game/packs.js` | The six packs: ids (`buygold_1` … `buygold_6`), gold amounts, US prices. The Play product ids are these ids |
| `game/store.js` | Stripe, on the web. Does nothing in the native app |
| `port/src/systems/play-store.ts` | Play Billing in the Android app (`@capgo/native-purchases`), installed as `OOR_STORE` at boot |
| `port/src/systems/play-ledger.ts` | The purchase tokens already granted, so each purchase pays out once |

## A purchase

1. The player taps a pack; Play shows its own purchase sheet and takes the payment.
2. The app queues the pack's gold from `packs.js` (`{"gold": n, "token": t}`,
   the same reward path Stripe purchases use). `kongregateController.ts` polls
   `OOR_STORE.take()` after boot and posts `gen_rewardpack`, `lootController.ts`
   persists the reward pack with `defsave.save("Loot", true)`, and only then
   calls `OOR_STORE.confirm(token)` to mark the token granted and schedule Play
   consumption 10 s later.
3. A purchase Play still holds unfinished (bought while the app was closed,
   interrupted by a crash, or a cash payment that has since cleared) is found
   at the next launch or return to the app and delivered the same way. The
   ledger makes sure it is never granted twice.

There is no server check: the game trusts Play's own purchase result, so gold
arrives at once, offline included. The trade-off is that fake-purchase tools on
rooted phones can fake a purchase; with saves kept on the phone, those players
can already change their gold.

Prices on the cards are Play's own localised prices. Where Play has no
products to offer (no Play on the device, or offline at boot), the packs show
as unavailable.

## Setup

In Play Console, create the six one-time products (store/PLAY-LISTING.md
§In-app products) with exactly these ids, each with an active purchase option.
Free test purchases: add testers' Google accounts under Play Console →
Settings → License testing.

iOS has no store yet: the app shows no prices there until StoreKit is wired.
