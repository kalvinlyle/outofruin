# Complaints and friction across the competitive set

Scope: the friction patterns that recur across the competitive set, the evidence for each, and
what each means for Out of Ruin's design. Patterns are ordered by how much damage the evidence
says they do. The through-line is at the end.

Related files: who these complaints come from is in [player-types.md](./player-types.md); the
mobile- and browser-specific friction (offline caps, save durability, onboarding) is covered in
more depth in [mobile-accessibility.md](./mobile-accessibility.md); the strategic read is in
[win-strategy.md](./win-strategy.md).

## Evidence base and method

**Reddit.** Post archives downloaded in full through
[Arctic Shift](https://arctic-shift.photon-reddit.com/): r/incremental_games (46,318 posts,
2013-2026), r/AdventureCommunist (17,385), r/TapTitans2 (86,109), r/EggsInc (82,272),
r/IdleSlayer (30,087), r/IdleMinerTycoon (14,476) and r/AdventureCapitalist (12,147).
r/AFKArena (19,500 posts from May 2024), r/IdleHeroes (9,000 from April 2025) and r/CookieClicker
(55,300 from August 2017) were sampled from the most recent posts backwards. The most-upvoted posts for each pattern were read in
full with their top comments; quotes are short and taken from the post or comment cited.

**App Store reviews.** The 450 to 500 most recent US reviews for eight competitors from Apple's
public review feed (for example
[AdVenture Capitalist](https://itunes.apple.com/us/rss/customerreviews/page=1/id=927006017/sortby=mostrecent/json)).
The window varies by how fast reviews arrive: about 10 weeks for Egg, Inc., 8 months for
AdVenture Capitalist and Idle Miner Tycoon, and up to 4 years for Tap Titans 2 and AdVenture
Communist. All one- and two-star reviews were read.

**Why the first pass was noisy.** Loose keyword counts inflate complaint shares (the word "wall"
matches guides, "ads" matches the AdVenture titles). The counts below use stricter phrase
patterns, and the shares are small because most posts in a game subreddit are screenshots,
questions, guides and memes. Read the shares as a floor, and the score lift (how far above the
subreddit's average a complaint post scores) as the resonance.

### Pattern share of posts, by subreddit (title and body, strict patterns)

| Subreddit | Posts | Pay-to-win | Grind wall | RNG gating | Ads | Lost progress | Content drought | Event fatigue |
|---|---|---|---|---|---|---|---|---|
| r/incremental_games | 46,318 | 1.7% | 1.9% | 1.0% | 3.3% | 0.6% | 0.6% | 0.0% |
| r/AdventureCommunist | 17,385 | 1.4% | 2.4% | 2.5% | 3.6% | 0.3% | 0.1% | 0.1% |
| r/TapTitans2 | 86,109 | 0.9% | 1.1% | 0.8% | 0.9% | 0.2% | 0.2% | 0.0% |
| r/IdleMinerTycoon | 14,476 | 0.9% | 1.0% | 0.6% | 3.4% | 1.2% | 0.2% | 0.0% |
| r/IdleSlayer | 30,087 | 0.2% | 2.3% | 1.9% | 1.2% | 0.4% | 0.1% | 0.0% |
| r/AFKArena (2024-26) | 19,500 | 1.8% | 0.6% | 2.1% | 0.4% | 0.1% | 0.3% | 0.0% |
| r/IdleHeroes (2025-26) | 9,000 | 0.5% | 1.0% | 1.2% | 0.0% | 0.0% | 0.1% | 0.0% |
| r/EggsInc | 82,272 | 0.4% | 0.8% | 0.4% | 0.8% | 0.1% | 0.1% | 0.0% |
| r/AdventureCapitalist | 12,147 | 0.8% | 1.5% | 0.2% | 2.7% | 0.7% | 0.2% | 0.2% |
| r/CookieClicker (2017-26) | 55,300 | 0.1% | 1.0% | 1.3% | 0.1% | 0.6% | 0.1% | 0.0% |

Cookie Clicker's RNG share is mostly golden-cookie luck talk, not complaints.

### Score lift: mean upvotes of matching posts over the subreddit mean

| Subreddit | Pay-to-win | Grind wall | RNG gating | Ads | Lost progress | Content drought |
|---|---|---|---|---|---|---|
| r/incremental_games | 1.4x | 1.1x | 1.0x | 1.3x | 1.2x | 1.9x |
| r/AdventureCommunist | 1.0x | 0.8x | 0.8x | 1.4x | 0.8x | 1.3x |
| r/TapTitans2 | 2.2x | 1.8x | 2.9x | 2.3x | 0.4x | 1.7x |
| r/IdleMinerTycoon | 1.9x | 1.0x | 1.4x | 1.4x | 0.6x | 1.2x |
| r/IdleSlayer | 1.2x | 0.6x | 1.0x | 0.8x | 0.6x | 1.9x |
| r/AFKArena | 1.8x | 0.5x | 1.4x | 0.9x | 0.1x | 2.6x |
| r/IdleHeroes | 2.6x | 1.0x | 2.9x | 3.7x | 0.2x | 1.6x |
| r/EggsInc | 1.2x | 0.5x | 1.1x | 0.7x | 0.2x | 0.8x |
| r/AdventureCapitalist | 1.0x | 0.9x | 0.7x | 1.1x | 1.0x | 0.9x |
| r/CookieClicker | 0.5x | 0.4x | 0.6x | 1.1x | 0.4x | 1.0x |

Two readings matter. Paid power, RNG and content droughts rally a community (lifts of 1.4x to
2.9x). Lost progress almost never does (0.1x to 0.6x): it is a private disaster, posted as a help
request, and the player who suffers it usually leaves without a fuss (designer inference).

A third reading: the two games players call fair, Egg, Inc. and Cookie Clicker, have the lowest
complaint shares in the table on pay-to-win and ads (0.1 to 0.8 percent), with the largest
communities after Tap Titans 2.

### One- and two-star App Store reviews mentioning each pattern

| Game | Recent reviews | Mean rating | 1-2 star | Ads | Pay-to-win / spend | Grind / wall | Lost progress | RNG | Events |
|---|---|---|---|---|---|---|---|---|---|
| [AdVenture Capitalist](../competitor-research/adventure-capitalist.md) | 500 | 2.62 | 285 | 76% | 12% | 7% | 1% | 3% | 8% |
| [AdVenture Communist](../competitor-research/adventure-communist.md) | 500 | 3.17 | 204 | 53% | 9% | 9% | 1% | 6% | 11% |
| [Idle Miner Tycoon](../competitor-research/idle-miner-tycoon.md) | 500 | 3.97 | 107 | 36% | 12% | 7% | 1% | 3% | 1% |
| [Egg, Inc.](../competitor-research/egg-inc.md) | 450 | 4.73 | 19 | 26% | 5% | 5% | 0% | 5% | 0% |
| [Tap Titans 2](../competitor-research/tap-titans-2.md) | 450 | 4.30 | 61 | 23% | 8% | 7% | 2% | 2% | 5% |
| [Idle Slayer](../competitor-research/idle-slayer.md) | 500 | 4.29 | 72 | 19% | 4% | 14% | 3% | 6% | 3% |
| [Idle Heroes](../competitor-research/idle-heroes.md) | 450 | 3.89 | 104 | 6% | 16% | 13% | 1% | 7% | 5% |
| [AFK Arena](../competitor-research/afk-arena.md) | 500 | 3.93 | 109 | 8% | 13% | 12% | 14% | 6% | 9% |

Percentages are shares of each game's one- and two-star reviews. Feeds:
[AdCap](https://itunes.apple.com/us/rss/customerreviews/page=1/id=927006017/sortby=mostrecent/json),
[AdCom](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1225683141/sortby=mostrecent/json),
[IMT](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1116645064/sortby=mostrecent/json),
[Egg, Inc.](https://itunes.apple.com/us/rss/customerreviews/page=1/id=993492744/sortby=mostrecent/json),
[TT2](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1120294802/sortby=mostrecent/json),
[Idle Slayer](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1526599527/sortby=mostrecent/json),
[Idle Heroes](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1153461915/sortby=mostrecent/json),
[AFK Arena](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1375425432/sortby=mostrecent/json).

The split is clean: the production idlers' reviewers complain about ads, the hero collectors'
reviewers complain about paid power and walls.

## 1. Ad aggression

**Pattern.** Rewarded ads drift from optional to required, interstitials appear on ordinary taps,
ads take several taps to close, and some never close at all.

**Evidence.**

- AdVenture Capitalist is the extreme case. Its recent App Store mean is 2.62, and ads appear in
  three of every four negative reviews. A June 2026 reviewer says that "every 5 minutes if you click
  anywhere on the screen there will be a forced ad"; others cite a $14.99 30-day ad pass and having
  "to watch 4 ads with a cooldown of 2 hours" to level up
  ([AdCap feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=927006017/sortby=mostrecent/json)).
- Idle Miner Tycoon: an October 2026 reviewer calls it "Idle Pop-Up ads Tycoon" after 11 purchase
  pop-ups in a row on login, and another says some ads "can only be closed by closing the game",
  losing the reward ([IMT feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1116645064/sortby=mostrecent/json)).
  The subreddit was making the same complaints in 2019, about offer icons covering the elevator
  ([e8j2i7](https://www.reddit.com/r/IdleMinerTycoon/comments/e8j2i7/)), and in 2020, about a
  one-minute-plus ad flow with an ad chooser, a 30-second ad and a 15-second close timer
  ([gcm5uf](https://www.reddit.com/r/IdleMinerTycoon/comments/gcm5uf/)).
- AdVenture Communist: "Screw the ads that have a 30 second video followed by a 15 second screen"
  ([e5fzk5, 233 points](https://www.reddit.com/r/AdventureCommunist/comments/e5fzk5/)) and the
  multi-step skip flow in "New ad format is infuriating"
  ([pjtar0](https://www.reddit.com/r/AdventureCommunist/comments/pjtar0/)).
- Tap Titans 2's ads are opt-in fairy rewards, and the complaints are about their execution: "Ads
  are stupid long. Some are almost 2 mins long and requiring 3 clicks" (June 2026,
  [TT2 feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1120294802/sortby=mostrecent/json)),
  and an ad that freezes the game instead of paying out
  ([ikwqs8, 155 points](https://www.reddit.com/r/TapTitans2/comments/ikwqs8/)).
- Egg, Inc., the fairest game in the set, still loses reviews to ad networks: on a manual read,
  seven of its 19 recent negative reviews are about rewarded ads that run two to three minutes,
  never show a close button, or never pay out, forcing a restart that forfeits the reward; two
  name the same advertiser (August to October 2026,
  [Egg, Inc. feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=993492744/sortby=mostrecent/json)).
- Idle Slayer added forced ads in July 2020; the community thread reached 443 points and the
  developer removed them the same day
  ([hl5q6a](https://www.reddit.com/r/incremental_games/comments/hl5q6a/),
  [hlawbp, 503 points](https://www.reddit.com/r/incremental_games/comments/hlawbp/)). In February
  2026 a reviewer uninstalled after being "forced to watch 2 ads back to back to receive offline
  rewards" ([Idle Slayer feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1526599527/sortby=mostrecent/json)).
- The genre's own community welcomed Google's 2022 Play policy against unexpected full-screen ads
  ([wg6u0s, 575 points](https://www.reddit.com/r/incremental_games/comments/wg6u0s/)); the top
  reply (211 points) asks for ads that close in one tap.

**Design implication.** Out of Ruin carries no ads today, and that is its single clearest
difference from the production idlers. Keep it. If rewarded ads are ever added, they should be
opt-in only, never attached to collecting offline income or anything already earned, and closable
in one tap (designer inference).

## 2. Pay-to-win and paid power

**Pattern.** Spending buys power, or exclusive power, that free players cannot reach; prices
rise as the game ages.

**Evidence.**

- AFK Arena's "PROTEST" (704 points) says Draconic heroes are "nearly impossible to obtain without
  spending an absurd amount" and that power creep is "ruining old heroes"
  ([1jqlnhs](https://www.reddit.com/r/AFKArena/comments/1jqlnhs/)). A top-guild spender's
  857-point post argues the AE boss mode is now decided by dragon spending, not strategy
  ([1e5etqo](https://www.reddit.com/r/AFKArena/comments/1e5etqo/)).
- Idle Heroes reviewers: "Unless you are willing to drop $100+ a week on basic stuff, and another
  $200+ on the weekly 'events'" (May 2024,
  [IH feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1153461915/sortby=mostrecent/json)).
- Idle Miner Tycoon, the clearest verified monetisation critique among the production idlers:
  the Santa Claus super manager's posted odds meant about 40,000 super cash, roughly $200, before
  the guaranteed pull ([e68b7q](https://www.reddit.com/r/IdleMinerTycoon/comments/e68b7q/)); an
  epic manager sold for $20 that outperformed legendaries players had forged keys for a year to get
  ([rkv02h](https://www.reddit.com/r/IdleMinerTycoon/comments/rkv02h/)); a self-declared whale
  announced a spending strike after a paid item was nerfed without a refund
  ([15n3moq](https://www.reddit.com/r/IdleMinerTycoon/comments/15n3moq/)); and "Anyone else just
  getting turned off from playing this by the increasing greed?" about a $50 manager
  ([qjgif5](https://www.reddit.com/r/IdleMinerTycoon/comments/qjgif5/)). A 2026 reviewer says the
  suitcase system "turned the game into a Gacha system" where super managers used to come from
  play ([IMT feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1116645064/sortby=mostrecent/json)).
  A one-year free player concludes it is pay-to-win but completable without paying
  ([1jt3lx0](https://www.reddit.com/r/IdleMinerTycoon/comments/1jt3lx0/)).
- Egg, Inc., the set's fairest store, shows how little it takes to trigger this complaint. In
  October 2022 an update cut a free source of golden eggs (premium currency) while the
  developer's notice said "accusations of greed will be unfounded"; the community answered with
  "Accusations of greed" ([xyxby3, 549 points](https://www.reddit.com/r/EggsInc/comments/xyxby3/)),
  "So now we'll have to pay to get GE?" ([xyhyy7, 399 points](https://www.reddit.com/r/EggsInc/comments/xyhyy7/))
  and "Truth behind the New Update", which says the change is "focused on forcing the hand of F2P
  players" ([xyjp6u, 131 points](https://www.reddit.com/r/EggsInc/comments/xyjp6u/)). A $1 rise
  in the piggy bank price in April 2023 reopened it
  ([132javg, 341 points](https://www.reddit.com/r/EggsInc/comments/132javg/);
  [133woph, 308 points](https://www.reddit.com/r/EggsInc/comments/133woph/)). The same threads
  still credit Egg, Inc. for being far less aggressive than Idle Miner Tycoon or AdVenture
  Communist (top comment in 132javg).
- Tap Titans 2: "They cater to the whales now", with Abyssal tournaments "won exclusively by
  whales" (2022, [TT2 feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1120294802/sortby=mostrecent/json));
  "Abyssal aren't credit card free so whales can dominate just as easily" (top comment,
  [ka71hj](https://www.reddit.com/r/TapTitans2/comments/ka71hj/)).
- In the connoisseur community: CIFI's $30 IAP is "the most powerful upgrade in the game"
  ([1n3wry1, 367 points](https://www.reddit.com/r/incremental_games/comments/1n3wry1/)); IdleOn
  is called "a cash grab" with "gacha scams and p2w"
  ([1gi6qw3, 307 points](https://www.reddit.com/r/incremental_games/comments/1gi6qw3/)); and
  Clicker Heroes 2 went paid up front in 2017 on ethical grounds, citing players who "spent many
  thousands of dollars on rubies" in the first game
  ([7e52p4, 466 points](https://www.reddit.com/r/incremental_games/comments/7e52p4/)).
- The revenue record lines up. The games built on selling power have declined fastest: AFK Arena
  from $133 million (2020) to $17 million (2025), Idle Heroes from $147 million (2019) to
  $17 million, Tap Titans 2 from $11.7 million (2018) to $2.2 million. Egg, Inc. ($6 to 7 million a
  year since 2023) and Idle Slayer ($1.8 to 2.2 million) have held steady (Sensor Tower worldwide
  in-app revenue via Supercell data warehouse, non-audited). The fair games are also smaller and
  younger, so this is suggestive, not causal.

**Design implication.** Gold should buy time and packs, never a power level that play cannot
reach. Card duplicates and XP must be able to max every card. Never sell a time-limited or
paid-only power item, which is the move that turned Idle Miner Tycoon's own whales against it
(designer inference).

## 3. Grind walls and late-game waiting

**Pattern.** Progress slows to a crawl with no clear way through, or the game turns into a chore.

**Evidence.**

- "When you hit 'the wall' and abandon a game"
  ([g82yeu, 458 points](https://www.reddit.com/r/incremental_games/comments/g82yeu/)).
- Tap Titans 2: the game "has gone from a casual, idle tapping incremental game to a time-sink
  that feels like a job" ([l1c4v7, 178 points](https://www.reddit.com/r/TapTitans2/comments/l1c4v7/));
  "each prestige moves maybe 30-50 stages" (top-voted reply in
  [ep5zfv](https://www.reddit.com/r/TapTitans2/comments/ep5zfv/)).
- Idle Miner Tycoon: "Late Game Tedium" lists completed continents and nothing left to aim for,
  and a newer player replies that the end game looks like "10 times more ad time than game time"
  ([hezo8b](https://www.reddit.com/r/IdleMinerTycoon/comments/hezo8b/)).
- Idle Slayer: a quest to kill 95,000 archdemons took one reviewer "well over 14 hours of in game
  time"; another got "hard stuck" at the village after a year
  ([Idle Slayer feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1526599527/sortby=mostrecent/json)).
  Grind and walls are 14 percent of its negative reviews, its top complaint after ads.
- AdVenture Communist players treat walls as part of the identity ("This is my rank 98 wall",
  [fmzfx1](https://www.reddit.com/r/AdventureCommunist/comments/fmzfx1/)): a wall is accepted when
  the player can see what breaks it.
- Mandatory mass tapping is a wall in disguise. "Devs who assume everyone uses auto clickers suck"
  ([1f4mnzn, 292 points](https://www.reddit.com/r/incremental_games/comments/1f4mnzn/)), whose top
  reply (302 points) asks for an upgradeable in-game auto-clicker; "do not incentivize the player to
  give themselves RSI" (123-point reply in
  [fy1wp3](https://www.reddit.com/r/incremental_games/comments/fy1wp3/)); and AdVenture Communist's
  "This event is not fun" opens with "Missions require manual tapping to complete ... It's an
  automation game" ([v20tl9, 171 points](https://www.reddit.com/r/AdventureCommunist/comments/v20tl9/)).

**Design implication.** Out of Ruin's tap-to-damage is the risk here. Taps should accelerate a
level that henchmen are already working, never be the only way through it, and the chapter quest
list should always show which level, loot or hire breaks the current wall (designer inference).

## 4. RNG gating

**Pattern.** Progress waits on a random drop, a random mission or a gamble.

**Evidence.**

- AdVenture Communist: "Missions impossible without researcher that is multiple ranks away"
  ([v20tl9](https://www.reddit.com/r/AdventureCommunist/comments/v20tl9/)), and the sarcastic
  image posts "I love RNG..." ([jhdz52, 97 points](https://www.reddit.com/r/AdventureCommunist/comments/jhdz52/))
  and "After 4 months of waiting and bad RNG..."
  ([it7hds, 80 points](https://www.reddit.com/r/AdventureCommunist/comments/it7hds/)). RNG posts
  are 2.5 percent of the subreddit, the highest share in the set.
- AFK Arena: "Dragons have rigged odds ... I did 900 pull last week and only got 4" (49-point reply
  in [1h6qasm](https://www.reddit.com/r/AFKArena/comments/1h6qasm/)); "Dragon Wyrmcrest Spire RNG"
  ([1id2wu0, 447 points](https://www.reddit.com/r/AFKArena/comments/1id2wu0/)).
- Idle Slayer: "I am I the only one who hates that some progress in the game is locked behind
  gambling" ([1o1b36x](https://www.reddit.com/r/IdleSlayer/comments/1o1b36x/)); a player's maths
  puts buying out the casino at 227 to 286 days of free spins, and a reply calls the casino "my
  final straw for abandoning this game" ([13mnln7](https://www.reddit.com/r/IdleSlayer/comments/13mnln7/)).
  A March 2025 App Store review is titled "Has gambling mechanic" and another "Dark patterns, the
  game" ([Idle Slayer feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1526599527/sortby=mostrecent/json)).
- Tap Titans 2 raid veterans say random buffs and debuffs at Tier 3 are not enjoyable
  ([dmtfym, 258 points](https://www.reddit.com/r/TapTitans2/comments/dmtfym/)).

**Design implication.** Out of Ruin's card packs are random, so the rule is that no chapter quest
may need a specific card, every pack shows its odds, a pity counter guarantees the next rarity
tier, and duplicates convert into the card the player is missing (designer inference).

## 5. Lost progress

**Pattern.** A save, account or purchase disappears.

**Evidence.**

- AFK Arena: lost progress is 14 percent of its negative App Store reviews. Most trace to the
  2025 Companions relaunch putting returning players on a new server ("Automatically switched to
  new server, all progress reset", May 2025,
  [AFK feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1375425432/sortby=mostrecent/json));
  the fix is a Classic toggle in settings ([1iqriq0](https://www.reddit.com/r/AFKArena/comments/1iqriq0/)).
- Tap Titans 2: a 2024 Facebook-login lockout, an iPad sign-in that overwrote an iPhone save, and
  a five-year player whose password reset never arrived
  ([TT2 feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1120294802/sortby=mostrecent/json));
  "$150 Lost Account, GameHive says sorry nothing we can do"
  ([7rjqut](https://www.reddit.com/r/TapTitans2/comments/7rjqut/)).
- Idle Slayer: an early sync bug rolled players back ("That's all, folks",
  [muphnd](https://www.reddit.com/r/IdleSlayer/comments/muphnd/)); a 2025 reviewer lost a $20 jewel
  pack and the progress it bought the same evening.
- Browser idlers: "if your game lacks autosave it's not ready for public play"
  ([t9u9en, 581 points](https://www.reddit.com/r/incremental_games/comments/t9u9en/)); Kongregate's
  2017 HTTPS move orphaned HTML5 saves ([7bq2r6](https://www.reddit.com/r/incremental_games/comments/7bq2r6/)).
  The Safari storage rules that put browser saves at risk are in
  [mobile-accessibility.md](./mobile-accessibility.md#10-save-portability).

**Design implication.** Lost progress gets few upvotes but ends the relationship. For a browser
game with real-money gold it is the highest-stakes friction in this list: export and import
codes, a persistence request and an optional cloud account should land before gold sales scale,
and every Stripe purchase should be recoverable from the payment record (designer inference).

## 6. Content droughts and abandonment

**Pattern.** The roadmap stops, old systems rot, or the new content is not what players asked for.

**Evidence.**

- AFK Arena: "The Outdated & The Forgotten: a memorial to all the features Lilith gave up on"
  ([1vn555q, 350 points](https://www.reddit.com/r/AFKArena/comments/1vn555q/)); "Mass player
  abandonment" ([1j6nhd9, 429 points](https://www.reddit.com/r/AFKArena/comments/1j6nhd9/)).
  Content-drought posts have the highest lift in that subreddit (2.6x).
- Tap Titans 2: "TT2 Dev Team Check-in --- Where's the patch?"
  ([c8cwss, 134 points](https://www.reddit.com/r/TapTitans2/comments/c8cwss/)); the Abyssal
  Tournament was "the update/feature that NOBODY WANTED" when players had asked for "New artifacts,
  new titans, a new main game mechanic" ([ka71hj](https://www.reddit.com/r/TapTitans2/comments/ka71hj/)).
- Idle Slayer: "End game is dead" after a 2024 nerf to offline kills cut one player's daily take
  from about 200Qa to 30Qa ([1gq6auj, 185 points](https://www.reddit.com/r/IdleSlayer/comments/1gq6auj/)).
- AdVenture Communist: a 2021 poll post, "I don't have anything more to do in months and events
  are pointless" ([ltut1g](https://www.reddit.com/r/AdventureCommunist/comments/ltut1g/)).
- Connoisseurs: "Why was this game abandoned? It's the best idle game I ever played"
  ([1gb22uf, 222 points](https://www.reddit.com/r/incremental_games/comments/1gb22uf/)), and
  repeated requests for long games over short ones
  ([1mhotks](https://www.reddit.com/r/incremental_games/comments/1mhotks/),
  [1ujem70](https://www.reddit.com/r/incremental_games/comments/1ujem70/)).

**Design implication.** Out of Ruin has 11 chapters and 10 unnamed henchman slots. Either publish
a roadmap that fills them on a visible schedule, or design a deliberate end state (a prestige
loop or a finale) so the ladder ends on purpose rather than by neglect. Nerfing idle income after
launch is its own content drought for late players (designer inference).

## 7. Event fatigue and spender-tuned events

**Pattern.** Time-limited events that cannot be finished without paying, that reskin the main
game, or that arrive too often.

**Evidence.** The literal phrase "event fatigue" barely appears (0.0 to 0.1 percent of posts in
every subreddit); the anger is about event fairness, not frequency.

- AdVenture Communist: "WARNING: DO NOT SPEND IRL MONEY ON EVENT BUNDLES", because "it's
  actually impossible to finish the event quests if you don't spend real money"
  ([bnvqs8, 103 points](https://www.reddit.com/r/AdventureCommunist/comments/bnvqs8/));
  "not even hardcore players can" ([bs9p64, 92 points](https://www.reddit.com/r/AdventureCommunist/comments/bs9p64/));
  "This event is so blatantly designed to take as much money from you as possible"
  ([1jca97c](https://www.reddit.com/r/AdventureCommunist/comments/1jca97c/)). Events are 11 percent
  of its negative App Store reviews, the highest share in the set.
- AdVenture Capitalist: boosts only apply to the game you are in, so the parallel event, Moon and
  Mars games multiply the ads a player must watch
  ([td68re, 394 points](https://www.reddit.com/r/incremental_games/comments/td68re/)).
- Idle Miner Tycoon: "The Oktoberfest is a greedy money grab ... no way to get it fully completed
  without spending a fortune" (October 2026,
  [IMT feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1116645064/sortby=mostrecent/json)).
- The connoisseurs' parody of Play Store idlers: "reskin our entire game and sell it to you as a
  limited time event!" ([1j3l169, 221 points](https://www.reddit.com/r/incremental_games/comments/1j3l169/)).
- Egg, Inc.'s co-op contracts are its best-loved social feature, and the 2023 Contracts v2 grades
  and leaderboards turned them competitive: "Competition is not what I want to consider in an
  idle game", and a top reply says the grade split stopped a player co-oping with his wife
  ([r/EggsInc 134yrm2, 162 points](https://www.reddit.com/r/EggsInc/comments/134yrm2/)).

**Design implication.** Out of Ruin has no events, which is a strength while it has no event team.
When events come, they should be winnable by an active free player, pay out in the main game's
progress, and never be a reskin with a separate ad economy (designer inference).

## 8. Opaque systems and Discord dependence

**Pattern.** The game does not explain itself; the knowledge lives in a Discord server.

**Evidence.** Three of r/incremental_games' most-upvoted discussion posts are this complaint
([sc4yy0, 1,165 points](https://www.reddit.com/r/incremental_games/comments/sc4yy0/);
[umjz4c, 979](https://www.reddit.com/r/incremental_games/comments/umjz4c/);
[1rjt5vs, 714](https://www.reddit.com/r/incremental_games/comments/1rjt5vs/)). Tap Titans 2's raid
leaders say "3rd party tools are an absolute requirement here, and they shouldn't be"
([l1c4v7](https://www.reddit.com/r/TapTitans2/comments/l1c4v7/)), and an Idle Slayer player names
going "to discord just for patch notes" as part of quitting
([13mnln7](https://www.reddit.com/r/IdleSlayer/comments/13mnln7/)).

**Design implication.** Keep patch notes, odds and formulas inside the game. The quest list is the
best place to explain the cascade (designer inference).

## The through-line

Every pattern above is the same failure seen from a different side: **the game stands between the
player and progress they have already earned.** An ad sits between the player and the offline
income that accrued while they were away. A paywall or a gamble sits between them and the next
milestone. A wipe takes the progress back. A drought or an unwinnable event leaves them nothing to
spend it on.

Players tolerate slowness when they can see the way through; Egg, Inc. and Idle Slayer have long
grinds and still hold the set's best ratings and retention (see
[mobile-accessibility.md](./mobile-accessibility.md#3-retention-benchmarks)). What they do not
tolerate is being charged in money, attention or luck for progress the game had already promised.

For Out of Ruin, that becomes one rule: **anything the player has earned is collected for free,
kept safely and spent on something visible** (designer inference).
