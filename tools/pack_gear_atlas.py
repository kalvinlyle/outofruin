"""Build the items_gear atlas from the gear card art in img/gear/.

    python3 tools/pack_gear_atlas.py

Reads one card per entry in img/gear/source/gear_descriptions.json -- the
shipped gear under "cards", then the live-event gear under "event_cards" --
lays them out on a page 2048 wide as a grid of 2:3 portrait cells, and writes
both halves of the atlas into game-src/assets/:

    items_gear.texturec     the page pixels, via tools/pack_atlas.py
    items_gear.texturesetc  the frame rects, rewritten from scratch

The page pixels go into a copy of the shipped .texturec, kept as
img/gear/source/items_gear.template.texturec, so the output keeps the format,
flags and field order the engine was built against.

The shipped atlas held 63 square 256x256 item icons. Nothing but Gear.json
references `items_gear`, so the frame names, count and shape are ours to
choose; `--check` prints the layout without writing anything.

The page is 2048 wide (9 columns) and as tall as the rows need, rounded up to
a power of two: 2048 holds 54 cards, 4096 holds 108. Past that it goes 4096
wide (18 columns), which holds 216. The template is 2048x2048,
so a taller page has its size fields and mip list rewritten the way
tools/grow_atlas.py does before the pixels are packed in. Defold stores textures
bottom-up, so the page is composed top-down here and flipped on the way out, and
the v coordinate of a cell at image row y is 1 - y/PAGE_H.

TextureSet layout, as the shipped files use it, for N frames:

    1   texture path
    2   N animations {id, width, height, start, end, 0, 0, 0, 0}
    6   N, the geometry count
    18  tex_coords: 2N quads of 8 floats -- the geometry quads, then the
        frame quads, which are the same quads again
    19  tex_dims: 2N pairs of (width, height)
    20  N geometries {width, height, 8 vertex floats, 8 uv floats, 6 indices}
    21  0, use_geometries
    22  2N frame indices: 0..N-1 twice

An animation's `start` indexes the frame half of tex_coords, so it is N + i.
"""
import json
import os
import shutil
import struct
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS = os.path.join(ROOT, "img", "gear")
DESCRIPTIONS = os.path.join(CARDS, "source", "gear_descriptions.json")
TEMPLATE = os.path.join(CARDS, "source", "items_gear.template.texturec")
OUT_DIR = os.path.join(ROOT, "game-src", "assets")

PAGE = 2048                 # page width, set by main() from the card count
PAGE_H = PAGE               # page height, likewise
CELL_W, CELL_H = 224, 336   # 2:3, and 9 columns of them fit 2048
COLS = PAGE // CELL_W
MAX_SIDE = 4096             # the largest texture a phone's WebGL is sure to take


def page_size(n):
    """The smallest power-of-two page that holds n cards: 2048 wide and as tall
    as needed up to MAX_SIDE, then twice as wide."""
    w = 2048
    while True:
        rows = -(-n // (w // CELL_W))
        h = 2048
        while h // CELL_H < rows and h < MAX_SIDE:
            h *= 2
        if h // CELL_H >= rows:
            return w, h
        if w >= MAX_SIDE:
            sys.exit("%d cards do not fit a %dx%d page" % (n, MAX_SIDE, MAX_SIDE))
        w *= 2


def varint(n):
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def tag(fn, wt):
    return varint((fn << 3) | wt)


def msg(fn, payload):
    return tag(fn, 2) + varint(len(payload)) + payload


def uint(fn, value):
    return tag(fn, 0) + varint(value)


def cell(index):
    """Pixel rect of a frame, in top-down image coordinates."""
    col, row = index % COLS, index // COLS
    if row >= PAGE_H // CELL_H:
        sys.exit("the page holds %d cells, frame %d does not fit"
                 % (COLS * (PAGE_H // CELL_H), index))
    return col * CELL_W, row * CELL_H, CELL_W, CELL_H


def quad(index):
    """The frame's 4 uv pairs, in the vertex order Defold writes them."""
    x, y, w, h = cell(index)
    u0, u1 = x / PAGE, (x + w) / PAGE
    vt, vb = 1 - y / PAGE_H, 1 - (y + h) / PAGE_H
    return [u0, vb, u0, vt, u1, vt, u1, vb]


def geometry(index):
    verts = [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5]
    body = uint(1, CELL_W) + uint(2, CELL_H)
    body += b"".join(tag(3, 5) + struct.pack("<f", v) for v in verts)
    body += b"".join(tag(4, 5) + struct.pack("<f", v) for v in quad(index))
    body += b"".join(uint(5, i) for i in (0, 1, 2, 0, 2, 3))
    return msg(20, body)


def animation(name, index, count):
    body = msg(1, name.encode()) + uint(2, CELL_W) + uint(3, CELL_H)
    body += uint(4, count + index) + uint(5, count + index + 1)
    body += uint(6, 0) + uint(7, 0) + uint(8, 0) + uint(9, 0)
    return msg(2, body)


def textureset(frames):
    n = len(frames)
    out = bytearray(msg(1, b"/assets/items_gear.texturec"))
    for i, name in enumerate(frames):
        out += animation(name, i, n)
    out += uint(6, n)
    quads = [quad(i) for i in range(n)]
    out += msg(18, b"".join(struct.pack("<8f", *q) for q in quads + quads))
    out += msg(19, b"".join(struct.pack("<2f", CELL_W, CELL_H) for _ in range(2 * n)))
    for i in range(n):
        out += geometry(i)
    out += uint(21, 0)
    for i in list(range(n)) + list(range(n)):
        out += uint(22, i)
    return bytes(out)


def compose(cards):
    page = Image.new("RGBA", (PAGE, PAGE_H), (0, 0, 0, 0))
    for i, card in enumerate(cards):
        path = os.path.join(CARDS, "gear_%s.png" % card["slug"])
        if not os.path.exists(path):
            sys.exit("missing card art: %s" % path)
        art = Image.open(path).convert("RGBA")
        x, y, w, h = cell(i)
        page.paste(art.resize((w, h), Image.LANCZOS), (x, y))
    return page.transpose(Image.FLIP_TOP_BOTTOM)


def main():
    global PAGE, PAGE_H, COLS
    data = json.load(open(DESCRIPTIONS))
    cards = data["cards"] + data.get("event_cards", [])
    frames = [c["frame"] for c in cards]
    if len(set(frames)) != len(frames):
        sys.exit("duplicate frame names in %s" % DESCRIPTIONS)
    PAGE, PAGE_H = page_size(len(cards))
    COLS = PAGE // CELL_W
    print("%d cards in %dx%d cells, %d of %d on a %dx%d page"
          % (len(cards), CELL_W, CELL_H, len(cards), COLS * (PAGE_H // CELL_H), PAGE, PAGE_H))
    if "--check" in sys.argv:
        return

    page_path = os.path.join(OUT_DIR, "items_gear.page.png")
    texturec = os.path.join(OUT_DIR, "items_gear.texturec")
    compose(cards).save(page_path)
    if (PAGE, PAGE_H) == (2048, 2048):
        subprocess.check_call([sys.executable, os.path.join(ROOT, "tools", "pack_atlas.py"),
                               "pack", TEMPLATE, page_path, texturec])
    else:
        sys.path.insert(0, os.path.join(ROOT, "tools"))
        import grow_atlas
        shutil.copyfile(TEMPLATE, texturec)
        grow_atlas.grow_texture(texturec, page_path, PAGE, PAGE_H)
    os.remove(page_path)

    out = os.path.join(OUT_DIR, "items_gear.texturesetc")
    open(out, "wb").write(textureset(frames))
    print("wrote %s (%d frames)" % (out, len(frames)))


if __name__ == "__main__":
    main()
