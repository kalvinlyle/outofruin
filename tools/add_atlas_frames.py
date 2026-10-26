"""Add new named frames to a shipped atlas, in free space on its page.

    python3 tools/add_atlas_frames.py <name> <frame>=<png>@<size> ...

`<size>` is a side for a square frame or `<w>x<h>` for any other shape, such
as a 128x192 henchman card.

Works on game-src/assets/<name>.texturec and .texturesetc like
tools/repaint_atlas.py, and leaves every existing frame, its pixels and its
rectangle as they were. Each new frame gets a free <size> rectangle, the PNG drawn
into it upside down, one geometry, and a single-frame animation with that name.

A texture set lists one frame slot per image first and then one per animation
frame, and animations address those slots by index. Adding images therefore
pushes every animation frame along, so every existing animation's start and end
move up by the number of images added.
"""
import os
import sys
import tempfile

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pack_atlas
import repaint_atlas as R


def free_rect(occ, size, W, H):
    w, h = size
    for y in range(0, H - h + 1, R.GRID):
        for x in range(0, W - w + 1, R.GRID):
            if occ.crop((x, y, x + w, y + h)).getextrema()[1] == 0:
                return x, y
    return None


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    name = sys.argv[1]
    jobs = []
    for arg in sys.argv[2:]:
        frame, _, rest = arg.partition("=")
        png, _, size = rest.partition("@")
        if not size:
            sys.exit("%s needs an @<size>" % arg)
        w, _, h = size.partition("x")
        jobs.append((frame, png, (int(w), int(h or w))))

    tc = os.path.join(R.ASSETS, name + ".texturec")
    ts = os.path.join(R.ASSETS, name + ".texturesetc")
    texture, anims, geoms, fi, tile, coords, dims = R.read_set(ts)
    if list(fi[:tile]) != list(range(tile)):
        sys.exit("%s does not list its images first; not safe to extend" % name)
    taken = {a["id"] for a in anims}

    png_path = os.path.join(tempfile.mkdtemp(), name + ".page.png")
    pack_atlas.unpack(tc, png_path)
    page = Image.open(png_path).convert("RGBA")
    W, H = page.size
    occ = R.occupancy(geoms, W, H)
    draw = ImageDraw.Draw(occ)
    R.GRID = 8   # a finer search finds room a 16px grid steps over

    rects, new_images = {}, []
    for frame, png, size in jobs:
        if frame in taken:
            sys.exit("%s already has a frame %r" % (name, frame))
        spot = free_rect(occ, size, W, H)
        if not spot:
            sys.exit("no free %dx%d rectangle left on the %s page" % (size + (name,)))
        rect = (spot[0], spot[1], spot[0] + size[0], spot[1] + size[1])
        draw.rectangle([rect[0], rect[1], rect[2] - 1, rect[3] - 1], fill=255)
        R.draw_into(page, png, rect, False)
        gi = len(geoms)
        geoms.append(geoms[0])          # placeholder; rebuilt from rects
        rects[gi] = rect
        new_images.append((frame, gi, size))
        print("  %-30s added %dx%d at %d,%d" % (frame, size[0], size[1], *spot))

    k = len(new_images)
    for a in anims:
        a["start"] += k
        a["end"] += k
    image_slots = list(fi[:tile]) + [gi for _, gi, _ in new_images]
    anim_slots = list(fi[tile:]) + [gi for _, gi, _ in new_images]
    blank32, blank8 = b"\0" * 32, b"\0" * 8
    coords = coords[:tile * 32] + blank32 * k + coords[tile * 32:] + blank32 * k
    dims = dims[:tile * 8] + blank8 * k + dims[tile * 8:] + blank8 * k
    first_new_anim_slot = len(image_slots) + len(fi) - tile
    for j, (frame, gi, size) in enumerate(new_images):
        anims.append({"id": frame, "w": size[0], "h": size[1],
                      "start": first_new_anim_slot + j,
                      "end": first_new_anim_slot + j + 1,
                      "rest": list(anims[0].get("rest", [0, 0, 0, 0]))})

    page.save(png_path)
    pack_atlas.pack(tc, png_path, tc)
    os.remove(png_path)
    open(ts, "wb").write(R.rebuild_set(texture, anims, geoms, image_slots + anim_slots,
                                       tile + k, coords, dims, W, H, rects))
    print("wrote %s and %s (%d frames added)" % (tc, ts, k))


if __name__ == "__main__":
    main()
