"""Report which shipped Lua modules have a TypeScript translation, and which
changed since they were translated.

    python3 tools/port/translate_check.py [--record]

Each Lua file in game/port/assets/lua/ maps to port/src/game/<path>.ts, with
.lua / .gui_script / .script / .render_script dropped from the name except for
script files, which keep it (kingdom.gui_script.ts). The sha256 of the Lua each
translation was made from is kept in port/translated.json; --record stores the
current hashes for every module that has a translation.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LUA = ROOT / 'game/port/assets/lua'
GAME = ROOT / 'port/src/game'
RECORD = ROOT / 'port/translated.json'
# Handled by the engine itself rather than translated.
ENGINE_OWNED = {'render/custom.render_script'}


def ts_path(rel: str) -> Path:
    if rel.endswith('.lua'):
        return GAME / (rel[:-4] + '.ts')
    return GAME / (rel + '.ts')


def main():
    record = json.loads(RECORD.read_text()) if RECORD.exists() else {}
    rows = []
    for f in sorted(LUA.rglob('*')):
        if f.is_dir() or f.suffix == '.json':
            continue
        rel = f.relative_to(LUA).as_posix()
        if rel in ENGINE_OWNED:
            continue
        sha = hashlib.sha256(f.read_bytes()).hexdigest()
        ts = ts_path(rel)
        if not ts.exists():
            status = 'missing'
        elif rel not in record:
            status = 'unrecorded'
        elif record[rel] != sha:
            status = 'stale'
        else:
            status = 'ok'
        rows.append((status, rel, sha, ts.exists()))

    if '--record' in sys.argv:
        for status, rel, sha, exists in rows:
            if exists:
                record[rel] = sha
        RECORD.write_text(json.dumps(record, indent=1, sort_keys=True) + '\n')
        return 0

    counts = {}
    for status, rel, _, _ in rows:
        counts[status] = counts.get(status, 0) + 1
        if status != 'ok':
            print(f'{status:10} {rel}')
    print(' '.join(f'{k}={v}' for k, v in sorted(counts.items())))
    return 1 if counts.get('missing') or counts.get('stale') else 0


if __name__ == '__main__':
    sys.exit(main())
