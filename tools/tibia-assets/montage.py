"""Montaje visual: cada celda de la hoja rotada 45° a la derecha, recortada.

Además superpone los frames de animación de un mismo look sobre un lienzo común
para comprobar que el anclaje (centro de celda -> centro de lienzo) es coherente.
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
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)


def cell_array(sprite_id):
    entry = repo.sheet_for(sprite_id)
    sh = repo._load_sheet(entry)
    t = sh["tile"]
    index = sprite_id - entry["firstspriteid"]
    col, row = index % sh["cols"], index // sh["cols"]
    a = np.frombuffer(sh["bitmap"].to_rgba(), dtype=np.uint8).reshape(
        sh["bitmap"].height, sh["bitmap"].width, 4)
    return a[row * t:(row + 1) * t, col * t:(col + 1) * t], t


def upright(sprite_id, pad=64, deg=-45):
    """Rota la celda alrededor de su centro y recorta, conservando el anclaje."""
    a, t = cell_array(sprite_id)
    size = t + 2 * pad
    canvas = np.zeros((size, size, 4), dtype=np.uint8)
    canvas[pad:pad + t, pad:pad + t] = a
    img = Image.fromarray(canvas, "RGBA").rotate(deg, resample=Image.NEAREST,
                                                 expand=False, fillcolor=(0, 0, 0, 0))
    return np.asarray(img), size, (size / 2, size / 2)


def trimmed(a):
    mask = a[:, :, 3] > 0
    if not mask.any():
        return a, (0, 0)
    ys, xs = np.where(mask)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (xs.min(), ys.min())


def info_of(app, look, group):
    return apps[app][look]["groups"][group]["spriteInfo"]


# 1) montaje de las 36 celdas de la hoja del look 136 (idle), rotadas y recortadas
info = info_of(2, 136, 0)
sid0 = info["spriteIds"][0]
entry = repo.sheet_for(sid0)
ids = list(range(entry["firstspriteid"], entry["lastspriteid"] + 1))
tiles = []
for sid in ids:
    arr, _, _ = upright(sid)
    t2, _ = trimmed(arr)
    tiles.append(t2)
cell_w = max(t.shape[1] for t in tiles) + 2
cell_h = max(t.shape[0] for t in tiles) + 2
mont = np.zeros((cell_h * 6, cell_w * 6, 4), dtype=np.uint8)
mont[:, :] = (40, 40, 40, 255)
for k, t in enumerate(tiles):
    r, c = divmod(k, 6)
    mont[r * cell_h:r * cell_h + t.shape[0], c * cell_w:c * cell_w + t.shape[1]] = t
Image.fromarray(mont, "RGBA").resize((mont.shape[1] * 2, mont.shape[0] * 2),
                                     Image.NEAREST).save(os.path.join(OUT, "montage36.png"))
print(f"-> montage36.png  ({cell_w}x{cell_h} por celda, "
      f"max sprite recortado = {cell_w - 2}x{cell_h - 2})")

# 2) superposición de frames de animación (movimiento, misma dirección)
mov = info_of(2, 136, 1)
pw, ph, pd, layers = mov["patternWidth"], mov["patternHeight"], mov["patternDepth"], mov["layers"]
nphase = len(mov.get("animation", [{}])) or 1
print(f"look136 mov: patrón {pw}x{ph}x{pd} capas={layers} fases={nphase}")
frames = []
for p in range(nphase):
    i = sprite_index(p, 0, 0, 0, 0, pw, ph, pd, layers)
    arr, size, _ = upright(mov["spriteIds"][i])
    frames.append(arr)
acc = np.zeros(frames[0].shape, dtype=np.uint8)
for f in frames:
    alpha = (f[:, :, 3] > 0)[:, :, None]
    acc = np.where(alpha, f, acc)
Image.fromarray(acc, "RGBA").resize((acc.shape[1] * 3, acc.shape[0] * 3),
                                    Image.NEAREST).save(os.path.join(OUT, "overlay_frames.png"))
print(f"-> overlay_frames.png ({nphase} fases superpuestas)")
