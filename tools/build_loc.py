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
    "SHOP_BUY_GOLD": "Buy Gold",
    "SHOP_UNAVAILABLE": "Not available yet",
    # Level-up confirmation on the upgrade card screen.
    "UPGRADE_CONFIRM_TO": "Upgrade to level %1",
    "UPGRADE_CONFIRM_BUTTON": "Upgrade",
    "SHOP_PURCHASE_FAILED_TITLE": "Purchase didn't go through",
    "SHOP_PURCHASE_FAILED_MESSAGE": "You haven't been charged. Please try again in a moment.",
    # World map and live events.
    "WORLDMAP_HOME": "Home",
    "EVENT_ENDS_IN": "Ends in %1",
    "EVENT_TIER_LABEL": "Chapter",
    "EVENT_QUEST_TIER": "Chapter %1 - %2 / %3 quests",
    "EVENT_PART_DONE": "Part %1 complete!",
    "EVENT_NEXT_PART_IN": "Next part in %1",
    "EVENT_COMPLETE": "Every chapter complete!",
    "EVENT_OVER_TITLE": "The event has ended",
    "QUEST_TYPE_TAP": "Tap",
    "QUEST_TYPE_HIRE": "Hire",
    "QUEST_TYPE_SEND": "Send a hero to",
    "CARDS_TAB_MAIN": "Main",
    "CARDS_TAB_EVENTS": "Events",
    "CARDS_EVENT_LOCK": "Event hero",
    "EVENT_CHEST_SHARDS": "The event's XP: level up event cards with them.",
    "SHARDS": "Shards",
    "CARDS_EVENT_CHEST": "In event chests",
    "HERO_HUMANCLERIC_UNLOCK": "Earned in the Night of the Wererabbit event: finish part 1 of Old Hazel's chapters. Every later part pays more of his cards.",
    "EVENT_WEREMOON_NAME": "Night of the Wererabbit",
    "EVENT_WEREMOON_INTRO_TITLE": "The blood moon rises",
    "EVENT_WEREMOON_INTRO": "Old Hazel's quests are up top. They pay Moon Shards, the event's XP: event cards level up with them, never with your XP. Hires here cost Followers, the same as at home.",
    "DUNGEON_NAME_2_1": "Moonlit Warren",
    "DUNGEON_DESC_2_1": "A warren under the blood moon.",
    "DUNGEON_NAME_2_2": "Silver Mere",
    "DUNGEON_DESC_2_2": "A lake where the moon sleeps.",
    "DUNGEON_NAME_2_3": "Wererabbit Court",
    "DUNGEON_DESC_2_3": "Where the wererabbits hold court.",
    "LEVEL_NAME_2_1_1": "Burrow Mouth",
    "LEVEL_NAME_2_1_2": "Root Tunnels",
    "LEVEL_NAME_2_1_3": "Lantern Hollow",
    "LEVEL_NAME_2_2_1": "Reedy Shore",
    "LEVEL_NAME_2_2_2": "Moon Pool",
    "LEVEL_NAME_2_2_3": "Drowned Grove",
    "LEVEL_NAME_2_3_1": "Standing Stones",
    "LEVEL_NAME_2_3_2": "Bramble Court",
    "LEVEL_NAME_2_3_3": "Wererabbit Throne",
    "HENCHMEN_CARROTSMUGGLER": "Carrot Smuggler",
    "HENCHMEN_LANTERNBEARER": "Lantern Bearer",
    "HENCHMEN_BURROWDIGGER": "Burrow Digger",
    "HENCHMEN_REEDCUTTER": "Reed Cutter",
    "HENCHMEN_MOONHOWLER": "Moon Howler",
    "HENCHMEN_BELLDIVER": "Bell Diver",
    "HENCHMEN_STONEWHISPERER": "Stone Whisperer",
    "HENCHMEN_BRAMBLEKNIGHT": "Bramble Knight",
    "HENCHMEN_WERERABBITENVOY": "Wererabbit Envoy",
    "RESOURCE_MOONSHARDS": "Moon Shards",
    "RESOURCE_MOONCARROTS": "Moon Carrots",
    "RESOURCE_MOONCLOVERS": "Moon Clovers",
    "RESOURCE_GLOWWORMS": "Glow Worms",
    "RESOURCE_GNAWEDROOTS": "Gnawed Roots",
    "RESOURCE_PAPERLANTERNS": "Paper Lanterns",
    "RESOURCE_SILVERFUR": "Silver Fur",
    "RESOURCE_MOONREEDS": "Moon Reeds",
    "RESOURCE_SNAILSHELLS": "Snail Shells",
    "RESOURCE_MOONLILIES": "Moon Lilies",
    "RESOURCE_MOONWATER": "Moonwater",
    "RESOURCE_SUNKENBELLS": "Sunken Bells",
    "RESOURCE_GLOWCAPS": "Glowcaps",
    "RESOURCE_RUNEPEBBLES": "Rune Pebbles",
    "RESOURCE_THISTLES": "Thistles",
    "RESOURCE_BRAMBLEBERRIES": "Bramble Berries",
    "RESOURCE_GOLDENACORNS": "Golden Acorns",
    # The Human Cleric shipped with art and a power but no words; the first
    # event's top reward brings them into the game.
    "HERO_HUMANCLERIC_NAME": "Brother Wren",
    "HERO_HUMANCLERIC_DESC": "A cleric who blesses the dungeon so every hero works faster.",
    "HERO_HUMANCLERIC_QUOTE": "Bless this mess.",
    "HERO_HUMANCLERIC_STORY": "Brother Wren walked out of the blood moon with a lantern and a lot of opinions about rabbits.",
    # The hero roster under a dungeon's map, and its hero details.
    "HEROES_PANEL_TITLE": "Heroes",
    "HEROES_PANEL_HINT": "Hold a hero and drag it onto a slot",
    "HEROES_DONE": "Done",
    "HERO_TAG_FREE": "Free",
    "HERO_TAG_HERE": "In this dungeon",
    "HERO_TAG_AT": "At %1",
    "HERO_ASSIGN": "Assign",
    "HERO_REMOVE": "Remove",
    "HERO_CLOSE": "Close",
    "HERO_SLOTS_FULL": "Slots full",
    "HERO_MOVE_TITLE": "Move %1?",
    "HERO_MOVE_TEXT": "%1 is working at %2. Moving them here leaves that slot empty.",
    "RARITY_COMMON": "Common",
    "RARITY_RARE": "Rare",
    "RARITY_EPIC": "Epic",
    "RARITY_LEGENDARY": "Legendary",
    "VIRTUE_WRATH": "Wrath",
    "VIRTUE_GREED": "Greed",
    "VIRTUE_ZEAL": "Zeal",
    "VIRTUE_STASIS": "Stasis",
    "VIRTUE_REASON": "Reason",
    "VIRTUE_EMPATHY": "Empathy",
    "HERO_DWARFDRUID_POWER1_DESC": "Lightning strikes the deepest open level of this dungeon.",
    "HERO_ELFMERC_POWER1_DESC": "A heavy blow to the deepest level opened here.",
    "HERO_GOLBINASSASSIN_POWER1_DESC": "Steals a pack of this dungeon's loot.",
    "HERO_HUMANCLERIC_POWER1_DESC": "Blesses the dungeon so every power here charges faster.",
    "HERO_HUMANSQUIRE_POWER1_DESC": "Strikes the first level of this dungeon.",
    "HERO_GRISLAHEXMIRE_POWER1_DESC": "Hexes the dungeon so every other source of damage hits harder.",
    "HERO_BRAKKAIRONJAW_POWER1_DESC": "Smashes off a share of each level's health, so it stays strong deep down.",
    "HERO_NELLHOOKLINE_POWER1_DESC": "Reels in surprise catches, mostly junk to sell.",
    "HERO_OLDMOSSBACK_POWER1_DESC": "Instantly finishes levels that are nearly cleared.",
    "HERO_FIZZWICKCOGSWORTH_POWER1_DESC": "A turret that deals steady damage without pause.",
    "HERO_MADAMEOTTOLINE_POWER1_DESC": "Turns this dungeon's most common drop into its rarest.",
    "HERO_CAPTAINHOLLIS_POWER1_DESC": "Hires henchmen here for free.",
    "HERO_LADYVESPER_POWER1_DESC": "Repeats another hero's power.",
    "HERO_THUMPER_POWER1_DESC": "A chain of hops that hits harder at every level it lands on.",
    "HERO_WRENLIGHTFOOT_POWER1_DESC": "Pushes a chapter quest forward.",
}


def event_strings():
    """The later events' names, from tools/event_content.py, and what every
    event says on the world map, at its end and when its XP runs short."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import event_content
    out = {
        "WORLDMAP_STIRS": "Something stirs",
        "WORLDMAP_STIRS_IN": "Starts in %1",
        "WORLDMAP_STIRS_TITLE": "Something stirs...",
        "EVENT_WEREMOON_OVER": "Rewards for quests you finished are in the chest, and leftover Moon Shards became gold. Your crew, gear and chapter are kept for next time. A new event has begun!",
        "EVENT_WEREMOON_NEED_XP": "Not enough Moon Shards. Quests, event chests and item rank-ups in the event pay them.",
        "EVENT_WEREMOON_TEASER": "The moon is turning red, and something is digging under the forest. Hear that? Thump. Thump. Thump.",
        "EVENT_TITANSWELL_TEASER": "The fishing boats of Greywater went out and did not come back. At night the surf brings in something that walks.",
        "EVENT_MIDNIGHT_TEASER": "Lanterns have been seen in the fields outside Hollowmere where nothing stood the night before, and music that no one is playing.",
        "EVENT_LONGNIGHT_TEASER": "The nights are growing longer in the mountains, and in Fernhold they have started barring the doors before dark.",
        "HERO_NELLHOOKLINE_UNLOCK": "Earned in What Sleeps in Titans Well: finish part 1 of Warden Holt's chapters. Every later part pays more of her cards.",
        "HERO_FIZZWICKCOGSWORTH_UNLOCK": "Earned in The Midnight Carnival: finish part 1 of Constable Vane's chapters. Every later part pays more of his cards.",
        "HERO_BARNABYHEARTH_UNLOCK": "Earned in The Longest Night: finish part 1 of Elder Osric's chapters. Every later part pays more of his cards.",
    }
    for event in event_content.EVENTS:
        key, m = event["key"], event["map_id"]
        if "locations" not in event:
            continue
        out["EVENT_%s_NAME" % key] = event["name"]
        out["EVENT_%s_INTRO_TITLE" % key] = event["intro_title"]
        out["EVENT_%s_INTRO" % key] = event["intro"]
        out["EVENT_%s_OVER" % key] = ("Rewards for quests you finished are in the chest, and leftover %s became gold. "
                                      "Your crew, gear and chapter are kept for next time. A new event has begun!" % event["xp_name"])
        out["EVENT_%s_NEED_XP" % key] = ("Not enough %s. Quests, event chests and item rank-ups in the event pay them."
                                         % event["xp_name"])
        for d, loc in enumerate(event["locations"], 1):
            out["DUNGEON_NAME_%d_%d" % (m, d)] = loc["name"]
            out["DUNGEON_DESC_%d_%d" % (m, d)] = loc["desc"]
        for i, (name, drops, hench) in enumerate(event["levels"]):
            out["LEVEL_NAME_%d_%d_%d" % (m, i // 3 + 1, i % 3 + 1)] = name
            out[hench["key"]] = hench["name"]
            for drop in drops:
                out["RESOURCE_" + drop["id"].upper()] = drop["name"]
    return out


def enemy_event_strings():
    """The enemy events' words, from tools/enemy_event_content.py, and what
    their rows and quests say."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import enemy_event_content
    out = {
        "QUEST_TYPE_DEFEAT": "Defeat",
        "ENEMY_BOSS": "Boss",
        "ENEMY_DEFEATED": "Defeated!",
        "ENEMY_WAVE": "Wave %1",
        "ENEMY_NEW_WAVE": "Wave %1 is coming!",
        "ENEMY_STORM": "Tap to storm in",
        "ENEMY_UNLOCK_MESSAGE": "Beat %1 to open %2",
        "HERO_BRAKKAIRONJAW_DESC": "An orc siege-breaker who smashes a share off every level's health.",
        "HERO_BRAKKAIRONJAW_STORY": "Brakka Ironjaw broke the Blackmaw's gate with her ram, then broke the ram on the Blackmaw.",
        "HERO_BRAKKAIRONJAW_UNLOCK": "Earned in The Blackmaw Siege event: finish part 1 of Sergeant Brindle's chapters. Every later part pays more of her cards.",
        "EVENT_BLACKMAW_TEASER": "Smoke is rising from the old keep on the hill, and war drums are beating behind its walls. Something with very big jaws has moved in.",
    }
    for event in enemy_event_content.EVENTS:
        key, m = event["key"], event["map_id"]
        out["EVENT_%s_NAME" % key] = event["name"]
        out["EVENT_%s_INTRO_TITLE" % key] = event["intro_title"]
        out["EVENT_%s_INTRO" % key] = event["intro"]
        out["EVENT_%s_OVER" % key] = ("Rewards for quests you finished are in the chest, and leftover %s became gold. "
                                      "Your gear and chapter are kept for next time. A new event has begun!" % event["xp_name"])
        out["EVENT_%s_NEED_XP" % key] = "Not enough %s. Quests and event chests pay it." % event["xp_name"]
        out["RESOURCE_" + event["xp"].upper()] = event["xp_name"]
        for d, loc in enumerate(event["locations"], 1):
            out["DUNGEON_NAME_%d_%d" % (m, d)] = loc["name"]
            out["DUNGEON_DESC_%d_%d" % (m, d)] = loc["desc"]
        for rows in event["rows"]:
            for enemy, drops in rows:
                out[enemy["key"]] = enemy["name"]
                out[enemy["key"] + "_DESC"] = enemy["desc"]
                for drop in drops:
                    out["RESOURCE_" + drop["id"].upper()] = drop["name"]
    return out


EXTRA.update(event_strings())
EXTRA.update(enemy_event_strings())


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
        # The sheet has rows that were never written (the Human Cleric's);
        # EXTRA fills their English.
        if r[0] in EXTRA and not entry["gsx$en"]["$t"]:
            entry["gsx$en"]["$t"] = EXTRA[r[0]]
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
