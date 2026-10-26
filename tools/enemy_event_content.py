"""The enemy events: live events where each location is a column of enemies to
fight through rather than levels to work with hired crews.

    tools/build_event_data.py    writes the data rows from it
    tools/build_loc.py           writes its words
    tools/pack_event_atlases.py  packs the art it names (ENEMY key)

An enemy event has three locations of four rows: three kinds of enemy and a
boss at the bottom. Each row is a pack of one kind of enemy, shown with how
many are left. The front row is the one being fought: its health bar drains
as the attack lands, every kill takes one off the count and drops loot, and
damage left over from a kill carries on into the next enemy, and the next row.
A cleared row leaves the list, which moves up. When the boss falls the
location's next wave arrives, tougher and richer, and the boss's trophy opens
the next location.

Each row's numbers: (health of one enemy, how many, drops). A drop is
(weight, min, max, value, batch). An enemy row's kill draws one drop; a boss
drops its trophy, which the next location's first row asks for. The event's
XP is XP: quests and the event chest pay it, nothing drops it.

Ids follow tools/event_content.py: a drop's `frame` is its items_drops frame
and `art` its img/items key; an enemy's `art` is its henchmen_portraits frame
(enemy_<art>) and `file` its img/henchmen key; a gear piece's frame is in
items_gear and its slug is img/gear/gear_<slug>.png.
"""

COMMON = (100, 3, 6, 1, 60)
COMMON_SLOW = (100, 3, 5, 1, 60)
RARE = (25, 1, 2, 2, 20)
TROPHY = (100, 1, 1, 10, 1)

# Location by location, rows top to bottom: (health, count, drop shapes).
SHAPE = [
    [(4, 20, [COMMON, RARE]), (8, 16, [COMMON_SLOW, RARE]), (16, 12, [COMMON_SLOW, RARE]), (300, 1, [TROPHY])],
    [(6, 18, [COMMON, RARE]), (10, 14, [COMMON_SLOW, RARE]), (20, 10, [COMMON_SLOW, RARE]), (400, 1, [TROPHY])],
    [(8, 16, [COMMON, RARE]), (14, 12, [COMMON_SLOW, RARE]), (28, 8, [COMMON_SLOW, RARE]), (600, 1, [TROPHY])],
]

# A row below the first opens once the row above's first drop is held, as
# many as clearing the row above is sure to drop (every kill drops at least
# the drop's minimum), rounded down to ten. The boss opens on the third row's.
def unlock_amount(count, minimum):
    return max(10, count * minimum // 10 * 10)

# Every wave after the first: each enemy has this much more health, and every
# drop is this much bigger, so a crew that keeps pace keeps its haul.
WAVE_GROWTH = 1.3

# The gear of a location: one of each, worn by the whole column. A charm for
# crit chance, a war banner for crit size, a sack for bigger hauls.
GEAR_TYPES = ("critChance", "critBonus", "packSize")


def drop(id, name, art, subject):
    return {"id": id, "name": name, "art": art, "frame": art.replace("-", "_"), "subject": subject}


def enemy(key, name, desc, art, subject):
    return {"key": key, "name": name, "desc": desc, "art": art, "file": art.replace("_", "-"), "subject": subject}


def gear(name, desc, slug, subject):
    return {"name": name, "desc": desc, "slug": slug, "frame": slug.replace("-", "_"), "subject": subject}


EVENTS = [
    {
        "key": "BLACKMAW", "map_id": 6, "hero_id": 7, "version": 3,
        "name": "The Blackmaw Siege",
        "intro_title": "Storm the keep!",
        "intro": "Sergeant Brindle's quests are up top. Send heroes here: their powers hit the enemies, and every kill drops loot.",
        "npc": "Brindle", "npc_name": "Sergeant Brindle",
        "npc_subject": "Sergeant Brindle, a stout elderly human man, an old siege sergeant with a huge bristling grey walrus moustache, ruddy cheeks, small neat nose and bright fierce eyes, a dented iron kettle helmet with a red plume, a battered red tabard over chainmail, a curved brass war horn on a strap over his shoulder",
        "xp": "siegexp", "xp_name": "Siege XP",
        "chest": "war", "chest_name": "war chest",
        "chest_subject": "a war chest, the special siege event chest. Dark charcoal-black painted wooden planks bound by broad battered iron bands down the front corners and along the lid edge, chunky round iron rivets, a pair of crossed iron swords bolted across the lid, and a thick flat lid. A large crimson shield-shaped lock plate centred on the front with a gold star medal set in it, with a soft glint. Inside: plain empty dark charcoal wood.",
        "panel": "tinyfancypanel_gold",
        "hero": "Brakka Ironjaw",
        "map_frame": "map_blackmaw", "map_art": "blackmaw-siege",
        "book": "chapter_book_blackmaw_slice9", "book_art": "blackmaw",
        "book_emblem": "a small crimson shield emblem with two crossed iron swords on the cover",
        "book_colour": "charcoal-black leather cover with battered iron corner caps",
        "palette": "a stormy siege at dusk: charcoal stone, iron grey and soot black, with crimson banners and orange torchlight as the accent",
        "map_subject": (
            "The whole land is a dark fortress hill at stormy dusk: the palette is charcoal and slate-grey stone, sooty umber earth and dark moss, with crimson banners and tiny dots of warm orange torchlight. "
            "Rocky slopes and a dry moat frame the image on the left and right. Three sites sit one above another down the middle, joined by a thin pale winding road and stair with small dots of orange torchlight along it. "
            "Lowest, centred at 45 percent across and 78 percent down: a broken outer castle wall and a muddy courtyard with a spiked wooden gatehouse and a stone gargoyle perched on top. "
            "Middle, centred at 55 percent across and 50 percent down: the open mouth of a dungeon stair going down into the hill, iron bars, cobwebs and a few small green glows. "
            "Highest, centred at 45 percent across and 20 percent down: a tall black keep with jagged towers, ragged crimson banners and a huge throne hall glowing orange through broken windows."
        ),
        "locations": [
            {"name": "The Outer Bailey", "desc": "Where the siege begins.", "icon": "dungeon_outerbailey", "art": "outer-bailey",
             "subject": "a small chunky stone castle gatehouse with a spiked wooden gate and a little crimson banner on top, sitting on a small chunky wedge of muddy courtyard"},
            {"name": "The Dungeons", "desc": "Cells, cobwebs and things that bite.", "icon": "dungeon_thedungeons", "art": "the-dungeons",
             "subject": "a chunky stone dungeon doorway with an iron-barred gate, a dangling cobweb and a glowing green puddle at its foot"},
            {"name": "The Throne Hall", "desc": "The Blackmaw's lair.", "icon": "dungeon_thronehall", "art": "throne-hall",
             "subject": "a huge chunky black iron throne with jagged spikes on its back and a ragged crimson banner hanging behind it"},
        ],
        # Rows by location: (enemy, [drops]); the fourth row is the boss.
        "rows": [
            [
                (enemy("ENEMY_GIANTRAT", "Giant Rats", "Fat, bold and always hungry.", "giant_rat",
                       "a huge mangy giant sewer rat the size of a wolf, hunched and bristling, matted dark fur, mean little glowing red eyes, long yellow chisel teeth bared in a snarl, scarred ears, a bald scaly tail, lunging forward with dirty claws out"),
                 [drop("ratwhisker", "Rat Whiskers", "rat-whisker", "a little bundle of long stiff grey rat whiskers tied in the middle with a red string"),
                  drop("rustykey", "Rusty Keys", "rusty-key", "one big old orange-rusted iron key with a round bow")]),
                (enemy("ENEMY_CAVEBAT", "Cave Bats", "They come in clouds.", "cave_bat",
                       "a big ugly cave bat with tattered leathery wings spread wide, a squashed wrinkled snout, huge jagged ears, beady glowing yellow eyes and a mouth full of needle fangs, diving out of the dark with its claws out, screeching"),
                 [drop("batear", "Bat Ears", "bat-ear", "a pair of big pointed furry purple-grey bat ears with pink insides"),
                  drop("batfang", "Bat Fangs", "bat-fang", "two small curved white bat fangs")]),
                (enemy("ENEMY_SKELETONGUARD", "Skeleton Guards", "Still on duty. Still grumpy.", "skeleton_guard",
                       "a tall rattling skeleton guard in a dented iron helmet and a torn red tabard, empty eye sockets with cold blue pinpoint lights in them, jaw hanging open in a silent shriek, raising a notched rusty sword over its head behind a battered shield"),
                 [drop("oldbone", "Old Bones", "old-bone", "one big creamy-white cartoon bone with knobbly ends"),
                  drop("notchedblade", "Notched Blades", "notched-blade", "one short notched iron sword blade with a worn leather grip")]),
                (enemy("ENEMY_GARGOYLE", "Gargoyle Gatekeeper", "Guards the gate. Hasn't blinked in a century.", "gargoyle",
                       "a huge hulking stone gargoyle with cracked grey stone skin, curling ram horns, bat wings half spread, a jutting jaw with two big tusks, glowing orange eyes under a heavy brow, crouched on a gatehouse wall and leaning down with a furious roar, stone claws gripping the battlements"),
                 [drop("gatehousekey", "Gatehouse Keys", "gatehouse-key", "one huge ornate black iron key with a gargoyle-head bow")]),
            ],
            [
                (enemy("ENEMY_GIANTSPIDER", "Giant Spiders", "Eight legs. All of them busy.", "giant_spider",
                       "a big hairy black-and-orange giant spider with a cluster of eight glossy red eyes, dripping fangs and long jointed striped legs, rearing up on its back legs with its front legs raised to strike, webs behind it"),
                 [drop("spidersilk", "Spider Silk", "spider-silk", "a fat fluffy white ball of sticky spider silk wound on a little stick"),
                  drop("spidereye", "Spider Eyes", "spider-eye", "one glossy round shiny black spider eye like a polished bead")]),
                (enemy("ENEMY_GREENSLIME", "Green Slimes", "Wobbly. Sticky. Surprisingly fast.", "green_slime",
                       "a big oozing toxic green slime blob with a gaping gooey mouth full of half-dissolved bones and teeth, two mismatched bulging eyes floating inside it, sickly drips sliding off it and a rusty helmet sinking in its belly, surging forward"),
                 [drop("slimejelly", "Slime Jelly", "slime-jelly", "one glossy wobbly cube of bright green slime jelly"),
                  drop("swallowedcoin", "Swallowed Coins", "swallowed-coin", "a small stack of three thick gold coins dripping with green slime")]),
                (enemy("ENEMY_GHOUL", "Ghouls", "Rattle chains. Hate mornings.", "ghoul",
                       "a gaunt grey-green ghoul in a rotted prisoner's rags with a broken iron shackle and chain on one wrist, sunken glowing eyes, a long jaw of crooked sharp teeth, skeletal clawed hands reaching out, hunched and creeping forward"),
                 [drop("gravedust", "Grave Dust", "grave-dust", "a small tied cloth pouch spilling pale grey glittering dust"),
                  drop("ironshackle", "Iron Shackles", "iron-shackle", "one heavy open iron shackle on a short length of chain")]),
                (enemy("ENEMY_GREATMIMIC", "The Great Mimic", "It looked like treasure. It always does.", "great_mimic",
                       "a huge treasure-chest mimic monster, an iron-banded wooden chest whose lid is a gaping maw lined with rows of jagged teeth, a long slimy purple tongue lashing out, small mean eyes peering from under the lid, gold coins spilling from its mouth, lurching forward on stubby clawed legs"),
                 [drop("throneroomkey", "Throne Room Keys", "throneroom-key", "one huge ornate gold key with a crown-shaped bow and a red gem in it")]),
            ],
            [
                (enemy("ENEMY_IMP", "Imps", "Small, red and very rude.", "imp",
                       "a wiry red imp with a nasty sneer, small curved black horns, ragged bat wings, a barbed tail, long pointed ears and burning yellow eyes, crouched to pounce with a ball of fire crackling in one clawed hand"),
                 [drop("imphorn", "Imp Horns", "imp-horn", "one small curved glossy red imp horn"),
                  drop("brimstone", "Brimstone", "brimstone", "one chunky yellow lump of brimstone with a wisp of orange smoke")]),
                (enemy("ENEMY_WRAITH", "Wraiths", "Cold as a crypt. Twice as moody.", "wraith",
                       "a tall hooded wraith in tattered ghostly blue robes with no legs, a dark empty hood with two burning cold-white eyes, long bony claws reaching out of the sleeves, wisps of icy mist trailing off it as it lunges"),
                 [drop("wraithwisp", "Wraith Wisps", "wraith-wisp", "one glowing pale blue wisp of ghostly flame in a tiny glass jar"),
                  drop("cursedcandle", "Cursed Candles", "cursed-candle", "one stubby black candle burning with a pale blue flame")]),
                (enemy("ENEMY_BLACKKNIGHT", "Black Knights", "Heavy armour. Heavier attitude.", "black_knight",
                       "a massive knight in heavy spiked black plate armour with a horned helmet and a narrow visor glowing red from within, a torn crimson cape, raising a huge spiked iron mace, looming and menacing"),
                 [drop("blackplate", "Black Plate", "black-plate", "one dented curved piece of black steel armour plate with rivets"),
                  drop("knightcrest", "Knight's Crests", "knight-crest", "one small crimson enamel shield badge with a black horned helmet on it")]),
                (enemy("ENEMY_BLACKMAW", "The Blackmaw", "The beast on the black throne.", "blackmaw",
                       "the Blackmaw, a monstrous black-scaled dragon-like beast with an enormous gaping jaw full of jagged teeth, smoke curling from its nostrils, small burning orange eyes, curved horns, crouched on a black iron throne and roaring, a torn crimson banner in its claws"),
                 [drop("blackmawfang", "Blackmaw Fangs", "blackmaw-fang", "one huge curved black fang with a glowing orange tip")]),
            ],
        ],
        "gear": [
            [gear("Rabbit's Foot", "Luckier than the rabbit was.", "event-rabbits-foot", "a lucky rabbit's foot - a fat fluffy white rabbit's foot charm on a gold cap and chain"),
             gear("Bailey Banner", "Wave it. Hit harder.", "event-bailey-banner", "a bailey banner - a chunky little crimson war banner on a short wooden pole with a gold tassel"),
             gear("Loot Sack", "Rats carried it in. You carry it out.", "event-loot-sack", "a loot sack - a fat bulging brown canvas sack tied with rope, gold coins peeking out")],
            [gear("Mimic Tooth Charm", "Bites luck in half and keeps both.", "event-mimic-tooth-charm", "a mimic tooth charm - one big jagged white tooth on a leather cord with a gold bead"),
             gear("Jailer's Horn", "One blast and the cells empty.", "event-jailers-horn", "a jailer's horn - a chunky curved iron-banded war horn with a red cord"),
             gear("Slime-Proof Satchel", "Wipes clean. Mostly.", "event-slime-proof-satchel", "a slime-proof satchel - a fat glossy waxed leather satchel with a brass clasp and a drip of green slime on it")],
            [gear("Dragonscale Amulet", "Warm to the touch. Warmer to the luck.", "event-dragonscale-amulet", "a dragonscale amulet - one glossy black dragon scale set in a thick gold amulet on a chain"),
             gear("Warlord's Standard", "Where it goes, the army follows.", "event-warlords-standard", "a warlord's standard - a chunky tall war standard with a black horned skull emblem on a crimson banner"),
             gear("Hoard Chest", "The Blackmaw's savings. Now yours.", "event-hoard-chest", "a hoard chest - a squat black iron-bound chest overflowing with gold coins and red gems")],
        ],
    },
]

# The threat events (tools/threat_events.py) are enemy events too; every tool
# reads them from here, in map order.
import threat_events
EVENTS = sorted(EVENTS + threat_events.EVENTS, key=lambda event: event["map_id"])
