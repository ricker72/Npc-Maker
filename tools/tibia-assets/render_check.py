"""Render de comprobación: orientación, capas y semántica de las dimensiones de patrón."""
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


def get(info, phase, depth, y, x, layer):
    idx = sprite_index(phase, depth, y, x, layer, info["patternWidth"], info["patternHeight"],
                       info["patternDepth"], info["layers"])
    return info["spriteIds"][idx] if idx < len(info["spriteIds"]) else None


def magnify(rgba, tile, scale):
    out = bytearray()
    for y in range(tile):
        row = rgba[y * tile * 4:(y + 1) * tile * 4]
        for _ in range(scale):
            for x in range(tile):
                px = row[x * 4:x * 4 + 4]
                for _ in range(scale):
                    out += px
    return bytes(out)


def blit(canvas, cw, img, tile, x, y, scale):
    span = tile * scale
    for sy in range(span):
        src_row = (sy // scale) * tile * 4
        dst_row = ((y + sy) * cw + x) * 4
        for sx in range(span):
            src = src_row + (sx // scale) * 4
            if not img[src + 3]:
                continue
            dst = dst_row + sx * 4
            canvas[dst:dst + 4] = img[src:src + 4]


def composite(base, mask):
    out = bytearray()
    for i in range(0, len(mask), 4):
        mr, mg, mb, ma = mask[i:i + 4]
        if not ma:
            out += b"\x00\x00\x00\x00"
            continue
        br, bg, bb, _ = base[i:i + 4]
        lum = (br + bg + bb) / 3 / 255
        slot = COLOR_MARKERS.get((mr, mg, mb))
        r, g, b = CHOSEN.get(slot, (mr, mg, mb))
        factor = 0.45 + 0.75 * lum
        out += bytes((min(255, int(r * factor)), min(255, int(g * factor)),
                      min(255, int(b * factor)), 255))
    return bytes(out)


# ── Rejilla: filas = y, bloques = depth, columnas = direcciones (layer base + compuesto) ──
LOOK = 136
info = apps[2][LOOK]["groups"][1]["spriteInfo"]
tile = repo.sprite_meta(info["spriteIds"][0])["tile"]
scale = 1
cw = 4 * tile * scale
ch = info["patternHeight"] * info["patternDepth"] * tile * scale
canvas = bytearray(cw * ch * 4)

for depth in range(info["patternDepth"]):
    for y in range(info["patternHeight"]):
        for x in range(4):
            base_id = get(info, 0, depth, y, x, 0)
            mask_id = get(info, 0, depth, y, x, 1) if info["layers"] > 1 else None
            row = depth * info["patternHeight"] + y
            base = repo.sprite_rgba(base_id)
            if mask_id is not None:
                img = composite(base, repo.sprite_rgba(mask_id))
            else:
                img = base
            blit(canvas, cw, magnify(img, tile, scale), tile,
                 x * tile * scale, row * tile * scale, scale)

size = write_png(os.path.join(OUT, f"grid{LOOK}.png"), cw, ch, bytes(canvas))
print(f"=> grid{LOOK}.png {cw}x{ch} ({size} B) tile={tile} pattern="
      f"{info['patternWidth']}x{info['patternHeight']}x{info['patternDepth']} layers={info['layers']}")

# ── Animación (8 fases x 4 direcciones) de un outfit ──
phases = len(info["animation"]["phases"]) if info["animation"] else 1
sw = 4 * phases * tile * scale
canvas2 = bytearray(sw * tile * scale * 4)
for x in range(4):
    for p in range(phases):
        base = repo.sprite_rgba(get(info, p, 0, 0, x, 0))
        mask = repo.sprite_rgba(get(info, p, 0, 0, x, 1))
        blit(canvas2, sw, magnify(composite(base, mask), tile, scale), tile,
             (x * phases + p) * tile * scale, 0, scale)
size = write_png(os.path.join(OUT, f"anim{LOOK}.png"), sw, tile * scale, bytes(canvas2))
print(f"=> anim{LOOK}.png {sw}x{tile * scale} ({size} B) fases={phases} duraciones="
      f"{[p['durationMin'] for p in info['animation']['phases']]}")

# ── Mount 368 (una capa, color real) con su animación ──
minfo = apps[2][368]["groups"][1]["spriteInfo"]
mtile = repo.sprite_meta(minfo["spriteIds"][0])["tile"]
mphases = len(minfo["animation"]["phases"]) if minfo["animation"] else 1
msw = 4 * mphases * mtile * scale
mcanvas = bytearray(msw * mtile * scale * 4)
for x in range(4):
    for p in range(mphases):
        blit(mcanvas, msw, magnify(repo.sprite_rgba(get(minfo, p, 0, 0, x, 0)), mtile, scale), mtile,
             (x * mphases + p) * mtile * scale, 0, scale)
size = write_png(os.path.join(OUT, "mount368.png"), msw, mtile * scale, bytes(mcanvas))
print(f"=> mount368.png {msw}x{mtile * scale} ({size} B) fases={mphases} tile={mtile}")
