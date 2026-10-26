# Analytics

The game reports to two pipelines from one call site,
`track()` in `port/src/systems/analytics.ts`:

- **PostHog** (EU cloud, project 321318, "Out of Ruin") is the source of truth
  for FOUNDRY's dashboards: retention, the D0 activation column, and the split
  between store-app and browser traffic.
- **Snowplow** (Supercell's pipeline, `iglu:com.supercell.analytics/`) carries
  the same events for Supercell's analysts. It sends nothing until the game has
  its `app_id` from #ai-analytics and legal consent from #new-games-support
  (see docs/mobile-launch-checklist.md §0).

Never put a PostHog number and a Snowplow number in the same column without
saying they were measured differently: PostHog sessions come from its own
session tracking, Snowplow's from `session_started`/`session_ended` below.

## Where the events come from

The shipped game already reported every screen, quest, chapter and purchase to
Google Analytics through `port/src/game/controllers/gaController.ts`. Its
`event()` now also calls `gameEvent()` in `analytics.ts`, which names them.
The Google Analytics queue itself never sends.

Every event carries the super properties FOUNDRY splits on: `native_platform`
(`android` / `ios` / `web`), `app_platform`, `is_native_app` and
`game_version` (the web bundle's version from `game/ota-version.json`, so web,
app and every OTA bundle of one release report the same value).

On native, the PostHog person is the device (`Device.getId()`, ANDROID_ID on
Android). The web is never identified.

## Events

| PostHog event | Properties | When | Snowplow |
|---|---|---|---|
| `$pageview` | | app open | (none) |
| `game_started` | | the game finished booting | `player_action` `game.game_started` |
| `returned_to_game` | | the welcome-back (offline income) popup | `player_action` `game.returned_to_game` |
| `screen_viewed` | `screen` | any screen or popup opens | `player_action` `ui.screen.open` |
| `quest_completed` | `quest` (`<chapter>-<id>`) | a chapter quest is collected | `completion_status` type `quest` |
| `chapter_completed` | `chapter` | a chapter (rank) is completed | `level_changed` type `chapter` |
| `ftue_completed` | | the first-time experience ends, once per install | `completion_status` type `tutorial` |
| `chapter_gold_earned` | `chapter`, `gold` | gold paid out by a chapter | `player_action` |
| `shop_bought` | `item`, `amount` | a shop purchase with gold, or free loot | `player_action` |
| `gold_purchased` | `product`, `gold`, `price_usd`, `store`, `transaction_id` | a real-money gold pack is granted | `resource_changed` `gold`, `iap_purchase` |
| `progress_reset` | | Settings → hold to reset | `player_action` |
| `af_boot`, `af_conversion_event` | | AppsFlyer start and conversion callback (native) | (none) |
| `ota_boot_ok`, `ota_update_available`, `ota_download_complete`, `ota_bundle_applied`, `ota_download_failed`, `ota_update_failed`, `ota_store_update_required` … | `ota_bundle` | live updates (docs/ota-updates.md) | `player_action` |

Snowplow also sends `session_started` on open and on every return to the app,
and `session_ended` (`duration_ms`, `reason: backgrounded`, `last_screen`) plus
`session_statistics` (screens viewed, quests and chapters completed, gold
purchases) when the app goes to the background. Every Snowplow event carries
`telemetry_context`: `app_id`, `account_id` (the device id on native),
`session_id`, `platform`, `app_version` = `game_version`, `language`.

`ftue_completed` fires on completing chapter 1 (`FTUE_CHAPTER` in
`analytics.ts`) until the game has a tutorial with its own end.

## Keys

The game reads its keys as `import.meta.env.VITE_*`; `port/package.json`'s
build maps each one onto `window.OOR_ENV`, which `game/scripts/stage-web.mjs`
writes into `dist/env.js` from the environment of the build that ships: the
Vercel project's env for the web and OTA bundle, the repo's Actions secrets
for the app. The committed `game/env.js` is empty, so local play sends nothing.

A production build (Vercel production or GitHub Actions) fails without
`VITE_APPSFLYER_DEV_KEY` and `VITE_POSTHOG_KEY`.

## Verifying

`bash <mobile-launch skill>/scripts/verify-posthog-register.sh port` checks the
`register()` contract; with `POSTHOG_PERSONAL_API_KEY` and
`POSTHOG_PROJECT_ID=321318` it also checks live traffic for untagged events.
