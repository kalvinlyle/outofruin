# AFK Arena — Idle Hero-Collection Gacha RPG Teardown

Research date: 2026-10-25. Store pages, patch notes and wiki pages were read on that date and may already be stale.
Revenue, download and active-user figures are third-party model estimates and are tagged **[non-audited]**.
Reddit evidence comes from the full r/afkarena post archive (posts and top comments) pulled through the Arctic Shift API; scores are the archived upvote counts at collection time.

## 1. Snapshot

**Studio and ownership.**
AFK Arena is developed and self-published by Lilith Games (Shanghai Lilith Network Technology).
Three former classmates who had worked at Tencent's Aurora Studios founded the company in Shanghai in May 2013, with IDG Capital leading a RMB 2 million angel round and Prometheus Capital a 2016 Series A ([TechNode, 2019](https://technode.com/2019/11/27/the-chinese-gaming-startup-outperforming-tencent-overseas/)).
It is privately held; no source I found describes the current cap table.
The Google Play seller of record is "Lilith Network HK Limited" in Hong Kong ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).
The sequel, AFK Journey (March 2024), is published under Lilith's Farlight Games label: Google Play's "Similar games" rail on the AFK Arena page lists it under "FARLIGHT" ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)), and the Sensor Tower app catalogue in the Supercell data warehouse does the same.
Lilith's stated posture is global-first: its branding officer told Cocos "Our strategy is simply globalization," and founder Wang Xinwen said "we don't want to be China's Supercell, we want to be Lilith of the world" ([Cocos, March 2020](https://www.cocos.com/en/post/73239bf646d4cce9d88b388edddb35ef)).

**Engine and technical posture.**
Built on Cocos2d-x, per the engine vendor's own case study ([Cocos](https://www.cocos.com/en/post/73239bf646d4cce9d88b388edddb35ef)) and [Wikipedia](https://en.wikipedia.org/wiki/AFK_Arena).
It is a native 2D client: [GameRefinery's analyst review](https://app.gamerefinery.com/game/5c3859d99890a268297530e7) describes 2D sprites that are "deformed versions of the character portraits," with portraits singled out for their "fantasy storybook style."
Since 23 October 2024 the single app ships two separate games, **Classic** (the 2019 game) and **Companions** (a streamlined, co-op-led rebuild that is now the default for new downloads); progress is separate, with minor cross-version boosts ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
Players still report performance problems: the top "most relevant" Google Play review on 25 October 2026 (September 2026) says "they DESPERATELY need to fix the lag" across "several high-end devices" ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).

**Release and status.**
The release year is genuinely two dates, and both are correct for different things:

- **Soft launch, 2018.** Sensor Tower records the Google Play app (com.lilithgame.hgame.gp) as released on 21 June 2018, with first revenue in June 2018 (Sensor Tower via Supercell data warehouse, non-audited).
  [Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/afk-arena-analysis) (AppMagic data) dates the soft launch June 2018 to March 2019 in Russia (18% of soft-launch downloads), Brazil, Vietnam, the Philippines and Indonesia, for about 1.4M downloads and $2.6M **[non-audited]**.
- **Global launch, 9 April 2019** on iOS and Android. Sensor Tower's iOS release timestamp is 2019-04-09 and [GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7) records the same global launch date; [Common Sense Media](https://www.commonsensemedia.org/app-reviews/afk-arena) lists 10 April 2019 (time-zone difference).
- **Mainland China, January 2020**, as 剑与远征 after licence approval in September 2019 ([TechNode](https://technode.com/2019/11/27/the-chinese-gaming-startup-outperforming-tencent-overseas/)); [PocketGamer.biz](https://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/) says China made up 81% of player spending in that launch month.
- [Naavik](https://naavik.co/digest/rise-fall-lilith-games/) says AFK Arena "launched globally" in 2018. That conflates the soft launch with the global release; I trust the store timestamps and the 2019 date.

The game is live and updating roughly every two to three weeks.
The App Store shows 1.201.01 (31 August 2026), 1.202.01 (11 September), 1.203.01 (28 September, adding Classic Campaign Chapter 85, a King's Tower expansion and two collab Dimensional heroes for Companions), 1.204.01 (10 October) and 1.205.01 (about 22 October) ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432)).
The seventh-anniversary build 1.191.01 (8 April 2026) added the Draconis hero Serennia to Classic, a Lightbearer hero Palmer to Companions, and a "Shepherd of Stars event with fishing, lamb care, etc." ([APKMirror](https://www.apkmirror.com/apk/lilithgames/afk-arena/afk-arena-1-191-01-release/); [PocketGamer.biz](https://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/) calls the mode "Otherworld Fishing").
The current Google Play "What's new" (updated 20 October 2026) lists a Companions Hypogean hero, Leofric, "via Stargazer," and a Classic Graveborn hero, Theowyn ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).

**Platforms.**
iOS and Android, plus Windows through Google Play Games, which the Play listing shows as "Available on Android, Windows" ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).
There is no Steam build: the Steam store search API returned zero results for "AFK Arena" on 25 October 2026. [PocketGamer.biz](https://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/) mentions "the Steam version" being excluded from its estimate; I could not find one, so that line is likely an error.
Separate store SKUs exist for China (剑与远征), Japan, Korea, Taiwan and Vietnam (Sensor Tower app catalogue).
No web build.

**Distribution.**
App Store and Google Play worldwide, plus Chinese Android stores (not covered by Sensor Tower).
User acquisition was heavy and creative-led: Udonis reports soft-launch creatives were about 40% video and 60% banner, and that "many top-performing early creatives didn't show real gameplay" ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/afk-arena-analysis)).
Collab marketing is a second channel; [GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7) lists collaborations with Samurai Shodown, Assassin's Creed, Markiplier, Overlord, Persona 5, Prince of Persia, The Witcher, Re:Zero, That Time I Got Reincarnated as a Slime, Solo Leveling, Delicious in Dungeon and One Punch Man.

**Pricing and monetisation model.**
Free-to-play gacha.
US App Store in-app purchases run from $0.99 to $99.99, with a monthly subscription at $2.99 ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432)).
The store copy lists a weekly subscription at $0.99 and a monthly one at $2.99; the perks are small multipliers such as "+10%" AFK gold, +1 mercenary use in towers and campaign, and +10% guild coin and labyrinth token drops ([store description via GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
The full stack, per [GameRefinery's monetisation teardown](https://app.gamerefinery.com/game/5c3859d99890a268297530e7):

- Eight gachas in Classic: Noble Tavern (heroes), Stargazing Room (chosen celestial or hypogean hero plus items), Temple of Time (awakened heroes), Natural Habitat and Wishing Shrine (beasts), Oak Inn Workshop (furniture), and two Dragon Pagoda gachas for the Draconis faction.
- A monthly card and an auto-renewing subscription.
- At least four standing battle passes (Regal Rewards, Champions of Esperia, Twisted Bounties, Righteous Riches for returning players) plus event passes.
- A 15-rank VIP system raised both by purchases and by clearing the campaign.
- Level-up and map-clear limited offers, customisable bundles, daily, bi-weekly and monthly offer pools, and skins.

Companions drops VIP and runs a single seasonal battle pass ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
Google Play's rating panel flags "In-Game Purchases (Includes Random Items)" ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).

**Audience scale.**
Sensor Tower worldwide estimates, all AFK Arena SKUs (global, China iOS, Japan, Korea, Taiwan, Vietnam, Indonesia), App Store plus Google Play, excluding Chinese Android stores (Sensor Tower via Supercell data warehouse, non-audited):

| Year | Revenue (USD) | Downloads | Note |
|---|---|---|---|
| 2018 | $0.3M | 0.13M | Android soft launch, from June |
| 2019 | $135.6M | 15.8M | Global launch in April |
| 2020 | $502.7M | 19.0M | China launch in January; peak year |
| 2021 | $185.7M | 6.1M | |
| 2022 | $116.4M | 3.4M | |
| 2023 | $73.7M | 2.0M | |
| 2024 | $36.8M | 2.1M | Companions added in October |
| 2025 | $23.9M | 0.9M | |
| 2026 (Jan to Oct, Oct partial) | $12.9M | 0.6M | About $1.1M to $1.7M per full month |
| **Lifetime** | **about $1.09B** | **about 50M** | |

- **Peak month:** January 2020 at $73.4M and 4.0M downloads in Sensor Tower **[non-audited]**. AppMagic puts the same month at $105.4M ([PocketGamer.biz](https://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/)) and Udonis, also on AppMagic, at about $80M ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/afk-arena-analysis)) **[non-audited]**.
- **Monthly active users:** Sensor Tower usage estimates, summed across SKUs, peak at about 7.3M in October 2020, fall to about 0.87M in January 2024 and sit near 0.28M in October 2026, a fall of about 96% from peak **[non-audited]**.
- **Biggest SKU:** the China iOS app (剑与远征) is the largest single SKU by lifetime revenue, at about $318M of the $1.09B **[non-audited]**.
- **Lifetime revenue conflict.** AppMagic says "$1.5 billion in lifetime player spending" by April 2026 ([PocketGamer.biz](https://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/)), Udonis says "almost $1 billion" ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/afk-arena-analysis)), and Sensor Tower says about $1.09B.
  The annual shape is consistent across Sensor Tower and data.ai: data.ai has $147M in 2019, $453M in 2020 and $77.3M in 2023 ([Naavik](https://naavik.co/digest/rise-fall-lilith-games/)), within about 10% of Sensor Tower each year.
  I trust that two-vendor agreement on the shape and the roughly $1.1B order of magnitude for App Store plus Google Play. AppMagic's $1.5B looks like a different China model, and an AppMagic-based outlet (Udonis) gives a much lower number from the same vendor. Treat $1.5B as an upper bound. All are **[non-audited]**.
- **Regional split (AppMagic, lifetime):** China 32%, US 24%, South Korea 11%, Japan 10% ([PocketGamer.biz](https://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/)) **[non-audited]**.
- **Downloads, company claim:** Lilith claimed "over 45 million" downloads in July 2020 ([Lilith press release via Gamespress](https://www.gamespress.com/NAKORURU-from-SNKs-weapon-based-fighter-SAMURAI-SHODOWN-joins-Lilith-G)). That is higher than Sensor Tower's count, which only reaches about 35M by the end of 2020, plausibly because Lilith's figure includes Chinese Android stores. It is a marketing claim **[non-audited]**.
- **Players, early claim:** 6.6M players by June 2019, citing Pocket Gamer ([Wikipedia](https://en.wikipedia.org/wiki/AFK_Arena)) **[non-audited]**.

**Review sentiment.**

- **App Store (US):** 4.7 from 498K ratings ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432)).
- **Google Play (US):** 4.5 from 3.69M reviews, "10M+" downloads badge, rated Everyone 10+ ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).
- **The headline stars hide a split.** The three "most relevant" Play reviews on the fetch date were a 2026 lag complaint; a May 2026 review calling Classic "very pay to win, if you want to be top ranked expect to pay huge amounts of money" (21 found helpful); and a June 2026 review calling it "Basically legal gambling" that says "you can't possibly ascend your heroes unless you pay for it" (17 helpful).
- **Older App Store reviews are warmer.** A 2020 review headline is "Very F2P-friendly, but waiting mechanics may try your patience" ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432)).
- **GameRefinery's motivation profile (US)** scores "collecting treasure" at 4.35 against an idle-RPG average of 3.63, "strategic planning" at 3.89 (the top of the subgenre) and "role playing and emotions" at only 1.59 against 1.96. The lead archetypes are Treasure Hunter (0.22) and King of the Hill (0.19) ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
- **Reddit is the opposite of the store stars.** Since 2024, setting aside guides and memes, the highest-scoring threads are departure posts and protests (section 4).

**Critical reception.**

- **Pocket Gamer: 4/5** (Catherine Ng Dellosa, June 2022). It praises art that recalls "Disney-esque TV shows, which is a refreshing change of pace from all the anime-themed art out there." It concludes "Come for the AFK factor; stay for the engaging RPG elements that make it an absolute joy to play" ([Pocket Gamer](https://ee.pocketgamer.com/articles/084103/afk-arena-review-away-from-keyboard-but-here-for-fun/)).
- **Common Sense Media, 13+:** "Fun bite-size fantasy adventure almost plays itself." It says "players can make a fair amount of progress without having to spend money" but notes the game "does encourage players to purchase extra in-game currency, items, and even monthly subscriptions" ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/afk-arena)).
- **Deconstructor of Fun (Michail Katkoff, June 2019)** called it "the new King of RPGs." It counted only "48 heros" at launch ("the lower end for hero content") and called the 25% same-faction bonus "pretty meagre." It credited the hit to merchandising: "Don't underestimate the impact that strong merchandising can have on your product" ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)).
- **Awards:** nominated for Google Play's Best of 2019 Users' Choice Best Game; Call of Duty: Mobile won ([Lilith press release via Gamespress](https://www.gamespress.com/NAKORURU-from-SNKs-weapon-based-fighter-SAMURAI-SHODOWN-joins-Lilith-G)).
- **No Metacritic aggregate** exists for the mobile release.

**One-line player promise (store-capsule copy).**
App Store subtitle: **"The Best RPG for Busy You."** ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432)).
Google Play short description: **"Your idle RPG adventure begins with 1,000 summons."** ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).
The 2026 store body now sells Companions, not Classic. It promises "1,000 Free Summons," "Unlock All Heroes: Clear stages to unlock every hero in the game," "Shared Hero Pool: Borrow powerful heroes from your friends," and "Auto-battle your way to victory and earn rewards even while offline."
The pitch has moved from "busy-person RPG" to "the gacha is basically free now." That reads as a public admission that Classic's gacha pressure had become the barrier to new players.

**Strategic read for Out of Ruin.**
AFK Arena is the fantasy ceiling of the idle RPG.
It has about 250 illustrated heroes in a storybook art style, AFK loot that grows with campaign progress, a 4.61% merge-gacha, and a $500M year in 2020 **[non-audited]**.
It is also the clearest cautionary curve in the genre: Sensor Tower revenue fell about 95% from 2020 to 2025 and MAU about 96% from peak **[non-audited]**.
The community diagnosis (section 4) is not "the idle loop got stale." It is roster inflation, power creep and new gacha layers stacked on old ones.
Out of Ruin should borrow AFK Arena's presentation ambition and its "AFK time as currency" economy. It should deliberately decline the duplicate-merge treadmill and the layered gacha.
AFK Arena's own 2024 answer, Companions, does exactly that: "unlock all heroes by clearing stages."

## 2. Core system designs

### 2.1 Campaign and auto-battle

- **Player-facing intent:** a story-framed march across Esperia in which every stage cleared makes the AFK chest richer. The player is a squad builder, not an action player.
- **Mechanical model:** five heroes in a preset formation fight automatically; ultimates fire on their own or by manual tap ([Wikipedia](https://en.wikipedia.org/wiki/AFK_Arena); [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)).
  Faction advantage runs in a loop (Lightbearer beats Mauler beats Wilder beats Graveborn beats Lightbearer). Celestials and Hypogeans counter each other, Dimensionals are neutral, and Draconis is the 2024 eighth faction ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7); [Wikipedia](https://en.wikipedia.org/wiki/AFK_Arena)).
- **Data shape:** stages are addressed as chapter-stage (for example 4-36), and chapters have grown from the launch set to Chapter 85 in Classic as of 1.203.01, September 2026 ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432)).
  Features unlock by stage: the Noble Tavern at 1-12, the Resonating Crystal at 4-36 and the Elder Tree at 8-40 ([fandom wiki](https://afk-arena.fandom.com/wiki/The_Noble_Tavern); [afk.global](https://www.afk.global/beginners-guide)).
  The Stargazing Room opens at Chapter 15 *or* VIP 13, so money can buy early access to a gacha ([fandom wiki](https://afk-arena.fandom.com/wiki/Stargazing_Room)).
- **Progression and gating:** there is no energy system on the campaign ([Alexandre Macmillan, 2019](https://alexandremacmillan.com/2019/06/13/idle-mechanics-and-monetizing-progession-in-afk-arena/)). The gate is team power against a difficulty curve that "really starts to spike out of nowhere," in a 2019 App Store review's words ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432)).
  Campaign quests pay hero EXP for collection milestones up to "Acquire 500 Heroes" (counting duplicates). Player levels pay diamonds plus VIP EXP, so simply playing raises VIP ([fandom wiki, Campaign](https://afk-arena.fandom.com/wiki/Campaign)).
- **Inputs, UI, affordances:** a battle button, an auto toggle, 2x speed (VIP 2) and 4x speed (VIP 9) ([afk.global](https://www.afk.global/beginners-guide)). The campaign tab is the home screen and also hosts the AFK chest, Fast Rewards, mail, merchants and events.
- **Failure modes and edge cases:** walls. When the next stage is out of reach, the only lever is waiting for AFK income or spending to ascend.
  A 2024 post asks for "a 50-100% increase" in AFK rewards and calls King's Tower rewards past stage 1,400 "basically no diamonds" ([r/afkarena, score 260](https://www.reddit.com/r/afkarena/comments/1c3218y/)).
  Players also report that dust income "stops increasing after chapter 29," a cap set when that chapter was late game ([r/afkarena, score 131](https://www.reddit.com/r/afkarena/comments/1cu3r2p/)).
- **Why it works:** auto-battle plus manual ultimates gives a five-second decision layer that fits a bus ride. The campaign is the single number that both shows mastery and raises passive income. Every clear changes what the chest pays.

### 2.2 AFK rewards chest and Fast Rewards (idle loot tied to campaign)

- **Player-facing intent:** "earn rewards even while offline" ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)), so returning always feels like loot day.
- **Mechanical model:** a chest at the bottom of the campaign screen accumulates gold, hero's essence (dust), hero EXP and player EXP, at an amount "determined by the players' progress in the Campaign and their VIP Rank" ([fandom wiki](https://afk-arena.fandom.com/wiki/AFK_rewards_chest)).
  It also rolls item drops whose *tier* is unlocked by campaign position: Legendary gear from 8-9, Legendary+ from 11-18, Mythic gear from 16-11, Mythic+ upgrade stones from 21-1, and emblems from 17-1, 18-1 and 19-1 ([fandom wiki](https://afk-arena.fandom.com/wiki/AFK_rewards_chest)).
  In Classic the chest "stop[s] filling after 12 hours" and guides advise collecting "at least twice a day" ([afk.global](https://www.afk.global/beginners-guide)).
- **Data shape:** the chest's art changes at 10, 60, 360 and 600 minutes ([fandom wiki](https://afk-arena.fandom.com/wiki/AFK_rewards_chest)).
  "Hours of AFK" is the game's universal unit of value: Stargazer prizes include a "Large Crate of Gold x2 (24 hours of AFK each)" and a "Small Pile of Gold x5 (6 hours of AFK each)" ([fandom wiki, Stargazing Room](https://afk-arena.fandom.com/wiki/Stargazing_Room)). Because every crate scales with the player's own stage, it never goes stale.
- **Progression and gating:** VIP multiplies AFK gold and hero EXP from +5% at VIP 1 to +50% at VIP 6, +100% at VIP 10 and +170% at VIP 14 ([afk.guide VIP ranks](https://afk.guide/afk-arena-vip-ranks/)).
  VIP EXP comes both from purchases and from player level, with a free path reaching VIP 10 at player level 200. The guide prices VIP 10 at about $465 and VIP 15 at about $7,800 of purchases ([afk.guide](https://afk.guide/afk-arena-vip-ranks/)). The subscription adds +10% AFK gold.
- **Inputs, UI, affordances:** one tap to collect. **Fast Rewards** grant "120 minutes worth of AFK rewards" instantly ([fandom wiki](https://afk-arena.fandom.com/wiki/Fast_Rewards)). The first is free daily, the second costs 50 diamonds, and a third costs 80 diamonds from VIP 3 ([afk.global](https://www.afk.global/beginners-guide)).
  Sources conflict on the cap. afk.global (dated October 2026) calls three "the daily limit at every VIP level," while afk.guide's undated VIP table lists up to 12 a day at VIP 15 ([afk.guide](https://afk.guide/afk-arena-vip-ranks/)). I trust the dated source, which suggests the cap was flattened at some point.
- **Companions variant:** the chest generates a discrete chest "every 10 hours and max three can be held at once." Each chest has "4 chances to upgrade to better rewards as you are unlocking it," which turns collection into a small slot-machine reveal ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
- **Failure modes and edge cases:**
  - The 12-hour cap punishes players who check in once a day.
  - Paid VIP multipliers make the "free" idle income visibly smaller for non-payers. A 2019 analysis argues that AFK Arena's real paywall is time: "progression is constrained by time passed" and "there are moments when there is nothing else to do but wait" ([Alexandre Macmillan](https://alexandremacmillan.com/2019/06/13/idle-mechanics-and-monetizing-progession-in-afk-arena/)).
  - Once the campaign stalls, so does income, which compounds walls.
- **Why it works:** the loop ties the two halves of the fantasy together. You push the campaign *so that* your sleep pays more, and the chest's growing art makes absence feel productive. It is the cleanest "AFK loot tied to campaign progress" model in the genre, and Out of Ruin's cleared-level loot plus offline followers is a lighter cousin of it.

### 2.3 Hero roster, factions and ascension (the collection engine)

- **Player-facing intent:** collect and "max" a cast of illustrated heroes, each with lore in a character menu ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
- **Mechanical model:** heroes come in three *tiers* that set their level cap: Common (level 100), Legendary (160) and Ascended (240+) ([fandom ascension guide](https://afk-arena.fandom.com/wiki/AFK_ARENA_ascension_guide)).
  They climb *rarities* by sacrificing duplicates and same-faction fodder: Rare → Rare+ → Elite → Elite+ → Legendary → Legendary+ → Mythic → Mythic+ → Ascended → Ascended 1 to 5 stars ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
  Taking an Ascended-tier hero from Elite to Ascended takes **8 Elite copies** of that hero plus fodder equivalent to **180 Rare** heroes. Five stars on top takes 10 more copies, **18 copies in total** ([fandom ascension guide](https://afk-arena.fandom.com/wiki/AFK_ARENA_ascension_guide)).
  Sacrificed heroes refund their EXP, gold, essence and gear ([fandom, Temple of Ascension](https://afk-arena.fandom.com/wiki/Temple_of_Ascension)).
- **Data shape:** per hero: faction, class (warrior, tank, ranger, mage, support), attribute type (strength, intelligence, agility, which gates gear), role tags, level, rarity, four gear slots (each 0 to 5 stars and T1 to T4 for Mythic), a Signature Item (level 30, or 40 for celestials, hypogeans and dimensionals), Furniture (3/9 and 9/9 set bonuses), Engravings, an Artifact, Union membership and Collections ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
  The community wiki lists about 252 hero pages, including 26 "Awakened" alternate versions of existing heroes, 14 Legendary-tier fodder heroes, 10 Commons and 227 that can reach Ascended ([fandom Category:Heroes, MediaWiki API count on 2026-10-25](https://afk-arena.fandom.com/wiki/Category:Heroes)).
  That is a community count, not an official one. Lilith's January 2026 popularity vote offered "81 heroes total," an event shortlist rather than the roster ([AFK Arena on X](https://x.com/AFK_Arena/status/2012827313612943632)).
  Launch had 48 heroes ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)), so the roster has grown about fivefold.
- **Progression and gating:** the **Resonating Crystal** (from 4-36) puts the five highest-level heroes on a pentagram, and any hero in a crystal slot is raised to the level of the lowest of those five ([fandom wiki](https://afk-arena.fandom.com/wiki/Resonating_Crystal)).
  Past level 240 the crystal itself levels, and each Ascended hero adds five levels to its cap ([fandom ascension guide](https://afk-arena.fandom.com/wiki/AFK_ARENA_ascension_guide)).
  You level five heroes, not 250; the gate becomes copies rather than EXP.
  The ascension gate "will constitute a critical moment in the monetization lifecycle of the player" ([Alexandre Macmillan](https://alexandremacmillan.com/2019/06/13/idle-mechanics-and-monetizing-progession-in-afk-arena/)).
- **Inputs, UI, affordances:** hero grid with faction filters; a Temple of Ascension merge screen where "the first chosen hero will always be the hero that will be ascended" ([fandom](https://afk-arena.fandom.com/wiki/Temple_of_Ascension)); an auto-retire switch that sends new Commons straight to the Rickety Cart for dust and coins ([fandom ascension guide](https://afk-arena.fandom.com/wiki/AFK_ARENA_ascension_guide)).
- **Failure modes and edge cases:**
  - Fodder starvation: "Ascending multiple heroes of the same faction can easily put you in scarcity of fodder heroes" ([fandom ascension guide](https://afk-arena.fandom.com/wiki/AFK_ARENA_ascension_guide)).
  - Power creep: each new hero, Awakened variant and faction layer devalues finished heroes. A long-time Mauler player writes, "I worked so hard to max most of the Maulers just for them to add new ascended versions of base heroes that were, broken" ([comment, score 24](https://www.reddit.com/r/afkarena/comments/1j6nhd9/)).
  - Per-hero vertical systems (signature items, furniture, engravings, collections) multiply the copies and materials each hero needs. By 2024 the roster is 250 heroes deep, and each of them is ten systems tall.
- **Why it works (and where it broke):** merging makes almost every pull useful: duplicates, faction-mates and Commons all feed something. The crystal removes the dullest grind. The trouble is the vertical stack, not the collection itself: the 2026 Companions store copy reacts by promising "Clear stages to unlock every hero in the game" ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).

### 2.4 Summoning: the gacha stack and its pity rules

- **Player-facing intent:** the chase for a named hero, softened by protections that make bad luck bounded.
- **Mechanical model, Noble Tavern:**
  - **Cost:** 300 diamonds for one pull, 2,700 for ten (a 10% bulk discount).
  - **Rates:** Common 51.69%, Rare 43.70%, Elite 4.61% on Basic, Faction and Wishlist summons. Companion Summon, using free friendship points, gives 2.41% Elite ([afk.guide](https://afk.guide/?p=558)).
  - **Rate comparison:** the 4.61% top-rarity rate is high next to "solid token" gachas at 0.6% to 1.3%, because AFK Arena's top rarity still needs merging ([Naavik](https://naavik.co/digest/rise-fall-lilith-games/)).
- **Wishlist:** up to five Elite heroes per faction ([afk.guide](https://afk.guide/?p=558)). The FAQ says it "does not increase the total probability of Elite heroes being summoned," only which Elite appears, and "wishlist heroes are not 100% guaranteed" ([fandom, Noble Tavern](https://afk-arena.fandom.com/wiki/The_Noble_Tavern)).
  The Korean client's legally required rate table shows how that reconciles. With a full 20-hero wishlist, each wishlist hero is 0.2205% (4.41% total) and each Celestial or Hypogean is 0.02% (0.2% total), which sums to the 4.61% Elite rate. Every Elite pull is therefore a wishlist hero unless it is a rare Celestial or Hypogean ([r/afkarena, score 505](https://www.reddit.com/r/afkarena/comments/ha6smh/)).
- **Pity (closing the first pass's gap):** the Tavern guarantees one Elite on the 30th summon if the previous 29 had none, for diamond, common-scroll and faction-scroll pulls but not Companion Summon ([afk.guide, 100 tips, tip 25](https://afk.guide/?p=2592)).
  A guide reposted on Lilith's official forum states "The pity timer is 30 pulls as usual." It adds that with the Hero Choice Pack, "each elite you pull guarantees that you get whichever Desired Hero you chose," resetting every 30 days ([Lilith official forum](https://forum-global-share.lilithgame.com/afk/post/355046/?lang=en-US)).
  Community guides describe the 30-pull rule as an unwritten one, and I found no in-game rate-disclosure screenshot or patch note stating it. It is community-verified behaviour rather than a published guarantee.
- **Stargazing Room:**
  - **Cost:** 500 diamonds or one Stargazer Card per pull.
  - **Odds:** 2% for the selected celestial or hypogean hero, 0.01% for 30,000 diamonds, plus filler such as artifact fragments and AFK-hour crates ([fandom wiki](https://afk-arena.fandom.com/wiki/Stargazing_Room)).
  - **2024 rate change:** the selected-hero rate became 2.5%. A player pool that logged about 9,500 cards found "almost dead on 2.5% rates" and "40 cards per copy," which works out to roughly 640 cards for an Ascended celestial or hypogean ([r/afkarena, score 109](https://www.reddit.com/r/afkarena/comments/1diyjb0/)).
  - **Stargazer pity is real but undisclosed.** One guide gives a cap of 65 single pulls or 70 ten-pull cards without a copy of the selected hero ([Theria Games](https://theriagames.com/guide/afk-arena-stargazing-room-guide/)), while [afk.global](https://www.afk.global/beginners-guide) says no pity is known.
    The best evidence is crowd-sourced. A 2023 analysis of 45,110 ten-pull and 8,765 single stargazes, plus 58,281 Temple of Time pulls, concluded that each gacha has one pity timer and that ten-pulls lose no pity progress ([r/afkarena, score 398](https://www.reddit.com/r/afkarena/comments/11o11ct/)).
    A commenter's log of five copies landed at pulls 65, 63, 61, 64 and 65, and a 2022 player's eleven Temple of Time copies mostly landed at 60 to 65 cards ([score 278](https://www.reddit.com/r/afkarena/comments/yxzau4/)).
    I treat a hidden pity of about 65 pulls as established by player data, but never published by Lilith.
- **Newer layers:** Temple of Time for Awakened heroes; Dragon Pagoda for Draconis, at 500 diamonds a pull with a five-slot wishlist; a beast gacha where "you can choose any standard rarity pet after enough pulls"; and a furniture gacha ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7); [r/afkarena](https://www.reddit.com/r/afkarena/comments/1id2wu0/)).
- **Inputs, UI, affordances:** one summon building, Dolly's Noble Tavern in the Ranhorn hub, with sub-rooms. None of the wiki or guide descriptions mention an on-screen pity counter, which is why the pity rules live in guides and crowd-sourced spreadsheets.
- **Failure modes and edge cases:** layered gachas with different currencies, rates and protections. A whale logged 959 Draconis pulls (about 480K diamonds) for six copies of the hero he wanted ([r/afkarena, score 447](https://www.reddit.com/r/afkarena/comments/1id2wu0/)). A $38,000 spender quit over the Collections gacha's "heavy rng with no ACTUAL pity system" ([r/afkarena, score 518](https://www.reddit.com/r/afkarena/comments/1amjx3o/)).
- **Why it works (or doesn't):** the original Tavern is generous by gacha standards: 4.61%, a 30-pull floor, a wishlist and merge use for every result. That is why early reviews call the game "F2P-friendly." What broke trust was the later premium layers, which kept the merge-copy requirement but dropped the protections.

### 2.5 Monetisation layer around the loop

- **Player-facing intent:** many small, "value" purchases that accelerate a loop that is technically free.
- **Mechanical model:** VIP is the spine, because it multiplies the idle chest (section 2.2) and unlocks convenience: 2x and 4x speed, extra Fast Rewards, hero slots, bounty quests and arena tickets ([afk.guide](https://afk.guide/afk-arena-vip-ranks/)).
  Around it sit:
  - **Advancement Rewards:** a $19.99 one-off that pays out "45000 gems" by region 19 ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)).
  - **Regal Rewards:** a seven-week, battle-pass-style track with a $24.99 premium tier ([Alexandre Macmillan](https://alexandremacmillan.com/2019/06/13/idle-mechanics-and-monetizing-progession-in-afk-arena/)).
  - Mode-specific passes, a monthly card and subscriptions, plus offers triggered "when clearing a map or reaching a certain player level" ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
- **Progression and gating:** every pass is tied to a mode (labyrinth, twisted realm, daily quests). The more modes a player has unlocked, the more passes compete for the same wallet.
- **Failure modes and edge cases:**
  - Store sprawl. A lapsed 2020 spender returning in 2026: "Everywhere I look seems to be another subscription or pack that needs to be unlocked" ([r/afkarena, score 41](https://www.reddit.com/r/afkarena/comments/1qrv030/)).
  - The 2025 "Mass player abandonment" post lists "Ridiculously expensive cash shop – The game's premium currency is absurdly expensive" ([r/afkarena, score 429](https://www.reddit.com/r/afkarena/comments/1j6nhd9/)).
- **Why it works (or doesn't):** AFK Arena's early monetisation sold *time* (VIP multipliers, Fast Rewards, Advancement gems), which feels fair in an idle game. The later layers sold *odds* on ever-scarcer heroes, which does not.

### 2.6 Modes, social systems and minigames

- **Player-facing intent:** a daily checklist that gives a growing roster places to matter.
- **Mechanical model:**
  - **Towers and PvE:** King's Tower plus one tower per faction; Arcane Labyrinth; Bounty Board, which sends requested heroes on timed quests.
  - **Bosses and endgame:** Abyssal Expedition, a guild 4X-style map mode; Temporal Rift; Trials; Misty Valley.
  - **Competitive:** Arena of Heroes (asynchronous PvP) and the Legends Championship, where only top players compete and others bet.
  - **Guilds and social:** guilds with Guild Hunting and the Hellscape; in-game forums.
  - **Minigames:** match-3 (Forest Mania), a shoot-'em-up (Shadow Invasions) and, in 2026, Otherworld Fishing. GameRefinery notes the minigames are "not monetized in any way" ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7); [PocketGamer.biz](https://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/)).
- **Data shape:** the Arena runs 14-day seasons, the Labyrinth resets every 48 hours and Guild Wars ran five one-day rounds, all as of 2019 ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)).
  Hunter's Notes and Fantastic Beasts are capped at "80 attempts per week of each event" ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
- **Progression and gating:** most modes unlock by campaign stage, and leaderboard modes (Abyssal Expedition, Treasure Scramble, Cursed Realm) pay the best rewards.
  A whale puts the consequence bluntly: "A lot of things are beatable for free, but all the rewards pale in comparison to CR/NC/TS rankings" ([comment](https://www.reddit.com/r/afkarena/comments/1amjx3o/)).
- **Failure modes and edge cases:** abandonment of old modes. An August 2026 post, "The Outdated & The Forgotten" (score 350), lists the Bounty Board ("hasn't been updated in years"), Arcane Labyrinth ("the worst value items in the entire game"), Unions, pets, achievements, and Hunter's Notes and Fantastic Beasts ("abandoned very early") ([r/afkarena](https://www.reddit.com/r/afkarena/comments/1vn555q/)).
- **Why it works (or doesn't):** breadth gave the roster meaning and guilds gave the game its social glue. Players cite guildmates as the last reason to stay: "I'm playing because I like the people that I play with" ([comment, score 24](https://www.reddit.com/r/afkarena/comments/1h6qasm/)). The cost is that every mode is another live-ops surface to maintain, and the unmaintained ones read as decay.

### 2.7 AFK Arena: Companions (the in-app reboot)

- **Player-facing intent:** a fresh start for new and returning players, without the Classic economy.
- **Mechanical model:** a second game in the same app since 23 October 2024, now "the primary game for new downloads" ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)). It offers:
  - 10 free summons a day, "a total exceeding 1,000," and a "Get All Heroes" event in which campaign progress unlocks every hero.
  - Borrowing heroes from friends in the campaign and in PvP.
  - Character resets that refund resources.
  - Simplified beasts, a 4X Expedition mode, no VIP and a single seasonal pass ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432); [GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
  - Classic players can link and transfer heroes ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).
- **Failure modes and edge cases:** it split the base. A December 2024 post argues Companions "has basically stopped AFK arena from getting new players entirely and has split the community" ([r/afkarena, score 242](https://www.reddit.com/r/afkarena/comments/1h6qasm/)).
  A four-year player warns that guilds "are going to start to lose means to refill" ([r/afkarena, score 74](https://www.reddit.com/r/afkarena/comments/1gc2wwt/)).
  Sensor Tower shows no revenue recovery after the launch: 2025 was below 2024 **[non-audited]**.
- **Why it matters:** this is the developer's own verdict on the collection-gacha ceiling. Its answer was to make heroes guaranteed by progress, make duplicates matter less and share heroes socially.

### 2.8 Live-ops cadence and communication

- **Cadence:** about two updates a month in 2026, each with a new hero for each version, events and skins ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432)). The anniversary event in April carries the year's "swap" and free-hero relief valves.
- **Communication:** Lilith posts yearly "Don's Letter" gift codes. In 2024 there were separate codes for Classic and Companions ([r/afkarena, score 197](https://www.reddit.com/r/afkarena/comments/1hqf3nz/)).
  In April 2026 the subreddit's moderator, who had worked "alongside the AFK Arena staff" for nearly four years, announced "I'm stepping away and cutting my ties with the AFK Arena team." The subreddit relabelled itself "Unofficial, Community-run" ([r/afkarena](https://www.reddit.com/r/afkarena/comments/1sodic6/); [AMA, score 347, 282 comments](https://www.reddit.com/r/afkarena/comments/1srgekr/)).
  The moderator notes the announcement became "the second highest upvoted post on this subreddit in the past 365 days."

## 3. Key innovations

- **AFK time as the universal currency.** Many rewards are denominated in "hours of AFK" (Stargazer crates, Fast Rewards), so a reward scales with the player's own campaign stage and never goes stale ([fandom, Stargazing Room](https://afk-arena.fandom.com/wiki/Stargazing_Room); [Fast Rewards](https://afk-arena.fandom.com/wiki/Fast_Rewards)). One designed curve (campaign stage) prices the whole economy. Out of Ruin's time warps are the same idea and can be generalised.
- **Campaign-gated loot tiers in the idle chest.** The chest's drop *table*, not just its rate, upgrades at named stages (Mythic gear from 16-11 and so on), so pushing one stage can change what you wake up to ([fandom](https://afk-arena.fandom.com/wiki/AFK_rewards_chest)).
- **A chest that visibly fills.** The AFK chest changes art at 10, 60, 360 and 600 minutes ([fandom](https://afk-arena.fandom.com/wiki/AFK_rewards_chest)), a cheap but strong "come back" signal. Companions adds a four-roll upgrade reveal on opening ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
- **Resonating Crystal level-sharing.** Level five heroes and everyone else rides along ([fandom](https://afk-arena.fandom.com/wiki/Resonating_Crystal)). This one system makes a 250-hero roster experimentable, because a new hero can be tried at full level the day it is pulled.
- **A merge gacha with a high headline rate.** 4.61% top-rarity odds, a 30-pull floor, a per-faction wishlist and merge use for every result ([afk.guide](https://afk.guide/?p=558); [Naavik](https://naavik.co/digest/rise-fall-lilith-games/)). This was the "generous" reputation at launch.
- **Storybook art direction instead of anime.** Cocos reports the team "moved towards a style that is found in European church murals" ([Cocos](https://www.cocos.com/en/post/73239bf646d4cce9d88b388edddb35ef)). Pocket Gamer called it "Disney-esque," "a refreshing change of pace from all the anime-themed art out there" ([Pocket Gamer](https://ee.pocketgamer.com/articles/084103/afk-arena-review-away-from-keyboard-but-here-for-fun/)). Art and skin posts are among the most-upvoted non-guide threads on Reddit (section 4).
- **Unmonetised minigames as variety** (match-3, a shooter, fishing) inside an idle RPG ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
- **The in-app reboot.** Shipping a simplified second economy (Companions) in the same binary, with hero transfer from Classic, instead of a separate sequel app ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)). It is novel, but it divided the community (section 4).

## 4. Player frictions & complaints

**Method.**
I pulled 204,884 r/afkarena posts through the Arctic Shift API. That is every archived post from the first one on 27 June 2018, during the soft launch, to 25 October 2026, except a gap of about two weeks in early July 2021.
I clustered them by keyword, read the full bodies of the highest-scoring complaint and praise posts, and pulled top comments for the key threads.
Scores are the archived upvote counts.
Store-review quotes are from the Google Play and App Store pages on 25 October 2026.

Post volume alone tells the arc. Archived posts per year:

| Year | Posts |
|---|---|
| 2018 (soft launch) | 39 |
| 2019 | 44,254 |
| 2020 | 56,288 |
| 2021 | 35,049 (about two weeks missing) |
| 2022 | 22,094 |
| 2023 | 20,668 |
| 2024 | 14,078 |
| 2025 | 7,587 |
| 2026 (to 25 Oct) | 4,827 |

This proxy tracks Sensor Tower's MAU curve (section 1) closely.

**Correction to the first pass.**
The thread ["One of the worst feature ever existed among IDLE GAMES"](https://www.reddit.com/r/afkarena/comments/185s4dq/) (score 254, 71 comments) is not about AFK rewards.
It is about the Collections system (Ghoulish Gallery) added in November 2023: "Is this a fucking MMORPG what the fuck?"
Idle-reward complaints exist (section 4.4), but they are a minor theme next to gacha layering and power creep.

### 4.1 New vertical layers and power creep (the dominant theme, every year since 2020)

- **2020, Dimensionals.** ["The Dimensionals Situation Should Concern You, F2P or Not"](https://www.reddit.com/r/afkarena/comments/klrtbb/) (score 1,706, 352 comments) compares AFK Arena to games that died of monetisation and power creep. Its TL;DR: "Introducing new P2W mechanics that give larger advantages than normal over F2P players is bad for the game and should concern even P2W players."
  Days earlier, ["Lilith is directing AFK Arena in the wrong direction"](https://www.reddit.com/r/afkarena/comments/keee7h/) (1,480, 296 comments) says "I'm pretty tired of the grind" and reports kicking inactive guildmates, "which is unusual."
  ["So buying the game itself is cheaper than buying both new dimensional from the Afk arena"](https://www.reddit.com/r/afkarena/comments/kklv1m/) scored 1,534.
- **2020, paid-only heroes.** A self-described $4,000 spender warned in ["Lilith you still have time to fix this"](https://www.reddit.com/r/afkarena/comments/fvwwj7/) (1,417) about "a new hero being only obtainable by paying $50" (the Ukyo collab).
- **2021, roster fatigue.** ["So long and thanks for all the Celepogeans!"](https://www.reddit.com/r/afkarena/comments/qzhz9g/) (598, 187 comments): "There are too many heroes, with more being added all the time, and acquiring, ascending, equipping, getting furniture and engraving has become too much of a hassle. Also, completing a hero doesn't feel as significant anymore."
- **2023, Collections.** ["Lilith NO, just NO"](https://www.reddit.com/r/afkarena/comments/1813pjg/) (420) is careful: it praises furniture ("The art team did 10/10 on that one") and engraving for clarity, then calls Collections "without a doubt the worst feature on AFK arena."
  ["The Collections mechanic takes the worst parts about AFK Arena and aggravates them even further"](https://www.reddit.com/r/afkarena/comments/180ufjl/) (201) lists time, complexity and RNG.
  ["Guys, I'm done with Afk Arena"](https://www.reddit.com/r/afkarena/comments/17xgxcq/) (406, 166 comments): "I'm tired of hitting awakened and Stargazer pity all the time. I'm tired of collecting and managing all the resources. I'm tired of trying to keep up."
- **2024 and 2025, Draconis.** ["AE and the BIG dragon problem"](https://www.reddit.com/r/afkarena/comments/1e5etqo/) (857, the highest-scoring post since 2024) comes from a top-guild whale who calls himself "an optimist and a devil's advocate regarding Lillith."
  ["PROTEST"](https://www.reddit.com/r/afkarena/comments/1jqlnhs/) (704, 111 comments) says: "I SPENT 150 SCROLLS + 250K DIAMONDS AND STILL DIDN'T ASCEND SION, AND NOW WE ALREADY HAVE ANOTHER DRACONIC HERO?" and "Power creep is ruining old heroes—almost every new hero is stronger than the previous ones." Its top comment (140) mocks the promised fix: "look guys here's the feature that will make Dragons easier to get in 2027."
  ["Mass player abandonment"](https://www.reddit.com/r/afkarena/comments/1j6nhd9/) (429, by a long-time guide and meme creator) lists "Too many new characters," "Power creep and devaluation of older characters," "Repetitive and uninteresting events" and "Ridiculously expensive cash shop."
- **2026, the next layer.** ["New Powercreep! The Oath Mark Codex Explained"](https://www.reddit.com/r/afkarena/comments/1qwpi9r/) (187) describes another global buff system plus "hero-specific buffs that may be individually purchased for each hero."
  ["The Outdated & The Forgotten"](https://www.reddit.com/r/afkarena/comments/1vn555q/) (350) catalogues the modes left behind as new layers arrive.

### 4.2 Hidden pity and opaque odds

- Players reverse-engineered the pity rules rather than reading them.
  ["Wishlist is guaranteed and here's the proof"](https://www.reddit.com/r/afkarena/comments/ha6smh/) (505, 176 comments) used the Korean client's legally required rate disclosure. With a full wishlist, each wishlist hero is 0.2205% and each Celestial or Hypogean 0.02%, so every non-Celestial or Hypogean Elite pull is a wishlist hero. That contradicts support's line that the wishlist only "increased rates."
- ["Stargazer has TWO pity timers!"](https://www.reddit.com/r/afkarena/comments/uv7m2s/) (395, 2022) was overturned a year later by ["Stargazer and Temple of Time have one pity timer"](https://www.reddit.com/r/afkarena/comments/11o11ct/) (398, 2023). The 2023 analysis was built on 45,110 ten-pull stargazes, 8,765 single stargazes and 58,281 Temple of Time pulls, all crowd-sourced.
  A commenter's log of five copies landed at pulls 65, 63, 61, 64 and 65, which is consistent with a hidden pity near 65.
- ["691 Time cards wasn't enough for an awakened hero. Probably quitting"](https://www.reddit.com/r/afkarena/comments/yxzau4/) (278, 143 comments): ten of eleven copies took 60 to 65 cards, and "I find it highly suspicious that I brushed up against the pity timer every single time except the first copy and never once did better than the 2% chance lilith claims."
- ["Ghoulish Gallery Wishlist is not 25% to get Miracle Worker"](https://www.reddit.com/r/afkarena/comments/1bgvkh5/) (119) datamined the game's JSON to show a key totem at about 2%, "what Lilith is hiding behind Ghoulish Gallery."
- At launch, rates were a selling point rather than a grievance. ["We need higher purple rates!"](https://www.reddit.com/r/afkarena/comments/czymac/) (2,507, 2019) was a joke thread, and a reply scored 60 says "tbh this game got one of the best gacha rates, normally games have like 0,1~0,5%."
  The trust problem came with the later premium gachas, not the original Tavern.
- ["Reset scrolls NEED a pity timer"](https://www.reddit.com/r/afkarena/comments/jnqf5y/) (204, 2020): "all Summons have some sort of pity timer."
- Players welcomed fixes that *expose* odds. ["Test Server - Hero Choice Pack, guarantees your next elite is the selected hero"](https://www.reddit.com/r/afkarena/comments/hju2w6/) scored 1,530, among the most-upvoted posts of 2020.

### 4.3 The "AFK" promise eroding into active hours

- The top comment (155) on the Collections thread: "It baffles me that a game titled AFK adds this mode you NEED to do literally a few days after another mode you NEEDED to stay active for 3 DAMN HOURS A DAY" ([r/afkarena](https://www.reddit.com/r/afkarena/comments/185s4dq/)).
- "It's pretty obvious that the AFK in AFK Arena hasn't been very true lately. The game already requires a significant time investment" ([180ufjl, 201](https://www.reddit.com/r/afkarena/comments/180ufjl/)).
- ["Why Older Players Are Quitting"](https://www.reddit.com/r/afkarena/comments/1870n3o/) (228): "Arcane Labyrinth is a boring chore that we still can't 1-click complete"; "Towers and campaign are just a power-cap simulator where we wait for higher RC."
- Lilith's 2025 background auto-battle rework ended auto-retry after ten losses. After community pushback the moderators announced the cap would be removed ([r/afkarena, 318](https://www.reddit.com/r/afkarena/comments/1knvpfz/)). An October 2025 event "without auto-battle and a 60-second wait per fight" was called "the worst event I've ever seen" ([258](https://www.reddit.com/r/afkarena/comments/1ojcf2e/)).

### 4.4 Idle and reward economy: stagnation and caps

- Reward rates stopped tracking the new sinks. ["With all the new content added, all rewards NEED to be increased"](https://www.reddit.com/r/afkarena/comments/1c3218y/) (260) asks for "a 50-100% increase" in AFK rewards and says King's Tower at stage 1,414 gives "basically no diamonds."
  ["Game features that are significantly outdated"](https://www.reddit.com/r/afkarena/comments/1cu3r2p/) (131) notes "Dust income stops increasing after chapter 29, which made sense four years ago."
- Events that pay less than the chest: ["May I say that this event is pretty cool, but these rewards... I have the same amount from idle chests and maybe even more"](https://www.reddit.com/r/afkarena/comments/urg61i/) (217, 2022).
- Resource caps during collection events: ["Can we pls talk about the ressource cap lilith?"](https://www.reddit.com/r/afkarena/comments/ibb2c5/) (847, 2020). Its top comment (221): "remove the cap or set it way higher."
- Players model the idle curve themselves. ["The Math behind Idle Rewards"](https://www.reddit.com/r/afkarena/comments/fflsv8/) (133, 2020) finds that hero-EXP gains grow to about chapter 23, flatten from 25 to 32 and spike at 32, so "pushing that last 5 could take you hours" for little gain.
  ["T3 stones in afk loot confirmed"](https://www.reddit.com/r/afkarena/comments/mgcxns/) (180, 2021) celebrates a new drop tier appearing in the chest at Chapter 34. The campaign-gated loot table works as a reward moment.
- The counter-example: ["Test Server: Double AFK Rewards"](https://www.reddit.com/r/afkarena/comments/ghhfut/) (662, 2020). Its top comment (157) is "this dev deserve a big respect they are so generous." Raising idle income is the cheapest goodwill lever the game has.

### 4.5 Price, whales and the paywall

- A whale-meme genre dominated 2020 and 2021: ["How AE feels as a nonwhale getting carried"](https://www.reddit.com/r/afkarena/comments/j81zxg/) (1,980), ["Whale watching"](https://www.reddit.com/r/afkarena/comments/l00cmn/) (1,926), ["The Oak Inn is the official name because 'Whale Inn' sounded like:"](https://www.reddit.com/r/afkarena/comments/hnfqk9/) (1,463, about the furniture gacha), and ["Lilith Office everytime a whale purchase the $2000 frame."](https://www.reddit.com/r/afkarena/comments/nfh086/) (1,380).
- ["8 months and $38,000 later ~ no longer interested"](https://www.reddit.com/r/afkarena/comments/1amjx3o/) (518, 137 comments) criticises "heavy rng with no ACTUAL pity system" and "Certain modes have been abandoned so they can farm more short term gains from the next power creep." A VIP 20 commenter agrees: "these past few updates since Ghoulish has been a clear sign that these devs don't care about their player base."
- Google Play, June 2026: "Basically legal gambling. They design it so you can't possibly ascend your heroes unless you pay for it. the microtransactions are WAY overpriced" ([Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.hgame.gp)).
- A lapsed 2020 player returning in 2026: "Everywhere I look seems to be another subscription or pack that needs to be unlocked" ([41](https://www.reddit.com/r/afkarena/comments/1qrv030/)).
- 2026 anniversary anger at the missing "dragon swap": ["Dear lilith, you greedy F****** bastards"](https://www.reddit.com/r/afkarena/comments/1s9ma11/) (316) and ["Lilith your game is dying."](https://www.reddit.com/r/afkarena/comments/1s9r7k5/) (189). The latter claims "Revenue is down ~80%+," which matches Sensor Tower's direction.

### 4.6 Neglect, the Companions split and silence

- ["The Rise and Fall of AFK Arena."](https://www.reddit.com/r/afkarena/comments/1h6qasm/) (242, December 2024): "AFK Companions... has basically stopped AFK arena from getting new players entirely and has split the community... I feel almost betrayed some how." Its top comment (83): "If they bleed their player base from classic and shut it down, I'll just leave."
- ["Lilith, what's up? Talk to us!"](https://www.reddit.com/r/afkarena/comments/1jpkc9q/) (192, April 2025): "It's been months since the last official note."
- ["STOP MERGING SERVERS !!!"](https://www.reddit.com/r/afkarena/comments/1qpbh9b/) (159, January 2026) shows server consolidation as the population shrinks.
- In April 2026 the subreddit's moderator, who had spent nearly four years "being the bridge between our players and the people making this game," cut ties: "Such a bridge only stands if both sides still believe in where it leads" ([r/afkarena](https://www.reddit.com/r/afkarena/comments/1sodic6/); [AMA, 347, 282 comments](https://www.reddit.com/r/afkarena/comments/1srgekr/)).
- Lore fans object too. ["Lilith should go back to what they were doing before"](https://www.reddit.com/r/afkarena/comments/1gv3uvp/) (266) calls the post-2023 storyline "one continuous middle finger to the lore community with insane retcons." The same poster calls old AFK lore "the most well-crafted world I've ever seen in a mobile game."

### 4.7 Advertising that misrepresents the game

- ["Why would anyone want to play this after seeing this ad? Come on Lilith."](https://www.reddit.com/r/afkarena/comments/gib41k/) (1,538, 2020). Top comment (175): "The game I wish I was playing."
- ["Why is this their ad if it's not even in the game?"](https://www.reddit.com/r/afkarena/comments/1bnnvkm/) (117, 2024).
- ["Sorry but the new art style looks so cheap, like one of those free games with hundreds of ads"](https://www.reddit.com/r/afkarena/comments/1d84puv/) (280, 2024) is about a UI refresh read as cheapening the brand. Udonis and Deconstructor of Fun document the same ad strategy from the outside ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/afk-arena-analysis); [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)).

### 4.8 Notification noise

- ["Single most annoying notification in this game"](https://www.reddit.com/r/afkarena/comments/dfuwcm/) (2,527, 2019) is one of the most-upvoted posts of the launch year. Top comment (23): "Red dots everywhere!... 'No I don't wish to upgrade that heroes signature item. Please stop asking!'"
- ["Curious what Lilith was smoking when they changed the logic of the red exclamation marks"](https://www.reddit.com/r/afkarena/comments/liyg5k/) (276, 2021) shows that every new system adds another badge to clear.

### 4.9 What players praise (the ceiling worth copying)

- **Art and characters** are the subreddit's most-upvoted content by a wide margin. [A visual stargazing guide](https://www.reddit.com/r/afkarena/comments/j7dle8/) (4,097), ["Petition to have a Dark Mode for the Loading Screen"](https://www.reddit.com/r/afkarena/comments/igwwh3/) (3,656, an image joke about the loading screen), ["Shemira FanArt by Zoma"](https://www.reddit.com/r/afkarena/comments/johhow/) (3,371), ["Mehira Celestial skin design."](https://www.reddit.com/r/afkarena/comments/iac9a7/) (3,154) and a fan-designed ["Talene skin"](https://www.reddit.com/r/afkarena/comments/ldk20u/) (3,054) all outscore every complaint thread.
  A 2020 newcomer: ["Cecilia fan art! New to the game but loving the character designs!!"](https://www.reddit.com/r/afkarena/comments/if51qn/) (2,137).
  Even departure posts carve it out: ["goodbye afk arena... still love the art and the fanart"](https://www.reddit.com/r/afkarena/comments/10c7i4p/) (726).
- **Generosity moments** are rewarded loudly: ["That's quite generous, thanks lilith!"](https://www.reddit.com/r/afkarena/comments/ellwy5/) (1,291, 2020). ["I think its time to praise Lilith"](https://www.reddit.com/r/afkarena/comments/128j88l/) (437, 2023) welcomes a free Awakened exchange: "Amazing art, fun characters and stories, good gameplay loop, a lot of systems to progress on, idk man I really love this game."
  The 2019 ["game becoming way way better"](https://www.reddit.com/r/afkarena/comments/cj84v9/) (774) praises Signature Items for adding depth "while still having a balanced hero pool," and events where "even f2p players can get good rewards."
- **Lore** draws its own fan work: ["I couldn't find an existing relationship tree based on the lore, so I decided to make one myself"](https://www.reddit.com/r/afkarena/comments/dl8t4r/) (2,120, 163 comments, 2019).
- **Low daily time** was the original hook: "this game only takes like 10 minutes of my time a day" ([1h6qasm](https://www.reddit.com/r/afkarena/comments/1h6qasm/)). A 2020 App Store reviewer called it "Very F2P-friendly, but waiting mechanics may try your patience" ([App Store](https://apps.apple.com/us/app/afk-arena/id1375425432)).
- **Guilds and friends** keep the remaining players: "The only thing that is preventing me from quitting is my guild and mates" ([comment, 24](https://www.reddit.com/r/afkarena/comments/1h6qasm/)).

## 5. Lessons for Out of Ruin

**The emphasis lens.**
AFK Arena shows how high an idle RPG's fantasy can reach:

- about 250 illustrated heroes with lore, rooms, skins and signature items;
- an AFK chest whose loot table improves with every campaign stage;
- a storybook art direction that won its own fan-art culture.

It also shows the cost of reaching that ceiling through a duplicate-merge gacha.
Revenue fell about 95% from 2020 to 2025 **[non-audited]**. The players who left name the same causes, year after year: new vertical layers, power creep, hidden pity, and an "AFK" game that came to demand hours.
Lilith's own 2024 rebuild, Companions, deletes most of that and sells "Unlock All Heroes."
Out of Ruin already sits much closer to the Companions answer than to Classic: heroes unlock by chapter, there is one gear-card axis, and money buys gold.
The lessons below are about how far up the fantasy ladder to climb without importing the treadmill.

**What Out of Ruin's heroes and gear could aspire to.**

1. **Make each hero a character, not a stat line.** AFK Arena's heroes carry a portrait in a consistent storybook style, a lore entry, a signature item and, for top heroes, a furnished room. Reviewers single out the portraits ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7); [Pocket Gamer](https://ee.pocketgamer.com/articles/084103/afk-arena-review-away-from-keyboard-but-here-for-fun/)), and most of the subreddit's highest-scoring posts ever are fan art and skin designs (section 4.9).
   Out of Ruin has four heroes, so it can afford AFK-Arena-grade treatment for each one: a full-size illustrated portrait, a short humorous lore card, a visible animation for every automatic power (the Chain Lightning hit, the loot steal), and one signature gear card per hero that changes how that power looks and behaves.
   Four memorable heroes beat forty forgettable ones. The genre's best fan engagement attaches to *characters*, not to roster size.
2. **Price rewards in "hours of production" and scale them with chapter rank.** AFK Arena's crates ("24 hours of AFK each") never go stale because they scale with campaign stage ([fandom](https://afk-arena.fandom.com/wiki/Stargazing_Room)).
   Out of Ruin's time warps already are this idea. Extend it so quest rewards, pack filler and any future events pay in "N hours of your current loot and henchmen output." Each chapter rank-up then visibly raises the value of everything the player earns.
3. **Let chapters change the loot table, not just the rate.** AFK Arena's chest starts dropping Mythic gear at a named stage ([fandom](https://afk-arena.fandom.com/wiki/AFK_rewards_chest)). Players chart which stages raise which rewards and plan their pushes around it ([r/afkarena, "The Math behind Idle Rewards," score 133](https://www.reddit.com/r/afkarena/comments/fflsv8/)).
   Out of Ruin can tie a new loot type to each region (Desert Ruin unlocks a rarer drop, Ancient Mine unlocks gear-card XP from cleared levels) and announce it on the chapter screen. That turns "rank up" into "my dungeon now drops something new."
4. **Make absence visible and pleasant.** The AFK chest changes art at 10, 60, 360 and 600 minutes ([fandom](https://afk-arena.fandom.com/wiki/AFK_rewards_chest)), and Companions turns opening into a four-step upgrade reveal ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
   Out of Ruin's follower offline income should get the same moment on return: a pile that visibly grew, a short reveal, and the hours shown.
   Set the offline cap with care. Classic's 12-hour cap punishes once-a-day players ([afk.global](https://www.afk.global/beginners-guide)), and Companions moved to three stacked 10-hour chests, which fits real sleep and work patterns better.
5. **Share progress across the roster, AFK-Arena style.** The Resonating Crystal lets a player level five heroes and lift everyone else ([fandom](https://afk-arena.fandom.com/wiki/Resonating_Crystal)). If Out of Ruin's henchmen roster grows to its 25 slots, newly hired henchmen should arrive at a level tied to the player's best, so new hires never feel like a reset.

**How much depth and gacha pressure to deliberately leave out.**

6. **Leave out the duplicate treadmill.** In AFK Arena one hero needs 8 copies plus 180 fodder-equivalents to reach Ascended, and 18 copies for five stars ([fandom ascension guide](https://afk-arena.fandom.com/wiki/AFK_ARENA_ascension_guide)). That treadmill is what the June 2026 "legal gambling" Play review means by "you can't possibly ascend your heroes unless you pay for it."
   Out of Ruin's gear cards already upgrade with duplicates and XP. Keep duplicate requirements low and short. Make every duplicate convert to XP so no pack is dead. Let XP alone carry a card to its cap, so duplicates are a shortcut and never a wall.
7. **If packs stay random, show the odds and show the pity.** AFK Arena's players learned its pity rules from a Korean regulatory disclosure and from logging tens of thousands of pulls ([r/afkarena, score 505](https://www.reddit.com/r/afkarena/comments/ha6smh/); [score 398](https://www.reddit.com/r/afkarena/comments/11o11ct/)). Hidden pity reads as betrayal: "I brushed up against the pity timer every single time" ([score 278](https://www.reddit.com/r/afkarena/comments/yxzau4/)).
   Out of Ruin's pack screen should print the odds and a visible "guaranteed Epic in N packs" counter. Better still, offer a deterministic way to choose a card (a dust-and-craft path), as AFK Arena's own Hero Choice Pack and beast "choose after enough pulls" mechanic do ([GameRefinery](https://app.gamerefinery.com/game/5c3859d99890a268297530e7)).
8. **Never stack a second upgrade axis on the same thing.** The big vertical systems AFK Arena bolted onto heroes drew the top complaint threads of their years: Dimensionals in 2020, Collections in 2023, and Draconis in 2024 and 2025. The 2026 Oath Mark Codex was labelled "New Powercreep!" on its test-server debut (section 4). A 2021 departure post names the cumulative effect: "acquiring, ascending, equipping, getting furniture and engraving has become too much of a hassle."
   Out of Ruin should hold a hard rule: one upgrade axis per thing (heroes level by chapter, gear cards by XP, henchmen by count). New content should be new *content* (regions, heroes, cards, quests), not new multipliers on old content.
9. **Keep the "AFK" promise.** The most painful AFK Arena complaint is not cost but time: "It baffles me that a game titled AFK adds this mode you NEED to do literally a few days after another mode you NEEDED to stay active for 3 DAMN HOURS A DAY" ([comment, score 155](https://www.reddit.com/r/afkarena/comments/185s4dq/)).
   Out of Ruin's tapping should always be a bonus on top of henchmen output, never a requirement for fair progress. Any future event should be completable in short sessions.
10. **Sell time and looks, not odds.** AFK Arena's early, well-liked monetisation sold time: VIP multipliers, Fast Rewards and the Advancement gem track ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club); [afk.guide](https://afk.guide/afk-arena-vip-ranks/)). Its resented monetisation sold odds on scarce heroes.
    Out of Ruin's gold packs should lean toward time warps, convenience and cosmetic hero skins (a skin per hero is the cleanest AFK Arena import), with random card packs as the smaller share.
11. **Keep ads truthful.** AFK Arena's own players mocked its misleading ads: "Why would anyone want to play this after seeing this ad?" ([score 1,538](https://www.reddit.com/r/afkarena/comments/gib41k/)), and "Why is this their ad if it's not even in the game?" ([score 117](https://www.reddit.com/r/afkarena/comments/1bnnvkm/)). If Out of Ruin runs creatives, show the real cascade and the real heroes.
12. **Talk to players on a schedule.** AFK Arena's 2025 to 2026 threads are dominated by silence complaints ("Lilith, what's up? Talk to us!", [score 192](https://www.reddit.com/r/afkarena/comments/1jpkc9q/)), ending with the subreddit moderator cutting ties in April 2026. When Out of Ruin adds accounts and live content, a regular public changelog and roadmap tell players their investment is safe, which is the trust AFK Arena lost.

**The single most important lesson.**
AFK Arena proves that the idle RPG's ceiling is set by *character fantasy plus campaign-scaled AFK loot*. Both are things Out of Ruin can match in quality at its own small scale.
What collapsed AFK Arena was the third pillar: duplicate-driven, layered, opaque gacha depth. Out of Ruin should climb the first two all the way and deliberately leave the third out.
