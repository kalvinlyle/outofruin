"""Bake the parity variant of the original build into game/_work/parity/.

    python3 tools/port/parity/build_orig.py

The variant is the normal patched archive (game-src/lua overrides, exactly as
tools/patch_game.py builds game/archive) plus one extra override: the render
script with hook/parity_hook.lua appended. The render script runs last in
every engine frame, so the hook sees the state the frame ended with.

Output (gitignored by **/_work/):
  game/_work/parity/extra/render/custom.render_script   base script + hook
  game/_work/parity/archive/                            the archive to serve

The harness serves every other file (index.html, engine JS/wasm, loc.json)
straight from game/, so only the archive differs from what players get.
"""
import json
import os
import struct
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from defold_archive import lz4_block_decompress, parse_manifest, pb_fields, xtea_ctr  # noqa: E402

# PARITY_SOURCE_ROOT bakes the original from another checkout (e.g. the main
# working tree); the output always lands in this checkout.
SOURCE_ROOT = os.path.abspath(os.environ.get("PARITY_SOURCE_ROOT", ROOT))
SRC = os.path.join(SOURCE_ROOT, "game-src", "archive")
LUA = os.path.join(SOURCE_ROOT, "game-src", "lua")
WORK = os.path.join(ROOT, "game", "_work", "parity")
EXTRA = os.path.join(WORK, "extra")
OUT = os.path.join(WORK, "archive")
HOOK = os.path.join(HERE, "hook", "parity_hook.lua")

RENDER_URL = "/render/custom.render_scriptc"
RENDER_REL = "render/custom.render_script"
MAX_HASH = 64


def archive_source(url):
    """Lua source of a script resource as it shipped in the original archive."""
    meta = json.load(open(os.path.join(SRC, "archive_files.json")))
    files = {}
    for entry in meta["content"]:
        files[entry["name"]] = b"".join(
            open(os.path.join(SRC, p["name"]), "rb").read() for p in entry["pieces"])
    tmp = os.path.join(WORK, "_manifest.tmp")
    os.makedirs(WORK, exist_ok=True)
    open(tmp, "wb").write(files["game.dmanifest"])
    try:
        by_hash = parse_manifest(tmp)
    finally:
        os.remove(tmp)
    want = {u: h for h, u in by_hash.items()}[url]
    arci, arcd = files["game.arci"], files["game.arcd"]
    _, _, _, count, entry_off, hash_off, hash_len = struct.unpack_from(">IIQIIII", arci, 0)
    for i in range(count):
        if arci[hash_off + i * MAX_HASH: hash_off + i * MAX_HASH + hash_len] == want:
            off, size, csize, flags = struct.unpack_from(">IIII", arci, entry_off + i * 16)
            blob = arcd[off: off + (size if csize == 0xFFFFFFFF else csize)]
            if flags & 1:
                blob = xtea_ctr(blob)
            if csize != 0xFFFFFFFF:
                blob = lz4_block_decompress(blob, size)
            # LuaModule.source(1) -> LuaSource.script(1)
            for fn, wt, v in pb_fields(blob):
                if fn == 1 and wt == 2:
                    for sfn, swt, sv in pb_fields(v):
                        if sfn == 1 and swt == 2:
                            return bytes(sv)
    sys.exit("no source for %s" % url)


def main():
    override = os.path.join(LUA, RENDER_REL)
    base = open(override, "rb").read() if os.path.exists(override) else archive_source(RENDER_URL)
    hook = open(HOOK, "rb").read()
    dst = os.path.join(EXTRA, RENDER_REL)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "wb").write(base.rstrip(b"\n") + b"\n\n" + hook)
    subprocess.check_call([sys.executable, os.path.join(SOURCE_ROOT, "tools", "patch_game.py"),
                           "--out", OUT, "--extra", EXTRA])


if __name__ == "__main__":
    main()
