"""Lay each chest's closed and open art into the lootbox frames so the box sits
exactly where the shipped wood chest put it.

    python3 tools/place_chests.py            # every chest and the piles
    python3 tools/place_chests.py moon       # only the chests named

openpack draws the loot pile (`loot_1`) and the burst (`shine_0`) on top of
the chest without moving them, so every chest, closed or open, has to put its
box in the same place: the front face's top rim at y = 318 of the 512 cell,
442 px wide from x = 35 to 477, the base just under y = 500. The loot pile
then lands in the open mouth whichever chest it is.

It also lays the four treasure piles (loot_1..4) into the same cells, cut flat
on the rim and spanning the mouth, as img/lootbox/lootbox_loot-<n>.png.

Reads the cut-out generations in img/lootbox/_work/ named in CUT (the closed
chest above the open one, from the green-screen sheets in img/lootbox/source/) and writes the finished 512x512 cells
img/lootbox/lootbox_<tier>-closed.png and -open.png, which
tools/repaint_atlas.py pastes into the lootbox atlas as they are.

RIM is the y, in the open chest's own trimmed cut-out, of the top edge of the
box's front face, read off by eye. Both states share one scale so the box does
not jump when the lid opens; the closed chest stands on the same base.
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "img", "lootbox")

CELL = 512
RIM_Y = 318        # top of the box's front face, as shipped
BOX_W = 442        # its width at that rim
CENTRE_X = 256

RIM = {"wood": 308, "banded": 335, "stone": 300, "moon": 317,
       # the later events' chests
       "hearth": 300,
       # the enemy events' chests
       "war": 305, "tidebound": 320, "masque": 288}

# The cut-out each tier is placed from, in img/lootbox/_work/.
CUT = {"wood": "lootbox_v3_wood_cut.png", "banded": "lootbox_v3_banded_cut.png",
       "stone": "lootbox_v3_stone_cut.png", "moon": "lootbox_v1_moon_cut.png",
       "hearth": "lootbox_v1_hearth_cut.png", "war": "lootbox_v1_war_cut.png",
       "tidebound": "lootbox_v1_tidebound_cut.png", "masque": "lootbox_v1_masque_cut.png"}

# The treasure piles (loot_1 smallest .. loot_4 largest) are cut flat along the
# open mouth's front rim, so the heap reads as filling the chest to the brim,
# and span the mouth. Each is cut wherever its mound is wide enough to fill the
# mouth while rising PILE_RISE px above the rim.
PILE_SHEET = "lootbox_v1_piles_cut.png"   # four heaps left to right, small to large
PILE_BASE = 326                            # just under every chest's front rim
MOUTH_W = 370
PILE_RISE = (70, 120, 185, 270)


def tight(p):
    return p.crop(p.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox())


def pieces(path):
    """(closed, open) from a sheet with the closed chest above the open one."""
    im = Image.open(path).convert("RGBA")
    a = im.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    rows = [a.crop((0, y, im.width, y + 1)).getbbox() is not None
            for y in range(im.height)]
    mid = im.height // 2
    gap = min(range(mid - 250, mid + 250), key=lambda y: (rows[y], abs(y - mid)))
    return (tight(im.crop((0, 0, im.width, gap))),
            tight(im.crop((0, gap, im.width, im.height))))


def place(p, s, left, top):
    p = p.resize((round(p.width * s), round(p.height * s)), Image.LANCZOS)
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    cell.alpha_composite(p, (round(left), round(top)))
    return cell


def columns(im):
    """(x0, x1) of each separate shape across the sheet, left to right."""
    a = im.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    runs, start = [], None
    for x in range(im.width + 1):
        filled = x < im.width and a.crop((x, 0, x + 1, im.height)).getbbox() is not None
        if filled and start is None:
            start = x
        elif not filled and start is not None:
            if x - start > 20:
                runs.append((start, x))
            start = None
    return runs


def place_pile(heap, rise):
    """The heap cut flat where it fills the mouth at `rise` px tall."""
    a = heap.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    widths = []
    for y in range(heap.height):
        box = a.crop((0, y, heap.width, y + 1)).getbbox()
        widths.append(box[2] - box[0] if box else 0)
    # lowest cut whose scaled visible height still fits under `rise`
    cut = min(range(heap.height // 3, heap.height + 1),
              key=lambda r: abs(r * MOUTH_W / max(widths[r - 1], 1) - rise))
    s = MOUTH_W / widths[cut - 1]
    top = heap.crop((0, 0, heap.width, cut))
    return place(top, s, CENTRE_X - top.width * s / 2, PILE_BASE - cut * s)


def main():
    only = sys.argv[1:]
    for tier in only:
        if tier not in RIM:
            raise SystemExit("unknown chest %r; known: %s" % (tier, ", ".join(RIM)))
    if not only:
        place_piles()
    for tier in only or RIM:
        place_chest(tier, RIM[tier])


def place_piles():
    sheet = Image.open(os.path.join(DIR, "_work", PILE_SHEET)).convert("RGBA")
    for n, ((x0, x1), rise) in enumerate(zip(columns(sheet), PILE_RISE), 1):
        heap = tight(sheet.crop((x0, 0, x1, sheet.height)))
        place_pile(heap, rise).save(os.path.join(DIR, "lootbox_loot-%d.png" % n))
        print("loot_%d   rises %d px above the rim" % (n, rise))


def place_chest(tier, rim):
    closed, opened = pieces(os.path.join(DIR, "_work", CUT[tier]))
    s = BOX_W / opened.width
    top = RIM_Y - rim * s
    base = top + opened.height * s
    if top < 0 or base > CELL:
        raise SystemExit("%s does not fit the cell: %d..%d" % (tier, top, base))
    place(opened, s, CENTRE_X - opened.width * s / 2, top).save(
        os.path.join(DIR, "lootbox_%s-open.png" % tier))
    place(closed, s, CENTRE_X - closed.width * s / 2, base - closed.height * s).save(
        os.path.join(DIR, "lootbox_%s-closed.png" % tier))
    print("%-7s scale %.3f  lid top %3d  base %3d" % (tier, s, top, base))


if __name__ == "__main__":
    main()
