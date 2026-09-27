"""Prueba de la hipótesis 'hoja rotada 45°': rota una región del sprite y compara."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository, write_png  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, ".tmp-inspect")

repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)

info = apps[2][136]["groups"][1]["spriteInfo"]
idx = sprite_index(2, 0, 0, 2, 0, info["patternWidth"], info["patternHeight"],
                   info["patternDepth"], info["layers"])
sprite_id = info["spriteIds"][idx]
entry = repo.sheet_for(sprite_id)
sheet = repo._load_sheet(entry)
bitmap = sheet["bitmap"]
index = sprite_id - entry["firstspriteid"]
col, row = index % sheet["cols"], index // sheet["cols"]
tile = sheet["tile"]
x0, y0 = col * tile, row * tile

# región ampliada (256x256) alrededor del sprite para no perder contenido al rotar
REG = 256
region = [[bitmap.pixel(min(bitmap.width - 1, max(0, x0 - (REG - tile) // 2 + x)),
                        min(bitmap.height - 1, max(0, y0 - (REG - tile) // 2 + y)))
           for x in range(REG)] for y in range(REG)]


def rotate(pixels, size, degrees, out_size):
    rad = math.radians(degrees)
    cos, sin = math.cos(rad), math.sin(rad)
    c = (size - 1) / 2
    co = (out_size - 1) / 2
    out = [[(0, 0, 0, 0)] * out_size for _ in range(out_size)]
    for y in range(out_size):
        for x in range(out_size):
            sx = cos * (x - co) - sin * (y - co) + c
            sy = sin * (x - co) + cos * (y - co) + c
            ix, iy = int(round(sx)), int(round(sy))
            if 0 <= ix < size and 0 <= iy < size:
                out[y][x] = pixels[iy][ix]
    return out


def to_ascii(pixels, size, step=2):
    lines = []
    for y in range(0, size, step):
        line = []
        for x in range(0, size, step):
            line.append("#" if pixels[y][x][3] else ".")
        lines.append("".join(line))
    return lines


for deg in (0, -45, 45):
    rotated = rotate(region, REG, deg, REG)
    print(f"\n=== rotación {deg:+d}° ===")
    for line in to_ascii(rotated, REG, 4):
        print("   " + line)

    # PNG para inspección visual
    scale = 1
    canvas = bytearray(REG * REG * 4)
    for y in range(REG):
        for x in range(REG):
            r, g, b, a = rotated[y][x]
            d = (y * REG + x) * 4
            canvas[d:d + 4] = bytes((r, g, b, a if a else 0))
    write_png(os.path.join(OUT, f"rot{deg}.png"), REG * scale, REG * scale, bytes(canvas))
    print(f"   -> rot{deg}.png")
