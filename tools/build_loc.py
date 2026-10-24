"""Build game/loc.json, the game's localisation, from game-src/loc.csv.

    python3 tools/build_loc.py           # from the committed snapshot
    python3 tools/build_loc.py --fetch   # refresh the snapshot from the sheet first

The game asked the Google Sheets v3 feed API for its strings. That API was shut
down in 2021, so game/index.html redirects the request to loc.json, which this
writes in the same feed format: one entry per row, gsx$<column> -> {"$t": text}.
"""
import csv
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(ROOT, "game-src", "loc.csv")
OUT = os.path.join(ROOT, "game", "loc.json")
SHEET_KEY = "1EiopjKihWF_t27Uhx3Vw-nhxOrTqzds8orTLurE_qpQ"

# Strings our script patches use that the sheet never had. English only; the
# game falls back to English for any empty translation.
EXTRA = {
    "RESET_PROGRESS_CONFIRM_TITLE": "Reset all progress?",
    "RESET_PROGRESS_CONFIRM_MESSAGE": "Your heroes, resources and map progress will be wiped. This cannot be undone.",
}


def main():
    if "--fetch" in sys.argv:
        url = "https://docs.google.com/spreadsheets/d/%s/export?format=csv&gid=0" % SHEET_KEY
        with urllib.request.urlopen(url) as r:
            open(CSV, "wb").write(r.read())

    rows = list(csv.reader(open(CSV, encoding="utf-8")))
    header = rows[0]
    langs = [h.lower() for h in header[2:]]
    entries = []
    seen = set()
    for r in rows[1:]:
        if not r or not r[0]:
            continue
        seen.add(r[0])
        entry = {"gsx$key": {"$t": r[0]}}
        for i, lang in enumerate(langs, start=2):
            entry["gsx$" + lang] = {"$t": r[i] if i < len(r) else ""}
        entries.append(entry)
    for key, text in EXTRA.items():
        if key in seen:
            continue
        entry = {"gsx$key": {"$t": key}}
        for lang in langs:
            entry["gsx$" + lang] = {"$t": text if lang == "en" else ""}
        entries.append(entry)

    json.dump({"feed": {"entry": entries}}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("wrote %s: %d keys, %d languages" % (os.path.relpath(OUT, ROOT), len(entries), len(langs)))


if __name__ == "__main__":
    main()
