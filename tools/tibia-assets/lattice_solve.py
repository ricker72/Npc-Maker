"""Resuelve el ángulo y la rejilla reales de una hoja del cliente 15.33.

Idea: si los sprites están rotados un ángulo fijo, al girar la hoja completa ese
ángulo los bordes de las celdas vuelven a ser horizontales/verticales y aparecen
filas y columnas *totalmente vacías* (los huecos entre sprites). Maximizar el
número de líneas vacías da el ángulo; la posición de esos huecos da periodo y
desfase de la rejilla.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)

info = apps[2][136]["groups"][0]["spriteInfo"]
idx = sprite_index(0, 0, 0, 0, 0, info["patternWidth"], info["patternHeight"],
                   info["patternDepth"], info["layers"])
sprite_id = info["spriteIds"][idx]
entry = repo.sheet_for(sprite_id)
sheet = repo._load_sheet(entry)
bm = sheet["bitmap"]
count = entry["lastspriteid"] - entry["firstspriteid"] + 1
arr = Image.fromarray(np.frombuffer(bm.to_rgba(), dtype=np.uint8).reshape(
    bm.height, bm.width, 4), "RGBA")
print(f"sprite {sprite_id} hoja {entry['file'][:16]}... type={entry['spritetype']} "
      f"sprites={count} tamaño={bm.width}x{bm.height}")


def empties(img):
    a = np.asarray(img)[:, :, 3]
    rows = int((a.sum(axis=1) == 0).sum())
    cols = int((a.sum(axis=0) == 0).sum())
    return rows, cols


base = empties(arr)
print(f"\n0.00°   filas vacías={base[0]:4d} cols vacías={base[1]:4d} total={sum(base)}")

print("\n--- barrido de ángulo (PIL: positivo = antihorario) ---")
results = []
for i in range(-5200, -3800, 25):
    deg = i / 100.0
    img = arr.rotate(deg, resample=Image.NEAREST, expand=True, fillcolor=(0, 0, 0, 0))
    r, c = empties(img)
    results.append((r + c, deg, r, c))
for i in range(0, 1200, 25):  # también el sentido opuesto, por si acaso
    deg = i / 100.0
    img = arr.rotate(deg, resample=Image.NEAREST, expand=True, fillcolor=(0, 0, 0, 0))
    r, c = empties(img)
    results.append((r + c, deg, r, c))
results.sort(reverse=True)
for total, deg, r, c in results[:8]:
    print(f"  {deg:+7.2f}°  filas={r:4d} cols={c:4d} total={total}")

best_deg = results[0][1]
best = arr.rotate(best_deg, resample=Image.NEAREST, expand=True, fillcolor=(0, 0, 0, 0))
a = np.asarray(best)[:, :, 3]
print(f"\nmejor ángulo {best_deg:+.2f}°  lienzo {a.shape[1]}x{a.shape[0]}")


def runs(mask):
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(mask) - 1))
    return out


row_empty = a.sum(axis=1) == 0
col_empty = a.sum(axis=0) == 0
print("huecos de FILA vacíos (inicio,fin,longitud):")
print("  ", [(s, e, e - s + 1) for s, e in runs(row_empty)][:40])
print("huecos de COLUMNA vacíos:")
print("  ", [(s, e, e - s + 1) for s, e in runs(col_empty)][:40])
