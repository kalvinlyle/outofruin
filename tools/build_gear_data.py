"""Point every Gear.json entry at its card in the rebuilt items_gear atlas.

    python3 tools/build_gear_data.py

Reads the shipped /data/Gear.json out of game-src/archive, swaps each entry's
Icon for its new frame and gives it a matching Portrait, and writes the result
to game-src/data/Gear.json for tools/patch_game.py to pick up.

Gear used to be drawn from two atlases: the icon-sheet frames in `items_gear`
and a handful borrowed from `items_drops`. The borrowed ones are repointed
here, so `items_drops` keeps the drop icons the loot and resource screens
still want, and `items_gear` belongs to gear alone.

Cards and the upgrade screen prefer `Portrait` over `Icon` and are already
laid out for the henchmen's 2:3 frames, so giving gear a Portrait is what puts
the card art on the card. `Icon` points at the same frame for the smaller slots.

Entries are matched by position: gear_index in gear_descriptions.json is the
1-based index into Gear.json, which is the only stable key -- two entries share
the name "Sack" and several changed name between builds.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

from patch_game import SRC, read_files  # noqa: E402
from defold_archive import lz4_block_decompress, parse_manifest, xtea_ctr  # noqa: E402

DESCRIPTIONS = os.path.join(ROOT, "img", "gear", "source", "gear_descriptions.json")
OUT = os.path.join(ROOT, "game-src", "data", "Gear.json")

ICON = re.compile(r'("Icon":\s*\{\s*)"texture":\s*"[^"]*",(\s*)"flipbook":\s*"[^"]*"(\s*\})')


def shipped_gear():
    """The /data/Gear.json text as it ships, read straight out of the archive."""
    import struct

    files = read_files()
    arci, arcd = files["game.arci"], files["game.arcd"]
    manifest = os.path.join(SRC, "_manifest.tmp")
    open(manifest, "wb").write(files["game.dmanifest"])
    try:
        by_hash = parse_manifest(manifest)
    finally:
        os.remove(manifest)
    by_url = {url: h for h, url in by_hash.items()}

    _, _, _, count, entry_off, hash_off, hash_len = struct.unpack_from(">IIQIIII", arci, 0)
    for i in range(count):
        h = bytes(arci[hash_off + i * 64: hash_off + i * 64 + hash_len])
        if h != by_url["/data/Gear.json"]:
            continue
        off, size, csize, flags = struct.unpack_from(">IIII", arci, entry_off + i * 16)
        blob = bytes(arcd[off: off + (size if csize == 0xFFFFFFFF else csize)])
        if flags & 1:
            blob = xtea_ctr(blob)
        if csize != 0xFFFFFFFF:
            blob = lz4_block_decompress(blob, size)
        return blob.decode("utf-8")
    sys.exit("no /data/Gear.json in the archive")


def main():
    cards = json.load(open(DESCRIPTIONS))["cards"]
    by_index = {c["gear_index"]: c for c in cards}
    text = shipped_gear()

    entries = json.loads(text)
    if len(entries) != len(cards):
        sys.exit("%d gear entries but %d cards" % (len(entries), len(cards)))

    seen = [0]

    def swap(m):
        seen[0] += 1
        card = by_index[seen[0]]
        frame = card["frame"]
        return ('%s"texture": "items_gear",%s"flipbook": "%s"%s' % (m.group(1), m.group(2), frame, m.group(3))
                + ',\n\t\t"Portrait": { \t\t\t\t\t"texture": "items_gear", \t\t\t"flipbook": "%s" }' % frame)

    out = ICON.sub(swap, text)
    if seen[0] != len(entries):
        sys.exit("rewrote %d of %d Icon blocks" % (seen[0], len(entries)))

    checked = json.loads(out)
    for i, entry in enumerate(checked, 1):
        want = by_index[i]["frame"]
        assert entry["Icon"] == {"texture": "items_gear", "flipbook": want}, entry["Name"]
        assert entry["Portrait"] == entry["Icon"], entry["Name"]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w").write(out)
    print("wrote %s (%d entries repointed at items_gear)" % (OUT, len(checked)))


if __name__ == "__main__":
    main()
