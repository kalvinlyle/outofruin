# Idle Miner Tycoon — Manager-automated three-stage mining chain run as a ten-year LiveOps machine Teardown

Research date: 25 October 2026. Primary sources were the live
[Google Play listing](https://play.google.com/store/apps/details?id=com.fluffyfairygames.idleminertycoon&hl=en_US&gl=US),
the [App Store listing](https://apps.apple.com/us/app/idle-miner-tycoon-money-games/id1116645064),
Kolibri's official [Idle Miner Tycoon Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/),
the community [Idle Miner Tycoon fandom wiki](https://idleminertycoon.fandom.com/wiki/Fundamental_Gameplay),
studio talks, and the full r/IdleMinerTycoon archive: 14,476 posts from January 2017 to October 2026,
pulled from Arctic Shift. Revenue and download estimates come from Sensor Tower via the Supercell data
warehouse (non-audited). Feature and motivation data come from
[GameRefinery](https://app.gamerefinery.com/game/5883b445bc85fa43c6a889c0).

## 1. Snapshot

**Studio and ownership.**

- **Founding.** Kolibri Games GmbH, Berlin. Five founders started it in 2016 as Fluffy Fairy Games, in a
  student apartment and with no outside money. It was renamed Kolibri Games in October 2018
  ([Wikipedia](https://en.wikipedia.org/wiki/Kolibri_Games)).
- **Ubisoft deal.** Ubisoft bought 75% of the studio, closing on 31 January 2020, with an option to raise its
  stake to 100% over four years. At the time the studio had about 100 staff and the game had more than
  104 million downloads ([Ubisoft News](https://news.ubisoft.com/en-us/article/2xWaMgJcJBXYmGEFqi8XeY/ubisoft-acquires-mobile-game-studio-kolibri-games)).
  Wikipedia reports a €160 million valuation and 115 staff in 2024. It still lists Ubisoft at 75%, and I
  found no public report that Ubisoft exercised the rest of the option.
- **Today.** The store lists the publisher as Kolibri Games GmbH. The studio's other titles (Idle Bank,
  Firefighter, Restaurant, Mail and High School Tycoon) are "Tycoon" reskins of the same template
  ([Play listing, "More by Kolibri Games"](https://play.google.com/store/apps/details?id=com.fluffyfairygames.idleminertycoon&hl=en_US&gl=US)).

**Engine and technical posture.**

- **Engine.** Unity, with C#. Kolibri job ads ask for Unity developers to "work directly on Idle Miner
  Tycoon" to build UI, game logic and features. Other ads cover Unity tech-art, a Unity Technical Lead and
  a Head of Unity Development ([Kolibri careers](https://kolibrigames.com/career/position/a8135217-e970-4ff6-8305-08ec6ca8a939),
  [Hitmarker junior Unity listing](https://hitmarker.net/jobs/kolibri-games-junior-unity-games-developer-f-m-d-2586940)).
- **Client.** A native mobile client of about 307 MB on iOS, requiring iOS 15.2 or later. It also runs on
  iPadOS and visionOS ([App Store](https://apps.apple.com/us/app/idle-miner-tycoon-money-games/id1116645064)).
- **Backend and saves.** The game is server-backed. Cross-platform save transfer between Android and iOS
  is supported
  ([Help Center: Account & Progress](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/section/20-account-progress/)).
  The online modes need a connection: Expeditions, Chrono Mine and leaderboards.
- **Launch stack.** The GDC 2018 abstract says the studio launched "a bare-bones game leveraging backend
  cloud services" and used analytics for LiveOps
  ([GDC 2018 session, Microsoft Learn archive](https://learn.microsoft.com/events/gdc/gdc-2018/06)).
- **Rendering.** The presentation is 2D/2.5D cartoon art. The first prototype deliberately shipped with
  "no 3D art" ([GameAnalytics](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)).

**Release and status.**

- **Release.** Released 30 June 2016 on Google Play, per the listing's embedded release date. GameRefinery
  logs global launch as 1 July 2016. It was built in eight weeks
  ([Wikipedia](https://en.wikipedia.org/wiki/Kolibri_Games),
  [PocketGamer.biz, Löffler](https://www.pocketgamer.biz/comment-and-opinion/67866/fluffy-fairy-games-regular-updates/)).
- **Current build.** Live and actively developed. Version 5.65.0 (Ur'vox in Frontier Mines) shipped in
  October 2026. The Play listing was updated 22 October 2026 and promotes a Halloween "spooky wheel" for a
  new Legendary Manager
  ([Play](https://play.google.com/store/apps/details?id=com.fluffyfairygames.idleminertycoon&hl=en_US&gl=US)).
- **Anniversary.** The game marked 10 years in July 2026
  ([r/IdleMinerTycoon anniversary post](https://www.reddit.com/r/IdleMinerTycoon/comments/1ukhgxh/)).

**Platforms.**

- **Live.** iOS, iPadOS, visionOS and Android.
- **Discontinued.** A Facebook Gaming cloud version launched on 7 March 2022. Ubisoft Da Nang ported it,
  and it ran on the same server as the mobile version
  ([Kolibri press](https://www.kolibrigames.com/press/idle-miner-tycoon-launches-on-facebook-gaming)).
  Meta has since discontinued the Cloud Games programme
  ([Meta developer docs](https://developers.facebook.com/documentation/games/archive/cloud-games)), so that
  platform is gone. There is no PC, Steam or web build.

**Distribution.**

- **Channels.** Free on the App Store and Google Play. It is a Google Play **Editors' Choice**, a badge
  visible on the live listing.
- **User acquisition.** Paid UA has been heavy since June 2017. Kolibri says revenue grew 10x within three
  months of starting marketing
  ([Barker deck, Oct 2019](https://www.slideshare.net/slideshow/what-we-learned-idle-miner-tycoon-and-idle-factory-tycoon-kolibri/182846509)).
  Sensor Tower's monthly IAP estimate rises from $116K in June 2017 to $1.08M in November 2017, which is
  consistent with that claim.

**Pricing and monetisation model.** Free to play, with hybrid monetisation through rewarded ads and IAP.

- **IAP range.** Google Play lists in-app products from $0.49 to $99.99 per item. Google rates the game
  "Everyone, In-Game Purchases (Includes Random Items)". Apple rates it 13+ and flags loot boxes and
  advertising.
- **App Store top sellers.** Bundle of Super Cash $1.99, Event Offer 1 $2.99, Chest Offer 3 $2.99,
  Starter Package 2 $4.99, Pile of Super Cash $4.99, Double Cash $6.99, Premium Pass Offer $9.99,
  Bag of Super Cash $9.99, Event Offer 2 $19.99 and Small Chest of Super Cash $19.99
  ([App Store](https://apps.apple.com/us/app/idle-miner-tycoon-money-games/id1116645064)).
- **The No Ads offer.** It does not remove ad rewards. It makes every ad reward instant
  ([Help Center: ad boosts](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/74-can-i-watch-an-advertisement-to-boost-my-mines/)).
  Players reported it at $15 in 2021 and as a $20 bundle in 2023 to 2024
  ([1g2qbsr](https://www.reddit.com/r/IdleMinerTycoon/comments/1g2qbsr/),
  [16s0xv7](https://www.reddit.com/r/IdleMinerTycoon/comments/16s0xv7/)).

**Ad share of revenue.** The first pass's three conflicting figures (50%, 60% and 90%) resolve as follows.

- **"60%" (GameAnalytics).** The write-up of Nate Barker's talk literally says "About 60% of our revenue
  comes from ads" and "The other 60% of our revenue comes from in-app purchases"
  ([GameAnalytics](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)).
  The second sentence is plainly a transcription error for 40%. Stephens analyst Jeff Cohen independently
  put Kolibri at "approximately 60% ads to 40% in-app-purchases" at the Ubisoft deal
  ([GamesBeat, Feb 2020](https://gamesbeat.com/ubisoft-acquires-idle-miner-tycoon-developer-kolibri-games/)).
- **"50%" (GameRefinery, March 2021).** Barker said Kolibri "typically cited the figure around 50% of
  revenue coming from ads" before joining Ubisoft, and that this was "still a fairly accurate number"
  ([GameRefinery podcast ep. 14](https://www.gamerefinery.com/episode-14-ad-monetization-with-kolibri-games/)).
- **"90%" is not an ad share.** In context, Barker says "we're going to need to diversify the total
  inventory" and then that 90% of their ad revenue "is coming from games advertising and other games." It
  describes who buys the ad inventory (game advertisers), not ads versus IAP. Drop it.
- **"75%" is not an ad share either.** Some summaries attach a "75%" figure to the October 2019 deck. In the
  deck it is D1 retention
  ([Barker deck](https://www.slideshare.net/slideshow/what-we-learned-idle-miner-tycoon-and-idle-factory-tycoon-kolibri/182846509)).
- **Independent check.** The GDC 2018 abstract claims "$100K of revenue a day" a year after launch
  ([GDC 2018](https://learn.microsoft.com/events/gdc/gdc-2018/06)). Sensor Tower puts gross IAP for Q1 2018
  at about $1.07M a month, or roughly $36K a day. If the $100K figure is accurate, ads were about 60 to 65%
  of revenue in early 2018.
- **What I trust.** Ads were about 60% in 2017 to 2019 and drifted toward about 50% by 2021, as IAP depth
  (Super Managers, passes) grew. These are self-reported studio and analyst figures, so they are
  non-audited.

**Audience scale.** Sensor Tower via Supercell data warehouse, worldwide, App Store plus Google Play, gross
IAP only (no ad revenue). Non-audited.

| Year | IAP revenue (est.) | Downloads (est.) |
|---|---|---|
| 2016 (Jul–Dec) | $0.13M | 1.9M |
| 2017 | $4.3M | 15.8M |
| 2018 | $15.3M | 38.7M |
| 2019 | **$20.9M (peak)** | 34.7M |
| 2020 | $19.7M | 33.4M |
| 2021 | $17.0M | 18.7M |
| 2022 | $13.3M | 18.9M |
| 2023 | $9.4M | 15.6M |
| 2024 | $7.4M | 16.5M |
| 2025 | $6.7M | 15.2M |
| 2026 (Jan–Oct, Oct partial) | $5.5M | 11.4M |
| **Lifetime** | **≈ $120M** (iOS $59.1M / Android $60.7M) | **≈ 221M** (iOS 64.8M / Android 155.9M) |

- **Download claims hold up.** Kolibri claimed 150 million downloads in September 2022
  ([Kolibri press](https://www.kolibrigames.com/press/kolibri-games-hit-title-idle-miner-tycoon-surpasses-150-million-downloads/)).
  Sensor Tower's cumulative total reaches about 157M by then. Ubisoft's "104 million" in February 2020
  compares with about 94M in Sensor Tower.
- **Google's own count is higher.** Google Play's page data embeds an exact install count of
  **176,229,398 on Android alone**, against Sensor Tower's 155.9M. That is the most authoritative figure
  available, and it suggests Sensor Tower undercounts Android by about 12%. True lifetime installs across
  both stores are plausibly 240M or more.
- **Current run rate.** About $0.5 to 0.6M of gross IAP a month through 2026, with a slow decline of about
  10% a year. Downloads are still 1.0 to 1.7M a month, which points to continued paid UA.
- **Implied total revenue (my estimate, non-audited).** If ads are about 50% of revenue, 2025 total gross
  revenue was roughly $13M or more.
- **Markets.** In 2025, the US was 40% of IAP ($2.7M), followed by Germany ($0.81M) and the UK ($0.54M).
- **Studio-wide figures (self-reported).** 10 million MAU across IMT and Idle Factory in 2019
  ([PocketGamer.biz, Stammler at Quo Vadis 2019](https://www.pocketgamer.biz/feature/70431/how-kolibri-went-from-minimal-viable-product-to-70-million-installs-for-its-idle-games/)).
  About $200K a day across two games in 2019
  ([GDC 2019 deconstruction, Adam Telfer](https://mobilefreetoplay.com/gdc-2019-deconstructing-idle-miner-tycoon/)).
  Kolibri revenue of €53.5M in an FT 1000-sourced infobox
  ([Wikipedia](https://en.wikipedia.org/wiki/Kolibri_Games)). There is no current public MAU or DAU.

**Review sentiment.**

- **Google Play.** 4.5 stars from 5.87M reviews, 5.38M of them on phone
  ([Play](https://play.google.com/store/apps/details?id=com.fluffyfairygames.idleminertycoon&hl=en_US&gl=US)).
- **App Store (US).** 4.7 stars from 866K ratings
  ([App Store](https://apps.apple.com/us/app/idle-miner-tycoon-money-games/id1116645064)).
  Sensor Tower's metadata shows 1.80M iOS ratings in total.
- **Top-of-page 2026 Play reviews.** They complain about pop-up offers on launch, the game "playing
  itself" once automated, and ads failing to load. Kolibri replies to each, sometimes signing "~IdleAI".
- **Reddit (r/IdleMinerTycoon, about 15K members by August 2025).** The tone is affectionate toward the
  core loop and openly hostile to price escalation. Section 4 has the detail.

**Critical reception.** There is no meaningful press-review footprint: I found no Metacritic,
PocketGamer, Gamezebo or 148Apps reviews. Its reputation comes from industry talks instead: GDC 2018
(Löffler), Quo Vadis 2019 (Stammler), the Barker GameAnalytics meetup in 2019, and the GDC 2019
"Deconstructing Idle Miner Tycoon" session by Adam Telfer.

- **Telfer's view.** He praised the scalable strategic core and the marketable sim visuals. He also judged
  that "Idle Miner is leaving plenty of money on the table by going with such light events"
  ([MobileFreeToPlay](https://mobilefreetoplay.com/gdc-2019-deconstructing-idle-miner-tycoon/)).
  Kolibri spent 2020 to 2026 closing exactly that gap: Frontier, Chrono, Tesseract, Everdeep, mazes and
  passes.
- **GameRefinery.** It gives a GPS / power score of 81.4 across 244 tracked features. Its biggest
  strengths over the idler genre are Foundation (+44), Scope (+11.5), Re-engagement (+11) and IAP (+7.9)
  ([GameRefinery](https://app.gamerefinery.com/game/5883b445bc85fa43c6a889c0)).

**One-line player promise (store capsule).** The Play short description reads "Be a miner: Mine gold &
cash in this idle business simulator game. Even offline!" The App Store subtitle is "Mining Simulator:
Dig & Drill", and its description leads with "Automate your workflow and collect your idle cash income,
even when you are offline!" The current long description is keyword-stuffed SEO ("idle tycoon offline",
"clicker adventure"). Kolibri's ASO is now optimising for search, not for describing the game.

**Strategic read for Out of Ruin.** IMT is the closest commercial proof of Out of Ruin's economy: three
automated stations in series, each owned by a hireable "manager", balanced against each other, cloned
across mines and continents, and then given character through collectible Super Managers. Its player
motivation profile matches Out of Ruin's stated audience closely. GameRefinery scores it above the idler
average on completing milestones (4.25 vs 4.04), resource optimisation (3.72 vs 3.07) and discovering new
worlds (3.0 vs 2.47), and below average on competition (1.13) and social play (1.12)
([GameRefinery motivations](https://app.gamerefinery.com/game/5883b445bc85fa43c6a889c0)).

The commercial lesson is that the base loop earned the installs. The revenue tail after 2019 came from
increasingly rule-bending event modes and an increasingly aggressive offer layer. The community's loudest
anger is aimed at the second of those, not the first.

## 2. Core system designs

### 2.1 The three-station chain: Mineshafts → Elevator → Warehouse

- **Player-facing intent.** One screen shows the whole economy: dig (shafts), haul (elevator) and sell
  (warehouse). Kolibri describes the loop as Mine, Transport, Sell, Upgrade, and says "Our interface shows
  all these stages in one screen"
  ([GameAnalytics](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)).
  The fiction inverts the tower-builder: you dig down instead of building up.
- **Mechanical model.** Each shaft's miners extract cash into a stockpile beside the shaft. The elevator
  descends, loading from each shaft's pile until it is full or reaches the bottom. It only collects on the
  way down, then unloads at the surface. Warehouse workers push carts from the elevator to the warehouse,
  where resources convert to cash
  ([wiki: Elevator](https://idleminertycoon.fandom.com/wiki/Elevator),
  [Warehouse](https://idleminertycoon.fandom.com/wiki/Warehouse),
  [Mineshafts](https://idleminertycoon.fandom.com/wiki/Mineshafts)). Throughput is the minimum of the three
  stages. "If only one of these three is lacking in throughput the amount of money that reaches your
  Warehouse is limited (bottleneck)"
  ([wiki: Fundamental Gameplay](https://idleminertycoon.fandom.com/wiki/Fundamental_Gameplay)). Kolibri
  calls these bottlenecks "choke points", and they are the explicit basis of monetisation.
- **Data shape.**
  - Up to 30 shafts per mine, each to level 800. The elevator and warehouse go to level 2,400
    ([Help Center: maximum levels](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/53-what-are-the-maximum-levels/)).
  - Each shaft gains an extra worker at levels 10, 50, 100, 200 and 400, to a maximum of 6. The warehouse
    gains a worker at 20, 100, 300 and 500, to a maximum of 5.
  - Shaft "boost" increments (a step jump in extraction, plus a Super Cash reward) fall at 10, 25, 50,
    100, 200, 300, 400 and up to 800.
  - At Prestige 5, five extra "core" shafts unlock, which raises the elevator and warehouse cap to 2,800.
    Shaft 31 requires shaft 30 fully maxed.
  - The Chrono Mine variant now runs to 100 shafts, with elevator and warehouse caps of 7,400
    ([1wde3a3](https://www.reddit.com/r/IdleMinerTycoon/comments/1wde3a3/)).
- **Progression and gating.** Costs scale geometrically and are shown in letter notation (aa, ab, ac and
  so on, covered in a Help Center FAQ). Every five shafts a rock barrier blocks the next one (see 2.3).
  The Help Center's strategy for recovering after a prestige: buy shafts, then raise the elevator and
  warehouse "so that their output matches the production of your most advanced mine". This is the core
  skill of the game.
- **Inputs, UI, affordances.** Before managers, the player taps each station to make its workers do one
  cycle. Upgrades use a multi-buy (x1, x10, x50, max). The elevator and warehouse panels show capacity
  against incoming load, so the bottleneck is readable.
- **Failure modes and edge cases.** Because the elevator only collects on the way down, a deep mine with a
  weak elevator never reaches the bottom shafts, which are the most valuable. The game turns that into a
  visible punishment for ignoring transport. Players also report a late-game wall in mines 26 to 30, where
  shafts "do not produce enough income to upgrade" and "you can't carry enough with your elevator and
  warehouse" ([a7we3g, 23 points](https://www.reddit.com/r/IdleMinerTycoon/comments/a7we3g/)).
- **Why it works.** It is a supply-chain toy with exactly one decision per moment: which station is the
  bottleneck? The answer is always visible on screen. That legibility is what gave the stripped prototype
  63 to 81% D1 retention
  ([GameAnalytics](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)),
  and about 75% D1 at scale
  ([Barker deck](https://www.slideshare.net/slideshow/what-we-learned-idle-miner-tycoon-and-idle-factory-tycoon-kolibri/182846509)),
  both self-reported.

### 2.2 Managers: automation plus timed active abilities

- **Player-facing intent.** Managers turn tapping into idling. A manager on a station keeps its workers
  running and lets that station earn while you are away.
- **Mechanical model.**
  - Managers unlock once the first shaft reaches level 5. Each manager is tied to one station type: shaft,
    elevator or warehouse.
  - Each has a rank (Junior, Senior, Executive) and one timed active ability. For the warehouse these are
    walking speed, loading speed, cost reduction or load expansion. Higher ranks are stronger.
  - The first hires follow a fixed, tutorial-friendly order before they become random
    ([wiki: Managers](https://idleminertycoon.fandom.com/wiki/Managers)).
  - Hiring cost escalates with each manager. Managers sell back for 50% of their price, or 100% if you
    watch an ad ([wiki: Ad Boosts](https://idleminertycoon.fandom.com/wiki/Ad_Boosts)).
  - Prestiging a mine loses all its normal managers
    ([wiki: Prestige](https://idleminertycoon.fandom.com/wiki/Prestige)).
- **Data shape.** Each manager record holds station type, rank, ability type, multiplier, duration and
  cooldown. The early hire order is a fixed table.
- **Progression and gating.** Normal managers are bought with mine cash, so they are a cash sink that
  scales with depth. The player curates them: put Executives with mining-speed boosts in the deepest,
  richest shafts and cost-reduction managers at the top
  ([BlueStacks guide](https://www.bluestacks.com/blog/game-guides/idle-miner-tycoon/idt-tips-tricks-en.html)).
- **Inputs, UI, affordances.** Tapping a manager portrait fires its ability, which then shows a cooldown
  ring. Activating abilities across every shaft during a big boost is a known chore that the No Ads
  purchase makes easier ([j0iepj](https://www.reddit.com/r/IdleMinerTycoon/comments/j0iepj/)).
- **Failure modes.** Ability management does not scale. With 30 or more shafts across 40 mines, manually
  firing abilities becomes tedium, so the late game shifts to Super Managers and boosts.
- **Why it works.** It is the cleanest possible bridge from active play to idle play. The thing that
  automates you is also a collectible with a button on it.

### 2.3 Rock barriers and the time gate

- **Player-facing intent.** Barriers are pacing beats and the main monetisation choke point: "pay or wait".
- **Mechanical model.** A barrier sits after every fifth shaft. You pay cash to start removing it, wait
  out a timer that grows with depth, and then still pay cash to buy the shaft behind it
  ([Help Center: barriers](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/36-why-did-i-have-to-pay-twice-to-unlock-a-barrier-and-get-a-new-mine-shaft/)).
  You can shorten the timer in three ways:
  - Watch ads: 2 ads per 60 real-time minutes, each removing 30 minutes
    ([wiki: Ad Boosts](https://idleminertycoon.fandom.com/wiki/Ad_Boosts)).
  - Pay Super Cash to skip it instantly.
  - In Frontier Mines, use Time Jumps or Frontier Credits.
- **Data shape.** Each barrier holds an index, a cash cost, a timer duration and an ad-reduction step. A
  core barrier before shaft 31 needs Prestige 5.
- **Progression and gating.** Barriers dominate late-game pacing. Endgame players describe maxing the
  first five shafts "within 5 minutes", then sitting on a barrier for an hour. That is why one top post
  calls the game "Advert Miner Tycoon": "all you're doing is waiting on barriers and watch ads every
  hour. People set timers to watch ads every hour"
  ([i7ib4v, 72 points, the most-upvoted complaint in the subreddit's history](https://www.reddit.com/r/IdleMinerTycoon/comments/i7ib4v/)).
- **Failure modes.** Timers were raised retroactively on existing Mainland mines, which players read as
  greed ([a7we3g](https://www.reddit.com/r/IdleMinerTycoon/comments/a7we3g/)). A Help Center entry also
  exists for barriers showing "30 days or more", which implies a clock or state bug class.
- **Why it works, and doesn't.** It converts boredom into ad impressions with perfect efficiency. For
  engaged players, though, it turns the game into an alarm clock.

### 2.4 Mines, continents and prestige: the macro ladder

- **Player-facing intent.** Breadth (more mines) and depth (prestige resets) give a long-term map to fill.
- **Mechanical model.**
  - There are 8 main continents: Start, Ice, Fire, Dawn, Dusk, Ancient, Lost Desert and Underwater. Each
    has 5 mines and its own cash currency
    ([wiki: Main Continents](https://idleminertycoon.fandom.com/wiki/Main_Continents),
    [Currencies](https://idleminertycoon.fandom.com/wiki/Currencies)).
  - Mines within a continent share that continent's currency. You unlock the next mine with that currency
    (on Start: Gold 76.8ab, Ruby 6.14ad, and so on), and the next continent once you are far enough along
    ([wiki: Start Continent](https://idleminertycoon.fandom.com/wiki/Start_Continent_(Grass))).
  - **Prestige** resets one mine's shafts, elevator, warehouse, normal managers, ad boost and barriers. In
    return it gives a permanent income multiplier and 100 Super Cash. Super Managers, global boosts and
    all other mines are untouched. There are 6 prestige levels; on the Coal Mine they give 4x, 20x, 30x,
    45x, 60x and 145x. Prestige can only be bought with that mine's cash, never with Super Cash or real
    money ([wiki: Prestige](https://idleminertycoon.fandom.com/wiki/Prestige)).
- **Data shape.** Continents contain mines. Each mine has a prestige level and a multiplier table, plus
  per-continent cash and research points. There are seven research trees, each funded by its own
  continent's cash: green from Start cash, blue from Ice cash, and so on
  ([wiki: Skill System](https://idleminertycoon.fandom.com/wiki/Skill_System)).
- **Progression and gating.** Prestige is optional and per mine, and Kolibri says it does not push players
  into it ([GameAnalytics interview](https://www.gameanalytics.com/blog/idle-games-fluffy-fairy-interview)).
  Telfer singled out this design choice: "They didn't force you to fully prestige unless you absolutely
  wanted to" ([MobileFreeToPlay](https://mobilefreetoplay.com/gdc-2019-deconstructing-idle-miner-tycoon/)).
- **Inputs, UI, affordances.** A world map shows islands for continents and feature hubs (Research,
  Super Managers, Collectibles, Expeditions, Event Mine, Impossible Island). A "$ Collect" pane collects
  idle cash per continent or for everything at once.
- **Failure modes.** Later continents can feel pointless if their research does not feed anything. One
  post asked of the Desert continent, "What does desert do? Take space on the screen?"
  ([rkv02h, 48 points](https://www.reddit.com/r/IdleMinerTycoon/comments/rkv02h/)). Finished continents
  get shut off to reduce lag ([hezo8b](https://www.reddit.com/r/IdleMinerTycoon/comments/hezo8b/)).
- **Why it works.** Each continent re-skins the same chain with a new currency and research tree. That is
  cheap novelty that resets the sense of scale while the player's permanent power (Super Managers,
  multipliers) carries across.

### 2.5 Idle Cash, offline earnings and ads on return

- **Player-facing intent.** Make it feel good to come back.
- **Mechanical model.** Idle Cash accrues in every mine you are not actively viewing, "usually at 10% of
  what each mine earns when you're in the game". On re-entering a mine you can watch an ad to double the
  stockpile, and it is not credited until you collect
  ([wiki: Ad Boosts](https://idleminertycoon.fandom.com/wiki/Ad_Boosts)). Two other ad boosts matter:
  - **Mine income ad boost.** 2x for 4 hours per ad, stacking duration up to 1 day 7 hours. It multiplies
    with all other boosts and can be raised to 3.14x through research.
  - **Chest chance.** Ads count as "logging back in" for the chance of a collectible chest drop.

  Permanent IAP doublers stack: 2x Income Forever and 2x Idle Cash Forever, giving 4x idle with both
  ([Help Center: boosts](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/52-what-are-boosts/)).
- **Data shape.** Each mine holds an idle rate (a fraction of active rate) and a last-visit timestamp.
  Boost tokens are stored in an inventory and either queue (if identical) or stack (if different). The
  wiki's example: a 2x plus a 50x gives an 87x total, which becomes 174x with the ad boost
  ([wiki: Boosts](https://idleminertycoon.fandom.com/wiki/Boosts)).
- **Progression and gating.** Offline income is deliberately weaker than active income, which is the
  reason to open the app. The ad multiplier is then the reason to watch an ad when you do.
- **Inputs, UI, affordances.** A "while you were away" modal offers Collect or 2x with an ad. Kolibri's
  Nate Barker calls this "by far the best performing ad we have because players are confronted with it as
  soon as they get into the game". Small soft or hard currency rewards "tend not to convert very well"
  ([GameRefinery podcast](https://www.gamerefinery.com/episode-14-ad-monetization-with-kolibri-games/)).
  In 2019 the average player watched eight ads per session per day, in roughly ten-minute sessions
  ([GameAnalytics](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)).
- **Failure modes.**
  - **Third-party ad UX.** The game cannot control it. After a switch to the Mintegral network, one player
    timed a single boost at "1 minute to 1 minute 20 seconds": choose an ad, sit through 30 seconds, wait
    15 more seconds for the X, then hunt for the X
    ([gcm5uf, 40 points](https://www.reddit.com/r/IdleMinerTycoon/comments/gcm5uf/)).
  - **Ad failures.** Ads that fail to load, or reset the game, still appear in September 2026 Play reviews.
  - **Ad content.** Players complain of sexualised ad creatives
    ([i2brj2](https://www.reddit.com/r/IdleMinerTycoon/comments/i2brj2/)) and ads that stop the phone's
    music player ([g76i7w](https://www.reddit.com/r/IdleMinerTycoon/comments/g76i7w/)).
- **Why it works.** The ad is welded to a moment of pure reward, so it feels like a bonus rather than a
  tax. The No Ads purchase keeps the bonus and removes only the wait, which is why players who bought it
  praise it ("Wow, IMT is way more fun without the ads"
  ([j0iepj, 34 points](https://www.reddit.com/r/IdleMinerTycoon/comments/j0iepj/))).

### 2.6 Super Managers and the Mainland gem economy (the henchman layer)

- **Player-facing intent.** Named, rarity-tiered characters with personalities. They are the
  collection-and-build layer on top of the chain.
- **Mechanical model.**
  - Super Managers slot into the same three stations, but each has a unique active ability and passives
    unlocked through promotion. They are never lost on prestige.
  - **Example (Samantha Reiss, Legendary, mineshaft).** Her active boosts the elevator, the warehouse and
    her own shaft for 2m 30s on a 30-minute cooldown. Passives unlock at levels 10, 30 and 50: cost
    reduction, idle cash, then continent income
    ([Help Center: Samantha Reiss](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/297-samantha-reiss/)).
  - **Example (Sir Lorenzo).** He transmits 10.19x of shaft production straight to the warehouse,
    bypassing the chain ([wiki: Super Managers](https://idleminertycoon.fandom.com/wiki/Super_Managers)).
  - **Example (Vincent Van Gourd, Halloween 2026 elevator Legendary).** His head collects resources and
    then falls down the mine, multiplying per open shaft
    ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/556-vincent-van-gourd/)).
  - Abilities increasingly break the three-station rules. That is how new Super Managers stay
    interesting.
- **Data shape.** Each Super Manager has station, rarity (common to legendary), level (to 50), promotion
  rank (R1 to R5), elements (for Elemental Mode), an equipment slot, an active ability (multiplier,
  duration, cooldown) and passive tiers.
  - **Currencies.** **Green gems** hire, **blue gems** level and **red gems** promote at levels 10, 20, 30,
    40 and 50. All three are earned from Mainland Mines: 16 locations × 15 levels = 240 linear mines,
    where completion means all 30 shafts at level 800 and the elevator and warehouse at 2,400
    ([wiki: Mainland Mines](https://idleminertycoon.fandom.com/wiki/Mainland_Mines),
    [Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/44-how-do-the-mainland-mines-work/)).
  - **Fragments and boosters.** Later layers added fragments via Fragment Briefcases (Common, Rare and
    Epic Tokens), blue and red Power Crystals that cut gem costs, and Elemental Essences
    ([Help Center: Chrono rewards](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/332-what-are-the-chrono-mine-rewards/)).
  - **Equipment.** Crafted from fabric, glass, iron, steel and battery. It adds a second ability with its
    own cooldown
    ([Help Center: equipment](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/124-what-is-super-manager-equipment/)).
- **Progression and gating.** There are three acquisition routes:
  - **Grind.** Mainland gems and event tokens.
  - **Prestige.** Legendaries come from Impossible Island medals
    ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/84-what-are-legendary-super-managers/)).
  - **Money.** Direct sales (Ezio at €54, Wolfgang at $50), rentals (Queen Frost for 90 days at about
    40K Super Cash or $20; Sir Henry for 30 days with the VIP Daily Delivery subscription), and paid
    "maze" event tracks
    ([nzjn3s](https://www.reddit.com/r/IdleMinerTycoon/comments/nzjn3s/),
    [qjgif5](https://www.reddit.com/r/IdleMinerTycoon/comments/qjgif5/),
    [rkk29x](https://www.reddit.com/r/IdleMinerTycoon/comments/rkk29x/)).

  A two-year free-to-play player describes four milestones:

  1. Finishing Frontier Mine 3, which unlocks a regular Epic Token income.
  2. A first MIF (Mine Income Factor) Super Manager.
  3. A first CIF (Continent Income Factor) Super Manager.
  4. A first R5 promotion.

  He reports reaching "endgame" in two years without spending
  ([1sp9y01](https://www.reddit.com/r/IdleMinerTycoon/comments/1sp9y01/)). By contrast, a 7 to 8 year
  player still lacks an R5 ([same thread](https://www.reddit.com/r/IdleMinerTycoon/comments/1sp9y01/)).
- **Inputs, UI, affordances.** A Super Manager tower on the world map and a reassign screen per station.
  The July 2023 redesign of the manager panel produced one of the most-upvoted complaints: "Horrific
  design!" ([14yrnz4, 54 points](https://www.reddit.com/r/IdleMinerTycoon/comments/14yrnz4/)). Commenters
  cited tiny buttons and a broken sort order, and said you "can not hire Normal Manager if your in the
  Super Manager Sub Menu".
- **Failure modes.**
  - **Power creep in the paid tier.** An epic sold for $20 outperformed legendaries earned through a year
    of key-forging. One player wrote: "what am I forging keys for a year for if I can just spend 20 bucks
    on a SM twice as good"
    ([rkv02h](https://www.reddit.com/r/IdleMinerTycoon/comments/rkv02h/)).
  - **Pool dilution.** "Every 2 weeks or so a new Super Manager to dilute the pool"
    ([15n3moq](https://www.reddit.com/r/IdleMinerTycoon/comments/15n3moq/)).
  - **Unreachable caps.** Free players say Epic and Legendary Super Managers "cannot physically be maxed
    out" without buying Mainland gems
    ([z1wl81, 47 points](https://www.reddit.com/r/IdleMinerTycoon/comments/z1wl81/)).
  - **Localisation lag.** New Super Manager text ships before translations.
- **Why it works.** Super Managers are the long-term motivation. The "long painful (enjoyable) grind to
  unlock a new MIF/CIF" is, in one veteran's words, "the reason we play this game"
  ([1mh0a6y](https://www.reddit.com/r/IdleMinerTycoon/comments/1mh0a6y/)).

### 2.7 The permanent-multiplier stack: Research, Collectibles, Artifacts, Friends

- **Player-facing intent.** Several parallel ways to get permanently stronger.
- **Mechanical model.**
  - **Research.** Seven skill trees, each bought with its own continent's research points. It costs 5.6T
    cash to unlock. A full reset costs 400 Super Cash
    ([wiki: Skill System](https://idleminertycoon.fandom.com/wiki/Skill_System)).
  - **Collectibles.** Cards from chests (Common, Rare, Epic and Legendary; Premium chests hold 10
    legendary cards). They skin workers and buff their station, and duplicates level them up
    ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/51-what-are-collectibles-and-how-do-i-get-them/)).
  - **Artifacts.** Permanent boosts unlocked by consuming specific boost tokens. They apply only to normal
    continents ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/129-what-are-artifacts/)).
  - **Friends.** Having friends gives a permanent income boost, and friends speed up shared Expeditions
    ([Help Center: Expeditions](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/49-what-are-expeditions/)).
- **Data shape.** These are multiplicative global modifiers. Collectibles depend on a gendered card pool,
  with male and female variants of each legendary.
- **Progression and gating.** Chests can be bought with Super Cash or real money, and a free wooden chest
  comes every 4 hours.
- **Failure modes.**
  - **Gendered cards.** Adding female miner cards doubled the card pool for the same bonuses. Kolibri
    admitted in its first Community Update Letter that it "might not have achieved" a rewarding late game
    ([dz3aov](https://www.reddit.com/r/IdleMinerTycoon/comments/dz3aov/),
    [jkhwov "Gender-Based Collectibles Was A Bad Idea", 48 points](https://www.reddit.com/r/IdleMinerTycoon/comments/jkhwov/)).
  - **Chest value.** One player opened 277 chests worth 97,000 to 223,400 Super Cash at list price and got
    "0 meaningful upgrades"
    ([kweyyi](https://www.reddit.com/r/IdleMinerTycoon/comments/kweyyi/)).
  - **Artifacts' launch.** Artifacts arrived in 2020 to a "biggest money grab I've seen" reception
    ([jz1q0k](https://www.reddit.com/r/IdleMinerTycoon/comments/jz1q0k/)).
- **Why it works, and doesn't.** Stacking sources keeps everyone's number going up. But any system whose
  rewards flatten out (Collectibles past the early game) becomes a source of grievance, because chests
  keep being sold at the same price.

### 2.8 Event Mines and the Event Season pass

- **Player-facing intent.** A weekly themed sprint that resets the economy to zero, so everyone, new
  players included, gets an early-game rush.
- **Mechanical model.** Event mines usually last 5 days. They have themed cash that does not carry over,
  objectives, and badge tiers: Participation, Bronze, Silver, Gold and Elite
  ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/45-how-does-the-event-mine-work/)).
  Rewards feed Season Points at 40 per pass level, on a free track and a Premium Pass track. Skipping a
  level costs 500 Super Cash, and **event mines are the only source of pass progress**
  ([wiki: Event Seasons](https://idleminertycoon.fandom.com/wiki/Event_Seasons),
  [GameRefinery analyst review](https://app.gamerefinery.com/game/5883b445bc85fa43c6a889c0)).
- **Data shape.** Each event has a theme, a cash type, objective thresholds, badge tiers and a reward
  table. The wiki counts **373 event mines** by mid-2025, covering Pharaoh, Pride, Shark, Oktoberfest and
  more, with many themes rerun yearly ([wiki: Event Mines](https://idleminertycoon.fandom.com/wiki/Event_Mines)).
  Since January 2026 Kolibri has posted a monthly event calendar on Reddit
  ([1q6hg9h](https://www.reddit.com/r/IdleMinerTycoon/comments/1q6hg9h/)).
- **Progression and gating.** An Elite badge each month unlocks "all season rewards", which a free player
  calls a big step ([1jt3lx0](https://www.reddit.com/r/IdleMinerTycoon/comments/1jt3lx0/)). Kolibri says
  event mines "often double revenue for a weekend"
  ([GameAnalytics](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)).
- **Inputs, UI, affordances.** An Event Mine island, a badge gallery and a season pass screen. Players
  share speedrun guides, such as a 2m 01s personal best
  ([hbvc6q](https://www.reddit.com/r/IdleMinerTycoon/comments/hbvc6q/)).
- **Failure modes.**
  - **Reward deflation.** "This used to be what you received from completing an event mine. It's an
    absolute joke looking at the scraps we get now"
    ([oee86x, 36 points, 61 comments](https://www.reddit.com/r/IdleMinerTycoon/comments/oee86x/)).
  - **Pass value.** A Season Pass "isn't worth it", per a 2020 App Store review with a developer reply.
  - **Version gates.** Events demand a minimum app version, which strands players during staged rollouts.
- **Why it works.** First-time completion produces some of the warmest posts in the archive ("FIRST EVENT
  MINE COMPLETE!", [dkjs95](https://www.reddit.com/r/IdleMinerTycoon/comments/dkjs95/)). Each event is a
  fresh, short, finishable game inside an endless one.

### 2.9 Rule-variant modes: Frontier, Tesseract, Everdeep, Chrono Mine, Elemental, Impossible Island

These modes are how Kolibri answered Telfer's "light events" critique. Each strips or constrains part of
the player's permanent power, so the Super Manager roster becomes the variable being tested.

- **Frontier Mines (from about 2023).**
  - **Rules.** Only managers and Super Managers come along. Boosts, Super Cash, Instant Cash, research,
    artifacts, collectibles and the friend boost are all disabled. The mode has its own economy of
    Frontier Credits, Multipliers, Time Jumps and **Sparks**
    ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/194-what-are-frontier-mines/)).
  - **Sparks.** Each Super Manager activation costs Sparks, and the cost rises with every use up to a cap.
    It resets per tier
    ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/196-how-can-i-activate-super-manager-abilities-in-frontier-mines/)).
    Leftover credits convert to Mystery Boost Tickets at 1 per 600.
  - **Expansion.** Tiers ran to mine 7. October 2026 added mines 8 to 10 and a new Super Manager
    (Ur'vox) from a Frontier Briefcase. Premium Pass and Elite Pass tiers were retained
    ([1x0ufd3](https://www.reddit.com/r/IdleMinerTycoon/comments/1x0ufd3/)).
  - **Reception.** The launch review graded the Spark escalation "FFF" because it punishes struggling
    players hardest. "It is unnoticable to powerful players ... but to people who are struggling, it
    punishes them more and more"
    ([10tk4ns](https://www.reddit.com/r/IdleMinerTycoon/comments/10tk4ns/)).
- **Tesseract (2025).**
  - **Rules.** A Frontier variant with a new structure between the elevator and warehouse. Super Manager
    slots are limited by rarity and locked until the mine is done, and the mode adds a "Blast Perk"
    ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/521-how-do-super-manager-limitations-work-in-tesseract/)).
  - **Reception.** Veterans hated it because it negates collecting. "Restricting what SM you can use,
    completely negates the need to unlock more and better SM"
    ([1mh0a6y](https://www.reddit.com/r/IdleMinerTycoon/comments/1mh0a6y/)).
  - **July 2026 retune.** Barriers got faster and mines were restructured to 15, 20, 30 and 40 shafts. It
    drew "the first mine feels like FM6 now"
    ([1v647zx](https://www.reddit.com/r/IdleMinerTycoon/comments/1v647zx/)).
- **Everdeep (from December 2025).**
  - **Rules.** A month-long, apparently endless run of mines grouped into **biomes**: Early, Core, then
    End biomes with elemental Super Manager restrictions
    ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/534-what-are-biomes/)).
  - **Stars.** A star rating based on clear time lets you **skip** 1 or 2 mines while still banking their
    XP ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/535-how-do-i-skip-mines-and-what-are-stars/)).
  - **March 2026 edition.** Added the Sentinel Spire biome (mines 61 to 80), released all biomes at once,
    and smoothed the difficulty around mines 41 and 61
    ([1rrqgvg](https://www.reddit.com/r/IdleMinerTycoon/comments/1rrqgvg/)).
- **Chrono Mine (from May 2024).**
  - **Rules.** A competitive, barrier-free mine. Each player gets 5 Chrono Tickets of 10 minutes each.
    Score comes in **Clocks**: 1 per upgrade level, 100 × depth per new shaft, and bonuses for unused time
    ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/343-what-are-the-chrono-mine-leaderboards/)).
  - **Leagues.** Bronze, Silver and Gold, then Master 1 to 5, with demotion possible only in the Masters.
    First placement depends on the Super Managers you own. Rewards are paid by rank band
    ([Help Center: Leagues](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/344-what-are-the-chrono-mine-leagues/)).
  - **Changes.** The mine expanded from 50 to 70 shafts in June 2025
    ([wiki](https://idleminertycoon.fandom.com/wiki/Chrono_Mine)), then by 30 more in September 2026
    ([1wde3a3](https://www.reddit.com/r/IdleMinerTycoon/comments/1wde3a3/)). Version 5.64.0 added
    visibility of the top-50 scores ([1wt5a8v](https://www.reddit.com/r/IdleMinerTycoon/comments/1wt5a8v/)).
    The store copy now advertises an "8 League System".
- **Elemental Mode (from about 2023).**
  - **Rules.** Unlocked by Prestige Stars, this is a parallel copy of the continents where each continent
    has an element. Each Super Manager is super, partially or not very effective there, and ranking up
    adds elements. Prestige here pays in Essences, which craft fragments
    ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/216-what-is-elemental-mode/)).
  - **Reception.** "Elemental mode isn't fun ... Being limited to just a few on each continent is
    frustrating" ([15pdmj5](https://www.reddit.com/r/IdleMinerTycoon/comments/15pdmj5/)). Another
    veteran called the elemental mines "copied pasted from main map"
    ([15fckr7](https://www.reddit.com/r/IdleMinerTycoon/comments/15fckr7/)).
- **Impossible Island (2019).**
  - **Rules.** 10 extreme mines gated by **keys** forged on a timer. Unlock costs run from 5 Bronze keys
    (Dark Shores) to 55 Bronze, 35 Silver and 15 Gold (Impossible Gateway). Rewards are medals for
    Legendary Super Managers, plus avatars and decorations
    ([wiki](https://idleminertycoon.fandom.com/wiki/Impossible_Island)).
  - **Reception.** Clearing it is a multi-year badge of honour
    ([14bj75j, "After 1,5 year i am finaly startin impossible gateway"](https://www.reddit.com/r/IdleMinerTycoon/comments/14bj75j/)).
- **Common data shape.** Each mode is a reusable mine template plus a ruleset (allowed modifiers, Super
  Manager slot rules, a separate currency, timers or tickets), a reward track and often a pass.
- **Why it works, and doesn't.** These modes give endgame players problems rather than bigger numbers, and
  each one sells its own pass. The recurring failure: when a mode restricts the roster players spent years
  building, it feels like a confiscation (Tesseract, Elemental). When it lets the roster shine against a
  clean slate, it is loved. Frontier was liked in principle, and Chrono "Grandmaster" is a bragging right.

### 2.10 The offer layer: shop, gacha, wheels, mazes and pop-ups

- **Player-facing intent.** Monetise every surface.
- **Mechanical model.** GameRefinery's analyst inventory lists:
  - No Ads, permanent 2x income and 3x idle income.
  - Limited-time bundles, boosters and Instant Cash.
  - The **Daily Delivery** subscription, which pays Super Cash in daily chunks you must collect.
  - Artifacts, the Battle Pass and research points for Super Cash.
  - **Event Draws** (box gacha) and **Lucky Wheels** (gacha with one discounted pull a day).
  - Collectible chests, crafting materials, gems for Super Managers and barrier skips
    ([GameRefinery](https://app.gamerefinery.com/game/5883b445bc85fa43c6a889c0)).

  The Lucky Wheel has about 12 rewards, posted odds, a 10-spin option and "Spin Bonus" milestones such as
  100 spins that reset per wheel
  ([Help Center](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/101-what-is-the-lucky-wheel/)).
- **Data shape.** Offers are keyed by segment and time. "Maze" events (Poseidon's Maze, the Sue
  treasure trail) are point-priced reward paths with key gates between tracks.
- **Progression and gating.** Tracks are tuned so free players get just short of the top reward. In
  Poseidon's Maze, maxing every daily task yields 6,555 points. The Epic Super Manager track needs at
  least 7,675, and a 1,200-point bundle costs about $25: "the only way to get it is by spending money"
  ([1jl8s21](https://www.reddit.com/r/IdleMinerTycoon/comments/1jl8s21/)). In September 2026, the same
  structure meant "f2p can at most reach the rare one", with the top tier costing $70
  ([1wpctlw](https://www.reddit.com/r/IdleMinerTycoon/comments/1wpctlw/)).
- **Inputs, UI, affordances.** Launch interstitials and a left-hand icon rail.
- **Failure modes.**
  - **The icon rail.** It is the subreddit's longest-running UI complaint, persisting from 2019 to 2026:
    - "Too much side icons" ([bsqqgc, 43 points](https://www.reddit.com/r/IdleMinerTycoon/comments/bsqqgc/)).
    - "I CANT. CLICK. ON. ELEVATOR."
      ([e8j2i7, 35 points](https://www.reddit.com/r/IdleMinerTycoon/comments/e8j2i7/)).
    - "Can't even click my elevator manager because of all the icon spam"
      ([vs3bmq, 39 points](https://www.reddit.com/r/IdleMinerTycoon/comments/vs3bmq/)).
  - **Launch pop-ups.** In 2026, one player "counted 14(!!!) popups"
    ([1uczzkp](https://www.reddit.com/r/IdleMinerTycoon/comments/1uczzkp/)). Another: "every time I open
    this god forsaken app I am bombarded with a thousand pop ups"
    ([1w8v6my](https://www.reddit.com/r/IdleMinerTycoon/comments/1w8v6my/)).
  - **Price inflation inside events.** The Sue event went from 10 tokens for 12K Super Cash to 5 for 45K,
    which is 7.5x per token, during a Black Friday sale
    ([z1wl81](https://www.reddit.com/r/IdleMinerTycoon/comments/z1wl81/)).
- **Why it works commercially.** Revenue has held at about $0.55M a month in gross IAP, a decade in. It
  still costs goodwill with exactly the players who generate that revenue (section 4).

### 2.11 LiveOps pipeline

- **Model.**
  - **Weekly cadence.** One-week sprints with one update a week. That meant 70 or more updates by April
    2018 ([PocketGamer.biz](https://www.pocketgamer.biz/comment-and-opinion/67866/fluffy-fairy-games-regular-updates/)),
    120 by April 2019 and 160 or more by October 2019. The client is now at version 5.65.
  - **Staged rollout.** Every update goes to 1%, then 5%, then 20%, then 100% of players over four days,
    watching store reviews and bug reports at each step
    ([Barker deck](https://www.slideshare.net/slideshow/what-we-learned-idle-miner-tycoon-and-idle-factory-tycoon-kolibri/182846509)).
  - **Feature sequencing.** Big features ship as a minimal version first. The shop, events and social
    features were all added over the first two years
    ([PocketGamer.biz, Stammler](https://www.pocketgamer.biz/feature/70431/how-kolibri-went-from-minimal-viable-product-to-70-million-installs-for-its-idle-games/)).
  - **Community loop.** A community team meets the game teams weekly
    ([GameAnalytics interview](https://www.gameanalytics.com/blog/idle-games-fluffy-fairy-interview)).
    Moderators on Reddit and Discord post patch notes, event calendars and giveaways.
- **Edge cases.** Each event requires a minimum version (for example, Everdeep needs 5.45.0 and the Chrono
  Mine needs 5.64.0). Combined with the staged rollout, this forces Kolibri to move event dates: the
  Chrono Mine moved from 30 September to 2 October 2026
  ([1wt5a8v](https://www.reddit.com/r/IdleMinerTycoon/comments/1wt5a8v/)). Store patch notes have become
  boilerplate ("Backend system updates, Bug fixes"), so the real changelog now lives on Reddit.

## 3. Key innovations

- **The three-station bottleneck chain.** It is the genre-defining template that dozens of "Idle X
  Tycoon" clones copied, Kolibri's own included. Its insight: one constrained throughput variable per
  stage gives an idle game a real decision on every screen.
- **Managers as the automation unlock.** Hiring a character is what makes a station idle. It turns the
  tutorial's lesson ("this is tedious") into the first purchase and the first collectible.
- **Pay or wait, with the ad as the middle option.** Every choke point has three exits: cash or Super
  Cash, an ad, or time
  ([GameAnalytics](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)).
  The best-converting ad is attached to the return reward, not to a currency drip
  ([GameRefinery podcast](https://www.gamerefinery.com/episode-14-ad-monetization-with-kolibri-games/)).
- **No Ads keeps the reward.** Buyers keep every ad-gated bonus and simply skip the video. That makes the
  purchase pure convenience, with no trade-off against progress, and it is the one offer players
  consistently praise.
- **Optional per-mine prestige.** A reset that is local, voluntary and paid in in-game cash only, never
  real money. It avoids the "nuke your whole save" anxiety of global prestige.
- **Rule-variant event modes that test the roster.** Frontier (bring only Super Managers), Chrono
  (10-minute ticketed races with leagues), Everdeep (endless biomes with star skips) and Tesseract
  (limited slots). Each reuses the mine template and gives the collection a purpose.
- **Lean MVP and staged-rollout LiveOps as an operating model.** The game shipped in 8 weeks without IAP,
  social, localisation, ad mediation or cloud save. It found 63 to 81% D1 retention and then added depth
  weekly ([GameAnalytics](https://www.gameanalytics.com/blog/making-a-hit-idle-game-eight-lessons-from-kolibri-games)).

## 4. Player frictions & complaints

Method: I pulled 14,476 r/IdleMinerTycoon posts (January 2017 to October 2026) via Arctic Shift and ranked
them by score. I then read the full bodies and top comments of the highest-scoring complaint and praise
threads. Keyword hits across post text: Super Manager 1,813; event 1,606; bug/crash/glitch 883;
prestige 770; ads 695; UI/icon/screen 493; price/greed/expensive 481; barrier 425. The subreddit is
small, so scores rarely exceed 100.

1. **Monetisation escalation: "greed".** This is the dominant theme in high-scoring complaint posts.
   - **Super Manager pricing.** "Sure...no problem....let's pay the price of a complete game for one
     manager.... This is bonkers"
     ([nzjn3s, 49 points, 40 comments](https://www.reddit.com/r/IdleMinerTycoon/comments/nzjn3s/)). The
     top comment called the €54 Ezio offer "87% more expensive than new Assassins Creed Valhalla". Another
     said: "I'd have been willing to spend a reasonable $5-20 for this SM, but $50? No."
   - **"Anyone else just getting turned off from playing this by the increasing greed?"** "Every time I
     turn around, there's some new $15 or $25 or $50 or even $100 item"
     ([qjgif5, 36 points](https://www.reddit.com/r/IdleMinerTycoon/comments/qjgif5/)).
   - **Self-declared whale strike (2023).** Cited one free spin instead of two, an ad boost cut from about
     2 days to 16 hours, and a nerf to the purchased "sunglasses". "I'm not embarrassed to say I'm a whale
     ... I'm gonna start using my wallet to speak"
     ([15n3moq, 46 points](https://www.reddit.com/r/IdleMinerTycoon/comments/15n3moq/)). A top reply noted
     there was no refund or credit for the nerfed purchase.
   - **"Greed wins again".** About Queen Frost's 90-day rental for about 40K Super Cash or $20 to own
     ([rkk29x, 35 points](https://www.reddit.com/r/IdleMinerTycoon/comments/rkk29x/)).
   - **Satire.** A "Thanks Devs!" meme scored 64 with the comment "We get several hundred percent income
     increase in the tech tree but still somebody thinks we open our wallets for a 0,1% increase"
     ([jpr3tr](https://www.reddit.com/r/IdleMinerTycoon/comments/jpr3tr/)).

2. **The endgame is barriers plus ad-watching ("Advert Miner Tycoon").** The single highest-scoring
   complaint, at 72 points, is a long letter from a paying player
   ([i7ib4v](https://www.reddit.com/r/IdleMinerTycoon/comments/i7ib4v/)). It covers useless collectibles,
   Mainland that becomes "insanely easy" and then nothing but barrier timers, and players setting alarms
   to watch ads hourly. The top comment echoes it: "Whats making 'Idle AdWatcher' even worse is ... most
   ads are broke and just flickering." "Late Game Tedium" adds that the endgame is "designed to just be a
   years long marathon that involves like 10 times more ad time than game time"
   ([hezo8b, comment](https://www.reddit.com/r/IdleMinerTycoon/comments/hezo8b/)). In 2026 the same
   complaint shows up on Google Play as "the game is just playing itself".

3. **Pop-up and offer clutter.** This has run from 2019 to 2026 and is the most persistent UI complaint.
   - "Too much side icons" ([bsqqgc, 43](https://www.reddit.com/r/IdleMinerTycoon/comments/bsqqgc/)).
   - "9 Icons I Sure Hope They Find A New Place"
     ([e6hpvj, 41](https://www.reddit.com/r/IdleMinerTycoon/comments/e6hpvj/)).
   - "Can't even click my elevator manager because of all the icon spam"
     ([vs3bmq, 39](https://www.reddit.com/r/IdleMinerTycoon/comments/vs3bmq/)).
   - "Please stop with all the offers ... I have to click through 5, 7, 9 'offers' before I can start
     playing" ([1eymer6, 22](https://www.reddit.com/r/IdleMinerTycoon/comments/1eymer6/)).
   - Fourteen pop-ups counted on one launch in June 2026
     ([1uczzkp](https://www.reddit.com/r/IdleMinerTycoon/comments/1uczzkp/)).
   - On Google Play in September 2026 (25 found it helpful): "so many pop ups when you first load in ...
     especially for those who paid for no ads."
   - A player who has played for eight years: "I can deal with the 9000 popups ... the 9000 icons on the
     left side that you won't let us dismiss. But when your app starts to affect other programs on my
     phone ... that's my breaking point"
     ([z636xh, 64 points](https://www.reddit.com/r/IdleMinerTycoon/comments/z636xh/)).

4. **Ad UX itself.** Rewarded ads running over a minute with hidden close buttons
   ([gcm5uf, 40](https://www.reddit.com/r/IdleMinerTycoon/comments/gcm5uf/)). Sexualised ad creatives
   ([i2brj2, 32](https://www.reddit.com/r/IdleMinerTycoon/comments/i2brj2/)). Ads that pause music and fake
   close buttons ([g76i7w](https://www.reddit.com/r/IdleMinerTycoon/comments/g76i7w/)). Ads failing to
   load ("videos with reset the game"), from a Play review in September 2026. Players' fix was to pay:
   the No Ads purchase is the most consistently praised spend.

5. **Event modes that confiscate the roster.**
   - Tesseract "completely negates the need to unlock more and better SM"
     ([1mh0a6y](https://www.reddit.com/r/IdleMinerTycoon/comments/1mh0a6y/)). After the July 2026 retune:
     "Mine 1 was a breeze before and now the progress is sluggish and miserable!"
     ([1v647zx](https://www.reddit.com/r/IdleMinerTycoon/comments/1v647zx/)).
   - Elemental mode: "Being limited to just a few on each continent is frustrating, not fun"
     ([15pdmj5, 22](https://www.reddit.com/r/IdleMinerTycoon/comments/15pdmj5/)).
   - Frontier's Spark escalation punishes the players who are already behind
     ([10tk4ns](https://www.reddit.com/r/IdleMinerTycoon/comments/10tk4ns/)). One comment: "The rewards ...
     based on how far you are in the mainland ... new players are being punished even more."

6. **Reward deflation and paid tracks that free players cannot finish.**
   - Event mine rewards shrank ([oee86x, 36](https://www.reddit.com/r/IdleMinerTycoon/comments/oee86x/)).
   - 277 chests produced zero upgrades ([kweyyi](https://www.reddit.com/r/IdleMinerTycoon/comments/kweyyi/)).
   - Poseidon's Maze maths shows a deliberate shortfall that only a $25 bundle covers
     ([1jl8s21](https://www.reddit.com/r/IdleMinerTycoon/comments/1jl8s21/)).
   - "Definitely not going to 70$ for 3k medals ... but I'd definitely pay for 200 if the offer was
     available throughout the whole event"
     ([1wpctlw](https://www.reddit.com/r/IdleMinerTycoon/comments/1wpctlw/)). This shows a willing mid-size
     spender being turned away by a time-limited, high-anchor offer.

7. **UI redesigns that regress usability.** The July 2023 manager panel drew "Horrific design!"
   ([14yrnz4, 54](https://www.reddit.com/r/IdleMinerTycoon/comments/14yrnz4/)) and "Manager screen is
   awful" ([155iw7e, 35](https://www.reddit.com/r/IdleMinerTycoon/comments/155iw7e/)). There was a
   counter-post, "I like the new manager screen. What's the problem?"
   ([153uwtr, 38](https://www.reddit.com/r/IdleMinerTycoon/comments/153uwtr/)).

8. **Content sameness and burnout.** Veterans describe a "saturation point": event mines "are the same ones
   they released last year" and Elemental is "copied pasted from main map"
   ([15fckr7](https://www.reddit.com/r/IdleMinerTycoon/comments/15fckr7/)). A free player's first two
   months: "All mines and gameplay are basically the same other than the visual appearance"
   ([1jt3lx0](https://www.reddit.com/r/IdleMinerTycoon/comments/1jt3lx0/)). Farewell threads attract
   sympathy, for example "It's been fun. Goodbye All!", 29 points and 46 comments
   ([nzuhv5](https://www.reddit.com/r/IdleMinerTycoon/comments/nzuhv5/)).

9. **Bugs and online-event fragility.**
   - "The music/podcast bug is breaking this game"
     ([z636xh, 64](https://www.reddit.com/r/IdleMinerTycoon/comments/z636xh/)).
   - "New Event Really Laggy?" ([sh1330, 37](https://www.reddit.com/r/IdleMinerTycoon/comments/sh1330/)).
   - Chrono Mine unreachable with 13 hours left
     ([1hzk9gx](https://www.reddit.com/r/IdleMinerTycoon/comments/1hzk9gx/)).

**What players praise, for balance.**

- **The free-to-play path is long but real.** "Yes, the game is pay to win, but you don't have to spend
  money to become successful" ([1jt3lx0, 34](https://www.reddit.com/r/IdleMinerTycoon/comments/1jt3lx0/)).
  The two-year follow-up reports reaching the endgame without spending
  ([1sp9y01](https://www.reddit.com/r/IdleMinerTycoon/comments/1sp9y01/)).
- **Milestone joy.** Top non-complaint posts are achievement screenshots: first event mine, Lorenzo
  unlocked, Ruby shaft 30 at level 700, maxed continents.
- **Community-made tools.** Research and Super Manager cheat sheets are among the highest-scoring posts
  ever (for example [et6ma1, 111 points](https://www.reddit.com/r/IdleMinerTycoon/comments/et6ma1/) and
  [t9d808](https://www.reddit.com/r/IdleMinerTycoon/comments/t9d808/)).
- **Coziness.** 10th-anniversary comments describe a "lazy Sunday afternoon cozy game" and logging in
  "just to collect a few resources" and staying
  ([1ukhgxh](https://www.reddit.com/r/IdleMinerTycoon/comments/1ukhgxh/)).
- **Removed features are missed.** Stella's Lucky Elevator is missed enough that "Devs, can we get it
  back, please?" scored 41 ([12rp1um](https://www.reddit.com/r/IdleMinerTycoon/comments/12rp1um/)).

## 5. Lessons for Out of Ruin

1. **Make the henchmen cascade a readable bottleneck chain.** IMT's power is that throughput is the
   minimum of three visible stations, so the next upgrade is always obvious. Out of Ruin's cascade
   (henchmen on level N produce henchmen on level N−1) is a chain too. Show, per region, each level's
   output against what the level below can absorb, and flag the bottleneck station the way IMT's
   elevator visibly fails to reach the bottom shafts. Players should never have to compute where the
   chain is starved.

2. **Keep offline income weaker than active, and put the best reward at the return.** IMT pays idle cash
   at about 10% of active and offers a doubling at re-entry. Kolibri calls that doubling "by far the best
   performing" monetised moment. Out of Ruin's follower offline income should land in a "while you were
   away" moment with an optional multiplier. Because Out of Ruin sells gold via Stripe, not ads, the
   equivalent is a permanent "2x Offline" or "Collect x2 forever" purchase. IMT sells both 2x Income
   Forever and 2x Idle Cash Forever as one-off permanent buys, and players accept them as fair.

3. **Sell convenience that keeps the reward, never a nerf you can buy back.** The No Ads offer (keep the
   bonus, skip the wait) is the one purchase IMT players thank Kolibri for. Nerfing purchased items
   (the "sunglasses"), cutting free spins and shortening boosts triggered a whale strike. Out of Ruin's
   gold packs, card packs and time warps should never be retroactively devalued.

4. **Give heroes and henchmen IMT's Super Manager depth, with free paths to the top tier.** Super
   Managers work because they break the chain's rules: Lorenzo pipes shaft output straight to the
   warehouse, and Vincent's head multiplies per open shaft. Out of Ruin's four heroes, whose powers fire
   automatically, and its 15 designed henchmen should each bend the cascade in a distinct way, beyond
   "+x% damage". The anger in IMT comes from paid-only top tiers and an epic sold for $20 that beat
   legendaries earned over a year. Every hero and gear card in Out of Ruin should be earnable through
   play, with gold only accelerating it.

5. **Sequence live events as rule variants that showcase the roster.** IMT's best-received modes give the
   player's collection a fresh, clean-slate stage: Event Mines, Frontier, Chrono's ten-minute races. Its
   worst-received modes take the collection away: Tesseract slot caps, Elemental restrictions, Spark
   escalation. When Out of Ruin adds events, a "bring your heroes and henchmen into a fresh 5-level
   dungeon for a weekend" format maps directly onto its regions. A short timed score-attack like Chrono,
   with starter leagues where you cannot be demoted, would suit casual players. Avoid mechanics whose
   cost rises the more a player struggles.

6. **Per-region currencies and research trees refresh the sense of scale, but each region must matter.** IMT's
   eight continents each have their own cash and research tree, which resets the sense of scale. When a
   continent feeds nothing ("What does desert do?"), players notice. Each of Out of Ruin's five regions
   should feed something the other regions need: chapter quest items, hero upgrades or henchman unlocks.

7. **Protect the play surface from offers.** IMT's icon rail and launch pop-up cascade (14 on one launch
   in 2026) is a seven-year complaint that even paying players make. In Out of Ruin's portrait web layout,
   keep the dungeon column inviolable. Offers belong in one shop entry point and at most one interstitial
   per session, and a purchase of any kind should suppress promotional pop-ups.

8. **Optional, local prestige beats forced global resets.** IMT's per-mine prestige (voluntary, paid only
   in that mine's cash, keeping all characters) let players re-climb without losing their identity. If
   Out of Ruin adds prestige to regions or chapters, make it per region, keep henchmen, heroes and cards,
   and never sell the reset itself.

9. **Make availability windows generous for mid-size spenders.** The "I'd pay for 200 if it were available
   all event" post shows IMT losing willing $5 to $20 spenders to high-anchor, short-window offers. Out of
   Ruin's Stripe gold ladder ($4.99 to $79.99) should keep its entry tiers always available, with
   event-only bundles layered on top.

10. **Treat accounts and cloud saves as a precondition for LiveOps.** IMT's cross-device saves,
    leaderboards, Expeditions with friends and event calendars all assume a server identity. Out of Ruin
    keeps saves in the browser today, so a Chrono-style league or a shared event needs accounts first.
    IMT also shows the downstream benefit: a server-side event schedule plus a public monthly calendar
    (posted on Reddit since January 2026) lets players plan their sessions.
