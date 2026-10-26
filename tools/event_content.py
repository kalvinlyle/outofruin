"""What each henchmen live event is made of: one table for the data builder,
the art packer and the art briefs. The enemy events are in
tools/enemy_event_content.py.

    tools/build_event_data.py    writes the data rows from it
    tools/pack_event_atlases.py  packs the art it names

Every event has the same shape, so they share the Wererabbit's numbers: three
locations of three levels, two drops a level, the second location opening on
the first's last level and so on. A level's drops are listed in the same order
as the Wererabbit's, so the first drop of a level always carries the same
weight, range, value and batch size as the Wererabbit's first drop there, and
the quests and costs that ask for it ask for the same amounts. Only the theme
changes from event to event.

Ids: a drop's id is its stat in Resources.json and the save; `frame` is its
items_drops frame; `art` keys the img/ files (items_<art>.png, -small.png). A
henchman's `art` is its henchmen_portraits key (event_<art>, <art>_icon,
<art>_icon_small) and `file` its img/henchmen key. A gear piece's frame is in
items_gear and its slug is img/gear/gear_<slug>.png.
"""

# The Wererabbit's numbers, which every event follows level by level.
# health, prereq (index of drop in the level before, amount), drops as
# (weight, min, max, value, batch), hire costs (base per drop), crew below.
SHAPE = [
    # location 1
    (4, None, [(100, 3, 6, 1, 80), (100, 3, 5, 1, 80)], (30, 20), 0),
    (8, (0, 100), [(100, 3, 5, 1, 60), (100, 4, 8, 1, 100)], (30, 50), 1),
    (16, (0, 1000), [(20, 2, 4, 2, 20), (100, 2, 4, 1, 40)], (30, 20), 10),
    # location 2
    (8, (0, 1000), [(20, 1, 3, 2, 20), (100, 3, 5, 1, 60)], (30, 20), 0),
    (32, (0, 100), [(100, 1, 3, 1, 40), (100, 3, 5, 1, 60)], (30, 50), 1),
    (128, (0, 1000), [(20, 1, 3, 2, 20), (100, 3, 5, 1, 60)], (30, 20), 10),
    # location 3
    (64, (0, 1000), [(20, 1, 3, 2, 20), (100, 3, 5, 1, 60)], (30, 20), 0),
    (256, (0, 100), [(100, 1, 3, 1, 40), (20, 1, 2, 3, 20)], (30, 20), 1),
    # The last level drops only the event's XP; it opens on the second drop of
    # the level before, the rare one.
    (1024, (1, 1000), [(20, 1, 1, 1, 40)], (10,), 10),
]


def drop(id, name, art, subject):
    return {"id": id, "name": name, "art": art, "frame": art.replace("-", "_"), "subject": subject}


def hench(key, name, desc, art, subject, icon):
    return {"key": key, "name": name, "desc": desc, "art": art, "file": art.replace("_", "-"),
            "subject": subject, "icon": icon}


def gear(name, desc, slug, subject):
    return {"name": name, "desc": desc, "slug": slug, "frame": slug.replace("-", "_"), "subject": subject}


EVENTS = [
    # ------------------------------------------------------------------
    {
        "key": "WEREMOON", "map_id": 2, "hero_id": 4, "version": 2,
        "name": "Night of the Wererabbit",
        "npc": "Hazel", "npc_name": "Old Hazel",
        "xp": "moonshard", "xp_name": "Moon Shards",
        "chest": "moon", "panel": "tinyfancypanel_red",
        "book": "chapter_book_weremoon_slice9", "map_frame": "map_weremoon",
        # The Wererabbit's data is still written by tools/build_event_data.py
        # from its own tables; only what the other events need is here.
    },
]


def by_key(key):
    for event in EVENTS:
        if event["key"] == key:
            return event
