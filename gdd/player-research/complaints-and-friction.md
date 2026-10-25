# Complaints and friction across the set

Scope: cross-set friction patterns, the evidence for each, and the design implication. The through-line is at the end.

Evidence key: "AC" is r/AdventureCommunist topic shares supplied with the brief (17,385 posts, 2016 to 2026, Arctic Shift; non-audited). "IG" is the r/incremental_games archive sample (800 posts; keyword counts are non-audited and noisy).

## Pay-to-win

Pattern: spending buys power that free players cannot reach.
Evidence: AC topic share 10 percent (non-audited). AFK Journey Steam review summary lists pay-to-win as the top complaint ([VaporLens, AI-generated summary](https://vaporlens.app/app/4195600/afk_journey), low confidence). A monetisation-complaint analysis from AppFollow frames paywall anger as a predictable review category across mobile games ([AppFollow](https://appfollow.io/blog/monetization-paywall-complaints-mobile-game-reviews)).
Design implication: duplicates and XP must reach the card-power ceiling without gold. Gold should buy time and convenience, not the top of the power curve (designer inference).

## Grind walls and stuck progress

Pattern: a level or chapter gate that stops progress with no clear next step.
Evidence: AC walls/stuck 6 percent (non-audited). Mining Empire Idle reviews on a third-party stats site cite progress resets and excessive ads, but that is a different title (Mining Empire Idle reviews on a third-party stats site; no stable link recorded), so treat the pattern only as weak support.
Design implication: every chapter gate must show what to do next, and loot should always progress the quest list. Never let a level become a dead end (designer inference).

## RNG gating

Pattern: progress depends on a random roll the player cannot control.
Evidence: AC capsule and researcher RNG 11 percent; the most-upvoted quitting posts say missions require a specific random researcher (AC, non-audited). IG: a player tier list argues that long incrementals reward investment, not luck ([r/incremental_games, 1xb631z](https://www.reddit.com/r/incremental_games/comments/1xb631z/)).
Design implication: pack pity counters, and no chapter or quest should require one named card or unit. The gear pack system needs a guaranteed-progress path (designer inference).

## Ad aggression

Pattern: ads on return, ads that interrupt, or ads that gate the core loop.
Evidence: AC ads 6.4 percent (non-audited). Idle Miner Tycoon places rewarded ads on the return moment (vendor-reported, [Pangle case study](https://www.pangleglobal.com/resource/27816)). Immortal Slayer Idle reviews complain about ads that only grant buffs; that is a different title.
Design implication: keep ads, if any, optional and reward-only, and never on the return screen. Out of Ruin currently has no ad system; keep it that way unless the decision is taken deliberately (designer inference).

## Lost progress

Pattern: progress disappears through a bug, a reset or a reinstall.
Evidence: AC bugs and lost progress 5.5 percent (non-audited). The Mining Empire Idle reviews cite resets when reopening the app (third-party stats site; no stable link recorded), weak support. The web-first risk is the same class of failure: browser storage can be cleared.
Design implication: an export and import save code, a clear "saved in this browser" message, and a request for persistent storage on first save. This is a top-priority risk for a browser-first game (designer inference).

## Event fatigue and unwinnable events

Pattern: time-limited events that cannot be completed without spending, plus constant event churn.
Evidence: AC events 19 percent, the largest topic. The most-upvoted quitting posts say events are unwinnable without spending (AC, non-audited).
Design implication: no event that cannot be completed on free play. If events exist, the free path must reach the reward (designer inference). Out of Ruin has no live events today, which removes this pattern from its launch scope.

## Content drought

Pattern: the game runs out of new things well before the player does.
Evidence: IG most-upvoted mechanics complaint is about hidden upgrades in node trees (432 upvotes, [1x7k83n](https://www.reddit.com/r/incremental_games/comments/1x7k83n/)). Egg, Inc. reviewers report rewards falling off and "hardly any fast drones" after an update ([RAWG](https://rawg.io/games/egg-inc/reviews)), single-user, not audited.
Design implication: the 10 unbuilt henchman slots and the 4 heroes need a shipping date before the chapter ladder is marketed as complete. Do not hide key upgrades behind a tree (designer inference).

## Through-line

Players quit when the game's clock or its chance is set against them with no visible, fair path forward. Difficulty is not the complaint. Time gates, unwinnable events, random researchers and lost saves all share one feature: the player cannot see or control what decides progress. The design rule that follows: every gate has a visible path, every random roll has a floor, and nothing that matters is lost without warning.
