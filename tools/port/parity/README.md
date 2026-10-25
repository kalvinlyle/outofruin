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
node run.mjs --target orig --all              # or --scenario <name>, [--viewport 750x1334]
node run.mjs --target port --all
node compare.mjs --a orig --b port            # writes parity-report/index.html at the repo root
node report.mjs --a orig --b port             # rebuild the report from out/compare-orig-port.json
node run.mjs --selftest                       # orig twice, require identical pixels and state
node run.mjs --make-fixture <name> --scenario fixtures/<maker>
node run.mjs --build                          # rebake game/_work/parity (automatic when stale)
```

Output goes to `out/<scenario>/<target>/<frame>.png`, `state/<frame>.json` and
`log.txt` (console, including Lua `print` as `[lua] ...`).
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
   other `/api/*` 404, Kongregate's script is empty, Google Analytics 200 empty,
   anything else off-origin is aborted.
2. A fresh browser context (no profile), viewport from the scenario,
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

- **Clock.** Frozen at boot. Frame k runs at `startTime + (k+1) * 1000/60` ms.
  `Date.now()` and `new Date()` are floored to whole ms; `performance.now()` is
  `1000 + (k+1) * 1000/60`, unfloored.
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
  "viewport": { "w": 750, "h": 1334 },
  "frames": 600,
  "seed": 24301,
  "steps": [
    { "frame": 30, "action": "tap", "x": 375, "y": 740, "hold": 2 },
    { "frame": 90, "action": "down", "x": 100, "y": 900 },
    { "frame": 95, "action": "move", "x": 100, "y": 700, "buttons": 1 },
    { "frame": 99, "action": "up", "x": 100, "y": 700 },
    { "frame": 120, "action": "drag", "x": 375, "y": 1000, "x2": 375, "y2": 600, "frames": 10, "hold": 1 },
    { "frame": 200, "action": "wheel", "x": 375, "y": 900, "delta": 120 }
  ],
  "capture": { "every": 10, "frames": [31, 32] }
}
```

- `tap` sends move+down on `frame` and up on `frame + hold` (default 2).
- `drag` presses at `x,y`, moves one step per frame to `x2,y2` over `frames`,
  then releases `hold` frames later.
- The last frame is always captured.
- `seed` is optional.

Starter scenarios:

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
- **Making a fixture.** `--make-fixture` runs the maker scenario on `orig`. On
  the last frame it forces `defsave.save_all(true)`, then waits for the IDBFS
  write-back and snapshots both stores.

Fixtures:

- `fresh` — empty storage, `startTime` 2026-01-01T00:00:00Z.
- `ch1-farmyard` — chapter 1 after two minutes of play: Farmyard explored,
  started 30 times, carrots and turnips collected, 118 followers, quest
  badges up.

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
