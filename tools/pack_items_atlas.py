"""Lay the item drop icons out on the items_drops atlas page and texture set.

    python3 tools/pack_items_atlas.py

Reads the two icon sets from `img/items/` — `items_<id>.png` drawn for the
places the icon is shown large, and `items_<id>-small.png` redrawn with a
heavier silhouette for the places it is only a few dozen pixels across — and
writes both into one 2048x2048 page:

  game-src/assets/items_drops.texturec      the page, repacked by pack_atlas
  game-src/assets/items_drops.texturesetc   the frame rectangles and names

Each `<id>` becomes two flipbook frames, `<id>` and `<id>_small`, so a caller
picks the size it needs by name and no .gui scene has to change.

The page is the size the shipped atlas already was, so the texture memory the
game asks for does not move. The original texturec is the template `pack`
fills: it keeps the format, mip count and every field we do not touch.

Defold's v axis runs up the quad while a PNG's rows run down it, so every
icon is stored upside down in its cell, exactly as the shipped page stored
them.
"""
import os
import struct
import sys
import tempfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pack_atlas
from defold_archive import pb_fields

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "img", "items")
ASSETS = os.path.join(ROOT, "game-src", "assets")
TEMPLATE = os.path.join(ASSETS, "items_drops.texturec")
TEXTURE_PATH = b"/assets/items_drops.texturec"

PAGE = 2048
# Big icons fill the top six rows, the small ones the four rows under them.
# 9x6 and 16x4 leave the bottom of the page empty, which costs nothing and
# leaves room for more drops later.
BIG, BIG_COLS, BIG_ROWS = 224, 9, 6
SMALL, SMALL_COLS = 128, 16
SMALL_TOP = BIG * BIG_ROWS
# Art is inset inside its cell so neighbouring icons cannot bleed into each
# other once the engine minifies the page down the mip chain.
INSET = 8


def cells(count):
    """Pixel rectangles for `count` big frames, then `count` small ones."""
    out = []
    for i in range(count):
        x, y = (i % BIG_COLS) * BIG, (i // BIG_COLS) * BIG
        out.append((x, y, x + BIG, y + BIG))
    for i in range(count):
        x = (i % SMALL_COLS) * SMALL
        y = SMALL_TOP + (i // SMALL_COLS) * SMALL
        out.append((x, y, x + SMALL, y + SMALL))
    return out


def fit(png, cell):
    """The icon scaled into `cell` pixels with a transparent gutter, flipped."""
    im = Image.open(png).convert("RGBA")
    box = im.getbbox() or (0, 0, im.width, im.height)
    im = im.crop(box)
    inner = cell - 2 * INSET
    scale = min(inner / im.width, inner / im.height)
    im = im.resize((max(1, round(im.width * scale)),
                    max(1, round(im.height * scale))), Image.LANCZOS)
    out = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    out.paste(im, ((cell - im.width) // 2, (cell - im.height) // 2))
    return pack_atlas.premultiply(out).transpose(Image.FLIP_TOP_BOTTOM)


def page_of(names, rects):
    page = Image.new("RGBA", (PAGE, PAGE), (0, 0, 0, 0))
    for i, name in enumerate(names + names):
        cell = BIG if i < len(names) else SMALL
        suffix = "" if i < len(names) else "-small"
        src = os.path.join(ICONS, "items_%s%s.png" % (name.replace("_", "-"), suffix))
        if not os.path.exists(src):
            sys.exit("missing %s" % src)
        page.paste(fit(src, cell), rects[i][:2])
    return page


def f32(*values):
    return b"".join(struct.pack("<f", v) for v in values)


def tagged(field, wire, payload):
    return pack_atlas.varint((field << 3) | wire) + payload


def length_delimited(field, payload):
    return tagged(field, 2, pack_atlas.varint(len(payload)) + payload)


def varint_field(field, value):
    return tagged(field, 0, pack_atlas.varint(value))


def float_field(field, value):
    return tagged(field, 5, struct.pack("<f", value))


def uvs_of(rect):
    """The four corner UVs, bottom-left first, the order Defold's quad wants."""
    x0, y0, x1, y1 = (v / PAGE for v in rect)
    return (x0, y0, x0, y1, x1, y1, x1, y0)


def geometry(rect, cell):
    body = varint_field(1, cell) + varint_field(2, cell)
    for v in (-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5):
        body += float_field(3, v)
    for v in uvs_of(rect):
        body += float_field(4, v)
    for i in (0, 1, 2, 0, 2, 3):
        body += varint_field(5, i)
    return length_delimited(20, body)


def animation(name, cell, frame):
    body = length_delimited(1, name.encode())
    body += varint_field(2, cell) + varint_field(3, cell)
    body += varint_field(4, frame) + varint_field(5, frame + 1)
    body += b"".join(varint_field(f, 0) for f in (6, 7, 8, 9))
    return length_delimited(2, body)


def texture_set(names, rects):
    """A TextureSet holding every name twice, as `<id>` and `<id>_small`."""
    ids = names + [n + "_small" for n in names]
    sizes = [BIG] * len(names) + [SMALL] * len(names)
    images = len(ids)

    out = length_delimited(1, TEXTURE_PATH)
    for i, name in enumerate(ids):
        out += animation(name, sizes[i], images + i)
    out += varint_field(6, images)

    # tex_coords and tex_dims carry one entry per frame slot: the images
    # first, then the single frame each animation plays.
    coords = b"".join(f32(*uvs_of(r)) for r in rects) * 2
    dims = b"".join(f32(s, s) for s in sizes) * 2
    out += length_delimited(18, coords) + length_delimited(19, dims)

    for i, rect in enumerate(rects):
        out += geometry(rect, sizes[i])
    out += varint_field(21, 0)
    out += b"".join(varint_field(22, i) for i in range(images)) * 2
    return out


def names_from(texturesetc):
    """The frame names of an existing set, in file order, without `_small`."""
    out = []
    for fn, _, v in pb_fields(open(texturesetc, "rb").read()):
        if fn != 2:
            continue
        for f, _, val in pb_fields(v):
            if f == 1:
                name = val.decode()
                if not name.endswith("_small"):
                    out.append(name)
    return out


def main():
    names = names_from(os.path.join(ASSETS, "items_drops.texturesetc"))
    rects = cells(len(names))
    if SMALL_TOP + ((len(names) + SMALL_COLS - 1) // SMALL_COLS) * SMALL > PAGE:
        sys.exit("%d icons do not fit the page" % len(names))

    png = os.path.join(tempfile.mkdtemp(), "items_drops.png")
    page_of(names, rects).save(png)
    pack_atlas.pack(TEMPLATE, png, os.path.join(ASSETS, "items_drops.texturec"))
    os.remove(png)

    out = os.path.join(ASSETS, "items_drops.texturesetc")
    open(out, "wb").write(texture_set(names, rects))
    print("wrote %s (%d frames, %d names)"
          % (out, 2 * len(names), len(names)))


if __name__ == "__main__":
    main()


def encode_items(items):
    """Re-encode a parsed submessage, field order preserved."""
    out = b""
    for fn, wt, v in items:
        if wt == 0:
            out += varint_field(fn, v)
        elif wt == 5:
            out += tagged(fn, 5, bytes(v))
        else:
            out += length_delimited(fn, bytes(v))
    return out
