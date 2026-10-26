# AdVenture Communist — Satirical Rank-and-Researcher Idler With Weekly Leaderboard Events Teardown

Research window: October 2026. Game version at time of writing: 6.59.1 (iOS, released
8 October 2026). All revenue and download figures are estimates and are tagged
**non-audited**. Reddit evidence comes from a full archive of r/AdventureCommunist
(17,385 posts, May 2016 to October 2026) pulled through Arctic Shift, plus top comments on
roughly 45 of the highest-signal threads. Reddit and developer statements are paraphrased,
not quoted, and every one is linked to its thread and tagged with its post score.

---

## 1. Snapshot

**Studio and ownership.**
[Hyper Hippo Entertainment](https://en.wikipedia.org/wiki/Hyper_Hippo_Entertainment) is a
private studio in Kelowna, British Columbia. Lance Priebe (Club Penguin co-founder) and
Pascale Audette founded it in late 2012. The current CEO is Sam Fisher, and Priebe is now
Chief Innovation Officer ([company page](https://hyperhippo.com/company/)).

Kongregate published the game at launch. Kongregate's Emily Greer described it as the
second title in the "AdVenture" brand partnership
([AListDaily, June 2017](https://www.alistdaily.com/strategy/kongregate-adventure-capitalist-sequel-communist/);
[GamesBeat, November 2017](https://gamesbeat.com/kongregate-and-hyper-hippo-launch-idle-clicker-adventure-communist/)).
Kongregate's role ended in version 4.8 (October 2019). Players noticed that the Kongregate
splash screen and the Kongregate account-link option had both disappeared
([r/AdventureCommunist, score 5](https://www.reddit.com/r/AdventureCommunist/comments/dc87o6/)).

The App Store seller is now "Hyper Hippo Publishing Ltd." (iTunes lookup API, October
2026), and Hyper Hippo says it set up its own publishing entity after AdVenture Communist
([company page](https://hyperhippo.com/company/)). The Android package is still named
`com.kongregate.mobile.adventurecommunist.google`
([Google Play](https://play.google.com/store/apps/details?id=com.kongregate.mobile.adventurecommunist.google)).

In November 2023 Hyper Hippo laid off 27% of its staff, including its creative director and
a senior game designer
([PocketGamer.biz](https://www.pocketgamer.biz/adventure-capitalist-dev-hyper-hippo-lays-off-over-a-quarter-of-staff)).
Headcount sources conflict. Wikipedia's infobox says 108 employees with no date, while the
layoff coverage implies a much smaller team today. I trust neither number precisely.

**Engine and technical posture.**
The game uses Unity. [MobyGames](https://www.mobygames.com/game/129038/adventure-communist/)
and [ModDB](https://www.moddb.com/games/adventure-communist) both list Unity, and
[PCGamingWiki](https://www.pcgamingwiki.com/wiki/AdVenture_Communist) lists Unity 5 for the
Steam build. That matches Hyper Hippo's ongoing Unity/C# hiring for its live mobile games
([Glassdoor listing](https://www.glassdoor.ca/job-listing/unity-developer-hyper-hippo-entertainment-JV_IC2278756_KO0,15_KE16,41.htm?jl=1007570291991)).

The backend is online-only. The store copy states that the game requires an internet
connection ([GameRefinery store snapshot](https://app.gamerefinery.com/game/59bb03f5787929676ae46ee0)).
Leaderboards are served from an undocumented Hyper Hippo leaderboard API on Google Cloud,
and the main community tool also calls PlayFab APIs
([adcom-web-leaderboard README](https://github.com/darrenrs/adcom-web-leaderboard)).
Hyper Hippo's own GDC postmortem on the sister game credits PlayFab live operations
([GDC Vault](https://gdcvault.com/play/1023486)).

The iOS build is 499 MB and requires iOS 13 or later (iTunes lookup). GameRefinery tracks
146 iOS versions between 2.0.1 (November 2017) and 6.59.1 (October 2026). Release QA
looks thin. The notes shipped with 6.58.2 are AdVenture Capitalist's patch notes, pasted in
by mistake ([GameRefinery Update History](https://app.gamerefinery.com/game/59bb03f5787929676ae46ee0)).

**Release and status.**
- Steam Early Access opened on 10 August 2016
  ([Wikipedia](https://en.wikipedia.org/wiki/AdVenture_Communist)). The game is still in Early
  Access, and the store page says the last developer update was more than nine years ago
  ([Steam](https://store.steampowered.com/app/462930/AdVenture_Communist/)). The PC build is
  effectively frozen on the pre-2018 design.
- The Android soft launch was in July 2017
  ([GameFAQs](https://gamefaqs.gamespot.com/android/257469-adventure-communist/data)).
  Sensor Tower shows downloads starting that month.
- The worldwide iOS and Android launch was on 16 November 2017
  ([GamesBeat](https://gamesbeat.com/kongregate-and-hyper-hippo-launch-idle-clicker-adventure-communist/)).
- Version 3.0 rebuilt the game. It reached Android in early October 2018
  ([r/AdventureCommunist, score 10](https://www.reddit.com/r/AdventureCommunist/comments/9lme2b/))
  and iOS on 1 November 2018. Hyper Hippo's own history dates AdVenture Communist's "launch"
  to 2018 ([company page](https://hyperhippo.com/company/)). That is the date of this
  relaunch, not the 2017 store release. Both dates are correct for different things.
- The game is live today. Rank 187 and a 10-Year Anniversary event shipped on 30 July 2026
  ([r/AdventureCommunist, score 17](https://www.reddit.com/r/AdventureCommunist/comments/1vaymoh/)).
  Ghost Operatives shipped in 6.59.0 on 5 October 2026
  ([r/AdventureCommunist](https://www.reddit.com/r/AdventureCommunist/comments/1wycyke/)).

**Platforms.**
iOS, Android, and Steam (Windows and Mac, frozen). The Kongregate web URL I tried
redirected to the Kongregate home page, so I could not confirm that a web version is still
playable.

**Distribution.**
Free-to-play on the [App Store](https://apps.apple.com/us/app/adventure-communist/id1225683141)
(rated 4+), [Google Play](https://play.google.com/store/apps/details?id=com.kongregate.mobile.adventurecommunist.google)
and [Steam](https://store.steampowered.com/app/462930/AdVenture_Communist/).

**Pricing and monetisation model.**
- **In-app purchases** range from $0.49 to $99.99 per item on Google Play. They sell Gold
  (the premium currency), capsules (loot boxes of researcher cards), science packs, time
  warps, rank bundles and event starter packs.
- **Supreme Pass** costs $9.99 for a 30-day season. It adds a premium track on the Special
  Operations tier rewards, a permanent 2x Propaganda Boost with no ads, a third ops slot, and
  four stackable free capsules in events instead of two
  ([wiki: Supreme Pass](https://adventurecommunist.fandom.com/wiki/Supreme_Pass)).
- **Paid event add-ons** include "Ad Free Airdrops" for events (6.11, March 2022) and Premium
  Revolutionary Rushes, which are paid event modifiers (6.36, June 2024)
  ([Update History](https://app.gamerefinery.com/game/59bb03f5787929676ae46ee0)).
- **Rewarded video only.** There are no interstitials, no banners, no offer wall and no
  one-time "remove ads" purchase. GameRefinery's November 2025 audit (v6.51) counts two ad
  placements
  ([GameRefinery](https://app.gamerefinery.com/game/59bb03f5787929676ae46ee0)). In practice,
  rewarded ads sit behind the production boost, airdrops, mystery researchers, time warps,
  welcome-back and offline-earnings multipliers (section 2).
- **Offer segmentation.** Bundles are segmented by lifetime spend, spend in the last 26
  days, and rank. The segments are called "Freeloader", "Minnow", "Dolphin", "Whale" and
  "Reactive". Non-payers and lapsed payers see better value multipliers than whales
  ([wiki: Shop](https://adventurecommunist.fandom.com/wiki/Shop); community-sourced).
- **Free-gold offer wall.** This was removed on iOS in mid-2019 for Apple policy reasons, and
  on Android in December 2019. Third-party offers frequently failed to pay out
  ([developer post, score 119](https://www.reddit.com/r/AdventureCommunist/comments/e64o6p/)).

**Audience scale.**
Sensor Tower worldwide estimates for iOS plus Android (Sensor Tower via Supercell data
warehouse, non-audited, in-app purchases only, ad revenue excluded):

| Year | IAP revenue | Downloads | iOS share of revenue |
|---|---|---|---|
| 2017 (from July) | $0.34M | 2.29M | 41% |
| 2018 | $0.73M | 1.28M | 47% |
| 2019 | **$8.96M** (peak) | **6.35M** | 36% |
| 2020 | $6.56M | 1.48M | 37% |
| 2021 | $4.81M | 2.01M | 44% |
| 2022 | $3.93M | 1.89M | 47% |
| 2023 | $3.30M | 1.75M | 50% |
| 2024 | $2.79M | 0.99M | 49% |
| 2025 | $2.80M | 0.33M | 54% |
| 2026 (to 22 Oct) | $1.68M | 0.24M | 58% |

- **Lifetime totals** are about $35.9M of IAP and 18.6M downloads (non-audited). The best
  month was July 2019 at $1.15M. Monthly revenue fell from $212k in January 2026 to $131k in
  September 2026.
- **Download sources conflict.** Google Play shows "10M+" installs, with an underlying
  counter of 16.0M Android installs. Sensor Tower estimates 12.4M Android downloads. I trust
  the Play counter for Android volume, because it is first-party (though it counts
  reinstalls), and Sensor Tower for trend shape. The older figure of five million installs
  as of December 2018 comes from the developer via
  [Wikipedia](https://en.wikipedia.org/wiki/AdVenture_Communist) and is marketing-adjacent.
- **Engaged-player proxy.** Hyper Hippo's leaderboard API exposes a player count per event,
  scraped by [idlegametools](https://idlegametools.com/adcom-leaderboard/eventlist) since
  August 2022 (non-audited, community tool). Average players per weekend (100-hour) event:
  - 2022: 110k
  - 2023: 112k
  - 2024: 88k
  - 2025: 64k
  - 2026: 46k

  The October 2026 runs were Zombie Revolution at 38.5k, Space Force at 36.4k and Spooky
  State at 37.1k. The core weekly audience has fallen by about 59% since 2023.

**What happened in 2019: the 12x revenue jump.**
IAP rose from $0.73M in 2018 to $8.96M in 2019. Release notes (via GameRefinery Update
History), Sensor Tower monthly data and the subreddit show three layered causes.

*1. The v3.0 rebuild (October to November 2018) fixed monetisation per player before any
growth in installs.*
- The 2017 game was a cross-industry clicker with Time Travel prestige, Experiments and
  Medals (2.x release notes).
- Version 3.0 replaced it with a new structure:
  - **Ranks**, a prestige reset gated by a mission checklist
  - **Researchers**, collectible cards from **capsules** that automate and multiply
    generators
  - **Trades**, which convert resources into Comrades
- The release notes promised compensation for past purchases. Players who had bought a
  "permanent ad boost" received gold instead, because the boost no longer existed in code
  ([score 30](https://www.reddit.com/r/AdventureCommunist/comments/fs3qtz/);
  [score 80](https://www.reddit.com/r/AdventureCommunist/comments/ftlsdi/)).
- The result: from September to December 2018, monthly revenue rose 6.9x ($17k to $118k)
  while downloads rose only 2.7x (19k to 51k).
- Ranks were drip-fed through this period. The cap moved from 28 (October 2018) to 35
  (November), 39 (December), about 49 (January 2019) and 65 (March 2019). Each cap turned
  into "more ranks coming soon" threads
  ([score 11](https://www.reddit.com/r/AdventureCommunist/comments/9orrb4/);
  [score 15](https://www.reddit.com/r/AdventureCommunist/comments/asumxm/)).

*2. Scale: downloads roughly 5x from February to August 2019.*
- Version 3.4.1 (31 January 2019) added Spanish, Portuguese, French, German and Italian.
- In February 2019 worldwide downloads jumped from 165k to 779k and stayed between 700k and
  840k a month through August.
- The US alone went from 143k to 391k downloads in February, with Germany at 75k and the UK
  at 75k (Sensor Tower country split, non-audited).
- A US jump of that size points to paid user acquisition or store featuring, not
  localisation alone. I could not confirm which.
- In September 2019 downloads fell to 293k. That looks like the end of a user-acquisition
  burst.

*3. New spend sinks layered on in quick succession (March to July 2019).*
- **March 2019** ($761k, about 2x February):
  - 3.5.4 added "watch an ad for a researcher" and more Researchers of the Day.
  - 3.6 (22 March) added Epic and Supreme bundle offers.
  - 3.7 added Epic and Supreme capsules
    ([wiki: Capsules](https://adventurecommunist.fandom.com/wiki/Capsules)).
- **May 2019** ($1.005M): 4.1 (7 May) launched Limited-Time Events, starting with Space
  Force on 9 May. 4.2 (22 May) put Epic and Supreme capsules into the free-capsule cycle.
- **June 2019**: 4.3 added event-exclusive researchers that carry back to the Motherland, and
  the Anew Atlantis event.
- **July 2019** ($1.15M peak): 4.4 (2 July) added event **leaderboards** and "Time Hack"
  bundles, and began displaying Supreme odds on Gold Capsules.

*Subreddit volume tracks this curve.* Posts rose from 9 to 37 a month in late 2018, to 148
in March 2019, 295 in April and 537 in May (Arctic Shift archive).

*Revenue per download.* 2019 earned about $1.41 per download, against $0.57 in 2018
(non-audited). So the 12x splits into roughly 2.5x better monetisation per install and
roughly 5x more installs.

Later spikes line up with content beats:
- December 2019 ($773k): the first Christmas event and the offer-wall removal.
- April 2020 ($768k): 5.0 Supreme Pass, during COVID lockdowns.
- December 2020 ($604k): Supreme Santa.

**Review sentiment.**
| Store | Rating | Ratings | Source |
|---|---|---|---|
| iOS (US) | 4.68 | 58,434 | iTunes lookup, October 2026 |
| Google Play | 4.26 | 260,549 | [Google Play](https://play.google.com/store/apps/details?id=com.kongregate.mobile.adventurecommunist.google), October 2026 |
| Steam | Mixed, 62% positive | 3,320 English reviews | [Steam](https://store.steampowered.com/app/462930/AdVenture_Communist/) |

The store averages are inflated by the review prompts, which have been in since at least
2019 (4.5.0 fixed a "Rate Us" popup bug). They are far rosier than the subreddit (section 4).

**Critical reception.**
Coverage was thin and mostly launch PR:
- Hyper Hippo's creative director, Cody Vigue, pitched it as more than a reskin, with more
  complex economies and resource scarcity
  ([GamesBeat](https://gamesbeat.com/kongregate-and-hyper-hippo-launch-idle-clicker-adventure-communist/)).
- Kongregate's COO praised the humour carried over from the first game (same article).
- Wikipedia summarises reviews as generally positive but too close to the predecessor and
  heavy on microtransactions. Edamame Reviews gave it 8.8/10
  ([Wikipedia](https://en.wikipedia.org/wiki/AdVenture_Communist)).
- I found no reviews of the post-2018 design from a major outlet.

**Player promise (store copy).**
The App Store description tells players to
"seize the means of production to climb to the highest Rank"
([store text via GameRefinery](https://app.gamerefinery.com/game/59bb03f5787929676ae46ee0)).
The listed pillars are potatoes, Gold, Capsules, Supreme Pass, Shop, Researchers,
Limited-Time Events and idle income. Steam pitches the "world's fairest communism
simulator."

**Strategic read for Out of Ruin.**
AdVenture Communist is the closest living template for Out of Ruin's direction:
- rank-ups driven by a mission checklist
- a production cascade where higher tiers produce lower tiers
- collectible cards that automate and multiply that cascade
- a weekly calendar of themed side-economies feeding back into the main game

GameRefinery scores its motivation profile at:
- completing milestones: 4.11 (idler average 4.04)
- resource optimisation: 3.35 (average 3.07)
- excitement and thrill: 1.11 (average 1.66)
- competing with others: 1.03

That profile is the same calm, milestone-driven idle audience Out of Ruin targets
([GameRefinery](https://app.gamerefinery.com/game/59bb03f5787929676ae46ee0)).

It is also the clearest case study of how a strong progression model gets hollowed out:
- events tuned so the final reward needs money
- leaderboards with client-side scores that hackers own
- automation gated by card luck
- an ad layer whose length and failure rate grew until it became the main topic of
  conversation

Revenue fell about 69% from the 2019 peak to 2025, and weekly event participation fell
about 59% from 2023 to 2026.

---

## 2. Core system designs

### 2.1 The cascading industry economy ("Motherland")

- **Player-facing intent.** Build five themed production chains and watch numbers climb
  into named orders of magnitude (AA, BB, … KFC, … AAAA). The fun is planning which tier to
  buy next. Players praise it as an idler where everything can be calculated, with no hidden
  online/offline formula differences
  ([score 20](https://www.reddit.com/r/AdventureCommunist/comments/b32x6l/)).

- **Mechanical model.** There are five industries: Potato, Land, Ore, Military (bullets)
  and Placebo. Each has a base resource and 11 generator tiers. Tier 1 produces the base
  resource, and every higher tier produces units of the tier below
  ([wiki: Industries](https://adventurecommunist.fandom.com/wiki/Industries)).

  In the Potato industry, tier *n* produces *n + 2* units of tier *n − 1* every 2^n
  seconds:
  - Farmer: 3 potatoes every 2 s
  - Commune: 4 farmers every 4 s
  - Freight: 5 every 8 s
  - Plantation: 6 every 16 s
  - and so on, up to Cold Storage at 10 every 4 min 16 s
  ([wiki: Potato industry](https://adventurecommunist.fandom.com/wiki/Potato_industry);
  [Farmers](https://adventurecommunist.fandom.com/wiki/Farmers);
  [Communes](https://adventurecommunist.fandom.com/wiki/Communes)).

  Unit costs are **flat**, not escalating. A Commune always costs 100 potatoes, 10 farmers
  and 1 Comrade. A Freight costs 10,000 potatoes, 50 communes and 1 Comrade. Comrade cost
  per unit scales by industry: Potato 1, Land 2, Ore 3, Military 4, Placebo 5
  ([wiki: Comrade](https://adventurecommunist.fandom.com/wiki/Comrade)).

  This differs from AdVenture Capitalist's per-purchase price growth. Growth here comes
  from the cascade itself (polynomial in time per tier), and the binding constraint is
  Comrades, not price curves.

  Every generator also has a luck roll. The base is a 1% chance of 2x output, which
  researchers raise. The wiki's worked example, Chance level 6 plus Bonus level 4, gives
  about 114.7x effective output
  ([wiki: Bonus](https://adventurecommunist.fandom.com/wiki/Bonus)).

- **Data shape.** Per resource:
  - owned count
  - production quantity and cycle time
  - unit cost (base resource + lower-tier count + Comrades)
  - unlock threshold (for example, 25 farmers unlocks Communes)
  - first-appearance rank
  - rank at which its automating Common researcher can drop

- **Progression and gating.**
  - Industries unlock with rank and a base-resource threshold. Land unlocks at 50 billion
    potatoes (Rank 3), Ore at 500T land (Rank 5), Military at 500CC ore (Rank 10), Placebo
    at 50FF bullets (Rank 17).
  - Tiers 9 to 11 arrive late: Sky Farm at Rank 102, Nanomachines at Rank 161
    ([wiki: Industries](https://adventurecommunist.fandom.com/wiki/Industries)).
  - Science is earned when each generator's count passes a power of ten, worth 1 to 5
    science by industry
    ([wiki: Science](https://adventurecommunist.fandom.com/wiki/Science)).

- **Inputs, UI, affordances.**
  - One vertical list per industry, with tab switching between industries.
  - A buy-multiplier toggle: 1 / 10% / 50% / max. A 1% option was added in 5.5 (October
    2020) after more than a year of requests
    ([score 295](https://www.reddit.com/r/AdventureCommunist/comments/f36c2w/);
    [score 175](https://www.reddit.com/r/AdventureCommunist/comments/i1dmyc/)).
  - Tap a generator to run one cycle if it is not automated. Hold-to-run was added in 5.1.
  - Science bubbles must be tapped. "Collect all science" arrived only in 6.17
    (September 2022), after highly upvoted requests
    ([score 166](https://www.reddit.com/r/AdventureCommunist/comments/c4lf6k/);
    [score 161](https://www.reddit.com/r/AdventureCommunist/comments/iqe1h2/)).

- **Failure modes and edge cases.**
  - **Accidental spend.** A mis-scroll spends billions of Comrades on a low tier. One player
    lost 9 million Comrades this way
    ([score 91](https://www.reddit.com/r/AdventureCommunist/comments/fu8ynb/)). The 5.0
    "Confirm" dialog for Comrade spend on lower industries drew a 342-score thank-you
    thread ([THANK YOU](https://www.reddit.com/r/AdventureCommunist/comments/fsamol/)).
  - **Opacity.** Players built their own spreadsheets to decide where science should go
    ([score 26](https://www.reddit.com/r/AdventureCommunist/comments/a7v07j/);
    [score 26](https://www.reddit.com/r/AdventureCommunist/comments/aewbml/)).
  - **Late-rank balance.** Mission quantities outran what maxed researchers could support.
    A 2022 patch had to reduce the Magma Extractor requirement at Rank 175 (6.20).

- **Why it works.** Flat costs plus a cascade make the maths legible and reward the Strategist
  archetype (resource optimisation 3.35, against a 3.07 average). The cost is that the game
  has no natural price curve to slow players, so pacing has to come from Comrades, mission
  quantities and researcher levels. Those are exactly the levers that later became the
  monetisation levers.

### 2.2 Comrades and Trades (the single cross-industry bottleneck)

- **Player-facing intent.** Comrades are your workforce, the "true" currency. Every unit in
  every industry costs Comrades, so the player is always deciding which industry to feed.

- **Mechanical model.**
  - Comrades accrue per second. The rate rises only through **Trades**.
  - The *n*-th Trade in an industry costs 5 × 10^(3n) of that industry's base resource:
    5,000, then 5M, 5B, and so on, up to 5 TTTTT at trade 102.
  - Each trade adds 1 to 5 Comrades per second by industry, multiplied by Trade
    researchers. The supreme researcher Earth Wyrm Jym boosts all industries
    ([wiki: Trades](https://adventurecommunist.fandom.com/wiki/Trades);
    [wiki: Comrade](https://adventurecommunist.fandom.com/wiki/Comrade)).
  - Comrades and trades reset on every rank-up.

- **Data shape.** Trade count per industry, Comrades per second, Comrade bank.

- **Progression and gating.** Past the first ranks, the wiki says players spend "many days"
  waiting for Comrades. The community's most-cited walls are Comrade walls
  ([score 117](https://www.reddit.com/r/AdventureCommunist/comments/g8dnrd/);
  [score 111](https://www.reddit.com/r/AdventureCommunist/comments/ibxif8/)).

- **Inputs, UI, affordances.**
  - The Trade button sits beside each industry.
  - 4.12 (January 2020) added "Fast Trades", multiple trades in one tap, and 4.13 added a
    max toggle.
  - Comrade airdrops are the main accelerator, and the ad version is worth roughly 17x
    the free one (section 2.6).

- **Failure modes.**
  - Comrade rate is the real progress meter, but the UI headlines resources.
  - Before 3.6, upgrading a Trade researcher did not apply to trades already made that
    rank, so the upgrade felt wasted
    ([score 7](https://www.reddit.com/r/AdventureCommunist/comments/9xx40x/)).

- **Why it works.** A single scarce input that every system competes for creates real
  allocation decisions in an idle game. It also gives designers one dial (Comrade cost of
  missions) for the length of every rank, which they used heavily, sometimes badly
  (section 4.6).

### 2.3 Ranks and Missions (prestige by checklist)

- **Player-facing intent.** A long, legible ladder: 187 ranks as of July 2026. Each rank
  gives a new avatar every few ranks, a Silver Capsule, and "Rank N" brag posts. Rank-up
  posts are a staple of the subreddit's "Accomplishment" flair (710 posts).

- **Mechanical model.**
  - Each rank shows a mission list. You must complete *X* of *X + 3*, so the three extras
    act as slack you can skip
    ([wiki: Ranks](https://adventurecommunist.fandom.com/wiki/Ranks)).
  - Required missions per rank: 10 at Ranks 7–19, 12 at 20–39, 14 at 40–59, 16 at 60–79,
    18 at 80–99, 20 at 100–180, and 23 at 181 and above.
  - Mission types ([wiki: Missions](https://adventurecommunist.fandom.com/wiki/Missions)):
    - unlock an industry
    - make *n* trades
    - collect or own *n* of a resource
    - collect *n* researcher cards
    - collect *n* science
    - spend *n* science
    - promote *n* researchers
  - Each mission pays a Wood or Stone Capsule, and some also pay Gold or Science.
  - **Ranking up is a prestige reset.** All industries except Potato lock, all resources
    drop to one Farmer, and all trades are revoked. Gold, Science, researcher levels and
    cards persist, and unclaimed rewards auto-collect
    ([wiki: Ranks](https://adventurecommunist.fandom.com/wiki/Ranks)).
  - Ranking up does not itself raise production. Only researchers do.

- **Data shape.** Rank integer; per-rank mission list (type, target resource, quantity,
  reward capsule); required and available counts; avatar tier.

- **Progression and gating.**
  - The rank cap is content-gated. Ranks shipped quickly in 2018–2019 (28 to 89 in about
    eleven months), then slowed to 10 per update by 2021–2022.
  - Rank 180 shipped in October 2022, and Rank 181 not until December 2024 (6.41). That is
    a 26-month gap during which capped players had nothing to rank into
    ([score 31](https://www.reddit.com/r/AdventureCommunist/comments/1fgpaiy/)).

- **Inputs, UI, affordances.**
  - A Rank screen lists missions with progress bars.
  - "Mission descriptions made more clear" shipped in 4.9.
  - 4.6 added "Reward Review" and "Rank Bank" previews.
  - "More ranks coming soon" appears at the cap, which itself became a meme
    ([score 151](https://www.reddit.com/r/AdventureCommunist/comments/p1s2fd/)).

- **Failure modes and edge cases.**
  - **Card and RNG missions.** "Collect 1,250 cards" or "Promote researchers" depend on
    capsule luck and science, not on play
    ([score 167](https://www.reddit.com/r/AdventureCommunist/comments/g91lzf/);
    [score 79](https://www.reddit.com/r/AdventureCommunist/comments/ckt960/)).
  - **Uncompletable missions.** In 2018 a bug left players stuck at a rank with no missions
    shown
    ([score 6](https://www.reddit.com/r/AdventureCommunist/comments/a0z52r/)); 3.5.4 later
    fixed players unable to rank up because missions were missing.
  - **Rank-up versus mop-up.** A long-running strategy debate asks whether you should skip
    the slack missions or finish them for capsules
    ([example](https://www.reddit.com/r/AdventureCommunist/comments/b3apns/)).

- **Why it works.** It converts a pure-numbers idler into a milestone game, which suits this
  audience's top motivation (4.11). The *X of X + 3* slack is an elegant release valve that
  Out of Ruin's chapter quest lists lack today. The reset keeps early tiers relevant every
  rank, and persistent researchers make each run measurably faster.

### 2.4 Researchers and Capsules (collection, automation and gacha)

- **Player-facing intent.** Collect named parody characters (Ratchemus Prime, Earth Wyrm
  Jym, Dr. Shortstack) and level them to automate and multiply your industries. The pull of
  a Supreme from a free capsule is the subreddit's signature high
  ([score 262](https://www.reddit.com/r/AdventureCommunist/comments/eo7l3p/)).

- **Mechanical model.** The wiki lists 99 researchers: 55 Common, 20 Rare, 14 Epic, 5
  Supreme and 5 Event
  ([wiki: Researcher](https://adventurecommunist.fandom.com/wiki/Researcher)).

  There are eight modifier types: Speed, Power, Chance, Bonus, Discount, Trade, Cards and
  Science. The store copy lists only five. I trust the wiki, because it enumerates every
  card. Rarity sets the scope of the effect:
  - **Common:** Speed for a single resource, which also **turns on automation** for that
    generator. For example, Ringo Ringlet automates Farmers and doubles their speed
    ([wiki](https://adventurecommunist.fandom.com/wiki/Ringo_Ringlet)).
  - **Rare:** industry-wide Chance or Power, base-resource Power, or Trade for one
    industry.
  - **Epic:** industry-wide Bonus or Discount, or Cards / Science per capsule type.
  - **Supreme:** one of Power, Chance, Bonus, Discount or Trade for all industries.
  - **Event:** a 20% chance that Wood or Stone capsules also drop hours of one resource.

  Levels need duplicate cards plus science. Ratchemus Prime (x2 production for all
  industries) needs:
  - Level 1: x2, 1 card, free
  - Level 2: x4, 2 cards, 5k science
  - Level 3: x8, 5 cards, 20k science
  - Level 4: x16, 10 cards, 50k science
  - Level 5: x32, 20 cards, 100k science
  ([wiki](https://adventurecommunist.fandom.com/wiki/Ratchemus_Prime)).

  Shop card prices ([wiki: Researcher](https://adventurecommunist.fandom.com/wiki/Researcher)):
  | Rarity | Science | Gold |
  |---|---|---|
  | Common | 10 | 0.5 |
  | Rare | 100 | 5 |
  | Epic | 1,000 | 50 |
  | Supreme | 40,000 | 1,500 |

  Cards beyond a researcher's max convert to science at half the shop price.

  Capsule contents are a fixed card count with fractional rarity expectations, scaled by
  rank multipliers. Supreme ratios per card
  ([wiki: Capsules](https://adventurecommunist.fandom.com/wiki/Capsules)):
  - Wood: 8 cards, 1 in 40,000
  - Stone: 1 in 15,000
  - Silver (rank-up): 1 in 5,000
  - Iron: 1 in 4,000
  - Gold: 1 in 1,600
  - Diamond: 1 in 240
  - Supreme Capsule (750 gold): exactly one Supreme

- **Free capsules are deterministic.** One free capsule arrives every 4 hours from a fixed
  **241-capsule cycle**: 188 Wood, 47 Stone, 4 Iron, 1 Epic and 1 Supreme. That is a
  guaranteed Supreme roughly every 40 days for a player who claims every capsule
  ([wiki: Free capsules](https://adventurecommunist.fandom.com/wiki/Free_capsules)). The
  community reverse-engineered the cycle and runs a public tracker
  ([score 277](https://www.reddit.com/r/AdventureCommunist/comments/de0t74/)).

- **Data shape.** Researcher id, rarity, modifier type, target scope, level, card count,
  max cards; capsule type, card count, rarity ratios, science range, gold cycle, rank
  multiplier table; free-capsule cycle index.

- **Progression and gating.**
  - Researchers unlock into the drop pool by rank.
  - Each Common automator becomes droppable a rank or two after its generator appears.
    Biodome, for example, appears at Rank 79, with its researcher from Rank 80
    ([wiki: Industries](https://adventurecommunist.fandom.com/wiki/Industries)).
  - Researchers of the Day rotate in the shop. 6.28 (September 2023) let players choose the
    researcher before the "mystery researcher" ad.
  - Supreme level 6 would need 50 cards. A 2020 thread estimated about 9 months to reach
    level 5 from shop Supremes alone, and Hyper Hippo said it had no plans to raise the cap
    ([score 59](https://www.reddit.com/r/AdventureCommunist/comments/halfa8/)).

- **Inputs, UI, affordances.**
  - The Cards tab sorts by "available upgrade" (5.1).
  - Capsules open card by card. A Skip button arrived only in 6.4 (2021).
  - Supreme odds have been shown on Gold capsules since 4.4.
  - Capsule contents are visible in bundles since 6.0.

- **Failure modes and edge cases.**
  - **Automation gated by luck.** Until the Common Speed card drops, the generator must be
    tapped by hand. Players report being stuck for ranks without an automator
    ([score 9](https://www.reddit.com/r/AdventureCommunist/comments/bant13/);
    [score 8](https://www.reddit.com/r/AdventureCommunist/comments/1x6d2nq/)).
  - **Luck-only Supreme power.** Supremes are huge multipliers obtainable only through luck,
    gold or the 40-day cycle. That creates the free-to-play versus paying gap players
    describe ([score 83](https://www.reddit.com/r/AdventureCommunist/comments/cr2akh/)).
  - **No content at the cap.** Once every card is maxed, there is nothing to do but hoard
    ([score 16](https://www.reddit.com/r/AdventureCommunist/comments/1o0d9vf/)).

- **Why it works (and doesn't).** Making automation a collectible ties the gacha to the idle
  fantasy: every card visibly changes the economy. The deterministic free-capsule cycle is
  a quiet, generous pity system. The failure is that the most important cards for *flow*
  (Common automators) share the same luck as cosmetic-feeling extras. That puts luck in the
  way of the core idle promise.

### 2.5 Limited-Time Events (weekly side economies with leaderboards)

- **Player-facing intent.** A themed mini-game every few days (Space Force, Anew Atlantis,
  Ninja Union, Zombie Revolution, Spooky State, Supreme Santa…). Players race through a
  separate rank ladder before a timer ends and carry rewards back to the Motherland.

- **Mechanical model.**
  - Events unlock at Rank 8 and come in four formats
    ([wiki: Events](https://adventurecommunist.fandom.com/wiki/Events)):

    | Format | Length | Ranks | Industries | Schedule (UTC) |
    |---|---|---|---|---|
    | Mini (midweek) | 32 h | 11 | 2 | Tuesday to Thursday |
    | Fusion mini | 52 h | 16 | 2 | |
    | Weekend | 100 h | 21 | 3 | Thursday 16:00 to Monday 20:00 |
    | Long (holiday) | 268 h | 31 | 4 | |

  - Each event has its own industries, its own researchers and **Dark Science**, a
    currency that dies with the event
    ([wiki: Dark Science](https://adventurecommunist.fandom.com/wiki/Dark_Science)).
  - Event rank rewards are claimed at the end. In Space Force, the Rank 20 tier includes
    Supreme capsules
    ([wiki: Space Force](https://adventurecommunist.fandom.com/wiki/Space_Force)).
  - Trophies feed a **leaderboard** with brackets: Champion (1st), Top 5, Top 25, Top 100,
    then the top 1%, 5%, 10%, 25%, 50% and 75%, then a "Blue Ribbon" for everyone
    (same page).
  - The leaderboard API reports a `divisionSize` of 25 on all 434 tracked events since
    August 2022. That matches the "Short Leaderboards" that shipped in 6.18 (October 2022)
    ([idlegametools API](https://idlegametools.com/adcom-leaderboard/eventlist)).
  - Since 6.36 (June 2024), "Revolutionary Rushes" attach a modifier to an event, such as
    2x airdrops or shorter time-warp ad cooldowns, with a paid Premium tier. The October
    2026 calendar pairs Ninja Union (2x airdrop frequency) with Premium Ninja Union
    (30-minute ad time-warp cooldown and extra Dark Science airdrops)
    ([October calendar, score 9](https://www.reddit.com/r/AdventureCommunist/comments/1wv5jrn/)).

- **Data shape.** Event id, internal name, start and end, format, rank ladder (missions per
  rank, reward per rank), industries, event researcher pool, Dark Science economy,
  leaderboard division (25 players), bracket table, Rush modifiers (free and premium),
  player count.

- **Progression and gating.**
  - The final rank tiers are tuned around boosts, gold and time warps.
  - Missions inside events are often gated by an event researcher that only appears
    several ranks later
    ([score 171](https://www.reddit.com/r/AdventureCommunist/comments/v20tl9/)).
  - Free capsules in events stack 2, or 4 with the Supreme Pass. That makes 4-hour
    check-ins the rhythm, overnight included.

- **Inputs, UI, affordances.**
  - An event tab in the bottom bar and a rank screen with a trophies-to-next-rank counter
    (4.6).
  - Event airdrops (ad and non-ad), an event shop with starter packs (6.9), and
    "Ad Free Airdrops" (6.11).
  - Calendars are now posted monthly on Reddit and Discord.

- **Failure modes and edge cases.**
  - The first event was widely judged impossible to finish without paying (section 4.1).
  - Dark Science and event cards vanish at the end, which makes event bundles feel like
    burning money
    ([score 103](https://www.reddit.com/r/AdventureCommunist/comments/bnvqs8/)).
  - Leaderboard scores were easily faked (section 4.2).
  - Rebalances have been reverted mid-cycle
    ([developer post, score 23](https://www.reddit.com/r/AdventureCommunist/comments/1lzzwe2/)).

- **Why it works.** Events gave a capped, waiting player something to do every few days.
  Event discussion rose from about 20% of subreddit posts in 2019 to 30% in 2025, as events
  became the game while main-game ranks stalled (keyword pass over all 17,385 posts). The
  percentile brackets mean most players earn *something* for participating. The flaw is
  that the premium path (final tier, top brackets) is where the money is. Tuning slid
  toward making the free path visibly incomplete.

### 2.6 Ad-gated accelerators (Propaganda, Airdrops, Time Warps)

- **Player-facing intent.** "Watch an ad, go faster." The theme even sells it, with
  "Propaganda" boosts.

- **Mechanical model.**
  - **Propaganda Boost** gives 2x all production for 4 hours per ad, stackable to 24 hours.
    It went from 3 hours to 4 hours in May 2019
    ([wiki](https://adventurecommunist.fandom.com/wiki/Propaganda_Boost);
    [developer post, score 198](https://www.reddit.com/r/AdventureCommunist/comments/bu4cmj/)).
  - **Motherland airdrops**
    ([wiki: Airdrop](https://adventurecommunist.fandom.com/wiki/Airdrop)):
    - ad airdrops: Comrades (5 per day), Science (5 per day) and 5 Gold (2 per day)
    - unlimited non-ad airdrops: Comrades, a core resource and Science
  - **Event airdrops:** ad Comrades 6 per 12 hours and Dark Science 4 per 12 hours.
  - **Ad versus free value.** At Rank 50, an ad Comrade airdrop pays 5,215 seconds of
    Comrade income, against 300 seconds for the free one: about 17x. An ad Science airdrop
    pays 100, against 15 free (same page).
  - **Later additions** (Update History):
    - Mystery Researcher ad
    - Welcome-back ad multiplier, rising with each ad that day (6.28)
    - Offline-earnings ad (6.21)
    - 30-minute AdWatch Time Warp (6.25.1)
    - Daily ad counter (6.15)

- **Data shape.** Ad slot type, daily cap, cooldown, reward formula (seconds of income ×
  rank table), boost stack timer.

- **Progression and gating.** Ad rewards scale with rank. Event Rush modifiers shorten ad
  cooldowns, and paid tiers shorten them further.

- **Inputs, UI, affordances.**
  - A plane (or zeppelin, spaceship or boat in events) flies across the screen, and tapping
    it offers the reward.
  - A TV shows the Propaganda timer.
  - Airdrops pause while the player is in menus (3.8). An airdrop "retry" was added in
    December 2019 ([score 65](https://www.reddit.com/r/AdventureCommunist/comments/ebar2g/)).

- **Failure modes.**
  - Ads that fail to pay out.
  - Ad length growing from 30 seconds to 120 seconds or more, with chained end cards.
  - Ad content inappropriate for a 4+ app.
  - Region-specific ad stacks. All are detailed in section 4.4.
  - A player who wants the full game watches dozens of ads a day. One thread counted up to
    40 per day in an event alone
    ([score 171](https://www.reddit.com/r/AdventureCommunist/comments/v20tl9/)).

- **Why it works (and doesn't).** A 17x gap between ad and non-ad rewards makes ads
  non-optional for anyone who cares about progress. That kept a large non-paying base
  monetising, but it hands the game's moment-to-moment quality to the ad network. No
  one-time "remove ads" product exists, and the Supreme Pass removes only the Propaganda
  ads, not airdrop or mystery-researcher ads
  ([score 144](https://www.reddit.com/r/AdventureCommunist/comments/fstf3h/)).

### 2.7 Special Operations, Supreme Pass and Daily Directives (the battle pass)

- **Player-facing intent.** Daily and weekly side tasks that pay capsules, gold and science,
  plus a 30-day tier track with a paid premium lane.

- **Mechanical model.** Special Operations arrived in 4.12 (January 2020) and unlock at
  Rank 6 ([wiki](https://adventurecommunist.fandom.com/wiki/Special_Operations)):
  - An operation appears every 12 hours and two can stack.
  - Tasks include opening capsules, claiming airdrops, earning science, earning researchers
    of a rarity, and buying featured researchers.
  - Replacing an operation costs 10 gold, and skipping its timer costs about 1 gold per 14
    minutes.
  - Three daily gifts (every 4 hours) also add points.
  - Points fill free and Supreme tier tracks that reset every 30 days.

  The Supreme Pass ($9.99) gives a third slot, 8-hour refresh and one free replace per day.

  6.58 (September 2026) rebuilt this as "Daily Directives" with daily, weekly, limited and
  event tracks. 6.55 (May 2026) added "Proletariat Provisions", a daily check-in reward
  ([APKMirror 6.58.1 notes](https://www.apkmirror.com/apk/hyper-hippo/adventure-communist/adventure-communist-6-58-1-release/);
  Update History).

- **Data shape.** Operation templates (type, target, rank band, reward table, points), slot
  timers, tier thresholds for free and premium tracks, season clock.

- **Progression and gating.** Reward tables scale by rank band. The pass benefits apply only
  from purchase to the end of the season.

- **Failure modes.**
  - At launch the season timer ran at twice real speed. Hyper Hippo shipped two fixes and
    reset every pass to 30 days
    ([developer post, score 158](https://www.reddit.com/r/AdventureCommunist/comments/fw3vu1/);
    [score 136](https://www.reddit.com/r/AdventureCommunist/comments/fubqxi/)).
  - Spec Ops asking players to collect core resources were so slow that a developer
    replied, joking that their feelings were hurt, and promised a rebalance
    ([score 198](https://www.reddit.com/r/AdventureCommunist/comments/f1w9ys/)).
  - Missed tier rewards could not be claimed until 6.41 (December 2024).

- **Why it works.** It adds a daily reason to open the app on top of a weekly event reason,
  and gives payers a predictable $10 a month product. The "permanent Propaganda Boost"
  wording on a 30-day pass was read as deceptive by players whose earlier "permanent" boost
  had been removed (section 4.5).

### 2.8 Ghost Operatives (October 2026 side layer)

- **Intent and model.** Recruit and upgrade "operatives" and send them on timed missions
  (6.59.0) ([developer post](https://www.reddit.com/r/AdventureCommunist/comments/1wycyke/)).
- **Gating.** It is self-contained. Players report that it gives no Motherland or event
  rewards, and that its capsules and upgrade items disappeared on rank-up
  ([score 17](https://www.reddit.com/r/AdventureCommunist/comments/1x4cwhq/);
  [score 5](https://www.reddit.com/r/AdventureCommunist/comments/1x36gzp/)).
- **Why it doesn't work.** The top replies to the launch-feedback thread call it useless
  and ask for a way to switch it off
  ([score 28](https://www.reddit.com/r/AdventureCommunist/comments/1x1wxa6/)). It is a new
  timer loop with no exit into the core economy, shipped while players were asking for
  ranks and ad fixes.

---

## 3. Key innovations

**1. Rank as a prestige reset gated by a checklist, with built-in slack.**
Instead of "reset when the bonus feels big enough" (AdVenture Capitalist's angel model),
every reset is a named rank with a fixed mission list. Players must clear *X* of *X + 3*.
Progress is always legible ("6 of 14 missions"), and the three spare missions let a player
route around one bad mission without support tickets
([wiki: Ranks](https://adventurecommunist.fandom.com/wiki/Ranks)).

**2. Flat-priced cascade with one shared scarce input.**
Generators never get more expensive. Instead, every unit in five industries costs Comrades,
which grow only through exponentially priced Trades. That turns a number-go-up idler into
an allocation puzzle. It also gives designers one master dial for pacing
([wiki: Comrade](https://adventurecommunist.fandom.com/wiki/Comrade);
[Trades](https://adventurecommunist.fandom.com/wiki/Trades)).

**3. Automation as a collectible.**
The commonest card type is "turn this generator on". The gacha therefore delivers the idle
fantasy itself, and rarity maps to *scope*: one resource, then one industry, then
everything. That is an unusually readable rarity ladder
([wiki: Researcher](https://adventurecommunist.fandom.com/wiki/Researcher)).

**4. A deterministic free-capsule cycle that works as hidden pity.**
Since 4.2, free capsules follow a fixed 241-step sequence that contains one Supreme and one
Epic capsule, about every 40 days. Odds are shown on paid capsules. This is generous,
predictable bad-luck protection. Its main weakness is that it is undocumented in-game, so
players only learned it through a community tracker
([wiki](https://adventurecommunist.fandom.com/wiki/Free_capsules);
[score 277](https://www.reddit.com/r/AdventureCommunist/comments/de0t74/)).

**5. Events as disposable mini-economies that pay out into the permanent one.**
Each event reuses the core cascade with new industries, its own perishable currency and its
own researchers. It runs on a strict weekly cadence (Tuesday to Thursday minis, Thursday to
Monday weekends, 11-day holidays) and pays capsules, gold and permanent event researchers
back to the Motherland. By 2026 the tracked calendar shows more than 100 event runs in ten
months ([idlegametools](https://idlegametools.com/adcom-leaderboard/eventlist)).

**6. Percentile leaderboard brackets in 25-player divisions.**
Rewards reach the top 75% and give a ribbon to everyone. Since late 2022 players compete in
small divisions rather than one global board. That is the right shape for a low-competition
audience (compete-with-others score 1.03).

**7. Scripted capsules as event bad-luck protection.**
Events seed fixed capsule rewards so that key event researchers arrive on schedule. The
team's own post-mortem of a 2025 event blamed the *absence* of reliable scripted Rares for
the backlash. That confirms it as a load-bearing design tool
([developer message, score 68](https://www.reddit.com/r/AdventureCommunist/comments/1klt8t7/)).

**8. Spend-segmented offers.**
Bundles are tiered by lifetime spend, recent spend and rank, and lapsed or non-paying
segments get the best value multipliers. This is a sophisticated conversion system for an
idle game. The community documented it and learned to game the 26-day windows
([wiki: Shop](https://adventurecommunist.fandom.com/wiki/Shop)).

**9. Satire as retention glue.**
Part of the culture is pure tone. Highly upvoted threads include petitions to rename items
(Acquire Squires, Scary Potter), a request to fix the nurse icon to match the other tier-1
hats, and jokes about the "KFC" number suffix. Hyper Hippo's 2020 COVID message from the
team scored 331
([score 249](https://www.reddit.com/r/AdventureCommunist/comments/l3lt9w/);
[score 220](https://www.reddit.com/r/AdventureCommunist/comments/ex4b6j/);
[score 331](https://www.reddit.com/r/AdventureCommunist/comments/fkglbt/)).

---

## 4. Player frictions & complaints

Method: keyword classification of all 17,385 r/AdventureCommunist posts. The first pass
shares, against all posts, were:

| Topic | Share of posts |
|---|---|
| Events | 19% |
| Capsule and researcher luck | 11% |
| Pay-to-win | 10% |
| Theme and humour | 10% |
| Gold | 9% |
| Missions | 6.5% |
| Ads | 6.4% |
| Walls | 6% |
| Bugs and lost progress | 5.5% |

My stricter re-run puts events at 19.7% overall, rising from 20% of 2019 posts to 30% of
2025 posts. Ads come to 5.5% overall but **13% of all 2026 posts**, more than double any
earlier year. Quotes below are paraphrased. Scores are Reddit upvotes at archive time.

### 4.1 Event fairness: "you cannot finish without paying" (2019 to 2026)

- **The first event (May 2019).**
  - A 66-comment thread called the first event predatory. The player estimated 12 to 15
    days of play for a 4-day window, with the Supreme reward unreachable without paying
    ([score 71](https://www.reddit.com/r/AdventureCommunist/comments/bne7z0/)).
  - Another post argued that even hardcore players who check in every half hour and watch
    every ad could not finish, and called excluding non-payers from the final reward bad
    design ([score 92](https://www.reddit.com/r/AdventureCommunist/comments/bs9p64/)).
  - A third warned players never to buy event bundles, because Dark Science and event cards
    expire within days, making them worse value than permanent Motherland bundles
    ([score 103](https://www.reddit.com/r/AdventureCommunist/comments/bnvqs8/)).
- **Hyper Hippo's response (May 2019)** came within about two weeks: 20 extra hours on
  events, stronger and more frequent event airdrops, and Propaganda raised from 3 to 4
  hours. The thread scored 198, and players called it about enough for very active free
  players ([developer post](https://www.reddit.com/r/AdventureCommunist/comments/bu4cmj/)).
- **2022.** A detailed critique scored 171. It listed:
  - missions that need manual tapping and lucky crits
  - missions impossible without a researcher that only unlocks two ranks later
  - too few scripted capsules
  - up to 40 ads a day in the event for non-payers

  A top reply summed up the gameplay as tap, wait 12 minutes, repeat
  ([score 171](https://www.reddit.com/r/AdventureCommunist/comments/v20tl9/)).
- **2025.**
  - After the Mini Tater Factory event, the team admitted on Discord that the event was a
    miss. They cited poor Dark Science and Comrade gain and no reliable scripted Rares
    ([score 68](https://www.reddit.com/r/AdventureCommunist/comments/1klt8t7/)).
  - Two months later they reverted Anew Atlantis and Comrade Cowboys to original balance.
    Top replies asked for gold refunds and described Rank 9 walls taking two days of a
    four-day event
    ([score 23](https://www.reddit.com/r/AdventureCommunist/comments/1lzzwe2/)).
  - Separate posts threatened to quit
    ([score 58](https://www.reddit.com/r/AdventureCommunist/comments/1lz7vge/);
    [score 16](https://www.reddit.com/r/AdventureCommunist/comments/1liyep3/)).
- **2026.**
  - Asked whether the game was dying, the top reply listed players quitting at max rank,
    weak new ranks, and events that can no longer be completed without paying.
  - A Hyper Hippo account replied only that it had heard the feedback on ads and event
    difficulty
    ([score 21](https://www.reddit.com/r/AdventureCommunist/comments/1rpzuu9/)).

### 4.2 Leaderboard integrity: client-side scores and cheaters

- In August 2019, once "trophies needed for next rank" was visible, players posted
  screenshots of top-100 scores impossible within 14 hours. They called the board
  unwinnable for free players
  ([score 60](https://www.reddit.com/r/AdventureCommunist/comments/cs2wbu/)), and
  "Cheaters. As usual" followed
  ([score 81](https://www.reddit.com/r/AdventureCommunist/comments/cytg5d/)).
- A player edited his own save to look at the leader's score (over 2 billion trophies) and
  asked Hyper Hippo what it was doing about modified clients
  ([score 72](https://www.reddit.com/r/AdventureCommunist/comments/fayio2/)).
- Another described running the game through a phone-side memory editor, granting himself
  100 million gold, and spending about a million on capsules and time warps with no flags
  raised ([score 132](https://www.reddit.com/r/AdventureCommunist/comments/jh2ddg/)).
- Top comments joked that there are two leaderboards, one for cheaters and one for everyone
  else ([score 87](https://www.reddit.com/r/AdventureCommunist/comments/gkqbqv/)).
- By 2025 the complaint had shifted to paying to compete
  ([score 17](https://www.reddit.com/r/AdventureCommunist/comments/1l9s8o1/)). A reply asked
  for separate leaderboards for premium-currency spenders.

### 4.3 RNG-gated missions and automation

- Card-count missions depend on what free capsules happen to contain. Posts mock
  "collect 500 cards" coming up when the free capsule gives one card
  ([score 79](https://www.reddit.com/r/AdventureCommunist/comments/ckt960/)). One player
  hoarded unopened capsules so they could clear a 1,250-card mission in a minute
  ([score 167](https://www.reddit.com/r/AdventureCommunist/comments/g91lzf/)).
- Missing Common automators leave generators on manual tap for ranks
  ([score 9](https://www.reddit.com/r/AdventureCommunist/comments/bant13/);
  [score 8](https://www.reddit.com/r/AdventureCommunist/comments/1x6d2nq/)).
- Crit-dependent missions turn luck into a gate. One player saw nine straight non-crits at
  48% on a 3.5-minute generator, losing 27 minutes toward a mission
  ([score 23](https://www.reddit.com/r/AdventureCommunist/comments/1mx6gbl/)).
- In the 241-step capsule cycle, luck is the *visible* system and the pity is hidden, so
  players experience the game as RNG even though a guaranteed Supreme exists.

### 4.4 Ads: length, failures, content and region

- **2019–2020.** The 30-second ad followed by a 15-second end card was the most upvoted ad
  grievance ([score 233](https://www.reddit.com/r/AdventureCommunist/comments/e5fzk5/)).
  A balanced 2020 post praised the game and its support, but called ad quality the most
  inconsistent part of the experience. It proposed a fixed length, no fake close buttons,
  and an exit within 5 seconds, and said the author would pay for an ad-free version
  ([score 168](https://www.reddit.com/r/AdventureCommunist/comments/eumc6j/)).
- **Ads that don't pay.**
  - Ad rewards silently failing has recurred since 2019
    ([score 17](https://www.reddit.com/r/AdventureCommunist/comments/b6sg7b/)).
  - A top 2023 comment argued that the game was deliberately coded to withhold the reward
    when an ad errors, costing goodwill for nothing
    ([score 185](https://www.reddit.com/r/AdventureCommunist/comments/11j74ew/)).
  - In 2026, players reported ads failing half the time during an extended event
    ([score 17](https://www.reddit.com/r/AdventureCommunist/comments/1vp1inw/)).
- **Paying to avoid ads.** In 2022 Hyper Hippo sold "ad-free airdrops" for a single 4-day
  event at about $11. Threads called it a joke
  ([score 107](https://www.reddit.com/r/AdventureCommunist/comments/tmjs7e/)) and framed it as
  making players pay to avoid bugs
  ([score 181](https://www.reddit.com/r/AdventureCommunist/comments/tnmjtx/)). One
  community calculation put it at about $14 per hour of ads avoided.
- **2025–2026 escalation.**
  - Ads now pause podcasts and can't be muted
    ([score 20](https://www.reddit.com/r/AdventureCommunist/comments/1lgy6qe/)).
  - Rewarded ads of 120 seconds or more with chained end cards
    ([score 26](https://www.reddit.com/r/AdventureCommunist/comments/1vm3nql/);
    [score 58](https://www.reddit.com/r/AdventureCommunist/comments/1vvn1ve/)).
  - French players get triple-ad stacks and use a VPN to look American
    ([score 19](https://www.reddit.com/r/AdventureCommunist/comments/1tdw5am/)).
  - A long-time monthly spender at Rank 185 quit over a looping gambling ad
    ([score 27](https://www.reddit.com/r/AdventureCommunist/comments/1u447qb/)).
  - A parent asked how to block sexualised ads in a game their children play
    ([score 58](https://www.reddit.com/r/AdventureCommunist/comments/1rbgzd6/)).
  - A July 2025 thread claimed an unprompted ad played mid-action
    ([score 25](https://www.reddit.com/r/AdventureCommunist/comments/1loyx7t/)). Replies said
    forced ads had not reached them, and GameRefinery's November 2025 audit still records no
    interstitials. Treat it as unconfirmed.
- **Workarounds.** Top replies in several 2026 threads share DNS ad-blocking tricks. The
  game then reports no ad available and grants the reward anyway. In effect, the reward
  pipeline already tolerates ad failure, just not for players who sit through a broken ad.

### 4.5 Monetisation trust

- **Removed "permanent" purchase.** The 3.0 rebuild removed the $5 "permanent ad boost"
  that some players had bought. Compensation was gold, because the feature no longer existed
  in code ([score 30](https://www.reddit.com/r/AdventureCommunist/comments/fs3qtz/)). When
  the 30-day Supreme Pass advertised a "permanent" Propaganda Boost, one of those players
  bought it believing the boost was back, then learned it was a subscription
  ([score 80](https://www.reddit.com/r/AdventureCommunist/comments/ftlsdi/)).
- **Supreme Pass launch reaction.** A list of things the pass costs more than drew 63
  comments ([score 154](https://www.reddit.com/r/AdventureCommunist/comments/fsylso/)). A
  constructive review asked for a lower price, a gold option, all ads removed, and stacked
  event capsules for everyone, so players could sleep a full night
  ([score 144](https://www.reddit.com/r/AdventureCommunist/comments/fstf3h/)).
- **Offer wall.** Gold from third-party offers often never arrived
  ([example](https://www.reddit.com/r/AdventureCommunist/comments/afc2gi/)). Hyper Hippo
  removed the wall in December 2019 and openly gave non-delivery as a reason. That was
  well received ([score 119](https://www.reddit.com/r/AdventureCommunist/comments/e64o6p/)).
- **The theme cuts against it.** "A communist game that is this capitalist" is a recurring
  top-comment joke ([score 92 thread](https://www.reddit.com/r/AdventureCommunist/comments/bs9p64/)).

### 4.6 Content droughts, walls and slow responsiveness

- Capped players waited months for ranks. In 2021 a post filed the in-game "new ranks coming
  soon" message as a bug, because it was not true
  ([score 151](https://www.reddit.com/r/AdventureCommunist/comments/p1s2fd/)). In 2024 a
  player noted Rank 180 was two years old. Replies said Hyper Hippo had prioritised events
  over ranks, and asked for a full-replay prestige mode
  ([score 31](https://www.reddit.com/r/AdventureCommunist/comments/1fgpaiy/)).
- A four-year player's 2022 farewell blamed poorly balanced ranks, reskinned events, long
  waits and ignored community rebalancing proposals
  ([score 72](https://www.reddit.com/r/AdventureCommunist/comments/tnfml6/)).
- Small quality-of-life requests took a long time. The 1% buy option took over a year and
  "collect all science" took about three years (section 2.1).

### 4.7 Bugs and lost progress

- **Save loss.** One player lost all progress despite a cloud link. Support restored them
  with 10 Supreme capsules and 7,500 gold, which drew public praise
  ([score 139](https://www.reddit.com/r/AdventureCommunist/comments/dftwhm/)).
- **Event crashes.** A player was locked on a crash screen mid-event
  ([score 108](https://www.reddit.com/r/AdventureCommunist/comments/hzhay9/)). Patch 4.13.3
  fixed "players losing event progress".
- **Ghost Ops wipes.** Ghost Ops rewards vanished on rank-up in October 2026 (section 2.8).

### 4.8 What players praise (for balance)

- **Tone and theme.** Petition and renaming threads are among the highest scored (section 3,
  item 9).
- **Legible maths** ([score 20](https://www.reddit.com/r/AdventureCommunist/comments/b32x6l/))
  and small milestone joys, such as breaking into four-letter potato counts while stuck
  ([score 146](https://www.reddit.com/r/AdventureCommunist/comments/ffwm32/)).
- **Visible responsiveness, when it happens.**
  - The 5.0 Confirm dialog ([score 342](https://www.reddit.com/r/AdventureCommunist/comments/fsamol/))
  - Airdrop retry ([score 65](https://www.reddit.com/r/AdventureCommunist/comments/ebar2g/))
  - The May 2019 event fix ([score 198](https://www.reddit.com/r/AdventureCommunist/comments/bu4cmj/))
  - Monthly event calendars
- **Community self-documentation.** An unofficial guide/FAQ is the subreddit's
  highest-scored post ([score 443](https://www.reddit.com/r/AdventureCommunist/comments/dn40nv/)).
  There are also mission and capsule trackers
  ([score 277](https://www.reddit.com/r/AdventureCommunist/comments/de0t74/)) and an active
  wiki. That signals a depth players want to master, and an in-game information gap they
  had to fill themselves.

---

## 5. Lessons for Out of Ruin

**1. Adopt the checklist rank-up, with slack.**
Out of Ruin's chapters already rank the player up through quest lists. Add AdVenture
Communist's *X of X + 3* rule. Show "complete 10 of 13", so that one slow or unlucky quest
never blocks a chapter. AdCom's best-loved structural idea costs players nothing and
removes a whole class of "I'm stuck" tickets.

**2. Never put flow behind luck. Put power behind luck if anything.**
AdVenture Communist's worst structural mistake is that the commonest card *turns on
automation*, so bad pulls mean manual tapping. In Out of Ruin, henchmen are hired
deterministically, which keeps the idle flow safe. Keep it that way:
- Gear cards from packs should only multiply crits and loot.
- No chapter quest should require a specific card, a card count, or a crit.
- If a quest needs a pack item, guarantee it from the quest's own reward.

**3. Make pity visible, not hidden.**
AdCom quietly built generous bad-luck protection (a fixed 241-capsule cycle with a Supreme
about every 40 days) and still reads as an RNG game, because nobody can see it. Show Out of
Ruin's pack odds and a "guaranteed rare in N packs" counter on the pack screen. Show a
schedule for any free-pack cycle.

**4. Keep the cascade legible and give it one shared constraint.**
AdCom's flat unit costs plus a single scarce input (Comrades) produced real decisions and a
"pure maths" reputation. Its players still had to build spreadsheets to see marginal
value. Out of Ruin's henchman cascade should show the following in the UI, so the strategy
is in-game rather than on a wiki:
- per-level production per second
- what the next hire adds downstream
- time-to-quest-complete

**5. When weekly events arrive, tune the free path to finish.**
Every major AdCom backlash (May 2019, 2022, 2025, 2026) came from final tiers that active
free players could not reach. Before shipping an event:
- Simulate a no-spend, no-overnight player and require that they reach the last
  reward tier.
- Seed scripted drops for any event-critical hero or card.
- Never sell a currency that expires with the event. Convert leftovers into permanent
  rewards instead.
- Bring rewards back into chapters, as AdCom's event researchers do, so events feed the main
  game rather than compete with it.

**6. No leaderboards until scores are server-authoritative.**
Out of Ruin's local saves are as easy to edit as AdCom's mobile memory. AdCom shows what happens: top brackets owned by edited clients within hours,
and players concluding the board is fake. If competition is added, run it in small
divisions (AdCom uses 25 players) with percentile rewards, and validate trophies server
side behind accounts.

**7. Never revoke a purchase, and never use "permanent" loosely.**
AdCom paid for removing a "permanent" boost in the 3.0 rebuild, and paid again when the
Supreme Pass reused the word for a 30-day perk. Any Out of Ruin restructure (a gold
rebalance, a shop rework) needs a written rule that purchased permanent items survive
unchanged.

**8. Plan the content pipeline before players hit the cap.**
AdCom shipped 60 ranks in its first year, then went 26 months without one. Capped players
turned to events and ads, then left. Weekly event participation fell about 59% from 2023 to
2026. Out of Ruin has 11 chapters and 15 of 25 henchmen designed. Before growing the
audience, schedule chapter cadence, or ship an endgame loop that does not need new content.
AdCom's capped players explicitly asked for a full-replay prestige mode.

**10. Every new layer must pay into the core loop.**
Ghost Operatives launched in 2026 as a closed timer loop with no rewards for the main game,
and its items wiped on rank-up. The first reaction was "what's the point". Any future Out
of Ruin system (followers, side quests, events) should name the core resource it feeds
before it is built. It should also have a written rule for what persists through a chapter
rank-up, tested before release.

**11. The order of AdCom's 12x year is the playbook.**
AdCom's 2019 jump came in sequence:
1. Rebuild the core around missions, ranks and collectible automation. Monetisation per
   player rose about 7x on flat installs.
2. Scale installs.
3. Layer weekly events and leaderboards on top.

For Out of Ruin, that argues for perfecting the chapter, henchman and card loop, and making
it measurably sticky, before investing in user acquisition or live operations.

---

### Sources and data notes

- **Sensor Tower** monthly worldwide iOS and Android estimates for app ids `1225683141` and
  `com.kongregate.mobile.adventurecommunist.google`, latest version per month, via the
  Supercell data warehouse. Non-audited. In-app purchases only, so ad revenue (likely
  substantial) is not included.
- **GameRefinery:** [game profile](https://app.gamerefinery.com/game/59bb03f5787929676ae46ee0)
  (motivations, ad-placement audit of November 2025, and 146-version iOS Update History with
  full release notes).
- **Reddit:** full r/AdventureCommunist post archive via Arctic Shift, plus comment pulls for
  about 45 threads. Topic shares are keyword-based and approximate.
- **Wiki:** the [AdVenture Communist Fandom wiki](https://adventurecommunist.fandom.com/wiki/AdVenture_Communist_Wiki)
  is the source for all formulas, costs, drop ratios and cycles (community-maintained, with
  rank data current to July 2026). Where the wiki and store copy disagree (eight modifiers
  against five), I trust the wiki, because it enumerates each card.
- **Unconfirmed:** whether the February to August 2019 install surge was paid acquisition or
  platform featuring; the exact current team size; whether a Kongregate web build is still
  playable. I found no Hyper Hippo blog posts or talks specific to AdVenture Communist. The
  primary developer voice is release notes, Reddit and Discord posts, and "Dev Couch" videos
  announced on Reddit
  ([January 2020, score 232](https://www.reddit.com/r/AdventureCommunist/comments/esivgn/)).
