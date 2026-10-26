# Enemy Events

A second kind of live event. Where the other events have levels worked by
hired henchmen, an enemy event has columns of enemies to fight through. It runs
on the same event system as the others ([live-events.md](./live-events.md)):
the same weekly rotation, world-map pin, header bar, event chest, event XP,
100 chapters in parts of ten and an event hero at the end of part 1. The first
is The Blackmaw Siege.

## How it plays

- **Locations are columns of enemies.** Each location is a list of four rows:
  three kinds of enemy and a boss at the bottom. A row shows the enemy's
  portrait, its name, how many are left ("×12"), a health bar and the loot it
  drops.
- **Hero powers do the fighting.** Nothing takes damage on its own. Enemies
  are hit only when a hero sent to the location fires its power. With no
  hero sent, the location waits.
  Every hit floats its damage off the row's health bar.
- **Every kill counts.** When an enemy's health runs out the count drops by
  one and the kill drops the row's loot, which bounces onto the row's loot
  icons; the next enemy then steps up with a full bar. A hit plays in beats
  so each can be read: the power's effect, then its damage floating off as
  the bar slides down, then on a kill the bar empties, the enemy reels and
  the count drops, and only then does the next enemy come in.
- **Rows open with loot.** Only a location's first row is open at the start.
  Each row below opens on the row above's main drop, tapped open once enough
  is held; the next one to open shows what it needs. Heroes only hit open
  rows. When every open row is clear they come back as the next wave.
- **Damage carries on.** Damage left over from a kill goes into the next
  enemy, and from the last enemy of a row into the next row, so a strong crew
  cuts through several enemies at a time.
- **Cleared rows go.** When a row's count reaches zero it shows "Defeated!"
  and leaves the list, which moves up.
- **Waves.** When the boss falls and the column is empty, the location's next
  wave arrives: every row back, each enemy 1.3 times tougher and every drop
  1.3 times bigger. The tab shows the wave.
- **Bosses open the way.** Each boss drops a trophy, and the next location's
  first row asks for one: the Gargoyle Gatekeeper's Gatehouse Key opens The
  Dungeons, the Great Mimic's Throne Room Key opens The Throne Hall. A newly
  opened location is stormed with a tap, like a level is explored.
- **Loot is for quests.** There is no inventory: drops are counted on their
  row and asked for by the chapter quests. What is left when the run ends is
  sold, like the other events' hauls.
- **Hero powers hit enemies.** Heroes are sent to a location as anywhere
  else. Powers that hit levels hit the enemy rows they reach, and kills they
  make drop loot the same way. Captain Hollis's Muster does nothing here.

## Cards

Every location has three pieces of event gear, worn by its whole column, as
in the other events: a charm (crit chance), a banner (crit size) and a sack
(bigger hauls). They come from the event's own chest only and level up with
Siege XP. The enemies are not cards.

## Chapters

Part 1 is written; parts 2–10 are dealt by the same seeded generator as the
other events. Quests ask for drops, for enemies of a row defeated, for a boss
beaten, for a hero sent and for a location opened. The tenth chapter
of part 1 unlocks the event hero; later parts pay more of the hero's cards,
10 per part after the first.

The event's XP is XP: its icon is the game's XP star in the event's colour
(`tools/tint_xp_star.py`), quests and the event chest pay it, and nothing
drops it.

Each part's goals are 1.5 times the last part's. Enemy health is as listed
below; only the waves grow it.

## The Blackmaw Siege

**Theme.** A monster warlord, the Blackmaw, has taken the old keep. The
garrison's last sergeant is rallying anyone who will fight.

**Quest-giver.** Sergeant Brindle, a stout old siege sergeant with a huge grey
walrus moustache, a dented kettle helmet and a brass war horn.

**Event XP.** Siege XP (a crimson XP star). **Chest.** The war chest. **Hero.** Brakka Ironjaw,
the orc siege-breaker, whose Breach knocks a share off every row's health.
**Bar colour.** Gold.

| Location | Row | Enemy | Health | Count | Drops |
|---|---|---|---|---|---|
| The Outer Bailey | 1 | 40 Rat Whiskers (50 Siege XP), 30 Bat Ears (50 Siege XP), beat Gargoyle Gatekeeper (15 gold) | 5 cards, 20 XP |
| 2 | 10 Rusty Keys (100 Siege XP), 120 Old Bones (100 Siege XP), open The Dungeons (25 XP) | 10 gold, 5 cards |
| 3 | 200 Spider Silk (200 Siege XP), defeat 24 Skeleton Guards (200 Siege XP), send a hero to The Dungeons (20 gold) | 10 cards, 50 XP |
| 4 | 300 Slime Jelly (300 Siege XP), 20 Bat Fangs (300 Siege XP), beat The Great Mimic twice (50 XP) | 20 gold, 10 cards |
| 5 | 800 Rat Whiskers (500 Siege XP), 40 Swallowed Coins (500 Siege XP), 300 Grave Dust (30 gold) | 15 cards, 100 XP |
| 6 | 40 Iron Shackles (800 Siege XP), 1,500 Spider Silk (800 Siege XP), open The Throne Hall (100 XP) | 30 gold, 15 cards |
| 7 | 250 Imp Horns (1,000 Siege XP), defeat 30 Ghouls (1,000 Siege XP), 2,500 Slime Jelly (40 gold) | 20 cards, 200 XP |
| 8 | 400 Wraith Wisps (1,500 Siege XP), 40 Brimstone (1,500 Siege XP), beat The Great Mimic 3 times (300 XP) | 50 gold, 20 cards |
| 9 | 400 Black Plate (2,500 Siege XP), 50 Cursed Candles (2,500 Siege XP), 4,000 Old Bones (60 gold) | 30 cards, 500 XP |
| 10 | beat The Blackmaw twice (100 gold), 60 Knight's Crests (40 cards), defeat 30 Black Knights (800 XP) | Brakka Ironjaw, 50 gold, 50 cards |

Every kill drops the row's first drop (3–6 or 3–5), and the second (1–2) a
quarter of the time on top. A boss drops its trophy. A row below the first
opens once the row above's first drop is held, as many as clearing the row
above is sure to drop, rounded down to ten (60, 40 and 30 in the Outer
Bailey), so clearing a row always opens the next.

**Part 1.** Rewards in brackets. Every
chapter also pays a war chest.

| Chapter | Quests | Normal chest |
|---|---|---|
| 1 | 40 Rat Whiskers (50 XP), 30 Bat Ears (50 XP), beat the Gargoyle Gatekeeper (15 gold) | 5 cards, 20 XP |
| 2 | 10 Rusty Keys (100 XP), 120 Old Bones (100 XP), open The Dungeons (25 XP) | 10 gold, 5 cards |
| 3 | 200 Spider Silk (200 XP), defeat 24 Skeleton Guards (200 XP), send a hero to The Dungeons (20 gold) | 10 cards, 50 XP |
| 4 | 300 Slime Jelly (300 XP), 20 Bat Fangs (300 XP), beat the Great Mimic twice (50 XP) | 20 gold, 10 cards |
| 5 | 800 Rat Whiskers (500 XP), 40 Swallowed Coins (500 XP), 300 Grave Dust (30 gold) | 15 cards, 100 XP |
| 6 | 40 Iron Shackles (800 XP), 1,500 Spider Silk (800 XP), open The Throne Hall (100 XP) | 30 gold, 15 cards |
| 7 | 250 Imp Horns (1,000 XP), defeat 30 Ghouls (1,000 XP), 2,500 Slime Jelly (40 gold) | 20 cards, 200 XP |
| 8 | 400 Wraith Wisps (1,500 XP), 40 Brimstone (1,500 XP), beat the Great Mimic 3 times (300 XP) | 50 gold, 20 cards |
| 9 | 400 Black Plate (2,500 XP), 50 Cursed Candles (2,500 XP), 4,000 Old Bones (60 gold) | 30 cards, 500 XP |
| 10 | beat the Blackmaw twice (100 gold), 60 Knight's Crests (40 cards), defeat 30 Black Knights (800 XP) | Brakka Ironjaw, 50 gold, 50 cards |

**Pacing.** Part 1's goals were sized for about 1 damage a second at each
location; how fast hero powers alone clear it needs a playtest.

**Changing it.** Each enemy event has a version. A save's run and chapters
from an older version start again from chapter 1.

The data is generated by `tools/build_event_data.py` from
`tools/enemy_event_content.py`, the art by `tools/gen_enemy_event_art.py`, and
Sergeant Brindle's lines are in `repController.lua`.
