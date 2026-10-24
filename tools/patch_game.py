"""Rebuild game/archive from the original itch build plus our script overrides.

    python3 tools/patch_game.py

Inputs (all under the repo root):
  game-src/archive/   the HTML5 archive exactly as it shipped (never edited)
  game-src/lua/       replacement scripts, laid out by resource path:
                      game-src/lua/main/settings/settings.gui_script
                      replaces /main/settings/settings.gui_scriptc
  PROJECT_OVERRIDES   game.projectc settings, below

Output: game/archive/, rewritten from scratch on every run.

Each override is appended to the data file uncompressed and unencrypted, and
its index entry repointed at it. Hashes are left alone: the engine looks
resources up by them but does not re-verify the bytes on load.
"""
import json
import os
import re
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from defold_archive import lz4_block_decompress, parse_manifest, pb_fields, xtea_ctr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "game-src", "archive")
LUA = os.path.join(ROOT, "game-src", "lua")
OUT = os.path.join(ROOT, "game", "archive")
PIECE = 2097152
MAX_HASH = 64

PROJECT_OVERRIDES = {
    # Render at the device's pixel density. Off, a retina screen gets a
    # backbuffer at half resolution, upscaled.
    ("display", "high_dpi"): "1",
}

SOURCE_EXT = {".lua": ".luac", ".gui_script": ".gui_scriptc",
              ".script": ".scriptc", ".render_script": ".render_scriptc"}


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


def encode(fields):
    out = bytearray()
    for fn, wt, v in fields:
        out += varint((fn << 3) | wt)
        if wt == 0:
            out += varint(v)
        elif wt == 2:
            out += varint(len(v)) + v
        else:
            out += v
    return bytes(out)


def replace_script(module, source):
    """LuaModule.source(1) -> LuaSource.script(1): swap the script, keep the rest."""
    top = []
    for fn, wt, v in pb_fields(module):
        if fn == 1 and wt == 2:
            src = [(sfn, swt, source if sfn == 1 else sv) for sfn, swt, sv in pb_fields(v)]
            v = encode(src)
        top.append((fn, wt, v))
    return encode(top)


def read_files():
    meta = json.load(open(os.path.join(SRC, "archive_files.json")))
    files = {}
    for entry in meta["content"]:
        data = b"".join(open(os.path.join(SRC, p["name"]), "rb").read() for p in entry["pieces"])
        assert len(data) == entry["size"], entry["name"]
        files[entry["name"]] = data
    return files


def patch_projectc(text):
    newline = "\r\n" if "\r\n" in text else "\n"
    section = None
    lines = []
    for line in text.splitlines():
        m = re.match(r"\[(.+)\]", line)
        if m:
            section = m.group(1)
        else:
            key = line.split("=", 1)[0].strip()
            if (section, key) in PROJECT_OVERRIDES:
                line = "%s = %s" % (key, PROJECT_OVERRIDES[(section, key)])
        lines.append(line)
    return newline.join(lines) + newline


def overrides():
    for dirpath, _, names in os.walk(LUA):
        for name in names:
            base, ext = os.path.splitext(name)
            if ext not in SOURCE_EXT:
                continue
            path = os.path.join(dirpath, name)
            rel = os.path.relpath(path, LUA).replace(os.sep, "/")
            yield "/" + rel[: -len(ext)] + SOURCE_EXT[ext], open(path, "rb").read()


def main():
    files = read_files()
    arci = bytearray(files["game.arci"])
    arcd = bytearray(files["game.arcd"])

    manifest_path = os.path.join(SRC, "_manifest.tmp")
    open(manifest_path, "wb").write(files["game.dmanifest"])
    try:
        by_hash = parse_manifest(manifest_path)
    finally:
        os.remove(manifest_path)
    by_url = {url: h for h, url in by_hash.items()}

    _, _, _, count, entry_off, hash_off, hash_len = struct.unpack_from(">IIQIIII", arci, 0)
    index = {}
    for i in range(count):
        h = bytes(arci[hash_off + i * MAX_HASH: hash_off + i * MAX_HASH + hash_len])
        index[h] = entry_off + i * 16

    for url, source in sorted(overrides()):
        if url not in by_url:
            sys.exit("no resource %s in the archive" % url)
        pos = index[by_url[url]]
        off, size, csize, flags = struct.unpack_from(">IIII", arci, pos)
        blob = bytes(arcd[off: off + (size if csize == 0xFFFFFFFF else csize)])
        if flags & 1:
            blob = xtea_ctr(blob)
        if csize != 0xFFFFFFFF:
            blob = lz4_block_decompress(blob, size)
        new = replace_script(blob, source)
        struct.pack_into(">IIII", arci, pos, len(arcd), len(new), 0xFFFFFFFF, flags & ~1)
        arcd += new
        print("patched %s (%d bytes)" % (url, len(new)))

    files["game.arci"] = bytes(arci)
    files["game.arcd"] = bytes(arcd)
    files["game.projectc"] = patch_projectc(files["game.projectc"].decode("utf-8")).encode("utf-8")

    os.makedirs(OUT, exist_ok=True)
    for name in os.listdir(OUT):
        os.remove(os.path.join(OUT, name))
    content = []
    for name, data in files.items():
        pieces = []
        for n, start in enumerate(range(0, max(len(data), 1), PIECE)):
            piece = "%s%d" % (name, n)
            open(os.path.join(OUT, piece), "wb").write(data[start: start + PIECE])
            pieces.append({"name": piece, "offset": start})
        content.append({"name": name, "size": len(data), "pieces": pieces})
    json.dump({"content": content}, open(os.path.join(OUT, "archive_files.json"), "w"), separators=(",", ":"))
    print("wrote %s" % os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
