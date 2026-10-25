# Code audit — 2026-10-25

Full static read of the repo: the Stripe serverless API, the browser store
layer, the Defold loader page, the Lua overrides in `game-src/lua/`, the
Python patch tooling and the marketing site.

Nothing was executed; the game was not driven in a browser. The Lua findings
marked *certain* follow from Lua scoping and table semantics and do not need a
run to confirm. Several other Claude sessions were editing `dungeonmine`,
`header` and the shop at the time of the audit, so line numbers may have moved.

---

## Summary

| Severity | Count | Theme |
|---|---|---|
| Critical | 2 | The shop crashes, and real-money sales are switched off |
| High | 4 | Per-frame world rebuilds; two ways to lose or duplicate a paid purchase |
| Medium | 10 | Latent Lua crashes, shared-global collisions, API hardening |
| Low | 14 | Dead analytics, stale CDN deps, repo hygiene, no tests |

The two critical items both sit on the monetisation path and both are in
`HEAD`, not in uncommitted work.

---

## Critical

### C1 — Opening any gold-priced shop item crashes the shop

`game-src/lua/main/shop/shop.gui_script`

`refresh_info()` (line 250) calls `full_number(item.gold)`, but `full_number`
is declared `local` at line 416. A Lua local is only in scope from its
declaration onward, so the call at line 250 compiles as a **global** read,
which is `nil`. Tapping any of the nine gold-priced cards (Cards ×3, XP ×3,
Time ×3) runs `open_info` → `refresh_info` → `attempt to call a nil value`.

This is committed — in `HEAD` the same pair sits at lines 188 and 352, so it
shipped with `6f34d66 "Shop: full-width cards, info pages, and Stripe for gold"`.

Fix: move the `full_number` definition above `refresh_info`, or forward-declare
it (`local full_number` near the top, then `function full_number(n)`).

### C2 — The real-money store is switched off in the deployed build

`game/packs.js:8-11`

```js
publishableKeys: { test: "", live: "" },
```

Both are empty. `_stripe.js:publishableKey()` therefore returns `""`,
`/api/status` answers `{ enabled: false }`, `OOR_STORE.price()` returns `""`,
and all six gold packs render as "Not available yet". `/api/checkout` returns
`503 not_configured` even with a valid secret key in the Vercel environment.

The publishable keys are public by design and belong in this file. Until they
are filled in, no gold can be sold.

---

## High

### H1 — The main game screen rebuilds the entire world every frame

`game-src/lua/main/dungeonmine/dungeonmine.gui_script:1127`

```lua
function update()
	layout_screen()
	if enabled and defsave then
		refresh_all()
	end
end
```

`refresh_all()` (line 1105) deep-clones `Loot`, `Stats`, `Resources` and
`Bonusxp` via `actions.clone` (a recursive table copy), then calls
`refresh_mapdata()` and `refresh_herodata()`. `refresh_mapdata()` walks all
five dungeons × five levels × every entry in each level's `Loot_Table`, issues
dozens of `gui.get_node` string lookups, calls
`gui.get_text_metrics_from_node` (a text re-measure), and finishes with
another `actions.clone` of the active dungeon's levels.

All of that runs 60 times a second on the screen the player spends most of
their time on. It is both the frame-time cost and a steady stream of garbage
for the collector. This is the single largest gap against the "60 fps on a
three-year-old mid-tier phone" budget in `AGENTS.md`.

Fix: drive `refresh_all()` from the events that actually change state (the
`refresh_all` message already exists and is posted by the controllers), and
keep `update()` to `layout_screen()` plus whatever genuinely animates.

### H2 — The header does a full save scan every frame, triggered by the FPS counter

`extracted/lua/main/controller.lua:58` posts `update_fps` to
`main:/overlay#header` **every frame**. `game-src/lua/main/nav/header.gui_script:505-507`
handles it with:

```lua
elseif message_id == hash("update_fps") then
	gui.set_text(gui.get_node("fps/text"), "fps: " .. message.text)
	if enabled and defsave then refresh_all() end
```

The header's `refresh_all()` deep-clones `Stats` and the whole `Ranks` table
(11 chapters with all their quests), rebuilds `Quests`/`activeQuests`, runs
`actions.load_all_savedata` over Hero, Henchmen **and** Gear (a `defsave.get`
per card — 45 gear, 25 henchmen, 4 heroes), rebuilds the rank-progress nugget
nodes and calls `gooey.horizontal_dynamic_list`.

The sibling handler in `sellitems.gui_script:336` only sets the text, which is
what this one should do. Drop the `refresh_all()` call.

### H3 — A paid purchase can be silently lost

`game/store.js:161-166`

```js
post("/api/claim", { session: current.id }).then(function (r) {
  if (r.status === "granted") events.push({ gold: r.gold });
  forget(current.id);
}, function () {
  forget(current.id);          // <-- network failure also forgets it
});
```

When the player closes the payment popup, the session is settled once. If that
single `/api/claim` call fails for any transient reason — offline, a Vercel
cold-start timeout, a 502 from the Stripe call — the rejection handler drops
the session from `localStorage`. If the payment had in fact gone through in
the last moment before closing, the player is charged and never gets the gold,
and nothing will ever retry: the id is gone.

`claimAll()` already has the right behaviour (`retry = true`, re-run after
`RETRY_MS`). The error path here should do the same and keep the id until the
server gives a definite answer.

### H4 — Double-grant race on claim

`game/api/claim.js:28-39`

The claimed mark is read and then written in two separate Stripe calls with no
atomicity:

```js
if (intent.metadata && intent.metadata.oor_claimed) { ...return claimed... }
...
await stripe("POST", `/payment_intents/${intent.id}`, { "metadata[oor_claimed]": ... });
return res.status(200).json({ status: "granted", gold: pack.gold });
```

Two concurrent POSTs for the same session — two tabs, a double-tap, the
`onComplete` handler racing a `claimAll()` retry — can both pass the metadata
check before either writes, and both return `granted`. The `claiming` flag in
`store.js` only serialises within a single tab.

The comment on the file claims "the claim mark lives on the Stripe payment
itself, which keeps a refresh or a second tab from granting the same purchase
twice" — that is the intent, but the implementation does not guarantee it.

Low real-world frequency, and it grants gold rather than taking money, so this
is a correctness issue rather than a revenue one. If it matters, Stripe
supports conditional updates via idempotency keys, or move the mark to a
small KV store with a compare-and-set.

---

## Medium

### M1 — `pairs(targets)` on an undeclared global crashes the header on resize

`game-src/lua/main/nav/header.gui_script:512`

```lua
elseif message_id == hash("window_dimensions") then
	gui_extra_functions.update_coef(message.width, message.height)
	for t,target in pairs(targets) do
```

`targets` is never declared in this file. The only `local targets` is in
`extracted/lua/main/nav/guiparticles.lua`, a different script. `pairs(nil)`
raises. The header reaches this path by posting `get_dimensions` to the render
script on `window_resized` (line 517), and `extracted/lua/render/custom.lua:114`
answers with `window_dimensions`.

Inherited verbatim from the original build (`extracted/lua/main/nav/header.lua:428`),
so it has presumably never fired — but it is live code on a resize path, which
matters more now that the canvas reshapes itself to the window.

### M2 — Unguarded `Stats.adReward` comparison in the header

`header.gui_script:288` does `os.time(os.date("!*t")) >= Stats.adReward`
with no nil check, while `update()` at line 208 guards it and
`shop.gui_script:326` defaults it to `0`. A save without `adReward` crashes
`refresh_all`.

### M3 — Rank compared against a reputation requirement

`header.gui_script:332`

```lua
if Stats.Rank >= #Ranks and Stats.Rank >= Ranks[Stats.Rank].RepNeeded then
```

The second clause compares a chapter index to a reputation target. Every other
site in the file compares `Stats.Rep` (lines 38, 321, 453). Almost certainly
meant to be `Stats.Rep`, which makes the "max chapter" label fire on the wrong
condition.

### M4 — `timewarp` reads an undeclared global `card`

`game-src/lua/main/timewarp/timewarp.gui_script:141-142`

```lua
elseif message_id == hash("refresh_all") then
	if not card.message and card.type and card.id then
		card = defsave.get(card.type, card.id)
```

`card` is never declared in this file; the only `local card` is in
`upgradecard.gui_script:11`. Any `refresh_all` reaching the timewarp screen
indexes `nil`. Nothing currently posts it there, so it is latent.

### M5 — Duplicate table key silently drops a handler

`game-src/lua/controllers/vaultController.lua:209` and `:213`

`["use_portalscroll"]` is defined twice in the same table literal. Lua keeps
the last one, so the first handler (which modifies the scroll count by
`message.amount`) is dead code and the second (hard-coded `-1`, then shows
sellitems) always wins. Callers passing `amount` are being ignored.

### M6 — Off-by-one on two gold checks

- `vaultController.lua:203` — `if defsave.get("Currency", "Gold") + message.gold > 0`
  blocks a portal-scroll purchase that would leave the player at exactly zero
  gold. Should be `>= 0`.
- `header.gui_script:412` — `if defsave.get("Currency", "Gold") > defsave.get("Stats", "portalScrollCost")`
  likewise rejects having exactly enough. Should be `>=`.

Together: a player with exactly the listed price cannot buy the thing at that
price, and is bounced to the shop instead.

### M7 — Globals leak between GUI scripts

Defold runs every script in one shared Lua state, so an undeclared assignment
is visible to every other script. Current leaks:

| Name | Written at |
|---|---|
| `Loot` | `dungeonmine.gui_script:1110-1111` |
| `Ranks` | `questOpen_popup:91`, `questClose_popup:91` |
| `Currency` | `sellitems.gui_script:242` |
| `questScale` | `header.gui_script:281` |
| `dungeonActivateButtonSize` / `…Scale` | `dungeonmine.gui_script:166-167` |
| `hours` / `mins` / `secs` | `shop.gui_script:359-361` |

Nothing collides today, but `Ranks` and `Currency` are generic enough that a
new script declaring them globally would quietly corrupt another screen. Add
`local` to each.

### M8 — `return_url` is built from a client-controlled header

`game/api/checkout.js:16-18`

```js
const proto = req.headers["x-forwarded-proto"] || "https";
const host = req.headers["x-forwarded-host"] || req.headers.host;
```

A caller can set `X-Forwarded-Host` and get a Checkout Session whose
`return_url` points at a host they chose. Impact is limited — the attacker
creates their own session, and card payments complete in-page without a
redirect — but the session id would be handed to an arbitrary origin on the
bank-redirect path. Pin the origin to a known deployment URL
(`process.env.VERCEL_PROJECT_PRODUCTION_URL` or an explicit constant) rather
than trusting the request.

### M9 — `/api/checkout` is unauthenticated and unthrottled

Anyone can POST to it in a loop and mint Stripe Checkout Sessions against the
account. No money moves, but it burns API quota and fills the Stripe
dashboard. A simple per-IP limit, or Vercel's firewall rate-limit rule, closes
it.

### M10 — Two dead branches in the Kongregate controller

`game-src/lua/controllers/kongregateController.lua`

- Line 12: `hml5 = html5 or { run = function() return end }` — the variable is
  misspelled, so the intended fallback never binds to `html5` and a stray
  global `hml5` is created. Harmless on HTML5, where `html5` exists.
- Line 204: `if username ~= "Guest"` reads an undeclared global, which is
  always `nil`, so the condition is always true and the
  `showRegistrationBox()` branch can never run. The username is stored at
  `defsave.get("Stats", "username")`.

---

## Low / hygiene

### Site and analytics

1. **All site analytics have been dead since July 2023.** `play.html`,
   `404.html` and `signup.html` load the gtag script for `UA-157031393-2` but
   call `gtag('config', 'UA-157031393-1')` — a property mismatch. Separately,
   both are Universal Analytics properties, which stopped processing data in
   July 2023. `index.html` at least loads and configures the same id. If
   measurement matters, this needs a GA4 property.
2. **The Facebook customer-chat widget is dead.** `connect.facebook.net/en_US/sdk/xfbml.customerchat.js`
   returns HTTP 500 (verified). `play.html:100-113` still injects it.
3. **No consent gate.** `play.html` loads Google Analytics and the Facebook
   Pixel on first paint, before any consent, while `privacy_policy.html` is
   served from the same site. Worth a look if EU traffic matters.
4. **Kongregate's API is render-blocking on every load.** `game/index.html:246`
   loads `cdn1.kongregate.com/javascripts/kongregate_api.js` with a plain
   synchronous `<script>` tag, on the Vercel deployment where it is never
   used — `isKongregate()` only returns true on two kongregate.com URLs. It
   currently resolves, but it is a third-party single point of failure in
   front of the game's first frame. Load it only when the referrer matches.
5. **Stale front-end libraries.** `play.html` pulls jQuery 3.3.1
   (CVE-2019-11358, prototype pollution) and Bootstrap 4.3.1 (CVE-2019-8331,
   XSS via data attributes) from CDNs; `package.json` pins jQuery 3.4.1, below
   the 3.5.0 that fixed CVE-2020-11022/11023. Low exploitability on a static
   marketing page, but they are known-vulnerable versions.
6. **No security headers.** There is no `vercel.json`, so the deployment ships
   without CSP, `X-Content-Type-Options`, `Referrer-Policy` or
   `X-Frame-Options`. The game is framed by `play.html`, so framing rules need
   care, but the rest are free.

### Build and repo

7. **`.travis.yml` is broken and unused.** It runs `npm test`; `package.json`
   has no `test` script, so the build fails by definition. Hosting moved to
   Vercel. Delete it, or replace it with a real check.
8. **`package.json` still describes the Bootstrap template** — name
   `startbootstrap-freelancer`, the original homepage, bug tracker and
   repository URL. Anything reading project metadata gets the wrong project.
9. **~35 MB of Photoshop sources are committed** — `img/heroes/roster.psd`
   (14 MB), `img/masthead.psd` (12 MB), `i-phone-x-black.psd` (3.8 MB),
   `adventure.psd` (2.5 MB), `treasure.psd` (1.5 MB). The pack is 21 MB and
   every clone pays for it. Git LFS, or move them out of the repo.
10. **No tests anywhere.** No Lua test harness, no test for the archive
    round-trip in `tools/patch_game.py`, no test for the pricing path. The
    archive tooling in particular is doing byte-level protobuf surgery with
    nothing checking that a rebuild still loads.

### Tooling

11. `tools/patch_game.py:206-207` clears the output directory with
    `os.remove` over `os.listdir`, which raises on any subdirectory. It also
    opens every file without a context manager (lines 115, 147, 164, 213) and
    writes a temp manifest into `game-src/archive/` — the directory the module
    docstring says is "never edited".
12. `tools/defold_archive.py:1` — the docstring gives the usage as
    `defold_extract.py`, which is a different file in `extracted/tools/`.
13. `game/store.js:12` — `events` is an unbounded array. If the Lua side stops
    polling `OOR_STORE.take()` (the game is paused, the script errors out),
    events accumulate for the life of the page. A cap would be cheap.
14. `settings.gui_script:98` names a parameter `progress`, shadowing the
    `progress` module required at line 4. Harmless here, a trap later.
15. `dungeonmine.gui_script:166-167` — `dungeonActivateButtonSize` is assigned
    `gui.get_scale()` and `dungeonActivateButtonScale` is assigned
    `gui.get_size()`. The names are swapped. Line 402 multiplies the two, so
    the arithmetic is right by accident; the names are not.
16. `shop.gui_script:349` and `header.gui_script:284`, `:520` pass `action_id`
    and `action` to `gooey` from scopes where both are undeclared globals, so
    gooey always receives `nil`. It tolerates this, but the intent is unclear.
17. `header.gui_script:242` passes `defsave.loaded.Currency` to
    `actions.tablelength` where every neighbouring call passes
    `defsave.loaded.Stats` — and line 251 does the same. Both happen to be
    truthy wrappers, so the guard does not test what it reads.

---

## What is in good shape

- **No secrets are committed.** `git log --all` shows no `.env` ever tracked,
  and no `sk_`/`rk_`/`whsec_` string appears in any tracked file.
  `game/.gitignore` and `game/.vercelignore` both cover `.env*`, verified with
  `git check-ignore`.
- **Prices are server-side.** `checkout.js:11` resolves the pack from
  `packs.js` by id and never reads an amount from the request body, so a
  tampered client cannot set its own price.
- **Session ids are validated** against `/^cs_(test|live)_[A-Za-z0-9]+$/`
  before being interpolated into a Stripe path (`claim.js:13`) — no path
  injection.
- **One source of truth for pricing.** `packs.js` is required by both the shop
  and the API, so the card label and the charge cannot drift.
- **The store fails closed.** With no key configured, `/api/status` reports
  `enabled: false` and the shop labels the packs unavailable instead of
  letting every purchase error out.
- **The patch pipeline is non-destructive.** `game-src/archive/` is treated as
  read-only and `game/archive/` is rebuilt from scratch each run, so a bad
  override is always one re-run from being undone.
- **The comments are genuinely good.** Most non-obvious decisions — the
  XHR shim for the dead Sheets API, the aspect-ratio clamp, why the claim mark
  lives on the PaymentIntent, why card payments never redirect — are explained
  where they are made.

---

## Suggested order

1. C1 — one-line move; the shop is unusable without it.
2. C2 — fill in the publishable keys; nothing can be sold until then.
3. H3 — stop dropping a possibly-paid session on a network error.
4. H1 and H2 — move `refresh_all()` off the per-frame path on both screens.
5. M1–M6 — the latent Lua crashes and the two off-by-ones.
6. M8, M9 — pin the origin, add a rate limit.
7. The Low list as hygiene passes.
