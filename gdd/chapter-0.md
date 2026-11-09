# Chapter 0

Chapter 0 is the first-time experience.
It is modelled on AdVenture Communist's opening ranks:
a guided start with one thing on screen at a time, then a short quest list that hands over to the chapters.

Code: `port/src/game/chapter0/` (state, quests and the pointer).
The rep controller, henchmen controller, dungeon screen and header each carry a few lines that defer to it.

## What the player sees

A new game opens on Chapter 0 at the Local Farm, with only the Farmyard.
Nothing else is on screen:

- no hero: Bram, the Squire a new game owns, is locked until Chapter 1
- no other location tabs
- no buy-amount toggle (hires go at the default amount)
- no quest notice until the first hire

## Guided opening

The game points at one thing at a time.
A gold frame pulses round the control and a caption says what to do:

1. Tap to explore the Farmyard (the level's explore button).
2. Press the Farmyard's play button to search it, until a Farm Hand can be afforded.
3. Hire a Farm Hand.

The first hire brings in Thjorlak's quest notice.

## Quests

Three quests, all required, one at a time, each with Thjorlak's lines:

1. Hire 5 Farm Hands (10 gold).
2. Unlock the Cellar (15 gold).
3. Hire a Rat Catcher (25 gold).
   A Rat Catcher costs a Farm Hand, which teaches that henchmen are trained from the level above.

The pointer keeps going through the quests.
It frames a new notice, a finished quest, the Cellar's door once it can be opened, the Cellar to search, and the Rat Catcher hire.

## Closing the chapter

With all three quests collected, the pointer frames the chapter button: "Start Chapter 1".
Closing chapter 0 skips the sell screen, because there is nothing worth selling yet.
It resets the farm the way any chapter close does (henchmen back to one each, stores emptied, followers to zero).
Chapter 1 opens on the new-hero screen giving the player Bram, then the hero slot is there for him.

## How it is stored

- `Stats.Chapter0` is true only in a new game's default stats, so saves from before chapter 0 never enter it.
- `Stats.Chapter0Quests` records that the first hire has been made.
- Bram's hero record is locked while chapter 0 runs, and the close unlocks him through the usual `unlock_hero` message.
- Chapter 0 runs on Rank 1 and borrows the first slot of the Ranks save until it closes.
  Closing it puts Chapter 1's quests from `Ranks.json` in that slot and keeps the rank number.
- Hires on the Farm's first location are counted (`hire1-1-1` to `hire1-1-5` in `Resources.json`) only while chapter 0 is running.
  So is opening a level past a location's first (the Cellar's `unlockdungeon1-1-2`), which the game otherwise counts only for first levels.
- Closing chapter 0 sends the usual chapter-close message with `rank: 0` and `chapter0: true`.
  Analytics records it as chapter 0.
