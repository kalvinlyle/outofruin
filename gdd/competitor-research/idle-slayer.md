# Idle Slayer — Solo-Dev Active/Idle Pixel Runner Teardown

Research date: 25 October 2026. All revenue, download and player-count figures below are
third-party estimates or developer claims and are **non-audited** unless stated otherwise.
Reddit evidence comes from the full r/IdleSlayer post history (30,087 posts, July 2020 to
October 2026) pulled through the Arctic Shift archive, plus top comments on the most-upvoted
threads and 100 of the developer's own comments (Reddit user `pabloleban`).

## 1. Snapshot

**Studio and ownership.**
Idle Slayer is self-published by Pablo Leban, who is listed as both developer and publisher on
[Steam](https://store.steampowered.com/app/1353300/Idle_Slayer/), as seller on the
[App Store](https://apps.apple.com/us/app/idle-slayer-addictive-clicker/id1526599527), and as
"Pablo Leban LLC" on the Android listing in Sensor Tower's app catalogue (Supercell data warehouse).

The "solo developer" claim in the store copy holds up with one qualifier. The fan wiki's
[Credits page](https://idleslayer.fandom.com/wiki/Credits) lists Leban as creator and as the only
music and programming credit, with Mariano Larreteguy credited for art and character design. Later
patch notes credit outside art and music
([6.1.0 "new artwork by Lumiantix"](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/6212244583177522978);
[5.1.0 "Boss Fight Song Remastered by Al&"](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/5229301621578724681)),
and in 2026 Leban wrote that "the artist is working on the rest of the characters"
([r/IdleSlayer comment, 7 pts](https://www.reddit.com/r/IdleSlayer/comments/1wt27j8/)).
Read it as one owner-developer plus contract art and audio.

Leban is based in Buenos Aires province, Argentina: he signed off one thread "Made in Vicente Lopez"
([r/IdleSlayer](https://www.reddit.com/r/IdleSlayer/comments/1dj1svn/)) and replies to Spanish
speakers in Spanish. A LinkedIn post surfaced by search says he was booked to appear at EVA 2025
(Exposición de Videojuegos Argentina)
([LinkedIn, search snippet only; the page blocks fetching](https://www.linkedin.com/in/pablo-leban-38989369/en)).

**Engine and technical posture.**
Unity. This is confirmed from primary sources, not just trackers. Patch 2.5 says "Unity version
updated", and 3.0.0 says "Unity Splash Screen removed"
([Steam news, 2.5](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/4043637702559343119),
[Steam news, 3.0.0](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/4056035920066147043)).
[PlayTracker](https://playtracker.net/game/65074) also lists Unity.
Mobile ads run on the Unity Ads SDK
([wiki Update History](https://idleslayer.fandom.com/wiki/Update_History)).

The technical choices that matter for reach and goodwill:

- **One codebase on three storefronts**, with a cloud account that carries the same save and
  in-app purchases across Android, iOS and Steam ("All the IAP are tied to your save file and will
  transfer between devices and platforms", [wiki In-App-Purchases](https://idleslayer.fandom.com/wiki/In-App-Purchases)).
  Cross-platform cloud save arrived in 2.0.0, October 2020
  ([r/IdleSlayer announcement](https://www.reddit.com/r/IdleSlayer/comments/j7tlyc/)).
- **A server-side casino.** The Village Casino (5.0.0, May 2023) runs on the server "to prevent
  'luck' manipulation", so it needs a cloud account and a connection
  ([Steam news 5.0.0](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/6557848386954335041)).
- **Portrait and landscape on mobile**, with keyboard bindings on PC and Steam Deck keyboard support.
  The game is **Steam Deck Verified**, per Steam's own
  [compatibility endpoint](https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport?nAppID=1353300)
  (resolved category 3 = Verified).
- **27–29 languages**, partly community-translated. Since 4.0.0 a title-screen button invites players
  to help when a translation is under 95% complete
  ([wiki Update History](https://idleslayer.fandom.com/wiki/Update_History)). Steam lists 29.
- **Public beta on Google Play** before each major release
  ([6.6.0 beta post](https://www.reddit.com/r/IdleSlayer/comments/1pqnirk/)), and an in-game News
  button that shows the Discord announcements channel (6.0.0).

**Release and status.**

- Android: first logged update v1.1.0 on 26 March 2020
  ([wiki Update History](https://idleslayer.fandom.com/wiki/Update_History)). Sensor Tower lists the
  Android release in February/March 2020.
- Steam Early Access: 27 July 2020. Full release: 21 December 2020
  ([Steam store page](https://store.steampowered.com/app/1353300/Idle_Slayer/)).
- iOS: 10 September 2020 (Sensor Tower catalogue).
- Steam went from **US$5 to free to play on 20 June 2021**, timed with the game's first anniversary
  and about 1 million Google Play downloads. Existing Steam buyers got a Tier 3 Jewels of Soul pack
  (+125 JoS) as compensation (developer announcement in
  [r/IdleSlayer, 74 pts](https://www.reddit.com/r/IdleSlayer/comments/niv6za/);
  [3.0.0 patch notes](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/4056035920066147043)).
- Native Mac and Linux builds on Steam were announced on 22 October 2026
  ([Steam news](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1847286114034115)).
- Live and actively updated: iOS 7.3.6 shipped this week, with eleven 7.x builds since June 2026
  ([App Store version history](https://apps.apple.com/us/app/idle-slayer-addictive-clicker/id1526599527)),
  and Google Play was updated on 22 October 2026.

**Platforms.**
Android, iOS and iPadOS, and Steam (Windows; Mac and Linux from October 2026; Steam Deck Verified).
Leban has declined Android TV ([comment](https://www.reddit.com/r/IdleSlayer/comments/xtq3nh/)).

**Distribution.**
Self-published on [Google Play](https://play.google.com/store/apps/details?id=com.pabloleban.IdleSlayer)
("Idle Slayer - Pixel RPG"), the
[App Store](https://apps.apple.com/us/app/idle-slayer-addictive-clicker/id1526599527)
("Idle Slayer: Addictive Clicker", subtitle "Epic RPG Incremental Adventure") and
[Steam](https://store.steampowered.com/app/1353300/Idle_Slayer/).

Store names differ by platform for ASO: "Pixel RPG" on Android, "Addictive Clicker" on iOS.

There is evidence of paid user acquisition in 2026. A player posted an Idle Slayer ad seen on
YouTube Shorts ([183 pts](https://www.reddit.com/r/IdleSlayer/comments/1un6qy9/)), and commenters
relayed from Discord that Leban pays third-party agencies to make the ads. Creator coverage also
drove installs; see Key innovations.

**Pricing and monetisation model.**
Free to play on every platform, with three revenue lines.

1. **Premium currency, Jewels of Soul (JoS).** This closes the first-pass gap: **JoS are sold for
   real money.** The App Store lists Jewels of Soul Tier 1 to Tier 6 at $1.99, $4.99, $9.99,
   $19.99, $34.99, $49.99 and $99.99. Tier 3 ($9.99) is 125 JoS according to the developer's F2P
   announcement, which works out to about 8 US cents per jewel. The App Store also lists a Slayers
   Starter Pack at $4.99 (60 JoS, the Haskell character and one month ad-free)
   ([App Store IAP list](https://apps.apple.com/us/app/idle-slayer-addictive-clicker/id1526599527);
   [wiki In-App-Purchases](https://idleslayer.fandom.com/wiki/In-App-Purchases)).
   JoS can also be earned free, from Dragon Eggs (a daily-quest reward), the Slayer Machine slot in
   the Village casino, and holes in the Ascending Heights minigame
   ([wiki Daily Quests](https://idleslayer.fandom.com/wiki/Daily_Quests);
   [r/IdleSlayer TIL, 79 pts](https://www.reddit.com/r/IdleSlayer/comments/1s9ks1h/)).
   JoS buy power as well as cosmetics. See the store model in §2.
2. **Ad removal.** Mobile only: $9.99 permanent or $3.99 a month (App Store). Ads are opt-in
   rewarded video. Forced and banner ads were removed early
   ([wiki Update History](https://idleslayer.fandom.com/wiki/Update_History)). Steam has no ads, and
   since 2020 PC "has now the equivalent rewards for watching ads on the mobile version".
   Steam's Points Shop items are Valve cosmetics, not Leban's monetisation.
3. **Side channels.** A [Patreon](https://www.patreon.com/pabloleban) with 3,933 members, of whom
   only a few pay: it shows €333.6 a month. There was also a limited-run Benvolio plushie with a
   125-JoS code bundled ([Steam news, Feb 2023](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/5059268099241766423)).

**Audience scale (all non-audited).**

| Year | Mobile revenue (gross, WW) | Mobile downloads (WW) | Notes |
|---|---|---|---|
| 2020 (Jul–Dec) | ~$0.19M | ~0.26M | iOS from Sep; Steam full release Dec |
| 2021 | ~$1.33M | ~0.88M | Jan spike: 299K Android downloads; Steam F2P in June |
| 2022 | ~$1.17M | ~1.20M | Downloads surge from Sep |
| 2023 | ~$1.75M | ~3.53M | Peak install year; iOS revenue overtakes Android |
| 2024 | ~$1.86M | ~1.22M | Jul revenue $243K (Attack on Titan collab month) |
| 2025 | ~$2.16M | ~1.31M | Highest revenue year so far |
| 2026 (Jan–Oct, Oct partial) | ~$1.82M | ~0.72M | Jun $274K (7.0.0 month), the best month on record |
| **Lifetime** | **~$10.3M** | **~9.1M** | ≈ $1.13 gross per download |

*Source: Sensor Tower via Supercell data warehouse (non-audited). App IDs `com.pabloleban.IdleSlayer`
and `1526599527`, device codes android-all and ios-all, monthly WW. Store revenue is before the
platform cut and excludes Steam, Patreon and merch.*

The trend is the point: revenue has risen every year since 2022 while downloads fell after 2023. The
game monetises a loyal base better each year rather than relying on install volume.
Monthly revenue has held at roughly $145K–$275K since mid-2024.

Other scale signals:

- **Developer claim:** "played by over 10 million players worldwide, available in 27 languages"
  ([App Store copy](https://apps.apple.com/us/app/idle-slayer-addictive-clicker/id1526599527)).
  This is plausible against ~9.1M estimated mobile downloads plus Steam, but it is marketing copy.
- **Google Play:** 5M+ downloads, 4.6 stars from 134K reviews
  ([Play listing](https://play.google.com/store/apps/details?id=com.pabloleban.IdleSlayer)).
  Sensor Tower's ~7.4M Android estimate is consistent with Play's 5M+ bucket.
- **App Store (US):** 4.8 stars from 28K ratings. Sensor Tower counts 51.7K ratings globally.
- **Steam:** SteamSpy estimates 500K–1M owners ([SteamSpy](https://steamspy.com/app/1353300)).
  The first pass's "31.3K owners" figure is wrong.
  [SteamCharts](https://steamcharts.com/app/1353300) shows the all-time peak at **2,034 concurrent
  (July 2024, the Attack on Titan month)**. The average has held between ~960 and ~1,250 concurrent
  every month since late 2022 (1,067 in September 2026).
  Average concurrency nearly quadrupled after the June 2021 F2P switch: 176 in June 2021, 474 in
  August, 652 in September.
- **Community:** the official [Discord](https://discord.com/invite/idleslayer) has ~74,900 members
  (~12,800 online at time of check), and r/IdleSlayer has ~32,000 subscribers (Arctic Shift snapshot).
  The subreddit holds 30,087 posts, with yearly volume rising from 4,205 (2021) to 6,637 (2025).
  Monthly post spikes match collab months: 684 posts in November 2023 (Shovel Knight) and 739 in
  July 2024 (Attack on Titan).
- **MAU/DAU:** not available from any source I could reach. GameRefinery tracks the iOS app
  ([GameRefinery](https://app.gamerefinery.com/game/5f6203829890a2321aa5bf3e), classed
  Simulation › Idler) but has no feature analysis or motivation profile for it.

**Review sentiment.**
The first pass's Steam conflict is resolved: the two numbers measure different populations.

- The Steam store page shows **"English Reviews: Mostly Positive (78% of 4,351)"**. The page's own
  tooltip reads "78% of the 4,351 user reviews in your language are positive" (fetched with
  English locale). Recent reviews: **Very Positive, 82% of 123** in the last 30 days
  ([Steam store page](https://store.steampowered.com/app/1353300/Idle_Slayer/)).
- All languages, per SteamSpy's Steam-API mirror: **7,488 positive and 1,279 negative, about 85%
  of 8,767** ([SteamSpy](https://steamspy.com/app/1353300)). This matches the aggregators' "~85%".
- I trust both. Use 85% (all languages) for overall sentiment. English-language players are
  noticeably harsher (78%), and the English negative reviews are dominated by long-tenure players
  objecting to anti-idle balance changes (see §4).
- Mobile is much warmer: 4.6 on Google Play (134K reviews) and 4.8 on the App Store (28K US ratings).

**Critical reception.**
There is effectively no professional press. Targeted searches found no reviews from PocketGamer,
TouchArcade, PC Gamer or RPS, and [Metacritic](https://www.metacritic.com/game/idle-slayer/)
has no critic score (user score 7.1 from 10 ratings). No formal interview exists either. The
closest primary statements from the developer are his Reddit comments, quoted below and in §3:
on why he keeps updating ([2022 thread](https://www.reddit.com/r/IdleSlayer/comments/wpqtd3/)),
on profit ([1did2fc](https://www.reddit.com/r/IdleSlayer/comments/1did2fc/)), and on event design
([17ngn1a](https://www.reddit.com/r/IdleSlayer/comments/17ngn1a/)).

The absence of press is itself the finding: reach came from YouTubers, Steam pricing, store
optimisation and paid UA, not from coverage.

**One-line player promise (Steam capsule copy, verbatim).**
"Start from nothing and grow into a legendary Slayer. Explore countless dimensions, collect souls,
unlock powerful upgrades, craft powerful gear, defeat epic bosses, and enjoy a deep idle RPG with
active and offline progression."
([Steam short description](https://store.steampowered.com/app/1353300/Idle_Slayer/))

**Strategic read for Out of Ruin.**
Idle Slayer is the clearest existing proof that a solo fantasy idle RPG can earn about $2M a year
on mobile, six years in, with no press. It does it with three moves Out of Ruin can copy outright:

1. **One account across every storefront.** The same save and purchases on Android, iOS and Steam,
   and in 2026 a free skin for linking mobile and Steam.
2. **A price structure players defend as fair.** Opt-in ads, a cheap permanent ad-removal purchase,
   and a premium currency that also drips free from a daily loop.
3. **A visible developer.** He fixes bugs in the comment thread where they are reported and
   reverts balance changes when the community pushes back.

Its design lesson cuts both ways. The active layer (jump, boost, minigames, bosses) is what
makes it distinctive. It is also its biggest source of anger whenever idle income is nerfed to
push players back to active play. Out of Ruin already has the tap-active core and auto-firing hero
powers. It should borrow Idle Slayer's *optional* active set-pieces, never its habit of gating idle
progress behind skill.

## 2. Core system designs

**Runner core: auto-run, jump, boost, bow and sword (the active layer).**

- *Player-facing intent.* "Every Slayer begins with nothing. Jump, collect coins, defeat enemies"
  ([Steam description](https://store.steampowered.com/app/1353300/Idle_Slayer/)). The hero runs
  right on their own through a procedurally patterned side-scrolling field. The player's only
  verbs are jump, boost and (later) shoot, Rage and Wind Dash.
- *Mechanical model.* The run never stops. Enemies and coins come in "patterns"
  ([wiki Patterns](https://idleslayer.fandom.com/wiki/Patterns)). Touching an enemy kills it
  with the sword. Coins are collected by contact and scale with CpS (coins per second).
  Boost gives 3.5× speed for 10 seconds on a 30-second cooldown. Upgrades raise it to 4.75× for
  15 seconds and cut the cooldown by up to 75%. "Cheap Cooldown" takes 2% off the cooldown per
  coin picked up ([wiki Boost](https://idleslayer.fandom.com/wiki/Boost)).
  Giants are multi-hit enemies with HP and armour bars. Tapping the screen speeds up the kill,
  which a 5.1.0 tutorial dialog teaches over the first 10 giants
  ([wiki Giants](https://idleslayer.fandom.com/wiki/Giants)).
- *Data shape.* CpS is the master stat. Coin value, enemy value and offline earnings all derive
  from it ([wiki Just Getting Started](https://idleslayer.fandom.com/wiki/Just_Getting_Started)).
  Equipment items (sword, shield, armour…) level 1→N, with ×2 milestones at level 10 and then
  every 50 levels. Since 6.1.0 equipment upgrades are multiplicative.
- *Progression and gating.* The first 100 coins buy the Training Quests, 50 coins buy Random
  Boxes, and 20 coins buy Boost. The early game hands out a new verb every few minutes.
- *Inputs, UI, affordances.* One button to jump (tap; Space/W/Up on PC) and one to boost (left
  click or Shift on PC). Holding the boost button toggles Wind Dash. Rage is middle-click or E.
  A Quick Tool Belt holds consumables. Portrait mode suits one-handed idle play and landscape
  shows more of the field. A player found landscape late and realised "how many freaking mobs I
  must of missed playing in portrait" ([30 pts](https://www.reddit.com/r/IdleSlayer/comments/wirw0m/)).
- *Failure modes.* Elite ground enemies with high HP stop the run. A 2023 post titled "Fuck off
  with these high hp ground mobs" ([83 pts](https://www.reddit.com/r/IdleSlayer/comments/13qvpqf/))
  says they turn "a fun side scroller into 'dodge shitty ground enemies…'". Rules about multiplier
  carry-over and coin misses are opaque, and frame-rate-dependent physics on old phones was fixed
  only in 6.0 ([dev comment](https://www.reddit.com/r/IdleSlayer/comments/1dtqu1e/)).
- *Why it works.* It reads at a glance as a game, not a spreadsheet: a pixel-art runner that is
  satisfying even unattended. The active verbs multiply idle numbers rather than replace them.
  Players who want to play actively get more, and players who don't still progress. The deal
  breaks whenever the multiplier gap gets too wide (§4).

**Random Boxes and Random Events (the variable-reward heartbeat).**

- *Player-facing intent.* Floating boxes you hit from below for a surprise buff. This is the
  most frequent "something happened" moment.
- *Mechanical model.* A box spawns every 38–120 seconds. Each hit rolls a weighted event table,
  for example:
  - Frenzy (30%): a coin shower for 10 seconds.
  - CpS ×9 for 80 seconds (20%).
  - Coins ×10–20 for 15 seconds (5%).
  - Gemstone Rush (12%), Dual Randomness (10%) and Horde.
  Silver boxes (4–5 per claim, banked every 30 minutes after day 2, stackable to 1,000) double the
  effect, and Golden boxes triple it. Special Random Boxes (5% base) open a portal to the Bonus
  Stage ([wiki Random Box](https://idleslayer.fandom.com/wiki/Random_Box)).
- *Data shape.* A per-event base chance, modified by upgrades, Divinities and Stones. An
  [official calculator](https://www.idle-slayer-calculator.com/) exists because the odds stack.
- *Progression and gating.* New event types unlock through the Ascension Tree. Silver Bank, a dark
  divinity, lets players hoard boxes and spend them when ready.
- *Failure modes.* "Tria Randomness" chains can carry over into Bonus Stages and break runs
  ([104 pts](https://www.reddit.com/r/IdleSlayer/comments/1og0czu/)). Boxes don't spawn while a
  menu is open in portrait mode.
- *Why it works.* It is a slot machine with no wallet attached. The Silver Box bank turns time
  away into a pile of boxes to open on return, a "welcome back" ritual that pays off active
  sessions.

**Minigames (Bonus Stage, Chest Hunt, Ascending Heights, Grapple Run, Boss Fights, Slayer Lounge).**

- *Player-facing intent.* Short skill or luck set-pieces that break the run and hand out the
  best gear. They are listed on the Steam page as "Bonus Stage… Chest Hunt while avoiding
  dangerous Mimics… climb Mt. Otto in Ascending Heights… Grapple Run".
- *Mechanical model.*
  - **Bonus Stage** ([wiki](https://idleslayer.fandom.com/wiki/Bonus_Stage)): four timed
    platforming segments, 30 seconds each, with orb quotas (Bonus Stage 1 needs 15/30/35/55 orbs).
    A pit costs 2 seconds. A failed segment can be retried once by watching a rewarded ad ("Second
    Wind"). Three variants unlock via Ascension. Later upgrades add wall jumps, cover pits ("Safety
    First") and add modifiers (Golden Invasion, Spirit Boost).
  - **Chest Hunt** ([wiki](https://idleslayer.fandom.com/wiki/Chest_Hunt)): a key spawns every
    90–600 seconds of play. The board has 30 chests, 4 of them Mimics. The player picks until they
    hit a Mimic, collecting coins, SP and multipliers along the way. Clearing the board gives a
    "Perfect Chest Hunt" and a permanent upgrade or a 2–4× mega multiplier. Savers absorb a Mimic,
    and the "Saver Locator" reveals the Saver for a rewarded ad (automatic on Steam).
  - **Boss Fights** ([wiki](https://idleslayer.fandom.com/wiki/Boss_Fight)): bullet-dodging duels
    unlocked by the Village story. A fast kill guarantees an "Excellent" ring. A retry after defeat
    costs a few JoS.
  - **Grapple Run** (2025): a timed horizontal swing course. Times under 3:00, 2:30 and 2:10
    unlock Ascension upgrades, +4% CpS/Souls and +10% offline Souls
    ([wiki Minigames](https://idleslayer.fandom.com/wiki/Minigames)).
  - **Slayer Lounge**: a server-side roulette and slot machine using Slayer Chips from a free
    daily roll. It is the only source of some key items (Ring of Luck, Coimbo Shield, Reptile Eyes)
    and a rare JoS source.
- *Data shape.* Each minigame has its own drop table tied to an Armory slot. Bonus Stages drop
  Swords and Bows, Chest Hunts Shields (0.5% per chest), bosses Rings, Weekly Quest eggs Armor,
  and the casino Helmet inputs ([wiki Armory](https://idleslayer.fandom.com/wiki/Armory)).
- *Progression and gating.* Minigames arrive one at a time across the first ~100 days. This is
  the game's main way of saying "a new mechanic just unlocked."
- *Failure modes.* Skill minigames gate permanent power, so players who don't enjoy them feel
  locked out (§4). The Attack on Titan ODM-gear minigame shipped with frame-rate-dependent
  velocity and gas that retracted the hooks
  ([dev post-mortem, 21 pts](https://www.reddit.com/r/IdleSlayer/comments/1dtzu31/)).
  Gambling-gated items draw steady anger: "I love this game but absolutely despise how
  progression is locked behind gambling" ([81 pts](https://www.reddit.com/r/IdleSlayer/comments/1olyi9k/)).
- *Why it works.* Every minigame is entered from the runner by touching an object that spawns on
  its own (key, box, cape), so the active moments find the player. The Mimic is a clean
  push-your-luck hook, and "my chest hunt" screenshots are so common that a 2024 post asked
  people to stop ([92 pts](https://www.reddit.com/r/IdleSlayer/comments/1al8m6i/)).

**Souls → Slayer Points → Ascension Tree (prestige layer 1).**

- *Player-facing intent.* Reset coins and upgrades for permanent Slayer Points (SP) spent on a
  huge skill tree.
- *Mechanical model.* Souls come from kills. Each SP costs `12 + 4 × LifetimeSP` souls, so every
  point is 4 souls dearer than the last. Total SP also raises CpS directly. The first ascension
  is possible at 20 SP. The wiki advises ascending when unclaimed SP is 10–20% of total SP, since
  that converts one-to-one into a 10–20% CpS boost
  ([wiki FAQ](https://idleslayer.fandom.com/wiki/FAQ);
  [wiki Ascension](https://idleslayer.fandom.com/wiki/Ascension)).
- *Data shape.* A node tree with prerequisites. Nodes are tagged Legendary, ULTRA (reset on Ultra
  Ascension) and ASTRAL (permanent). There is no respec until Ultra Ascension.
- *Progression and gating.* The tree unlocks the game's verbs: bow, minions, Rage Mode (30M SP),
  bonus stages, Divinities, and so on.
- *Inputs, UI, affordances.* Version 7.x added an in-game "Ascend recommendation", which players
  thanked Pablo for because it "will reduce the 100 a week questions 'SHOULD I ASCEND?!'"
  ([159 pts](https://www.reddit.com/r/IdleSlayer/comments/1wywt76/)). Bulk buy appears after the
  first ascension. From the second Ultra Ascension a buy-all button covers the tree.
- *Why it works.* SP is both currency and multiplier, so players never feel a reset wasted
  anything. "The game is a little deceptive: coins seem like the thing you want. Ultimately, they're
  not: you want SP" ([wiki](https://idleslayer.fandom.com/wiki/Just_Getting_Started)).

**Ultra Ascension, Stones of Time and Upgrades of Time (prestige layer 2).**

- *Mechanical model.* Unlocked at 2M SP. Each Ultra Slayer Point (USP) costs `600,000 SP × 1.23^x`.
  Ultra Ascension wipes coins, SP, the tree, quests and minion levels, and sends the player back
  to the Hills. It keeps Achievements, Characters, Divinities, Jewels of Soul, materials, Armory
  items, Silver Boxes and ASTRAL upgrades
  ([wiki Ultra Ascension](https://idleslayer.fandom.com/wiki/Ultra_Ascension)).
  USP are spent one point per level on five Stones of Time (Activity, Idle, Hope, Rage, Random),
  or on toggleable Upgrades of Time that cost 61 USP if all are enabled
  ([wiki Stones of Time](https://idleslayer.fandom.com/wiki/Stones_of_Time);
  [wiki Upgrades of Time](https://idleslayer.fandom.com/wiki/Upgrades_of_Time)).
- *Data shape.* The Stones have hard caps. Stone of Idle's offline slay speed stops at 90% at
  level 32, and its "Overcharge" is the stat behind the 2024 and 2026 nerf fights.
- *Progression and gating.* The wiki recommends the first Ultra Ascension at about 6 USP. The
  Village only appears after it.
- *Failure mode.* After the first reset progress feels slow, and the most-voted complaints are
  about this tier's idle stats being cut (§4).
- *Why it works.* The second layer turns the long middle game into a planning problem: which
  Stone to level, and which Upgrades of Time to toggle for this run.

**Minions and Divinities (the idle engine).**

- *Player-facing intent.* Send minions on timed missions for SP while away. Reset them for
  Divinity Points that buy global passives.
- *Mechanical model.* Seven minions ([wiki Minions](https://idleslayer.fandom.com/wiki/Minions)):

  | Minion | Unlock | Mission | Reward |
  |---|---|---|---|
  | White Knight | 1,200 SP | 3h | +2 SP/level, max level 100 |
  | Dark Wizard | 2,500 SP | 6h30 | — |
  | Skeleton | 8,000 SP | 3h | — |
  | Stone Golem | 10,000 SP | 23h | — |
  | Goo Mutant | 60K SP | 4h30 | — |
  | Ninja | 50B SP | 1 day | Scrolls of Time (since 7.0.0) |
  | Cyclops | 3T SP | 1 day 22h | — |

  Each mission levels the minion up and raises its reward per mission. Missions spend
  *unspent* SP but don't reduce total SP. Once a day a rewarded ad cuts every mission by 3 hours
  (6 hours with an Astral upgrade). Resetting minions to level 1 pays 1 DP per level for
  Divinities. Dark Divinities are toggleable, and toggling refunds them in full
  ([wiki Divinity](https://idleslayer.fandom.com/wiki/Divinity)).
  "Inner Power" later pays minions a percentage of spent SP.
- *Data shape.* Duration, cost, reward per level and max level per minion. Evolutions bought with
  Astral Keys add +20% max level, −10% duration and +10% reward.
- *Failure modes.* Endgame minion income is the most-tuned and most-fought number in the game.
  It was nerfed in June 2024: "My cyclops went up to 331T, then now back to 62,6T in just a couple
  hours" ([51 pts](https://www.reddit.com/r/IdleSlayer/comments/1ds4yv8/)).
- *Why it works.* Mission timers line up with real-life check-ins (3h, 6h30, 23h). The minion
  reset → Divinity loop is a third, softer prestige layer. Its daily rewarded ad is the
  best-accepted ad placement in the game.

**Dimensions and Portals (world structure).**

- *Mechanical model.* Dimensions are bought with coins: Hills, Jungle, Modern City, Hot Desert,
  Frozen Fields, Haunted Castle, Mystic Valley, Factory, Funky Space and more
  ([wiki Dimensions](https://idleslayer.fandom.com/wiki/Dimensions)). Portals spawn on a cooldown,
  4 hours base since 6.1.0 and reducible to 1 hour. Each portal cycle contains every unlocked
  dimension once, in random order. The very first portal always goes to Modern City so early
  quests can be completed. Resetting the cooldown costs **5 JoS**.
- *Data shape.* Each dimension has its own enemy roster, materials and soul/coin tier. A portal
  indicator shows the estimated reward tier.
- *Why it works.* Dimensions double as quest locations and material farms, so travelling has a
  purpose. The cooldown keeps sessions short and creates a reason to return.

**Quests: bundles, Daily, Weekly and Event.**

- *Mechanical model.* Quest bundles are bought with coins, from Training (100 coins) up to Extreme
  and Higgins. Each bundle holds 3–8 kill or collect objectives, and each quest unlocks a
  purchasable upgrade ([wiki Quests](https://idleslayer.fandom.com/wiki/Quests)).
  Daily Quests are unlocked by crafting the Diary:
  - 3 a day, plus 2 more and 1 reroll via rewarded ads, plus up to 2 more from crafts.
  - They reset at UTC midnight.
  - Each one pays a **Dragon Egg**: 25% chance of JoS (1–3), 25% DP, 34% Dragon Scales,
    8% coins, 8% SP.

  That averages **0.31 JoS per egg** ([wiki Daily Quests](https://idleslayer.fandom.com/wiki/Daily_Quests)).
  Weekly Quests pay a Giant Dragon Egg containing Armor.
- *Data shape.* Event Quests come in three tiers, gated behind Master, Hard and Extreme quest
  progress. "Quest Progress Bonuses do not apply to Event Quests" (staves, Tactical Armor, Gem
  Buyer) ([wiki Events](https://idleslayer.fandom.com/wiki/Events)).
- *Failure modes.* The October 2026 Phantom Fall tier 3 asks for 10,000 Wind Dash kills and
  15,000 Rage Mode kills with no quest bonuses. "Pablo if ur reading this change this NOW pls"
  ([47 pts](https://www.reddit.com/r/IdleSlayer/comments/1xcqp9o/)). A commenter worked out
  "like 75 rage pills".
- *Designer's stated rule* ([dev comment](https://www.reddit.com/r/IdleSlayer/comments/17ngn1a/)):
  "I have to make sure that early game players are able to complete it as well as late game
  players… late game players have several tools… which I have to disable for event Quests to avoid
  them from completing the whole event in an hour."
- *Why it works / doesn't.* Bundles make questing a purchasable unlock, so quests feel like
  content rather than chores. Dragon Eggs tie the daily habit to the premium currency. Disabling
  bonuses for events protects pacing but punishes exactly the players most invested in those tools.

**Crafting, Materials and the Armory (gear layer).**

- *Mechanical model.* The Bag (10K SP) unlocks material drops: 10% while playing actively, 1%
  while offline. Materials craft Permanent Items (big one-off unlocks such as Diary, Armory,
  Gatherer Toolkit) and Temporary Items (timed buffs such as Whetstone, Rage Pill, Deathwave
  Scepter) ([wiki Crafting](https://idleslayer.fandom.com/wiki/Crafting)).
  JoS can buy 25%, 50% or 100% of a material's bag cap (10, 18 or 24 JoS).
  The Armory holds rolled items with Excellent and Option chances, found only in specific
  minigames. Items can be broken down for DP and Scrap. Loadouts with 5 custom slots arrived in
  7.0.0 ([Steam news](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1834602721188698)).
- *Failure mode.* The active-only material rate is the original "ActiveSlayer" complaint (2021).
  "I cannot punch in enough active playtime to gather the required amounts"
  ([lzj2mk](https://www.reddit.com/r/IdleSlayer/comments/lzj2mk/)).
- *Why it works.* Gear gives a horizontal, loot-driven chase on top of the vertical prestige
  numbers, and it ties each minigame to a reward slot.

**Village (narrative hub).**

- *Mechanical model.* Unlocked after the first Ultra Ascension with a crafted Village Key. It
  switches the game to free-roam movement (4.0.0) with NPCs (Victor, Joey, Sabrina, Cristino,
  Albert), buildings rebuilt from deposited materials (Mill, Tavern, Lounge/Casino, Tower,
  Orchard), quest chains, puzzles and the first boss. Building progress survives every reset
  ([wiki Village](https://idleslayer.fandom.com/wiki/Village)).
- *Why it works.* It gives an endless number-go-up game a place with characters and running
  jokes. Players post about "Drinking multiple beers at the inn will make you pass out"
  ([208 pts](https://www.reddit.com/r/IdleSlayer/comments/1nkyrmf/)). It also distributes new
  verbs: Wind Dash is taught by Higgins in the Tower.

**Rage Mode and Wind Dash (late-game active abilities).**

- *Mechanical model.* Rage costs 30M SP to unlock and lasts 6.5 seconds. It gives big speed, 12×
  sword damage and ×100 souls on a 10-minute cooldown. The crafted Rage Pill resets it instantly.
  Wind Dash is a short forward blink that kills with the sword; kills reduce its cooldown and,
  with upgrades, Rage's cooldown ([wiki Rage Mode](https://idleslayer.fandom.com/wiki/Rage_Mode);
  [wiki Wind Dash](https://idleslayer.fandom.com/wiki/Wind_Dash)).
- *Why it works.* Late-game "burst windows" give active players a skill expression. Achievements
  like "Use the Boost while using the Boost" reward players who explore the rules.

**Jewels of Soul store (monetisation surface).**

- *Mechanical model.* The JoS tab is unlocked for 14K coins
  ([wiki In-App-Purchases](https://idleslayer.fandom.com/wiki/In-App-Purchases)). It sells:
  - **Permanent stat items, 30–60 JoS each**, for example Lava Dagger +15% CpS, Soul Knight Crown
    +35% offline Souls, Talisman of Excellence +4% Excellent chance. Each can be powered up four
    more times (+25% each, at half price).
  - **Timed boosts:** 25×–500× CpS for 8 minutes (10–200 JoS) and 25×–500× Souls for
    4 minutes (10–200 JoS).
  - **Conveniences:** material refills (10–24 JoS), portal cooldown reset (5 JoS), a ×10 or ×50
    coin-record boost once per ascension (35/55 JoS), and any Ascension Tree upgrade (1–27 JoS,
    up to 10× available SP).
  - **Characters and outfits.** Event skins cost about 60 JoS and carry event-limited soul bonuses.
  - **Starter packs** ($2.99, $4.99 and $9.99), each shown once for a limited time.
- *Free income rate.* Derived from the wiki's egg odds: 3 daily quests ≈ 0.9 JoS a day, or ≈ 1.5
  a day with the two ad-unlocked dailies. A 30-JoS permanent item is therefore 3–5 weeks of
  dailies, and a 60-JoS event skin 6–9 weeks. Paid, a Tier 3 pack ($9.99 → 125 JoS) buys four
  permanent items at once.
- *Failure modes.* In July 2025, JoS-buyable Ascension upgrades and Overcharges made even F2P
  players uneasy. "This feels like cheating… I know I earned all the Jewels Of Soul myself"
  ([119 pts](https://www.reddit.com/r/IdleSlayer/comments/1m8zlvx/)). One reply: "Not much more
  pay to win compared to what already exists in the game with the 500x soul bonus." A local price
  bug set permanent ad removal at 42,990 HUF (~$133). Leban answered in the thread: "My bad. Fixed."
  ([44 pts](https://www.reddit.com/r/IdleSlayer/comments/1wsgq4d/)).
- *Why it works.* There is no gacha, energy or stamina, and no paid-only content. Everything
  sold can be earned through dailies, and ad removal is a one-time $9.99. The community reads
  the store as a speed-up for a single-player game. A 2025 post by a new player who asked an AI
  for "an Idle game with no or minimal ads" calls Idle Slayer "bloody fun" and contrasts it with
  "the gotcha style freemium model that barrages you with adds"
  ([60 pts](https://www.reddit.com/r/IdleSlayer/comments/1jxswfz/)).

**Live events and collaborations.**

- *Mechanical model.* A themed event runs roughly monthly, each pairing a +CpS or +Souls bonus
  in one dimension, three tiers of event quests and an event outfit. Examples: March Luck of the
  Slayer (Hills), October Phantom Fall (+35% CpS, Haunted Castle), December Skylight Spirits
  (Frozen Fields) ([wiki Events](https://idleslayer.fandom.com/wiki/Events)).
  Event-quest rewards are "permanent" only for the event's duration. Since 6.8.0 skin bonuses
  "are now linked to the Events" ([Steam news](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1828894815555127)).
  The two collabs:
  - **Shovel Knight** (Nov 2023): 7 quest segments, a Spectre Knight boss, and a 110-JoS
    event-only outfit ([wiki](https://idleslayer.fandom.com/wiki/Idle_Slayer_x_Shovel_Knight)).
  - **Attack on Titan** (July 2024): an ODM-gear minigame and skins
    ([Steam news 6.0.0](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/5842939267319683468)).
- *Why it works.* Events are cheap for one person to produce: reused locations, a percentage buff,
  a skin and quest copy. They line up with the biggest revenue months: November 2023 at $199K
  (+66% on October), July 2024 at $243K (+123% on June), June 2026 at $274K (7.0.0)
  (Sensor Tower, non-audited).

**Offline progress, cloud save and accounts.**

- *Mechanical model.* While closed, the game credits offline CpS, offline kills and soul gains,
  scaled by Stone of Idle and craftables. 7.0.0 made offline kills "scale with player damage vs
  enemy health" and added an "Idle Screen Results" summary. Cloud save is account-based with an
  email login. The casino and cross-platform play need it.
- *Failure modes.* An early sync bug rolled players back months. "When I signed in… all my
  progress is gone" ([62 pts](https://www.reddit.com/r/IdleSlayer/comments/muphnd/)). Leban
  replied the same day: "I've been working all day recovering saves for users since yesterday."
  A 2021 always-online check was called "DRM" ([29 pts](https://www.reddit.com/r/IdleSlayer/comments/ld83rm/)).
- *Why it works.* One login across phone and PC makes Steam a second screen for the same habit.
  In 2026 Leban monetised that link without charging: log into the same account on mobile and
  Steam and you unlock the Elf Minita skin
  ([Steam news](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1840310314346513)).

**Achievements (651 on Steam).**
The 651 achievements ([Steam API](https://store.steampowered.com/app/1353300/Idle_Slayer/)) are
not just badges. Many grant permanent CpS bonuses, which is why a new player "went hard on
collecting as many as I could" ([1jxswfz](https://www.reddit.com/r/IdleSlayer/comments/1jxswfz/)).
Joke achievements reward exploring the rules: "Use the Boost while using the Boost", "Double Rage
Mode". Buying No Ads unlocks the ad-watching achievements instantly.

## 3. Key innovations

1. **An auto-runner as the idle visual.** Idle Slayer is a running platformer that plays itself,
   and players add jumps, boosts and bursts to multiply the numbers. It looks like an action
   game in screenshots and trailers, and the Steam user tags (Idler, Clicker, 2D Platformer,
   Runner) reflect the hybrid ([SteamSpy tags](https://steamspy.com/app/1353300)). Few idle
   competitors have a hero you can *watch*.

2. **Active set-pieces that spawn inside the idle loop.** Boxes, keys, capes and portals appear
   in the run on random timers (38–600 seconds), so active content comes to the player instead
   of sitting in a menu. Each minigame owns one gear slot, so each has a long-term reason to exist.

3. **The Steam price drop as a growth event.** Going from $5 to free in June 2021 was timed to
   the first anniversary and 1M Google Play downloads. Paying owners got a 125-JoS gift, which
   removed the usual "I paid and now it's free" backlash. One player who had paid on Android
   *and* Steam thanked him for "giving souls for those of us who did buy it"
   ([niv6za](https://www.reddit.com/r/IdleSlayer/comments/niv6za/)). Steam concurrency roughly
   quadrupled within three months ([SteamCharts](https://steamcharts.com/app/1353300)).
   The one top-voted negative Steam review on the topic is "Paid for it, then it became free the
   next day" (111 helpful, 0.3 hours).

4. **Creators as the press.**
   - **December 2020:** a YouTuber's grind video (DangerouslyFunny, per a top Steam review: "Leave
     it to DangerouslyFunny to get me addicted to yet another clicker game", 80 helpful,
     [Steam reviews](https://steamcommunity.com/app/1353300/positivereviews/?browsefilter=toprated))
     sparked "Hoping this will blow up this game"
     ([193 pts](https://www.reddit.com/r/IdleSlayer/comments/kj92pe/)). January 2021 is the
     largest early download month in Sensor Tower: 299K Android installs, against ~38K in
     December 2020.
   - **2023:** another creator shout-out appears in top Steam reviews ("shoutout to simpleflips").
   - **December 2025:** a sponsored segment in an Any Austin video brought new players
     ([1plww49](https://www.reddit.com/r/IdleSlayer/comments/1plww49/)).

   I could not open the videos to verify them. The attribution rests on player testimony and
   the download timing.

5. **One account across Steam and mobile, with a free reward for linking.** Cross-save since
   2020, IAPs that travel with the save, and in 2026 a free skin for linking both. Each new
   storefront becomes a second screen for existing players, not a cold start.

6. **Opt-in ads with a PC equivalent.** Rewarded video only: mission time-skips, extra dailies,
   Saver Locator, bonus-stage retry. Banners and forced ads were removed early. Ad removal is a
   cheap one-time $9.99 that the community calls "absolutely worth it", and Steam players get
   the ad rewards free. In a 125-comment thread asking whether removing ads is worth €10, the
   top replies are percentages of "yes" ("210% Yes", "250% only in game purchase, totally worth
   it", [160 pts](https://www.reddit.com/r/IdleSlayer/comments/1md39vp/)).

7. **The developer's visible responsiveness is the brand.** His top Reddit comments are bug
   acknowledgements: "It is. I'll look into this" (152 pts), "Fixed for the next version" (69),
   "Fixed in the next update" (57) ([Leban's comment history](https://www.reddit.com/user/pabloleban/)).
   In November 2024 the Stone of Idle nerf drew "End game is dead"
   ([185 pts](https://www.reddit.com/r/IdleSlayer/comments/1gq6auj/)). He reverted it within
   four days ("Idle nerf reverted", **405 pts**, the second-highest post in the subreddit's
   history, [1gtkrak](https://www.reddit.com/r/IdleSlayer/comments/1gtkrak/)). The reply thread
   "Thank you Pablo" ([170 pts](https://www.reddit.com/r/IdleSlayer/comments/1gtlet0/)) carries
   the top comment: "I hope some people actually feel bad about calling him money-hungry… one of
   the least monetarised games these days."
   His own account of the job ([wpqtd3](https://www.reddit.com/r/IdleSlayer/comments/wpqtd3/)):
   "Some days I make music, some I do social management and data analytics and some other days
   I do coding and game design… monetization is enough to live out of it."
   On profit ([1did2fc](https://www.reddit.com/r/IdleSlayer/comments/1did2fc/)): "I barely look
   into the numbers once every three or four months… The best way to do it in my opinion is by
   reading player's feedback."

8. **Low-cost monthly events plus a few big collabs.** A dimension buff, a skin and three quest
   tiers each month keep a reason to log in. Two IP collabs, one indie (Shovel Knight) and one
   licensed anime (Attack on Titan), drove the biggest revenue and subreddit spikes. For a solo
   developer, the indie-to-indie collab is the replicable one.

9. **Transparent, numbers-first patch notes.** Notes are in the first person ("I never found a
   way to fix that until now", 5.0.0) and give exact balance numbers ("Stone of Idle Overcharge
   decreased from 10% → 5%"). The game also has a public Google Play beta and an in-game News
   button. Players can see what changed and argue with the real numbers, which keeps trust high
   even when they disagree.

## 4. Player frictions & complaints

Sources: r/IdleSlayer full history (scores are Reddit upvotes at archive time), Steam top-rated
English reviews (helpful counts), and store listings.
Keyword sweep across 30,087 posts: about 128 posts mention "nerf", 417 casino/gambling, 427
events, 440 ads and 167 save loss.

**1. "It's not Idle Slayer, it's Active Slayer": nerfs to idle income.** This is the dominant,
recurring grievance, back to 2021.

- 2021: "In my opinion this game should be renamed to ActiveSlayer" (30, under
  [lzj2mk, 74 pts](https://www.reddit.com/r/IdleSlayer/comments/lzj2mk/)), after offline souls
  were cut from 100× to 2× by one commenter's account.
- November 2024: the Stone of Idle Overcharge nerf.
  "I'm thinking I went from approximately 200Qa/day to about 30" (67, under
  [1gq6auj](https://www.reddit.com/r/IdleSlayer/comments/1gq6auj/)). A cynical reading followed:
  "His endgame is chasing all of us who are near endgame away in favor of… people who will embrace
  active playing and buying boosts" (51). It was reverted four days later.
- February 2026: the nerf returned (Overcharge 10% → 5%) and stayed.
  "I just deleted the game. Now it's not 'Idle Slayer,' it's 'Active Slayer'"
  ([125 pts](https://www.reddit.com/r/IdleSlayer/comments/1r4lkgm/)). Top replies: "Idle is in the
  name… It becomes more of a chore for 1-2 hours" (44) and "last time he nerfed the same thing the
  outcry was insane to the point that he reverted it" (53).
  The patch also cut the hardest quest's requirement, provoking "I want my grinding hours back"
  (85, under [1r5kv59, 184 pts](https://www.reddit.com/r/IdleSlayer/comments/1r5kv59/)).
- On Steam, the top-rated negative review (1,419 hours, 127 helpful) says: "The dev decided that he
  didn't like people idling in his allegedly idle game." Others: "He slowed the game's speed down by
  over 50%" (1,386 hours, 81 helpful); "all meaningful progression beyond the first few hours requires
  RNG during active spurts vs weeks of idling" (735 hours, 71 helpful)
  ([Steam negative reviews](https://steamcommunity.com/app/1353300/negativereviews/?browsefilter=toprated)).

**2. Skill minigames gate permanent power.**
"The last updates made me think about dropping the game… now we got a new minigame with a new
items you have to actively farm again… Today, it feels like im quitting ActiveSlayer"
([73 pts](https://www.reddit.com/r/IdleSlayer/comments/1nwqndd/), about Grapple Run). A reply
reads "it is hard and not enjoyable. And I play souls games" (9).
On the Attack on Titan ODM minigame: "OMD is just something that shouldn't be in the game" (26) and
"I'm not sure why Pablo decided that an idle clicker game really needs some challenging minigames"
(9) ([1du8sz1](https://www.reddit.com/r/IdleSlayer/comments/1du8sz1/)).
A Steam negative review: "the active play part of it isn't compelling either" (104 hours, 53 helpful).

**3. Luck- and gambling-gated progression.**
The casino roulette and slot machine are the only source of some key items.
"I love this game but absolutely despise how progression is locked behind gambling and pure luck"
([81 pts](https://www.reddit.com/r/IdleSlayer/comments/1olyi9k/)), and a similar thread
([65 pts](https://www.reddit.com/r/IdleSlayer/comments/1o1b36x/)). Defenders reply: "Never bet chips
on it, only do the daily spins" (56). Leban's own observation: "most players tend to bet all their
chips until they lose everything, which may frustrate them"
([dev comment](https://www.reddit.com/r/IdleSlayer/comments/13libap/)). The Chest Hunt Mimic produces
its own genre of grief posts ("getting a mimic right after an X2 is soul destroying", 257 pts).

**4. Event quests that ignore the player's toolkit.**
In the current Phantom Fall event, quest bonuses don't apply.
"I don't really see the point of the event upgrades if these items don't work… by the time you do
these the event will be over unless you're the kind of person who runs an auto clicker" (39, under
[1xcqp9o](https://www.reddit.com/r/IdleSlayer/comments/1xcqp9o/)).
The design is deliberate (see the developer's event rule in §2), so this is a stated trade-off
rather than an oversight.

**5. Endgame pacing and walls.**
"Reaching the last upgrades can easily take months with no real progress in between" (Steam, 692
hours, 58 helpful). "'End game' is getting boring"
([75 pts](https://www.reddit.com/r/IdleSlayer/comments/106tple/)). "Was it always this slow?"-style
threads follow the first Ultra Ascension. Elite high-HP ground mobs that stop the run drew one
post saying it "completely breaks the flow of the game"
([83 pts](https://www.reddit.com/r/IdleSlayer/comments/13qvpqf/)).

**6. Save loss and online dependence.**
An early sync bug rolled players back months: "It's been a good run, I'm out!"
([62 pts](https://www.reddit.com/r/IdleSlayer/comments/muphnd/)). There are recurring "use cloud
save" warnings ([mgpxro](https://www.reddit.com/r/IdleSlayer/comments/mgpxro/),
[uvs02q](https://www.reddit.com/r/IdleSlayer/comments/uvs02q/)) and a "Highly disappointed about
the DRM" post (29 pts) over a connection requirement. Recovery is manual: Leban asks players to
email him or DM him on Discord.

**7. Monetisation edge cases (rare, but they exist).**
JoS-buyable Ascension upgrades and Overcharges felt "cheat-adjacent" even to a player using
earned jewels ([119 pts](https://www.reddit.com/r/IdleSlayer/comments/1m8zlvx/)). A regional
price error put permanent ad removal at ~$133 in Hungary (fixed by the developer in-thread). The
Steam F2P switch left day-before buyers sore. Paid UA creatives embarrassed the community: "Pablo
leban shouldn't do ads like this. This game is one of a kind" (92, under
[1un6qy9, 183 pts](https://www.reddit.com/r/IdleSlayer/comments/1un6qy9/)). There are periodic
"ads not giving rewards" incidents; in early 2026 the game granted ad rewards instantly for days
while Unity Ads was broken ([Update History 6.6.6](https://idleslayer.fandom.com/wiki/Update_History)).

**8. Legibility.**
The game's depth is documented by its players rather than in the UI. The fan wiki, an official
calculator, community spreadsheets ("Nesth's spreadsheet") and "should I ascend?" threads fill the
gap until 7.x added in-game guidance. Players discover core systems years late: "4 years into this
game and am so mad I never knew this!" ([70 pts](https://www.reddit.com/r/IdleSlayer/comments/1umxmte/));
"Just Discovered Landscape Mode. Wow." (30 pts).

## 5. Lessons for Out of Ruin

1. **Ship one account everywhere, and reward linking it.** Idle Slayer's reach is the same save
   and purchases on Android, iOS and Steam, plus a free skin for linking. Out of Ruin's saves live
   in the browser today, with no accounts. A cloud account that carries saves *and Stripe
   purchases* is the prerequisite for a Steam build, cross-device play and recovering lost saves.
   Idle Slayer's 2021 sync rollback shows it must be solid before launch, not patched after.

2. **Make the premium currency drip free from a daily loop, and say so.** Jewels of Soul are
   sold ($1.99–$99.99) *and* earned (~1–1.5 a day from Dragon Eggs, with published odds). That
   single fact is why players call a store that sells 500× multipliers "one of the least
   monetarised games". Out of Ruin sells gold through Stripe for card packs, XP and time warps.
   A small daily gold drip (chapter quests or a daily quest egg with published odds) would put
   payers and non-payers in the same economy.

3. **If ads ever come, make them opt-in only, and sell removal cheaply once.** Rewarded video tied
   to time skips and retries, no forced ads, a one-time ~$10 removal, and the same rewards free on
   PC. The ad-removal purchase is the game's most-loved IAP. Out of Ruin's auto-firing hero
   cooldowns and henchman production are natural rewarded-skip hooks if it adds ads.

4. **Spawn active set-pieces into the idle screen, but never put idle progress behind skill.**
   Idle Slayer's boxes, keys and portals appear on their own and are the most-shared moments. But
   every time skill minigames gate permanent power, or idle income is cut to push active play,
   long-tenure players revolt ("Active Slayer", 125–185-point threads, the top-voted Steam
   negatives). Out of Ruin can add a random "treasure goblin" or Mimic-style push-your-luck chest
   on a dungeon level for bonus loot. Henchmen cascades and offline followers should stay the
   guaranteed path.

5. **Never retroactively cut idle income; balance by adding, not subtracting.** Idle Slayer's
   most-upvoted developer moment is a revert (405 pts) and its worst a re-nerf (Feb 2026). For Out
   of Ruin's henchman cascade and follower offline income, tune before release. Afterwards, add
   new sinks or caps on *new* content rather than shrinking what players already earn.

6. **Be the visible developer.** "Fixed in the next update" in the thread where a bug is reported,
   first-person patch notes with exact numbers, a public beta channel, and an in-game news feed.
   A tiny team can't match big-studio content volume, but it can match or beat them on
   responsiveness. Out of Ruin should launch with a changelog, a Discord, and a habit of replying
   in-thread.

7. **Use a Steam launch and a price move as growth events, and look after existing buyers.** The
   $5 → free switch nearly quadrupled Steam concurrency in three months, and the 125-JoS gift to owners
   defused the backlash. If Out of Ruin brings its relaunch to Steam or other stores, a dated
   "now free everywhere" or "now on Steam" moment with a gift for earlier supporters (the 2020
   itch.io/Kongregate players) is a cheap, goodwill-positive launch beat.

8. **Run cheap monthly events and court creators rather than press.** A location buff, a skin
   and three quest tiers each month, plus the occasional indie-IP collab. Idle Slayer's biggest
   revenue months are its collab and big-update months. It has no critic reviews at all, but
   YouTubers (December 2020, 2023, December 2025) moved installs. For Out of Ruin, "a henchman
   army that grows while you sleep" is a creator-friendly hook; seed it to idle-game YouTubers.

9. **Design events that early players can finish, and let mid-game tools count.** Leban's own rule
   ("early game players are able to complete it as well as late game players") is right. Excluding
   all quest bonuses is what makes the current event feel like a chore. If Out of Ruin adds events
   against its chapter quest lists, keep requirements within a mid-game player's realistic daily
   output and let gear-card bonuses apply.

10. **Put the wiki in the game.** Idle Slayer's depth lives in a fan wiki, a calculator and
    spreadsheets until late in-game "ascend recommendation" helpers. Out of Ruin's cascade (higher
    henchmen produce lower henchmen) and hero cooldown powers should be explained with in-game
    previews and a "what to do next" hint from day one.
