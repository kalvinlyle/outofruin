"""Paste the region-terrain painting into the shipped `map` atlas page.

    python3 tools/pack_map_atlas.py [img/map/map_region-1.png]

The `map` atlas holds one 750x1334 terrain painting plus the small location
icons the map screen draws on top of it. Only the painting is replaced; the
icons and the page size are left exactly as they shipped, because the frame
rectangles live in the .texturesetc inside the archive and are not rewritten.

The painting is stored rotated a quarter turn and flipped -- one transverse,
the way the frame's UVs read it back -- at the rect the textureset gives
(x 2..1336, y 272..1022), with a two-pixel extruded border around it so
bilinear sampling never bleeds in a neighbour.
"""
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTUREC = os.path.join(ROOT, "game-src", "assets", "map.texturec")
FRAME = (2, 272, 1336, 1022)   # the `map` frame, as the textureset places it
EXTRUDE = 2
SIZE = (750, 1334)


def unpack(texturec, page):
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "pack_atlas.py"),
                    "unpack", texturec, page], check=True)


def pack(texturec, page, out):
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "pack_atlas.py"),
                    "pack", texturec, page, out], check=True)


def extrude(page, box, n):
    """Repeat the frame's edge pixels n px outwards, the way the packer does."""
    x0, y0, x1, y1 = box
    for i in range(1, n + 1):
        page.paste(page.crop((x0, y0, x1, y0 + 1)), (x0, y0 - i))
        page.paste(page.crop((x0, y1 - 1, x1, y1)), (x0, y1 - 1 + i))
    for i in range(1, n + 1):
        page.paste(page.crop((x0, y0 - n, x0 + 1, y1 + n)), (x0 - i, y0 - n))
        page.paste(page.crop((x1 - 1, y0 - n, x1, y1 + n)), (x1 - 1 + i, y0 - n))


def main():
    art = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "img", "map", "map_region-1.png")
    work = os.path.join(ROOT, "img", "map", "_work")
    os.makedirs(work, exist_ok=True)
    page_png = os.path.join(work, "map_page.png")

    unpack(TEXTUREC, page_png)
    page = Image.open(page_png).convert("RGBA")

    im = Image.open(art).convert("RGB")
    if im.size != SIZE:
        sys.exit("%s is %dx%d, the map frame is %dx%d" % ((art,) + im.size + SIZE))
    page.paste(im.transpose(Image.TRANSVERSE).convert("RGBA"), FRAME[:2])
    extrude(page, FRAME, EXTRUDE)

    page.save(page_png)
    pack(TEXTUREC, page_png, TEXTUREC)
    print("%s now carries %s" % (TEXTUREC, art))


if __name__ == "__main__":
    main()
