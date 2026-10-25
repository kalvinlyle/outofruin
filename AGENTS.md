# AGENTS.md

## Project

Out of Ruin — a fantasy idle dungeon RPG by Mega Rune Entertainment, playable in the browser as a Defold 1.2.167 HTML5 build with Stripe gold purchases, hosted on Vercel alongside its Bootstrap marketing site.

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
- **Test on a separate origin.** Browser tests of the game run on their own port or origin (e.g. the `outofruin-test` launch config) so the user's own save in localStorage is never touched.
- **Never handle Stripe secret keys.** Do not read, type, store, or add secret or live keys anywhere; the user adds them with `vercel env add`. Publishable keys are public and may live in code.
- **Driving the game in a browser.** Defold ignores the browser tool's clicks; dispatch synthetic `mousedown`/`mouseup` events on the canvas instead, with a longer hold when the pane is hidden.

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
