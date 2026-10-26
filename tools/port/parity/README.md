# Parity harness

Drives the original Defold build (`orig`) and the HTML port (`port`) through the
same scripted scenarios, one frame at a time, in headless Chromium.
It captures the canvas and a canonical game-state dump on chosen frames, then
compares them.

A port frame passes when at least 99% of its pixels match the original
(pixelmatch, threshold 0.1) and its state dump is byte-identical.
The original against itself must be 100% identical on every frame
(`--selftest`).

## Usage

```
npm install                                   # once, in this folder
node run.mjs --target orig --all              # or --scenario <name>; [--viewport 1080x2400[,1536x2048]]
node run.mjs --target port --all
node compare.mjs --a orig --b port            # [--scenario <name>] [--viewport WxH,...]; writes parity-report/index.html
node report.mjs --a orig --b port             # rebuild the report from out/compare-orig-port.json
node run.mjs --selftest                       # orig twice, require identical pixels and state
node run.mjs --make-fixture <name> --scenario fixtures/<maker>
node run.mjs --build                          # rebake game/_work/parity (automatic when stale)
```

Every scenario runs once per viewport (below), so one `--scenario` is three
runs unless `--viewport` narrows it.
Output goes to `out/<scenario>@<WxH>/<target>/<frame>.png`,
`state/<frame>.json` and `log.txt` (console, including Lua `print` as
`[lua] ...`).
`compare.mjs` pairs every `out/<scenario>@<WxH>/` that has both targets and
ignores directories without `@`.
A run that throws (missing fixture, boot timeout) is reported and the rest
carry on; the exit code is then 1.
`out/` and `parity-report/` are gitignored.

## Files

- `run.mjs` — CLI: run targets, selftest, make fixtures.
- `compare.mjs` — per-frame pixel and state comparison of two targets.
- `report.mjs` — HTML report: summary per scenario, failing frames ranked by
  mismatch with original | other | diff images and the first state differences.
- `lib/init.js` — the determinism layer, injected into both targets.
- `lib/harness.mjs` — browser, file routing, boot, stepping, capture.
- `lib/diff.mjs` — pixelmatch and JSON diff.
- `build_orig.py` — bakes the parity variant of the original into
  `game/_work/parity/archive` (gitignored): `tools/patch_game.py --out --extra`
  with `hook/parity_hook.lua` appended to the render script.
- `hook/parity_hook.lua` — the state dump and print routing (original only).
- `scenarios/*.json` — starter scenarios; `scenarios/fixtures/*.json` make fixtures.
- `fixtures/*.json` — saved storage to boot from.

## How a run works

1. Pages are served from disk with `page.route` on `http://parity.localhost`
   (no server, no port). URL `/` maps to `game/`; for `orig`, `/archive/*` maps
   to `game/_work/parity/archive/`. `/api/status` answers `{"enabled":false}`,
   other `/api/*` 404 (unless the scenario enables the store stub, below), Kongregate's script is empty, Google Analytics 200 empty,
   anything else off-origin is aborted.
2. A fresh browser context (no profile), the run's viewport,
   `deviceScaleFactor` 1, timezone UTC, locale en-US, SwiftShader WebGL.
3. The harness opens a blank page on the same origin, wipes storage and restores
   the fixture (localStorage and IndexedDB), then loads the target page.
4. Boot runs on real time with the virtual clock frozen at `startTime`.
   The harness waits until a `requestAnimationFrame` callback is queued, no boot
   timers or ungated requests are in flight, and (port only) `portReady()` was
   called, stable for 300 ms. Then it calls `__parity.start()`.
5. From then on nothing runs unless the harness steps a frame.

### One step (frame k, 0-based)

1. Wait until every gated request has its bytes, then advance the clock to
   frame k's time.
2. Deliver every gated response, in request order. Await microtasks.
3. Dispatch frame k's input events on the canvas.
4. Fire timers due by now (created before this step). Await microtasks.
5. Run the queued rAF callbacks with `performance.now()`.
6. Await microtasks. If the frame was a capture frame, read the state and
   `canvas.toDataURL('image/png')`.

## Determinism (lib/init.js)

- **Clock.** Frozen at boot. Frame k runs at `startTime + skew + (k+1) * 1000/60` ms.
  `Date.now()` and `new Date()` are floored to whole ms; `performance.now()` is
  `1000 + skew + (k+1) * 1000/60`, unfloored. `skew` is the whole ms added by
  time skips so far (0 without them).
- **Frames.** `requestAnimationFrame` (and prefixed forms) only queues;
  callbacks run once per step.
- **Timers.** Real during boot (tracked); virtual once stepping starts. Boot
  timers still pending at `start()` become due at frame 0.
- **Random.** `Math.random` is mulberry32 seeded with `0x5eed` (or the
  scenario's `seed`).
- **Network.** `fetch` and `XMLHttpRequest` are replaced. During boot, URLs
  matching `/api/`, `/loc.json`, `google-analytics.com` or
  `spreadsheets.google.com` are gated and everything else passes straight
  through. Once stepping starts, every request is gated. A gated response lands
  at the start of the next step, so a request made during boot or frame k is
  answered in frame 0 or frame k+1.
- **Canvas.** WebGL contexts are forced to `preserveDrawingBuffer: true`.
- **Input.** Synthetic `MouseEvent`s on the focused canvas: `mousemove` then
  `mousedown` (button 0), `mouseup`; wheel as `mousewheel` (`wheelDelta = -delta`)
  plus `wheel` (`deltaY`). Coordinates are CSS px from the canvas's top-left.

The Lua side is deterministic because of the above:

- `math.randomseed(os.time())` in `main/controller.script` seeds with
  `floor(startTime / 1000)`, then the script discards 3 draws.
- The Google Analytics tracker reseeds with `socket.gettime() * 10000` and
  draws a uuid only when its `__ga_uuid` file (IndexedDB, below) is missing.
  This is why fixtures carry IndexedDB.

## Scenarios

```json
{
  "description": "...",
  "fixture": "fresh",
  "viewports": ["750x1334", "1080x2400", "1536x2048"],
  "away": 0,
  "frames": 600,
  "seed": 24301,
  "steps": [
    { "frame": 30, "action": "tap", "x": 375, "y": 740, "hold": 2 },
    { "frame": 40, "action": "tap", "x": 699, "y": 1294, "anchor": "bottomright" },
    { "frame": 50, "action": "tap", "x": 160, "y": 707, "anchor": "list",
      "at": { "1536x2048": { "x": 380, "y": 1100 } } },
    { "frame": 90, "action": "down", "x": 100, "y": 900 },
    { "frame": 95, "action": "move", "x": 100, "y": 700, "buttons": 1 },
    { "frame": 99, "action": "up", "x": 100, "y": 700 },
    { "frame": 120, "action": "drag", "x": 375, "y": 1000, "x2": 375, "y2": 600, "frames": 10, "hold": 1 },
    { "frame": 200, "action": "wheel", "x": 375, "y": 900, "delta": 120 },
    { "frame": 300, "action": "skip", "seconds": 3600 },
    { "frame": 400, "action": "timelapse", "seconds": 600, "frames": 60 }
  ],
  "capture": { "every": 10, "frames": [31, 32] }
}
```

- `tap` sends move+down on `frame` and up on `frame + hold` (default 2).
- `drag` presses at `x,y`, moves one step per frame to `x2,y2` over `frames`,
  then releases `hold` frames later.
- The last frame is always captured.
- `seed` is optional.

### Viewports

The port must match at 750x1334 (design), 1080x2400 (20:9 phone) and
1536x2048 (3:4 tablet).
A scenario runs at each of `viewports`, by default all three.
`--viewport` on the command line replaces the list; `--make-fixture` uses the
first one.
The older single `"viewport": {"w":..,"h":..}` field is ignored.
The original runs at all three: its `index.html` clamps the canvas aspect to
[0.45, 0.75], so these three fill the window exactly.

Step coordinates are written for 750x1334 and mapped to the other sizes.
The scenes draw the 750x1334 design uniformly scaled by
`s = min(W/750, H/1334)` (1.44 at 1080x2400, 1.5352 at 1536x2048), which leaves
`W/s - 750` extra design units of width (250.5 at 1536x2048) and `H/s - 1334`
of height (332.7 at 1080x2400).
The scripts then pin each band of the screen to an edge, so a point maps by
which edge its UI is pinned to.
`anchor` is `[ax, ay]`, or a name below: the share of the extra width that
lies left of the point and of the extra height above it.
The canvas point is `((x + ax * extraW) * s, (y + ay * extraH) * s)`, rounded.

| anchor | [ax, ay] | use for |
|---|---|---|
| `center` (default) | [0.5, 0.5] | centred popups (quest scroll popups, confirm, pack opening) |
| `top` | [0.5, 0] | header: quest slots, chapter book, currencies; top-pinned panels (Settings, Shop, Cards titles and X) |
| `bottom` | [0.5, 1] | footer centre (map button) |
| `bottomleft`, `bottomright` | [0, 1], [1, 1] | footer clusters (cards, shop, cog) |
| `topleft`, `topright`, `left`, `right` | | edge-pinned odds and ends |
| `list` | [0.5, 0.25] | the dungeon level list: the map above it takes 25% of the extra height |

When the mapping is wrong for a node, give `at`: per-viewport overrides of
`x`, `y` (and `x2`, `y2`) in canvas px, used as is.
Check a new scenario's taps at every viewport by looking at its frames.

### Time skips

Idle progress (henchmen cycles, followers, the free-loot timer, quest timers)
runs on wall time (`Date.now()`, Lua `os.time` and `socket.gettime`).
Three ways to move it, identical on both targets because they only move the
virtual clock:

- `{"frame": f, "action": "skip", "seconds": n}` — the app is backgrounded: both
  clocks jump `n` s between frame f-1 and frame f, and no frame runs in
  between. Frame f sees the whole gap at once; timers due in the gap fire at
  the start of frame f. Engine `dt` stays fixed, so GUI animations do not jump.
- `{"frame": f, "action": "timelapse", "seconds": n, "frames": m}` — frames keep
  running while time races: frames f..f+m-1 each run later by an equal whole-ms
  share of `n` s on top of their normal 16.67 ms. Game logic sees large wall
  steps every frame, as on a device that stalls.
- `"away": n` at the top level — the app was closed: boot `n` s after the
  fixture's `startTime` (for return-to-game popups and offline income).

`skip` and `timelapse` amounts are whole ms (`seconds * 1000`, rounded).
`__parity.now()` reports the accumulated `skew`.

### Reloads

`{"frame": f, "action": "reload", "query": "?a=b", "away": 0}` leaves the page
before frame f and opens the target page again at its URL + `query`, keeping
localStorage, IndexedDB and the store stub's state. The new session boots like
the first one (real time, then `start()`), with its clock starting on the next
whole second after the old session stopped (+ `away` s), and frame f is its
frame 0. Scenario frame numbers keep counting across the reload.

### Real-money store

`"store": {"enabled": true, "checkout": "paid"}` at the top level makes the
`/api/*` stub answer as `game/api/*.js` do with a Stripe key configured,
against an in-memory Stripe (gold packs and prices from `game/packs.js`):

- `/api/status` → `{"enabled":true}`, so the shop lists priced gold packs.
- `/api/checkout` `{pack}` → `{"id":"cs_test_parityN","url":"https://checkout.stripe.com/c/pay/cs_test_parityN"}`,
  N = 1, 2, … per run; the session's state is `checkout` (`paid`, `open` or
  `expired`; default `paid`). Unknown pack → 400 `unknown_pack`.
- `/api/claim` `{session}` → `granted` with the pack's gold the first time a
  paid session is claimed, `claimed` / 0 after that, `pending` for an open
  session, `void` otherwise; a malformed id is 400 `bad_session`, an unknown
  one 502 `stripe_error`. `"sessions": {"cs_test_x": {"pack": "buygold_2",
  "status": "paid"}}` pre-creates sessions.
- The redirect to `https://checkout.stripe.com/c/pay/…` is answered 204 No
  Content, so the page stays put. A `reload` step with
  `?checkout=success&session_id=cs_test_parity1` (or `?checkout=cancel`)
  plays the return from Checkout.

The log (`log.txt`) records each checkout, redirect and claim as `[store] …`.

### Starter scenarios

| Scenario | Fixture | What it covers |
|---|---|---|
| `boot-fresh` | `fresh` | First launch into the Local Farm, 240 frames, frames 0–5 and every 10th |
| `dungeon-tap` | `fresh` | Click to explore, start the Farmyard twice, open the carrot loot popup |
| `quest-settings` | `ch1-farmyard` | Open the quest scroll, accept, open Settings, close it |

## Fixtures

```json
{
  "name": "ch1-farmyard",
  "description": "...",
  "startTime": 1767225720000,
  "localStorage": { "out_of_ruin_Currency": "<defsave JSON string>", "...": "..." },
  "indexedDB": [
    { "name": "/data", "version": 21, "stores": [
      { "name": "FILE_DATA", "keyPath": null, "autoIncrement": false,
        "indexes": [{ "name": "timestamp", "keyPath": "timestamp", "unique": false, "multiEntry": false }],
        "records": [{ "key": "/data/.Out_Of_Ruin/__ga_uuid",
                      "value": { "contents": { "$Uint8Array": "<base64>" }, "mode": 33206, "timestamp": { "$date": 1767225600000 } } }] }
    ] }
  ]
}
```

- **localStorage.** defsave keeps one key per save file, `out_of_ruin_<File>`,
  holding the file's JSON. The files are Currency, Gear, Henchmen, Hero, Info,
  Loot, Map, Ranks, Resources and Stats.
- **IndexedDB.** Defold's IDBFS mount of `sys.get_save_file` / `io.open`:
  database `/data`, store `FILE_DATA`, one record per path (Google Analytics'
  `__ga_uuid` and `__ga_queue`, plus directories).
- **Tagged values.** In the snapshot, `{"$date": ms}`, `{"$Uint8Array": b64}`
  and `{"$ab": b64}` stand for Date, typed-array and ArrayBuffer values.
- **startTime.** The virtual clock's boot time. A fixture made with
  `--make-fixture` starts on the next whole second after its session ended, so
  the save's timestamps are never in the future.
- **Making a fixture.** `--make-fixture` runs the maker scenario on `orig` at
  its first viewport. On the last frame it forces `defsave.save_all(true)`,
  then waits for the IDBFS write-back and snapshots both stores. The original
  itself sometimes fails `FS.syncfs` ("No such file or directory") three times,
  after which dmloader never clears `_syncInProgress`; the harness then waits
  30 s, logs a warning and snapshots IndexedDB as it is.
- **Makers chain.** A maker may start from another fixture, so later states
  are built in steps (`fresh` → `ch1-farmyard` → `ch2` → `ch4` → `late`). Each
  maker's steps were recorded by playing the original and replay
  deterministically; the fixture's end state equals the recorded session's.

Fixtures:

- `fresh` — empty storage, `startTime` 2026-01-01T00:00:00Z.
- `ch1-farmyard` — chapter 1 after two minutes of play: Farmyard explored,
  started 30 times, carrots and turnips collected, 118 followers, quest
  badges up.
- `ch2` (maker `fixtures/ch2`, from `ch1-farmyard`, 29587 frames) — chapter 2.
  Farm Hand has 2 cards (level 1) so the Farmyard runs on its own; 39 Farm
  Hands hired, buy state 50%; Rat Catcher unlocked (no card), Cellar opened
  and running; carrot quest at 2433/2500, upgrade-card and collect-card
  quests read, turnip and rat-tail quests new; 3 quest slots; cards and shop
  buttons shown, free loot on cooldown; 57 gold, 86 XP, 3.6K followers.
  Boots into the welcome-back popup (X at 630,395). Unlocks: shop, cards,
  henchman popup, quest open/collect popups. No hero: the first hero
  (Dwarf Druid) unlocks when chapter 3 closes.
- `ch4` (maker `fixtures/ch4`, from `ch2`, 13920 frames) — chapter 4 on the
  Local Farm. Farmyard, Cellar and Cellar Tunnels run on their own (Farm Hand
  L2, Rat Catcher L2, Tunnel Patrol L1, 12M/49K/8.6K hired); the Dwarf Druid
  is assigned to the farm (hero card over the map, power counter running);
  Desert Ruin unlocked (second tab) with Sand Dunes explored, Rabbit Hutch
  (farm level 4) explorable; gear Bucket, Rat fur Sack, Used Sack at L1;
  chapter 4 quests: 1/7 collected, the dungeon-unlock bounty claimable,
  crawler-poop quest read; 105 gold, 555 XP. This build has no live events
  (no event code in the Lua).
- `late` (maker `fixtures/late`, from `ch4`, 29966 frames) — chapter 7 (of 11),
  reached with time skips. Local Farm, Desert Ruin and Forest Ruin tabs
  unlocked; six henchmen unlocked (Farm Hand L3, Rat Catcher L3, Tunnel
  Patrol L1, Desert Hippie L2, Bone Crusher L1 with cards; Rabbit Hunter
  without), six gear cards (L1-L2), two heroes (Dwarf Druid and Sylaei the
  Elf Mercenary) both assigned to the farm; farm levels 1-3 reopened and
  idling, desert and forest levels explorable again after the chapter close;
  550 gold, 2K XP; 10 chapter 7 quests, skeleton-bone quest read; Discord
  and next/prev flags shown.

### Navigation map (750x1334 design px, anchor for the other viewports)

Found while making the fixtures. y grows downwards. Header items use `top`,
dungeon rows `list`, footer `bottomleft`/`bottomright`, centred popups
`center`; the map band sits below the header and takes a quarter of the
extra height, so its middle is `[0.5, 0.125]`.
Checked at all three viewports: header quest slots, list rows, the quest
popup buttons, the settings cog and the Settings X. The other anchors follow
the scripts' layout code but are unchecked: look at the frames.

| Where | What | x, y | anchor |
|---|---|---|---|
| header | chapter book | 75, 70 | topleft |
| header | quest slots: 1 slot / 2 slots / 3 slots | 374 / 255, 495 / 130, 374, 620 at y 185 | top |
| header | Start Chapter N (all quests collected) | 374, 186 | top |
| dungeon tabs | first tab (wide) / tabs 2-5 | 215 / 470, 550, 630, 710 at y 295 | top |
| dungeon tabs | on another region the first tab shrinks to | 40, 295 | top |
| map | hero card / its X / second hero slot (+) | 260, 470 / 355, 348 / 492, 490 | [0.5, 0.125] |
| dungeon list | row k (1-based) centre y | 707 + 175 (k-1) | list |
| dungeon list | Click to explore (closed row k) | 375, 740 + 175 (k-1) | list |
| dungeon list | play / hire / buy-state cycle | 160, y / 385, y+73 / 699, y+73 | list |
| dungeon list | loot slots (bonus XP badges) / henchman portrait | 620, y and 705, y / 60, y+33 | list |
| footer | Discord (chapter 5+) / cards / shop / settings cog | 65, 1280 / 180, 1280 / 590, 1280 / 699, 1294 | bottomleft / bottomleft / bottomright / bottomright |
| quest popups | Accept / Collect | 375, 886 | center |
| reward | "Tap to collect" card, pack cards, pack summary | tap 375, 500 (one per card, one more to close) | center |
| henchman popup | LEVEL UP / gear LEVEL UP (right column) / close (tap outside) | 375, 630 / 645, 830 / 375, 1180 | center |
| shop | Get FREE Loot / X | 375, 428 / 700, 290 | top |
| shop | card packs, XP, time warps, gold rows | x 128, 374, 620 at y 605, 780, 955, 1135 | top |
| cards | Upgrade / X | 565, 288 / 700, 290 | top |
| confirm popup | YES / NO | 235, 800 / 515, 800 | center |
| sell screen | item grid (6 x 8) / NEXT | x 100 + 108 i, y 180, 310, 440, 570, 700, 835, 965, 1095 / 388, 1270 | center / bottom |
| card unlock screen | next card | 375, 500 | center |
| welcome back | X / Double it | 630, 395 / 375, 908 | center |
| hero select | first hero row / back | 375, 190 / 55, 55 | topleft |

Manual runs finish on wall time, so a `skip` of 25 s (Cellar Tunnels), 120 s
(Ruin Entrance) or 400-600 s (Ancient Library) after tapping play completes a
run without stepping its frames.

## The original's state hook

`hook/parity_hook.lua` is appended to `/render/custom.render_script` in the
parity variant only.
The render script's `update` is the last Lua in an engine frame, so the dump is
the state the frame ended with.
The render script shares one Lua state with the GUI and game-object scripts.

Every frame, the hook calls
`html5.run("(window.__parity && window.__parity.cmd()) || ''")`:

- `state` — serialise the game state and call `window.__parity.put('<json>')`.
- `save` — run `defsave.save_all(true)`.

It also replaces `print` with `console.log("[lua] " .. tab-joined args)`.

### State dump format (canonical JSON)

```
{"controllers":{"gear":{...},"henchmen":{...},"hero":{...},"loot":{...},
                "map":{...},"navigation":{...},"rep":{...},"vault":{...}},
 "save":{"Currency":{...},"Gear":{...},...}}
```

- **`save.<File>`** is `defsave.loaded[File].data` for every loaded file.
- **`controllers.<name>`** holds the module-level locals of
  `controllers.<name>Controller`: every upvalue reachable from the module's
  functions and from functions stored in tables they reach, by upvalue name.
  The module table's own non-function fields are included too.
  - Wiring is skipped: `messageData`, `controller`, `productName`, `isDebug`,
    the module itself, and any table that is a loaded module.
  - Current keys: gear `pause`; henchmen `locationBoost pause pauseTimer
    update_list`; hero `attributeMap curLoc dungeon_regenSpeed pause pauseTimer
    update_list`; loot `attFactor drawWeight`; map `curLoc`; navigation
    `boot_list breadcrumb currentPopup currentScreen map_id showKingdom`; rep
    `curLoc defaultStats`; vault `followers_gain_while_away startingBonusTime
    startingFollowers startingGold startingPortalScrolls startingXP
    updateInterval`.
- **Tables** are always JSON objects, arrays included (`{"1":..,"2":..}`).
- **Keys:**
  - strings are kept verbatim; numbers are written as `%.17g`; booleans as
    `true` or `false`.
  - other key types are dropped, and so are function and thread values.
  - when two keys stringify the same, the first one met wins.
  - keys are sorted by byte order (UTF-8).
- **Numbers** are written as C `%.17g`: `1`, `0.25`, `1767225609.1500001`,
  `1e+20`, `-0`. NaN and ±inf become the strings `"nan"`, `"inf"` and `"-inf"`.
- **Strings.** `"` and `\` are escaped, and so are control bytes (0x00–0x1f,
  0x7f) as `\u00xx`. All other bytes, UTF-8 included, are kept raw.
- **Userdata** (vmath, hash, url) becomes the string `tostring(v)`.
- **Cycles** become `"<cycle>"`. A table seen twice outside a cycle is written
  in full each time.

## Port contract

The port page is `game/port/index.html`, served at `/port/index.html` with
`game/` as the web root.
The harness injects the same `lib/init.js` before any port script, so the port
gets the virtual clock, rAF, timers, `Math.random`, network gating and
`preserveDrawingBuffer` with no code of its own.

The port must:

1. **Use the virtualised primitives only.**
   - Time comes from `Date.now()`, `new Date()` or `performance.now()`.
   - The main loop is `requestAnimationFrame`. No `setTimeout` loops, workers,
     `MessageChannel` ticks or `requestVideoFrameCallback`.
   - Randomness that must match the original reimplements Defold's
     `math.random` (below), never `crypto`.
   - Do not touch `window.__parity` except through the calls below.
2. **Load everything before it is ready.**
   - Load every asset (images, fonts, audio, data) during boot, then call
     `window.__parity?.portReady()` once its first rAF has been requested.
   - The harness waits for that call.
   - Requests to `/loc.json` and `/api/*` are gated even during boot, like the
     original's. They answer at frame 0.
3. **Render into one `<canvas>`**, preferably `id="canvas"`, sized like the
   original's `index.html` does it: canvas pixels = window inner size with the
   aspect clamped to [0.45, 0.75] and centred, no DPR scaling at
   `deviceScaleFactor` 1.
   - The harness reads it with `canvas.toDataURL('image/png')`.
   - WebGL or 2D both work, since WebGL gets `preserveDrawingBuffer`.
   - The read happens after the frame's rAF callbacks and a macrotask, so the
     frame must be fully drawn by then.
4. **Take input from mouse events on that canvas**: `mousedown` / `mouseup` /
   `mousemove` (button 0), `mousewheel` (`wheelDelta`) or `wheel` (`deltaY`).
   - Compute positions from `clientX/clientY` minus the canvas's
     `getBoundingClientRect()`.
   - Input dispatched before frame k must reach the game logic in frame k.
5. **Expose state** by calling `window.__parity.provideState(fn)` once.
   - `fn()` returns either a plain object, which the harness canonicalises with
     `__parity.canon`, or an already canonical JSON string. It is called after a
     capture frame's rAF callbacks.
   - Its output must equal the original's dump byte for byte, so mirror the
     Lua tables' shape.
   - `__parity.canon` writes JS arrays as 1-based objects to match Lua.
     `null` and `undefined` values are dropped like Lua `nil`. Numbers use
     `__parity.g17`, which is `%.17g`.
6. **Persist like the original.** Same localStorage keys and JSON
   (`out_of_ruin_<File>`), so fixtures load in both targets. If the port does
   not use IndexedDB it can ignore that part of the fixture.

## Engine behaviour the port must replicate

- **Fixed dt.**
  - Defold passes `dt = 0.01666666753590107` (float32 of 1/60) to every
    `update`, regardless of wall time (`update_frequency = 0`, fixed step).
  - GUI and `go.animate` animations advance by that per frame.
  - Game logic uses wall time instead: `os.clock` is replaced with
    `socket.gettime`, so timers, henchman and hero cycles and followers income
    use `Date.now()` / 1000 with whole-ms resolution.
- **Frame timing.**
  - The first stepped frame (0) runs at `startTime + 16.67 ms`.
  - Boot, which runs every script's `init` and `math.randomseed(os.time())`,
    sees `startTime` exactly.
- **The fps label (bottom left).** It shows `fps: 0` until `metrics/fps.lua`
  has samples, then values like `59.95` and `60.02`. They come from the
  ms-floored `socket.gettime`, so the port must compute the label the same way.
- **`math.random` is Defold's own LCG, not libc.**
  - `seed = seed * 214013 + 2531011` (mod 2^32), `x = (seed >> 16) & 0x7fff`,
    `r = x / 32768`.
  - `math.random()` returns `r`; `math.random(m, n)` returns
    `floor(r * (n - m + 1)) + m`.
  - `math.randomseed(s)` sets `seed = s` (int).
  - Verified in-engine: seed 42 gives 5341, 12208, 545319, then 0.917236328125.
- **Input timing.**
  - A press dispatched before frame k is seen by `on_input` in frame k.
  - gooey buttons and list items act on release, so a tap at frame k with the
    default hold of 2 changes state in frame k+2. Messages posted from
    `on_input` are handled within the same frame.
- **The localisation sheet** (`loc.json`) is requested during boot and arrives
  in frame 0; its `on_load` callback runs then.
- **Boot.**
  - A fresh save boots straight into `dungeonmine` (Local Farm), not the
    kingdom.
  - With a save, frame 0 still shows the boot transition overlapping the
    dungeon screen.
- **Saves.** defsave saves on most actions, through `html5.run` into
  localStorage. JSON numbers are written with 14 significant digits, so a
  reload rounds values like `Progress` (3.1111111111111).
