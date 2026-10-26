"""Generate an enemy event's art with asset-creator, from the briefs in
tools/enemy_event_content.py, using the same prompt templates as the other
events' art.

    python3 tools/gen_enemy_event_art.py BLACKMAW [kind ...]

Kinds: items, small, enemies, gear, locations, map, npc, chest, book. Without
any, all of them. Art already on disk is kept, so a run can be repeated to fill
in what failed. Icons are generated on a flat chroma background and cut out
with --remove-bg; cards, gear and the map are used as generated. The chest and
book are raw sheets: tools/place_chests.py and the book fitting step finish
them.
"""
import concurrent.futures
import json
import os
import subprocess
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enemy_event_content

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "img")
CLI = ["uvx", "--from", os.path.expanduser("~/.cursor/skills/asset-creator/scripts"), "asset-creator"]

NEGATIVE_ICON = ("Negative: no 3D render, no low-poly, no faceted planes, no cel shading, no hard tone bands, no flat vector, "
                 "no black outline, no sticker border, no drop shadow, no scratches or noise, no text, no blood, no gore.")

ICON = ("Hand-painted 2D fantasy mobile RPG item icon of {subject}. Chunky, simplified, slightly exaggerated object with a bold "
        "readable silhouette, shown in a three-quarter view. Smooth soft painted gradients rolling from a lit upper-left to a darker "
        "lower-right, with one bright glossy painted highlight and a small white four-point star glint on the lit side. A handful of "
        "small square blocky brush dabs as texture accents, no fine lines. The silhouette is wrapped in a thin rim in a much darker "
        "shade of the object's own colour, never black. Bright, clean, saturated natural colours. Centred, filling the frame, on a "
        "flat solid {bg} background. " + NEGATIVE_ICON)

SMALL = ("Hand-painted 2D fantasy mobile RPG micro item icon of {name} ({subject}). This is a simplified version of a detailed icon "
         "of exactly the same subject: keep the same overall silhouette, the same number of objects, the same arrangement and the "
         "same colours, and simplify only by removing small details and fattening the forms. Do not redesign it, do not change the "
         "pose, do not change how many objects there are. Designed to stay readable at 24 pixels. Massive bold chunky silhouette that "
         "fills the frame edge to edge, exaggerated thick forms, no thin or spindly parts, no small details, no clutter. Three-quarter "
         "view. Broad flat areas of saturated colour with a single soft painted gradient from a lit upper-left to a darker lower-right "
         "and one wide glossy highlight band. The whole silhouette is wrapped in a thick rim in a much darker shade of the object's own "
         "colour, never black, heavy enough to separate the icon from any background. Very high contrast between its few colours. "
         "Centred, filling the frame, on a flat solid {bg} background. " + NEGATIVE_ICON +
         " No fine detail, no thin lines, no small elements.")

CARD = ("Subject: {subject}. Behind it a soft, blurred painted backdrop of {backdrop}, low in detail, in {palette}. Stylised painted "
        "fantasy monster card illustration: a menacing, hostile creature the player has to fight, scary and mean, caught mid-attack "
        "with an aggressive snarling expression, small fierce eyes and bared teeth or claws. It may be a little goofy in its "
        "exaggerated, chunky proportions, but it is never cute or friendly. Drawn like a stylised mobile game card, not a realistic "
        "illustration: caricatured proportions with an oversized head, jaws and claws and a squat body, a few big simple forms, "
        "fur, scales and armour suggested with broad flat strokes rather than drawn strand by strand, smooth soft painted shading "
        "lit from the upper left with deep shadow on the far side. A dynamic, threatening pose with a strong silhouette, {framing}, "
        "with a little headroom. No black outlines, no micro-detail. Muted earth, iron and slate palette with one saturated accent. "
        "Negative: no cute, no kawaii, no chibi, no baby proportions, no big round innocent eyes, no shiny sparkling eyes, no smile, "
        "no friendly grin, no happy expression, no waving, no pet-like pose, no realistic proportions, no medallion, no circle, "
        "no frame, no border, no stiff pose, no realistic rendering, no fine fur detail, no texture detail, no 3D render, "
        "no photorealism, no cel shading, no blood, no gore, no text.")

GEAR = ("{subject_cap}. Stylised painted fantasy equipment card illustration. A single chunky, exaggerated, slightly oversized object "
        "with thick heavy forms - fat handles, thick shafts, plump rounded volumes - and a bold silhouette readable at a glance. It fills "
        "the upper two thirds of a tall portrait card with a little headroom, shown in a three-quarter view at a lively diagonal tilt. "
        "Smooth soft painted gradients roll from a lit upper-left to a darker lower-right, with one bright glossy painted highlight on "
        "the lit side, and the silhouette wrapped in a thin rim in a much darker shade of the object's own colour. A handful of small "
        "square blocky brush dabs as texture accents, no fine lines. Behind it, a loose atmospheric painted backdrop of {backdrop}, "
        "softly out of focus with no readable detail, a heavy corner vignette and a few small floating bloom sparks. Gentle even "
        "lighting from the upper left, no dramatic colour flood. No black outlines, no micro-detail. Muted earth, iron and slate "
        "backdrop with the object itself in bright, clean, saturated natural colour.\n\nNegative: no hands, no characters, no people, "
        "no creatures, no frame, no border, no card frame, no inventory grid, no multiple separate objects, no realistic slender "
        "proportions, no 3D render, no photorealism, no cel shading, no hard tone bands, no flat vector, no black outline, no sticker "
        "border, no drop shadow, no text.")

LOCATION = ("Hand-painted 2D fantasy mobile RPG location icon of {name}, a tiny landmark vignette designed to stay readable at 40 "
            "pixels. {subject_cap}, nothing else. Massive bold silhouette that fills the frame, exaggerated thick forms, no thin or "
            "spindly parts, no clutter, no scenery behind it. Three-quarter view from slightly above. Broad areas of saturated natural "
            "colour with smooth soft painted gradients rolling from a lit upper-left to a darker lower-right, and one bright glossy "
            "painted highlight on the lit side. A handful of square blocky brush dabs as texture accents, no fine lines. The whole "
            "silhouette is wrapped in a thick rim in a much darker shade of its own colour, never black, heavy enough to separate it "
            "from a khaki tab. Centred, filling the frame, on a flat solid chroma green (#00FF00) background. Negative: no 3D render, "
            "no low-poly, no faceted planes, no cel shading, no hard tone bands, no flat vector, no black outline, no sticker border, "
            "no drop shadow, no scratches or noise, no text, no sky, no horizon, no background scenery, no fine detail, no thin lines, "
            "no small elements, no characters.")

MAP = ("Stylised fantasy terrain map seen strictly from directly above - a flat 2D map view, no perspective, no horizon, no sky. Bold "
       "flat graphic shapes with crisp angular edges, like layered cut paper. Clean crisp edges, no outlines, no texture. Upper-left "
       "light. Tall portrait format. {subject}\n\nEverything is flat colour. Stone is flat charcoal and slate-grey masses with only "
       "tiny flat block shapes. Earth and courtyards are flat sooty umber and dark moss fields with only the softest wash. Banners are "
       "small flat crimson shapes. No painterly brushwork, no relief shading, no light-and-shadow modelling of ground, no photographic "
       "terrain.\n\nNegative: no perspective view, no horizon, no sky, no moon drawn in the sky, no 3D render, no photorealism, no "
       "painterly rendering, no airbrush, no relief shading, no realistic landscape illustration, no aerial photograph, no text, no "
       "labels, no icons, no characters, no map markers, no pins, no border, no frame, no compass rose, no legend.")

NPC = ("Subject: {subject}. Stylised painted fantasy character bust, caricatured and chunky - heavy brow, strong expression, oversized "
       "head. Simplified bold shapes with smooth soft painted shading and warm skin tones, lit from the upper left. Three-quarter head "
       "angle, the head breaking out over a circular gold-rimmed medallion with a dark, softly tinted interior behind it. No black "
       "outlines, no micro-detail. Muted earth, brass and slate palette with one saturated accent. Negative: no big nose, no bulbous "
       "nose, no long pointed nose, no big ears, no 3D render, no low-poly, no photorealism, no cel shading, no text. The background "
       "outside the medallion is solid bright green.")

BACKDROPS = [
    "a muddy castle courtyard under a broken outer wall with a spiked wooden gatehouse at stormy dusk, charcoal stone and soot, a few warm orange torch glints",
    "a gloomy stone dungeon corridor with iron-barred cells and dangling cobwebs, charcoal stone and dark moss, a few small green glows and warm orange torch glints",
    "a vast dark throne hall of black stone with ragged crimson banners and tall broken windows glowing orange",
]
PALETTE = "muted charcoal, slate-grey and sooty umber with a few warm orange torch glints"

# Icons whose own colour is close to magenta are cut out of green instead.
GREEN_BG = {"ratwhisker", "imphorn", "knightcrest", "warmedal", "batear", "blackmawfang"}


def run(args, out):
    if os.path.exists(out):
        return out, "kept"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    r = subprocess.run(CLI + args + ["--output", out], capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(out):
        return out, "FAILED " + (r.stderr or r.stdout)[-400:]
    return out, "made"


def cut(src, out):
    if os.path.exists(out):
        return out, "kept"
    r = subprocess.run(CLI + ["--remove-bg", "--reference", src, "--output", out], capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(out):
        return out, "FAILED " + (r.stderr or r.stdout)[-400:]
    return out, "cut"


def icon_job(prompt, source, final):
    out, status = run(["--prompt", prompt, "--aspect", "1:1"], source)
    if status.startswith("FAILED"):
        return out, status
    return cut(source, final)


def jobs(event, kinds):
    out = []
    drops, seen = [], set()
    for d, rows in enumerate(event["rows"]):
        for r, (en, ds) in enumerate(rows):
            for dr in ds:
                if dr["id"] not in seen and dr["subject"]:
                    seen.add(dr["id"])
                    drops.append(dr)
    if "items" in kinds:
        for dr in drops:
            bg = "chroma green (#00FF00)" if dr["id"] in GREEN_BG else "pure magenta"
            tag = "green" if dr["id"] in GREEN_BG else "magenta"
            out.append((icon_job, ICON.format(subject=dr["subject"], bg=bg),
                        os.path.join(IMG, "items", "source", "items_%s_%s.png" % (dr["art"], tag)),
                        os.path.join(IMG, "items", "items_%s.png" % dr["art"])))
    if "small" in kinds:
        for dr in drops:
            bg = "chroma green (#00FF00)" if dr["id"] in GREEN_BG else "pure magenta"
            tag = "green" if dr["id"] in GREEN_BG else "magenta"
            out.append((icon_job, SMALL.format(name=dr["name"], subject=dr["subject"], bg=bg),
                        os.path.join(IMG, "items", "source", "items_%s-small_%s.png" % (dr["art"], tag)),
                        os.path.join(IMG, "items", "items_%s-small.png" % dr["art"])))
    if "enemies" in kinds:
        for d, rows in enumerate(event["rows"]):
            for r, (en, ds) in enumerate(rows):
                boss = r == len(rows) - 1
                framing = ("a looming boss towering over the card and filling almost all of it, seen slightly from below" if boss
                           else "the creature centred and filling most of a tall portrait card")
                prompt = CARD.format(subject=en["subject"], backdrop=BACKDROPS[d], palette=PALETTE, framing=framing)
                out.append((run, ["--prompt", prompt, "--aspect", "2:3", "--width", "832", "--height", "1248"],
                            os.path.join(IMG, "henchmen", "henchmen_enemy-%s.png" % en["file"])))
    if "gear" in kinds:
        for d, pieces in enumerate(event["gear"]):
            for g in pieces:
                subject = g["subject"][0].upper() + g["subject"][1:]
                prompt = GEAR.format(subject_cap=subject, backdrop=BACKDROPS[d])
                out.append((run, ["--prompt", prompt, "--aspect", "2:3", "--width", "832", "--height", "1248", "--quality", "high"],
                            os.path.join(IMG, "gear", "gear_%s.png" % g["slug"])))
    if "locations" in kinds:
        for loc in event["locations"]:
            subject = loc["subject"][0].upper() + loc["subject"][1:]
            out.append((icon_job, LOCATION.format(name=loc["name"], subject_cap=subject),
                        os.path.join(IMG, "location", "source", "location_v1_%s_green.png" % loc["art"]),
                        os.path.join(IMG, "location", "location_%s.png" % loc["art"])))
    if "map" in kinds:
        out.append((run, ["--prompt", MAP.format(subject=event["map_subject"]), "--image-model", "sunburst",
                          "--width", "752", "--height", "1328"],
                    os.path.join(IMG, "map", "_work", "map_%s_v1.png" % event["map_art"])))
    if "npc" in kinds:
        npc = event["npc"].lower()
        out.append((icon_job, NPC.format(subject=event["npc_subject"]),
                    os.path.join(IMG, "npc", "source", "npc_%s_green.png" % npc),
                    os.path.join(IMG, "npc", "npc_%s.png" % npc)))
    if "chest" in kinds:
        out.append((run, ["--prompt", chest_prompt(event), "--aspect", "2:3", "--width", "832", "--height", "1248"],
                    os.path.join(IMG, "lootbox", "source", "lootbox_v1_%s_green.png" % event["chest"])))
    if "book" in kinds:
        out.append((run, ["--prompt", book_prompt(event), "--width", "880", "--height", "1184", "--quality", "high"],
                    os.path.join(IMG, "ui", "_work", "ui_v1_chapter-book-%s.png" % event["book_art"])))
    return out


def chest_prompt(event):
    """The moon chest's sheet prompt with this event's chest in it."""
    meta = json.load(open(os.path.join(IMG, "lootbox", "lootbox_moon-closed.png.meta")))
    prompt = meta["prompt"]
    start = prompt.index("Subject: ") + len("Subject: ")
    end = prompt.index(" VIEW:")
    return prompt[:start] + event["chest_subject"] + prompt[end:]


def book_prompt(event):
    """The Salt Tide book's prompt with this event's cover colours and emblem."""
    prompt = json.load(open(os.path.join(IMG, "ui", "ui_chapter-book-salttide.png.meta")))["prompt"]
    swaps = [
        ("a thick dark sea-green board edge", "a thick dark charcoal-black board edge"),
        ("a narrow dark sea-green upright strip", "a narrow dark charcoal-black upright strip"),
        ("very dark deep sea-green leather (#1E4A44) with a slim weathered bronze border (#B0864A) just inside its edges and small weathered bronze corner caps",
         "very dark charcoal-black leather (#26232A) with a slim battered iron border (#8C8C84) just inside its edges and small battered iron corner caps"),
        ("The only emblem is a small round pearl-white scallop seashell (#F2ECDD), tucked into the very top-right corner of the cover.",
         "The only emblem is a small crimson shield (#BB173F) with two tiny crossed silver swords on it, tucked into the very top-right corner of the cover."),
    ]
    for a, b in swaps:
        if a not in prompt:
            sys.exit("book prompt template changed: %r" % a[:40])
        prompt = prompt.replace(a, b)
    return prompt


def finish_map(event):
    raw = os.path.join(IMG, "map", "_work", "map_%s_v1.png" % event["map_art"])
    final = os.path.join(IMG, "map", "map_%s.png" % event["map_art"])
    if os.path.exists(raw) and not os.path.exists(final):
        Image.open(raw).convert("RGB").resize((750, 1334), Image.LANCZOS).save(final)
        meta = json.load(open(raw + ".meta"))
        meta.update({"source": os.path.relpath(raw, ROOT),
                     "processing": ["resized %dx%d -> 750x1334 (lanczos) to match the map atlas frame" % Image.open(raw).size]})
        json.dump(meta, open(final + ".meta", "w"), indent=2)


def main():
    key = sys.argv[1]
    event = [e for e in enemy_event_content.EVENTS if e["key"] == key][0]
    kinds = set(sys.argv[2:]) or {"items", "small", "enemies", "gear", "locations", "map", "npc", "chest", "book"}
    todo = jobs(event, kinds)
    print(len(todo), "jobs")
    with concurrent.futures.ThreadPoolExecutor(6) as pool:
        futures = [pool.submit(job[0], *job[1:]) for job in todo]
        for f in concurrent.futures.as_completed(futures):
            out, status = f.result()
            print("%-8s %s" % (status, os.path.relpath(out, ROOT)), flush=True)
    finish_map(event)


if __name__ == "__main__":
    main()
