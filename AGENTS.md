# AGENTS.md

## Project

Out of Ruin — a fantasy idle dungeon RPG by Mega Rune Entertainment, playable in the browser as a TypeScript and WebGL port of its Defold 1.2.167 HTML5 build with Stripe gold purchases, hosted on Vercel alongside its Bootstrap marketing site.

## Rules

- **Answer the literal question.** Respond only to what the user actually asked.
  Do not infer unstated intentions, anticipate follow-ups, or answer adjacent
  questions the user didn't raise. If the answer is one sentence, give one sentence.
- **Brevity over completeness.** Prefer the shortest correct answer. No preambles,
  no recaps, no summaries of what you're about to do. Skip context the user
  already knows.
- **When uncertain about depth, pick less.** If you're unsure how much detail
  the user wants, answer shorter, not longer. A follow-up question is cheap;
  re-reading a novel is not. Answer what was literally asked, stop, and let
  the user pull for more.
- **No contrast-padding tic.** Do not make a point and then restate it as the
  negation ("do X, not Y"; "it's A, not B"; "that's the point, the second
  sentence isn't"). Stating the point and then ruling out its opposite to
  manufacture contrast is filler that doubles the length and overstates the
  claim. Make the point once and stop.
- Read `PROJECT.md` for project context, structure, and project rules before making changes.
- **Documentation tiers.** Each doc changes only when its own layer of reality changes, never when a lower layer does:
  - `AGENTS.md` — agent behaviour only. Do not add project rules, architecture details, or content documentation here.
  - `PROJECT.md` — one-paragraph project identity: what it is, core loop, tech stack, high-level architecture. Never mechanics, numbers, rationale, open questions, or status tables — those belong in `gdd/`, `docs/`, `prd/`, or a `<folder>/README.md`.
  - `VERSIONS.md` — append-only changelog; see the Changelog rule below for format.
  - `<folder>/README.md` — what belongs in that folder / what doesn't, plus a one-line summary per doc or subfolder inside it. Changes only when the roster of files changes, not when a file's content changes.
  - Detailed documentation (mechanics, decisions, rationale) belongs in `/docs/` for external references like GCP or services, `/prd/` for websites, apps and pipelines, or `/gdd/` for game projects.
- After completing a significant task that modified the user experience or tech stack, update all affected documentation (`PROJECT.md`, design docs, etc.) to reflect the changes — and remove any now-superseded content from other docs. Documentation only grows if additions are never paired with deletions.
- **No invented authority.** This targets *agent-inferred creative/design claims* (e.g. a design rationale an agent wrote up as a "pillar" or "constitutional line") — never elevate one of those to "constitutional," "law," "golden rule," "holy," "forever," or "no exceptions" unless the user used equivalent absolute language themselves when stating it; default framing is "current direction — ask before crossing." This does **not** apply to rules the user actually wrote or approved as deliberately absolute — operational contracts, cross-project policies (e.g. art style consistency), or technical/architectural constraints (e.g. a locked stack, a module boundary). Those stay exactly as absolute as written; do not soften them. When genuinely unsure which category a rule falls into, ask rather than rewrite it either direction.
- **Follow a skill's prescribed method.** When a skill specifies *how* its work gets carried out — a parallel subagent fan-out, a research pipeline, a multi-phase sequence — that method is part of the instruction and is pre-authorised. Do not silently substitute a narrower, single-threaded version, and do not stop to ask permission for a step the skill already mandates. If a harness-level or session-level instruction appears to forbid something a skill requires, **name the conflict explicitly and let the user decide** — never quietly degrade the work and then present the result as complete.
- **Match the subagent model to the task's impact.** Every subagent launch picks its model and reasoning effort by how much the output matters, never by what it costs.
  - **Low-impact legwork** — file discovery, search, reading docs, summarising, lookups whose result you will check yourself — goes to a cheap fast model on low effort.
  - **High-impact research** — competitive analysis, market and player research, design teardowns, anything the user will make decisions from — goes to the latest frontier model on high effort.
  - **Coding, refactoring and debugging** go to the latest frontier model, on medium effort by default and high when the change is cross-cutting, subtle or architectural.
  - When unsure which tier a task is, treat it as high-impact.
  - **State the model and effort in the user-facing message that launches the subagent** (e.g. "researching competitors with the frontier model on high effort") so the user can see and correct the choice; for a fan-out, state it once for the batch.
- **Changelog:** Maintain `VERSIONS.md`, but only for **major updates** — meaningful milestones, not every task. Append one line per major update: `[category] Title | YYYY-MM-DD | <duration> — Description.` `<duration>` is wall-clock elapsed time from when the work started to when it landed (e.g. `4h`, `2d`) — required on every line; a missing duration is a hard fail, not optional detail. Categories: `feature`, `fix`, `asset`, `balance`, `ui`, `tool`, `refactor`, `site`, `skill`, `docs`. Place under the correct `## YYYY-MM-DD` date heading, newest entry first. Skip trivial fixes, one-off tweaks, and routine maintenance.
- **Asset management:** Follow the `managing-assets` skill (`~/.cursor/skills/managing-assets/`) for all asset naming, placement, and lifecycle decisions. All rules come from `config/asset-management.json`. Throwaway generations go in `_work/`, pipeline inputs in `source/`, soft-deletes in `_trash/`. Every final asset gets a `.meta` JSON sidecar.
- **Never use the built-in `GenerateImage` tool.** All image and asset generation — including quick concepts, mockups, and vis-dev explorations — goes through the `asset-creator` skill (`~/.cursor/skills/asset-creator/`, Scenario / GPT Image 2) so every output obeys `ARTSTYLE.md`, lands in the correct asset folder, and gets a `.meta` provenance sidecar. There is no exception for "it's just a concept."
- **Touch up approved art with a masked edit, never a regeneration.** When one feature of an approved generated image needs changing (a nose, an ear, a prop), edit that image with asset-creator `--reference` and a "change only X, keep everything else identical" prompt, then paste back only a feathered mask around X onto the original, and record the edit and mask in the `.meta` `processing` list. Regenerating from text redraws the whole picture. The user approved this exception to asset-creator's no-reference-editing rule for touch-ups in this project; new assets are still text-only.
- **Human-readable docs.** All markdown files must use line breaks, blank-line separators, and wrapped prose. Never emit a wall of text on a single line.
- **Never overwrite or delete asset files to fix build errors.** Build failures referencing missing assets are almost always path/config mismatches, not actually missing files. Verify the file exists on disk before concluding it is missing. If a file truly does not exist, ask the user before creating or replacing it.
- **No estimates.** Never state a *predictive* time/effort estimate (days, weeks, hours, story points, etc.) in responses. This does not apply to a retrospective actual (e.g. a duration already logged in `VERSIONS.md`), which is a record, not a prediction.
- **Update AGENTS.md when learning new behaviours.** When you discover a new pattern, convention, or constraint during a session (e.g. "always use this utility", "never call this API directly"), add it to the Rules section immediately so future sessions benefit.
- **Keep the Mac awake for long-running tasks.** Before starting a long run (multi-hour builds, pipelines, agent loops), run `sudo pmset -a disablesleep 1` so the machine doesn't sleep, even with the lid closed. When the run finishes, run `sudo pmset -a disablesleep 0` to restore normal sleep.
- **Art style is law.** Follow `ARTSTYLE.md` for all visual output — game assets, project pages, hero images, thumbnails, icons, everything. Use the correct surface-specific prompt block for the surface you're generating. No overrides, no exceptions, no improvised styles.
- **Mobile-first.** The goal is to run well on **as many phones as possible**, which means looking good at **both ends of the range** — crisp and generous on a current-generation flagship, readable and playable on a mid-tier phone that's three years old. Portrait touch is the default interaction model. In practice:
  - **Responsive, not fixed-pixel.** Scenes lay out in relative space (fractions of screen, safe-area-aware anchors, min/max touch-target budgets), never hard-coded pixel offsets. A layout that assumes a specific width is a bug.
  - **Scale up, not just down.** Extra screen real estate on a large / high-DPR device is used (bigger portraits, richer effects, higher particle counts, more ambient UI), not filled with stretched elements or empty margin. Shrinking the layout for small devices trims ambient detail before it touches gameplay-critical UI.
  - **Native pixel density.** The render buffer respects `window.devicePixelRatio` and paints at the device's physical resolution. Stretching / FIT-scaling a low-res virtual buffer onto a retina screen is the wrong default.
  - **Touch-primary input.** No hover states, no right-click, no precision-pointer UX. Minimum touch target ~44 CSS px; if hitting the smallest screen means smaller targets, the layout is wrong, not the screen.
  - **Performance budget.** 60 fps on the floor device (three-year-old mid-tier), with the extra headroom on flagships spent on visual polish — not on mechanics that only work above the floor. Asset sizes, draw-call counts, per-frame allocations, and texture memory all weighed against the floor.
  - Desktop / larger form factors are stretch targets, not drivers — the project must run there, but no design decision defaults to them.
- **No cache-buster URLs.** Never add `?v=N` to asset or page URLs. Serve locally with `tools/serve.py` (no-store) and reload in place.
- **One game server: `outofruin-game` on port 8016, serving `game/` from the repo.** Start it with `preview_start {name: "outofruin-game"}` and never add another port or a per-session test config: the user's save lives in 8016's localStorage, and a new port means a new, empty save. A build (`npm run build` in `port/`) is live on reload with no copying. For a private experiment, build into a gitignored subfolder of `game/` and open `http://localhost:8016/<folder>/` on the same server; it shares 8016's save, so leave it unchanged. The marketing site stays on 8008.
- **Never handle Stripe secret keys.** Do not read, type, store, or add secret or live keys anywhere; the user adds them with `vercel env add`. Publishable keys are public and may live in code.
- **Driving the game in a browser.** The game reads mouse events on its canvas, as Defold's HTML5 build did, so the browser tool's clicks reach it; synthetic `mousedown`/`mouseup` dispatched on the canvas work too. Hold a press for more than one frame: `gooey` needs the pressed state to survive a frame, and a hidden pane runs the page at about 1 fps, so a quick click can land entirely between frames.
- **A frozen canvas is usually a throttled page.** A hidden Browser pane backgrounds the page to roughly 1 fps. Sample `requestAnimationFrame` for a few seconds before suspecting the build.
- **`tools/repaint_atlas.py` addresses one frame of a flipbook as `coin_spin#3`.** A flipbook's frames share one size, so `@<size>` goes on every frame of it.
- **Layered art keeps the shipped footprint.** When the game draws one frame over another without moving it (loot over a chest, a burst over a box), new art for either must put its anchor exactly where the shipped frame did, in every state. Measure the shipped frame's anchor before generating, prompt for its view and proportions, and check the layers composited together before packing.
- **Atlas pages are premultiplied — pack them only through `tools/pack_atlas.py`.** Defold's GUI blends one / one-minus-source-alpha, so straight-alpha art pasted into a page shows a thin light outline round every cut-out, and so does any colour above alpha in a smaller mip. `pack_atlas.pack` enforces it (clamps RGB to alpha, box-filtered mips, lossless WebP) and `repaint_atlas` / `pack_items_atlas` premultiply new art as they draw it. Check every mip, not just the top one: the engine samples the small ones whenever an icon is drawn below its stored size.
- **Saved text may contain apostrophes.** `port/src/game/defsave/defsave.ts` escapes backslashes and quotes before writing a save into a JavaScript string; the shipped game did not, and any `'` in saved data broke the save. Keep that escape if defsave is touched again.
- **When the Browser pane is hidden or the session window is closed, the game draws nothing.** Its canvas stops rendering. To play-test, drive a headless Chromium through Playwright with a throwaway profile. Game `print` output is off unless the page URL has `?log`.
- **GUI scenes have no node limit in play.** The port grows a scene past Defold's 1024 nodes; the cap applies only under the parity harness, to match the Defold build. Mini-icon outlines are baked frames (`tools/bake_outlines.py`); re-run it after adding any `*_small` or `*_icon_small` frame.
- **Only play frames an atlas has.** `gui.play_flipbook` with a missing animation leaves the node without a valid frame. Only play frame names known to exist.
- **A full atlas page is cleared, not grown past 4096.** 4096 is the largest texture every phone's WebGL takes. When a page is full, remove frames nothing uses any more with `tools/remove_atlas_frames.py <atlas> <frame> ...` and add the new ones into the freed room.
- **Run `tools/patch_game.py` one at a time.** Every run writes the same `game-src/archive/_manifest.tmp`, so two at once (even with different `--out`) delete each other's and one fails or leaves a stale build.
- **Game code is TypeScript in `port/src/game/`.** The Lua it was translated from is retired (tag `defold-final` has it); never add Lua or edit `extracted/` expecting it to reach the game. Keep the translated code's Lua semantics: `port/TRANSLATING.md` lists the helpers (`t()`, `cat()`, `pairs`, `T.sort`, `M.random`) that the saves and the parity harness depend on.
- **Check changes against the Defold build with the parity harness.** `tools/port/parity/` replays scenarios on the port and on a worktree of `defold-final` (`git worktree add ../out-of-ruin-defold defold-final`). New features have no Defold counterpart, so only use it to check that untouched screens still match.

## Document Hierarchy

| Role | Document |
|---|---|
| Root behaviour guide | [AGENTS.md](./AGENTS.md) |
| Project overview | [PROJECT.md](./PROJECT.md) |
| Art style baseline | [ARTSTYLE.md](./ARTSTYLE.md) |
| Design docs | [gdd/README.md](./gdd/README.md) |
| Asset rules | [asset-management.json](./asset-management.json) |
| Recovered game source (local only, git-excluded) | [extracted/README.md](./extracted/README.md) |
| Change log | [VERSIONS.md](./VERSIONS.md) |
