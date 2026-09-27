"""Cuenta los 'blobs' (componentes conectados del alfa) de una hoja: cuántos sprites hay y de qué tamaño."""
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)


def blobs(entry, max_report=8):
    sheet = repo._load_sheet(entry)
    bitmap = sheet["bitmap"]
    w, h = bitmap.width, bitmap.height
    grid = [[1 if bitmap.pixel(x, y)[3] else 0 for x in range(w)] for y in range(h)]
    seen = [[False] * w for _ in range(h)]
    found = []
    for y0 in range(h):
        for x0 in range(w):
            if not grid[y0][x0] or seen[y0][x0]:
                continue
            queue = deque([(x0, y0)])
            seen[y0][x0] = True
            minx = maxx = x0
            miny = maxy = y0
            size = 0
            while queue:
                x, y = queue.popleft()
                size += 1
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and grid[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        queue.append((nx, ny))
            found.append({"bbox": (minx, miny, maxx, maxy), "size": size})

    found.sort(key=lambda b: (b["bbox"][1], b["bbox"][0]))
    count = entry["lastspriteid"] - entry["firstspriteid"] + 1
    print(f"\n=== {entry['file'][:20]}... spritetype={entry['spritetype']} sprites_en_rango={count} "
          f"hoja={w}x{h} -> blobs={len(found)} ===")
    for blob in found[:max_report]:
        minx, miny, maxx, maxy = blob["bbox"]
        print(f"   blob bbox=({minx},{miny})-({maxx},{maxy}) "
              f"tamaño={maxx - minx + 1}x{maxy - miny + 1} px={blob['size']}")
    widths = [b["bbox"][2] - b["bbox"][0] + 1 for b in found]
    if widths:
        print(f"   ancho de blobs: min={min(widths)} max={max(widths)} medio={sum(widths) / len(widths):.1f}")


for st in (3, 0, 2, 1):
    blobs(next(e for e in repo.sheet_entries if e["spritetype"] == st))
