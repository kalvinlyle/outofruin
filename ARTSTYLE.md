# Art Style

Derived from the finished, shipped art of *Out of Ruin* — the 14 texture
atlases in the April 2020 Defold build plus the marketing-site art in
`img/`. Everything below describes what the game **actually looks like**,
not an aspiration. New art matches it.

## The style in one line

Stylised hand-painted fantasy. Chunky, exaggerated, instantly readable
shapes rendered with smooth painted gradients and soft painted
highlights — never 3D-rendered, never cel-banded. Characters are moody
painted illustrations flooded in one coloured light; items are bright
glossy painted icons with a thin dark rim; the UI is chunky 9-slice
buttons and panels in saturated jewel tones.

## Three registers

The shipped art uses three finishes. Every new asset belongs to one of
them.

| | **Icon register** | **Illustration register** | **Graphic register** |
|---|---|---|---|
| Used for | item icons, reward icons | hero and boss art, NPC medallions, equipment cards, key art | UI 9-slice pieces, region terrain, world map, VFX |
| Atlases | `items_drops`, `reward_icons` | `hero_portraits`, `npc_portraits`, `henchmen_portraits`, `items_gear`, `img/heroes/`, `img/masthead.jpg` | `main`, `map`, `worldmap`, `power_vfx` |
| Finish | smooth painted gradients, glossy painted highlight, thin darker rim | smooth satin painting, soft gradients, painterly atmosphere | flat colour shapes, few values, crisp edges |
| Colour | bright and saturated | one dominant mood hue over a muted base | jewel tones (UI) or earth tones (maps) |
| Background | transparent | loose atmospheric wash, heavy vignette | flat field |

What they share: chunky simplified silhouettes, exaggerated proportions,
a fixed upper-left key light, no black ink outlines, and no fine
micro-texture.

## Palette

Sampled from the shipped atlases.

**Base — brass, ochre, parchment** (card frames, world map, gold, cloth)

`#FAEAC4` `#D8C67A` `#C4C099` `#B59F68` `#BA984E` `#AA9C62` `#987E3D`

**Umber, leather, wood**

`#B88967` `#AB502C` `#8D553E` `#72522A` `#6C4F2D` `#68381C` `#4D2C16`

**Near-black** (backgrounds, vignettes, cavity shadows — always tinted,
never neutral)

`#231D13` `#211710` `#161216` `#131617` `#0E090F`

**Glacial blue** (ice gear, frost, the cold hero light)

`#B4CDD1` `#74ADD5` `#3E83AF` `#3C7098` `#455C78` `#223A44` `#111930`

**Slate and steel**

`#DEDACA` `#7F7F73` `#7A918E` `#6D8784` `#4C5C5A` `#363E3E`

**Moss and olive**

`#CED2A0` `#9FBB99` `#9BB07B` `#778749` `#6E7967` `#35432C`

**Blood and ember**

`#8A303B` `#7C2B21` `#753F26` `#481613`

**UI jewel tones** (the `main` atlas — the one place the game goes fully
saturated)

`#BB173F` crimson · `#1E7F68` teal · `#E99B01` amber · `#7A0A94`
purple · `#2EA9D6` sky · `#9BAA1E` lime olive · `#C9B07A` khaki ·
`#8C8C84` stone · `#FFDB35` / `#EBA310` coin gold

Rules the shipped art follows:

- Illustrations: one saturated mood hue dominates; everything else sits
  in the earth range.
- Icons: each item wears its natural colour at full, clean saturation —
  a red apple is truly red, ice is bright sky blue, a gem is vivid
  purple.
- Highlights are warm or tinted; the only pure whites are icon glints,
  UI glyphs and VFX sparks.
- Shadows plunge into a tinted near-black, never neutral grey.

## 7-aspect breakdown

### 1. Shading

A single key from the upper left, roughly 45°, on every asset. Shading
is **painted, smooth and continuous**: soft gradients roll across each
form from a lit top-left to a darker lower-right, with no hard tone
bands and no cel steps. Icons get one bright glossy painted highlight —
a soft white sheen or a small four-point star glint — on the surface
facing the light. Illustrations flood the whole figure in one coloured
key, add a hard rim light on the lit silhouette edge, and drop into
deep tinted shadow; a few soft bloom sparks float in the air.

### 2. Edges

No black ink outlines. Icons carry a **thin rim in a much darker shade
of their own colour** — dark red around the apple, dark brown around the
potato, navy around ice — that hugs each piece's silhouette. In
illustrations edges are lost and found: the lit side holds a crisp rim
light, the shadow side dissolves into the background wash. Graphic
register shapes meet along crisp clean edges with no stroke.

### 3. Surface detail

Low. Materials are told by colour, gloss and a few broad painted marks.
Icons add a handful of small **square, blocky brush dabs** as texture
accents — spots on a potato, patches on a hide, flecks in a gem — never
fine lines, scratches or noise. Illustrations concentrate detail on the
face and hands and let everything else dissolve into broad painted
mass.

### 4. Colour

Two temperatures. Icons and UI are bright, clean and saturated.
Illustrations and maps are muted earth tones pulled toward one dominant
mood hue — the ice hero drowned in `#3E83AF`, the elf in ochre, the
goblin in umber. Colour transitions are smooth painted blends.

### 5. Form language

Chunky, simplified and exaggerated. Silhouettes are bold and readable at
small sizes; objects are a little oversized and heavy — thick blades,
fat handles, plump fruit. Characters are caricatured: oversized heads
and hands, heavy brows, big noses and ears, strong expressions, heroic
weight; never pretty, never cute. Icons sit at a three-quarter view
that shows the object's top and front.

### 6. Material rendering

- **Steel** — cool grey ramp with a bright soft sheen along one edge.
- **Wood** — warm brown with a soft painted grain stroke or two.
- **Leather / hide** — flat-ish umber with square painted patches.
- **Gold** — warm yellow with an orange shadow and a bright glint.
- **Ice / crystal** — bright sky blue, lighter translucent core,
  white star glints.
- **Organic** (fruit, roots, food) — glossy saturated colour, soft
  rounded volume, one wet highlight.
- **Skin** (illustrations) — warm painted gradients, cool shadow,
  satin sheen.

### 7. Overall feel

Polished stylised mobile fantasy RPG. Bright glossy hand-painted item
icons; moody, caricatured painted character art in the vein of
stylised card games; chunky jewel-tone 9-slice buttons. Grounded rather than cute.
Never photoreal, never 3D-rendered, never cel-shaded, never outlined in
black.

## Surface prompt blocks

Use the block for the surface being generated, verbatim, as the style
portion of the prompt. Add the subject; do not add style adjectives of
your own.

### Hero / boss art — `hero_portraits`, `img/heroes/`

> Graphic stylised fantasy character illustration — painted card art,
> NOT realism. Smooth painted forms over chunky sculpted stylised
> anatomy. Dynamic action pose with a diagonal lean toward the camera;
> the figure fills the frame and is cropped by it. Caricatured,
> exaggerated character — an oversized head, huge expressive eyes, a
> heavy squinting brow, a wide mouth and a strong personality
> expression; never pretty or model-like. Heroic-heavy proportions — oversized head and hands,
> heavy jaw. A single saturated coloured key light from the upper left
> floods the ENTIRE figure in one hue so skin, cloth and metal all sit
> in that colour; hard rim light along the lit silhouette edge; shadows
> plunge into tinted near-black. Loose abstract atmospheric background
> wash with no readable detail, heavy corner vignette, a few small
> floating bloom sparks. Painted detail only on the eyes, brow and
> knuckles; everything else is broad painted mass. Clean, smooth
> painted rendering with a soft satin sheen on skin and metal and
> fairly light mid-values on the face — polished card art, not gritty.
> Muted earth-and-brass palette.
>
> Negative: no big nose, no bulbous nose, no big or pointed ears on
> humans, no photorealism, no 3D render, no pretty or glamour face,
> no skin pores or blemishes, no individual hair strands, no stubble,
> no fabric weave, no micro-texture, no grit, no grime, no film grain,
> no neutral grey or white highlights, no outlines, no text.

Target: 2:1 landscape action scene, composed so a 3:4 crop around the
face works as the 376×518 card. Big noses and pointed ears belong to
non-human species only (goblins, orcs, elves' ears); on a human the
caricature comes from head size, eyes, brow and expression. Packing
into `hero_portraits`: pages are stored bottom-up and some frames are
rotated 90°, so check each rect in the `.texturesetc`.

**Colour comes from the hero's virtues** (`Virtues` in `Heroes.json`).
Each virtue has a colour:

| Virtue | Colour |
|---|---|
| Wrath | crimson |
| Greed | green |
| Zeal | gold |
| Stasis | desaturated grey-purple |
| Reason | blue |
| Empathy | pink |

The first two virtues are the main colours: the first is the key light
on the figure, the second the background wash. The third is a minor
highlight only — a few small glints or sparks, never a large shape and
never the colour of the hero's power effect. Write these
into the block's key-light clause in place of the single hue, and name
the background and accent colours explicitly.

### NPC medallion portrait — `npc_portraits`

Every NPC medallion, the four original ones included, uses this block
after a `Subject:` line that names the character and describes only the
head and headwear. `%s` is the medallion interior's colour.

> Simple hand-drawn 2D digital illustration for a mobile fantasy strategy game, flat painted with very few, very large angular shapes: the whole head is built from only a dozen or so big flat colour shapes with straight-sided angles, like a few pieces of painted paper, never many small facets. Each surface has just two flat tones, a pale lit plane and a shadow plane, with slightly soft edges between them, as if a small simple painting were scaled up. Very low detail: hair and any facial hair are a few big chunky locks, the eye a tiny dark slit with a small bright iris. No line art, no outlines, no texture, no brush strokes, no fine detail. Caricatured: big nose, heavy angular brow, half-closed shrewd eyes. Warm pale yellow light from the upper left. Muted, dusty, desaturated colours: yellow-ochre skin with tan shadows, olive and plum darks. A flat 2D painted drawing, never a 3D model or render, never crisp vector art. Only the head is shown, no neck, shoulders or body, no hands, no props, turned three-quarters to the right, and large: it overlaps and breaks past the right and bottom edges of a round medallion behind it. The medallion is a disc with a smooth bevelled ring shading from gold at the top to dark red-brown at the bottom, and a dark %s interior fading to near-black. Centred, on a flat solid pure white background.

Target: 256×256, transparent, the ring 170 px across and centred at
(122, 125) — the shipped medallions' size and position. `img/npc/npc_*.png`
are stored at 1024×1024 already fitted that way (ring 680 px at 488, 500);
the white-background originals are in `img/npc/source/`.

Characters are medieval fantasy: hoods, mail coifs, kettle helmets, fur,
plaits, fantasy races. Never colonial or modern dress (tricorns, oilskins,
brass-buttoned coats). Name the hair colour and any facial hair in the
subject — a woman's subject says beardless, a moustache says clean-shaven
chin — or the model gives everyone a beard.

### Henchmen card — `henchmen_portraits`

Henchmen are cards, not heroes and not medallion NPCs. Each one must be
iconic: one bold, instantly recognisable silhouette, face and attitude
that still reads at 128×192, with one comic action that says who they
are. No busy scenes or prop clutter.

Write the subject line before the block:

- **One comic action and attitude** — "cackling as his staff erupts in
  sparks", "proudly hoisting a prize turnip". Never a stock archetype.
- **Gender stated explicitly** — the model defaults to male otherwise.
- **Human and dwarf faces** get small neat noses and ordinary ears; the
  caricature lives in head size, eyes, body shape and expression. Only
  non-human species (orcs, ogres, goblins, imps) get big features.
- **Backdrop is the henchman's own level** from `Map.json`
  (`map_id` / `dungeon_id` / `level_id` in `Henchmen.json`) — e.g. Bone
  Crusher is Desert Ruin › Ruin Entrance — never an invented setting.

> Stylised painted fantasy character card illustration, caricatured
> and chunky — an oversized head, huge expressive eyes, exaggerated
> squashed-and-stretched body shapes and a big, readable, comic
> expression. Simplified bold shapes with smooth soft painted shading
> and warm natural skin tones, lit softly from the upper left. A lively,
> characterful half-length portrait caught mid-gesture with a strong
> silhouette, the character centred and filling the upper two thirds of
> a tall portrait card, with a little headroom. Gentle even lighting, no
> dramatic colour flood. No black outlines, no micro-detail. Muted
> earth, brass and slate palette with one saturated accent.
>
> Negative: no big nose, no bulbous nose, no long pointed nose, no big
> ears, no realistic proportions, no medallion, no circle, no frame, no
> border, no stiff pose, no standing straight at the camera, no dramatic
> single-colour lighting, no 3D render, no photorealism, no cel
> shading, no text.

Target: 2:3 portrait at 832×1248, packed into the 128×192 `Henchmen_NNN`
frames; the ten henchmen with an `*_icon` frame get a square crop of the
card's upper part. The shipped set is in `img/henchmen/`; each card's
exact prompt is in its `.meta` sidecar. Three cards (Wererabbit
Negotiator, Bone Crusher, Rabbit Hunter) were approved from earlier
rounds and carry their own prompts there.

### Equipment card — `items_gear`

Gear is a card, not an icon. Each piece of equipment is the hero of its
own 2:3 card, staged in the dungeon level it drops in, and has to read
at 224×336 on the card and smaller again in the upgrade screen's slots.

Write the subject line before the block:

- **The object and what it is made of** — "a bone bucket — a sturdy pail
  built from pale curved bones lashed together with leather cord". Lean
  on the entry's own joke description in `Gear.json`.
- **Backdrop is the gear's own level** from `Map.json` (`map_id` /
  `dungeon_id` / `level_id` in `Gear.json`) — never an invented setting.
  The backdrop per level is in `img/gear/source/gear_descriptions.json`.
- **One object only.** No hands holding it, no character wearing it, no
  set of three laid out on a table.

> Stylised painted fantasy equipment card illustration. A single chunky,
> exaggerated, slightly oversized object with thick heavy forms — fat
> handles, thick shafts, plump rounded volumes — and a bold silhouette
> readable at a glance. It fills the upper two thirds of a tall portrait
> card with a little headroom, shown in a three-quarter view at a lively
> diagonal tilt. Smooth soft painted gradients roll from a lit upper-left
> to a darker lower-right, with one bright glossy painted highlight on
> the lit side, and the silhouette wrapped in a thin rim in a much darker
> shade of the object's own colour. A handful of small square blocky
> brush dabs as texture accents, no fine lines. Behind it, a loose
> atmospheric painted backdrop of LOCATION, softly out of focus with no
> readable detail, a heavy corner vignette and a few small floating bloom
> sparks. Gentle even lighting from the upper left, no dramatic colour
> flood. No black outlines, no micro-detail. Muted earth, brass and slate
> backdrop with the object itself in bright, clean, saturated natural
> colour.
>
> Negative: no hands, no characters, no people, no creatures, no frame,
> no border, no card frame, no inventory grid, no multiple separate
> objects, no realistic slender proportions, no 3D render, no
> photorealism, no cel shading, no hard tone bands, no flat vector, no
> black outline, no sticker border, no drop shadow, no text.

Target: 2:3 portrait at 832×1248, packed into the 224×336 `items_gear`
frames by `tools/pack_gear_atlas.py`. The shipped set is in `img/gear/`;
each card's exact prompt is in its `.meta` sidecar.

### Item icon — `items_drops`, `reward_icons`

> Hand-painted 2D fantasy mobile RPG item icon. Chunky, simplified,
> slightly exaggerated object with a bold readable silhouette, shown in
> a three-quarter view. Smooth soft painted gradients rolling from a lit
> upper-left to a darker lower-right, with one bright glossy painted
> highlight or small white four-point star glint on the lit side. A
> handful of small square blocky brush dabs as texture accents, no fine
> lines. The silhouette is wrapped in a thin rim in a much darker shade
> of the object's own colour — never black. Bright, clean, saturated
> natural colours. Centred, filling the frame, on a flat solid chroma
> background.
>
> Negative: no 3D render, no low-poly, no faceted planes, no cel
> shading, no hard tone bands, no flat vector, no black outline, no
> sticker border, no drop shadow, no scratches or noise, no text.

Target: 224×224 cell, transparent after background removal.

### Micro item icon — `items_drops` `*_small` frames

Every drop icon is drawn a second time for the places it is only a couple
of dozen units across — the hire cost row, the quest chips, the sell grid.
The detailed icon turns to mush there, so the small one is a different
drawing, not a downscale: fewer objects, fatter shapes, a heavier rim.

> Hand-painted 2D fantasy mobile RPG micro item icon of \<subject\>,
> designed to stay readable at 24 pixels. Extremely simplified: \<one to
> three objects, named and counted\>, nothing else. Massive bold chunky
> silhouette that fills the frame edge to edge, exaggerated thick forms,
> no thin or spindly parts, no small details, no clutter. Three-quarter
> view. Broad flat areas of saturated colour with a single soft painted
> gradient from a lit upper-left to a darker lower-right and one wide
> glossy highlight band. The whole silhouette is wrapped in a thick rim
> in a much darker shade of the object's own colour, never black, heavy
> enough to separate the icon from any background. Very high contrast
> between its few colours. Centred, filling the frame, on a flat solid
> chroma background.
>
> Negative: no 3D render, no low-poly, no faceted planes, no cel
> shading, no hard tone bands, no flat vector, no black outline, no
> sticker border, no drop shadow, no scratches or noise, no text, no
> fine detail, no thin lines, no small elements.

**The small icon is the big one simplified, never a second design.** Write
its prompt from the detailed icon's own subject line and keep the same
silhouette, the same number of objects, the same arrangement and the same
colours; simplify only by dropping small details and fattening the forms.
Two drawings of the same item that disagree on shape or count read as two
different items in the cost row. Check the pair side by side, then check
the small one at 24 px.

Target: 128×128 cell, transparent after background removal.

### Location icon — `main` `dungeon_*` frames

One icon per dungeon location, drawn on the tab bar at the top of the
dungeon screen — five side by side on a region, one alone on an event.
It is a tiny landmark vignette rather than an object: the place itself,
reduced to the one structure or formation a player would name it by, sat
on a small wedge of its own ground. Every icon is the same register as
an item icon and the same bold read as a micro one, because it is drawn
only about 40 units across over a khaki or dark-grey tab.

Keep the six consistent: one landmark per icon, the ground wedge the same
weight each time, the same three-quarter view and the same height in the
cell, so the row reads as one set.

> Hand-painted 2D fantasy mobile RPG location icon of \<place\>, a tiny
> landmark vignette designed to stay readable at 40 pixels. \<One
> structure or formation, named\>, sitting on a small chunky wedge of
> \<its ground\>, nothing else. Massive bold silhouette that fills the
> frame, exaggerated thick forms, no thin or spindly parts, no clutter,
> no scenery behind it. Three-quarter view from slightly above. Broad
> areas of saturated natural colour with smooth soft painted gradients
> rolling from a lit upper-left to a darker lower-right, and one bright
> glossy painted highlight on the lit side. A handful of square blocky
> brush dabs as texture accents, no fine lines. The whole silhouette is
> wrapped in a thick rim in a much darker shade of its own colour, never
> black, heavy enough to separate it from a khaki tab. Centred, filling
> the frame, on a flat solid chroma green background.
>
> Negative: no 3D render, no low-poly, no faceted planes, no cel
> shading, no hard tone bands, no flat vector, no black outline, no
> sticker border, no drop shadow, no scratches or noise, no text, no
> sky, no horizon, no background scenery, no fine detail, no thin
> lines, no small elements, no characters.

Target: 128×128 cell, transparent after background removal, the landmark
fitted into a 112×112 box inside it so every icon sits at the same scale.

### Region terrain — `map`

> Stylised fantasy terrain map seen strictly from directly above — a
> flat 2D map view, no perspective, no horizon, no sky. Bold flat
> graphic shapes with crisp angular edges, like layered cut paper — ochre and
> olive plains with soft gradient washes, maroon ridged mountain chains
> with pale angular snow caps and violet shadows, teal rivers and lakes
> banded by golden sandy shores, clusters of dark conifers as small
> stippled masses. Clean crisp edges, no outlines, no texture. Upper-left
> light. Muted olive, ochre, maroon and teal palette.
>
> Negative: no perspective view, no horizon, no sky, no 3D render, no
> photorealism, no text.

### World map — `worldmap`

> Plain, sparse hand-drawn fantasy cartography. Bold dark ink
> coastlines, noticeably heavier than every other line. Mountain ranges
> drawn as rows of simple chevron and hook strokes; rough terrain as
> patches of fine diagonal line hatching; rivers as thin wavering
> lines; dashed route lines; small dot settlement marks. Sea is flat
> light tan `#C8B08A`, land a half-step darker flat tan `#B39A78`, and
> nothing else — monochrome dark ink over flat tan, no colour fills, no
> painted shading. Widely letter-spaced serif small-capital place
> labels sitting directly on the map. Restrained and utilitarian,
> mostly empty ground, as if drawn quickly in one ink weight.
>
> Negative: no decorative border or frame, no cartouche, no title
> banner, no scroll edges, no compass rose, no legend or key box, no
> tree icons, no pictorial symbols, no sea monsters, no ships, no burnt
> or torn edges, no photographic paper texture, no warm golden glow, no
> saturated colour, no watercolour wash, no vignette.

### UI 9-slice pieces — `main`

The shipped UI is built from tiny 9-slice pieces, 48×64 px each, in about
13 colours: `tinyfancybutton_*` (raised button), `tinyfancypanel_*` (flat
panel), `tinyframe_*` (button with a see-through centre) and `tab_*`
(button top only, attaches to a panel). Every piece is a small soft 3D slab — a gummy keycap — never a flat
drawing with bands on it. For the button:

- **Top face** — a soft pillow: a gently dished centre framed by a broad,
  rounded, lighter raised rim. The rim catches the light along the top
  and left and is a little darker along the right.
- **Rounded in 3D** — every edge and corner of the slab is generously
  rounded, so the top face rolls down into the front at both ends. The
  seam between top and front is a soft curve that dips at the left and
  right ends, never a straight ruled line.
- **Front face** — the slab's curved side, two shades darker and shifted
  warmer and browner (gold → burnt orange, lime → olive brown, red →
  deep crimson), with rounded bottom corners. It is a quarter of the
  piece's height.
- **Notch** — a small rectangular tab from the dished centre into the
  bottom rim, just right of centre. Every piece has it.
- **Glints** — a soft bright glint on the top-left corner of the rim and
  a short diagonal dash on the rim at the inner bottom-right, both a
  light warm tint of the piece's own colour (peach on red, pale yellow on
  gold, lilac on purple).
- **Shadow** — a hard-edged near-black shadow offset about 3 px down and
  right. Panels and tabs have none.

The panel is the same idea, thinner: a flat-topped slab whose top and
left edges catch a thin highlight, whose right edge rolls into shade,
and whose dark bottom lip curls up around the rounded bottom corners,
with a slanted-sided notch rising from it and a light glint at the
bottom-left. Tabs are the top half of a button. Frames are a button with
the centre cut out.

**How the game slices them.** Buttons, panels and tabs use
`gui.set_slice9(node, vmath.vector4(16, 22, 32, 42))` (left, top, right,
bottom); frames use `(23, 24, 25, 40)`. On a 48×64 piece those margins
add up to the full width and height, so there is **no stretchable
centre**: Defold repeats one pixel column at x = 16 and one pixel row at
y = 22, and everything else is fixed corner art. That dictates the
layout:

- **Top-left corner** (16×22) holds the top-left peach glint and the
  rounded corner.
- **Top-right** (32×22), **bottom-left** (16×42) and **bottom-right**
  (32×42) hold everything else — the notch and the bottom-right peach
  dash sit in the bottom-right corner, which is why they are right of
  centre.
- The column at x = 16 is repeated sideways and the row at y = 22 is
  repeated downwards, so shading may change top-to-bottom along that
  column and left-to-right along that row, but nothing may change
  left-to-right in the middle of the face, or every stretched button
  shows a step where the corner art begins. All the 3D character —
  curved seam ends, rolled edges, glints, notch — lives in the corners.

Generated pieces are cut to the tile, scaled to 48×64 (keep a 4×
master), and must pass a stretch test with these exact margins before
they ship. Generate shadowed pieces on a flat light-grey background,
never a chroma colour — a chroma background tints the drop shadow.

#### Button prompt

> A classic chunky casual-mobile game button sprite, hand-painted in
> crisp flat-ish tones with only a little soft blending — the raised
> button style common in mid-2010s mobile games, not a 3D render. Seen
> front-on and centred, filling most of the frame, three units wide by
> four tall. The button is made of two clearly separate parts with a
> crisp boundary between them. The upper three quarters is the lighter
> top face: a flat saturated colour inside a very broad, soft, slightly
> lighter rounded bevel — a fat cushion edge a full eighth of the width
> wide, never a thin line — with rounded corners. The lower part — more
> than half of the button's height, a very tall chunky block — is the
> button's thickness: much darker and shifted warmer and browner than
> the top (gold becomes burnt orange, lime becomes olive brown, red
> becomes deep crimson). Where the top face's rounded bottom corners
> meet that band, the boundary curves down at the left and right ends, so the
> dark band wraps up around the corners; across the middle the
> boundary is level. Just right of centre a chunky square step of the
> rim colour, one sixth of the width wide, juts up from the bottom rim
> into the face. A bright glint
> in a light warm tint of the button colour sits on the top-left
> corner, and a short diagonal glint dash sits at the inner
> bottom-right corner of the top face. A hard-edged near-black shadow
> sits behind the button, offset down and right by about one twentieth
> of the width. Few tones, crisp silhouette, matte.
>
> Negative: no 3D render, no gummy or plastic look, no gloss, no
> reflections, no raised square button on the face, no slot, no
> outline, no texture, no glyph, no text, no perspective, no second
> button.

Colours: crimson `#BB173F`, teal `#1E7F68`, amber `#E99B01`, royal purple
`#7A0A94`, sky blue `#2EA9D6`, lime olive `#9BAA1E`, khaki `#C9B07A`,
stone grey `#8C8C84`, charcoal `#3A3A38`. Coins are separate sprites:
thick gold `#FFDB35` hexagons, flat along the top and bottom and pointed
left and right, with a broad studded rim band, an inset hexagon bevel and
an amber `#EBA310` rim. The header draws one from the 128×128
`gold_coin_hexagon` frame; the six 112×112 `coin_spin` frames are the
same coin turning.

**The coin and its spin frames use the Item icon block above, verbatim.** The
subject is "a single thick chunky hexagonal gold coin with exactly six straight
sides, flat along its top and bottom edges and pointed at its left and right, with
a raised studded rim band around a sunken inset hexagon and a thick visible gold
edge", followed by one clause for the pose: how far the coin has turned about its
upright axis and which side its edge shows on. One asset-creator call per pose,
best of four. Recipe: `img/ui/ui_coin-gold_description.json`.

#### Panel prompt

> A hand-painted 2D casual-mobile game UI panel sprite, painted to read
> as a thin rounded slab — crisp and graphic, not a 3D render. Seen
> front-on and centred, filling most of the frame, three units wide by four tall,
> with rounded corners. The top surface is one saturated colour with a
> very gentle top-to-bottom shade. Its top and left edges catch a thin
> lighter highlight; its right edge rolls softly into a darker shade.
> Along the bottom the slab's thickness shows as a bold dark lip, a
> full one eighth of the height, in a deep burnt shade of the colour; at
> both bottom corners the rounded top surface curls down into that lip
> so the lip rises around the corners in a soft curve. Just right of
> centre a chunky tab of the lip colour, one sixth of the width wide
> with a slanted right side, rises from the lip into the surface as
> tall again as the lip. A small light
> glint, a warm tint of the panel's colour, sits on the bottom-left
> corner. Smooth soft shading, crisp silhouette.
>
> Negative: no 3D render, no gloss, no button front face, no drop
> shadow, no straight ruled bands, no flat vector look, no outline, no
> texture, no glyph, no text, no perspective.

Frames (`tinyframe_*`) are the button with its centre cut out to
transparency, leaving the bevel and an inner edge with a peach glint on
its top-left. Tabs (`tab_*`) are the top half of the button only —
rounded top corners, bevel and peach top-left glint, cut flat along the
bottom.

### Ability / damage VFX — `power_vfx`

The shipped effects are small, light, fast flipbook strips on
transparency, not chunky shapes. Three families, five frames each:

- `electricity_bar_1–5` — a thin horizontal jagged lightning arc, pale
  sky blue with white flecks along its core, broken into segments that
  flicker and shift between frames.
- `sword_strike_1–5` — a single flat white tapered sliver, hard-edged,
  growing and fading across the frames.
- `smoke_puff` — a ring of small lumpy pale-cream puffs that expands
  outward and breaks into scattered specks.

> Game VFX flipbook frame on a transparent background: [effect]. Thin,
> light and minimal — flat pale fills with crisp hard edges, at most two
> tones (a pale colour and a white core), no glow, no blur, no gradient,
> no particles beyond a few small flecks. Drawn as a clean sprite for a
> small mobile screen.
>
> Negative: no thick chunky shapes, no saturated colour, no painted
> background, no 3D render, no photoreal fire or smoke, no outlines, no
> text.

The ability buttons that trigger these (`chainlightning`, `cleave`,
`stealresources`, `speedblessing` and their `_disabled` greys in the
`main` atlas) are painted square icon tiles: one symbol on a coloured
field, in the item icon style. This block has not been validated with a
generated sample yet.

### Key art / marketing — `img/masthead.jpg`

> Cinematic stylised fantasy key art, like a moody frame from a
> stylised animated film. Single creature subject emerging from soft
> cool grey-blue smoke, against a dark charcoal background with a strong
> vignette. The creature is built from chunky stylised armour-like
> plates and slabs with softened edges, smooth satin painted surfaces
> and its own warm earthy colouring — tan, ochre, olive and moss. A
> saturated ember-orange glow burns from its eyes and mouth and warms
> the nearest plates; soft rim light separates it from the smoke. Large
> areas of empty negative space for copy.
>
> Negative: no photorealism, no grey stone, no rock texture, no
> cracks, no pitting, no grain, no low-poly mesh look, no fine surface
> noise, no outlines, no text.

## Hard rules

1. **Painted, not rendered.** No 3D-render look, no low-poly, no
   faceted meshes.
2. **No cel shading.** Shading is smooth painted gradients; no hard
   tone bands (the UI pieces' flat face, rim and front face are the one
   exception).
3. **No black outlines.** Icons alone carry a thin rim in a darker
   shade of their own colour.
4. **No micro-texture.** No scratches, pores, grime, weave, noise or
   grain. Icon texture is a few square brush dabs at most.
5. **One key light, upper left, every asset.**
6. **Chunky and exaggerated.** If it is not readable at 96 px from
   silhouette alone, simplify the shape.
7. **Icons are centred, fill the frame, transparent background,
   three-quarter view.**
8. **Nothing is gross.** No blood, gore, viscera, wounds, cuts, severed
   stumps, exposed flesh, raw meat or entrails — anywhere, on any
   surface. Drops named for body parts are charms, trophies, cured
   hides or dried jerky: a rat tail ends in a clean tuft of fur, a wolf
   paw is a lucky charm bound with a leather cuff, flesh is leathery
   jerky. The game is bright and comic, and a drop the player collects
   by the hundred must never be unpleasant to look at.

## Reference assets

| Surface | Where |
|---|---|
| Hero art | `img/heroes/dwarf.png`, `elf.png`, `goblin.png`, `hero_portraits` atlas |
| Key art | `img/masthead.jpg` |
| Item icons | `img/items/` (both sizes per drop); `items_drops` and `reward_icons` atlases |
| NPC medallions | `npc_portraits` atlas |
| Henchmen cards | `img/henchmen/` (the 15 in-game cards; unused and spare cards in `img/henchmen/source/unused/`) |
| Equipment cards | `img/gear/` (the 45 in-game cards); `items_gear` atlas |
| Region terrain | `map` atlas |
| World map | `worldmap` atlas |
| UI 9-slice pieces | `main` atlas (`tinyfancybutton_*`, `tinyfancypanel_*`, `tinyframe_*`, `tab_*`) |
| VFX | `power_vfx` atlas |

The atlases are inside the Defold archive. Unpack with
`extracted/tools/defold_extract.py`, pull mip 0 out of each `.texturec`
(it is a WebP file), and **flip it vertically** — Defold stores textures
bottom-up, so an unflipped atlas shows everything upside down.

To change art in the game, edit the unpacked page with
`tools/pack_atlas.py`, drop the result in `game-src/assets/` and run
`tools/patch_game.py`; pages keep their exact size and frame rects.

**Not style references.** The original `henchmen_portraits` sketches
(now replaced in game for the 15 named henchmen) and most of `lootbox`
(now replaced by the chests in `img/lootbox/`) shipped as unfinished
blue-line concept sketches standing in for final art. The marketing-site `img/treasure_chest.png`
and `img/adventure.png` are stock illustrations from the pre-launch
site. Do not match any of these.

Validation examples generated from these blocks:
`img/_visdev/artstyle-validation/`.
