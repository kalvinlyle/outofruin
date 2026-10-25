# Mobile and mobile-web expectations

Scope: what portrait mobile and browser-delivered idle games are expected to do, and whether Out of Ruin's web-first architecture (Defold HTML5 on Vercel, saves in the browser, no accounts) holds up.

Evidence base is thin on several points. Each gap is flagged below. Public benchmark sources are linked inline; numbers from vendors or aggregators are tagged as non-audited.

## Portrait, one-thumb play

Expectation: every core action reachable with one thumb in portrait, with no pinch or two-hand gesture needed to play.
Evidence: the Tap Titans 2 review describes a tap-driven compulsion loop ([PocketGamer](https://www.pocketgamer.com/tap-titans-2/review/)), which confirms the tap-to-damage core works on phones in this genre. No public data was found on one-thumb reach in this genre.
Designer inference: keep taps and the main action within the lower third of the screen; place the chapter and henchman panels where a thumb can reach them without repositioning.

## Session length

Expectation: short active bursts with long idle gaps. The background player segment ([player-types.md](./player-types.md)) wants progress without attention.
Evidence: the r/incremental_games 1xcirve post describes idling in the background while working, and a 8-hour idle session as a goal ([Reddit](https://www.reddit.com/r/incremental_games/comments/1xcirve/)). Anecdotal.
Designer inference: design for 5 to 15 minute active sessions with an offline return that reads as a reward, not a bill.

## Offline progress

Expectation: progress while the app is closed, with an honest cap.
Evidence: Egg, Inc. users report a 2-hour offline cap for free play and reduced rewards after rest periods ([RAWG](https://rawg.io/games/egg-inc/reviews)), a single-user account, not audited. The complaint is the cap and the unpredictability, not the cap itself.
Designer inference: compute offline progress from a stored timestamp on load. Show a clear "while you were away" summary. Make any cap visible up front.

## Performance on mid-tier phones

Expectation: smooth at 60 frames per second on a mid-range Android handset from the last three years.
Evidence: no source in this research measured Defold HTML5 performance on mid-tier devices. The AFK Journey review summary flags performance issues as a recurring complaint for a heavier 3D game ([VaporLens, AI-generated](https://vaporlens.app/app/4195600/afk_journey)), which is a warning about heavy art, not a benchmark for this game.
Gap: this needs a device-lab measurement before any performance claim is made.

## Onboarding

Expectation: the first tap does something visible within seconds, and the first chapter completes within a short session.
Evidence: none gathered in this pass. The retention benchmark below is the only proxy.
Gap: FTUE evidence from the competitive teardowns is needed here.

## Readability

Expectation: large numbers, short labels and text that scales on small screens.
Evidence: none gathered in this pass.
Gap: needs a readability check on a 360px-wide screen.

## Retention baseline

Vendor and aggregator figures, all non-audited. Juegostudio lists an idle range of roughly 35 to 50 percent D1, 20 to 30 percent D7 and 10 to 15 percent D30, with idle titles sitting above hyper-casual and below simulation ([Juegostudio](https://www.juegostudio.com/blog/how-to-increase-user-retention-and-increase-your-games-lifetime)). GameAnalytics' 2026 report gives a median D1 around 22 percent and median D7 around 4 percent across mobile games, with the top decile near 40 percent D1 and 12 percent D7 ([GameAnalytics, 2026 benchmarks](https://gameindustrylibrary.com/documents/gameanalytics-mobile-and-pc-game-benchmarks-in-2026-sponsored-by-pwn-games)). These two sources disagree on idle numbers, so do not set a firm target from them.

## Install-free web delivery

Expectation: play from a link with no store install.
Evidence: Idlescape ships on Steam and in the browser at once ([Reddit, 1x94jve](https://www.reddit.com/r/incremental_games/comments/1x94jve/)). Multiple r/incremental_games demos link to itch.io, which is browser-playable. Browser play is a recognised genre channel.
Designer inference: web-first is a strong fit for this audience and removes an install barrier that the store-first competitors carry.

## Save portability

Expectation: a save survives a device change, an update, and a browser reset.
Evidence: lost progress is 5.5 percent of AdventureCommunist posts (non-audited). Browser storage can be cleared by the platform or by the user.
Designer inference: this is the largest risk to web-first. Ship an export and import save code, and request persistent storage on first save.

## Verdict on web-first

Validated: install-free play, a recognised genre channel, and a reach advantage for a small team. Challenged: saves, offline reliability and mid-tier performance are unproven here. Web-first is the right bet if export, persistent storage and a device-lab performance pass ship before launch.
