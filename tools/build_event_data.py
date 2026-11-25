"""Write the live events' entries into game-src/data from one table.

    python3 tools/build_event_data.py

Each event is map 2 onwards in Map.json, with its henchmen at the end of
Henchmen.json, its gear at the end of Gear.json and its drops at the end of
Resources.json. The main game's entries are never touched: this replaces only
rows whose map_id is an event map, so it can be run again after any change
below. tools/build_gear_data.py rewrites Gear.json from the shipped file, so
run this after it.

The layout mirrors the main game. Every location has its own levels, every
level two drops of its own, the first level of each later location opens on
a drop from the one before, and every level's henchman costs that level's
drops plus crew from the level below. The last level drops only the event's
XP (Moon Shards for the Wererabbit), which quests also pay out.

The Wererabbit's tables are below. Every later event follows its numbers level
by level, with its own names from tools/event_content.py.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import event_content
import enemy_event_content

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "game-src", "data")

EVENT_MAP = 2       # the Wererabbit; the others take the maps after it

# location: name key, icon frame, levels
# level: name key, health, prereq (unit, amount), drops, henchman
# drop: id, weight, min, max
# henchman: name key, description, art key, costs [(resource, base)], crew below
LOCATIONS = [
    {
        "icon": ("main", "dungeon_warren"),
        "levels": [
            (4, ("mooncarrot", 0), [("mooncarrot", 100, 3, 6), ("moonclover", 100, 3, 5)],
             ("HENCHMEN_CARROTSMUGGLER", "Moves carrots by moonlight. Asks no questions.", "carrot_smuggler",
              [("mooncarrot", 30), ("moonclover", 20)], 0)),
            (8, ("mooncarrot", 100), [("glowworm", 100, 3, 5), ("gnawedroot", 100, 4, 8)],
             ("HENCHMEN_LANTERNBEARER", "Lights the tunnels. Mostly.", "lantern_bearer",
              [("glowworm", 30), ("gnawedroot", 50)], 1)),
            (16, ("glowworm", 1000), [("paperlantern", 20, 2, 4), ("silverfur", 100, 2, 4)],
             ("HENCHMEN_BURROWDIGGER", "Digs deeper than anyone asked.", "burrow_digger",
              [("paperlantern", 30), ("silverfur", 20)], 10)),
        ],
    },
    {
        "icon": ("map", "dungeon_silvermere"),
        "levels": [
            (8, ("paperlantern", 1000), [("moonreed", 20, 1, 3), ("snailshell", 100, 3, 5)],
             ("HENCHMEN_REEDCUTTER", "Cuts reeds. Frogs object.", "reed_cutter",
              [("moonreed", 30), ("snailshell", 20)], 0)),
            (32, ("moonreed", 100), [("moonlily", 100, 1, 3), ("moonwater", 100, 3, 5)],
             ("HENCHMEN_MOONHOWLER", "Howls. Professionally.", "moon_howler",
              [("moonlily", 30), ("moonwater", 50)], 1)),
            (128, ("moonlily", 1000), [("sunkenbell", 20, 1, 3), ("glowcap", 100, 3, 5)],
             ("HENCHMEN_BELLDIVER", "Holds his breath for a living.", "bell_diver",
              [("sunkenbell", 30), ("glowcap", 20)], 10)),
        ],
    },
    {
        "icon": ("map", "dungeon_court"),
        "levels": [
            (64, ("sunkenbell", 1000), [("runepebble", 20, 1, 3), ("thistle", 100, 3, 5)],
             ("HENCHMEN_STONEWHISPERER", "The stones tell her everything.", "stone_whisperer",
              [("runepebble", 30), ("thistle", 20)], 0)),
            (256, ("runepebble", 100), [("brambleberry", 100, 1, 3), ("goldenacorn", 20, 1, 2)],
             ("HENCHMEN_BRAMBLEKNIGHT", "Sworn to the carrot. Armed with one too.", "bramble_knight",
              [("brambleberry", 30), ("goldenacorn", 20)], 1)),
            (1024, ("goldenacorn", 1000), [("moonshard", 20, 1, 1)],
             ("HENCHMEN_WERERABBITENVOY", "Speaks for the warren, loudly.", "wererabbit_envoy",
              [("moonshard", 10)], 10)),
        ],
    },
]

# Three pieces of gear per level, like the main game's: a tool for crit chance,
# a charm for crit size and a bag for bigger hauls. They are collected from the
# event's own chests and kept from run to run, so the crews they equip grow
# with every visit. (dungeon, level): [(name, description, frame)] in that order.
GEAR_TYPES = ("critChance", "critBonus", "packSize")
GEAR_RARITY = {1: "Common", 2: "Rare", 3: "Epic"}
GEAR = {
    (1, 1): [("Carrot Crowbar", "Opens crates. Also carrots.", "event_carrot_crowbar"),
             ("Four-Leaf Pin", "Lucky, by the light of the moon.", "event_fourleaf_pin"),
             ("Smuggler's Sack", "Room for one more carrot. Always.", "event_smugglers_sack")],
    (1, 2): [("Root Pick", "Grown, not forged.", "event_root_pick"),
             ("Glowbug Charm", "The worm inside likes it there.", "event_glowbug_charm"),
             ("Root Basket", "Woven by someone with time to kill.", "event_root_basket")],
    (1, 3): [("Silver Spade", "Digs by moonlight, shines by day.", "event_silver_spade"),
             ("Lantern Locket", "A tiny lantern you can wear.", "event_lantern_locket"),
             ("Fur-Lined Satchel", "Warm inside. The loot likes that.", "event_furlined_satchel")],
    (2, 1): [("Reed Sickle", "Swish. Swish. Frog.", "event_reed_sickle"),
             ("Snail Shell Horn", "Toots the tide in.", "event_snailshell_horn"),
             ("Reed Creel", "Holds fish, reeds and the odd boot.", "event_reed_creel")],
    (2, 2): [("Moonbeam Staff", "Borrowed from the moon. Not returned.", "event_moonbeam_staff"),
             ("Lily Crown", "Smells of moonlight and pondweed.", "event_lily_crown"),
             ("Moonwater Flask", "Bottomless, nearly.", "event_moonwater_flask")],
    (2, 3): [("Diver's Hook", "For bells, mostly.", "event_divers_hook"),
             ("Bell Clapper Charm", "Rings when luck is near.", "event_bellclapper_charm"),
             ("Glowcap Net", "Glows. Do not eat.", "event_glowcap_net")],
    (3, 1): [("Rune Chisel", "Carves gossip into stone.", "event_rune_chisel"),
             ("Whispering Stone", "Knows where the good stuff is.", "event_whispering_stone"),
             ("Pebble Pouch", "Heavy, in a good way.", "event_pebble_pouch")],
    (3, 2): [("Thorn Lance", "Pointy at both ends, careful.", "event_thorn_lance"),
             ("Acorn Shield", "Golden, and a little nibbled.", "event_acorn_shield"),
             ("Berry Pannier", "Juice-stained and proud of it.", "event_berry_pannier")],
    (3, 3): [("Envoy's Sceptre", "Points at things that become yours.", "event_envoys_sceptre"),
             ("Blood Moon Medal", "Awarded for loudness.", "event_bloodmoon_medal"),
             ("Royal Coffer", "The court's taxes, now yours.", "event_royal_coffer")],
}

# id: (name key, item frame, value, batch size)
RESOURCES = {
    "mooncarrot": ("RESOURCE_MOONCARROTS", "moon_carrot", 1, 80),
    "moonclover": ("RESOURCE_MOONCLOVERS", "moon_clover", 1, 80),
    "glowworm": ("RESOURCE_GLOWWORMS", "glow_worm", 1, 60),
    "gnawedroot": ("RESOURCE_GNAWEDROOTS", "gnawed_root", 1, 100),
    "paperlantern": ("RESOURCE_PAPERLANTERNS", "paper_lantern", 2, 20),
    "silverfur": ("RESOURCE_SILVERFUR", "silver_fur", 1, 40),
    "moonreed": ("RESOURCE_MOONREEDS", "moon_reed", 2, 20),
    "snailshell": ("RESOURCE_SNAILSHELLS", "snail_shell", 1, 60),
    "moonlily": ("RESOURCE_MOONLILIES", "moon_lily", 1, 40),
    "moonwater": ("RESOURCE_MOONWATER", "moonwater", 1, 60),
    "sunkenbell": ("RESOURCE_SUNKENBELLS", "sunken_bell", 2, 20),
    "glowcap": ("RESOURCE_GLOWCAPS", "glowcap", 1, 60),
    "runepebble": ("RESOURCE_RUNEPEBBLES", "rune_pebble", 2, 20),
    "thistle": ("RESOURCE_THISTLES", "thistle", 1, 60),
    "brambleberry": ("RESOURCE_BRAMBLEBERRIES", "bramble_berry", 1, 40),
    "goldenacorn": ("RESOURCE_GOLDENACORNS", "golden_acorn", 3, 20),
    "moonshard": ("RESOURCE_MOONSHARDS", "moon_shard", 1, 40),
}


def content_event(event):
    """A later event's tables, in the Wererabbit's shape: (LOCATIONS, GEAR,
    RESOURCES) with the same numbers and the event's own names."""
    shape = event_content.SHAPE
    levels = event["levels"]
    locations = []
    for d, loc in enumerate(event["locations"], 1):
        rows = []
        for l in range(1, 4):
            i = (d - 1) * 3 + l - 1
            health, prereq, drops, costs, crew = shape[i]
            name, items, hench = levels[i]
            if prereq is None:
                pre = (items[0]["id"], 0)
            else:
                before = levels[i - 1][1]
                pre = (before[prereq[0]]["id"], prereq[1])
            table = [(item["id"], w, lo, hi) for item, (w, lo, hi, _, _) in zip(items, drops)]
            cost = [(item["id"], base) for item, base in zip(items, costs)]
            rows.append((health, pre, table, (hench["key"], hench["desc"], hench["art"], cost, crew)))
        # `main` is full, so every later event's icons live in `map`.
        locations.append({"icon": ("map", loc["icon"]), "levels": rows})
    gear = {}
    for i, pieces in enumerate(event["gear"]):
        gear[(i // 3 + 1, i % 3 + 1)] = [(g["name"], g["desc"], g["frame"]) for g in pieces]
    resources = {}
    for i, (name, items, hench) in enumerate(levels):
        for item, (_, _, _, value, batch) in zip(items, shape[i][2]):
            resources[item["id"]] = ("RESOURCE_" + item["id"].upper(), item["frame"], value, batch)
    return locations, gear, resources


def all_events():
    """(map_id, LOCATIONS, GEAR, RESOURCES) for every event, the Wererabbit first."""
    out = [(EVENT_MAP, LOCATIONS, GEAR, RESOURCES)]
    for event in event_content.EVENTS:
        if event["map_id"] != EVENT_MAP:
            out.append((event["map_id"],) + content_event(event))
    return out


def enemy_events():
    """The enemy events (tools/enemy_event_content.py), whose maps come after
    every other event's."""
    return enemy_event_content.EVENTS


def enemy_map(event):
    """A location per column: its enemy rows, top to bottom, boss last. A
    location's first row opens on the boss trophy of the location before (the
    first location's on its first drop, which is always there); every row
    after it on enough of the row above's first drop."""
    m = event["map_id"]
    dungeons = []
    for d, (rows, shape, loc) in enumerate(zip(event["rows"], enemy_event_content.SHAPE, event["locations"]), 1):
        if d == 1:
            prereq = {"unit": rows[0][1][0]["id"], "amount": 0}
        else:
            prereq = {"unit": event["rows"][d - 2][-1][1][0]["id"], "amount": 1}
        levels = []
        for r, ((enemy, drops), (health, count, kinds)) in enumerate(zip(rows, shape), 1):
            # A row below the first opens on the row above's first drop.
            if r > 1:
                _, above_count, above_kinds = shape[r - 2]
                prereq = {"unit": rows[r - 2][1][0]["id"],
                          "amount": enemy_event_content.unlock_amount(above_count, above_kinds[0][1])}
            levels.append({
                "Prereq": dict(prereq),
                "Name": enemy["key"],
                "Level": 1 if d == 1 and r == 1 else 0,
                "Health": health, "Damage": 0,
                "Loot_Table": [{"Weight": w, "Volume": 3, "Inventory": 3,
                                "Option": {"Stat": dr["id"], "Min": lo, "Max": hi}}
                               for dr, (w, lo, hi, _, _) in zip(drops, kinds)],
            })
        dungeons.append({
            "id": d, "enabled": True,
            "Name": "DUNGEON_NAME_%d_%d" % (m, d),
            "Desc": "DUNGEON_DESC_%d_%d" % (m, d),
            "Node": "", "MapY": [0.77, 0.45, 0.17][d - 1],
            "Level": 1 if d == 1 else 0,
            "Icon": {"texture": "map", "flipbook": loc["icon"]},
            "Travel Cost": 0, "Distance": 0.5,
            "Wave": 1,
            "Levels": levels,
        })
    return dungeons


def enemy_henchmen(rows, event):
    """Each row's henchman slot holds its enemy: Size is how many are left,
    EnemyCount how many a wave brings. Enemies are never hired or carded."""
    m = event["map_id"]
    for d, (enemy_rows, shape) in enumerate(zip(event["rows"], enemy_event_content.SHAPE), 1):
        for r, ((enemy, drops), (health, count, kinds)) in enumerate(zip(enemy_rows, shape), 1):
            rows.append({
                "Name": enemy["key"], "Description": enemy["key"] + "_DESC",
                # The "xN" count shows the enemy's first drop beside it.
                "Icon": {"texture": "items_drops", "flipbook": drops[0]["frame"] + "_small"},
                "Portrait": {"texture": "henchmen_portraits", "flipbook": "enemy_" + enemy["art"]},
                "Status": "Unlocked", "Rarity": "Common", "Progress": 0, "Cost": 0,
                "BuyCosts": [], "Count": 0, "Level": 1, "Rank": 1001,
                "Enemy": True, "EnemyCount": count, "Boss": r == len(enemy_rows),
                "map_id": m, "dungeon_id": d, "level_id": r,
                "Modifier": {"Type": "Speed", "Factor": 2}, "basespeed": 1,
            })


def enemy_gear(event):
    new = []
    for d, pieces in enumerate(event["gear"], 1):
        for i, (kind, g) in enumerate(zip(enemy_event_content.GEAR_TYPES, pieces), 1):
            art = {"texture": "items_gear", "flipbook": g["frame"]}
            new.append(json.dumps({
                "Name": g["name"], "Description": g["desc"], "Rarity": GEAR_RARITY[d],
                "Rank": (d - 1) * 3 + i, "Icon": art, "Portrait": art,
                "Modifier": {"Type": kind, "Factor": 2},
                # Level 0: worn by the whole column.
                "map_id": event["map_id"], "dungeon_id": d, "level_id": 0}))
    return new


def enemy_resources(event):
    m = event["map_id"]
    new, seen = [], set()
    for d, (rows, shape, loc) in enumerate(zip(event["rows"], enemy_event_content.SHAPE, event["locations"]), 1):
        for r, ((enemy, drops), (_, _, kinds)) in enumerate(zip(rows, shape), 1):
            where = {"map_id": m, "dungeon_id": d, "level_id": r}
            for dr, (_, _, _, value, batch) in zip(drops, kinds):
                if dr["id"] in seen:
                    continue
                seen.add(dr["id"])
                new.append(json.dumps({"id": dr["id"], "Name": "RESOURCE_" + dr["id"].upper(), "Value": value,
                                       "Batchsize": batch, "Icon": {"texture": "items_drops", "flipbook": dr["frame"]},
                                       "Location": where}))
            first = {"texture": "items_drops", "flipbook": drops[0]["frame"]}
            new.append(json.dumps({"id": "click%d-%d-%d" % (m, d, r), "Name": enemy["key"], "Value": 0,
                                   "Batchsize": 1, "Icon": first, "Location": where}))
            # Counts enemies of this row beaten, for the event's defeat quests.
            new.append(json.dumps({"id": "kill%d-%d-%d" % (m, d, r), "Name": enemy["key"], "Value": 0,
                                   "Batchsize": 1, "Icon": first, "Location": where}))
            new.append(json.dumps({"id": "unlockdungeon%d-%d-%d" % (m, d, r), "Name": "", "Value": 0,
                                   "Batchsize": 1, "Icon": {"texture": "map", "flipbook": loc["icon"]},
                                   "Location": where}))
        new.append(json.dumps({"id": "assignhero%d-%d" % (m, d), "Name": "", "Value": 0,
                               "Batchsize": 1, "Icon": {"texture": "main", "flipbook": "assignhero"},
                               "Location": {"map_id": m, "dungeon_id": d, "level_id": 1}}))
    # The event's XP: the XP star in the event's colour (tools/tint_xp_star.py).
    # Nothing drops it.
    new.append(json.dumps({"id": event["xp"], "Name": "RESOURCE_" + event["xp"].upper(), "Value": 0,
                           "Batchsize": 1, "Icon": {"texture": "reward_icons", "flipbook": "reward_%s_icon" % event["xp"]},
                           "Location": {"map_id": m, "dungeon_id": 1, "level_id": 1}}))
    return new


def where_dropped(locations):
    out = {}
    for d, loc in enumerate(locations, 1):
        for l, level in enumerate(loc["levels"], 1):
            for drop in level[2]:
                out.setdefault(drop[0], (d, l))
    return out


def build_map():
    path = os.path.join(DATA, "Map.json")
    maps = json.load(open(path))
    maps = maps[:EVENT_MAP - 1] + [event_map(m, locations) for m, locations, _, _ in all_events()]
    maps += [enemy_map(event) for event in enemy_events()]
    json.dump(maps, open(path, "w"), indent=1)


def event_map(map_id, locations):
    dungeons = []
    for d, loc in enumerate(locations, 1):
        levels = []
        for l, (health, (unit, amount), drops, _) in enumerate(loc["levels"], 1):
            levels.append({
                "Prereq": {"unit": unit, "amount": amount},
                "Name": "LEVEL_NAME_%d_%d_%d" % (map_id, d, l),
                "Level": 1 if d == 1 and l == 1 else 0,
                "Health": health, "Damage": 0,
                "Loot_Table": [{"Weight": w, "Volume": 3, "Inventory": 3,
                                "Option": {"Stat": s, "Min": lo, "Max": hi}}
                               for s, w, lo, hi in drops],
            })
        dungeons.append({
            "id": d, "enabled": True,
            "Name": "DUNGEON_NAME_%d_%d" % (map_id, d),
            "Desc": "DUNGEON_DESC_%d_%d" % (map_id, d),
            # Event maps have no scene nodes; the dungeon screen frames the
            # event painting at MapY, a fraction of its height from the top.
            "Node": "", "MapY": [0.77, 0.45, 0.17][d - 1],
            "Level": 1 if d == 1 else 0,
            "Icon": {"texture": loc["icon"][0], "flipbook": loc["icon"][1]},
            "Travel Cost": 0, "Distance": 0.5,
            "Levels": levels,
        })
    return dungeons


def build_henchmen():
    path = os.path.join(DATA, "Henchmen.json")
    rows = [h for h in json.load(open(path)) if h.get("map_id", 1) < EVENT_MAP]
    for map_id, locations, _, _ in all_events():
        event_henchmen(rows, map_id, locations)
    for event in enemy_events():
        enemy_henchmen(rows, event)
    json.dump(rows, open(path, "w"), indent=1)


def event_henchmen(rows, map_id, locations):
    n = len(rows) + 1
    for d, loc in enumerate(locations, 1):
        for l, (_, _, _, (name, desc, art, costs, crew)) in enumerate(loc["levels"], 1):
            buy = [{"savefile": "Resources", "index": r, "baseamount": b,
                    "message_id": "update_resources", "message": {"stat": r}} for r, b in costs]
            # Every hire also costs a Follower from the main game's pool, the
            # way a main-game hire does.
            buy.append({"savefile": "Currency", "index": "Followers", "baseamount": 1,
                        "message_id": "mod_followers", "message": {}})
            if crew:
                buy.append({"savefile": "Henchmen", "index": n - 1, "baseamount": crew,
                            "message_id": "mod_henchmen", "message": {"henchmen_id": n - 1}})
            rows.append({
                "Name": name, "Description": desc,
                "Icon": {"texture": "henchmen_portraits", "flipbook": art + "_icon"},
                "Portrait": {"texture": "henchmen_portraits", "flipbook": "event_" + art},
                "Status": "Locked", "Rarity": "Common", "Progress": 0, "Cost": 0,
                "BuyCosts": buy, "Count": 0, "Level": 0,
                # Unlocked chapter by chapter during Part 1 (closing chapter R
                # unlocks Rank R for chapter R + 1), matching the main game.
                "Rank": (d - 1) * 3 + l,
                "map_id": map_id, "dungeon_id": d, "level_id": l,
                "Modifier": {"Type": "Speed", "Factor": 2}, "basespeed": 0.5,
            })
            n += 1


def build_gear():
    """Gear.json is laid out by hand, so it is edited as lines like Resources:
    the event's one-line rows out, the new ones in before the closing bracket."""
    path = os.path.join(DATA, "Gear.json")
    lines = open(path).read().rstrip("\n").split("\n")
    keep = [ln for ln in lines if not re.search(r'"map_id": (\d+)', ln) or int(re.search(r'"map_id": (\d+)', ln).group(1)) < EVENT_MAP]
    close = max(i for i, ln in enumerate(keep) if ln.strip() == "]")
    last = close - 1
    if not keep[last].rstrip().endswith(","):
        keep[last] = keep[last].rstrip() + ","
    new = []
    for map_id, _, gear, _ in all_events():
        new += event_gear(map_id, gear)
    for event in enemy_events():
        new += enemy_gear(event)
    keep[close:close] = ["\t" + row + "," for row in new[:-1]] + ["\t" + new[-1]]
    open(path, "w").write("\n".join(keep) + "\n")


def event_gear(map_id, gear):
    new = []
    for (d, l), pieces in gear.items():
        # Staggered one chapter behind its henchman (Ranks 2..9) so closing
        # chapter 1 unlocks only the first henchman and guarantees it in the
        # chapter 1 event chest.
        rank = min(9, (d - 1) * 3 + l + 1)
        for kind, (name, desc, frame) in zip(GEAR_TYPES, pieces):
            art = {"texture": "items_gear", "flipbook": frame}
            new.append(json.dumps({
                "Name": name, "Description": desc, "Rarity": GEAR_RARITY[d],
                "Rank": rank, "Icon": art, "Portrait": art,
                "Modifier": {"Type": kind, "Factor": 2},
                "map_id": map_id, "dungeon_id": d, "level_id": l}))
    return new


def build_resources():
    """Resources.json ships with a trailing comma Defold's reader accepts, so it
    is edited as lines: event rows out, the new ones in, the rest untouched."""
    path = os.path.join(DATA, "Resources.json")
    lines = open(path).read().split("\n")
    keep = [ln for ln in lines if not re.search(r'"map_id": (\d+)', ln) or int(re.search(r'"map_id": (\d+)', ln).group(1)) < EVENT_MAP]
    close = max(i for i, ln in enumerate(keep) if ln.strip() == "]")
    new = []
    for map_id, locations, _, resources in all_events():
        new += event_resources(map_id, locations, resources)
    for event in enemy_events():
        new += enemy_resources(event)
    keep[close:close] = ["\t" + row + "," for row in new]
    open(path, "w").write("\n".join(keep))


def event_resources(map_id, locations, resources):
    drops = where_dropped(locations)
    new = []
    for rid, (name, frame, value, batch) in resources.items():
        d, l = drops[rid]
        new.append(json.dumps({"id": rid, "Name": name, "Value": value, "Batchsize": batch,
                               "Icon": {"texture": "items_drops", "flipbook": frame},
                               "Location": {"map_id": map_id, "dungeon_id": d, "level_id": l}}))
    for d, loc in enumerate(locations, 1):
        for l in range(1, len(loc["levels"]) + 1):
            where = {"map_id": map_id, "dungeon_id": d, "level_id": l}
            new.append(json.dumps({"id": "click%d-%d-%d" % (map_id, d, l), "Name": "", "Value": 0,
                                   "Batchsize": 1, "Icon": {"texture": "", "flipbook": ""},
                                   "Location": where}))
            # Counts hires on this level, for the event's hire quests.
            new.append(json.dumps({"id": "hire%d-%d-%d" % (map_id, d, l), "Name": "", "Value": 0,
                                   "Batchsize": 1, "Icon": {"texture": "", "flipbook": ""},
                                   "Location": where}))
            new.append(json.dumps({"id": "unlockdungeon%d-%d-%d" % (map_id, d, l), "Name": "",
                                   "Value": 0, "Batchsize": 1,
                                   "Icon": {"texture": loc["icon"][0], "flipbook": loc["icon"][1]},
                                   "Location": where}))
        new.append(json.dumps({"id": "assignhero%d-%d" % (map_id, d), "Name": "", "Value": 0,
                               "Batchsize": 1, "Icon": {"texture": "main", "flipbook": "assignhero"},
                               "Location": {"map_id": map_id, "dungeon_id": d, "level_id": 1}}))
    return new


if __name__ == "__main__":
    build_map()
    build_henchmen()
    build_gear()
    build_resources()
    print("event data written for", len(all_events()) + len(enemy_events()), "events")
