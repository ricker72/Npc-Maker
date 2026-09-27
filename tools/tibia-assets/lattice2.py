"""Analiza la rejilla REAL de una hoja: periodos por autocorrelación de máscaras
de fila/columna ocupadas, y si el contenido sangra entre celdas."""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, ".tmp-inspect")
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)


def sheet_of(app, look, group, phase, x):
    info = apps[app][look]["groups"][group]["spriteInfo"]
    i = sprite_index(phase, 0, 0, x, 0, info["patternWidth"], info["patternHeight"],
                     info["patternDepth"], info["layers"])
    sid = info["spriteIds"][i]
    entry = repo.sheet_for(sid)
    sh = repo._load_sheet(entry)
    return sid, entry, sh


def occupancy(sh):
    a = np.frombuffer(sh["bitmap"].to_rgba(), dtype=np.uint8).reshape(
        sh["bitmap"].height, sh["bitmap"].width, 4)
    return a, (a[:, :, 3] > 0)


def period(mask_axis, label):
    """Autocorrelación: periodo k tal que la máscara se repite cada k posiciones."""
    v = mask_axis.astype(np.int64)
    n = len(v)
    print(f"  {label}: ocupadas={int(v.sum())}/{n}  periodo: ", end="")
    scored = []
    for k in range(4, min(n // 2, 130)):
        a = v[:n - k]
        b = v[k:]
        agree = int((a == b).sum()) / len(a)
        empty_frac = 1.0 - v.mean()
        scored.append((agree, k, empty_frac))
    scored.sort(reverse=True)
    print(", ".join(f"k={k}:{agree:.3f}" for agree, k, _ in scored[:6]))


def bleed(sh, tile):
    """¿Cuántos píxeles alfa caen fuera de las celdas (bordes de 2 px) -> sangrado?"""
    _, mask = occupancy(sh)
    h, w = mask.shape
    border = np.zeros_like(mask)
    for r in range(0, h, tile):
        border[r:r + 2] = True
        border[max(0, r - 2):r] = True
    for c in range(0, w, tile):
        border[:, c:c + 2] |= True
        border[:, max(0, c - 2):c] |= True
    tot = int(mask.sum())
    return tot, int((mask & border).sum())


def blobs(mask):
    """Componentes conectados 8-vecinos: tamaño y bbox de cada sprite detectado."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    out = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                stack = [(y, x)]
                seen[y, x] = True
                pts = []
                while stack:
                    cy, cx = stack.pop()
                    pts.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True
                                stack.append((ny, nx))
                ys = [p[0] for p in pts]
                xs = [p[1] for p in pts]
                out.append({"px": len(pts), "x0": min(xs), "y0": min(ys),
                            "w": max(xs) - min(xs) + 1, "h": max(ys) - min(ys) + 1})
    return out


for tag, args in [("look136 idle", (2, 136, 0, 0, 0)), ("look136 mov", (2, 136, 1, 0, 0)),
                  ("look58 idle", (2, 58, 0, 0, 0)), ("look6 idle", (2, 6, 0, 0, 0))]:
    sid, entry, sh = sheet_of(*args)
    count = entry["lastspriteid"] - entry["firstspriteid"] + 1
    a, mask = occupancy(sh)
    h, w = mask.shape
    print(f"\n### {tag}: sprite {sid} hoja {entry['file'][:14]}.. type={entry['spritetype']} "
          f"sprites={count} lienzo={w}x{h}")
    period(mask.any(axis=0), "columnas")
    period(mask.any(axis=1), "filas")
    for tile in (16, 32, 64):
        tot, on_border = bleed(sh, tile)
        print(f"  sangrado con tile={tile}: {on_border}/{tot} px alfa en bordes "
              f"({100 * on_border / tot:.1f}%)  celdas={(w // tile) * (h // tile)} vs {count}")
    b = blobs(mask)
    big = sorted(b, key=lambda d: -d["px"])[:12]
    print(f"  blobs detectados={len(b)}  mayores: " +
          ", ".join(f"{d['w']}x{d['h']}@({d['x0']},{d['y0']})/{d['px']}" for d in big))
    ws = sorted(d["w"] for d in b)
    hs = sorted(d["h"] for d in b)
    print(f"  anchos min/med/max = {ws[0]}/{ws[len(ws) // 2]}/{ws[-1]}  "
          f"altos = {hs[0]}/{hs[len(hs) // 2]}/{hs[-1]}")
    xs = sorted(d["x0"] for d in b)
    ys = sorted(d["y0"] for d in b)
    print(f"  x0 = {xs[:16]}")
    print(f"  y0 = {ys[:16]}")

# hoja ampliada para ver la rejilla de 16 px
sid, entry, sh = sheet_of(2, 136, 0, 0, 0)
a, mask = occupancy(sh)
img = Image.fromarray(a, "RGBA").resize((a.shape[1] * 3, a.shape[0] * 3), Image.NEAREST)
arr = np.asarray(img).copy()
t = 16 * 3
for c in range(0, arr.shape[1], t):
    arr[:, c:c + 1] = (255, 0, 255, 255)
for r in range(0, arr.shape[0], t):
    arr[r:r + 1, :] = (255, 0, 255, 255)
Image.fromarray(arr, "RGBA").save(os.path.join(OUT, "sheet_grid16.png"))
print(f"\n-> {os.path.join(OUT, 'sheet_grid16.png')}")
