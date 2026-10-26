"""Fit the location cut-outs into the `main` atlas's `dungeon_*` frames.

    python3 tools/pack_location_icons.py [<id> ...]

Each `img/location/location_<id>.png` is a full-size transparent cut-out of one
dungeon location. The tool trims it, clears the green the cut left along its
edge, scales the landmark into a 112 px box and centres that in the frame's
128 px cell, so the icons sit at one scale however tall or wide their landmarks
are — the atlas cell is square but a barn and a pair of peaks are not, and
letting each fill the cell on its own would draw them at different weights
along the tab bar.

The cells go into the `main` frames the dungeon screen reads from
`Map.json`, with tools/repaint_atlas.py. Each location also gets a
`<frame>_grey` copy, drawn in greys, which the tab shows while the location is
discovered but still locked. `main` has no room left for six more cells, so
the grey ones go into the `map` atlas, which the dungeon screen also loads and
which is mostly empty beside its terrain painting. `dungeon_warren`, the
Moonlit Warren event location, and every `_grey` frame have no shipped frame,
so they are added with tools/add_atlas_frames.py the first time this runs.
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import repaint_atlas as R

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "img", "location")
ATLAS = "main"       # the colour icons, where Map.json points
GREY_ATLAS = "map"   # the greyed-out copies
CELL = 128     # the frame's square on the atlas page
BOX = 112      # the landmark's box inside it, leaving a gutter all round

FRAMES = [
    ("farm", "dungeon_farm"),
    ("desert-ruin", "dungeon_desert"),
    ("ancient-forest", "dungeon_forest"),
    ("mountain-ruin", "dungeon_mountain"),
    ("abandoned-mine", "dungeon_mine"),
    ("moonlit-warren", "dungeon_warren"),
    # The event's later locations came after `main` filled up, so their colour
    # icons live in `map` beside the greys; Map.json points there.
    ("silver-mere", "dungeon_silvermere", GREY_ATLAS),
    ("wererabbit-court", "dungeon_court", GREY_ATLAS),
]
# Every later event's locations, all in `map` too.
import event_content
FRAMES += [(loc["art"], loc["icon"], GREY_ATLAS)
           for event in event_content.EVENTS for loc in event.get("locations", [])]
# And the enemy events'.
import enemy_event_content
FRAMES += [(loc["art"], loc["icon"], GREY_ATLAS)
           for event in enemy_event_content.EVENTS for loc in event["locations"]]


def despill(im):
    """Pull the chroma green out of the soft pixels at the cut edge.

    The icons have real green in them — grass, a canopy — so only the partly
    transparent rim is touched; a fully opaque pixel keeps the colour it was
    painted."""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 250 and g > max(r, b):
                px[x, y] = (r, max(r, b), b, a)
    return im


def cell(path):
    """The cut-out as a finished CELLxCELL frame."""
    im = Image.open(path).convert("RGBA")
    im = despill(im.crop(im.getbbox() or (0, 0, im.width, im.height)))
    scale = BOX / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * scale)),
                    max(1, round(im.height * scale))), Image.LANCZOS)
    out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    out.paste(im, ((CELL - im.width) // 2, (CELL - im.height) // 2))
    return out


def greyed(im):
    """The same cell in greys, a little flattened toward the tab's grey so a
    locked location reads as not yet open without losing its silhouette."""
    r, g, b, a = im.split()
    lum = Image.merge("RGB", (r, g, b)).convert("L")
    lum = lum.point(lambda v: round(v * 0.7 + 110 * 0.3))
    return Image.merge("RGBA", (lum, lum, lum, a))


def existing_frames(atlas):
    ts = os.path.join(R.ASSETS, atlas + ".texturesetc")
    return {a["id"] for a in R.read_set(ts)[1]}


def run(script, atlas, args):
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", script), atlas]
                   + args, check=True)


def main():
    wanted = sys.argv[1:]
    jobs = [(f[0], f[1], f[2] if len(f) > 2 else ATLAS) for f in FRAMES if not wanted or f[0] in wanted]
    if not jobs:
        sys.exit("no location matches %s" % " ".join(wanted))

    work = tempfile.mkdtemp()
    have = {a: existing_frames(a) for a in (ATLAS, GREY_ATLAS)}
    add = {ATLAS: [], GREY_ATLAS: []}
    repaint = {ATLAS: [], GREY_ATLAS: []}
    for ident, frame, colour_atlas in jobs:
        art = os.path.join(ART, "location_%s.png" % ident)
        if not os.path.exists(art):
            sys.exit("missing %s" % art)
        colour = cell(art)
        for atlas, name, im in ((colour_atlas, frame, colour),
                                (GREY_ATLAS, frame + "_grey", greyed(colour))):
            png = os.path.join(work, name + ".png")
            im.save(png)
            if name in have[atlas]:
                repaint[atlas].append("%s=%s" % (name, png))
            else:
                add[atlas].append("%s=%s@%d" % (name, png, CELL))

    # New frames first: adding images renumbers every animation's frame slots,
    # so a repaint has to read the set back afterwards, not before.
    for atlas in (ATLAS, GREY_ATLAS):
        if add[atlas]:
            run("add_atlas_frames.py", atlas, add[atlas])
        if repaint[atlas]:
            run("repaint_atlas.py", atlas, repaint[atlas])


if __name__ == "__main__":
    main()
