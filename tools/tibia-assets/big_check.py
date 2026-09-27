"""Comprobaciones finas: orientación real de un sprite grande y semántica de z (depth)."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import COLOR_MARKERS, load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository, write_png  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, ".tmp-inspect")

repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)
with open(os.path.join(ROOT, "src", "data", "colors.json"), encoding="utf-8") as fh:
    palette = {c["id"]: (c["r"], c["g"], c["b"]) for c in json.load(fh)}
CHOSEN = {"head": palette[78], "body": palette[88], "legs": palette[98], "feet": palette[114]}


def sid(info, phase, z, y, x, layer):
    idx = sprite_index(phase, z, y, x, layer, info["patternWidth"], info["patternHeight"],
                       info["patternDepth"], info["layers"])
    return info["spriteIds"][idx] if idx < len(info["spriteIds"]) else None


def composite(base, mask=None):
    if mask is None:
        return base
    out = bytearray()
    for i in range(0, len(base), 4):
        br, bg, bb, ba = base[i:i + 4]
        if not ba:
            out += b"\x00\x00\x00\x00"
            continue
        mr, mg, mb, ma = mask[i:i + 4]
        if not ma:
            out += bytes((br, bg, bb, 255))
            continue
        lum = (br + bg + bb) / 3 / 255
        slot = COLOR_MARKERS.get((mr, mg, mb))
        r, g, b = CHOSEN.get(slot, (mr, mg, mb))
        f = 0.45 + 0.75 * lum
        out += bytes((min(255, int(r * f)), min(255, int(g * f)), min(255, int(b * f)), 255))
    return bytes(out)


def stats(rgba, tile):
    xs, ys, opaque = [], [], 0
    for y in range(tile):
        for x in range(tile):
            if rgba[(y * tile + x) * 4 + 3]:
                opaque += 1
                xs.append(x)
                ys.append(y)
    if not opaque:
        return "vacío"
    return f"px={opaque} bbox=({min(xs)},{min(ys)})-({max(xs)},{max(ys)})"


def diff(a, b):
    return sum(1 for i in range(0, len(a), 4) if a[i:i + 4] != b[i:i + 4])


LOOK = 136
info = apps[2][LOOK]["groups"][1]["spriteInfo"]
tile = repo.sprite_meta(info["spriteIds"][0])["tile"]
print(f"look {LOOK}: pattern={info['patternWidth']}x{info['patternHeight']}x{info['patternDepth']} "
      f"layers={info['layers']} tile={tile}")

print("\n=== stats por y y por z (dir 2, fase 0) ===")
for z in range(info["patternDepth"]):
    for y in range(info["patternHeight"]):
        base = repo.sprite_rgba(sid(info, 0, z, y, 2, 0))
        print(f"  z={z} y={y}: base {stats(base, tile)}")

print("\n=== ¿z=0 y z=1 son distintos? ===")
for y in range(info["patternHeight"]):
    for x in range(2):
        a = repo.sprite_rgba(sid(info, 0, 0, y, x, 0))
        b = repo.sprite_rgba(sid(info, 0, 1, y, x, 0))
        print(f"  y={y} x={x}: píxeles distintos z0 vs z1 = {diff(a, b)} / {tile * tile}")

scale = 6
cw = 4 * tile * scale
ch = tile * scale
canvas = bytearray(cw * ch * 4)
for x in range(4):
    base = repo.sprite_rgba(sid(info, 2, 0, 0, x, 0))
    mask = repo.sprite_rgba(sid(info, 2, 0, 0, x, 1))
    img = composite(base, mask)
    for y in range(tile):
        for sx in range(tile):
            p = (y * tile + sx) * 4
            if not img[p + 3]:
                continue
            for dy in range(scale):
                for dx in range(scale):
                    d = ((y * scale + dy) * cw + x * tile * scale + sx * scale + dx) * 4
                    canvas[d:d + 4] = img[p:p + 4]
size = write_png(os.path.join(OUT, f"big{LOOK}_dirs.png"), cw, ch, bytes(canvas))
print(f"\n=> big{LOOK}_dirs.png {cw}x{ch} ({size} B) — fase 2, y0, z0, 4 direcciones a x{scale}")
