# Gear

Card art for the 45 pieces of henchmen upgrade equipment and the 27 pieces of
Night of the Wererabbit event gear (`gear_event-*`). The files in this
folder are the ones in the game, packed into `game-src/assets/items_gear.texturec`
by `tools/pack_gear_atlas.py`. Style: the equipment card block in `ARTSTYLE.md`.

Gear used to be drawn as small square item icons, half of them borrowed from
the `items_drops` drop sheet. Each piece is now a 2:3 portrait card staged in
its own dungeon level, the same register as the henchmen cards, and every entry
points at `items_gear` alone — `items_drops` is left to the loot and resource
screens.

- `gear_<slug>.png` + `.meta` — one card per gear entry, 832×1248; the `.meta`
  holds the exact prompt.
- `source/gear_descriptions.json` — each card's subject line, backdrop, atlas
  frame and its index into `Gear.json`.
- `source/items_gear.template.texturec` — the shipped atlas file, used as the
  container the rebuilt page is written into.
- `_work/` — generation rounds and the contact sheet (local only).

Rebuild with `tools/pack_gear_atlas.py` (page and frame rects) and
`tools/build_gear_data.py` (Gear.json), then `tools/patch_game.py`.
