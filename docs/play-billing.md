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
| `game/api/play-claim.js` | Checks a purchase token with Google and says how much gold it is owed |
| `game/api/_play.js` | Google Play Developer API client, signed with `GOOGLE_PLAY_SERVICE_ACCOUNT` |
| `game/api/status.js` | `{ enabled, play }`: Stripe on the web, Play verification in the app |

## A purchase

1. The player taps a pack; Play shows its own purchase sheet.
2. The app keeps the purchase token (`oor.play.pending`) and asks
   `/api/play-claim`, which asks Google whether that token is paid and not yet
   consumed.
3. If it is, the app hands the gold to the game (`{"gold": n}`, the same event
   Stripe purchases use) and consumes the purchase 10 s later, once the gold
   has reached the save.

The app grants before it consumes. If it dies between the two, the next launch
finds the purchase again (its own list, and Play's unacknowledged purchases)
and grants it again, rather than losing a paid purchase. A payment that has
not cleared yet (cash at a shop) is asked about again until it does.

Prices on the cards are Play's own localised prices. Until the server can
verify purchases (no `GOOGLE_PLAY_SERVICE_ACCOUNT`), the shop shows the packs
as unavailable, as it does on the web without a Stripe key.

## Setup

In Play Console create the six managed products (store/PLAY-LISTING.md
§In-app products), and give a service account **View financial data** and
**Manage orders** on the app; its JSON key goes in the Vercel project as
`GOOGLE_PLAY_SERVICE_ACCOUNT` (Production).

iOS has no store yet: the app shows no prices there until StoreKit is wired.
