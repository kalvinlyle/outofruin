"""Give a shipped atlas a bigger page, keeping every frame where it is.

    python3 tools/grow_atlas.py <name> <width> <height>

Works on game-src/assets/<name>.texturec and .texturesetc. The old page is
copied into the corner of the new one at the same pixel offsets, the rest is
left transparent for tools/add_atlas_frames.py to fill, and every UV in the
texture set is scaled down to match, since UVs are fractions of the page.

Pages only grow, and stay powers of two: the engine mipmaps them and WebGL 1
will only do that for power-of-two textures.
"""
import os
import struct
import sys
import tempfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pack_atlas
import pack_items_atlas as P
import repaint_atlas as R


def grow_texture(texturec, page_png, W, H):
    """Rewrite the texture's size fields and mip list for a W x H page, then
    pack the page into it."""
    blob = open(texturec, "rb").read()
    outer, items = pack_atlas.image_of(blob)
    levels = []
    w, h = W, H
    while True:
        levels.append(w * h * 4)
        if w == 1 and h == 1:
            break
        w, h = max(1, w // 2), max(1, h // 2)
    rebuilt, done = [], set()
    for fn, wt, v in items:
        if fn in (1, 3):
            rebuilt.append((fn, wt, W))
        elif fn in (2, 4):
            rebuilt.append((fn, wt, H))
        elif fn in (6, 7, 11):
            # Repeated, one per mip; pack() rewrites offsets and compressed
            # sizes from the raw sizes, so all three just need the new count.
            if fn not in done:
                done.add(fn)
                rebuilt += [(fn, 0, n if fn == 7 else 0) for n in levels]
        else:
            rebuilt.append((fn, wt, v))
    body = pack_atlas.encode(rebuilt)
    open(texturec, "wb").write(pack_atlas.encode(
        [(1, 2, body) if fn == 1 else (fn, wt, v) for fn, wt, v in outer]))
    pack_atlas.pack(texturec, page_png, texturec)


def scale_uvs(blob, sx, sy):
    """Scale every u by sx and v by sy in a packed run of little-endian floats."""
    vals = struct.unpack("<%df" % (len(blob) // 4), blob)
    return struct.pack("<%df" % len(vals),
                       *[v * (sx if i % 2 == 0 else sy) for i, v in enumerate(vals)])


def grow_set(ts, sx, sy):
    texture, anims, geoms, fi, tile, coords, dims = R.read_set(ts)
    out = P.length_delimited(1, texture)
    for a in anims:
        body = P.length_delimited(1, a["id"].encode())
        body += P.varint_field(2, a["w"]) + P.varint_field(3, a["h"])
        body += P.varint_field(4, a["start"]) + P.varint_field(5, a["end"])
        body += b"".join(P.varint_field(f, v) for f, v in zip((6, 7, 8, 9), a["rest"]))
        out += P.length_delimited(2, body)
    out += P.varint_field(6, tile)
    out += P.length_delimited(18, scale_uvs(coords, sx, sy))
    out += P.length_delimited(19, dims)
    for g in geoms:
        items, uv = [], []
        for f, w, x in g:
            if f == 4:
                uv.append(struct.unpack("<f", bytes(x))[0])
            else:
                items.append((f, w, x))
        body = b""
        for f, w, x in items:
            if f == 5 and uv:
                for i, v in enumerate(uv):
                    body += P.float_field(4, v * (sx if i % 2 == 0 else sy))
                uv = []
            body += P.encode_items([(f, w, x)])
        out += P.length_delimited(20, body)
    out += P.varint_field(21, 0)
    out += b"".join(P.varint_field(22, i) for i in fi)
    open(ts, "wb").write(out)


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    name, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    if W & (W - 1) or H & (H - 1):
        sys.exit("pages stay powers of two")
    tc = os.path.join(R.ASSETS, name + ".texturec")
    ts = os.path.join(R.ASSETS, name + ".texturesetc")
    png = os.path.join(tempfile.mkdtemp(), name + ".page.png")
    pack_atlas.unpack(tc, png)
    old = Image.open(png).convert("RGBA")
    if W < old.width or H < old.height:
        sys.exit("pages only grow: %s is %dx%d" % (name, old.width, old.height))
    page = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    page.paste(old, (0, 0))
    page.save(png)
    grow_texture(tc, png, W, H)
    grow_set(ts, old.width / W, old.height / H)
    print("%s grown from %dx%d to %dx%d" % (name, old.width, old.height, W, H))


if __name__ == "__main__":
    main()
