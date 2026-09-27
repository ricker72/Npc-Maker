"""Determina el tamaño de celda real de una hoja por autocorrelación del canal alfa."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)


def analyse(entry):
    sheet = repo._load_sheet(entry)
    bitmap = sheet["bitmap"]
    count = entry["lastspriteid"] - entry["firstspriteid"] + 1
    w, h = bitmap.width, bitmap.height
    alpha = [[1 if bitmap.pixel(x, y)[3] else 0 for x in range(w)] for y in range(h)]

    print(f"\n=== {entry['file'][:20]}... spritetype={entry['spritetype']} sprites={count} "
          f"hoja={w}x{h} ===")

    for axis, limit in (("x", w // 2), ("y", h // 2)):
        scores = []
        for d in range(8, limit):
            if axis == "x":
                same = sum(1 for y in range(0, h, 3) for x in range(0, w - d, 2)
                           if alpha[y][x] == alpha[y][x + d])
                total = sum(1 for y in range(0, h, 3) for x in range(0, w - d, 2))
            else:
                same = sum(1 for y in range(0, h - d, 2) for x in range(0, w, 3)
                           if alpha[y][x] == alpha[y + d][x])
                total = sum(1 for y in range(0, h - d, 2) for x in range(0, w, 3))
            scores.append((same / total, d))
        scores.sort(reverse=True)
        top = " ".join(f"{d}px:{s:.3f}" for s, d in scores[:6])
        print(f"  autocorrelación en {axis}: mejores desplazamientos -> {top}")

    # fracción de celdas con contenido tocando el borde (grid correcto => valor bajo)
    for cell in (32, 64):
        cols, rows = w // cell, h // cell
        touching, used = 0, 0
        for cy in range(rows):
            for cx in range(cols):
                interior = any(alpha[y][x] for y in range(cy * cell + 1, (cy + 1) * cell - 1)
                               for x in range(cx * cell + 1, (cx + 1) * cell - 1))
                if not interior:
                    continue
                used += 1
                border = any(alpha[y][x] for x in range(cx * cell, (cx + 1) * cell)
                             for y in (cy * cell, (cy + 1) * cell - 1))
                border = border or any(alpha[y][x] for y in range(cy * cell, (cy + 1) * cell)
                                       for x in (cx * cell, (cx + 1) * cell - 1))
                if border:
                    touching += 1
        print(f"  celda {cell}px -> {cols}x{rows}={cols * rows} celdas, con contenido={used}, "
              f"tocando borde={touching} ({(touching / used * 100) if used else 0:.0f}%)")


for st in (3, 0, 2):
    analyse(next(e for e in repo.sheet_entries if e["spritetype"] == st))
