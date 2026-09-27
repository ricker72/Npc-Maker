"""Imprime regiones concretas píxel a píxel para interpretar las formas de los sprites."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)
entry = next(e for e in repo.sheet_entries if e["spritetype"] == 3)
sheet = repo._load_sheet(entry)
bitmap = sheet["bitmap"]


def show(x0, y0, w, h, title):
    print(f"\n--- {title}: región ({x0},{y0}) {w}x{h} (1 char = 1 px) ---")
    for y in range(y0, y0 + h):
        line = []
        for x in range(x0, x0 + w):
            px = bitmap.pixel(x, y)
            a = px[3]
            if not a:
                line.append(".")
            else:
                # distingue color plano (máscara) de sombreado
                line.append("#" if max(px[:3]) - min(px[:3]) > 40 else "+")
        print(f"{y:3d} " + "".join(line))


show(0, 0, 64, 64, "celda 1 de la rejilla 6x6 (blob alto 30x59)")
show(64, 0, 64, 64, "celda 2 de la rejilla 6x6 (blob ancho 58x31)")
