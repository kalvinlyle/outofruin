# Idle Heroes — Idle Auto-Battle Hero Collector Teardown

Research date: 2026-10-25. Store figures were read from pages at fetch time and may already be stale. Figures marked **[non-audited]** come from third-party aggregators, marketing pages, press recollection, or a single secondary source and should not be relied on as fact.

## 1. Snapshot

**Studio and ownership.** The App Store seller is listed as "DHGames Limited" ([App Store listing](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US)), but the store copyright line reads "Droidhang Inc 2016" in the same listing, and [GamePressure](https://www.gamepressure.com/games/idle-heroes/z04dc5) describes the developer as the Chinese studio DroidHang. Treat the publisher/developer chain as "DroidHang group, sold under DHGames Limited" and verify before citing. There is no Wikipedia article for the game at the time of research: a direct fetch of [en.wikipedia.org/wiki/Idle_Heroes](https://en.wikipedia.org/wiki/Idle_Heroes) returned 404.

**Engine and technical posture.** Not disclosed in any source I found. The game is a native mobile build distributed through Google Play, the App Store and third-party APK sites, with no public statement of engine choice.

**Release and status.** Per [GamePressure](https://www.gamepressure.com/games/idle-heroes/z04dc5), Android launched 22 June 2016 and iOS launched 9 November 2016. The game is still live. The [App Store listing](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US) shows version 1.39.3 dated 26 November 2025 as the latest at fetch time. Its update notes list Fantasy Arcade modes (Heroic Breakout, Pioneers' Race, Collaborative Journey), six new heroes and new skins. The notes for 1.39.1 through 1.39.3 appear identical to each other and to 1.28.0, which suggests copy-pasted release notes.

**Platforms.** iOS, Android, with APK distribution on third-party sites such as [fileplanet](https://idle-heroes.fileplanet.com/apk). No PC or web build surfaced in research.

**Distribution.** Free to download on both stores. The App Store page lists the age rating as 9+ and the Google Play listing shows in-app purchases. Official community and support pages are secondary to a large Reddit community at [r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/).

**Pricing and monetisation model.** Free-to-play with a heavy microtransaction layer. [GamePressure](https://www.gamepressure.com/games/idle-heroes/z04dc5) quotes the store description directly: the game "employs a microtransaction system," and "by buying various items, you can significantly speed up some of the processes." The App Store listing shows:

- Heroic Summon Scroll Package 1 at $9.99 and Package 2 at $19.99.
- Hero Package 1 at $49.99 and Hero Package 2 at $69.99.
- Subscriptions: a "Consecutive Weekly Privilege" with a free trial and a $0.99 weekly price shown elsewhere on the page, a monthly tier at $3.49 and a quarterly tier at $9.99.
- Event packages from $4.99 to $99.99, and "best value" packages at $4.99 and $14.99.

The weekly price is shown inconsistently across the page, so pricing should be re-checked before use. The main monetisation spine is a **VIP tier system**. The 2018 [GameMakers article](https://gamemakers.beehiiv.com/p/idle-heroes-made-100m) describes it as "13 levels of VIP," with bonuses tied to gem purchases: daily bonus, hero slots, hero quests and "many other bonuses depending on the amount of gems purchased." Reddit threads from 2019 through 2026 treat VIP level as the core social status signal, with VIP 8 to VIP 10 accounts discussed as a class of their own (see Section 4).

**Audience scale.**

- App Store: about 4.8 out of 5 from roughly 107K ratings at fetch time ([App Store](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US)).
- Google Play: about 4.7 out of 5 from roughly 1.1M reviews, as reported by a search summary of store data ([AppPricingLab listing](https://apppricinglab.com/app/google_play/com.droidhang.ad)). The Google Play page itself was not fetchable in this session. **[non-audited]** for the exact count.
- Revenue: a February 2018 [GameMakers article](https://gamemakers.beehiiv.com/p/idle-heroes-made-100m) claims "an estimated $70MM in accumulated net revenue" at that point, and its headline says "$100M," which conflicts with the body. It is a secondhand, 2018 figure attributed to industry commentary. **[non-audited]**, and should be treated as marketing-adjacent.
- Concurrents, MAU and DAU: no reliable public number found. **[non-audited / unknown]**.
- The [GamePressure](https://www.gamepressure.com/games/idle-heroes/z04dc5) user score is 6.0 with no written user reviews on that page, so it adds little.

**Review sentiment.** Store sentiment is broadly positive on the stars and negative on the monetisation text. The App Store page's own curated excerpts include a 2021 complaint that progress without spending is "very hard" and that level 113 feels roughly like level 30 did, and a 2018 review saying VIP3 is needed to use a bar on Heroic Summons. Positive excerpts cite the PvE content letting players "advance at their own pace." Reddit is more polarised than the stores: the tone is loyal and help-seeking on most days, with recurring anger about summon luck and VIP-gated value.

**Critical reception.** Limited mainstream press. The strongest analytical piece found is the [GameMakers](https://gamemakers.beehiiv.com/p/idle-heroes-made-100m) article (2018), which frames the game as "a very good game for any professional F2P game designer to study." It quotes designer Jeff Witt on monetisation: Idle Heroes "could monetize more per player" than Summoners War or Star Wars: Galaxy of Heroes, because the grind is painful enough to push players into the metasystems. That quote is reported secondhand and is a design-intent claim, not a measured outcome.

**One-line player promise (store copy).** Heroes train while you are away, and come back stronger with new abilities. Over 400 heroes across factions, with gear to forge and a campaign from Sara Forest to High Heaven, per the [App Store listing](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US) and [GamePressure](https://www.gamepressure.com/games/idle-heroes/z04dc5).

**Strategic read for Out of Ruin.** Idle Heroes is the reference case for a long-running collector that chose depth of roster and VIP-gated convenience as its revenue engine. It has clearly earned large sustained revenue and a loyal core, and it has paid for that with a community whose most-discussed topics are power creep, summon luck, and the social cost of being a non-payer. Out of Ruin's cascade and henchman design is more legible than a 400-hero roster, which means our power curve is easier to make visibly fair, and our monetisation should avoid the stacked VIP tiers that Idle Heroes uses to convert whales.

## 2. Core system designs

**Idle heroes that train offline.**

- Player-facing intent: heroes keep progressing while the app is closed, so returning is rewarding.
- Mechanical model: heroes train in the background and return stronger with new abilities, per the [App Store copy](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US). The GameMakers article notes the idle progress is collected inside the campaign battle screen rather than only on app open, which is a deliberate placement choice.
- Data shape: unknown from public sources.
- Progression and gating: offline training is free; the gating is on the roster and on gear.
- Inputs, UI and affordances: the collect moment is tied to the battle screen, so the player sees the reward during active play.
- Failure modes: a returning player who has been away for weeks may face a much stronger roster than their own, which community posts describe as a catch-up trap (Section 4).
- Why it works or doesn't: it creates a return reason, but the GameMakers article suggests the idle layer is intentionally thin so that the grind pushes players into paid metasystems. For Out of Ruin this is the cautionary half of the lesson: a faster idle loop reduces friction, while a deliberately painful grind is a monetisation lever.

**Hero collection with star, level and destiny-style upgrades.**

- Player-facing intent: heroes are the main collection object, and each one has an upgrade path.
- Mechanical model: heroes are summoned, leveled, starred and evolved. Reddit threads reference "transcendence" (a high-tier evolution), "Nirvana," "star soul" awakenings, "destiny" transitions and "core" investments. Multiple paths consume the same resources, which produces the "which hero do I destiny next" question that dominates the subreddit ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1ppyoms/updated_new_player_guide_2026/)).
- Data shape: unknown publicly beyond the community's naming.
- Progression and gating: transcendence gates content (campaigns and modes), and several gates are paid or time-gated through VIP.
- Inputs, UI and affordances: tapping into hero screens and selecting which one to invest in. The heavy naming and ladder of upgrades is a learning cost.
- Failure modes: the community treats most of the roster as obsolete over time. A Reddit post titled "I am lost at what I need" describes a player whose main damage dealer was overtaken by newer heroes that do not work with his team ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/)). Another post asks whether a long-invested hero should be "regressed" or cut because a newer one arrived ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/)).
- Why it works or doesn't: it creates deep collection and sunk-cost attachment, which is exactly the retention engine. It also makes earlier investments fragile, which is the core power-creep complaint.

**Summons and escalation odds.**

- Player-facing intent: summon heroes from a pool with a chance at five-star results.
- Mechanical model: the 2025 Christmas update, per the [BlueStacks write-up](https://www.bluestacks.com/blog/updates/idle-heroes/ih-christmas-update-en.html), says "Failed summon attempts now contribute toward escalating odds," and "Once a five-star hero is successfully summoned, the counter resets." It also says "Every milestone increases the summoning multiplier." Base five-star rates are not published in that write-up. The article is a promotional guide, not an independent source.
- Data shape: an escalation counter that resets on a five-star pull.
- Progression and gating: the Heroic Summon Scroll packages ($9.99 and $19.99 on the store page) are the direct purchase path. A 2018 App Store review says VIP3 is required to use a bar on Heroic Summons ([App Store](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US)), which means VIP gates the summon interface itself.
- Inputs, UI and affordances: a summon screen with a visible escalation bar. This is good for transparency about the pity mechanic.
- Failure modes: the Reddit title "Sacred awakening? More like sacred scam" (score 28, 2026) is a player reacting to a poor roll after investing, and similar "scam" framing recurs on high-scoring posts ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1tx84js/)). Without published base rates, every bad streak reads as manipulation.
- Why it works or doesn't: an escalation counter reduces rage by guaranteeing eventual progress, but the lack of published odds means players cannot tell whether the counter is generous. The "scam" framing shows that opacity drives distrust even when a mechanism exists.

**VIP tiers.**

- Player-facing intent: a status and bonus ladder driven by cumulative spend.
- Mechanical model: 13 levels per the [GameMakers](https://gamemakers.beehiiv.com/p/idle-heroes-made-100m) article (2018). Bonuses scale with gems purchased. Reddit posts show VIP level as a visible identity: a 2022 thread asks whether anyone has seen a VIP 10 account with four transcendent heroes but no completed Aspen ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/s1a4hz/)).
- Data shape: cumulative paid gems mapped to a level, with VIP-only rewards in chests and events.
- Progression and gating: VIP unlocks summon bars, the VIP selection chest, VIP-only event rewards and daily bonuses. A 2024-to-2025 comparison post reports that VIP-tier gem and CSG packages rose "by a noticeable margin" year over year ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1p7y1aa/)).
- Inputs, UI and affordances: a VIP badge, VIP-gated shop items, and event pages that reference VIP. A Black Friday post says the sale is "INSANE...for VIP" ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/18255xt/)).
- Failure modes: a Reddit post titled "This event is so much pay to win (or at least good rewards...)" ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/zwk6p9/)) captures the core conflict: a free player can complete the event but not the VIP-gated portion.
- Why it works or doesn't: VIP is the spend engine (whales are the target market), and the status ladder works socially. It works against trust for free and low-spend players, who are visibly second class in-game.

**Gear and artifacts.**

- Player-facing intent: equipment that changes how heroes fight, with upgrade and fusion paths.
- Mechanical model: artifacts such as "Mysterious Artifacts" and treasure sets with star levels, plus equipment fusion. A Reddit post asks whether fusing equipment for "+10k in attack" per set has a cap, which implies linear, uncapped stat growth ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1x92tr1/)).
- Data shape: per-item stat blocks with a fusion counter.
- Progression and gating: artifacts are sometimes bought with a currency (glorious relics), which can be earned or purchased.
- Failure modes: the community notes that stat growth scales with spend and feeds the power-creep loop.
- Why it works or doesn't: deep stat stacking gives visible progress, but uncapped and unbalanced stacking drives the "I can't keep up" dynamic.

**Campaigns, events and modes.**

- Player-facing intent: a long campaign with chapters and many event modes such as Void Campaign, Team Up Arena, Glory Challenge, Fantasy Arcade and Pioneers' Race.
- Mechanical model: stage-based auto-battle with hero-team composition puzzles. Events are time-limited and often include VIP-gated rewards.
- Failure modes: Team Up Arena reports include bot-dominated divisions. One post describes a player "hard stuck at rank 26000-ish" with only bots in the division ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1xc74e1/)). A separate event complaint ties a Brave Trial to gem spend: "The new brave trial is a complete scam," from a self-described VIP 6 payer ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/bpbwqr/)).
- Why it works or doesn't: events drive engagement, but matchmaking and gating issues erode trust fastest in competitive modes.

**Social and account layer.**

- Player-facing intent: guilds, arena, world chat and bond codes.
- Mechanical model: guilds with recruitment threads, arena PvP, and world chat.
- Failure modes: world chat is described as hostile to criticism and dominated by spenders in one review excerpt aggregated from third-party sites. The Reddit community sells and gives away accounts: multiple VIP 9 and VIP 10 account giveaways and sales appear on the subreddit, with some giveaways requiring proof of being an "active hardcore player" ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/14egf5k/)). Account trading is a symptom of accounts holding paid value.
- Why it works or doesn't: social features retain players, but the account economy shows that paid progress has a real-world resale price, which is a risk for the publisher.

## 3. Key innovations

**Escalation summon counter.** The 2025 update's escalating odds reset on a five-star pull ([BlueStacks](https://www.bluestacks.com/blog/updates/idle-heroes/ih-christmas-update-en.html)). It is a pity system that guarantees progress, which is a useful model for Out of Ruin's future gear or hero pulls. The lesson is that the counter is only trusted when visible and when the odds are stated.

**Idle collection inside the core battle screen.** The GameMakers piece describes placing idle progress collection in the campaign battle view rather than on app open ([GameMakers](https://gamemakers.beehiiv.com/p/idle-heroes-made-100m)). This ties the reward to active play and makes the idle layer feel less like a timer.

**Long-running metasystems on a thin idle core.** Per the same article, the design copies metasystems from Heroes Charge-style games and wraps them around an auto-battle core ([GameMakers](https://gamemakers.beehiiv.com/p/idle-heroes-made-100m)). The novelty is the wrap, not the core.

**Community ecosystem.** The subreddit's pinned megathreads, guides and FAQ wiki (see the [r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/) sidebar links) substitute for in-game onboarding. This keeps the game alive without a large tutorial budget.

## 4. Player frictions & complaints

**Power creep and obsolescence.**

- The App Store page excerpt from 2021: progress without spending is very hard and rewards barely scale, with level 113 said to yield about what level 30 did ([App Store](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US)).
- A returning player on Reddit describes investing in a hero that no longer fits the team, and says the game "feels like Williams just has 1 single team" ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1x962g9/)).
- A player asks whether to "retire" a hero they can't sell because it is soulbound, to fund a newer hero's progress ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1xbrmbh/)).

**Summon luck and perceived manipulation.**

- "Sacred awakening? More like sacred scam" (score 28) describes a low roll after spending ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1tx84js/)).
- "Waste your life savings" (score 14) is a short complaint thread ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/)).
- The App Store 2018 excerpt: VIP3 needed to use a bar on Heroic Summons, and rare heroes described as hard to obtain ([App Store](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US)).

**VIP gating and pay-to-win.**

- "This event is so much pay to win (or at least good rewards...)" (score 19) ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/zwk6p9/)).
- A VIP 8 self-reported spender, with approximately $2,500 to $3,000 spent, posts a discussion thread (score 53) about occupations and spend ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/w167s8/)). This is a self-reported figure and **[non-audited]**.
- A post reports paying "$70" for a VIP 10 chest ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/z2oqa3/)).
- A low-spender VIP 4 player asks whether a copy should be auctioned, showing the in-game auction market is part of the economy ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1wfsnrp/)).
- On a hero nerf fear: "Will she be NERF soon? ... Because Some people is spending money for her" (score 0), which captures the fear that paid heroes will be nerfed or devalued ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1x9gkk4/)).

**Catch-up and returning-player problems.**

- A returning player with an old account asks which artifact to buy with 400 relics, having already regretted an earlier purchase ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1x8q4sc/)).
- Another returning player asks where a mysterious artifact can be obtained as F2P, which implies the path is unclear ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1xe7tlt/)).

**Matchmaking and bots.**

- A Team Up Arena player reports only bot teams in a division, with human guild leaders seeing humans in the same division, and being stuck at rank 26,000-ish ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1xc74e1/)).

**Account and retention cost.**

- Account giveaways of VIP 9 and VIP 10 accounts appear repeatedly, sometimes with proof-of-activity requirements ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/195ruk3/)). This signals that paid accounts have resale value and that some players leave when the account's investment becomes unplayable.
- A post asks whether sending "starry gems" between accounts without VIP Monthly risks a ban, which shows players are unsure of the rules around transfers ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/11zyth0/)).

**Bugs and friction.**

- A player reports that a 6-star "Lethia" cannot be selected for the normal 5-star version, which suggests a bug in the evolution UI ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1xaq6e6/)).
- A player cannot swap a hero because of an awakening state error ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1xdeekm/)).

## 5. Lessons for Out of Ruin

**Publish the odds.** Idle Heroes' escalation counter is a good mechanism, but without published base rates every bad streak is read as a scam ([BlueStacks](https://www.bluestacks.com/blog/updates/idle-heroes/ih-christmas-update-en.html), [r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1tx84js/)). Out of Ruin's card packs should publish drop rates and any pity rule in-game from day one.

**Do not gate power or convenience behind a status ladder.** VIP 13 levels, VIP-gated summon bars and VIP-only event rewards turn spend into social rank, and the subreddit treats VIP level as identity ([GameMakers](https://gamemakers.beehiiv.com/p/idle-heroes-made-100m), [App Store](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US)). Out of Ruin's gold sales should sell time and cosmetic-free convenience, and never a gated mechanic that free players cannot reach.

**Keep upgrades from obsoleting investment.** Power creep and "retire the old hero" dynamics are the top complaint category ([App Store](https://apps.apple.com/us/app/idle-heroes-%EC%95%84%EC%9D%B4%EB%93%A4-%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/id1153461915?l=en-US), [r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1x962g9/)). Henchmen on a higher level already cascade production, so Out of Ruin's power curve should be designed so older henchmen remain useful at their level, not replaced by a newer tier at every chapter.

**Cap uncapped stacking.** Equipment fusion with linear, uncapped attack gains produces the power-creep loop the subreddit describes ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1x92tr1/)). Gear cards (45 today) should have clear diminishing returns or caps on upgrade stacking.

**Match fairly, or show it is fair.** Bot-dominated divisions erode trust in competitive modes ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1xc57m6/)). Out of Ruin has no leaderboards today, so the risk is currently low, but any future ranked content needs transparent matchmaking.

**Protect the free player's path.** Multiple free-to-play posts ask where key items come from and how to progress without spending ([r/IdleHeroes](https://www.reddit.com/r/IdleHeroes/comments/1xe7tlt/)). Out of Ruin's chapter-based quest lists are a clear path; keep every chapter's unlock reachable through play so free and paying players both see completion.

**The single most important lesson.** Idle Heroes shows that a loyal, long-lived community can coexist with a VIP ladder and paid summon bars, but the cost is a community whose most-discussed topics are "scam," "pay to win," and account resale. Out of Ruin should keep its spend strictly to time, convenience and optional cosmetics, publish every odds number, and make power growth visibly fair, so that trust compounds instead of being spent.
