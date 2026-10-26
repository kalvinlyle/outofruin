"""Copy a shipped compiled asset out of the original archive into game-src/assets.

    python3 tools/extract_asset.py npc_portraits.texturec npc_portraits.texturesetc

An atlas has to be in game-src/assets before tools/repaint_atlas.py or
tools/add_atlas_frames.py can change it. Refuses to overwrite a file already
there, since that file may carry earlier changes.
"""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_game as G
from defold_archive import lz4_block_decompress, parse_manifest, xtea_ctr


def main():
    names = sys.argv[1:]
    if not names:
        sys.exit(__doc__)
    files = G.read_files()
    arci, arcd = files["game.arci"], files["game.arcd"]
    tmp = os.path.join(G.SRC, "_manifest.tmp")
    open(tmp, "wb").write(files["game.dmanifest"])
    try:
        by_url = {url: h for h, url in parse_manifest(tmp).items()}
    finally:
        os.remove(tmp)
    _, _, _, count, entry_off, hash_off, hash_len = struct.unpack_from(">IIQIIII", arci, 0)
    index = {bytes(arci[hash_off + i * G.MAX_HASH: hash_off + i * G.MAX_HASH + hash_len]): entry_off + i * 16
             for i in range(count)}
    for name in names:
        dest = os.path.join(G.ASSETS, name)
        if os.path.exists(dest):
            sys.exit("%s already exists; edit it in place" % dest)
        url = "/assets/" + name
        if url not in by_url:
            sys.exit("no resource %s in the archive" % url)
        off, size, csize, flags = struct.unpack_from(">IIII", arci, index[by_url[url]])
        blob = bytes(arcd[off: off + (size if csize == 0xFFFFFFFF else csize)])
        if flags & 1:
            blob = xtea_ctr(blob)
        if csize != 0xFFFFFFFF:
            blob = lz4_block_decompress(blob, size)
        open(dest, "wb").write(blob)
        print("extracted %s (%d bytes)" % (dest, len(blob)))


if __name__ == "__main__":
    main()
