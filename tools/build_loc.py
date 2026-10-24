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
    # Shop info pages. Placeholders must stand alone between spaces: the game
    # only substitutes whole words, so "%1." would never be replaced.
    "SHOP_INFO_CARDS": "A pack of %1 random cards for your heroes, henchmen and gear. Duplicates fill a card's progress, and full cards can be upgraded with XP.",
    "SHOP_INFO_XP": "%1 XP to spend on upgrading heroes, henchmen and gear once their cards are full.",
    "SHOP_INFO_TIME": "Your henchmen and followers instantly earn %1 worth of progress.",
    "SHOP_INFO_GOLD": "%1 gold to spend here in the shop on card packs, XP and time skips.",
    "SHOP_ONE_HOUR": "an hour's",
    "SHOP_HOURS": "%1 hours'",
    "SHOP_PRICE_GOLD": "%1 Gold",
    "SHOP_BUY_FOR_GOLD": "Buy for %1 Gold",
    "SHOP_BUY": "Buy",
    "SHOP_BUY_FOR": "Buy for %1",
    "SHOP_CANCEL": "Cancel",
    "SHOP_NOT_ENOUGH_GOLD": "Not enough gold",
    "SHOP_UNAVAILABLE": "Not available yet",
    "SHOP_PURCHASE_FAILED_TITLE": "Purchase didn't go through",
    "SHOP_PURCHASE_FAILED_MESSAGE": "You haven't been charged. Please try again in a moment.",
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
