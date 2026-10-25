// Out of Ruin positioning data. Positions are EDITORIAL (0-100), scored from
// each game's player promise and how it is typically played; the sourced depth
// lives in competitor-research/<slug>.md.
//
// X — Collection & RPG depth: how much of the game is building a roster of
// heroes, units and gear.
//   0 pure numbers · 25 a few upgrade cards · 50 a managed roster with
//   modifiers · 75 heroes plus gear plus synergies · 100 full hero-collector
//   team building.
//
// MOD (Y) — Fairness to free players: can a player who never pays reach
// everything by playing?
//   0 power is sold and spenders dominate · 25 heavy spend walls and VIP ·
//   50 paying mostly speeds you up, some competitive gaps · 75 everything
//   earnable, ads optional · 100 no meaningful power for sale.
//
// SIZE — reach (1-100, log-shaped cumulative players / cultural footprint).

window.CHART_DATA = (() => {
const CATEGORIES = [
  { id: "tycoon", label: "Tycoon / production idlers", color: "var(--c-a)" },
  { id: "taprpg", label: "Tap-to-fight RPG", color: "var(--c-b)" },
  { id: "collector", label: "Idle hero collectors", color: "var(--c-c)" },
  { id: "indie", label: "Indie / web idle classics", color: "var(--c-d)" },
];

const GAMES = [
  { name: "Cookie Clicker", year: 2013, x: 8, mod: 95, size: 90, cat: "indie",
    liked: "Humour, achievements and endless discovery",
    pain: "Late game turns into waiting" },
  { name: "AdVenture Capitalist", year: 2014, x: 12, mod: 60, size: 75, cat: "tycoon",
    liked: "The prestige-reset template and its jokes",
    pain: "Ads and events tuned for spenders" },
  { name: "Idle Miner Tycoon", year: 2016, x: 35, mod: 45, size: 85, cat: "tycoon",
    liked: "Satisfying manager-driven production chain",
    pain: "Ads and walls that push purchases" },
  { name: "Egg, Inc.", year: 2016, x: 20, mod: 85, size: 65, cat: "tycoon",
    liked: "Fair monetisation and co-op contracts",
    pain: "Very long late-game grind" },
  { name: "Idle Heroes", year: 2016, x: 85, mod: 10, size: 70, cat: "collector",
    liked: "Huge hero roster and team building",
    pain: "Power creep and VIP pay-to-win" },
  { name: "Tap Titans 2", year: 2016, x: 65, mod: 35, size: 70, cat: "taprpg",
    liked: "Fast tap combat with heroes, pets and clans",
    pain: "Clan raids and gear gated by spending" },
  { name: "AdVenture Communist", year: 2016, x: 45, mod: 30, size: 55, cat: "tycoon",
    liked: "Cascading economy, mission ranks, themed events",
    pain: "Events unwinnable without paying; RNG-gated missions" },
  { name: "AFK Arena", year: 2019, x: 92, mod: 20, size: 80, cat: "collector",
    liked: "Art quality and low-effort hero collecting",
    pain: "Gacha walls and slowing progress" },
  { name: "Idle Slayer", year: 2020, x: 35, mod: 80, size: 50, cat: "indie",
    liked: "Active running play with fair monetisation",
    pain: "Grind repetition in the late game" },
];

const TARGET = { x: 80, mod: 88, label: "Out of Ruin" };

const QUADRANTS = [
  { x: 78, y: 18, text: "Deep and fair", target: true },
  { x: 22, y: 18, text: "Fair but shallow" },
  { x: 78, y: 82, text: "Deep but pay-to-win" },
  { x: 22, y: 82, text: "Shallow and pushy" },
];

const RUBRICS = {
  xLabel: "Collection depth",
  modLabel: "Fairness",
  x: [
    { score: "0", label: "Pure numbers", hint: "Buildings or producers only" },
    { score: "25", label: "A few upgrade cards", hint: "Managers or boosts with little choice" },
    { score: "50", label: "Managed roster", hint: "Collectible modifiers that shape builds" },
    { score: "75", label: "Heroes + gear", hint: "Heroes, equipment and synergies" },
    { score: "100", label: "Full hero collector", hint: "Team building is the game" },
  ],
  mod: [
    { score: "0", label: "Power for sale", hint: "Spenders dominate every mode" },
    { score: "25", label: "Spend walls", hint: "VIP tiers, paid-only progress" },
    { score: "50", label: "Pay to speed up", hint: "Some competitive gaps" },
    { score: "75", label: "All earnable", hint: "Ads optional, odds fair" },
    { score: "100", label: "No power sold", hint: "Cosmetic or one-off purchases only" },
  ],
};

const F2P = new Set([
  "AdVenture Capitalist", "Idle Miner Tycoon", "Egg, Inc.", "Idle Heroes",
  "Tap Titans 2", "AdVenture Communist", "AFK Arena", "Idle Slayer", "Cookie Clicker",
]);

return { CATEGORIES, GAMES, TARGET, QUADRANTS, RUBRICS, F2P };
})();
