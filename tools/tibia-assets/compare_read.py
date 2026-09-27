"""Compara la lectura de un sprite por la API (tile) contra la lectura manual de la hoja."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)

info = apps[2][136]["groups"][1]["spriteInfo"]
idx = sprite_index(2, 0, 0, 2, 0, info["patternWidth"], info["patternHeight"],
                   info["patternDepth"], info["layers"])
sprite_id = info["spriteIds"][idx]
entry = repo.sheet_for(sprite_id)
sheet = repo._load_sheet(entry)
bitmap = sheet["bitmap"]
count = entry["lastspriteid"] - entry["firstspriteid"] + 1

print(f"look 136 sprite {sprite_id}")
print(f"  hoja: {entry['file'][:22]}... spritetype={entry['spritetype']} sprites={count} "
      f"firstsprite={entry['firstspriteid']} lastsprite={entry['lastspriteid']}")
print(f"  sheet calculada: grid={sheet['cols']}x{sheet['rows']} tile={sheet['tile']} "
      f"bitmap={bitmap.width}x{bitmap.height}")
print(f"  índice dentro de la hoja = {sprite_id - entry['firstspriteid']}")

rgba = repo.sprite_rgba(sprite_id)
tile = sheet["tile"]


def show_grid(grid, size, label):
    print(f"\n--- {label} ({size}x{size}) ---")
    for y in range(size):
        print(f"{y:3d} " + "".join("#" if grid[y][x] else "." for x in range(size)))


grid_api = [[1 if rgba[(y * tile + x) * 4 + 3] else 0 for x in range(tile)] for y in range(tile)]
show_grid(grid_api, tile, "lectura por repo.sprite_rgba()")

# lectura manual: índice secuencial fila a fila dentro de la hoja
index = sprite_id - entry["firstspriteid"]
col, row = index % sheet["cols"], index // sheet["cols"]
manual = [[1 if bitmap.pixel(col * tile + x, row * tile + y)[3] else 0 for x in range(tile)]
          for y in range(tile)]
show_grid(manual, tile, f"lectura manual celda=({col},{row})")

same = sum(1 for y in range(tile) for x in range(tile) if grid_api[y][x] != manual[y][x])
print(f"\ndiferencias entre ambas lecturas: {same} / {tile * tile}")
