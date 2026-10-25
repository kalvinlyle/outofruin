# Mobile and mobile-web expectations

Scope: what idle and incremental players expect from a phone game and from a game that runs in a
mobile browser. The topics are portrait one-thumb play, session length, offline progress,
performance on mid-tier phones, onboarding, readability, install-free delivery and save portability.
The last section tests Out of Ruin's web-first architecture against that evidence.

Related files: audience segments are in [player-types.md](./player-types.md), friction patterns in
[complaints-and-friction.md](./complaints-and-friction.md), and the strategy in
[win-strategy.md](./win-strategy.md).

## Evidence base and how to read it

- **Sensor Tower (ST).** Engagement, retention and demographic estimates for the nine competitors
  and two subgenres, queried from the Sensor Tower tables in the Supercell data warehouse.
  All ST figures are modelled panel estimates: they are non-audited, and the absolute levels run
  higher than SDK-measured benchmarks. Use them to compare games with each other, not as targets.
  Cited below as "ST (non-audited)".
- **GameAnalytics (GA).** The
  [2025 Mobile Gaming Benchmarks report](https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf)
  (2024 data, SDK-measured across about 100,000 monthly active games of every size). It is
  vendor-published but measured, not modelled.
- **Reddit.** The full r/incremental_games archive (46,318 posts, September 2013 to October 2026)
  downloaded through the [Arctic Shift](https://arctic-shift.photon-reddit.com/) archive, plus the
  competitors' subreddits. Scores are upvotes at archive time.
- **App Store reviews.** The 450 to 500 most recent US reviews per competitor from Apple's public
  review feed (for example
  [Idle Miner Tycoon's feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1116645064/sortby=mostrecent/json)).
  These skew towards recent, motivated reviewers.

GA and ST disagree by a factor of three or more on retention because they measure different
populations. GA's 2024 median D7 is 3.42 to 3.94 percent across all games
([GA 2025 report, p. 7](https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf)).
The ST median D7 for idle games with at least 100,000 US downloads is 12 to 14 percent (table
below). GA includes every hobby project that ships an SDK; ST only sees apps big enough for its
panel. Trust GA for "what does a typical new game get", and ST for "how do these competitors rank".

## 1. Portrait, one-thumb play

**Expectation: portrait is the default for a phone idle game, and landscape costs players.**

- Steven Hoober's field study of 780 people touching their phones found 49 percent held the phone
  in one hand, 36 percent cradled it and 15 percent used two hands; he concluded thumbs drive about
  75 percent of interactions
  ([UXmatters, 2013](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)).
  The devices are old (the largest was a Galaxy Note 2), so treat the split as directional.
- When Unnamed Space Idle (r/incremental_games Best F2P Game in 2024 and 2025) moved its mobile
  build to portrait in August 2026, the top reply said the lack of portrait "was the only reason I
  dropped the game early on", and the next said they will not play a mobile game that is not
  portrait ([1vuo6ol, 187 points](https://www.reddit.com/r/incremental_games/comments/1vuo6ol/)).
  The developer's own diagnosis of the old build was "incredibly small and hard to read texts" and
  buttons that were hard to hit.
- The 2020 community poll on orientation drew comments in the same direction: portrait for phones,
  landscape for tablets and PC, and one player with small hands deletes landscape games outright
  ([jkv2gl, 104 points](https://www.reddit.com/r/incremental_games/comments/jkv2gl/)).
- Idle Slayer is the counter-example: it runs in both orientations because landscape shows about
  four times as much of the running map (same thread). That matters for an action runner, not for
  a menu-driven idler.

Design implication: Out of Ruin's portrait layout is right. Keep every routine action (tap the
level, hire, claim quest loot, open a pack) inside the bottom two-thirds of the screen, where a
right or left thumb reaches without a grip change (designer inference). Apple's minimum hit target
is 44 x 44 points ([Apple HIG, Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)),
Android's is 48 x 48 dp
([Android accessibility guide](https://developer.android.com/guide/topics/ui/accessibility/apps#large-controls)),
and WCAG 2.2 sets 24 x 24 CSS pixels as the floor
([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).

## 2. Session length and cadence

**Expectation: four to six short visits a day, each long enough to make one visible step.**

US daily averages for 2025, ST (non-audited):

| Game | Sessions per active user per day | Minutes per session | Minutes per user per day |
|---|---|---|---|
| [AFK Arena](../competitor-research/afk-arena.md) | 8.4 | 7.0 | 58 |
| [Idle Heroes](../competitor-research/idle-heroes.md) | 4.7 | 7.0 | 33 |
| [Tap Titans 2](../competitor-research/tap-titans-2.md) | 5.9 | 5.6 | 31 |
| [Idle Miner Tycoon](../competitor-research/idle-miner-tycoon.md) | 3.6 | 6.5 | 24 |
| [Egg, Inc.](../competitor-research/egg-inc.md) | 5.2 | 4.3 | 22 |
| [AdVenture Capitalist](../competitor-research/adventure-capitalist.md) | 4.6 | 4.3 | 20 |
| [AdVenture Communist](../competitor-research/adventure-communist.md) | 5.6 | 3.4 | 19 |
| [Idle Slayer](../competitor-research/idle-slayer.md) | 4.0 | 4.6 | 18 |
| [Cookie Clicker](../competitor-research/cookie-clicker.md) (Android only) | 5.9 | 2.9 | 17 |

GA's all-genre medians for 2024 are similar: about 4 sessions a day, 5 to 6 minutes a session and
about 22 minutes of play a day, with North America at 3.67 sessions a day
([GA 2025 report, pp. 10-16](https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf)).

What the table says:

- The production idlers (Egg, Inc., the AdVentures, Idle Slayer, Cookie Clicker) cluster at
  3 to 5 minutes a session and about 20 minutes a day. That is the check-in rhythm Out of Ruin's
  henchman cascade and follower income are built for.
- The hero collectors run longer sessions (7 minutes) and AFK Arena runs twice the daily time of
  anyone else. Longer sessions come from more systems to clear each visit (campaign, tower,
  dailies, guild), not from the idle loop.
- Tap Titans 2 sits between: a tap-to-fight game gets about 6-minute sessions.

Design implication: one Out of Ruin visit should fit in about 4 minutes and end with something
banked: a chapter quest ticked, a level cleared or a hire made. Anything that needs 10 minutes of
uninterrupted tapping belongs to an optional active mode, not the main path (designer inference).

## 3. Retention benchmarks

US install cohorts July 2024 to June 2025, average of iOS and Android, ST (non-audited):

| Game | D1 | D7 | D30 | D90 |
|---|---|---|---|---|
| [Cookie Clicker](../competitor-research/cookie-clicker.md) (Android) | 54% | 34% | 23% | 12% |
| [Idle Slayer](../competitor-research/idle-slayer.md) | 60% | 32% | 17% | 7% |
| [Egg, Inc.](../competitor-research/egg-inc.md) | 55% | 31% | 15% | 7% |
| [AdVenture Communist](../competitor-research/adventure-communist.md) | 52% | 25% | 12% | 5% |
| [AdVenture Capitalist](../competitor-research/adventure-capitalist.md) | 61% | 29% | 11% | 2% |
| [AFK Arena](../competitor-research/afk-arena.md) | 41% | 23% | 10% | 5% |
| [Idle Heroes](../competitor-research/idle-heroes.md) | 36% | 19% | 9% | 3% |
| [Idle Miner Tycoon](../competitor-research/idle-miner-tycoon.md) | 53% | 21% | 6% | 1.5% |
| [Tap Titans 2](../competitor-research/tap-titans-2.md) | 45% | 16% | 4% | 0.8% |
| Idle RPG subgenre median (41 store listings) | 35% | 12% | 3.5% | 1.3% |
| Idler subgenre median (264 store listings) | 47% | 14% | 2.7% | 1.1% |

The subgenre medians cover every app ST tags "Idle RPG" or "Idler" with at least 100,000 US
downloads in the cohort year (each store listing counted separately). Interquartile ranges: Idle RPG
D30 2.0 to 7.3 percent, Idler D30 1.7 to 5.0 percent.

What the table says:

- Every competitor beats its subgenre median at D30. These are survivors, so they are a ceiling
  for Out of Ruin, not a floor.
- The three games players call fair (Cookie Clicker, Idle Slayer, Egg, Inc.) hold the best
  D30 and D90. The two most ad-dense games (Idle Miner Tycoon and Tap Titans 2) lose players
  fastest after the first week. This is a correlation across nine games of different ages, not
  proof that fairness causes retention, but it lines up with the complaint evidence in
  [complaints-and-friction.md](./complaints-and-friction.md) (designer inference).
- GA reads D1 as onboarding, D7 as core-loop appeal and D28 as content pacing
  ([GA 2025 report, p. 9](https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf)).
  For Out of Ruin, D30 is the number that tests whether 11 chapters are enough.

Do not set a retention target from these tables: a web game has no install step, so its D1
denominator includes people who would never have installed, and its D1 will read lower than a
store game's for the same quality (designer inference).

## 4. Who plays

US active users, Q2 2026, ST (non-audited):

| Game | Average age | Male | Aged 18-34 |
|---|---|---|---|
| Tap Titans 2 | 27-28 | 82-86% | 79-82% |
| Idle Slayer | 28 | 70-72% | 76-81% |
| AFK Arena | 29 | 65-66% | 75-77% |
| Idle Heroes | 29 | 74-75% | 76-78% |
| Cookie Clicker (Android) | 29 | 69% | 78% |
| Egg, Inc. | 30 | 68-69% | 68-69% |
| AdVenture Communist | 31 | 70-72% | 64-65% |
| AdVenture Capitalist | 31 | 66% | 69-71% |
| Idle Miner Tycoon | 32 | 57-62% | 61-64% |

The ranges are Android and iOS. The tap-to-fight and fantasy games skew young and male; the
production idlers skew older and more mixed, with Idle Miner Tycoon the most balanced. Out of
Ruin's mix of tap combat and a production cascade sits across both groups, which is an argument
for keeping the tap optional and the cascade central (designer inference).

## 5. Offline progress

**Expectation: a long, honest offline window and a clear "while you were away" moment.**

- The most-upvoted thread on the subject asks mobile idlers to raise "like 2 hour" offline caps
  to 6 to 8 hours; the top reply (155 points) says offline time should not be capped at all, and
  the next asks for 12 to 24 hours so a player can check in once or twice a day
  ([s9pjay, 287 points](https://www.reddit.com/r/incremental_games/comments/s9pjay/)).
- The community's "cashgrabby mobile idle game starter pack" lists "Offline time is 2 hours and no
  more, for 50% of ingame income" as a defining trait
  ([wjd0rn, 453 points](https://www.reddit.com/r/incremental_games/comments/wjd0rn/)), and a 2025
  parody of Play Store idlers mocks "You used 4 hours of your 39 seconds of offline time. Double
  your rewards with an ad!" ([1j3l169, 221 points](https://www.reddit.com/r/incremental_games/comments/1j3l169/)).
- The counterweight: some players feel "robbed" when a day away clears milestones they wanted to
  hit themselves, and the top reply prefers a time bank they spend while present
  ([11ayce9, 126 points](https://www.reddit.com/r/incremental_games/comments/11ayce9/)).
- On a phone, offline progress is treated as mandatory: "For mobile: Pretty much yes"
  ([6f0yfq](https://www.reddit.com/r/incremental_games/comments/6f0yfq/)).
- Competitor practice: AFK Arena Classic caps the idle chest at 12 hours and Companions moved to
  three stacked 10-hour chests ([AFK Arena teardown](../competitor-research/afk-arena.md));
  Idle Miner Tycoon pays idle cash at about 10 percent of active income and sells a doubling ad on
  return ([Idle Miner Tycoon teardown, section 2.5](../competitor-research/idle-miner-tycoon.md));
  Tap Titans 2's Silent March re-climbs to 90 percent of max stage but never pushes new stages
  ([Tap Titans 2 teardown, section 2.11](../competitor-research/tap-titans-2.md)).
- Ads on the offline payout are the friction point. A 2026 Idle Slayer App Store review: the
  player uninstalled after being "forced to watch 2 ads back to back to receive offline rewards"
  ([Idle Slayer reviews feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1526599527/sortby=mostrecent/json)).

Design implication: Out of Ruin's follower income should accrue for at least 12 hours, ideally
24, at a rate the player can read, and return with a summary screen that needs no ad and no
purchase to collect. Time warps already exist in the shop as the "present-time" accelerator, which
answers the players who prefer a time bank (designer inference).

## 6. Performance on mid-tier phones

**Expectation: the game opens fast on a two-to-four-year-old Android phone and does not drain the
battery while left open.**

- Out of Ruin's shipped build is Defold 1.2.167 with a WebAssembly engine. Measured from the repo,
  the first load is about 5 MB compressed: the engine wasm is 1.8 MB raw (0.66 MB gzipped) and the
  game archive is 4.6 MB raw, almost all of it already-compressed art that gzip barely shrinks
  (4.3 MB). Defold's manual says HTML5 builds "require a modern browser with WebAssembly support"
  and allocate a 256 MB heap by default
  ([Defold HTML5 manual](https://defold.com/manuals/html5/)). WebAssembly 1.0 runs in about
  99 percent of tracked browsers ([Wikipedia, citing caniuse](https://en.wikipedia.org/wiki/WebAssembly)).
- Alex Russell's budgets for a five-second first load on 75th-percentile devices and networks are
  far smaller than 5 MB for ordinary web pages
  ([Infrequently Noted, 2024 edition](https://www.infrequently.org/page/2/)). Games are judged
  more leniently than pages, but the gap means the loading screen is part of the first impression
  (designer inference).
- The average new smartphone shipped with 8.4 GB of RAM in December 2025, up from 7.4 GB a year
  earlier ([Counterpoint Research](https://counterpointresearch.com/en/insights/Global-Smartphone-Average-DRAM-Hits-Record-8.4GB-in-2025)).
  That is new shipments, not the installed base, but it means a 256 MB heap is not the constraint
  on a typical phone; network speed and older budget Android devices are.
- Battery and heat are a real complaint even in native idlers: an April 2026 Idle Miner Tycoon
  reviewer says long ads drain the battery and make the phone hot
  ([IMT reviews feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1116645064/sortby=mostrecent/json)).
  A browser game left open in a tab has the same problem with no OS to suspend it (designer
  inference).

Design implication: show a branded progress bar from the first byte, cache the archive with a
service worker so the second visit is instant, and drop the frame rate when nothing is animating
(designer inference).

## 7. Onboarding and legibility

**Expectation: the game teaches itself; nobody should need Discord to progress.**

- Three of the subreddit's ten most-upvoted discussion posts are about this one complaint:
  "You shouldn't have to join a game's Discord in order to properly know how to play"
  ([sc4yy0, 1,165 points](https://www.reddit.com/r/incremental_games/comments/sc4yy0/)),
  "Stop making discord servers necessary for your game"
  ([umjz4c, 979 points](https://www.reddit.com/r/incremental_games/comments/umjz4c/)) and
  "Needing a game's Discord to actually understand how to play shouldn't be a thing"
  ([1rjt5vs, 714 points](https://www.reddit.com/r/incremental_games/comments/1rjt5vs/)).
- A 12-year veteran's list of pet peeves includes an IAP that is "for all intents and purposes
  mandatory" and a game that turns into a puzzle "you absolutely cannot progress without figuring
  something out" ([1kox7nk, 318 points](https://www.reddit.com/r/incremental_games/comments/1kox7nk/)).
- The CIFI critique, about the 2025 Best Mobile Game winner, adds that Discord guides assume the
  reader owns the IAPs, so a free player only finds the wall when they hit it
  ([1n3wry1, 367 points](https://www.reddit.com/r/incremental_games/comments/1n3wry1/)).
- Over-long tutorials are mocked too ("20 min tutorial on how to click buttons", top reply in
  [1j3l169](https://www.reddit.com/r/incremental_games/comments/1j3l169/)).

Design implication: the chapter quest list is Out of Ruin's tutorial. Each quest should name the
level, the loot and the henchman it needs, so a player never has to leave the game to learn what
blocks them (designer inference).

## 8. Readability

- Number formatting is a recurring irritant. "POINT ZERO!" (346 points) asks for counters that do
  not jump between 39.9, 40 and 40.1, and the top reply limits this to numbers that change
  constantly ([lnhd91](https://www.reddit.com/r/incremental_games/comments/lnhd91/)).
- An Antimatter Dimensions tester warns that past scientific notation most players stop
  understanding the numbers at all
  ([fy1wp3, 277 points](https://www.reddit.com/r/incremental_games/comments/fy1wp3/)).
- Small text was the main fault in the ported mobile UI of Unnamed Space Idle
  ([1vuo6ol](https://www.reddit.com/r/incremental_games/comments/1vuo6ol/)).

Design implication: fixed-width, fixed-decimal counters for anything that ticks; one suffix scheme
(K, M, B, T, then letter pairs) used everywhere; body text no smaller than the platform default
(designer inference).

## 9. Install-free delivery

**Expectation: a vocal core wants link-and-play; the mass market still finds games in stores.**

- "Unpopular opinion: I kind of miss when incremental games were mostly in the browser instead of
  on Steam" is the subreddit's top conversation post of late 2025: browser games were "a constant
  stream of weird ideas that you could try instantly ... no install process, no store page"
  ([1pc5z30, 772 points](https://www.reddit.com/r/incremental_games/comments/1pc5z30/)). The top
  reply (89 points) pushes back that most browser idlers were ad-farm shovelware.
- In "do most of you actually want browser games?", the top reply lists "Lower barrier to entry,
  click and load. Near 0 chance of 'pay to win' mechanics, more likely to work on a broad spectrum
  of devices" ([1oxbv3h, 268 points](https://www.reddit.com/r/incremental_games/comments/1oxbv3h/)).
  The post itself asks for a game that is not blocked at work, with optional paid cloud save.
- In "Is there anything on here these days that isn't some Demo?", one reply says "I HATE
  downloading incremental games. Especially with Google Play store"
  ([1oa9krh, 208 points](https://www.reddit.com/r/incremental_games/comments/1oa9krh/)).
- The supply has moved away. In the archive, posts flaired "Steam" went from 0 in 2020 to 2,234
  in 2026, while "HTML" posts stayed at 150 to 550 a year. Kongregate stopped taking new games in
  July 2020 ([Wikipedia](https://en.wikipedia.org/wiki/Kongregate)), and the 2020 thread on its
  fall says the community lost its portal
  ([iilok3, 377 points](https://www.reddit.com/r/incremental_games/comments/iilok3/)).
- The web audience is large outside the idle niche: Poki reported about 100 million monthly
  players in late 2025 (self-reported, non-audited;
  [SuperJump](https://www.superjumpmagazine.com/what-pokis-100-million-monthly-gamers-reveal-about-the-future-of-browser-games/)),
  and Hamster Kombat, a tap-to-earn clicker that ran inside Telegram with no download, claimed
  more than 300 million players in 2024
  ([Decrypt](https://decrypt.co/242370/telegram-game-hamster-kombat-300-million-players)). The
  latter was driven by a crypto airdrop and is not a model, but it shows a clicker can reach a
  very large audience without a store.
- Web payment is now mainstream for mobile games: Bain counts 44 percent of top-grossing mobile
  games running their own web store, up from 12 percent five years earlier, after rulings in the
  US, EU and Brazil stopped stores penalising links to external payment
  ([Bain Gaming Report 2025](https://www.bain.com/insights/skipping-the-storefront-direct-distributions-growth-in-gaming-gaming-report-2025/)).
  A US court found Apple's anti-steering rules unenforceable on 30 April 2025
  ([Felix Braberg newsletter](https://felixbraberg.substack.com/p/emergency-episode-game-over-apple-742)).

## 10. Save portability

**Expectation: the save survives, and the player can take it with them.**

- "An appeal to incoming devs: if your game lacks autosave it's not ready for public play"
  ([t9u9en, 581 points](https://www.reddit.com/r/incremental_games/comments/t9u9en/)). Any
  form is accepted: "Autosave, manual save, code saving, doesn't matter".
- A 2026 thread asks why browser incrementals stopped offering save export, noting players "are
  now supposed to pray that our browser doesn't delete the save data"; a 22-point reply adds "I
  HATE having to create accounts"
  ([1tept85](https://www.reddit.com/r/incremental_games/comments/1tept85/)).
- Browser saves have been lost by platforms before: Kongregate's 2017 move to HTTPS orphaned the
  saves of HTML5 games uploaded before July 2016
  ([7bq2r6, 124 points](https://www.reddit.com/r/incremental_games/comments/7bq2r6/)).
- **Safari can delete the save.** Since 2020, WebKit's tracking prevention deletes "all of a
  website's script-writable storage after seven days of Safari use without user interaction on
  the site", including IndexedDB and localStorage. Web apps added to the Home Screen keep their own
  counter, and WebKit does not expect their data to be deleted
  ([WebKit blog, March 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)).
  Defold stores `sys.save` data in IndexedDB ([Defold HTML5 manual](https://defold.com/manuals/html5/)),
  so Out of Ruin's saves are in scope.
- WebKit's 2023 storage policy lets a site request persistent mode with
  `navigator.storage.persist()`; it is granted by heuristics, with "opened as a Home Screen Web
  App" as the example ([WebKit blog, 2023](https://webkit.org/blog/14403/updates-to-storage-policy/)).
  A 2024 WebKit bug reports Safari 17 returning false for every request
  ([WebKit Bugzilla 271401](https://bugs.webkit.org/show_bug.cgi?id=271401)).
- In-app browsers keep their own storage: since iOS 11, Safari view controllers inside apps have
  per-app cookies and local storage
  ([Microsoft Xamarin iOS 11 guide](https://learn.microsoft.com/ar-sa/previous-versions/xamarin/ios/platform/introduction-to-ios11/web)).
  A player who opens the game from a Reddit or Discord link and later from Safari sees two
  different saves (designer inference from the scoping rule).
- Native competitors lose saves too, through accounts. AFK Arena's 2025 Companions relaunch moved
  returning players onto a new server, and App Store reviewers report "all my progress was
  resets" until they find the Classic toggle in settings
  ([AFK Arena reviews feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1375425432/sortby=mostrecent/json);
  [r/AFKArena 1iqriq0](https://www.reddit.com/r/AFKArena/comments/1iqriq0/)). Tap Titans 2
  reviewers report a 2024 Facebook-login lockout and an iPad sign-in that overwrote their iPhone
  progress ([TT2 reviews feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1120294802/sortby=mostrecent/json)).
  Lost progress is 14 percent of AFK Arena's recent one- and two-star App Store reviews.

## Verdict on the web-first architecture

The evidence **validates** the web-first bet on four counts:

1. A vocal, influential core of idle players actively wants link-and-play games and complains
   that supply moved to Steam and the stores (section 9).
2. Portrait, short-session play suits a phone browser as well as an app (sections 1 and 2).
3. Selling gold through Stripe is no longer unusual: web stores are standard for top-grossing
   mobile games (section 9).
4. Web delivery avoids the ad SDK stack whose behaviour drives the worst competitor reviews
   (see [complaints-and-friction.md](./complaints-and-friction.md)).

It **challenges** the architecture on three counts, each with a known fix:

1. **Save durability on iOS.** A player who skips Safari for seven days of browsing can lose
   everything. Fixes, in order: a save-export code and import from day one; a prompt to add the
   game to the Home Screen after the first chapter, which also unlocks web push on iOS 16.4 and
   later ([WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/));
   a `persist()` request; and an optional account for cloud save before gold sales scale
   (designer inference).
2. **Re-engagement.** Without an installed icon or notifications, nothing reminds a player to
   return. The Home Screen prompt and web push are the only native-like hooks a browser game
   gets (designer inference).
3. **First load.** About 5 MB compressed on the 2020 engine build is acceptable for a game but
   needs a visible loader and caching (section 6).

None of these argues for going store-first. They argue for treating save durability and the Home
Screen install as core features of the web build rather than polish.
