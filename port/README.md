# port

The game rebuilt as a web app: TypeScript and WebGL, no Defold.

It draws the same frames and keeps the same state as the Defold build, checked
frame by frame by the parity harness in `tools/port/parity/`.

## What's here

- `src/lua/` — Lua 5.1 behaviour the translated code depends on, so it behaves
  exactly like the original:
  - table iteration order, reproducing `ltable.c`;
  - patterns, `string.format` and number formatting;
  - `table.sort` and Defold's `math.random`.

  `test/` checks these against a real Lua 5.1 binary.
- `src/engine/` — a port of the parts of the Defold 1.2.167 runtime the game
  uses:
  - GUI nodes, layout, animation and text;
  - the render script;
  - message passing, input and the frame loop;
  - `sys`, `html5`, `json`, `http` and storage.

  There is no node limit.
- `src/game/` — every game script, translated line by line from the shipped Lua.
  The rules are in `TRANSLATING.md`.
- `src/main.ts` — page entry. `game/port/index.html` loads the built bundle.
- `translated.json` — the hash of the Lua each module was translated from;
  `tools/port/translate_check.py` lists modules whose Lua has changed since.

Assets are not kept here. `tools/port/export_assets.py` writes them to
`game/port/assets/` from the Defold archive.

## Commands

Run from `port/`:

```bash
npm install
```

```bash
python3 ../tools/port/export_assets.py
```

```bash
npm run build
```

```bash
npx tsc --noEmit
```

```bash
LUA51=/path/to/lua5.1 npm test
```

`npm run build` writes `game/port/main.js` and `game/port/chunks/`.

The game is served at `http://localhost:8016/port/` by the `outofruin-game`
server. It reads the same localStorage saves as the Defold build on that
origin.

`?scene=main/kingdom/kingdom` renders one GUI scene statically, and `?log` turns
on Lua `print` output.

## Checking parity

From `tools/port/parity/`:

```bash
node run.mjs --target port --all
```

```bash
node compare.mjs --a orig --b port
```

A run passes when the following all hold:
- every captured frame matches the original at ≥99% of pixels;
- the game state dump is identical;
- the saves written to localStorage are byte-identical at the end of the run.

`node ../perf.mjs --fixture ch2` measures frame rate under 4× CPU throttling.
