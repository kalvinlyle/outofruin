# Map

The region terrain paintings behind the map and dungeon screens, packed into
the `map` atlas by `game-src/assets/map.texturec`. Style: the region terrain
block in `ARTSTYLE.md`.

- `map_region-1.png` + `.meta` — region 1's terrain, 750×1334. The art is laid
  out around the six fixed marker positions the map screen draws on top of it,
  so the terrain under each marker matches the location it stands for; see the
  table in `gdd/` or `tools/pack_map_atlas.py` for the geometry.
- `_work/` — generation rounds and the unpacked atlas page (local only).

`python3 tools/pack_map_atlas.py` pastes `map_region-1.png` back into the
shipped atlas page, leaving the location icons alone; `tools/patch_game.py`
then rebuilds `game/archive`.
