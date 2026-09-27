"""Mapa ASCII de la hoja COMPLETA: revela el layout global de celdas/sprites."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tibia_assets import SpriteRepository, decompress_cip_lzma  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)

entry = next(e for e in repo.sheet_entries if e["spritetype"] == 3)
raw = open(os.path.join(ASSETS, entry["file"]), "rb").read()
sheet = repo._load_sheet(entry)
bitmap = sheet["bitmap"]
count = entry["lastspriteid"] - entry["firstspriteid"] + 1
print(f"hoja: {entry['file'][:24]}... ids {entry['firstspriteid']}..{entry['lastspriteid']} "
      f"({count} sprites) spritetype={entry['spritetype']} -> {bitmap.width}x{bitmap.height} "
      f"celdas {sheet['cols']}x{sheet['rows']} de {sheet['tile']}")

step = 4
print(f"\nmapa completo ({bitmap.width // step}x{bitmap.height // step} chars, 1 char = {step}x{step}px):")
for y in range(0, bitmap.height, step):
    line = []
    for x in range(0, bitmap.width, step):
        opaque = False
        for dy in range(step):
            for dx in range(step):
                if bitmap.pixel(x + dx, y + dy)[3]:
                    opaque = True
        line.append("#" if opaque else ".")
    print(f"{y:3d} " + "".join(line))
