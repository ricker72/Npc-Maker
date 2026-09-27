"""Vuelca en texto los píxeles reales de una celda: máscara de alfa en ASCII y
valores RGB de una ventana, para ver si hay patrón (tramado/entrelazado)."""
import os
import sys
from collections import Counter

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)

info = apps[2][136]["groups"][0]["spriteInfo"]
sid = info["spriteIds"][0]
entry = repo.sheet_for(sid)
sh = repo._load_sheet(entry)
t = sh["tile"]
a = np.frombuffer(sh["bitmap"].to_rgba(), dtype=np.uint8).reshape(
    sh["bitmap"].height, sh["bitmap"].width, 4)
print(f"sprite {sid} tile={t} hoja {entry['file'][:12]}.. lienzo={a.shape[1]}x{a.shape[0]}")

cell = a[:t, :t]
print("\nMÁSCARA DE ALFA de la celda 0 (0=vacío, .=<128, #>=128):")
for r in range(0, t, 1):
    line = ""
    for c in range(0, t, 1):
        v = int(cell[r, c, 3])
        line += "0" if v == 0 else ("." if v < 128 else "#")
    print(f"{r:3d} {line}")

print("\nRGBA de la ventana fila 24-35, col 12-27 (R:G:B:A en hex):")
for r in range(24, 36):
    print(f"{r:3d} " + " ".join(f"{cell[r, c, 0]:02x}{cell[r, c, 1]:02x}{cell[r, c, 2]:02x}"
                                f"{cell[r, c, 3]:02x}" for c in range(12, 28)))

alphas = Counter(int(v) for v in a[:, :, 3].ravel())
print("\nvalores de alfa más frecuentes:", alphas.most_common(8))
rgbs = Counter(tuple(int(x) for x in v) for v in a[:, :, :3].reshape(-1, 3))
print("RGB más frecuentes:", rgbs.most_common(8))

print("\nnúmero de colores únicos:", len(rgbs), " filas/columnas totales:", a.shape[:2])
