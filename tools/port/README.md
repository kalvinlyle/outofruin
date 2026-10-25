# tools/port

Tools for the HTML/WebGL port of the Defold game.

`export_assets.py` reads the Defold archive in `game/archive/` and writes
everything the port runtime needs to `game/port/assets/`.

```
python3 tools/port/export_assets.py [--archive DIR] [--out DIR]
```

It needs Python 3 and Pillow.
The output folder is rebuilt from scratch on every run, and the output is deterministic.
Resources are decoded by field number with the Defold 1.2.167 schemas.
Absent fields get the default the proto declares (absent vectors become all-zero, absent quats `[0,0,0,1]`).
Vectors are arrays: `Vector4`/`Quat` → `[x,y,z,w]`, `Point3`/`Vector3` → `[x,y,z]`.
Every enum field `f` is written as the number `f` plus its name `f_name`.
Fields not in the schema would appear under `_unknown`; none exist in the current archive.
Paths below are the archive resource path without its leading slash and compiled extension.

## scenes/&lt;path&gt;.json

One per `.guic`: the full `SceneDesc`.
`fonts`, `textures`, `spine_scenes` and `particlefxs` are name → resource maps, and `layers` is a list of names.
`nodes` holds every `NodeDesc` field in proto order, with defaults applied.
`_present` lists the fields actually on the wire.
`layouts[].nodes` are the per-layout node overrides; apply only their `overridden_fields`.
`node_count` is the raw count of node fields.

## textures/&lt;path&gt;.webp, .mip&lt;N&gt;.webp, .json

Mip 0 is `<path>.webp` and mip N is `<path>.mip<N>.webp`.
All are lossless WebP saved with exact RGB, holding the decoded pixels unchanged (premultiplied alpha).
Row 0 is the bottom of the art (GL order), so upload without `UNPACK_FLIP_Y`, with `premultiplyAlpha: none` and no colour-space conversion.
The JSON holds the `TextureImage` fields.
Each mip records its size, offset, uncompressed and compressed size, source encoding and source sha256.

## atlases/&lt;path&gt;.json

One per `.texturesetc`, holding all `TextureSet` fields.
`tex_coords` (8 floats per frame) and `tex_dims` are given raw.
`frames[i]` adds `tc`, `corners` (4 UV pairs), `uv_rotated` (the engine test `tc[0]!=tc[2] && tc[3]!=tc[5]`), the UV bounds `u0 v0 u1 v1`, `px` (x, y, w, h in stored-image pixels), and `geometry_index` from `frame_indices`.
`animations[]` adds `frames` (`start..end-1`), and `animation_index` maps each id to its animation.

## fonts/&lt;path&gt;.json + .png

All `FontMap` fields, except that `glyph_data` is replaced by its size and hash.
Each glyph's data starts with one header byte: 1 means WebP-compressed (decoded here), 0 means raw.
`ascent` and `descent` are signed; the wire values are uint32 and kept as `*_raw`.
The PNG is the glyph cache as `font_renderer.cpp` fills it, with every width > 0 glyph placed in glyph-list order.
The PNG is luminance when `glyph_channels` is 1.
Glyph cell `c` sits at `(c % cols * cell_w, c / cols * cell_h + cache_cell_max_ascent - ascent)`.
`bitmap_rect` is each glyph's raw bitmap (`width+2p` × `ascent+descent+2p`), so a runtime can build its own cache.

## shaders/ and materials/&lt;path&gt;.json

`shaders/<path>.vp|.fp` hold the GLSL source.
The material JSON holds `MaterialDesc` with its tags, constants and samplers, plus each shader's file, uniforms and attributes.

## render.json

This file holds the render prototype, the render script Lua source, and the display profiles.
It also holds `game_project` (the archive's `game.projectc`, parsed and as raw text).
`game_project_original` is the untouched `game-src` copy, included only when it differs.

## collection.json

`collections` holds the decoded `CollectionDesc`, and `game_objects` holds each `.goc` `PrototypeDesc`.
`gui_components` is a flat list in collection order, giving the instance, game object, component id, component resource and positions.

## input_binding.json, data/, lua/

`input_binding.json` is the decoded `InputBinding`.
`data/*.json` are copied verbatim from the archive.
`lua/` holds the source of every `.luac`, `.gui_scriptc`, `.scriptc` and `.render_scriptc`.
`lua/index.json` gives each module's file, required modules, resources and property declarations.

## manifest.json

`manifest.json` lists every exported file with its size and sha256, and notes skipped resources (`default.gamepadsc`).
