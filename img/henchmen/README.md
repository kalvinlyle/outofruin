# Henchmen

Card art for the henchmen. The 15 files in this folder are the ones in the
game, packed into the `henchmen_portraits` atlas by
`game-src/assets/henchmen_portraits.texturec`. Style: the henchmen card
block in `ARTSTYLE.md`.

- `henchmen_<id>.png` + `.meta` — one card per in-game henchman, 832×1248;
  the `.meta` holds the exact prompt and any masked touch-ups.
- `henchmen_<id>-icon.png` / `henchmen_<id>-icon-small.png` + `.meta` — each
  henchman's symbol (a pitchfork for the Farm Hand, a lantern for Tunnel
  Patrol), drawn in the item icon style. The detailed one is packed into the
  `<name>_icon` frame and the simplified one into `<name>_icon_small`; the
  game picks between them by drawn size, so the small one shows in the cost
  rows, the producer count and in front of the "xN" under each card.
- `source/henchmen_descriptions.json` — each card's subject line, level,
  atlas frame and icon frame.
- `source/unused/` — earlier and spare cards that are not in the game,
  named by the sketch frame they came from (`henchmen_sketch-NNN-…`).
- `_work/` — generation rounds and option sheets (local only).
