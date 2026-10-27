# Out of Ruin — Google Play Console kit

The canonical answers for every Play Console form. Edit here, paste into the
Console. The step-by-step session is
[docs/mobile-launch-checklist.md](../docs/mobile-launch-checklist.md).

**Identity**

| | |
|---|---|
| Store name | **Out of Ruin: Idle Dungeon RPG** (starts with the PostHog project name, "Out of Ruin") |
| Package | `games.misaligned.outofruin` (permanent once uploaded) |
| Developer account | Misaligned |
| Analytics | PostHog EU, project 321318; Snowplow once its app_id and consent land |
| Attribution | AppsFlyer (advertising ID) |
| Purchases | Google Play Billing: six gold packs, verified by `game/api/play-claim.js` |

---

## Main store listing

**App name** (≤30):
```
Out of Ruin: Idle Dungeon RPG
```

**Short description** (≤80):
```
Rebuild a fallen kingdom. Hire henchmen, delve dungeons, and loot while away.
```

**Full description** (≤4000):
```
The kingdom fell. Its towns are ash, its mines are flooded, and things have moved into the old dungeons. You are what is left of its rulers, and you are going to take it back.

Out of Ruin is an idle dungeon RPG. Tap a dungeon to start clearing it, then hire henchmen to work it for you. Every level you hold produces loot, and every henchman you hire pays for the next one below. Turn your loot into chapter quests, rank up, and open the way to new regions: the Farm, the Desert Ruin, the Forest Ruin, the Mountain Ruin and the Ancient Mine.

FEATURES
• Five regions of dungeons to reclaim, from a farm cellar to an ancient mine
• Henchmen who work your dungeons while you are away, and earn followers offline
• Heroes with active powers: send them into a dungeon and watch them strike
• Gear cards that boost loot and critical hits, upgraded as you go
• Chapter quests that rank you up and unlock new dungeons, henchmen and heroes
• Weekly events: a town in trouble sends for adventurers, with its own story, enemies, bosses and rewards, winnable without paying
• Your progress is saved on your phone, and the game keeps going while you're away

Gather your crew. Clear the deep. Rebuild what was lost.
```

**What's new** (≤500):
```
<en-US>
Out of Ruin is back, rebuilt for today's phones: sharper art, smoother play, weekly events and gold packs through Google Play. Tell us what you want next: support@misaligned.games
</en-US>
```

## Categorization & contact

| Field | Value |
|---|---|
| App or game | **Game** |
| Category | **Role Playing** |
| Tags (≤5, from the Console's list) | Idle role playing · Role playing · Incremental · Adventure · Casual |
| Email | `support@misaligned.games` |
| Phone | Leave blank |
| Website | `https://misaligned.games` |
| Privacy policy URL | `https://app.outofruin.com/store/privacy.html` |
| Delete data URL | `https://app.outofruin.com/store/delete.html` |

## Graphics assets

| Asset | Spec | Source |
|---|---|---|
| App icon | 512×512 PNG, ≤1 MB | `store/play-icon-512.png` |
| Feature graphic | 1024×500 PNG/JPEG | `store/feature-graphic.png` |
| Phone screenshots (2–8) | PNG/JPEG, 9:16 | `store/shots/NN-*.png`, in number order |

## In-app products (Monetize → Products → In-app products)

Create each as a **managed product**, active, with these ids (they are
`game/packs.js`'s ids; the app looks them up by id). Prices are the US list
prices; let Play convert the rest.

| Product ID | Name (the shop's own label) | Description | Price (USD) |
|---|---|---|---|
| `buygold_1` | 200 Gold | 200 gold for Out of Ruin | 4.99 |
| `buygold_2` | 500 Gold | 500 gold for Out of Ruin | 8.99 |
| `buygold_3` | 1,000 Gold | 1,000 gold for Out of Ruin | 15.99 |
| `buygold_4` | 2,000 Gold | 2,000 gold for Out of Ruin | 23.99 |
| `buygold_5` | 5,000 Gold | 5,000 gold for Out of Ruin | 47.99 |
| `buygold_6` | 10,000 Gold | 10,000 gold for Out of Ruin | 79.99 |

The app checks each purchase with Google before granting gold. That needs a
service account with **View financial data** and **Manage orders** on this app,
its JSON key set as `GOOGLE_PLAY_SERVICE_ACCOUNT` in the Vercel project
(Production). Until it is set, the shop shows the packs as unavailable.

---

## Data safety

**Page — Data collection and security**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Account creation | **My app does not allow users to create an account** |
| Can users log in with accounts created outside the app? | **No** |
| Do you provide a way for users to request that their data is deleted? | **Yes** |
| Delete data URL | `https://app.outofruin.com/store/delete.html` |

**Page — Data types.** Tick exactly four boxes:

| Section | Checkbox | Tick? |
|---|---|---|
| Location | Approximate location | ✅ IP-derived country (PostHog GeoIP, AppsFlyer) |
| Location | Precise location | No |
| Personal info | all | No: no account, no sign-in |
| Financial info | **Purchase history** | ✅ gold purchases (order and product), confirmed with Google |
| Financial info | User payment info · Credit score · Other | No: Google takes the payment |
| Health and fitness, Messages, Photos and videos, Audio, Files and docs, Calendar, Contacts | all | No |
| App activity | App interactions | ✅ PostHog (and Snowplow) gameplay events |
| App activity | In-app search · Installed apps · Other UGC · Other actions | No |
| Web browsing | Web browsing history | No |
| App info and performance | Crash logs · Diagnostics · Other | No: no crash SDK ships |
| Device or other IDs | Device or other IDs | ✅ advertising ID (AppsFlyer) and ANDROID_ID (PostHog `identify()`) |

**Pages — one per ticked type.** Device or other IDs is the only one also Shared:

| Question | Approximate location | Purchase history | App interactions | Device or other IDs |
|---|---|---|---|---|
| Collected, shared or both? | Collected | Collected | Collected | Collected **and** Shared |
| Processed ephemerally? | No | No | No | No |
| Required or optional? | Required | Required | Required | Required |
| Why collected? | Analytics · Advertising or marketing | App functionality · Analytics | Analytics | Analytics · Advertising or marketing |
| Why shared? | — | — | — | Advertising or marketing |

**App content → Advertising ID:** uses an advertising ID **Yes**; purposes
**Analytics** and **Advertising or marketing** only.

## IARC content rating

**Page 1:** email `support@misaligned.games`, category **Game**, agree to the IARC terms.

**Violence, blood or gory images → Yes.** Heroes' powers and henchmen strike
enemies and bosses, which lose health and drop loot; no blood, no remains.

| Checkbox | Tick |
|---|---|
| Violence or implied violence against humans | ✅ human enemies: midwinter raiders, the Ringmaster, the Strongman, the Mirror Twin |
| Violence against anything other than humans | ✅ the Wererabbit, the drowned, skeleton guards, the Abyssal Maw, the Winter King |
| Disturbing or gory images without violence | No |
| Blood not related to violence | No |

Both violence blocks:

| Question | Answer |
|---|---|
| Setting | **Fantastical** |
| Pixelated or childlike style | **No** (painted art) |
| Reactions to violence | **Unrealistic**: health bars drop, loot pops out |
| How presented | **Implied but not seen**: no strike animation lands on a body |
| Blood and gore | **None** |
| Realistic or historical war setting | No |
| Innocent or defenceless characters killed (humans block) | No |
| Creatures behave like humans (non-humans block) | **Yes**: the Wererabbit, skeleton guards and the Winter King act like people |
| Real-world animals (non-humans block) | No |
| Fierce sounds or dark overtones | **Yes**: boss events are moody and threatening, and the Blackmaw event's text names war drums. Check the audio before answering |

Standalone questions:

| Question | Answer |
|---|---|
| Fear | **No**: undead (zombie flesh, skeleton bones) appear as drop icons and grumpy guards, not as horror |
| Sexuality | No |
| **Gambling themes** | **Yes**: card packs with random gear are bought with gold, which can be bought with money |
| Language | No |
| Controlled substances | No: check the "Desert Hippie" henchman's art before answering |
| Crude humour | No |
| **Digital purchases** | **Yes**: gold packs through Google Play Billing |

Miscellaneous: **No** to all six (no chat, no location sharing, no Nazi symbols,
nothing on Korea, terrorism or real crime).

Expected result: about PEGI 12 / Teen for paid random items; Play shows "In-app
purchases (includes random items)".

## App content declarations

| Declaration | Answer |
|---|---|
| Ads | **No, my app does not contain ads** |
| Target age | **13+** (13–15, 16–17, 18+), not designed for children |
| Appeals to children | No |
| App access | All functionality available without special access |
| News, COVID-19, government, financial features, health | No |
