# img/location

One icon per dungeon location — the five Region 1 dungeons and the Moonlit
Warren event location — drawn on the tab bar at the top of the dungeon
screen. Each is a tiny landmark vignette: the place reduced to the one
structure a player would name it by, sat on a wedge of its own ground.

They are packed into the `main` atlas as the `dungeon_*` frames that each
location's `Icon` in `game-src/data/Map.json` points at. The shipped frames
held pencil sketches, left unfinished when the game went out; `dungeon_warren`
is new, added for the event location, which until now borrowed the forest's.

| File | Frame | Location |
|---|---|---|
| `location_farm.png` | `dungeon_farm` | Local Farm |
| `location_desert-ruin.png` | `dungeon_desert` | Desert Ruin |
| `location_ancient-forest.png` | `dungeon_forest` | Ancient Forest |
| `location_mountain-ruin.png` | `dungeon_mountain` | Mountain Ruin |
| `location_abandoned-mine.png` | `dungeon_mine` | Abandoned Mine |
| `location_moonlit-warren.png` | `dungeon_warren` | Moonlit Warren (event) |

Each tab shows its icon in one of three states: full colour once the
location is unlocked, a greyed-out copy (`dungeon_*_grey`, in the `map`
atlas because `main` is full) while it is discovered but locked, and a flat
dark-grey silhouette of the colour frame before that, so no tab is blank.
The tab in focus is always tan.

The icon is drawn about 50 units across over a khaki or dark-grey tab, so
each one is a micro icon: one landmark, thick forms, a heavy rim, nothing
behind it. The six share a ground wedge of the same weight and the same
three-quarter view, so the row reads as one set.

- `location_<id>.png` + `.meta` — the finished cut-out at generation size;
  the `.meta` holds the prompt and every processing step.
- `source/location_v1_<id>_green.png` — the green-screen generations.
- `_work/` — cut-outs and earlier rounds (local only).

Rebuild with `tools/pack_location_icons.py`, which fits each cut-out into a
112 px box inside the frame's 128 px cell so the six sit at one scale, then
`tools/patch_game.py`.
