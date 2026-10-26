"""Pack the live events' art into the game's atlases.

    python3 tools/pack_event_atlases.py              # the Wererabbit
    python3 tools/pack_event_atlases.py SALTTIDE     # later events, by key

Night of the Wererabbit has art of its own for everything it shows: drop
icons in `items_drops`, henchmen cards and cost-row icons in
`henchmen_portraits`, its quest-giver in `npc_portraits`, and its map painting
and location icons in `map`. Pages that have no room are grown first with
tools/grow_atlas.py; frames already there are repainted rather than added, so
this can be run again after any art changes.

The later events are packed the same way from tools/event_content.py, plus
their chests into `lootbox` (cells laid by tools/place_chests.py), their
chapter books into `items_drops` and their gear into `items_gear` (merged into
img/gear/source/gear_descriptions.json and packed by tools/pack_gear_atlas.py).
Run tools/bake_outlines.py afterwards for their small icons.
"""
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import repaint_atlas as R
import event_content
import enemy_event_content

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "img")

# Resources.json frame -> img/items file key; each gets <frame> and <frame>_small.
ITEMS = {
    "moon_carrot": "moon-carrot", "moon_clover": "moon-clover", "glow_worm": "glow-worm",
    "gnawed_root": "gnawed-root", "paper_lantern": "paper-lantern", "silver_fur": "silver-fur",
    "moon_reed": "moon-reed", "snail_shell": "snail-shell", "moon_lily": "moon-lily",
    "moonwater": "moonwater", "sunken_bell": "sunken-bell", "glowcap": "glowcap",
    "rune_pebble": "rune-pebble", "thistle": "thistle", "bramble_berry": "bramble-berry",
    "golden_acorn": "golden-acorn", "moon_shard": "moon-shard",
}
# Henchmen.json art key -> img/henchmen file key.
HENCHMEN = {
    "carrot_smuggler": "carrot-smuggler", "lantern_bearer": "lantern-bearer",
    "burrow_digger": "burrow-digger", "reed_cutter": "reed-cutter", "moon_howler": "moon-howler",
    "bell_diver": "bell-diver", "stone_whisperer": "stone-whisperer",
    "bramble_knight": "bramble-knight", "wererabbit_envoy": "wererabbit-envoy",
}
CARD = (128, 192)
MAP_FRAME = "map_weremoon"
MAP_ART = os.path.join(IMG, "map", "map_moonlit-warren.png")
MAP_SIZE = (750, 1334)
# A page grows to this when its new frames don't fit.
GROW = {"henchmen_portraits": (2048, 2048), "map": (4096, 4096), "items_drops": (4096, 4096),
        "npc_portraits": (1024, 1024), "reward_icons": (512, 512), "lootbox": (2048, 4096)}


def tool(script, *args):
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", script)] + list(args), check=True)


def frames(atlas):
    return {a["id"] for a in R.read_set(os.path.join(R.ASSETS, atlas + ".texturesetc"))[1]}


def page_size(atlas):
    with open(os.path.join(R.ASSETS, atlas + ".texturec"), "rb") as f:
        import pack_atlas
        _, items = pack_atlas.image_of(f.read())
    return pack_atlas.mips(items)[:2]


def pack(atlas, jobs):
    """jobs: (frame, png, (w, h)). Adds the missing frames, growing the page
    once if they do not fit, and repaints the rest."""
    have = frames(atlas)
    add = ["%s=%s@%dx%d" % (f, p, w, h) for f, p, (w, h) in jobs if f not in have]
    again = ["%s=%s" % (f, p) for f, p, _ in jobs if f in have]
    if add:
        try:
            tool("add_atlas_frames.py", atlas, *add)
        except subprocess.CalledProcessError:
            W, H = GROW[atlas]
            if page_size(atlas) == (W, H):
                raise
            tool("grow_atlas.py", atlas, str(W), str(H))
            tool("add_atlas_frames.py", atlas, *add)
    if again:
        tool("repaint_atlas.py", atlas, *again)


def add_painting(frame, png):
    """A map painting, on its side like the shipped one; repainted in place if
    it is already packed."""
    if Image.open(png).size != MAP_SIZE:
        sys.exit("%s must be %dx%d" % ((png,) + MAP_SIZE))
    if frame in frames("map"):
        work = tempfile.mkdtemp()
        turned = os.path.join(work, frame + ".png")
        Image.open(png).convert("RGBA").transpose(Image.TRANSVERSE).save(turned)
        tool("repaint_atlas.py", "map", "%s=%s" % (frame, turned))
        return
    try:
        add_rotated_like("map", frame, png, "map")
    except subprocess.CalledProcessError:
        if page_size("map") == GROW["map"]:
            raise
        tool("grow_atlas.py", "map", *[str(n) for n in GROW["map"]])
        add_rotated_like("map", frame, png, "map")


def card(src, work):
    """A henchman card resized to exactly fill its frame, so it is pasted as is
    rather than trimmed and inset like an icon."""
    out = os.path.join(work, os.path.basename(src))
    Image.open(src).convert("RGBA").resize(CARD, Image.LANCZOS).save(out)
    return out


def add_rotated_like(atlas, frame, png, like):
    """Add `png` as a frame stored a quarter turn round, the way the shipped
    `like` frame is: a full map painting only fits the page on its side.

    The frame is first added upright at the turned size, which finds it room
    and gives it its slots; its geometry is then replaced by `like`'s, mapped
    onto the new rectangle, so the corners come out in the turned order the
    engine already reads for `like`."""
    import struct
    import pack_atlas
    import pack_items_atlas as P
    art = Image.open(png).convert("RGBA")
    blank = os.path.join(tempfile.mkdtemp(), frame + ".png")
    Image.new("RGBA", (art.height, art.width), (0, 0, 0, 0)).save(blank)
    tool("add_atlas_frames.py", atlas, "%s=%s@%dx%d" % (frame, blank, art.height, art.width))

    tc = os.path.join(R.ASSETS, atlas + ".texturec")
    ts = os.path.join(R.ASSETS, atlas + ".texturesetc")
    texture, anims, geoms, fi, tile, coords, dims = R.read_set(ts)
    page_png = os.path.join(tempfile.mkdtemp(), atlas + ".png")
    pack_atlas.unpack(tc, page_png)
    page = Image.open(page_png).convert("RGBA")
    W, H = page.size
    by_id = {a["id"]: a for a in anims}
    gi, ri = fi[by_id[frame]["start"]], fi[by_id[like]["start"]]
    nx0, ny0, nx1, ny1 = R.rect_of(geoms[gi], W, H)
    rx0, ry0, rx1, ry1 = R.rect_of(geoms[ri], W, H)
    if (nx1 - nx0, ny1 - ny0) != (rx1 - rx0, ry1 - ry0):
        sys.exit("%s is not the size of %s" % (frame, like))

    def remap(vals):
        out = []
        for i, v in enumerate(vals):
            if i % 2 == 0:
                out.append((nx0 + (v * W - rx0)) / W)
            else:
                out.append((ny0 + (v * H - ry0)) / H)
        return out

    items = []
    for f, w, x in geoms[ri]:
        items.append((f, w, x))
    uv = remap(R.uvs_of_geom(geoms[ri]))
    k = 0
    new_geom = []
    for f, w, x in items:
        if f == 4:
            new_geom.append((f, w, bytearray(struct.pack("<f", uv[k]))))
            k += 1
        else:
            new_geom.append((f, w, x))
    geoms[gi] = new_geom
    coords, dims = bytearray(coords), bytearray(dims)
    ref_slot = list(fi).index(ri)
    ref_uv = remap(struct.unpack("<8f", coords[ref_slot * 32:(ref_slot + 1) * 32]))
    for i, g in enumerate(fi):
        if g == gi:
            coords[i * 32:(i + 1) * 32] = struct.pack("<8f", *ref_uv)
            dims[i * 8:(i + 1) * 8] = dims[ref_slot * 8:(ref_slot + 1) * 8]
    by_id[frame]["w"], by_id[frame]["h"] = by_id[like]["w"], by_id[like]["h"]

    page.paste(pack_atlas.premultiply(art).transpose(Image.TRANSVERSE), (nx0, ny0))
    page.save(page_png)
    pack_atlas.pack(tc, page_png, tc)
    open(ts, "wb").write(R.rebuild_set(texture, anims, geoms, fi, tile, bytes(coords), bytes(dims), W, H, {}))
    print("  %-30s added on its side at %d,%d" % (frame, nx0, ny0))


def pack_event(event):
    work = tempfile.mkdtemp()
    key = event["key"].lower()
    items, hench = [], []
    for name, drops, h in event["levels"]:
        for d in drops:
            items.append((d["frame"], os.path.join(IMG, "items", "items_%s.png" % d["art"]), (224, 224)))
            items.append((d["frame"] + "_small", os.path.join(IMG, "items", "items_%s-small.png" % d["art"]), (128, 128)))
        art, f = h["art"], h["file"]
        hench.append(("event_" + art, card(os.path.join(IMG, "henchmen", "henchmen_%s.png" % f), work), CARD))
        hench.append((art + "_icon", os.path.join(IMG, "henchmen", "henchmen_%s-icon.png" % f), (128, 128)))
        hench.append((art + "_icon_small", os.path.join(IMG, "henchmen", "henchmen_%s-icon-small.png" % f), (64, 64)))
    items.append((event["book"], os.path.join(IMG, "ui", "ui_chapter-book-%s-slice9.png" % event["book_art"]), (100, 132)))
    pack("items_drops", items)
    pack("henchmen_portraits", hench)
    pack("npc_portraits", [("npc_" + event["npc"], os.path.join(IMG, "npc", "npc_%s.png" % event["npc"].lower()), (256, 256))])
    xp = [d for d in event["levels"][-1][1] if d["id"] == event["xp"]][0]
    pack("reward_icons", [("reward_%s_icon" % event["xp"], os.path.join(IMG, "items", "items_%s.png" % xp["art"]), (128, 128))])
    add_painting(event["map_frame"], os.path.join(IMG, "map", "map_%s.png" % event["map_art"]))
    tool("pack_location_icons.py", *[loc["art"] for loc in event["locations"]])
    chest = event["chest"]
    tool("place_chests.py", chest)
    pack("lootbox", [("%s_%s" % (chest, state), os.path.join(IMG, "lootbox", "lootbox_%s-%s.png" % (chest, state)), (512, 512))
                     for state in ("closed", "open")])
    merge_gear(event)
    print(key, "packed")


def merge_gear(event):
    """Puts the event's gear into gear_descriptions.json in Gear.json's order."""
    path = os.path.join(IMG, "gear", "source", "gear_descriptions.json")
    data = json.load(open(path))
    mine = json.load(open(os.path.join(IMG, "gear", "_work", "%s_gear_descriptions.json" % event["key"].lower())))
    slugs = [g["slug"] for pieces in event["gear"] for g in pieces]
    by_slug = {c["slug"]: c for c in (mine.get("event_cards") or mine.get("cards") or [])}
    missing = [s for s in slugs if s not in by_slug or not os.path.exists(os.path.join(IMG, "gear", "gear_%s.png" % s))]
    if missing:
        sys.exit("gear art or descriptions missing: %s" % ", ".join(missing))
    keep = [c for c in data["event_cards"] if c["slug"] not in by_slug]
    data["event_cards"] = keep + [by_slug[s] for s in slugs]
    if mine.get("backdrops"):
        data["backdrops"].update(mine["backdrops"]) if isinstance(data["backdrops"], dict) else data["backdrops"].extend(mine["backdrops"])
    json.dump(data, open(path, "w"), indent=1, ensure_ascii=False)


def pack_enemy_event(event):
    """An enemy event (tools/enemy_event_content.py): its enemies' cards in
    henchmen_portraits as enemy_<art>, the rest as a later event's."""
    work = tempfile.mkdtemp()
    items, cards, seen = [], [], set()
    for rows in event["rows"]:
        for enemy, drops in rows:
            cards.append(("enemy_" + enemy["art"], card(os.path.join(IMG, "henchmen", "henchmen_enemy-%s.png" % enemy["file"]), work), CARD))
            for d in drops:
                if d["frame"] in seen:
                    continue
                seen.add(d["frame"])
                items.append((d["frame"], os.path.join(IMG, "items", "items_%s.png" % d["art"]), (224, 224)))
                items.append((d["frame"] + "_small", os.path.join(IMG, "items", "items_%s-small.png" % d["art"]), (128, 128)))
    items.append((event["book"], os.path.join(IMG, "ui", "ui_chapter-book-%s-slice9.png" % event["book_art"]), (100, 132)))
    pack("items_drops", items)
    pack("henchmen_portraits", cards)
    pack("npc_portraits", [("npc_" + event["npc"], os.path.join(IMG, "npc", "npc_%s.png" % event["npc"].lower()), (256, 256))])
    # The XP star in the event's colour, from tools/tint_xp_star.py.
    pack("reward_icons", [("reward_%s_icon" % event["xp"], os.path.join(IMG, "ui", "ui_reward-%s-icon.png" % event["xp"]), (128, 128))])
    add_painting(event["map_frame"], os.path.join(IMG, "map", "map_%s.png" % event["map_art"]))
    tool("pack_location_icons.py", *[loc["art"] for loc in event["locations"]])
    chest = event["chest"]
    tool("place_chests.py", chest)
    pack("lootbox", [("%s_%s" % (chest, state), os.path.join(IMG, "lootbox", "lootbox_%s-%s.png" % (chest, state)), (512, 512))
                     for state in ("closed", "open")])
    merge_gear(event)
    print(event["key"].lower(), "packed")


def main():
    keys = sys.argv[1:]
    if keys:
        for key in keys:
            enemy = [e for e in enemy_event_content.EVENTS if e["key"] == key]
            if enemy:
                pack_enemy_event(enemy[0])
                continue
            event = event_content.by_key(key)
            if not event or "levels" not in event:
                sys.exit("no later event %s" % key)
            pack_event(event)
        tool("pack_gear_atlas.py")
        return
    work = tempfile.mkdtemp()
    items = []
    for frame, key in ITEMS.items():
        items.append((frame, os.path.join(IMG, "items", "items_%s.png" % key), (224, 224)))
        items.append((frame + "_small", os.path.join(IMG, "items", "items_%s-small.png" % key), (128, 128)))
    pack("items_drops", items)

    hench = []
    for art, key in HENCHMEN.items():
        hench.append(("event_" + art, card(os.path.join(IMG, "henchmen", "henchmen_%s.png" % key), work), CARD))
        hench.append((art + "_icon", os.path.join(IMG, "henchmen", "henchmen_%s-icon.png" % key), (128, 128)))
        hench.append((art + "_icon_small", os.path.join(IMG, "henchmen", "henchmen_%s-icon-small.png" % key), (64, 64)))
    pack("henchmen_portraits", hench)

    pack("npc_portraits", [("npc_Hazel", os.path.join(IMG, "npc", "npc_hazel.png"), (256, 256))])

    # Quest rewards are drawn from reward_icons, which every quest screen
    # loads; drop icons are not, so the shard a quest pays has a copy here.
    pack("reward_icons", [("reward_moonshard_icon", os.path.join(IMG, "items", "items_moon-shard.png"), (128, 128))])

    if Image.open(MAP_ART).size != MAP_SIZE:
        sys.exit("%s must be %dx%d" % ((MAP_ART,) + MAP_SIZE))
    if MAP_FRAME in frames("map"):
        sys.exit("%s is already packed; repaint it the way tools/pack_map_atlas.py does" % MAP_FRAME)
    if page_size("map") != GROW["map"]:
        tool("grow_atlas.py", "map", *[str(n) for n in GROW["map"]])
    add_rotated_like("map", MAP_FRAME, MAP_ART, "map")
    tool("pack_location_icons.py", "silver-mere", "wererabbit-court")
    print("event art packed")


if __name__ == "__main__":
    main()
