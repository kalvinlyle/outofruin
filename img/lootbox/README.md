# img/lootbox

The reward chests (wood, banded and stone, plus the events' moon chest, each
drawn closed and open) and the four treasure piles drawn inside an open chest.

They are packed into the `lootbox` atlas, which the pack-opening screen and
the quest reward popup draw from (`<tier>_closed`, `<tier>_open`). The closed
chests are also packed small into the `main` atlas as `<tier>_icon`; the shop
button in the header uses `wood_icon`.

All eight share one footprint, the one the shipped wood chest used: drawn
straight from the front, with the top rim of the box's front face at y = 318
of a 512×512 cell, 442 px wide from x = 35 to 477. The opening screen lays
the loot pile and its burst over the chest without moving them, so a chest
off that footprint shows its loot outside the box.

- `lootbox_<tier>-<state>.png` + `.meta` — the finished 512×512 cells,
  already placed; the `.meta` holds the prompt and every processing step.
- `lootbox_loot-<n>.png` + `.meta` — the treasure piles `loot_1` (a low layer
  of coins) to `loot_4` (an overflowing heap), cut flat along the open
  chests' front rim at y = 326 and spanning the 370 px mouth, so each sits
  in the chest filled to the brim. openpack draws `loot_1`; the other three
  sizes are in the atlas but nothing picks them yet.
- `source/lootbox_v3_<tier>_green.png` — the green-screen generations, the
  closed chest above the open one so both states come from one drawing.
- `source/lootbox_v1_piles_green.png` — the four piles in one drawing, small
  to large, so they match.
- `_work/` — cut-outs and earlier rounds (local only).

Rebuild with `tools/place_chests.py` (cut-outs to placed cells), then
`tools/repaint_atlas.py lootbox <tier>_<state>=img/lootbox/lootbox_<tier>-<state>.png loot_<n>=img/lootbox/lootbox_loot-<n>.png ...`
and `tools/repaint_atlas.py main <tier>_icon=img/lootbox/lootbox_<tier>-closed.png ...`,
then `tools/patch_game.py`.
