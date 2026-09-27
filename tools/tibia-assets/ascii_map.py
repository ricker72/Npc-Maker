"""Mapa ASCII del contenido real de la hoja alrededor de una celda: ¿está cortado?"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)


def ascii_map(bitmap, x0, y0, width, height, step=2):
    lines = []
    for y in range(y0, y0 + height, step):
        line = []
        for x in range(x0, x0 + width, step):
            opaque = False
            for dy in range(step):
                for dx in range(step):
                    if x + dx < bitmap.width and y + dy < bitmap.height:
                        if bitmap.pixel(x + dx, y + dy)[3]:
                            opaque = True
            line.append("#" if opaque else ".")
        lines.append("".join(line))
    return lines


info = apps[2][136]["groups"][1]["spriteInfo"]
tile = 64
print(f"look 136: pattern={info['patternWidth']}x{info['patternHeight']}x{info['patternDepth']} "
      f"layers={info['layers']} sprites={len(info['spriteIds'])}")

for (z, y, x, layer) in [(0, 0, 2, 0), (1, 0, 2, 0)]:
    idx = sprite_index(2, z, y, x, layer, info["patternWidth"], info["patternHeight"],
                       info["patternDepth"], info["layers"])
    sprite_id = info["spriteIds"][idx]
    entry = repo.sheet_for(sprite_id)
    sheet = repo._load_sheet(entry)
    bitmap = sheet["bitmap"]
    index = sprite_id - sheet["first"]
    col, row = index % sheet["cols"], index // sheet["cols"]
    print(f"\nsprite {sprite_id} (z={z} y={y} x={x} layer={layer}) -> hoja "
          f"{bitmap.width}x{bitmap.height} ({sheet['cols']}x{sheet['rows']} celdas de {sheet['tile']}) "
          f"celda=({col},{row}) origen=({col * tile},{row * tile})")
    region = ascii_map(bitmap, col * tile, row * tile, 128, 128)
    for line in region:
        print("   " + line)
