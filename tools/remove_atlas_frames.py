"""Remove named frames from an atlas, freeing their room on the page.

    python3 tools/remove_atlas_frames.py <name> <frame> ...

Works on game-src/assets/<name>.texturesetc like tools/add_atlas_frames.py.
Each named animation goes, with every image only it used; the pixels stay on
the page but nothing points at them, so tools/add_atlas_frames.py sees the
room as free and draws over it. Every other frame keeps its rectangle, its
corners and its art.

A texture set lists one slot per image (geometry) first and then one per
animation frame, each with its corner UVs (tex_coords) and size (tex_dims).
Those are rebuilt here from the kept images and animations, copying each
kept slot's entries as they were, so a rotated frame stays rotated.

Run tools/bake_outlines.py afterwards so actions.lua's list of baked outline
frames drops any removed ones.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pack_items_atlas as P
import repaint_atlas as R


def remove(name, drop):
    path = os.path.join(R.ASSETS, name + ".texturesetc")
    texture, anims, geoms, fi, tile, coords, dims = R.read_set(path)
    n = len(geoms)
    assert len(fi) == 2 * n or len(fi) >= n, "unexpected frame index layout"
    missing = sorted(set(drop) - {a["id"] for a in anims})
    if missing:
        sys.exit("%s has no frames %s" % (name, ", ".join(missing)))

    kept = [a for a in anims if a["id"] not in drop]
    still = {fi[slot] for a in kept for slot in range(a["start"], a["end"])}
    # Images keep their order, and so do their slots.
    used = [g for g in range(n) if g in still]
    new_index = {g: i for i, g in enumerate(used)}

    def entry(blob, size, slot):
        return blob[slot * size:(slot + 1) * size]

    new_fi, new_coords, new_dims = [], b"", b""
    for slot in range(n):
        if fi[slot] in still:
            new_fi.append(new_index[fi[slot]])
            new_coords += entry(coords, 32, slot)
            new_dims += entry(dims, 8, slot)
    out_anims = []
    for a in kept:
        start = len(new_fi)
        for slot in range(a["start"], a["end"]):
            new_fi.append(new_index[fi[slot]])
            new_coords += entry(coords, 32, slot)
            new_dims += entry(dims, 8, slot)
        out_anims.append(dict(a, start=start, end=len(new_fi)))

    out = P.length_delimited(1, texture)
    for a in out_anims:
        body = P.length_delimited(1, a["id"].encode())
        body += P.varint_field(2, a["w"]) + P.varint_field(3, a["h"])
        body += P.varint_field(4, a["start"]) + P.varint_field(5, a["end"])
        body += b"".join(P.varint_field(f, v) for f, v in zip((6, 7, 8, 9), a["rest"]))
        out += P.length_delimited(2, body)
    # Field 6 counts the images, which add_atlas_frames.py relies on.
    out += P.varint_field(6, len(used) if tile >= n else tile)
    out += P.length_delimited(18, new_coords)
    out += P.length_delimited(19, new_dims)
    for g in used:
        out += P.length_delimited(20, P.encode_items(geoms[g]))
    out += P.varint_field(21, 0)
    out += b"".join(P.varint_field(22, i) for i in new_fi)
    open(path, "wb").write(out)
    print("%s: removed %d frames, %d images; %d frames left" % (name, len(anims) - len(kept), n - len(used), len(kept)))


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    remove(sys.argv[1], set(sys.argv[2:]))


if __name__ == "__main__":
    main()
