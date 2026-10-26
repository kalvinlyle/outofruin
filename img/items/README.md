# img/items

Drop icons — the quest and loot items the dungeons pay out, from carrots and
turnips up to dragon eggs.

Every item ships **twice**, because one drawing cannot carry both jobs:

| File | Packed at | Drawn at | What it is |
|---|---|---|---|
| `items_<id>.png` | 224 px | the resource popup (256 units), the loot row (120) | The detailed icon. Full painted gradients, a glint, blocky texture dabs. |
| `items_<id>-small.png` | 128 px | the hire cost row (26 units), quest chips (65–80), the sell grid (65) | The same item redrawn down to a bold silhouette, two or three flat colours and a heavy dark rim, so it still reads at a couple of dozen pixels. |

`<id>` is the atlas frame name in kebab case — `rabbit_hide` is
`items_rabbit-hide.png`. The small file's name is the only difference between
the two, so the pair always sorts together.

`tools/pack_items_atlas.py` packs both sets into one 2048×2048
`items_drops` page and writes the matching texture set, giving every item a
`<id>` and an `<id>_small` flipbook frame. Nothing picks between them by
hand: `actions.set_item_icon` reads the node's drawn size and appends
`_small` under 96 units.

Add an item by dropping both PNGs here and re-running the packer. Removing
one breaks the pack — it refuses to run rather than ship a blank cell.

Working files live in `_work/`, soft-deletes in `_trash/`; neither is
committed. Every final PNG keeps its `.meta` provenance sidecar.
