"""Read and write the Defold .texturec files the shipped atlases are made of.

    python3 tools/pack_atlas.py unpack <in.texturec> <page.png>
    python3 tools/pack_atlas.py pack   <in.texturec> <page.png> <out.texturec>

A .texturec is a TextureImage protobuf holding one RGBA page and its mip chain.
In this build the top mips are WebP-compressed and the last few, once they are
only a few bytes, are stored raw; `pack` reproduces that split. Everything but
the image data is copied from the input file, so the output keeps the original
format, flags and field order.

Frame rectangles live in the matching .texturesetc, not here: `pack` replaces
the page pixels and nothing else, so the page must keep its exact dimensions
and every frame must stay where the textureset says it is.
"""
import io
import os
import struct
import sys

from PIL import Image

RAW_BELOW = 256  # mips smaller than this many bytes ship uncompressed
WEBP_QUALITY = 92


def premultiply(im):
    """RGBA with colour scaled by alpha, which is what the shipped pages hold.

    Defold's GUI blends as premultiplied (one, one-minus-source-alpha), so a
    straight-alpha pixel at the soft edge of a cut-out is added at full
    strength and every icon grows a thin light ring. Anything drawn into a page
    has to go through this first. Fully transparent pixels come out black."""
    im = im.convert("RGBA")
    r, g, b, a = im.split()
    from PIL import ImageChops
    return Image.merge("RGBA", [ImageChops.multiply(c, a) for c in (r, g, b)] + [a])


def clamp_to_alpha(im):
    """No colour channel above alpha -- the one rule premultiplied pixels obey.

    A no-op on a clean page. On a page that has been through a lossy encode,
    or had straight-alpha art pasted in, it strips the colour hiding under
    transparent pixels and the overbright soft edges, which is what shows up
    in game as a thin light outline round every cut-out."""
    from PIL import ImageChops
    r, g, b, a = im.convert("RGBA").split()
    return Image.merge("RGBA", [ImageChops.darker(c, a) for c in (r, g, b)] + [a])


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


def read_varint(b, i):
    n = shift = 0
    while True:
        byte = b[i]
        i += 1
        n |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return n, i
        shift += 7


def fields(b):
    """Yield (number, wire_type, raw_payload) in file order."""
    i = 0
    while i < len(b):
        key, i = read_varint(b, i)
        fn, wt = key >> 3, key & 7
        if wt == 0:
            v, i = read_varint(b, i)
            yield fn, wt, v
        elif wt == 2:
            n, i = read_varint(b, i)
            yield fn, wt, b[i:i + n]
            i += n
        elif wt == 5:
            yield fn, wt, b[i:i + 4]
            i += 4
        else:
            raise ValueError("wire type %d at %d" % (wt, i))


def encode(items):
    out = bytearray()
    for fn, wt, v in items:
        out += varint((fn << 3) | wt)
        if wt == 0:
            out += varint(v)
        elif wt == 2:
            out += varint(len(v)) + v
        else:
            out += v
    return bytes(out)


def image_of(blob):
    """The TextureImage.Image submessage, as (outer_items, image_items)."""
    outer = list(fields(blob))
    image = [t for t in outer if t[0] == 1]
    if len(image) != 1:
        sys.exit("expected one image in the texture, found %d" % len(image))
    return outer, list(fields(image[0][2]))


def mips(items):
    width = [v for fn, _, v in items if fn == 1][0]
    height = [v for fn, _, v in items if fn == 2][0]
    offsets = [v for fn, _, v in items if fn == 6]
    sizes = [v for fn, _, v in items if fn == 7]
    compressed = [v for fn, _, v in items if fn == 11]
    data = [v for fn, _, v in items if fn == 8][0]
    return width, height, offsets, sizes, compressed, data


def unpack(texturec, png):
    _, items = image_of(open(texturec, "rb").read())
    width, height, offsets, sizes, compressed, data = mips(items)
    first = data[offsets[0]: offsets[0] + (compressed[0] or sizes[0])]
    page = (Image.open(io.BytesIO(first)) if compressed[0]
            else Image.frombytes("RGBA", (width, height), first))
    page.convert("RGBA").save(png)
    print("unpacked %dx%d, %d mips -> %s" % (width, height, len(offsets), png))


def pack(texturec, png, out):
    blob = open(texturec, "rb").read()
    outer, items = image_of(blob)
    width, height, offsets, sizes, _, _ = mips(items)

    page = Image.open(png).convert("RGBA")
    if page.size != (width, height):
        sys.exit("page is %dx%d, the texture wants %dx%d"
                 % (page.width, page.height, width, height))
    page = clamp_to_alpha(page)

    data = bytearray()
    new_offsets, new_compressed = [], []
    for level, raw_size in enumerate(sizes):
        w, h = max(1, width >> level), max(1, height >> level)
        # Box, not Lanczos: Lanczos overshoots at every cut-out edge, pushing
        # colour above alpha in each smaller mip, and the premultiplied blend
        # shows that as a speckled light ring whenever the engine minifies.
        # A box average of premultiplied pixels can't break the rule; the clamp
        # is a guard.
        mip = page if level == 0 else clamp_to_alpha(page.resize((w, h), Image.BOX))
        new_offsets.append(len(data))
        if raw_size < RAW_BELOW:
            # Too small to be worth a container; the engine reads these as RGBA.
            new_compressed.append(0)
            data += mip.tobytes()
        else:
            buf = io.BytesIO()
            # Lossless. Lossy WebP smears colour into the fully transparent
            # pixels round every cut-out however it is told, and the GUI's
            # premultiplied blend adds that colour on as a thin light outline.
            # Costs a few hundred KB a page; libwebp tells the two apart itself,
            # so the texture keeps its compression tag.
            mip.save(buf, "WEBP", lossless=True, quality=100, method=6, exact=True)
            new_compressed.append(buf.tell())
            data += buf.getvalue()

    rebuilt = []
    seen = {}
    for fn, wt, v in items:
        if fn in (6, 11):
            # Both are repeated and rewritten below; emit the new list once,
            # in the position the first element held.
            if fn not in seen:
                seen[fn] = True
                source = new_offsets if fn == 6 else new_compressed
                rebuilt += [(fn, 0, n) for n in source]
            continue
        rebuilt.append((fn, wt, bytes(data) if fn == 8 else v))

    body = encode(rebuilt)
    open(out, "wb").write(encode([(1, 2, body) if fn == 1 else (fn, wt, v)
                                  for fn, wt, v in outer]))
    print("packed %s (%d bytes, %d mips, %d bytes of image data)"
          % (out, os.path.getsize(out), len(sizes), len(data)))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == "unpack" and len(sys.argv) == 4:
        unpack(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == "pack" and len(sys.argv) == 5:
        pack(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
