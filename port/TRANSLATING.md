# Translating the game Lua to TypeScript

The port must reproduce the original frame for frame. The parity harness
compares pixels and the full game state, so a translation is correct only when
it behaves exactly like the Lua, quirks included. Translate line by line. Keep
the original's structure, names, comments and order of operations. Never "fix"
or simplify behaviour: a bug in the Lua is a bug the port must keep.

## Source

- **Source of truth:** `game/port/assets/lua/`, the Lua currently shipping, with
  every override baked in. Do not read `extracted/` or `game-src/lua/` instead.
- **Output:** each Lua file maps to one TS file under `port/src/game/`, at the
  same relative path with `.ts` replacing `.lua` / `.gui_script` / `.script`.
  For example, `main/kingdom/kingdom.gui_script` becomes
  `port/src/game/main/kingdom/kingdom.gui_script.ts`, and
  `controllers/vaultController.lua` becomes
  `port/src/game/controllers/vaultController.ts`.
- **Module names:** `require('a.b')` and `require('a/b')` both become an import
  of `port/src/game/a/b.ts`. A module returns `M`, so `export default M`.
  ES modules are singletons, like `package.loaded`.
- **Engine and Lua runtime:** import them from `port/src/engine` and
  `port/src/lua`.

## Script files (`.gui_script`, `.script`)

```ts
import { defineScript, gui, msg, hash } from '../../../engine';
defineScript('/main/kingdom/kingdom.gui_script', () => {
  // the chunk's top-level locals go here, in order
  let enabled = false;
  function refresh_all() { /* ... */ }
  return {
    init(self) { /* ... */ },
    update(self, dt) { /* ... */ },
    on_message(self, message_id, message, sender) { /* ... */ },
    on_input(self, action_id, action) { /* ... return true to consume */ },
    final(self) { /* ... */ },
  };
});
```

- **Callbacks:** only the callbacks the Lua defines. Defold passes `self` and
  `dt` even when the Lua signature omits them.
- **Registration:** each translation group owns
  `port/src/game/scripts.<group>.ts` (`libs`, `controllers`, `screens_a`,
  `screens_b`) and adds one side-effect import per script file there. Never
  edit another group's registry.

## Globals

A non-`local` assignment at any level in Lua writes a global, which every script
shares. Translate it to the shared table `G` from `port/src/game/globals.ts`
(`export const G: Record<string, any> = {}`). Global functions other than the
script callbacks (`init`, `update`, `on_message`, `on_input`, `final`,
`on_reload`) also go into `G`.

When a script reads a name that is neither local nor a Lua builtin, it is a `G`
read.

## Semantics that must be kept

- **Truthiness.**
  - In Lua, only `nil` and `false` are false; `0` and `""` are true. Write
    `if (t(x))` for any value that could be a number or a string. A plain JS
    condition is fine only for booleans and tables.
  - `a and b or c` becomes `t(a) && t(b) ? b : c` when `b` might be
    `false`/`nil`; otherwise `t(a) ? b : c`.
  - `not x` becomes `!t(x)`.
- **nil** is `undefined`. `x == nil` becomes `x === undefined || x === null`
  (helper `isnil` is fine).
- **Equality:** `==` becomes `===`. Lua never coerces between strings and
  numbers in `==`.
- **Concatenation:** `..` becomes `cat(a, b, ...)`. `cat` formats numbers with
  `%.14g` and throws on nil, like Lua. Never use `+` or template strings on
  numbers.
- **Arithmetic on strings:** Lua coerces numeric strings in arithmetic
  (`"3" + 1 == 4`). Where an operand can be a string, wrap it in
  `tonumber(x)!`.
- **Operators:**
  - `%` becomes `M.mod(a, b)`. JS `%` differs for negatives.
  - `^` becomes `Math.pow`.
  - Integer division doesn't exist; `/` is float, the same in both.
- **Arrays:**
  - Lua index `i` is JS `arr[i - 1]`.
  - `#t` becomes `len(t)`. It stops at the first nil, which matches Lua for the
    sequences the game builds.
  - `ipairs(t)` becomes `for (let i = 1; i <= len(t); i++) { const v = t[i - 1]; ... }`,
    or an equivalent that stops at the first nil.
  - `t[#t+1] = v` becomes `T.insert(t, v)` or `t[len(t)] = v`.
  - `table.insert`, `table.remove`, `table.sort` and `table.concat` become
    `T.insert`, `T.remove`, `T.sort` and `T.concat`. `T.sort` is Lua's
    unstable quicksort, so equal elements end up where the original put them.
    Never use `Array.prototype.sort`.
  - Index arithmetic stays 1-based in variables: keep `i` meaning the Lua
    index, and subtract 1 only at the access.
- **Tables with string keys** are plain objects.
  - `for k, v in pairs(t)` becomes `for (const [k, v] of pairs(t))`.
    `pairs` reproduces Lua's hash order from the object's insertion order.
  - When a table with string keys is written with a constructor literal
    `{a=1, b=2}` and later iterated with `pairs`, wrap the literal:
    `literal({ a: 1, b: 2 })`.
  - When code removes keys (`t[k] = nil`) from a table that is later iterated
    with `pairs`, create it with `tracked({})` and write it through
    `tset(t, k, v)`.
  - `pairs` over an array visits 1..n.
  - Keys that are numbers in Lua stay numbers. An object keyed by numbers
    (`t[5] = x` on a non-sequence) is an object with numeric keys; `pairs`
    handles it.
- **Mixed tables** (array part plus named fields) are JS arrays with extra
  properties.
- **Strings:**
  - `string.format` becomes `format`.
  - `string.sub/find/match/gmatch/gsub/rep/byte/char/upper/lower` become
    `S.sub` and friends. `S.find`/`S.match` return arrays like Lua's multiple
    returns (`[undefined]` for no match), and `S.match1` gives the first
    capture.
  - Method calls `s:sub(...)` are the same functions.
  - `string.len(s)` / `#s` becomes `strlen(s)`, the byte length.
  - `tostring` and `tonumber` come from `../lua`.
- **Math:**
  - `math.random` / `math.randomseed` become `M.random` / `M.randomseed`.
    These reproduce the original's libc `rand()`, and every call must happen
    in the same order as in the Lua.
  - `math.floor`, `ceil`, `abs`, `max`, `min`, `sqrt`, `sin`, `cos`, `log` and
    `pow` map to `Math.*`. Lua's `math.log` is the natural log, and
    `math.max`/`min` with NaN are edge cases that don't occur in the game.
  - `math.huge` becomes `Infinity`.
- **os:**
  - `os.clock()`, `os.time()` and `os.date()` become `os.clock()`, `os.time()`
    and `os.date()` from `../lua`.
  - `controller.script` does `os.clock = socket.gettime`; translate it as
    `os.clock = socket.gettime`, so every module sees the swap.
- **Multiple returns** become arrays, destructured at the call site
  (`const [a, b] = f()`). Keep `select('#', ...)` semantics where they're used.
- **Varargs:** `...` becomes rest parameters.
- **Closures and upvalues** carry over as is.
- **`self`** is the per-component object the engine passes. Fields set on it
  stay on it.
- **Vectors:**
  - `vmath.vector3/vector4` are mutable objects, as in Lua.
  - `gui.get_position` and friends return a fresh copy.
  - Operators become `vmath.add/sub/mul/neg`.
  - Assigning `p.x = ...` mutates, and passing `p` to `gui.set_position`
    copies it.
- **Hashes:**
  - `hash("x")` becomes `hash("x")`, which returns the string.
  - `message_id == hash("x")` becomes `message_id === hash("x")`.
  - Message ids and action ids arrive as hashes.
- **Messages:** `msg.post(url, id, table)` has the same arguments. The engine
  queues it and delivers it in Defold's order. Never call another script
  directly where the Lua posted a message.
- **`pcall(f, ...)`** becomes try/catch, returning `[ok, ...results]`.
- **`print`/`pprint`** become `print` from the engine. Keep every call:
  the harness can route them.
- **Library stand-ins:**
  - `inspect` returns a string; translate it to a function returning `''`.
    The game only prints it.
  - `googleanalytics` becomes a no-op module with the same API.
  - `kongregate` calls that the Lua guards are no-ops.

## Done means

- It compiles: `cd port && npx tsc --noEmit`, with zero errors in your files.
- Every Lua function, branch and message handler has its counterpart.
- Mark any spot you cannot translate exactly with `// PARITY:` and a one-line
  reason, and list them in your report.
