"""An enemy event's XP icon: the game's XP star in the event's own colour.

    python3 tools/tint_xp_star.py <xp stat> <hue in degrees>
    python3 tools/tint_xp_star.py siegexp 355

Reads the XP star (reward_xp_icon) out of the reward_icons atlas, sets every
pixel's hue to the one given while keeping its saturation and brightness, and
writes img/ui/ui_reward-<xp>-icon.png with a .meta sidecar. Pack it into
reward_icons as reward_<xp>_icon (tools/pack_event_atlases.py does).
"""
import colorsys
import json
import os
import sys
import tempfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pack_atlas
import repaint_atlas as R

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def xp_star():
    """The XP star as straight (not premultiplied) RGBA."""
    page_png = os.path.join(tempfile.mkdtemp(), "reward_icons.png")
    pack_atlas.unpack(os.path.join(R.ASSETS, "reward_icons.texturec"), page_png)
    _, anims, geoms, fi, _, _, _ = R.read_set(os.path.join(R.ASSETS, "reward_icons.texturesetc"))
    page = Image.open(page_png).convert("RGBA")
    star = [a for a in anims if a["id"] == "reward_xp_icon"][0]
    # The page comes out bottom-up, the way Defold stores it.
    im = page.crop(R.rect_of(geoms[fi[star["start"]]], *page.size)).transpose(Image.FLIP_TOP_BOTTOM)
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = tuple(min(255, c * 255 // a) for c in (r, g, b)) + (a,)
    return im


def main():
    stat, hue = sys.argv[1], float(sys.argv[2]) / 360
    im = xp_star()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r, g, b = colorsys.hsv_to_rgb(hue, s, v)
            px[x, y] = (round(r * 255), round(g * 255), round(b * 255), a)
    out = os.path.join(ROOT, "img", "ui", "ui_reward-%s-icon.png" % stat)
    im.save(out)
    json.dump({"source": "reward_icons atlas frame reward_xp_icon (the game's XP star), un-premultiplied",
               "processing": ["tools/tint_xp_star.py: hue set to %g degrees, saturation and brightness kept" % (hue * 360)],
               "atlas_frame": "reward_icons/reward_%s_icon" % stat},
              open(out + ".meta", "w"), indent=2)
    print("wrote", os.path.relpath(out, ROOT))


if __name__ == "__main__":
    main()
