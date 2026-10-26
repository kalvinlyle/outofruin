"""Bring the port's assets up to the live game and list the Lua that changed.

    python3 tools/port/sync_live.py [--live DIR] [--accept]

The live game is another checkout (default: ../out-of-ruin, the main working
tree, uncommitted work included). Its archive is re-exported into
game/port/assets/. port/lua-source/ holds the Lua the TypeScript was last
translated from; every module whose live Lua differs gets a unified diff in
port/.sync/<module>.diff for porting.

--accept records the current live Lua as translated: run it once the diffs are
ported and the parity suite passes.
"""
import argparse
import difflib
import filecmp
import os
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS = os.path.join(ROOT, "game", "port", "assets")
BASE = os.path.join(ROOT, "port", "lua-source")
SYNC = os.path.join(ROOT, "port", ".sync")


def lua_files(root):
    out = set()
    for d, _, files in os.walk(root):
        for f in files:
            if f.endswith(".json"):
                continue
            out.add(os.path.relpath(os.path.join(d, f), root))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", default=os.path.join(os.path.dirname(ROOT), "out-of-ruin"))
    ap.add_argument("--accept", action="store_true")
    args = ap.parse_args()
    live_lua = os.path.join(ASSETS, "lua")

    if args.accept:
        shutil.rmtree(BASE, ignore_errors=True)
        shutil.copytree(live_lua, BASE, ignore=shutil.ignore_patterns("*.json"))
        shutil.rmtree(SYNC, ignore_errors=True)
        subprocess.check_call([sys.executable, os.path.join(ROOT, "tools", "port", "translate_check.py"), "--record"])
        print("recorded port/lua-source from game/port/assets/lua")
        return

    subprocess.check_call([sys.executable, os.path.join(ROOT, "tools", "port", "export_assets.py"),
                           "--archive", os.path.join(args.live, "game", "archive")])
    shutil.rmtree(SYNC, ignore_errors=True)
    changed = []
    for rel in sorted(lua_files(live_lua) | lua_files(BASE)):
        a, b = os.path.join(BASE, rel), os.path.join(live_lua, rel)
        if os.path.exists(a) and os.path.exists(b) and filecmp.cmp(a, b, shallow=False):
            continue
        old = open(a).read().splitlines(True) if os.path.exists(a) else []
        new = open(b).read().splitlines(True) if os.path.exists(b) else []
        out = os.path.join(SYNC, rel + ".diff")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w") as f:
            f.writelines(difflib.unified_diff(old, new, "a/" + rel, "b/" + rel))
        state = "added" if not old else "removed" if not new else "changed"
        changed.append((state, rel, len(old), len(new)))
    for state, rel, n_old, n_new in changed:
        print(f"{state:8} {rel}  ({n_old} -> {n_new} lines)")
    print(f"{len(changed)} module(s) differ from port/lua-source; diffs in port/.sync/")


if __name__ == "__main__":
    main()
