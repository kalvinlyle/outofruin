"""Bake the mini-icon outline into "<frame>_outlined" frames.

    python3 tools/bake_outlines.py

actions.set_item_icon outlines every icon drawn at mini size. Drawn at run
time, an outline is 16 copies of the frame plus a face, 17 GUI nodes per icon,
and a scene holds 1024 at most, which the dungeon list's rows ran through. A
baked frame is the icon with the same white and black rings already round it,
drawn by one child node.

Each outlined frame is OUTLINE_SCALE times its source frame, with the art
centred at its original size, so a child sized OUTLINE_SCALE times the icon
node lays the art exactly over the icon. Rings match the run-time ones: black
reaching OUTLINE_WIDTH of the longer side out from the art, white twice that.

Frames are written to the atlas named in HOME. main has no free room, so its
icons are baked into items_drops, which every scene that draws them declares
as well. Frames that already have an outlined copy are skipped, so re-running
after adding icons only bakes the new ones.

It then writes the list of baked frames into game-src/lua/actions.lua, between
its BAKED_OUTLINES markers (the archive has no slot for a new module).
Playing a frame an atlas does not have is no Lua error in this engine: the node
keeps a bad frame index and the renderer aborts, so the game only plays a
baked frame that list names.
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pack_atlas
import repaint_atlas as R

# Must match OUTLINE_SCALE and OUTLINE_WIDTH in game-src/lua/actions.lua.
OUTLINE_SCALE = 1.25
OUTLINE_WIDTH = 0.05

# (atlas, frame filter) -> atlas the outlined frames live in
SOURCES = [
    ("henchmen_portraits", lambda f: f.endswith("_icon_small"), "henchmen_portraits"),
    ("items_drops", lambda f: f.endswith("_small"), "items_drops"),
    ("main", lambda f: f in ("pawn",), "items_drops"),
]


def frame_pixels(name):
    """{frame: straight-alpha RGBA image} for every single-image frame."""
    texture, anims, geoms, fi, tile, coords, dims = R.read_set(
        os.path.join(R.ASSETS, name + ".texturesetc"))
    png = os.path.join(tempfile.mkdtemp(), name + ".png")
    pack_atlas.unpack(os.path.join(R.ASSETS, name + ".texturec"), png)
    page = Image.open(png).convert("RGBA")
    W, H = page.size
    out = {}
    for a in anims:
        if a["end"] - a["start"] != 1:
            continue
        geom = geoms[fi[a["start"]]]
        cell = page.crop(R.rect_of(geom, W, H))
        cell = cell.transpose(Image.TRANSVERSE if R.is_rotated(geom) else Image.FLIP_TOP_BOTTOM)
        out[a["id"]] = unpremultiply(cell)
    return out


def unpremultiply(im):
    r, g, b, a = im.split()
    px_a = a.load()
    rgb = [c.copy() for c in (r, g, b)]
    loads = [c.load() for c in rgb]
    for y in range(im.height):
        for x in range(im.width):
            al = px_a[x, y]
            for p in loads:
                p[x, y] = min(255, p[x, y] * 255 // al) if al else 0
    return Image.merge("RGBA", rgb + [a])


def dilate(alpha, radius):
    """Alpha grown by a disc of `radius` pixels, with an anti-aliased rim."""
    out = Image.new("L", alpha.size, 0)
    reach = int(radius + 1)
    for dy in range(-reach, reach + 1):
        for dx in range(-reach, reach + 1):
            weight = min(1.0, max(0.0, radius + 0.5 - (dx * dx + dy * dy) ** 0.5))
            if weight <= 0:
                continue
            moved = ImageChops.offset(alpha, dx, dy)
            if weight < 1:
                moved = moved.point(lambda v: int(v * weight + 0.5))
            out = ImageChops.lighter(out, moved)
    return out


def outlined(art):
    w, h = art.size
    size = (round(w * OUTLINE_SCALE), round(h * OUTLINE_SCALE))
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.paste(art, ((size[0] - w) // 2, (size[1] - h) // 2))
    alpha = canvas.split()[3]
    ring = OUTLINE_WIDTH * max(w, h)
    white = Image.new("RGBA", size, (255, 255, 255, 0))
    white.putalpha(dilate(alpha, 2 * ring))
    black = Image.new("RGBA", size, (0, 0, 0, 0))
    black.putalpha(dilate(alpha, ring))
    return Image.alpha_composite(Image.alpha_composite(white, black), canvas)


def main():
    work = tempfile.mkdtemp()
    jobs = {}
    for source, wanted, home in SOURCES:
        _, home_anims, *_ = R.read_set(os.path.join(R.ASSETS, home + ".texturesetc"))
        have = {a["id"] for a in home_anims}
        for frame, art in sorted(frame_pixels(source).items()):
            target = frame + "_outlined"
            if not wanted(frame) or target in have:
                continue
            png = os.path.join(work, target + ".png")
            image = outlined(art)
            image.save(png)
            jobs.setdefault(home, []).append("%s=%s@%dx%d" % (target, png, image.width, image.height))
    for home, args in jobs.items():
        subprocess.check_call([sys.executable, os.path.join(os.path.dirname(__file__), "add_atlas_frames.py"), home] + args)
    if not jobs:
        print("every outlined frame is already baked")
    write_list()


def write_list():
    lines = []
    for home in sorted({home for _, _, home in SOURCES}):
        _, anims, *_ = R.read_set(os.path.join(R.ASSETS, home + ".texturesetc"))
        frames = sorted(a["id"] for a in anims if a["id"].endswith("_outlined"))
        lines.append("  %s = {" % home)
        lines += ['    ["%s"] = true,' % f for f in frames]
        lines.append("  },")
    path = os.path.join(R.ROOT, "game-src", "lua", "actions.lua")
    text = open(path).read()
    start = text.index(BEGIN) + len(BEGIN)
    end = text.index(END)
    text = text[:start] + "\nlocal BAKED_OUTLINES = {\n" + "\n".join(lines) + "\n}\n" + text[end:]
    open(path, "w").write(text)
    print("listed the baked frames in %s" % path)


BEGIN = "-- BAKED_OUTLINES: written by tools/bake_outlines.py"
END = "-- END BAKED_OUTLINES"


if __name__ == "__main__":
    main()
