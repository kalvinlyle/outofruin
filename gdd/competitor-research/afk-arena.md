# AFK Arena — Idle Hero-Collection RPG Teardown

Research date: 2026-10-25. Sources are live pages or archived posts as read during this pass. Revenue and download figures are third-party estimates (AppMagic, data.ai) and are tagged non-audited throughout. Treat any single store rating as approximate because the aggregators disagree with each other.

## 1. Snapshot

**Studio and ownership.** Lilith Games, a Shanghai-founded developer (founded 2013 per [Naavik](https://naavik.co/digest/rise-fall-lilith-games/) and [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)). Privately held; no ownership detail in the sources read. Lilith's catalogue is built around [Rise of Kingdoms](https://naavik.co/digest/rise-fall-lilith-games/) and its successor [AFK Journey](https://naavik.co/digest/lessons-learned-from-afk-journey/). Lilith describes its model as "developed in-house, published worldwide."

**Engine and technical posture.** [Wikipedia](https://en.wikipedia.org/wiki/AFK_Arena) states the game uses the Cocos2d engine. Native-app build, no web version in the sources read. This matters for our comparison: AFK Arena is a full native client, while Out of Ruin is a Defold HTML5 web game.

**Release and status.** Global release on 9 April 2019 for iOS and Android, per [PocketGamer.biz](http://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/). One source conflicts: [Naavik](https://naavik.co/digest/rise-fall-lilith-games/) says it launched globally in 2018 alongside Rise of Kingdoms. The 2019 date is the one corroborated by Wikipedia, RAWG and PocketGamer.biz, so this teardown uses 2019. The game is live and still updating in 2026. Its seventh anniversary update landed 7 to 9 April 2026 with a five-star ranger (Serennia), an "astral phenomenon" event and a new Otherworld Fishing mode, per PocketGamer.biz. Latest patch-note entry found is [v1.177](https://afk.guide/afk-arena-v1-177-patch-notes/), dated 18 September 2025 (Grok, Cocoon Knight; a Wishing Shrine). No 2026 patch notes were found in search.

**Platforms.** iOS, Android, and Steam (the Steam version is excluded from the PocketGamer.biz revenue estimate). Web is not listed in the sources read.

**Distribution.** Mobile app stores plus Steam. Publisher-run redemption codes are common, for example the community code site linked from [a search result](https://redeemafkarenacodes.splashthat.com/); that is an unofficial aggregator and should not be treated as a channel.

**Pricing and monetization model.** Free-to-play. Monetization is a gacha for heroes and gear, consumable currency purchases, bundles, two monthly subscription tiers, and in-game ads. [Common Sense Media](https://www.commonsensemedia.org/app-reviews/afk-arena) reports the game "does encourage players to purchase extra in-game currency, items, and even monthly subscriptions." [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club) (2019) describes Advancement Rewards (about 45,000 gems through region 19 for a $19.99 purchase) and Regal Rewards, a battle-pass style track with a $24.99 premium tier. Those are 2019 prices and may have changed.

**Audience scale.**

- Downloads: "more than 45 million" per [Udonis](https://blog.udonis.co/mobile-marketing/mobile-games/afk-arena-analysis) (non-audited, AppMagic-derived). Downloads fell to roughly 200k to 400k per month in 2022, per the same source (non-audited).
- Players: "6.6 million players by June 2019" per [Wikipedia](https://en.wikipedia.org/wiki/AFK_Arena). This is a Lilith-era figure cited by a secondary source (non-audited).
- Revenue, lifetime: "over $1.5 billion" per [PocketGamer.biz](http://www.pocketgamer.biz/afk-arena-celebrates-seventh-anniversary-and-over-15bn-in-lifetime-earnings/), citing AppMagic (non-audited). The same article says the figure excludes Steam, other stores and ad revenue, so the true number is probably higher, and it is a third-party estimate, not a company disclosure.
- Revenue, annual (non-audited, data.ai via Naavik): $147M in 2019, $453M in 2020 (+124% per [Naavik](https://naavik.co/digest/rise-fall-lilith-games/)), $77.3M IAP in 2023 (down 83% from 2020). Naavik's publisher figures put Lilith at $1.08B in 2020 and $625M in 2023 (ranked No. 21).
- Monthly peak: $105.4M in January 2020, per PocketGamer.biz (AppMagic, non-audited). Udonis puts the same month at roughly $80M and about 5M downloads (non-audited). The two sources disagree.
- Regional share, lifetime (non-audited, AppMagic): China 32%, United States 24%, South Korea 11%, Japan 10%.
- Concurrent users: no figure found.

**Review sentiment.**

- App Store: about 4.7 stars per third-party trackers, but the review count varies between about 240k and about 498k depending on tracker and snapshot ([AppFollow](https://apps.appfollow.io/ios/afk-arena/1375425432?country=us), [unitQ](https://www.unitQ.com/unitq-scorecards/afkarena/)). Country stores differ: Germany shows about 4.6 from roughly 56k ratings, the Philippines about 4.7 from about 15k.
- Google Play: about 4.5 to 4.6 on aggregators, with roughly 2.2M reviews in one tracker. Date of snapshot not confirmed, so use with caution.
- Reddit sentiment is mixed-to-negative on the idle economy specifically (see section 4). It is positive on the core collect-and-build loop and on art.

**Critical reception.** Reviews exist from [PocketGamer.com](https://ee.pocketgamer.com/articles/084103/afk-arena-review-away-from-keyboard-but-here-for-fun/), Multiplayer.it and the Arkansas Democrat-Gazette (cited in Wikipedia), and [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club). Deconstructor of Fun is the most critical of the set: it calls the core gameplay "relatively simple," calls the fantasy IP "bland," says the ads "try to look exactly like an idle game," and calls the faction bonus "pretty meagre." It is one critic's view from 2019, not a consensus. The Wikipedia page gives no review scores or aggregator names.

**One-line player promise (store-capsule copy).** Paraphrased from the store listing's framing and the press framing: "Away from keyboard, but here for fun": a free idle RPG where you collect and upgrade a roster of heroes in a vast fantasy world, and progress keeps running while you are away. (The exact store copy was not retrieved in this pass; this is a paraphrase and should be checked against the live listing.)

**Strategic read for Out of Ruin.** AFK Arena is the reference point for what a mature idle hero-collection game looks like at scale. Its revenue profile shows the ceiling: a 2020 peak carried by a large collection depth and an evergreen gacha, with a steep decline once that peak passed and acquisition weakened (see section 5). For Out of Ruin, the important read is that the depth and the gacha are the same engine. Out of Ruin is building a much smaller and lighter version. That is correct for the platform and for the scale, and the question is which parts of AFK Arena's depth to aspire to and which to leave out.

## 2. Core system designs

### Core battle loop

- **Player-facing intent:** Build a team of five heroes, position them, and watch automatic battles. The player is an orchestrator, not a button-presser. Intervention is limited to triggering special skills.
- **Mechanical model:** Heroes attack automatically. The player triggers special attacks manually or taps AUTO to automate those too, per [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club). Positioning matters because faction buffs apply on the battlefield, per [Wikipedia](https://en.wikipedia.org/wiki/AFK_Arena).
- **Data shape:** Heroes have a Class, Type and Role, and belong to one of eight factions (Wikipedia). Deconstructor of Fun (2019) counts six faction types at launch, which shows the faction set expanded between 2019 and the present.
- **Progression and gating:** Stages get harder linearly with spikes at bosses, per Deconstructor of Fun. Completed levels are not replayed; the campaign is a milestone track.
- **Inputs, UI, affordances:** Tap-to-trigger specials, AUTO toggle, team builder with faction grouping.
- **Failure modes and edge cases:** The strategy is shallow at the battle level, which is why critics call the combat simple. The depth sits in roster assembly and faction synergy rather than in moment-to-moment play.
- **Why it works (or doesn't):** The automatic battle keeps the game playable in the background and on the bus. The cost is that the player's skill expression is confined to team comp, which is why the roster and gacha carry so much of the game.

### Faction synergy

- **Player-facing intent:** Reward collecting several heroes from one faction.
- **Mechanical model:** Five heroes of the same faction add a 25% damage and health bonus (per [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)). The article says the game "pushes players toward" this, and calls the single-faction bonus "pretty meagre."
- **Progression and gating:** The synergy threshold becomes the collection goal. Players chase the full-faction stack for their main lineup.
- **Failure modes:** A flat bonus that is weak on its own can force players to build around a faction that is not the strongest. Deconstructor of Fun reads it as a collection nudge rather than a deep build system.
- **Why it works:** It turns a wide roster into a focused lineup without requiring the player to understand a complex rule set.

### Idle progression and AFK loot

This is the system the community argues about most (see section 4).

- **Player-facing intent:** Earn meaningful resources while away. The "AFK" in the title is a promise.
- **Mechanical model:** The recently used team keeps fighting endless enemies while the player is away and earns EXP, coins and weapons. Rewards depend on how far the player has progressed in the campaign (Deconstructor of Fun, 2019). Common Sense Media describes it as players "earn experience and items without even playing."
- **Data shape:** Idle income is tied to stage progression, so it is a function of campaign position. Idle chests and a loot timer (the community has built a tracker app for it; see [Reddit](https://www.reddit.com/r/afkarena/)) give the player a cap-and-collect loop.
- **Progression and gating:** The fact that rewards scale with stage makes the campaign the main lever for idle income, which ties idle to campaign pace. Community posts describe multi-day idle caps being reached before a return.
- **Inputs, UI:** Idle collection screen, timer display, chest collection. Live timers are a core UI element.
- **Failure modes and edge cases:** Players report that the rate and cap make the idle reward feel either too small to matter or too large to bother collecting. Community posts such as ["One of the worst feature ever existed among IDLE GAMES"](https://www.reddit.com/r/afkarena/comments/185s4dq/) (score 254, 71 comments) and ["these rewards..."](https://www.reddit.com/r/afkarena/comments/urg61i/) (score 217, 62 comments) show the frustration. See section 4 for detail. I read the titles and scores, not the full bodies, for these two posts.
- **Why it works (or doesn't):** It creates a reason to come back, which is the core of the genre. It breaks when the reward feels disconnected from effort or when the cap is punishing.

### Hero roster and collection

- **Player-facing intent:** Assemble a large cast of fantasy heroes with distinct personalities and art, and feel the pleasure of collecting them.
- **Mechanical model:** Heroes come from the gacha. Duplicates feed rarity progression and star-up, and the community treats hero count as a primary measure of progress. Deconstructor of Fun (2019) counted 48 heroes at launch. The game has grown well beyond that since, and the sources read here do not give a current total.
- **Data shape:** Each hero has rarity, faction, class, type, role, level, gear slots, artifacts, and a signature item to strengthen (per Wikipedia).
- **Progression and gating:** Heroes level up, equip gear and artifacts, and strengthen signature items. The 2019 article describes an ascension gate that blocks progress until enough duplicates are gathered.
- **Inputs, UI:** Hero grid, detail view, equip screens. Collection is visible at a glance, which drives the completionist loop.
- **Failure modes and edge cases:** Duplicate-driven progression makes a player who has already got the common heroes feel stalled until they get the elite ones. This is the main pressure point of the gacha.
- **Why it works:** The art and fantasy identity are the reason people collect. Without a strong roster identity, the collection loop is only a number.

### Gacha and token system

- **Player-facing intent:** The chase. Pulls for a named hero, with the hope of a rare result.
- **Mechanical model:** Naavik describes a "merge token" system, in which lower-rarity heroes can be merged with duplicates to raise rarity. The base drop rate for the top hero rarity is 4.61% (per [Naavik](https://naavik.co/digest/rise-fall-lilith-games/)). Naavik contrasts this with "solid token" systems in Puzzle & Dragons, Genshin Impact and Empires & Puzzles, where top-hero base rates are 0.6% to 1.3%. Naavik notes the merge-token model is less tested at scale.
- **Data shape:** Tokens are per-hero or per-tier, duplicates are merged, and rarity is a state rather than a separate item.
- **Progression and gating:** Gacha is the main source of new heroes after the early game. Naavik argues the long-term monetization depends on this evergreen mechanic.
- **Pity:** No pity threshold or guarantee was found in the sources read. The closest result is about AFK Journey, which has a wishlist. Do not assume AFK Arena has the same mechanic.
- **Inputs, UI:** Summon screen, pull animation, duplicate merge screen.
- **Failure modes and edge cases:** The merge-token design has been criticised as harder to predict. Naavik flags it as untested at scale. Gacha pressure is visible in the store structure rather than in any single system.
- **Why it works (or doesn't):** The 4.61% top rate is high relative to competing games, which lowers the pull cost per desirable hero. That is a player-facing advantage, but it also reduces the scarcity that drives spending. Naavik's read is that the mechanic is viable but not proven over long periods.

### Campaign stages and chapters

- **Player-facing intent:** A story-driven spine of progress through the world of Esperia (49 regions per Wikipedia).
- **Mechanical model:** Stages are linear, with difficulty rising and bosses as spikes (Deconstructor of Fun). Chapters are the grouping layer, per Wikipedia.
- **Progression and gating:** Campaign position controls idle income, hero unlocks and access to other modes. This makes the campaign the primary progression axis.
- **Failure modes:** A linear campaign with no replay means a player who has passed a stage gets nothing more from it. The campaign becomes a pure gate.
- **Why it works:** Clear milestones and visible progress. The world gives the milestones meaning.

### Game modes

- **Bounty Board, King's Tower, Arcane Labyrinth, Arena of Heroes (PvP for rankings and rewards), Guilds (group missions and events)** per Wikipedia. Arena seasons last 14 days, the Labyrinth resets every 48 hours, and Guild Wars use five one-day rounds, per Deconstructor of Fun (2019). These are 2019 figures.
- **Why it works:** Multiple modes give the player a daily checklist and give the collection a reason to matter (PvP and guild require a strong roster).

### Account and retention systems

- **Live events and updates:** The game runs frequent updates and events. The seventh-anniversary update is one example (per PocketGamer.biz). Stated patch cadence is not confirmed in the sources read.
- **Year-in-review feature:** Shows stats such as enemies defeated, voyages and EXP earned while AFK (per PocketGamer.biz). This is a retention and sharing touch aimed at the collection player.
- **Accounts:** The sources read do not describe account structure beyond the usual mobile login.

## 3. Key innovations

- **Auto-battle with a manual skill layer.** The combat design lets the player stay out of the fight while keeping a small set of decisions (when to trigger specials). Deconstructor of Fun calls the core loop "very simple," and that simplicity is what allows the background play.
- **Idle as a stage-scaled income source.** Tying idle rewards to campaign position makes the campaign a reason to return and an income lever at the same time. This is a deliberate tie between two loops.
- **Faction synergy with a collection nudge.** The five-of-a-kind bonus turns a wide roster into a focused lineup, and it makes every new hero of an existing faction valuable.
- **Merge-token gacha.** The merge-token system is an alternative to the solid-token model used by most gacha games. Naavik calls it a notable choice that remains untested at scale (per Naavik). It is a live experiment for the genre rather than a proven model.
- **Year-in-review.** A recap of idle and collection stats that reinforces the AFK identity of the game.

## 4. Player frictions & complaints

These are sourced from community posts, store reviews, and third-party reviews. The Reddit items below are titles and scores only; I did not read every full body in this pass, so treat them as sentiment indicators rather than verified quotes.

**Idle reward economy (the largest complaint cluster).**

- ["One of the worst feature ever existed among IDLE GAMES"](https://www.reddit.com/r/afkarena/comments/185s4dq/) (score 254, 71 comments). The title is the complaint, and the thread is the most upvoted in the subreddit's idle-related posts.
- ["May I say that this event is pretty cool, but these rewards..."](https://www.reddit.com/r/afkarena/comments/urg61i/) (score 217, 62 comments). The title notes that the event rewards are similar to idle chest rewards, which reads as a complaint about low event value.
- ["T3 stones in afk loot confirmed. Was for 8.5 days idle at this stage. Ch34"](https://www.reddit.com/r/afkarena/comments/mgcxns/) (score 180, 63 comments). A player's data point on how long the idle cap takes to fill at a given campaign stage.
- ["Open letter: Just because Idle Heroes suck doesn't mean Afk Arena has to"](https://www.reddit.com/r/afkarena/comments/biduge/) (score 91, 50 comments). A post calling for AFK Arena not to copy the weaker idle design of a competitor.
- ["The Math behind Idle Rewards"](https://www.reddit.com/r/afkarena/comments/fflsv8/) (score 133, 32 comments). A player analysis of the idle formula. The thread's existence shows players reverse-engineer the curve.

**Store-review sentiment.** The "Products & Purchases" category in Common Sense Media is rated "a little" for the purchase prompts (per [Common Sense Media](https://www.commonsensemedia.org/app-reviews/afk-arena)). The review notes the game is free and progress does not require spending, but it pushes purchases. A Spanish-language review in [culturageek](https://culturageek.com.ar/review-afk-arena-estrategia-calma-y-astucia-en-android/amp/) makes the same point in a lighter way: the game sometimes rewards you more for not playing than for playing. Specific Google Play review text was not retrieved in this pass; the unitQ scorecard lists one Android review saying "Rowan's pop ups are annoying" and asking for auto battle for everyone. That is a single data point.

**Gacha pressure.** The community discussion in the sources read concentrates on idle and not on gacha odds, but the pattern from the [Naavik](https://naavik.co/digest/rise-fall-lilith-games/) analysis is that the merge-token system makes elite heroes less predictable, and the 2019 Deconstructor of Fun review says the duplicate gate pushes the player toward spending or long grinding. Treat the second point as the reviewer's reading, not as a player quote.

**Presentation and identity.** Deconstructor of Fun calls the fantasy IP "bland" and the graphics "relatively simple" compared to competitors (2019). The art reputation of AFK Arena has been strong in community discussion, so this critique is one critic's view.

**Ad disclosure.** Deconstructor of Fun says the ads "try to look exactly like an idle game." That is a design-ethics complaint in the 2019 review. The sources read do not show a current official response.

**Competition from the sequel.** AFK Journey, released March 2024, has outearned AFK Arena since its launch and nearly doubled its revenue in 2025 (per PocketGamer.biz). The sequel is a reason for AFK Arena's player base to shrink, which Naavik notes is the "reduced support" argument (Naavik suggests reduced support for AFK Arena contributed to revenue loss).

## 5. Lessons for Out of Ruin

**Emphasis lens: the fantasy ceiling of idle RPGs.**

AFK Arena shows what a mature hero-collection idle game can reach. The ceiling is set by four things working together: a large roster with distinct art and personality, AFK loot that rewards being away, a linear campaign that scales the loot, and a gacha that makes each new hero an event. At its peak, it was one of the largest mobile grossers in the genre (non-audited figures above). The lesson for Out of Ruin is not that it should copy the gacha, but that each of these four parts supports the others, and removing one weakens the rest.

**What Out of Ruin's heroes and gear could aspire to.**

- A roster of heroes with memorable identity. AFK Arena's fantasy IP has been criticised as "bland" in one review, yet its roster identity is still what people collect. Out of Ruin's dungeon-and-henchman fantasy has more humour, which is an identity AFK Arena does not have. The aspiration is a roster whose characters are recognisable on sight.
- Faction or cascade synergy that rewards building a focused lineup. AFK Arena's five-of-a-kind bonus is a simple collection nudge. Out of Ruin's cascade (higher-level henchmen producing more henchmen below) is already a synergy system. The aspiration is to make its synergies visible and collectable, not to add a second layer of stats.
- Idle rewards that feel earned. The top complaint thread in the subreddit is about idle rewards feeling too small or too capped. Out of Ruin should define its idle income cap and the rate curve deliberately, and make the number the player sees match the effort they put in.
- Campaign stages that are more than gates. AFK Arena's linear, non-replayable campaign is the main reason idle income and progression are tied together. Out of Ruin's chapter quest lists already do this with loot. The aspiration is to make the chapter the thing that changes what the idle system does, not only a progress counter.

**How much depth and gacha pressure to deliberately leave out.**

- **Leave out the merge-token gacha and the high-volume hero pull as the core spending loop.** The 4.61% top-rate design is a distinctive choice that Naavik calls untested at scale, and AFK Arena's own sequel moved to a different token model. A simpler gear-card system (45 cards with duplicates and XP) already gives Out of Ruin a collection loop without a summon-driven spend.
- **Leave out the battle-pass tier and the stacked store (Advancement and Regal Rewards style) in the early product.** The 2019 price structure is the kind of pressure that reviewers and communities criticise. Out of Ruin's gold packs already sit in a simple structure; keep it that way.
- **Leave out the sheer roster count.** AFK Arena's 48 launch heroes grew into a very large collection. Out of Ruin's 15-henchman design already gives a complete roster. Depth from a large roster creates the grind that drives the sharpest idle complaints.
- **Leave out ad disclosure that mimics idle play.** Deconstructor of Fun criticised ads that look like the game. Out of Ruin should keep any ad surface clearly separate from the game's own UI.

**Specific lessons, ranked.**

1. Make idle income legible. Show players the cap, the rate and the time until full, in plain numbers. The most upvoted AFK Arena threads are about the idle economy feeling opaque or unrewarding. A visible timer and a clear reward formula are cheaper than a complaint thread.
2. Tie idle to the chapter, as AFK Arena does with campaign position, but make sure a chapter completion visibly changes what the idle system pays. This is the strongest single idea to adopt from the teardown.
3. Keep the roster identity strong and the roster count small. Out of Ruin's characters and henchmen are its differentiator in a crowded category. Name them, give them a personality, and make each one worth collecting.
4. Build synergy as a visible rule on the cascade, not as a hidden stat. AFK Arena's faction bonus is simple and shows the player what to collect. Out of Ruin can do the same with its level-based cascade.
5. Do not copy the gacha depth. The sequel shows AFK Arena's player base shifting to a different token model, and the reception suggests gacha pressure is a real source of friction. Out of Ruin's gear-card system with duplicates is a lighter loop that still gives collection without a summon treadmill.
6. Keep store and ad surfaces clearly separate from the game UI. The "looks like an idle game" critique is about trust, and trust is what keeps a long-tail idle player.

**Unverified items to check before relying on them.** The exact current store description and rating, the current hero count, whether a pity system exists in AFK Arena today, the present patch cadence, and the full bodies of the top Reddit posts. These were not confirmed in this pass.
