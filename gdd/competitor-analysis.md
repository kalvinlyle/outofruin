# Out of Ruin — Competitor Analysis

Out of Ruin sits at an unusual intersection: a **fantasy fight and roster** (monsters to tap down, heroes with auto-firing powers, henchmen, gear cards) on top of a **cascading idle economy**, shipping as a **native iOS and Android app** with **no ads, ever**.

The mobile idle market splits into games with deep rosters that sell power, and games players call fair that have shallow rosters or no fight.
This analysis maps that split and where Out of Ruin can fit. The design commitments that follow from it are in [direction.md](./direction.md).

Positions, scores and chronology summaries here are editorial; the sourced depth is in the per-game files.
All revenue and download figures are Sensor Tower estimates from the Supercell data warehouse (in-app purchases only, ad revenue excluded) and are **non-audited**.

## The rings

**Ring 1 — Tap-to-fight fantasy RPG** (shares the tap combat and hero fantasy)

- [Tap Titans 2](./competitor-research/tap-titans-2.md)

**Ring 2 — Production-chain idlers** (share the cascading economy and milestone ranks)

- [AdVenture Communist](./competitor-research/adventure-communist.md)
- [Idle Miner Tycoon](./competitor-research/idle-miner-tycoon.md)
- [AdVenture Capitalist](./competitor-research/adventure-capitalist.md) (light tier)
- [Egg, Inc.](./competitor-research/egg-inc.md) (light tier)

**Ring 3 — Idle hero collectors** (share heroes, gear and the fantasy ceiling)

- [AFK Arena](./competitor-research/afk-arena.md)
- [Idle Heroes](./competitor-research/idle-heroes.md)

**Ring 4 — Indie and web idle classics** (share the small-team posture and web roots)

- [Idle Slayer](./competitor-research/idle-slayer.md)
- [Cookie Clicker](./competitor-research/cookie-clicker.md) (light tier)

Audience work is in [player-research/](./player-research/), ending in [win-strategy.md](./player-research/win-strategy.md).
The interactive positioning plot is [competitor-axis.html](./competitor-axis.html).

## Scale

| Game | Lifetime IAP revenue | Peak year | Latest full year |
|---|---|---|---|
| AFK Arena | ~$1.09B (all store versions) | 2020 | $23.9M (2025) |
| Idle Heroes | ~$590M | 2019, $147.5M | $16.7M (2025) |
| Idle Miner Tycoon | ~$120M | 2019, $20.9M | $6.7M (2025) |
| Egg, Inc. | ~$65M | 2021, $15.2M | $6–7M a year since 2023 |
| Tap Titans 2 | ~$59.6M | 2018, $11.7M | $2.2M (2025) |
| AdVenture Capitalist | ~$37M | | |
| AdVenture Communist | ~$36M | 2019, $8.96M | $2.8M (2025) |
| Idle Slayer | ~$10.3M | rising yearly | $2.16M (2025) |
| Cookie Clicker | n/a (Android is ad-funded; Steam is paid) | | |

The games that sell power fell 68–95% from their peaks; Egg, Inc. and Idle Slayer held steady or grew.
That is a correlation across games of different ages, not proof ([win-strategy.md](./player-research/win-strategy.md)).

## Release chronology

Sorted oldest-first by first public release. Innovation cells are left blank where a game mostly recombined familiar systems.

| Game | First Release | Core Fantasy | Tech Innovation | Main Community Complaint | Players Liked Most |
|---|---|---|---|---|---|
| [Cookie Clicker](./competitor-research/cookie-clicker.md) | 2013 (web) | Absurd exponential baking empire | Defined the browser idle genre; text save export | Late game becomes waiting; browser saves lost | Humour and achievements that feed production |
| [AdVenture Capitalist](./competitor-research/adventure-capitalist.md) | 2014 (web) | Satirical tycoon with prestige resets | One title from browser to every platform | Ads; purchases lost with a device before cloud save (2019) | The prestige-reset template and its jokes |
| [AdVenture Communist](./competitor-research/adventure-communist.md) | 2016 (Steam EA), 2017 mobile | Soviet-satire production state | | Events tuned so final rewards need money; luck-gated automation; long ads | Mission ranks on a cascade; weekly themed events |
| [Idle Heroes](./competitor-research/idle-heroes.md) | 2016 | Collect and star up a hero army | | VIP-gated pity, paywalled events, yearly power layers | Every summon useful; 500-pull guarantee |
| [Idle Miner Tycoon](./competitor-research/idle-miner-tycoon.md) | 2016 | Run a mining empire with managers | Return-time "double earnings" ad as the core placement | Offer and ad clutter; $50 Super Managers; events that bench collections | A bottleneck chain readable on one screen |
| [Egg, Inc.](./competitor-research/egg-inc.md) | 2016 | Grow a space-age egg farm | Co-op contracts scored as a team | Long late grind; the 2023 contract rework that ranked teammates | Optional ads; permanent comfort purchases |
| [Tap Titans 2](./competitor-research/tap-titans-2.md) | 2016 | Tap-slay titans with heroes and a clan | Prestige that funds a clan layer | "A full-time job"; whales win tournaments; lost saves | Deep prestige loop with a dozen permanent systems |
| [AFK Arena](./competitor-research/afk-arena.md) | 2018 soft launch, 2019 global | Assemble a legendary hero team | AFK loot that improves at named campaign stages | Layered gacha; hidden pity; an idle game that demands active hours | Storybook art; rewards priced in hours of AFK |
| [Idle Slayer](./competitor-research/idle-slayer.md) | 2020 (Steam EA) | Run, jump and slay for coins | One save and one set of purchases across Android, iOS and Steam | Repeated idle-income nerfs; skill minigames gating permanent power | Opt-in ads; a visible developer who listens |

## Closest neighbours

- **[AdVenture Communist](./competitor-research/adventure-communist.md)** — the same backbone: quest-driven ranks on a cascading economy, collectible modifiers and a comic voice; its events show both the upside and the trust cost.
- **[Tap Titans 2](./competitor-research/tap-titans-2.md)** — the same tap-to-fight fantasy with heroes; its players' top requests are to automate skills, which supports Out of Ruin's auto-firing hero powers.
- **[Idle Miner Tycoon](./competitor-research/idle-miner-tycoon.md)** — the economy twin: managers running a bottleneck chain, like henchmen across dungeon levels.
- **[Idle Slayer](./competitor-research/idle-slayer.md)** — the closest posture: a small team, a fantasy run, opt-in ads, and one account across stores.
- **[AFK Arena](./competitor-research/afk-arena.md)** — the ceiling for heroes and gear, and the model for idle loot that grows with chapter progress.

## How Out of Ruin differs

**The landscape-wide pattern:** the games with deep rosters sell power, and the games players call fair have shallow rosters or no fight.
AFK Arena, Idle Heroes and Tap Titans 2 make heroes and gear the heart of the game and sell them through layered gacha, VIP-gated pity or VIP automation; their communities revolt over paywalled events and whales winning.
Egg, Inc., Cookie Clicker and, to a lesser degree, Idle Slayer keep goodwill through optional ads and earnable currency, but have little roster depth.
AdVenture Communist and Idle Miner Tycoon sit between and lose trust where events, luck and offers meet spending.
The plot in [competitor-axis.html](./competitor-axis.html) shows the top-right, deep and fair, empty.

Out of Ruin's wedges work as a system; removing any one weakens the rest:

1. **Earned depth.** Heroes, henchmen and gear cards give a roster, while duplicates and XP can max every card, packs publish odds with a pity counter that works for everyone, and no chapter quest needs a specific card. Without the roster this is another shallow fair idler; without the fairness it is another collector.
2. **No ads, ever.** Offline income and every earned reward are collected free. Ad-funded rivals cannot follow, because the return-time ad is their best revenue moment.
3. **Events that never stop, and that anyone can win.** Events run back to back and can overlap, with new ones entering the rotation as fast as they are made, and every final tier is reachable free-to-play through effort, never luck or spending. That turns AdVenture Communist's biggest revenue driver into its opposite: the thing its players resented most becomes the reason to come back.
4. **Pay to progress, not pay to win.** The shop sells permanent upgrades that speed progress, and everything they give can be reached by playing, the way Egg, Inc.'s permanent comforts are sold.
5. **A fight on top of the cascade.** Monsters to tap down and heroes whose powers fire on their own, over a henchmen cascade that snowballs like Idle Miner Tycoon's chain. Tapping is a bonus; the player's hands are never the bottleneck.
6. **A ladder long enough to live in.** 101 chapters, more heroes, henchmen and characters, and more locations beyond the five regions, so nobody hits the wall Tap Titans 2 and AdVenture Communist players describe as waiting.
7. **A voice, and a game that explains itself.** Comic fantasy henchmen and dungeons, with no Discord or wiki needed to play well.

**The rocks the closest analogues sank on:**

- **Running out of ladder.** AdVenture Communist went 26 months without a new rank and its capped players left; the 101-chapter plan has to keep ahead of the fastest players.
- **Event treadmills.** Back-to-back events risk the "full-time job" complaint Tap Titans 2 players make; overlapping events need to fit short check-ins and pay out in main-game progress.
- **Nerfs after launch.** Idle Slayer's and Idle Heroes' biggest revolts were income cuts and balance changes around sales. Earned income and paid upgrades are never cut retroactively.
- **A fair store that does not pay.** Price permanent upgrades for goodwill at sizes players call fair, the way Egg, Inc. does.
- **Nothing brings players back between events.** Egg, Inc.'s team-scored contracts are the model for a social layer; leaderboards wait for server-checked scores.

## Strengths and weaknesses matrix

| Competitor | Does well | Where it's weak | Gap Out of Ruin occupies |
|---|---|---|---|
| [Tap Titans 2](./competitor-research/tap-titans-2.md) | Prestige loop with a dozen permanent systems; clan raids | Obligation creep; automation sold behind a $150 VIP tier; whales win | The tap-and-heroes fantasy with powers that fire on their own, for free |
| [AdVenture Communist](./competitor-research/adventure-communist.md) | Mission ranks on a cascade; weekly themed events | Events tuned for spenders; luck-gated automation; 120-second ads | The same backbone with progression that never needs luck, spending or ads |
| [Idle Miner Tycoon](./competitor-research/idle-miner-tycoon.md) | Readable bottleneck chain; manager collection | Offer clutter; $50 managers; events that bench collections | A readable chain under a dungeon, with no offer wall |
| [AFK Arena](./competitor-research/afk-arena.md) | Art; AFK loot tied to campaign stages | Layered gacha; hidden pity; demands active hours | Hero and gear depth with one upgrade path and published odds |
| [Idle Heroes](./competitor-research/idle-heroes.md) | Every summon useful; 500-pull guarantee | Pity only for VIP 3; yearly power layers; paywalled events | Pity and odds that are the same for every player |
| [Idle Slayer](./competitor-research/idle-slayer.md) | Opt-in ads; cross-store account; visible developer | Paid currency buys power; idle nerfs; skill-gated power | The same goodwill with no power for sale and no nerfs |
| [Egg, Inc.](./competitor-research/egg-inc.md) | Optional ads; permanent comfort purchases; co-op contracts | Long late grind; no fight | A fight and a roster on the same fair footing |
| [AdVenture Capitalist](./competitor-research/adventure-capitalist.md) | Prestige template; browser-to-everywhere reach | Ads in most negative reviews; late cloud save | Richer progression with no ads |
| [Cookie Clicker](./competitor-research/cookie-clicker.md) | Humour and achievements as systems; web roots | Late game is waiting; desktop-only web layout | Milestones that change the world, with a fight |
