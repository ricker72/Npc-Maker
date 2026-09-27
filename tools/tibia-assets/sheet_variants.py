"""Prueba visual decisiva: ¿la hoja está ROTADA 45° o CIZALLADA 1 px/fila?

Emite, para una misma hoja real del cliente 15.33:
  sheet_raw.png        tal cual, con la rejilla de tiles supuesta marcada
  sheet_pil_p45/m45    rotación PIL (+/-45°, sentido matemático CCW)
  sheet_shear_m1/p1    deshacer cizalladura de 1 px por fila
  sheet_cell_*         el sprite de prueba sin corregir y con cada corrección
"""
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
os.makedirs(OUT, exist_ok=True)

repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)

info = apps[2][136]["groups"][0]["spriteInfo"]
idx = sprite_index(0, 0, 0, 0, 0, info["patternWidth"], info["patternHeight"],
                   info["patternDepth"], info["layers"])
sprite_id = info["spriteIds"][idx]
entry = repo.sheet_for(sprite_id)
sheet = repo._load_sheet(entry)
bm = sheet["bitmap"]
print(f"sprite {sprite_id}  hoja {entry['file'][:18]}...  type={entry['spritetype']}  "
      f"sprites={entry['lastspriteid'] - entry['firstspriteid'] + 1}  "
      f"bitmap={bm.width}x{bm.height} bpp={bm.bpp} comp={bm.compression} "
      f"shift={bm._shift}  tile={sheet['tile']} grid={sheet['cols']}x{sheet['rows']}")

arr = np.frombuffer(bm.to_rgba(), dtype=np.uint8).reshape(bm.height, bm.width, 4).copy()
print(f"  píxeles alfa > 0: {int((arr[:, :, 3] > 0).sum())} / {bm.width * bm.height}")


def save(a, name, scale=3):
    img = Image.fromarray(a, "RGBA")
    img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    img.save(os.path.join(OUT, name))
    print(f"  -> {name} {img.size}")


def rot(a, deg):  # deg > 0 = antihorario (PIL)
    return np.asarray(Image.fromarray(a, "RGBA").rotate(deg, resample=Image.NEAREST,
                                                        expand=True, fillcolor=(0, 0, 0, 0)))


def shear(a, k):
    """Desplaza la fila y en k*y px: deshace un almacenamiento cizallado."""
    h, w = a.shape[:2]
    out = np.zeros_like(a)
    for y in range(h):
        shift = int(round(k * y))
        if shift >= 0:
            out[y, :w - shift] = a[y, shift:]
        else:
            out[y, -shift:] = a[y, :w + shift]
    return out


def trim(a):
    mask = a[:, :, 3] > 0
    if not mask.any():
        return a
    ys, xs = np.where(mask)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


grid = arr.copy()
t = sheet["tile"]
for c in range(sheet["cols"] + 1):
    grid[:, min(bm.width - 1, c * t)] = (255, 0, 255, 255)
for r in range(sheet["rows"] + 1):
    grid[min(bm.height - 1, r * t), :] = (255, 0, 255, 255)
save(grid, "sheet_raw_grid.png", 2)

save(rot(arr, 0), "sheet_raw.png", 2)
save(trim(rot(arr, 45)), "sheet_pil_p45.png", 2)
save(trim(rot(arr, -45)), "sheet_pil_m45.png", 2)
save(trim(shear(arr, -1.0)), "sheet_shear_m1.png", 2)
save(trim(shear(arr, 1.0)), "sheet_shear_p1.png", 2)

# celda individual con cada corrección (el tile tal y como lo extrae la app)
cell = np.frombuffer(repo.sprite_rgba(sprite_id), dtype=np.uint8).reshape(t, t, 4).copy()


def on_canvas(a, size=160):
    c = np.zeros((size, size, 4), dtype=np.uint8)
    y0 = (size - a.shape[0]) // 2
    x0 = (size - a.shape[1]) // 2
    c[y0:y0 + a.shape[0], x0:x0 + a.shape[1]] = a
    return c


save(on_canvas(cell), "cell_raw.png", 4)
save(trim(on_canvas(rot(cell, -45))), "cell_rotcw45.png", 4)
save(trim(on_canvas(rot(cell, 45))), "cell_rotccw45.png", 4)
save(trim(shear(on_canvas(cell), -1.0)), "cell_shear_m1.png", 4)
save(trim(shear(on_canvas(cell), 1.0)), "cell_shear_p1.png", 4)
