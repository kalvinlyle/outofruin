# Idle Heroes — The Decade-Long VIP-Ladder Hero Collector Teardown

Research date: 2026-10-25. Store figures were read at fetch time. Any revenue, download or install
figure tagged **[non-audited]** is a third-party estimate or a self-report, not a company disclosure.
DH Games has never published Idle Heroes revenue or player counts.

Primary evidence base for this pass:

- Sensor Tower monthly worldwide revenue and downloads for both store listings, 2016-06 to 2026-10,
  pulled from the Supercell data warehouse.
- The full r/IdleHeroes post history via the Arctic Shift archive. That is **189,869 posts** from
  August 2016 to October 2026, with bodies and top comments read for every post quoted below.
- The 500 most recent US App Store reviews, from Apple's
  [customer-review RSS feed](https://itunes.apple.com/us/rss/customerreviews/id=1153461915/sortby=mostrecent/json),
  covering June 2023 to October 2026.
- The live [App Store](https://apps.apple.com/us/app/idle-heroes-idle-games/id1153461915) and
  [Google Play](https://play.google.com/store/apps/details?id=com.droidhang.ad&hl=en_US&gl=US)
  pages, DH Games' own [company history](https://www.dhgames.cn/en/about.html), Chinese company
  registries, the community wiki, the patch notes, and GameRefinery's analyst file.

---

## 1. Snapshot

### Studio & ownership

**"DHGames" and "DroidHang" are one company with two trading names.** The first pass found them
conflicting. Here is how they fit together:

- **Operating company: Chengdu Droidhang Network Technology Co., Ltd. (成都卓杭网络科技股份有限公司).**
  It is based in Chengdu, Sichuan, and was founded on 25 March 2011. Its legal representative is
  Wang Wei (王伟), who holds about 58.8% per [36Kr's company file](https://pitchhub.36kr.com/project/1958610036839428).
  The same file lists an A round from Taiyue Wutong Capital (June 2015), a placement involving
  Zqgame (December 2015) and a **strategic investment from Lilith Games (November 2017)**.
  [PEdaily's registry page](https://m.pedaily.cn/data/company/2234) gives the same founding date and
  legal representative.
  A [Zhihu article](https://zhuanlan.zhihu.com/p/579036896) puts Lilith's stake at 11.36%. Zhihu
  returned 403 to a direct fetch, so that stake is **unverified**.
- **Brand: "DH Games" / "DHGAMES".** DH Games' own [history page](https://www.dhgames.cn/en/about.html)
  gives the same 25 March 2011 founding date. It traces a path from tower-defence titles (Castle
  Defense 2 passed 20M downloads) to the 2015 idle RPG *Destiny Summoner*, then Idle Heroes in 2016.
  It says the company "transformed from pure developer to a game manufacturer integrating R&D and
  operations" that year.
- **Store and legal shells.** Google Play lists the developer contact as **DHGames Limited**, at
  Rm 181 2/F Eton Tower, 8 Hysan Ave, Causeway Bay, Hong Kong, with a `@droidhang.com` support
  address ([Google Play](https://play.google.com/store/apps/details?id=com.droidhang.ad&hl=en_US&gl=US)).
  The [App Store](https://apps.apple.com/us/app/idle-heroes-idle-games/id1153461915) names DHGames
  Limited as seller but prints "© Droidhang Inc 2016". The Android package id is `com.droidhang.ad`.
  The [official site](https://ih.dhgames.com/en/index.html) footer reads "DROIDHANG". A community
  list of Chinese-owned games maps the title to "Chengdu Droidhang Network Technology Co.,Ltd."
  ([hafat.github.io](https://hafat.github.io/cn_game.html)).
- **Chinese release.** The game ships in China as **放置奇兵** ([ih.dhgames.cn](https://ih.dhgames.cn/)).
- **Corporate trajectory.** [DoNews (28 Oct 2022)](https://www.donews.com/news/detail/3/3248425.html)
  reported a leaked internal email from CEO Wang Wei. The email described falling revenue from older
  games and new titles missing targets. It announced frozen bonuses and raises, layoffs, and a pivot
  to developing only light and mid-core games. The company has not confirmed it, and the page body
  would not render for a direct quote, so treat it as **reported, not confirmed**.

**Read:** treat "DH Games", "DHGames Limited" (Hong Kong) and "Droidhang" (Chengdu) as one group.
Cite it as *DH Games (Chengdu Droidhang Network Technology)*.

### Engine / technical posture

- **The engine is not disclosed.** No first-party or credible secondary source names it, and I did
  not decompile the client.
- **Footprint.** The iOS build is 748.3 MB and needs iOS 13 or later. It also runs on Apple-silicon
  Macs ([App Store](https://apps.apple.com/us/app/idle-heroes-idle-games/id1153461915)). Google
  publishes a Windows listing through
  [Google Play Games on PC](https://play.google.com/pc-store/games/details?id=com.droidhang.ad).
- **Servers.** The game runs on numbered, server-bound accounts that are periodically merged. Server
  merges are a recurring topic: 167 post titles mention them, starting with
  ["Server merge?"](https://www.reddit.com/r/IdleHeroes/comments/6sradq/) in August 2017.
- **Content arrives server-side.** The iOS binary last changed on 26 Nov 2025 (v1.39.3). Google
  Play shows "Updated on Sep 2, 2026". New heroes and modes kept arriving weekly in between, per the
  [12 Jun 2026 patch notes](https://sites.google.com/view/1pikxb80yrfzcwyg2qggob2viykhg/%E9%A6%96%E9%A1%B5),
  which add "Void Executor - Umbrion" and a "10th Anniversary Skin Voucher".

### Release & status

- **Android:** listed in Sensor Tower's catalogue with a 22 June 2016 release date. Revenue data
  starts June 2016.
- **iOS:** 9 November 2016 (Sensor Tower catalogue, and GameRefinery's global-launch timestamp).
- **Status:** still live in its tenth year, with weekly events and new heroes.

### Platforms

iOS, iPadOS, Apple-silicon macOS, Android, and Windows via Google Play Games on PC. iOS ships in
English, Japanese, Simplified Chinese and Traditional Chinese.

### Distribution

- **Stores.** Free on both stores. Google Play shows **10M+ downloads**. Its page data embeds a raw
  install count of 36,016,745 **[non-audited]**.
- **Web shop.** DH Games runs an off-store top-up at
  [xsolla-payment.dhgames.com](https://xsolla-payment.dhgames.com), linked from the official site.
  The [19 Dec 2025 patch notes](https://sites.google.com/view/1gecwicvn7ifszqfxpvqujovpwinzv/%E9%A6%96%E9%A1%B5)
  advertise a "Top-up store" with a 5% base discount plus up to 8% more with a special code.
  Sensor Tower cannot see that revenue (see audience scale).

### Pricing / monetization model

Free-to-play. GameRefinery's analyst lists the stack as "Character gachas (eg. Summon Circle),
Limited time IAP-offers, Bundles and packages, Subscription plans, VIP system, Paid progression
plan" ([GameRefinery](https://app.gamerefinery.com/game/586417adbc85faa91fd38539)).

Price points from primary sources:

| Item | Price | Value / note | Source |
|---|---|---|---|
| Weekly privilege (subscription) | $0.99/wk | "Gold coin in auto-battle +100% for one week" + avatar | [App Store](https://apps.apple.com/us/app/idle-heroes-idle-games/id1153461915) |
| Monthly / quarterly privilege | $3.49 / $9.99 | same gold boost | App Store |
| Monthly Privilege Card | ~$5 | ~560 gems per $ | [r/IdleHeroes hok1k8](https://www.reddit.com/r/IdleHeroes/comments/hok1k8/) (2020, 196 pts) |
| Monthly *Senior* Privilege Card | ~$15 | ~800 gems per $ | same |
| Event "Value" packs | $10–$100, 5 buys each | $100 = 9,888 gems + 33 orbs + 50 event points (**~99 gems per $**) | [Black Friday 2019 guide, e3h3i4](https://www.reddit.com/r/IdleHeroes/comments/e3h3i4/) (129 pts) |
| Store packages | $4.99–$99.99 | Heroic Summon Scroll packs $9.99/$19.99, Hero Packages $49.99/$69.99 | App Store; Google Play shows "$0.99 - $99.99 per item" |
| Starry Gems (Auction House currency) | $5 = 100 … $100 = 2,500 | 20–25 SG per $ | [Auction House guide, uc3rql](https://www.reddit.com/r/IdleHeroes/comments/uc3rql/) (89 pts) |
| Base gem rate | — | "1USD to 50 gems" | [community wiki, Gems](https://idleheroes.fandom.com/wiki/Gems) |

The structurally important fact is the **8x value cliff** between the subscription cards
(560–800 gems per $) and the event value packs (~99 gems per $). Value packs exist to sell **event
points**, not gems. Section 2 covers this.

### Audience scale

**Sensor Tower worldwide estimates, iOS + Google Play combined** (via the Supercell data warehouse,
**[non-audited]**). Gross store revenue; Sensor Tower does not track the Xsolla web shop or China's
third-party Android stores.

| Year | Revenue (USD) | Downloads | Note |
|---|---|---|---|
| 2016 | $1.8M | 0.47M | Android from June, iOS from November |
| 2017 | $51.4M | 9.18M | |
| 2018 | $129.1M | 12.84M | iOS overtakes Android on revenue ($76.0M vs $53.1M) |
| 2019 | **$147.5M** | 11.22M | **Peak.** Best month Feb 2019, $16.6M |
| 2020 | $78.1M | 4.45M | −47% year on year |
| 2021 | $59.9M | 3.56M | |
| 2022 | $37.9M | 2.71M | |
| 2023 | $32.2M | 2.26M | |
| 2024 | $23.7M | 1.73M | |
| 2025 | $16.7M | 1.43M | −89% vs 2019 |
| 2026 (Jan–Oct) | $11.5M | 0.91M | about $1.0–1.6M per month; October partial |
| **Lifetime** | **≈ $590M** | **≈ 50.8M** | |

**The "$70M / $100M" figure from the first pass is settled.** It comes from Joseph Kim's February
2018 GameMakers analysis, cross-posted by
[Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2018/2/27/u6ap146ff5rkmm7fj1qzuhggp395l4).
The article says the game "sits on an estimated $70MM in accumulated net revenue" with "around 12
million installs". It also quotes daily revenue of "$264,663 in January of 2018". The "$100M"
headline is never stated in the body. It is that January daily rate annualised (about $97M).

Sensor Tower's current model gives about $69M **gross** and 11.7M downloads up to February 2018.
The install figure matches closely. The "net" label in the article is probably wrong, since the
chart it cites links to Sensor Tower, which reports gross store revenue. I trust the warehouse data
for totals and treat the 2018 article as a run-rate snapshot.

**Other scale signals:**

- **Ratings.** Sensor Tower's catalogue shows 347,330 iOS ratings worldwide and 1,052,933 Google
  Play ratings. The US App Store page shows "4.8 out of 5, from 107K ratings". Google Play shows 4.7
  from 1.07M reviews.
- **No DAU or MAU figure exists** in any public or warehouse source I could reach.
- **Community volume tracks revenue.** r/IdleHeroes posts per year: 15,669 (2017) → 36,593 (2018)
  → **43,167 (2019 peak)** → 31,425 (2020) → 21,947 (2021) → 11,709 (2022) → 11,199 (2023) → 6,996
  (2024) → 6,307 (2025) → 4,421 (2026 to date). These are counts from the Arctic Shift archive.

### Review sentiment

- **Stars look excellent, but the text is split.** Of the last 500 US App Store reviews (June 2023
  to October 2026), **309 are 5★ (62%), 55 are 4★, 25 are 3★, 15 are 2★ and 96 are 1★ (19%)**
  ([RSS feed](https://itunes.apple.com/us/rss/customerreviews/id=1153461915/sortby=mostrecent/json)).
- **Some of the 5★ volume is not organic praise.** A visible block of 5★ reviews just repeats gift
  codes (IH777 / IH999) that the game's ads promise ("Download today and enter IH777 and IH999 for
  free draws!"). Other reviewers say they rate 5★ only to get past filtering. One writes
  "Only 5 stars so this review doesn't get lost or taken down! This game is pathetic now…". Another
  writes "5 stars to bypass the filter." Read the 4.8 average as inflated.
- **The 1★ and 2★ text clusters on three themes:**
  - pay-to-win and paywalls: "Heavily pay to win, avoid if you can't control yourself";
  - power systems that obsolete old investment: "they will kill your line up every 4-5 years with
    new pay to win power system that only applies to new heroes";
  - lost accounts and unhelpful support: "Spent years and hundreds of dollars on the game and one
    day my account is completely gone."
- **Google Play.** The three reviews surfaced on the page are all 3★. The most-helpful one
  (85 helpful votes, Nov 2018) calls it "a downright bog standard hero mobile RPG dripping with
  microtransactions (though "micro" is used loosely)"
  ([Google Play](https://play.google.com/store/apps/details?id=com.droidhang.ad&hl=en_US&gl=US)).

### Critical reception

- **No mainstream press review exists.** Searches of PocketGamer, TouchArcade and Pocket Tactics
  found none. Coverage is industry analysis and community content.
- **Joseph Kim / Deconstructor of Fun (2018)** is the canonical teardown
  ([DoF](https://www.deconstructoroffun.com/blog/2018/2/27/u6ap146ff5rkmm7fj1qzuhggp395l4)):
  - Kim's verdict on whether it is really an idle game: "In my opinion, the answer is no."
  - He describes the grind: "Players will get pinched requiring hard currency spend or massive grind
    to level up even the base team of six characters."
  - Interviewed systems designer Jeff Witt: "I would believe that Idle Heroes could monetize more per
    player than Summoners War or Star Wars: Galaxy of Heroes". He attributes this to the grind being
    painful, and it is a design opinion, not a measurement.
- **GameRefinery (analyst Santeri Neuman, April 2021).** "Easy basics and new features are well
  explained", with "Constant ongoing recurring and non-recurring events". The Game Power Score is
  75.4. Category strengths are Brand & publisher (+4.6) and Foundation (+3.2); weaknesses are Scope
  of the game (−3.5) and In-app purchases (−1.3)
  ([GameRefinery](https://app.gamerefinery.com/game/586417adbc85faa91fd38539)).
- **GameRefinery motivation profile (US).** The game over-indexes on *compete with others*
  (3.96 vs a 2.79 Idle RPG average) and *working with others* (3.91 vs 2.57). It also leads on
  *collecting treasure* (4.06 vs 3.63). It sits far below average on *role playing and emotions*
  (1.25 vs 1.96). The top archetypes are Networker (0.24), Treasure Hunter (0.20) and King of the
  Hill (0.20).

**Read:** the game's appeal is status inside a social hierarchy, not story.

### One-line player promise (store-capsule copy)

The App Store subtitle is **"Play Different, Go Idle!"** The description leads with: "Set your
heroes training while you're away. When you return to your phone, they will be stronger, gained new
abilities, and ready for battle." It promises "More than 400 Heroes in different factions"
([App Store](https://apps.apple.com/us/app/idle-heroes-idle-games/id1153461915), mirrored in
[GameRefinery](https://app.gamerefinery.com/game/586417adbc85faa91fd38539)).

### Strategic read for Out of Ruin

Idle Heroes is the clearest available case of an idle-branded game that became a **status economy
for whales**. That economy is built from:

- a cumulative-spend VIP ladder that tops out at about $20,000;
- event rewards keyed to money spent during the event;
- a power layer added every year or two that applies only to new or re-invested heroes;
- since 2022, a real-money player-to-player hero auction.

It worked commercially: about $590M of store revenue, and almost ten years live. The cost is
visible in three places. Revenue has fallen 89% from its 2019 peak. Subreddit volume has fallen by
the same order. The community's most-upvoted complaints are about paywalled events, nerfs and buffs
timed around sales, chore creep, and lost or banned accounts.

Out of Ruin is in a fundamentally different position. It sells gold through Stripe, its gear-card
packs upgrade with duplicates, and it has no PvP. That makes it a single-player power fantasy with
light gacha. The useful lessons are about the specific trust-burning mechanics to avoid as packs,
events and leaderboards arrive, and about the few things Idle Heroes got right.

---

## 2. Core system designs

### 2.1 Idle campaign and offline loot

- **Player-facing intent.** Heroes "train while you're away". You come back to a pile of gold,
  spirit (hero XP), gear and items.
- **Mechanical model.** A six-hero team auto-fights the current campaign stage. Loot accrues at a
  stage-scaled rate up to a cap. Kim notes the unusual placement:
  "Idle Heroes places the collection within the core loop of the game within the campaign battle
  screen", rather than on app open ([DoF](https://www.deconstructoroffun.com/blog/2018/2/27/u6ap146ff5rkmm7fj1qzuhggp395l4)).
- **Data shape.** Per-stage loot rates, plus additive multipliers sold through money:
  - VIP "Auto Battle Bonus" runs from +10% at VIP 1 to +200% at VIP 11–13
    ([wiki, VIP](https://idleheroes.fandom.com/wiki/VIP));
  - the weekly, monthly and quarterly privilege subscriptions add +100% auto-battle gold
    ([App Store](https://apps.apple.com/us/app/idle-heroes-idle-games/id1153461915)).
- **Progression & gating.**
  - Campaign stages are gated by both team power and account level. One App Store reviewer gave 3★
    for the "Leveling cap on campaign": "they only allow you to progress about 3 stages then you
    gotta level up again" (March 2024).
  - Doubled battle speed unlocks at VIP 2 ([wiki](https://idleheroes.fandom.com/wiki/VIP)).
- **Inputs, UI, affordances.** A loot chest on the battle screen, a stage button and a 10-hour cap
  timer. That cap is one of the timers players say they set alarms for
  ([bjei1w](https://www.reddit.com/r/IdleHeroes/comments/bjei1w/), 353 pts).
- **Failure modes & edge cases.** The idle layer is a thin minority of the session. Most time goes
  on dailies across a growing list of modes (2.7). In
  ["Where is idle?"](https://www.reddit.com/r/IdleHeroes/comments/j93doh/) (2020, 520 pts) the top
  comment (119) reads: "you'll only become "truly idle" if you stop playing, f2p btw :)".
- **Why it works or doesn't.** Tying collection to the battle screen pulls returning players into
  the active loop. But selling the idle multiplier through VIP means a VIP 11 player idles at three
  times a free player's rate, forever. The idle promise becomes the first place the spend gap is
  felt.

### 2.2 Hero acquisition (gacha, orbs, re-rolls, event banners)

- **Player-facing intent.** Collect heroes across six factions (Shadow, Fortress, Abyss, Forest,
  Dark, Light). Later tiers add Transcendence and Void lines.
- **Mechanical model and published rates.** The rates below come from the community wiki. DH does
  not publish them on a web page, and the official event notes give multipliers only. The
  [Summon Circle page](https://idleheroes.fandom.com/wiki/Summon_Circle) was last edited 2023-09-27.
  It is sparsely maintained, and some row labels have been vandalised, but the numbers match other
  guides.
  - **Heroic Summon:** 3★ 78.42%, 4★ 20.0%, **5★ 1.58%**. During a Summoning Event the 5★ rate
    rises to 3.16%. Cost is 250 gems per pull or 2,200 per 10-pull, plus one free pull every 48 hours.
  - **Basic Summon:** 5★ 0.05%.
  - **Friendship Summon:** 5★ 0.8%.
  - **Prophet Tree** (faction-choice orbs, unlocks at level 25): a 9% chance of a full 5★ hero in
    the four base factions and 4% in Light/Dark. Orbs can be bought at "one orb … per day 500 Gems"
    ([wiki, Prophet Tree](https://idleheroes.fandom.com/wiki/Prophet_Tree)).
  - **Re-rolls:** Prophet's Blessing re-rolls a 4★ or 5★ hero into a random same-faction hero, at a
    cost of 20 or 100 blessings (same page).
- **The pity counter is gated behind spend.** Per the wiki: "Players who have earned VIP3 or higher
  also receive 10 energy per Heroic Summon. Collecting 1000 energy will grant the player one random
  5★ hero." That gives a guaranteed 5★ every 100 Heroic Summons, **but only for paying VIP 3+
  accounts**. This is the "bar" in the 2018 App Store complaint the first pass found. The VIP page
  confirms it ("Once you're reaching VIP Level 3 you'll unlock the free 5-Star hero summon … after
  earning 1,000 energy", [wiki](https://idleheroes.fandom.com/wiki/VIP)).
- **Event banners with escalating odds.**
  - The official event notes say only that "the odds to summon 5-star heroes from Heroic Summon are
    DOUBLED" and that "There is a higher chance to summon your [Prayer Hero]". The wording is the
    same in the [Oct 2022](https://sites.google.com/view/idleheroespatchnotesoct282022/home),
    [Apr 2023](https://www.reddit.com/r/IdleHeroes/comments/12sur7q/) and
    [Jun 2026](https://sites.google.com/view/1pikxb80yrfzcwyg2qggob2viykhg/%E9%A6%96%E9%A1%B5) notes.
  - The escalation schedule appears only in third-party write-ups.
    [BlueStacks, 11 May 2021](https://www.bluestacks.com/blog/updates/idle-heroes/ih-new-hero-gloria-summon-event-en.html)
    lists "100 times – x2 odds" up to "400 times – x5 odds". It says "the 500th attempt will
    (finally) guarantee you this Forest hero" and that "the progress meter will reset or return to
    zero as soon as you get Gloria".
  - I could not find the multipliers in any first-party text, so this is **community-reported
    mechanics, consistent across 2021–2025 guides, not officially documented**.
  - Since 2022, the "Palace of Eternity / Palace of Crystal" lets players swap the event hero for
    one from "the previous 5 summoning events", paid in Eternal Crystal. More Eternal Crystal comes
    from a "Palace Key" that "can be purchased from Value Packages" (official notes, above).
- **Data shape.** Pull currency (scroll, gem or orb) → star-tier roll → hero roll inside the tier.
  There is a VIP-gated energy counter (1,000 = one 5★) and a per-event counter (100-pull steps,
  hard guarantee at 500). Event milestones pay out on pull counts, "Maximum 4 rounds".
- **Inputs, UI, affordances.** Single and 10-pull buttons, an energy bar (visible only at VIP 3+),
  and event milestone tracks. There is also an achievement for 500 consecutive pulls without a 5★.
- **Failure modes & edge cases.**
  - "I am weirdly proud of achieving this… 500 consecutive summons without a 5*"
    ([jud7dl](https://www.reddit.com/r/IdleHeroes/comments/jud7dl/), 2020, 248 pts). The top comment
    (36) is: "It's even more sad when you realize that the devs know the drop rate is so low, that
    they made it into an achievement".
  - At a 1.58% base rate that streak has roughly a 1-in-2,900 chance.
  - Players also petition for pity on other systems:
    ["Petition: PO Branch Hero Select + Pity Timer"](https://www.reddit.com/r/IdleHeroes/comments/t4re1r/)
    (2022, 201 pts).
- **Why it works or doesn't.** The 500-pull hard guarantee is generous by gacha standards, and it
  makes the big events plannable. Players hoard thousands of scrolls for them. But gating the only
  always-on pity behind VIP 3 teaches the game's real lesson on day one: safety nets are for payers.
  The odds also live only on community wikis and third-party blogs, so every dry streak reads as
  rigging.

### 2.3 Star fusion and the endless "enable" ladder (the fodder economy)

- **Player-facing intent.** Every hero you summon is useful, either as a carry or as material to
  ascend a carry.
- **Mechanical model.**
  - Star-ups consume copies of the same hero plus generic same-star "fodder". Kim: "Star upgrading
    requires the fusion (or sacrifice) of other characters of lesser stars". Witt estimates 5★ to
    10★ "may require 400-500 4 star characters"
    ([DoF](https://www.deconstructoroffun.com/blog/2018/2/27/u6ap146ff5rkmm7fj1qzuhggp395l4)).
  - A 2018 title states the community math directly: "it takes 28 5* heroes to make a 9*... 64 5*
    heroes to make a 10*" ([8qr608](https://www.reddit.com/r/IdleHeroes/comments/8qr608/)).
- **Ceiling raised again and again.** Dates are the first appearance of each layer in r/IdleHeroes
  titles across the full archive:

  | Layer | First seen | Example thread |
  |---|---|---|
  | 10★ heroes | May 2017 | [69es6f](https://www.reddit.com/r/IdleHeroes/comments/69es6f/) |
  | E3 "enable" stages | mid-2018 | [8qr608](https://www.reddit.com/r/IdleHeroes/comments/8qr608/) |
  | E5 | spring 2019 | ["Petition: Stop/ Drastically Decrease Spending…"](https://www.reddit.com/r/IdleHeroes/comments/bjezon/) (209 pts), May 2019 |
  | Transcendence heroes | Sep 2020 | [itntdw](https://www.reddit.com/r/IdleHeroes/comments/itntdw/) |
  | Starspawn (pets) | Jan 2021 | [l1gzsw](https://www.reddit.com/r/IdleHeroes/comments/l1gzsw/) |
  | Soul Awakening / Auction House | Apr 2022 | [uc3rql](https://www.reddit.com/r/IdleHeroes/comments/uc3rql/) |
  | Core of Origin / Sublimation | Jun–Jul 2022 | [v9gdrx](https://www.reddit.com/r/IdleHeroes/comments/v9gdrx/) |
  | X-Upgrade, Starland Arena | Dec 2022 (v1.38.0) | [App Store version history](https://apps.apple.com/us/app/idle-heroes-idle-games/id1153461915) |
  | Ascension of Destiny | Jul 2023 | ["New powercreep - Ascension of Destiny"](https://www.reddit.com/r/IdleHeroes/comments/155njm5/) |

  A 2023 top comment (29 pts) summed it up: "E5-V4-T5-A6... what's next? :D".
- **Data shape.** A per-hero stack of star level, enable tier, imprints, cores, sublimation,
  awakening grade and ascension rank. Each layer has its own currency and its own
  "fodder or paid" bottleneck.
- **Progression & gating.**
  - **Regression** returns copies and most materials. It was announced in December 2018
    ([a59mnm](https://www.reddit.com/r/IdleHeroes/comments/a59mnm/)) and widened in January 2022:
    "All 9-star heroes and below can be regressed. All Transcendence heroes can be regressed"
    ([@idleheroes on X](https://x.com/idleheroes/status/1478208587033821185)).
  - The newest layers are priced at whale scale. On the 8th anniversary, a player wrote: "It will
    cost you up to 1,500 heroic scrolls and 40,000 gems for one sublimation chest… you need 8 Core of
    Origin chests to upgrade 1 hero" ([1dkd9hm](https://www.reddit.com/r/IdleHeroes/comments/1dkd9hm/),
    June 2024, 163 pts).
- **Inputs, UI, affordances.** Fusion screens that ask for named copies plus wildcards, plus a
  regression screen. Players lean on community infographics to plan multi-month builds, for example
  ["Infographic - Transcendence Hero building order"](https://www.reddit.com/r/IdleHeroes/comments/rpqk5s/)
  (263 pts).
- **Failure modes & edge cases.**
  - Each new layer re-ranks the meta and strands earlier investment. "Ever since the cores came out
    I've been falling more and more behind with each update" (top comment, 49 pts, on 1dkd9hm).
  - A 2025 returning player: "power creep went through the roof!"
    ([1kxmgy6](https://www.reddit.com/r/IdleHeroes/comments/1kxmgy6/)).
  - A 2023 user table rates "struggle with heroes changes" as "--": "if you want to change your main
    carry, you have to change a lot (household, imprints, and so on)"
    ([15y57e9](https://www.reddit.com/r/IdleHeroes/comments/15y57e9/)).
- **Why it works or doesn't.** The fodder economy is the game's best retention idea. Kim quotes Witt
  that "every single thing you get in gacha can be used down the road", so no pull is wasted. But
  stacking a new vertical layer every 12–18 months turns sunk cost into an exit ramp.

### 2.4 The VIP ladder

- **Player-facing intent.** A permanent status badge plus bonuses that scale with lifetime spend.
- **Mechanical model.** "One gem is typically worth one VIP Point." VIP is "permanent and
  server-specific … not transferred between servers"
  ([wiki, VIP](https://idleheroes.fandom.com/wiki/VIP)).
- **Data shape.** Thirteen levels; VIP 13 is still the cap in 2026, and no thread mentions VIP 14+.
  Selected thresholds, from the wiki table last edited April 2019:

  | VIP | Points | ≈ USD at 50/$ | Auto-battle | Midas | Tavern quests | Other unlocks |
  |---|---|---|---|---|---|---|
  | 1 | 350 | $7 | +10% | +20% | 6 | |
  | 2 | 700 | $14 | +20% | +40% | 6 | 2x battle speed |
  | 3 | 1,400 | $28 | +30% | +60% | 7 | 5★ summon energy bar, 10x casino |
  | 6 | 18,900 | $378 | +75% | +120% | 8 | |
  | 9 | 187,110 | $3,742 | +130% | +180% | 11 | |
  | 11 | 449,064 | $8,981 | +200% | +350% | 13 | skin forge ([bggirk](https://www.reddit.com/r/IdleHeroes/comments/bggirk/), 104 pts) |
  | 13 | 1,010,394 | **$20,208** | +200% | +400% | 15 | 5x 5★ shards/month on monthly card |

  The wiki itself says VIP 13 "is estimated to cost about $20,000 USD". A March 2026 1★ App Store
  review is titled "20,000$!!!!" and warns "You are plying with people who dump tens of thousands on
  a mobile game!!!!"
- **Progression & gating.**
  - **VIP also unlocks *purchase rights*.** In the Black Friday 2019 "VIP Store", "The higher your
    VIP, the more options you have to buy" ([e3h3i4](https://www.reddit.com/r/IdleHeroes/comments/e3h3i4/)).
  - **VIP points are an event currency.** "Moonlight Gift: During the event, obtain designated
    numbers of VIP points to get abundant rewards"
    ([official notes reposted, 12sur7q](https://www.reddit.com/r/IdleHeroes/comments/12sur7q/)).
    The December 2025 notes give "1 <Christmas Gift Pouch> per 200 VIP EXP"
    ([patch notes](https://sites.google.com/view/1gecwicvn7ifszqfxpvqujovpwinzv/%E9%A6%96%E9%A1%B5)).
  - **Old VIP is re-monetised by later events.** "Up to 9 B+ stones for VIP13, this is gonna be wild"
    ([181zgq4](https://www.reddit.com/r/IdleHeroes/comments/181zgq4/), Nov 2023). One reply (27 pts):
    "Great event if you've dropped money in the past".
- **Inputs, UI, affordances.** A VIP badge in chat, which can be hidden. VIP-only shop rows and
  VIP-threshold reward tracks inside events.
- **Failure modes & edge cases.**
  - VIP rank and money talk become social identity. The community wrote its own taxonomy, the
    ["'Official' (unofficial) Spenders Nomenclature Tier List"](https://www.reddit.com/r/IdleHeroes/comments/c09khf/)
    (2019, 77 pts). It defines "Free to Play (f2p) - Literally VIP0 and only VIP0" and
    "Extremely High Spender/Megalodon - VIP13. Total spending in excess of $20,000… Monthly budget
    of over $800/mo". The top replies are jokes about $36k "f2p" VIP 13s.
  - Mid-ladder spenders stall. A 2024 self-described medium spender at VIP 9 (281,400 points, "IE
    $5,628 over 6 years") is "only 17976 points away from VIP 10. IE $359… But I can't see ANY
    reason or enticement to spend that money" ([1blp39l](https://www.reddit.com/r/IdleHeroes/comments/1blp39l/)).
- **Why it works or doesn't.** VIP converts every purchase into permanent, compounding advantage.
  Idle rate, tavern quests, raid buys, the pity bar and shop access all scale with it, and that
  makes early spend sticky. It also guarantees the free player is permanently behind on every axis
  at once. And at the top it stops working: once a spender sees the remaining tiers as poor value,
  there is no lever left.

### 2.5 Spend-gated events and the price ladder

- **Player-facing intent.** Big seasonal events (Anniversary, Black Friday, Christmas, CNY) with
  premium artifacts, hero copies, skins and avatar frames.
- **Mechanical model.** Event points come from three sources:
  1. hoarded free currency (scrolls, orbs, branches), capped;
  2. cash-only Value Packs, also capped (5 buys per tier);
  3. VIP points earned during the event.

  The top tiers need source 2 or 3.
- **Data shape.** Black Friday 2019 "Shopping Points": "Prophet Orb summon (cap of 320) / Using
  branches to re-roll… (cap of 60) / "Value" packages ($$$, cap of 320)". Only the $70 and $100
  packs carried points (30 and 50) ([e3h3i4](https://www.reddit.com/r/IdleHeroes/comments/e3h3i4/)).
- **Progression & gating.** Some currencies are cash-only:
  - **Thanksgiving 2019:** "the thanksgiving event forces you to spend either $70 or $100 to acquire
    roast turkeys… Aspen Copy: $100 / Amen-ra Copy: $170 / Golden Crown: $400… you must pay cash"
    ([e02sbz](https://www.reddit.com/r/IdleHeroes/comments/e02sbz/), 316 pts).
  - **Black Friday 2020 frame:** "TL;DR: to get the frame, we have to spend 2000 HS, and 800$"
    ([k1t2vv](https://www.reddit.com/r/IdleHeroes/comments/k1t2vv/), 53 pts).
  - **Black Friday 2019 frame:** ["One of my guildmates dropped $700 for the frame..."](https://www.reddit.com/r/IdleHeroes/comments/e3f1ir/).
    That frame carried "permanent pvp bonuses for whales!!" (comment on
    [e2w1r7](https://www.reddit.com/r/IdleHeroes/comments/e2w1r7/)).
  - **2018:** ["The artifact costs $1000+…"](https://www.reddit.com/r/IdleHeroes/comments/7w9ukn/)
    (Feb 2018), and an August 2018 gear set where "To get the rest you must fork over $200"
    ([9639sb](https://www.reddit.com/r/IdleHeroes/comments/9639sb/), 571 pts).
- **Inputs, UI, affordances.**
  - **Relay Packages**: "Purchase the previous package to unlock the next one". In April 2023 the
    chain was "$4.99 / Free / $0.99 / $9.99 / Free / $0.99 / $9.99 / Free / $19.99"
    ([12sur7q](https://www.reddit.com/r/IdleHeroes/comments/12sur7q/)).
  - **Comeback Celebration Gifts** for returning players
    ([Dec 2025 notes](https://sites.google.com/view/1gecwicvn7ifszqfxpvqujovpwinzv/%E9%A6%96%E9%A1%B5)).
- **Failure modes & edge cases.**
  - **The paywall-then-apology cycle is the most-noted pattern in the archive.** "Everytime DH give us
    some shit load of generous craps with one or two good stuff, the following event(s) has paywall
    included" (comment on [erq1t4](https://www.reddit.com/r/IdleHeroes/comments/erq1t4/)).
  - **Regional repricing without notice.** In March 2020 a VIP 7 reported price rises of 30–40% in
    Australia and Brazil while "the in-game interface is still displaying the original amount"
    ([fpnxm1](https://www.reddit.com/r/IdleHeroes/comments/fpnxm1/), 61 pts).
- **Why it works or doesn't.** Selling *event points* instead of gems lets DH charge whale prices
  (~99 gems per $) without discounting the base currency. The monthly cards (560–800 gems per $) then
  keep minnows subscribed. The two-tier ladder is efficient. But because the headline reward of each
  big event is visible to everyone and reachable only by the top tier, every major event doubles as
  a public reminder of the gap.

### 2.6 Auction House and Starry Gems (real-money player trading)

- **Player-facing intent.** Trade "awakened" hero copies with other players.
- **Mechanical model.** Released 20 April 2022 with the Soul Temple ([uc3rql](https://www.reddit.com/r/IdleHeroes/comments/uc3rql/)):
  - Awakening a hero costs 100 Starry Gems (about $4) and rolls a stat grade from E- to SSS with
    random abilities.
  - **Unbound Starry Gems** ("Moneydrops") "can only be acquired by spending money or from selling
    an awakened hero at the Auction House". Only Moneydrops can buy from the Auction House or be
    gifted.
  - Gifting requires "an active monthly card". The guide's author notes the side effect: off-platform
    sellers can trade Moneydrops for cash while "DH gets their $15 commission".
- **Data shape.** SG price ladder: $5 = 100, $10 = 240, $20 = 480, $50 = 1,240, $100 = 2,500.
  Awakening grades run E- … SSS, with Soul Hammer re-rolls of abilities. There are two SG flavours,
  bound and unbound.
- **Progression & gating.** Free players get about 4 awakenings a month from quests.
- **Inputs, UI, affordances.** An auction block with bid and buy-now, a gifting screen and an SG
  mall.
- **Failure modes & edge cases.**
  - **Prices:** ["$1100 bid, $2000 buy it now for a Halora copy"](https://www.reddit.com/r/IdleHeroes/comments/u6h96j/)
    (April 2022, 78 pts). A 2025 1★ App Store review titled "Predatory auction" says "Tier S is sold
    for 1,000,000 starry gems that you can buy 2,500 for 99.99. So it's basically $40,000 for a
    character". The arithmetic matches the SG ladder, but the 1M listing is one reviewer's report.
  - **Automated bans (May 2026).** An anti-farming sweep soft-banned players from the Auction House
    with "error -103", including well-known community helpers. The petition says "When Customer
    Service was asked why, they were given the same boilerplate response of "we can't tell you, you
    just have to maintain good gaming behaviors""
    ([1tg15c6](https://www.reddit.com/r/IdleHeroes/comments/1tg15c6/), 70 pts).
  - An eight-year veteran quit over it: "It seems obvious that they've targeted low VIP players with
    high SG amounts. Support has been completely useless"
    ([1tcxwro](https://www.reddit.com/r/IdleHeroes/comments/1tcxwro/), 123 pts).
- **Why it works or doesn't.** It creates a secondary market that monetises whales a second time and
  gives free players something to sell. It also invites gold-farming. Policing that with opaque,
  VIP-weighted rules hits free and low-VIP players hardest. In a game whose trust problem is
  "the system favours payers", that is the worst possible failure mode.

### 2.7 Mode stack, dailies and Idle Master

- **Player-facing intent.** "Tons of Content… heroic quests, mysterious towers, arena, guild" (store
  copy).
- **Mechanical model.** By 2026 the stack includes Campaign, Tower of Oblivion, Aspen Dungeon (a
  48-hour-on/48-hour-off roguelike run, [wiki](https://idleheroes.fandom.com/wiki/Aspen_Dungeon)),
  Seal Land, Celestial Island, Void Ark and Void Campaign, Star Expedition, Fantasy Arcade, Guild
  Wars, the arenas and the Tavern. Many of these have their own premium currencies.
- **Progression & gating.**
  - Tavern quest slots scale with VIP (6 → 15).
  - One hidden rule found by players: "a 7 star quest… is ~automatically~ granted after 3k gems
    spent on rerolls in a single day" ([dzbu5q](https://www.reddit.com/r/IdleHeroes/comments/dzbu5q/),
    450 pts).
- **Inputs, UI, affordances.** Red-dot notifications everywhere. In January 2022, **Idle Master**
  added one-tap completion of the dailies: "Idle master is an incredible qol-improvement! And it's
  brilliantly implemented" ([rxg3hl](https://www.reddit.com/r/IdleHeroes/comments/rxg3hl/), 112 pts).
- **Failure modes & edge cases.** Chore creep, two years before Idle Master: "The cruft in this game
  has really piled up. Every new feature adds another few minutes to the routine, and I'm getting
  close to dropping this game because of it" ([j8llbr](https://www.reddit.com/r/IdleHeroes/comments/j8llbr/),
  2020, 440 pts). The top comment (138) is "auto smash day mode should be implemented at least". By
  2024 players complain DH "never update Idle Master" (comment, 40 pts, on
  [1dkd9hm](https://www.reddit.com/r/IdleHeroes/comments/1dkd9hm/)).
- **Why it works or doesn't.** Each mode adds a reason to log in and a new sink. Without automation
  keeping pace, the "idle" game ends up demanding more taps every year.

### 2.8 Servers, merges and accounts

- **Player-facing intent.** Small competitive servers where you can rank.
- **Mechanical model.** Accounts are bound to one server and one platform; App Store and Google Play
  progress do not cross over. Servers are merged as they age.
- **Failure modes & edge cases.**
  - Merges reset social standing. In ["Server Merges really makes us F2P want to quit the game"](https://www.reddit.com/r/IdleHeroes/comments/dxltkz/)
    (2019, 234 pts), the poster went from "top 15 in my previous server" to "about top 500 at best.
    The whales are incredible".
  - Account loss dominates recent 1★ App Store reviews. "I reinstalled this game on my new phone and
    was surprised that I was redoing the tutorial on my server. No way to get my old account back"
    (July 2026). "Spent years and hundreds of dollars on the game and one day my account is
    completely gone" (August 2024). There are several similar reviews in the 500-review sample.
- **Why it works or doesn't.** Small servers manufacture early "big fish" moments. Merges then take
  those away from exactly the mid-spenders who bought them, and server-bound accounts with weak
  recovery turn device changes into churn.

---

## 3. Key innovations

1. **A fodder economy where no pull is wasted (2016).** Every duplicate or off-meta hero is fusion
   material ("every single thing you get in gacha can be used down the road", Witt via
   [DoF](https://www.deconstructoroffun.com/blog/2018/2/27/u6ap146ff5rkmm7fj1qzuhggp395l4)). This
   is the most portable idea for Out of Ruin, whose gear cards already level from duplicates.

2. **Idle collection placed inside the battle screen.** Rather than an app-open popup, the reward
   lives where the active loop is (same source).

3. **VIP points used as an event currency.** "Obtain designated numbers of VIP points to get
   abundant rewards" ([12sur7q](https://www.reddit.com/r/IdleHeroes/comments/12sur7q/)). This turns
   every purchase in an event window into progress on a free-looking track. It is commercially
   strong and trust-corrosive (Section 4).

4. **A long, VIP-gated pity, plus a 500-pull hard guarantee and a retroactive banner swap.** The
   VIP 3 energy bar guarantees a 5★ every 100 Heroic Summons. Featured-hero events escalate in
   100-pull steps to a guarantee at 500. The Palace of Eternity lets you swap the event hero for one
   from the last five banners. Together these make huge hoards plannable, which is why the community
   saves thousands of scrolls.

5. **Hero regression.** A full refund path for copies and materials (2018, widened 2022 per
   [@idleheroes](https://x.com/idleheroes/status/1478208587033821185)). It is the main thing that
   kept power creep survivable.

6. **A first-party real-money hero auction (2022).** A player-to-player market settled in a
   cash-only currency, with DH keeping the currency sale
   ([uc3rql](https://www.reddit.com/r/IdleHeroes/comments/uc3rql/)). It is rare in Western-facing
   games, and it is a moderation liability (2.6).

7. **Off-store web top-up with a standing discount.**
   [xsolla-payment.dhgames.com](https://xsolla-payment.dhgames.com), "5% base discount… plus up to
   an extra 8%"
   ([Dec 2025 notes](https://sites.google.com/view/1gecwicvn7ifszqfxpvqujovpwinzv/%E9%A6%96%E9%A1%B5)).

8. **Removing ads and giving the gems away (May 2019).** DH removed rewarded ads and handed out the
   100 daily gems that ads used to pay
   (["ad-free Idle Heroes"](https://www.reddit.com/r/IdleHeroes/comments/bk2kc9/), 292 pts). Players
   still list it as the game's biggest plus in 2023: "+++ no ads"
   ([15y57e9](https://www.reddit.com/r/IdleHeroes/comments/15y57e9/)).

---

## 4. Player frictions & complaints

Scores are Reddit upvotes at archive time. Every quote below was read in the full post body or
comment.

### 4.1 Paywalled marquee events (the #1 cluster)

- **"Let's Send a Message"** (Aug 2018, **571 pts**, 187 comments). "This has got to be, hands-down,
  the worst event I've ever witnessed in Idle Heroes… you can only get enough shards "free"… to get
  a THIRD of what you need. To get the rest you must fork over $200."
  ([9639sb](https://www.reddit.com/r/IdleHeroes/comments/9639sb/))
- **"This Black Friday event is the biggest disappointment DH games has ever produced"** (Nov 2019,
  **359 pts**). A self-described late-game light spender: "Half the rewards(!) are lockes behind,
  perhaps the biggest paywall ever… I will be damned if I ever spend 1 more of my hard earned dollars
  on this company." ([e2w1r7](https://www.reddit.com/r/IdleHeroes/comments/e2w1r7/))
- **"Thanksgiving Event - Will a boycott be necessary?"** (Nov 2019, **316 pts**). Written by a
  player who "can afford to hit VIP13 today if I wanted to". "There is no other way to get these items
  besides buying roast turkeys from the value packs for cash." A reply (90 pts): "This is the second
  one of these." ([e02sbz](https://www.reddit.com/r/IdleHeroes/comments/e02sbz/))
- **"Fuck DH games"** (Dec 2020, 163 pts). "Major events don't reward you for using hs or orbs and
  only reward you for spending hundreds if not thousands of dollars… Heroes became locked behind
  paywalls (looking at you Russell)." ([kjooqj](https://www.reddit.com/r/IdleHeroes/comments/kjooqj/))
- **"Why I'm disgusted and disappointed with the new Christmas event and DH Games"** (Dec 2020,
  186 pts). "This is also probably the biggest paywall event in IH history and it's during
  Christmas." ([kjjc19](https://www.reddit.com/r/IdleHeroes/comments/kjjc19/))
- **"8th Anniversary Again is a Skip"** (Jun 2024, 163 pts). "At a time when a new power creep is
  released, FTP and low spenders are locked out." The top reply (76): "40000 gems and 1500 heroic
  scrolls for ONE sublimation is criminal." ([1dkd9hm](https://www.reddit.com/r/IdleHeroes/comments/1dkd9hm/))
- **App Store, May 2024, 1★:** "this weeks event would need to spend $300 to $500 to have the best
  chance at unlocking all the rewards. And now there are two zones that are completely locked behind
  paywalls" ([RSS](https://itunes.apple.com/us/rss/customerreviews/id=1153461915/sortby=mostrecent/json)).

### 4.2 Power creep that only paying players can follow

- **"Power creep - What it is, why it's the largest problem that will be the death of IH"** (Jul 2017,
  74 pts). The concern dates to year one: "Power creep forces viability of developer chosen heroes
  for (in our case) purely financial gain."
  ([6qi6c0](https://www.reddit.com/r/IdleHeroes/comments/6qi6c0/))
- **"The current game development model leads nowhere.."** (Oct 2018). The poster argues the
  mid-spender (~VIP 9–10) is "MASSIVELY shafted by the meta shifts cause you pay 500$ per month only
  to have your hard built heroes spin out of the meta". The top reply (34): "the whales are their
  largest money source, at least 80% of the whole revenue" (an unsourced belief).
  ([9obbvw](https://www.reddit.com/r/IdleHeroes/comments/9obbvw/))
- **"Let's unite idlers!"** (Mar 2021, 460 pts). Top reply (86): "Drake/Russell and Snow Heart were
  buffed shortly after they were introduced which resulted in the people who didn't scroll/spend to
  miss out". Another reply (44): "do u remember 680$ frame? ppl bought it anyway. do u remember 2000$
  hero? ppl bought it anyway." ([lzgx9w](https://www.reddit.com/r/IdleHeroes/comments/lzgx9w/))
- **"Higher level of Starspawn upgrades is behind a paywall"** (Mar 2021, 205 pts). Reply (44): "I'm
  not gonna pay almost $600nzd to get from level 100 to 140 per pet."
  ([mh2ocy](https://www.reddit.com/r/IdleHeroes/comments/mh2ocy/))
- **"New powercreep - Ascension of Destiny"** (Jul 2023). Top reply (41): "This update just goes to
  show that this game isn't designed for the average joe to have a good time."
  ([155njm5](https://www.reddit.com/r/IdleHeroes/comments/155njm5/))
- **App Store, Oct 2025, 1★, "Good game run by a greedy company":** "they will kill your line up
  every 4-5 years with new pay to win power system that only applies to new heroes".

### 4.3 Balance changes timed around sales (trust in the rules themselves)

- **The Valkyrie nerf (Aug 2018, 308 pts).** A poster relaying the Chinese community says mega-whales
  "threatened to stop supporting the game" over overpowered releases. They say "DH Games deleted
  their posts and banned numerous accounts", and that Chinese store ratings "dropped to around
  3.5-3.8". This is a secondhand account I could not verify independently.
  ([99w2l7](https://www.reddit.com/r/IdleHeroes/comments/99w2l7/))
- **The Tussi affair (CNY 2021).** Support's quoted reply to complaints about the featured hero:
  "sorry that we won´t make any adjustment during the events". The poster's point: "you cannot make
  the players MAKE A DECISION when later you CAN CHANGE or NOT the reward"
  ([lgppm5](https://www.reddit.com/r/IdleHeroes/comments/lgppm5/), 123 pts).
- **Snow Heart buff (Dec 2020).** A reply (18) on
  [kmxr3g](https://www.reddit.com/r/IdleHeroes/comments/kmxr3g/): "they instantly buffed the item…
  when they realized they weren't making the amount of money they expected, to convince people
  spending more on this event before it ends".

### 4.4 VIP status, whales and the social gap

- **Server merges:** "Going from top 15 in my previous server, I have fallen down to about top 500 at
  best" ([dxltkz](https://www.reddit.com/r/IdleHeroes/comments/dxltkz/), 234 pts).
- **"Confessions of a medium spender"** (Mar 2024). "the power creep is such that there's simply no
  chance I can progress at the rate I used to, even spending like I did. I'm falling off the curve"
  ([1blp39l](https://www.reddit.com/r/IdleHeroes/comments/1blp39l/)).
- **"Some people are genuinely extremely wealthy and spend on this game, not every VIP is selling
  their kidney"** (2020, 79 pts, 113 comments). A third-ranked reply (12) describes a player who
  spent "$15k on this one… And then he lost his job"
  ([hd6kz0](https://www.reddit.com/r/IdleHeroes/comments/hd6kz0/)).
- **Departures with regret:** ["Goodbye, amazing community"](https://www.reddit.com/r/IdleHeroes/comments/kjmpej/)
  (Dec 2020, 355 pts). "This day, you'll look back to the amount of money you spent, and there's a
  high chance you'll have some regrets. I have some." The top reply (76): "VIP 11 here and feeling the
  same".

### 4.5 Grind, chores and "where is the idle?"

- ["The time it takes to play this game is getting out of hand."](https://www.reddit.com/r/IdleHeroes/comments/j8llbr/)
  (2020, 440 pts; quoted in 2.7).
- ["Where is idle?"](https://www.reddit.com/r/IdleHeroes/comments/j93doh/) (2020, 520 pts; quoted in
  2.1).
- **"Just Demotivated At This Point…"** (2023). "You have to save months to max an event for a F2P.
  The max for a F2P is not even comparable to a $100 pack."
  ([172e4vs](https://www.reddit.com/r/IdleHeroes/comments/172e4vs/))
- **The 2019 boycott petition after E5** (209 pts). "it is obvious that instead of working on game
  content that everyone can play, they have spent their time on this money grabbing upgrade"
  ([bjezon](https://www.reddit.com/r/IdleHeroes/comments/bjezon/)).

### 4.6 Accounts, support and enforcement

- The Auction House "-103" soft bans of May 2026 ([1tg15c6](https://www.reddit.com/r/IdleHeroes/comments/1tg15c6/),
  [1tcxwro](https://www.reddit.com/r/IdleHeroes/comments/1tcxwro/); see 2.6).
- App Store account-loss reviews (2.8). Plus: "Paid for rewards, didnt receive due to a program
  glitch, support kept asking the same questions" (May 2026, 3★).
- **Misleading acquisition ads.** "Had a add come up on another app to use a code IH999 to get 100
  free summons… a big fat 0 in my summons area" (Sept 2026, 2★, titled "Fun game but lying ads").
  "I downloaded from an add that said I would get 100 total free summons… and I only got FIVE!!!"
  (Dec 2023, 2★).

### 4.7 What players praise (the counterweight)

- **When DH listens, the community rewards it loudly.**
  ["Thumbs up to DH games for a really good X'mas event!"](https://www.reddit.com/r/IdleHeroes/comments/eektt4/)
  (Dec 2019, **491 pts**) praised "something for everyone: from a starting f2p to an end-game
  megalodon". It came one month after the Black Friday revolt.
  ["I think DH deserves some credit…"](https://www.reddit.com/r/IdleHeroes/comments/erq1t4/)
  (Jan 2020, 396 pts) followed, as did
  ["I'm a P2W player, but I appreciate everything DH games is currently doing for the F2P community"](https://www.reddit.com/r/IdleHeroes/comments/hi2dtw/)
  (Jun 2020, 328 pts). The top reply (39) on the last: "F2p people are who expands the game. P2w
  people are what keep the game running. We need both."
- **Patient free-player progress is real.** ["Retrospection of my 20 months old f2p account"](https://www.reddit.com/r/IdleHeroes/comments/h8u1ss/)
  (244 pts) charts steady free progress. An App Store 5★ (Jul 2025): "Has become less P2W over the
  years, strategy and resource management can allow you to go far without money."
- **The community is the moat.** "Idle Heroes creates a community like no one has ever seen and that
  is where their game is most successful"
  ([mai1ky](https://www.reddit.com/r/IdleHeroes/comments/mai1ky/), 323 pts).
- **QoL wins land:** Idle Master, regression, and no ads (Section 3).

---

## 5. Lessons for Out of Ruin

**1. Never sell the safety net.** Idle Heroes gives the always-on 5★ pity bar only to VIP 3+, and
players feel that from the first week (2.2). Out of Ruin's gear-card packs should:

- publish per-rarity odds in the pack UI;
- run a visible pity counter for every player, paying or not;
- keep the odds identical whether the pack was opened with bought or earned gold.

**2. Sell time and convenience in one transparent currency. Do not add a lifetime-spend ladder.**
VIP stacks permanent multipliers (idle rate up to +200%, Midas, quest slots, battle speed,
shop-access rows) on cumulative spend, so a free player is behind on every axis at once (2.4).
Out of Ruin's Stripe gold buys time warps, XP and packs. Keep it that way:

- no cumulative-spend tier that unlocks multipliers or exclusive purchase rights;
- no event track keyed to "VIP points earned".

**3. Keep the price-per-gold curve smooth.** Idle Heroes' subscription cards give 560–800 gems per $,
while event value packs give about 99 gems per $ and exist only to sell event points (2.5). Players
do this math publicly. Out of Ruin's $4.99–$79.99 gold packs should step up gently in value. Event
rewards should never require a specific cash pack.

**4. Add power horizontally, not as a new vertical layer every year.** Every new Idle Heroes layer
(E5, Transcendence, Starspawn, Cores, Ascension) applied only to fresh or re-invested heroes, and
each one produced a "skip / last dance / quit" thread (2.3, 4.2). Out of Ruin's progression already
has a natural horizontal shape: new regions, henchman slots, more cards. Two rules follow:

- new chapters should add breadth;
- a new upgrade axis, if one is added, should apply to existing henchmen and cards too.

**5. Ship a refund path with every irreversible choice.** Regression was Idle Heroes' best trust
repair (Section 3). If Out of Ruin lets players merge or level cards, include a way to recover the
duplicates and XP when the meta or the player's plan changes.

**6. Lock balance before a sale, and never change it after one.** The Tussi and Snow Heart episodes
show that buffing or refusing to fix a featured item after an event punishes whoever chose correctly
(4.3). Rule: if Out of Ruin ever sells a featured card or hero, its numbers are final for the sale
window. Any later buff is retroactive and comes with a refund option.

**7. Automate the chores before they pile up.** Idle Heroes needed until 2022 to ship Idle Master,
after years of "where is idle?" threads (2.7). Out of Ruin's heroes already fire powers
automatically, and henchmen work levels without input. Protect that: every new daily surface
(quests, events) should get a one-tap claim on day one.

**8. Ads must match the game.** The gift-code ads that over-promise ("100 free summons") still
generate angry reviews in 2026 (4.6). Out of Ruin's acquisition creative should show the actual
cascade loop and redeemable offers that actually work.

**The single most important lesson.** Idle Heroes shows that an idle collector can earn
for a decade by making paying players permanently, compoundingly stronger. Its own data also shows
the price. Sensor Tower revenue fell 89% from 2019 to 2025 **[non-audited]**, subreddit volume fell
by a similar order, and the most-upvoted posts in its history are revolts over paywalled events and
mid-sale rebalancing. That is correlation, not proof of cause, but the community attributes the
decline to these practices in its own words. Out of Ruin should never let spend change the odds,
the pity, the idle rate or the rules, because every player can see those.

---

### Gaps not closed

- **Engine.** Not disclosed anywhere I could reach. I did not decompile the client.
- **First-party odds.** No first-party document gives the base summon rates or the per-100-pull
  escalation multipliers. The figures above come from the community wiki and third-party guides.
  Official notes say only "DOUBLED" and "higher chance".
- **Off-store revenue.** Web-shop (Xsolla) and Chinese third-party Android revenue are not in the
  Sensor Tower totals, so true revenue is higher than shown, by an unknown amount.
- **Lilith's stake and the 2022 layoff letter.** Both rest on Chinese secondary sources (Zhihu,
  DoNews) whose article bodies I could not render in full.
