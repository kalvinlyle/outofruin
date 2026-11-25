# Live Events

How live events work in Out of Ruin, and the events in the rotation: Night of
the Wererabbit, The Blackmaw Siege, What Sleeps in Titans Well, The Midnight
Carnival and The Longest Night.
The commitments behind them are in [direction.md](./direction.md).

## The system

- **Where events live.** Each event is a pin on the world map (an extra map in
  `Map.json`, map 2 onwards). Inside it are several locations of its own, each
  with its own levels, drops, henchmen and spot on the event's own map
  painting. The Map button opens the world map; the main game's pin ("Your
  Lands") and the live event's pin sit side by side.
- **Nothing borrowed.** An event shares the UI with the main game and nothing
  else: its henchmen, drops, quest-giver, location icons and map are its own
  art.
- **When they unlock.** Events and the Map button unlock at **Chapter 4**. By
  then the player knows tapping, hiring, the cascade and chapter quests, so an
  event is a new place to use them.
- **Schedule.** One fixed weekly schedule for everyone, starting Monday 19
  October 2026 00:00 UTC. Runs are back to back: when one ends the next begins
  at once. The rotation is a list (`actions.EVENTS`), so new events slot in as
  they are made. With five events, each comes round every fifth week.
- **Something stirs.** While an event runs, the next event's place on the
  world map shows a purple "Something stirs" pin counting down to its start.
  Tapping it gives a line hinting at what is coming, without naming it.
- **Dev menu.** On a local dev server (localhost) the world map has a DEV
  button bottom left. Its "All events live" switch puts every event's pin up;
  tapping one makes it the live event and opens it, paying nothing out, and
  each event keeps its chapter. Switching it off goes back to the schedule.
  Players never see it.
- **A run.** The event's locations, drops and crews start from nothing each
  run. Its henchmen and gear keep their unlocked status, cards and levels from
  run to run, like the main game's cards across chapters. All event henchmen
  and gear start locked (`Cards = 0`) and unlock chapter by chapter across
  Part 1 (closing chapter `R` unlocks `Rank R` for chapter `R + 1`, with gear
  staggered one chapter behind its henchman on henchman events so closing
  chapter 1 unlocks only the first henchman and guarantees it in chapter 1's
  event chest).
- **Laid out like the main game.** Every level drops two things of its own, the
  next level and the next location open on a drop from the one before, and
  every hire costs that level's drops plus crew from the level below.
- **100 chapters, a part of ten per run.** Each event is a story of 100
  chapters from its own quest-giver, in ten parts. A run plays one part.
  Finishing a part's tenth chapter ends the event for the player until it
  comes round again, when the next part begins; the event bar and the map pin
  then count down to that run, after the other events' runs. A run that ends mid-part leaves the player at the
  chapter they reached, with its quests as they were.
- **Chapters.** Three quests each. Each quest pays out when collected. Once all
  three are collected, the header replaces the quest cards with the **Start
  Chapter** button (or **Finish Part** on a part's tenth chapter) and runs the
  same chapter-close ritual as the main game: confirmation, Gorvo's sell grid
  for that event's drops (paying gold while keeping event XP/shards and
  main-game Followers), the `rank_up` fanfare, the unlock celebration screen
  for newly unlocked event henchmen and gear (or the event hero on Chapter 10),
  and the chapter's two chests. Closing any event chapter wipes event
  locations, drops, and crews or enemy waves back to Location 1 and recalls
  event heroes. Every reward is reachable by playing: no quest needs a random
  drop, a card or a purchase.
- **Part 1 is written; later parts are generated.** A seeded generator deals
  parts 2–10 from the same drops, at the same place in the part as part 1 asked
  for them, so every player gets the same chapters and none repeats an earlier
  one. Its quests are collect, tap a level, hire on a level, send a hero to a
  location, and open a location or level. Each has its own pool of the
  quest-giver's lines, and the same place in the next part takes the next
  line along. Unlock and send quests count what is already done when the
  chapter opens.
- **Two chests per chapter.** The normal chest (gold, cards, XP, as part 1 has
  it) and the event's own chest (the Wererabbit's **moon chest**), which looks
  different from every other chest and holds only that event's unlocked
  henchmen and gear cards (5 at the first chapter of a part up to 14 at the
  tenth; deeper henchmen wait for the one above them to get its first card)
  and its XP. Normal packs never hold event cards.
- **The event hero.** Part 1's tenth chapter unlocks the event's hero (players
  who already have it get 200 gold).
  Every later part's tenth chapter pays 10 cards of him per part after the
  first (10, 20 … 90), so each return levels him up.
- **Keeping a week.** Each part's goals are 1.5 times the last part's. When a
  run starts, the event levels' health is set to the crew's strength (card
  levels, plus the haul and crits of its gear, averaged geometrically, a fresh
  crew being 1) divided by that growth, never below 1. A crew built up past
  the goals hauls bigger numbers, but a part still takes about the week; a crew
  behind them has to catch up. Gold, cards and shard rewards stay as part 1
  has them, so the shards still pace the level-ups; XP grows with the square
  root of the goals.
- **Event XP.** Each event has its own: the Wererabbit's Moon Shards, and the
  enemy events' XP shown with the XP star. The Moon Shards are described here.
- **Moon Shards.** The event's XP. Quests pay them, the moon chest holds a
  few, the last level drops them, and the event's items pay them when they
  rank up, where main-game items pay XP. Event henchmen and gear level up with
  them, never with the main game's XP, so playing the event never slows the
  main crew. While the player is on the event map, the header's XP slot shows
  them. The last henchman also costs ten to hire, since its level drops only
  shards.
- **Followers.** Event hires cost Followers from the main game's pool, one per
  hire, the same as a main-game hire, on top of the level's drops. The player
  spends more Followers in the event and gets gold and XP back from its quests
  and chests.
- **Heroes.** Heroes can be sent to event locations. The main game and the
  event share one roster: the hero picker also offers heroes working on the
  other map, and picking one moves them.
- **When a run ends.** Quests finished but not collected, and the chests of a
  chapter they complete, are paid out. Leftover Moon Shards become gold (1 per
  100, up to 100), and a short message says the next event has begun.
- **Separate from chapters.** Completing a main-game chapter resets the main
  game's levels, henchmen and resources only; the event carries on.
- **Collection.** The cards screen has a Main tab and an Events tab. Events is
  one scrolling list with a titled section per event, the running or most
  recently run event first, each showing its henchmen and gear by location;
  sections scale to any number of events, where tabs would not. Each section's
  title is a bar in the event's world-map colour; the bar of the section in
  view stays pinned to the top and the next one to the bottom, pushing each
  other along as they meet, and tapping a bar glides to that section. Locked
  event henchmen and gear show which event chapter unlocks them (`Unlock at
  Chapter X`). Each event hero also shows in Main, locked until earned, naming
  its event; tapping it says how to earn it.
- **Changing an event.** Each event has a content version. A run saved under an
  older version starts over in place with nothing paid out, since its quests
  and locations no longer exist.

## Night of the Wererabbit

**Theme.** A blood moon over the forest. The wererabbits are loose.

**Quest-giver.** Old Hazel, a cackling moon-witch in a crimson shawl.

**Intro.** The first time a player opens the event in a run: "Old Hazel's
quests are up top. They pay Moon Shards, the event's XP: event cards level up
with them, never with your XP. Hires here cost Followers, the same as at home."

**Objective.** Hazel's 100 chapters, a part of ten each run. Part 1's tenth
chapter unlocks the **Human Cleric**, a hero with art and a power already in
the game but never reachable before; every later part ends with more of his
cards.

**Locations.**

| Location | Level | Health | Drops | Opens at | Henchman |
|---|---|---|---|---|---|
| Moonlit Warren | Burrow Mouth | 4 | Moon Carrots, Moon Clovers | open | Carrot Smuggler |
| | Root Tunnels | 8 | Glow Worms, Gnawed Roots | 100 Moon Carrots | Lantern Bearer |
| | Lantern Hollow | 16 | Paper Lanterns, Silver Fur | 1,000 Glow Worms | Burrow Digger |
| Silver Mere | Reedy Shore | 8 | Moon Reeds, Snail Shells | 1,000 Paper Lanterns | Reed Cutter |
| | Moon Pool | 32 | Moon Lilies, Moonwater | 100 Moon Reeds | Moon Howler |
| | Drowned Grove | 128 | Sunken Bells, Glowcaps | 1,000 Moon Lilies | Bell Diver |
| Wererabbit Court | Standing Stones | 64 | Rune Pebbles, Thistles | 1,000 Sunken Bells | Stone Whisperer |
| | Bramble Court | 256 | Bramble Berries, Golden Acorns | 100 Rune Pebbles | Bramble Knight |
| | Wererabbit Throne | 1,024 | Moon Shards | 1,000 Golden Acorns | Wererabbit Envoy |

Each level's henchman has three pieces of event gear (crit chance, crit size,
bigger hauls), e.g. Carrot Crowbar, Four-Leaf Pin and Smuggler's Sack at the
Burrow Mouth.

The data is generated by `tools/build_event_data.py` and the art packed by
`tools/pack_event_atlases.py`.

**Part 1.** Three quests a chapter. Rewards in brackets. Every chapter also
pays a moon chest.

| Chapter | Quests | Normal chest |
|---|---|---|
| 1 | 50 Moon Carrots (50 shards), 50 Moon Clovers (50 shards), 25 Glow Worms (15 gold) | 5 cards, 20 XP |
| 2 | 200 Gnawed Roots (100 shards), 1,000 Moon Carrots (100 shards), 50 Silver Fur (25 XP) | 10 gold, 5 cards |
| 3 | 100 Paper Lanterns (200 shards), 2,000 Glow Worms (200 shards), open Silver Mere (20 gold) | 10 cards, 50 XP |
| 4 | 500 Snail Shells (300 shards), 100 Moon Reeds (300 shards), 2,000 Silver Fur (50 XP) | 20 gold, 10 cards |
| 5 | 1,000 Moonwater (500 shards), 500 Moon Lilies (500 shards), 2,000 Paper Lanterns (30 gold) | 15 cards, 100 XP |
| 6 | 1,000 Glowcaps (800 shards), 200 Sunken Bells (800 shards), 3,000 Moon Reeds (100 XP) | 30 gold, 15 cards |
| 7 | open Wererabbit Court (1,000 shards), 1,000 Thistles (1,000 shards), 5,000 Moon Lilies (40 gold) | 20 cards, 200 XP |
| 8 | 300 Rune Pebbles (1,500 shards), 500 Bramble Berries (1,500 shards), 3,000 Sunken Bells (300 XP) | 50 gold, 20 cards |
| 9 | 300 Golden Acorns (2,500 shards), 20,000 Thistles (2,500 shards), 5,000 Bramble Berries (60 gold) | 30 cards, 500 XP |
| 10 | 50 Moon Shards (100 gold), 2,000 Golden Acorns (40 cards), 10,000 Rune Pebbles (800 XP) | Human Cleric, 50 gold, 50 cards |

**Pacing.** Henchmen only work while the game is open. Part 1's goals are a
first pass sized against the main game's first chapters, and the growth per
part and the health rule are a first pass too; all of it needs a playtest.

**UI.**

- **Map button:** the time left in the run, under the label.
- **World map:** first opens framed on the pins (Your Lands and the event's,
  with its name and time left), never zoomed out past the map's edges; where
  both can't fit, the event's pin is the one kept in full. It drags, and zooms
  with a pinch or the mouse wheel; the zoom and position are kept in the save
  and come back the next time it opens. Each pin's box grows to fit its text.
  Tapping a pin's label or its "!" goes straight to that map.
- **Event screen:** the map strip shows the event's own painting, framed on
  the location in focus, with up to three location tabs. The header swaps the
  chapter book for the event's own book, and a bar in the event's colour sits
  right under it with the event name, the time left in the run and the
  current chapter with how many of its quests are collected (once the part is
  done, the part finished and the time to the next). The quest cards below
  it are Hazel's quests, and the book and progress bar show the event
  chapter.

## The threat events

Every event is something that happens to the world, and the core fantasy is
adventurers called to a town in trouble. These three are enemy events
([enemy-events.md](./enemy-events.md)): the party fights through three
locations of enemies, each ending in a boss whose trophy opens the next, to
the thing behind the trouble. Each one's part 1 has the Blackmaw Siege's
quests, goals and rewards, asking for its own enemies and drops, in its
quest-giver's words, as a story from the call for help to the final
confrontation.

### What Sleeps in Titans Well

The boats of Greywater go out and do not come back, and at night the drowned
walk out of the surf. **Warden Maren Holt** sends for help. Event XP:
Warden's Favour. Chest: the tidebound chest. Hero: **Nell Hookline**, the one
fisher who hooked the Maw and lived. On the world map: the Titans Well shore.

| Location | Enemies | Boss |
|---|---|---|
| The Drowned Shore | Drowned Sailors, Pincer Horrors, Brine Ghouls | The Drowned Captain |
| The Wreck Reefs | Deep-Folk Raiders, Wreck Eels, Deep-Folk Shamans | The Sea Hag |
| The Well's Mouth | Abyssal Spawn, Grasping Tentacles, Priests of the Deep | The Abyssal Maw |

### The Midnight Carnival

A carnival appears overnight outside Hollowmere, and the people who go in
come back hollow or not at all. **Constable Edda Vane**, whose son Tam went
in, sends for help. Event XP: Constable's Favour. Chest: the masque box. Hero:
**Fizzwick Cogsworth**, the gnome who built its machines under a contract he
could not break. On the world map: the Sylvir Coast road.

| Location | Enemies | Boss |
|---|---|---|
| The Midway | Masked Barkers, Stilt-Walkers, Living Puppets | The Mirror Twin |
| The Big Top | Fire-Eaters, Knife-Throwers, Shadow Hounds | The Strongman |
| The Ringmaster's Wagon | The Contracted Dead, Clockwork Guards, Shadow Acrobats | The Ringmaster |

### The Longest Night

On midwinter's eve raiders came down from the mountain, took Fernhold's winter
stores and carried off its children for the Winter King, who stole the fire to
make the night last forever. **Elder Osric** sends for help. Event XP:
Fernhold's Favour. Chest: the hearth-stone chest. Hero: **Barnaby Hearth**,
whose inn will hold the feast, and who goes up the mountain for the children.
On the world map: the Titan Mountains.

| Location | Enemies | Boss |
|---|---|---|
| The High Pass | Winter Wolves, Frost Goblins, Raider Scouts | The Raider Chief |
| The Frozen Wood | Ice Wraiths, Snow Trolls, The Huntsman's Hounds | The Giant's Huntsman |
| The Giant's Hall | Frost Giants, Ice Golems, Priests of Winter | The Winter King |

The threat events' names, art briefs and gear are in
`tools/threat_events.py`, read through `tools/enemy_event_content.py` by
`tools/build_event_data.py`, `tools/build_loc.py` and
`tools/pack_event_atlases.py <KEY>`. Their quest-givers' lines are in
`repController.lua`.
