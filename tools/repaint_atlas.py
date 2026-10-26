"""Repaint named frames of a shipped atlas, optionally giving one more pixels.

    python3 tools/repaint_atlas.py <name> <frame>[#<n>]=<png>[@<size>] ...

Reads game-src/assets/<name>.texturec and .texturesetc, draws each <png> into
the frame called <frame>, and writes both files back. A frame left off the
command line keeps the pixels it already had, so this is safe to run against an
atlas other work has already changed — it edits the page in place rather than
laying it out again.

`@<size>` moves that frame to a free square of <size> pixels somewhere else on
the page and points its rectangle at the new home. The old rectangle is left
as it is: frames are addressed by name, so nothing reads those pixels once the
rectangle has moved, and clearing them would only risk clipping a neighbour
that shares the region. Use it when a frame is drawn much larger than it is
stored — `gold_coin_hexagon` ships at 50x50 and the header draws it at about
112 units, which no repaint at 50x50 can make sharp.

`#<n>` picks one frame of a flipbook, counting from zero -- `coin_spin#3`
is the fourth frame of the coin's spin. Without it a flipbook's first frame is
the one repainted. A flipbook's frames share one size, so `@<size>` has to be
given for every frame of one, not just the first.

Frames are stored upside down, the way Defold's v axis wants them, and a
frame the packer turned 90 degrees (`wood_icon` in main) is turned back to
match. A png exactly the frame's size is pasted as it is rather than trimmed
and refitted, for art already placed to line up with another frame.
"""
import os
import sys
import tempfile

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pack_atlas
import pack_items_atlas as P
from defold_archive import pb_fields

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "game-src", "assets")
INSET = 2      # transparent gutter kept inside a repainted frame
GRID = 16      # free squares are looked for on this pitch


def read_set(path):
    """(animations, geometries, frame_indices, tile_count) of a texture set."""
    anims, geoms, fi, tile, texture = [], [], [], None, None
    coords = dims = b""
    for fn, wt, v in pb_fields(open(path, "rb").read()):
        if fn == 1:
            texture = bytes(v)
        elif fn == 18:
            coords = bytes(v)
        elif fn == 19:
            dims = bytes(v)
        elif fn == 2:
            d = {}
            for f, w, x in pb_fields(v):
                d[f] = x
            # 6..9 are fps, playback, flip_horizontal, flip_vertical. They
            # differ per atlas — main animates at 24fps where items_drops is
            # all zeroes — so carry them through rather than assume.
            anims.append({"id": d[1].decode(), "w": d[2], "h": d[3],
                          "start": d[4], "end": d[5],
                          "rest": [d.get(f, 0) for f in (6, 7, 8, 9)]})
        elif fn == 20:
            geoms.append(list(pb_fields(v)))
        elif fn == 22:
            fi.append(v)
        elif fn == 6:
            tile = v
    return texture, anims, geoms, fi, tile, coords, dims


def uvs_of_geom(geom):
    import struct
    return [struct.unpack("<f", bytes(x))[0] for f, w, x in geom if f == 4]


def uvs_for(rect, W, H):
    """Corner UVs, bottom-left first. Scaled by the page this atlas actually
    has -- the items packer's helper assumes its own 2048 page."""
    x0, y0, x1, y1 = rect
    return (x0 / W, y0 / H, x0 / W, y1 / H, x1 / W, y1 / H, x1 / W, y0 / H)


def rect_of(geom, W, H):
    uv = uvs_of_geom(geom)
    xs, ys = uv[0::2], uv[1::2]
    return (round(min(xs) * W), round(min(ys) * H),
            round(max(xs) * W), round(max(ys) * H))


def occupancy(geoms, W, H):
    occ = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(occ)
    for g in geoms:
        x0, y0, x1, y1 = rect_of(g, W, H)
        d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=255)
    return occ


def free_square(occ, size, W, H):
    for y in range(0, H - size + 1, GRID):
        for x in range(0, W - size + 1, GRID):
            if occ.crop((x, y, x + size, y + size)).getextrema()[1] == 0:
                return x, y
    return None


def is_rotated(geom):
    """True for a frame the packer stored turned 90 degrees: its first two
    corners share a v rather than a u."""
    uv = uvs_of_geom(geom)
    return abs(uv[0] - uv[2]) > 1e-6


def draw_into(page, png, rect, rotated=False):
    """Fit `png` into the frame. A png already exactly the frame's size is
    taken as a finished cell and pasted as it is, so art laid out to line up
    with a sibling frame (a chest closed and open) keeps its placement."""
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    if rotated:
        w, h = h, w
    im = Image.open(png).convert("RGBA")
    if im.size == (w, h):
        cell = im
    else:
        box = im.getbbox() or (0, 0, im.width, im.height)
        im = im.crop(box)
        inner_w, inner_h = w - 2 * INSET, h - 2 * INSET
        scale = min(inner_w / im.width, inner_h / im.height)
        im = im.resize((max(1, round(im.width * scale)),
                        max(1, round(im.height * scale))), Image.LANCZOS)
        cell = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        cell.paste(im, ((w - im.width) // 2, (h - im.height) // 2))
    cell = pack_atlas.premultiply(cell)
    # Upright frames are stored flipped; rotated ones turned a quarter and
    # flipped, which is one transverse.
    page.paste(cell.transpose(Image.TRANSVERSE if rotated
                              else Image.FLIP_TOP_BOTTOM), (x0, y0))


def rebuild_set(texture, anims, geoms, fi, tile, coords, dims, W, H, rects):
    """The texture set again, with `rects` replacing those frames' rectangles."""
    out = P.length_delimited(1, texture)
    for a in anims:
        body = P.length_delimited(1, a["id"].encode())
        body += P.varint_field(2, a["w"]) + P.varint_field(3, a["h"])
        body += P.varint_field(4, a["start"]) + P.varint_field(5, a["end"])
        body += b"".join(P.varint_field(f, v)
                         for f, v in zip((6, 7, 8, 9), a["rest"]))
        out += P.length_delimited(2, body)
    out += P.varint_field(6, tile)

    # tex_coords and tex_dims are kept exactly as they shipped and only the
    # frames that moved are overwritten. Corner order is not uniform across
    # frames -- some are stored rotated -- so deriving them again would quietly
    # corrupt the ones this call never touched.
    coords, dims = bytearray(coords), bytearray(dims)
    for i, gi in enumerate(fi):
        if gi not in rects:
            continue
        x0, y0, x1, y1 = rects[gi]
        coords[i * 32:(i + 1) * 32] = P.f32(*uvs_for(rects[gi], W, H))
        dims[i * 8:(i + 1) * 8] = P.f32(float(x1 - x0), float(y1 - y0))
    out += P.length_delimited(18, bytes(coords))
    out += P.length_delimited(19, bytes(dims))

    for i, g in enumerate(geoms):
        if i in rects:
            x0, y0, x1, y1 = rects[i]
            body = P.varint_field(1, x1 - x0) + P.varint_field(2, y1 - y0)
            for v in (-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5):
                body += P.float_field(3, v)
            for v in uvs_for(rects[i], W, H):
                body += P.float_field(4, v)
            for k in (0, 1, 2, 0, 2, 3):
                body += P.varint_field(5, k)
            out += P.length_delimited(20, body)
        else:
            out += P.length_delimited(20, P.encode_items(g))
    out += P.varint_field(21, 0)
    out += b"".join(P.varint_field(22, i) for i in fi)
    return out


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    name = sys.argv[1]
    jobs = []
    for arg in sys.argv[2:]:
        frame, _, png = arg.partition("=")
        png, _, size = png.partition("@")
        frame, _, n = frame.partition("#")
        jobs.append((frame, int(n) if n else 0, png, int(size) if size else None))

    tc = os.path.join(ASSETS, name + ".texturec")
    ts = os.path.join(ASSETS, name + ".texturesetc")
    texture, anims, geoms, fi, tile, coords, dims = read_set(ts)
    png_path = os.path.join(tempfile.mkdtemp(), name + ".page.png")
    pack_atlas.unpack(tc, png_path)
    page = Image.open(png_path).convert("RGBA")
    W, H = page.size
    by_id = {a["id"]: a for a in anims}
    occ = occupancy(geoms, W, H)

    rects = {}
    for frame, n, png, size in jobs:
        if frame not in by_id:
            sys.exit("%s has no frame %r" % (name, frame))
        a = by_id[frame]
        if not 0 <= n < a["end"] - a["start"]:
            sys.exit("%s#%d is past the end of a %d-frame animation"
                     % (frame, n, a["end"] - a["start"]))
        gi = fi[a["start"] + n]
        label = frame if a["end"] - a["start"] == 1 else "%s#%d" % (frame, n)
        rect = rect_of(geoms[gi], W, H)
        rotated = is_rotated(geoms[gi])
        if size:
            rotated = False   # a moved frame gets fresh upright corners
            spot = free_square(occ, size, W, H)
            if not spot:
                sys.exit("no free %dx%d square on the %s page" % (size, size, name))
            rect = (spot[0], spot[1], spot[0] + size, spot[1] + size)
            rects[gi] = rect
            a["w"], a["h"] = size, size
            d = ImageDraw.Draw(occ)
            d.rectangle([rect[0], rect[1], rect[2] - 1, rect[3] - 1], fill=255)
            print("  %-24s moved to %dx%d at %d,%d"
                  % (label, size, size, *spot))
        draw_into(page, png, rect, rotated)
        print("  %-24s repainted in %s" % (label, rect))

    page.save(png_path)
    pack_atlas.pack(tc, png_path, tc)
    os.remove(png_path)
    open(ts, "wb").write(
        rebuild_set(texture, anims, geoms, fi, tile, coords, dims,
                    W, H, rects))
    print("wrote %s and %s" % (tc, ts))


if __name__ == "__main__":
    main()
