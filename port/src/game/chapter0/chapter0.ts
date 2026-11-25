/* Chapter 0: the first-time experience. A new game opens on the Farmyard alone,
with no heroes, no other locations and no quests. The game points the player at
each thing to do, one at a time: search the Farmyard, then hire a Farm Hand.
The first hire brings in Thjorlak's three quests, and finishing them closes the
chapter into Chapter 1, where the game as it shipped begins.

A save is in chapter 0 while Stats.Chapter0 is true. Only a new game sets it
(it is in the Stats defaults), so saves from before chapter 0 existed never see
it. Chapter 0 runs on Rank 1 and lends the chapter's first slot of
Ranks: that slot holds the block below until the chapter closes, and then
Chapter 1's own quests from Ranks.json. */
import defsave_ from '../defsave/defsave';
import { literal } from '../../lua';

const defsave: any = defsave_;

const FARMHAND = 1;
const RATCATCHER = 2;

function gold(amount: number) {
  return literal({
    post: "spawn_particles",
    message: literal({
      num: amount, endTarget: "target_gold", time: 1,
      icon: literal({ texture: "main", flipbook: "coin_spin" }),
      postmsg: literal({ message_id: "mod_gold", message: literal({ amount: 1 }) }),
    }),
  });
}

// Quest text is stored as written, the way Ranks.json stores it.
function quest(type: string, goal: number, stat: string, reward: number, intro: string, outro: string) {
  return literal({
    Type: type, Goal: goal, statName: stat,
    Reward: literal({ texture: "reward_icons", flipbook: "reward_gold_icon", desc: "Tap to collect " + reward + " Gold!" }),
    RewardMsgs: [gold(reward)],
    Story_Int: literal({ NPC: "Thjorlak", Text: intro }),
    Story_Ext: literal({ NPC: "Thjorlak", Text: outro }),
  });
}

/** The chapter as a Ranks.json entry, before the rep controller fills in its quests. */
export function rank_block() {
  return literal({
    Rank: 1, Chapter0: true, Icon: "Icon_Rank_001", RepNeeded: 3,
    RewardMsgs: [],
    Quests: [
      quest("QUEST_TYPE_HIRE", 5, "hire1-1-1", 10,
        "Something is digging under my farm. Hire more hands to search the fields before it gets out!",
        "Good. Now listen... can you hear the scratching under the barn?"),
      quest("QUEST_TYPE_UNLOCK", 1, "unlockdungeon1-1-2", 15,
        "The scratching comes from the old cellar. Gather carrots to bait the way in, then break the door open.",
        "Rats! Hundreds of them, and something bigger in the dark behind them."),
      quest("QUEST_TYPE_HIRE", 1, "hire1-1-2", 25,
        "My hands won't go down there alone. Hire a Rat Catcher to hold the cellar.",
        "The cellar holds. But the tunnels run deeper than any farm should. Your real work starts now."),
    ],
  });
}

export const ENABLED = false;

function stats() { return defsave.loaded.Stats?.data; }

export function active(): boolean {
  if (!ENABLED) return false;
  const s = stats();
  return !!s && s.Chapter0 === true;
}

/** The quests appear once the first Farm Hand is hired. */
export function quests_shown(): boolean {
  const s = stats();
  return !active() || (!!s && s.Chapter0Quests === true);
}

export function show_quests() {
  if (!active() || quests_shown()) return;
  defsave.set("Stats", "Chapter0Quests", true);
  defsave.save("Stats", true);
}

/* Bram, the Squire, is the hero a new game owns. Chapter 0 keeps him locked,
and closing it gives him to the player with the new-hero screen. */
const SQUIRE = "HERO_HUMANSQUIRE_NAME";

export function hero_index(): number | undefined {
  const heroes = defsave.loaded.Hero?.data;
  if (!heroes) return undefined;
  const i = heroes.findIndex((h: any) => h && h.Name === SQUIRE);
  return i >= 0 ? i + 1 : undefined;
}

/** Locks Bram while chapter 0 runs, or unlocks him if chapter 0 is disabled. Safe to call before the saves are loaded. */
export function lock_hero(): boolean {
  const h = hero_index();
  if (h === undefined) return false;
  const hero = defsave.loaded.Hero.data[h - 1];
  if (active()) {
    if (hero.Locked === true) return false;
    hero.Locked = true;
    defsave.save("Hero", true);
    return true;
  }
  if (!ENABLED && hero.Locked === true) {
    hero.Locked = false;
    defsave.save("Hero", true);
    return true;
  }
  return false;
}

/** Close the chapter: Chapter 1 runs on the same rank, so only the flags go. */
export function finish() {
  defsave.set("Stats", "Chapter0", false);
  defsave.set("Stats", "Chapter0Quests", undefined);
}

function henchman(id: number) { return defsave.loaded.Henchmen?.data?.[id - 1]; }
function level(l: number) { return defsave.loaded.Map?.data?.[0]?.[0]?.Levels?.[l - 1]; }

/* What the game points at now. Worked out from the save every time it is
asked, so a reload lands on the same step.
  tap      search a level (level 1 or 2)
  hire     hire on a level
  explore  open the Farmyard, or the Cellar once it can be opened
  quest    read the waiting quest
  collect  collect a finished quest
  rankup   close the chapter
can_hire answers whether at least one of a henchman can be hired now. */
export type Step = { kind: "tap" | "hire" | "explore" | "quest" | "collect" | "rankup"; level?: number; text: string };

export function step(can_hire: (henchmen_id: number) => boolean): Step | undefined {
  if (!active()) return undefined;
  const farmhand = henchman(FARMHAND);
  if (!quests_shown()) {
    // Every Farm Hand past the free one was hired.
    if (farmhand && farmhand.Size > 1) return undefined;
    if (level(1)?.wasClickedOpen !== true) return { kind: "explore", level: 1, text: "CH0_EXPLORE_FARMYARD" };
    return can_hire(FARMHAND) ? { kind: "hire", level: 1, text: "CH0_HIRE" } : { kind: "tap", level: 1, text: "CH0_TAP" };
  }
  const rank = defsave.loaded.Ranks?.data?.[0];
  if (!rank || rank.Chapter0 !== true) return undefined;
  if (stats().Rep >= rank.RepNeeded) return { kind: "rankup", text: "CH0_RANKUP" };
  const current = rank.Quests.find((q: any) => q.Status !== "Collected");
  if (!current) return undefined;
  if (current.Status === "New") return { kind: "quest", text: "CH0_QUEST" };
  if (current.Status === "Completed") return { kind: "collect", text: "CH0_COLLECT" };
  if (current.statName === "unlockdungeon1-1-2") {
    const cellar = level(2);
    if (cellar && cellar.State === "Explorable" && cellar.wasClickedOpen !== true
      && (defsave.loaded.Resources.data.carrot?.Count ?? 0) >= cellar.Prereq.amount) {
      return { kind: "explore", level: 2, text: "CH0_EXPLORE" };
    }
  } else if (current.statName === "hire1-1-2") {
    return can_hire(RATCATCHER) ? { kind: "hire", level: 2, text: "CH0_HIRE_RATCATCHER" } : { kind: "tap", level: 2, text: "CH0_TAP_CELLAR" };
  }
  return undefined;
}

export default { ENABLED, rank_block, active, quests_shown, show_quests, finish, step, hero_index, lock_hero };
