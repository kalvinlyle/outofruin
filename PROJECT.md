# Out of Ruin

Out of Ruin is a fantasy idle dungeon RPG published by Misaligned Games, first released in 2020 on itch.io, Kongregate and Android.
This repo hosts its marketing site and the game, rebuilt as a TypeScript and WebGL web app from the shipped Defold HTML5 bundle, with real-money gold sold through Stripe.
The last Defold version is tagged `defold-final`.

## Overview

Players clear dungeon levels across five regions by tapping and by hiring henchmen, who work levels automatically and produce the henchmen on the level below.
Loot from each level feeds chapter quests; completing a chapter's quests ranks the player up and unlocks new dungeons, henchmen and heroes.
Gear cards from packs boost loot and crits, heroes add active powers, and followers earn income while the player is away.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game runtime | TypeScript + WebGL port of the Defold 1.2.167 GUI runtime (`port/`), built with esbuild |
| Assets | Defold archive as the asset container, exported to WebGL-ready files by Python tools |
| Parity | Playwright harness comparing the port with the tagged Defold build frame by frame |
| Marketing site | Bootstrap "Freelancer" template, SCSS, Gulp |
| Ship target | Native iOS and Android apps with local saves (Capacitor shell in `native/`); the web build is for development and testing |
| Live updates | Self-hosted `@capgo/capacitor-updater`: the Vercel deployment serves each new web bundle to installed apps ([docs/ota-updates.md](docs/ota-updates.md)) |
| Hosting | Vercel (team `ai-asylum`): project `out-of-ruin` (root `game/`) is the web game, updates and APIs at app.outofruin.com; project `outofruin-site` (`site/`) is the marketing site at outofruin.com |
| Payments | Stripe Checkout on the web via Vercel Node functions (`game/api/`); Google Play Billing on the device in the Android app ([docs/play-billing.md](docs/play-billing.md)) |
| Analytics | PostHog (EU) and Snowplow from one `track()`, AppsFlyer attribution in the app ([docs/analytics.md](docs/analytics.md)) |
| Localisation | Snapshot of the original Google Sheet, served as `game/loc.json` |
| Source repo | `ai-asylum/out-of-ruin` (private) |

## Content

- **Regions** — Farm, Desert Ruin, Forest Ruin, Mountain Ruin, Ancient Mine, each with five dungeon levels
- **Progression** — 11 chapters (ranks) of quests
- **Henchmen** — 25 slots, 15 named
- **Heroes** — 25: field heroes assigned to dungeons for active powers, and patrons that give passive bonuses; the Squire is owned from chapter 1, four unlock with rank, and twenty are in the game but locked until their unlocks are designed
- **Gear** — 45 cards with crit and loot modifiers
- **Shop** — card packs, XP, time warps, and six real-money gold packs
- **Live events** — weekly events on the world map from Chapter 4, each with its own locations, henchmen, gear, drops, map, chests and a 100-chapter quest story played a part of ten per run; the first is Night of the Wererabbit

## Project Structure

```
out-of-ruin/
  index.html, 404.html                 # marketing site (outofruin.com); tools/stage-site.mjs stages it into site/
  site/                                # outofruin.com Vercel project: vercel.json redirects, staged public/
  css/ scss/ js/ vendor/ fonts/ img/   # site styles, scripts and imagery
  gulpfile.js, package.json            # site build (gulp watch)
  game/                                # deployed web build (Vercel root)
    index.html                         # game page: canvas, loading bar, loc shim, store scripts
    port/                              # built game: main.js and exported assets
    archive/                           # patched Defold archive, the asset source (not deployed)
    api/                               # Stripe functions (checkout, claim, status) and the OTA update endpoint
    scripts/                           # deploy build: stage dist/ and pack the OTA bundle
    store/                             # privacy, terms and data deletion pages
    ota-version.json                   # which OTA bundle each audience of the app gets
    packs.js                           # gold packs: prices and amounts, shared by shop and API
    store.js                           # browser side of purchases (OOR_STORE)
    loc.json                           # localisation feed
  port/                                # game source: engine, Lua runtime, game scripts (TypeScript)
  native/                              # Capacitor app shell packaging game/dist (android/ checked in)
  store/                               # Play listing kit, store art and fake-door config
  game-src/
    archive/                           # untouched original archive pieces
    assets/                            # art overrides patched into the archive
    data/                              # data files (Map, Henchmen, Resources...) replacing the shipped ones
    loc.csv                            # localisation sheet snapshot
  gdd/                                 # design docs: competitor and player research
  tools/
    defold_archive.py                  # Defold archive reader/writer
    patch_game.py                      # rebuilds game/archive from game-src + overrides
    port/                              # asset exporter and the parity harness
    build_loc.py                       # builds game/loc.json from loc.csv
    serve.py                           # no-store local static server
  extracted/                           # full recovered Lua + data (git-excluded, local only)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Gulp watch for the marketing site |
| `node tools/stage-site.mjs && vercel deploy --prod --cwd site` | Deploy the marketing site to outofruin.com |
| `cd port && npm run build` | Build the game into `game/port/main.js` |
| `cd port && npm run export` | Export `game/archive` to `game/port/assets/` |
| `python3 tools/patch_game.py` | Rebuild `game/archive` from the original archive plus `game-src` art and data |
| `python3 tools/build_loc.py` | Rebuild `game/loc.json` from `game-src/loc.csv` (`--fetch` refreshes the CSV) |
| `python3 tools/serve.py [port] [dir]` | Serve the repo without caching |
| `vercel dev --cwd game` | Run the game with its payment API locally |
| `cd game && node scripts/stage-web.mjs && node scripts/build-ota-bundle.mjs` | The deploy build: `game/dist` plus its OTA bundle |
| `cd native && npm run sync` | Stage the game and sync it into the app shell |

## Project Rules

- Game code lives in `port/src/game/`; rebuild with `npm run build` in `port/`.
- Art and data go through `game-src/` and `tools/patch_game.py`, then `npm run export`; never edit `game/archive/` or `game/port/assets/` by hand.
- Gold pack prices and amounts live only in `game/packs.js`; the shop and the payment API both read it.
- Gold is granted only after the server confirms a paid Stripe session, and each session is marked claimed on Stripe so it grants once.
- Local `.env` files are ignored by git and excluded from Vercel uploads.
- New GitHub repos are always private.

## Design Documentation

Design and market research live in [gdd/](./gdd/README.md).
