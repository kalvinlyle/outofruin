# Out of Ruin

Out of Ruin is a fantasy idle dungeon RPG by Mega Rune Entertainment, first released in 2020 on itch.io, Kongregate and Android.
This repo hosts its marketing site and a playable web build recovered from the shipped HTML5 bundle, with fixes patched into the game archive and real-money gold sold through Stripe.

## Overview

Players clear dungeon levels across five regions by tapping and by hiring henchmen, who work levels automatically and produce the henchmen on the level below.
Loot from each level feeds chapter quests; completing a chapter's quests ranks the player up and unlocks new dungeons, henchmen and heroes.
Gear cards from packs boost loot and crits, heroes add active powers, and followers earn income while the player is away.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game engine | Defold 1.2.167 (Lua 5.1), shipped HTML5 build (wasm + asm.js) |
| Game patching | Python tools that rewrite the Defold archive in place |
| Marketing site | Bootstrap "Freelancer" template, SCSS, Gulp |
| Hosting | Vercel (team `ai-asylum`, project `out-of-ruin`, root `game/`) |
| Payments | Stripe Checkout via Vercel Node functions (`game/api/`) |
| Localisation | Snapshot of the original Google Sheet, served as `game/loc.json` |
| Source repo | `ai-asylum/out-of-ruin` (private) |

## Content

- **Regions** — Farm, Desert Ruin, Forest Ruin, Mountain Ruin, Ancient Mine, each with five dungeon levels
- **Progression** — 11 chapters (ranks) of quests
- **Henchmen** — 25 slots, 15 named
- **Heroes** — 4, each with powers
- **Gear** — 45 cards with crit and loot modifiers
- **Shop** — card packs, XP, time warps, and six real-money gold packs

## Project Structure

```
out-of-ruin/
  index.html, play.html, signup.html   # marketing site pages; play.html embeds game/
  css/ scss/ js/ vendor/ fonts/ img/   # site styles, scripts and imagery
  gulpfile.js, package.json            # site build (gulp watch)
  game/                                # deployed web build (Vercel root)
    index.html                         # Defold loader page, loc shim, store scripts
    archive/                           # patched Defold archive (do not hand-edit)
    api/                               # Stripe functions: checkout, claim, status
    packs.js                           # gold packs: prices and amounts, shared by shop and API
    store.js                           # browser side of purchases (OOR_STORE)
    loc.json                           # localisation feed
  game-src/
    archive/                           # untouched original archive pieces
    lua/                               # Lua overrides patched into the archive
    loc.csv                            # localisation sheet snapshot
  tools/
    defold_archive.py                  # Defold archive reader/writer
    patch_game.py                      # rebuilds game/archive from game-src + overrides
    build_loc.py                       # builds game/loc.json from loc.csv
    serve.py                           # no-store local static server
  extracted/                           # full recovered Lua + data (git-excluded, local only)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Gulp watch for the marketing site |
| `python3 tools/patch_game.py` | Rebuild `game/archive` from the original archive plus `game-src/lua` overrides |
| `python3 tools/build_loc.py` | Rebuild `game/loc.json` from `game-src/loc.csv` (`--fetch` refreshes the CSV) |
| `python3 tools/serve.py [port] [dir]` | Serve the repo without caching |
| `vercel dev --cwd game` | Run the game with its payment API locally |

## Project Rules

- Game changes go in `game-src/lua/` overrides and are applied with `tools/patch_game.py`; never edit `game/archive/` by hand.
- Gold pack prices and amounts live only in `game/packs.js`; the shop and the payment API both read it.
- Gold is granted only after the server confirms a paid Stripe session, and each session is marked claimed on Stripe so it grants once.
- Local `.env` files are ignored by git and excluded from Vercel uploads.
- New GitHub repos are always private.
