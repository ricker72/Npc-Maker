"""Mapa del canal alfa de una hoja completa (ASCII 1:4 + PNG), y estadísticas."""
import os
import sys
from collections import Counter

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

info = apps[2][136]["groups"][0]["spriteInfo"]
sid = info["spriteIds"][0]
entry = repo.sheet_for(sid)
sh = repo._load_sheet(entry)
bm = sh["bitmap"]
a = np.frombuffer(bm.to_rgba(), dtype=np.uint8).reshape(bm.height, bm.width, 4)
print(f"sprite {sid} {bm.width}x{bm.height} bottom_up={bm.bottom_up} bpp={bm.bpp} "
      f"shift={bm._shift} tile={sh['tile']}")
al = a[:, :, 3]
print("valores de alfa más frecuentes:", Counter(al.ravel().tolist()).most_common(6))
print(f"alfa==0: {(al == 0).mean():.1%}  alfa==255: {(al == 255).mean():.1%}  "
      f"parcial: {((al > 0) & (al < 255)).mean():.1%}")
magenta = (a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255)
print(f"píxeles magenta puro: {int(magenta.sum())} ({100 * magenta.mean():.1f}%); "
      f"de ellos con alfa 0: {int((magenta & (al == 0)).sum())}")
blanco = (a[:, :, :3] == 255).all(axis=2)
print(f"píxeles blancos puros: {int(blanco.sum())} ({100 * blanco.mean():.1f}%) "
      f"con alfa 0: {int((blanco & (al == 0)).sum())}")

STEP = 4
h, w = al.shape
print(f"\nMAPA DE ALFA (cada carácter = {STEP}x{STEP} px; ' '=0, '#'=255):")
chars = " .:-=+*#%@"
for y in range(0, h, STEP):
    line = ""
    for x in range(0, w, STEP):
        mean = al[y:y + STEP, x:x + STEP].mean() / 255
        line += chars[min(9, int(mean * 9.99))]
    print(f"{y:4d} {line}")

Image.fromarray(a, "RGBA").resize((w * 2, h * 2), Image.NEAREST).save(
    os.path.join(OUT, "map_alpha_rgba.png"))
rgb = a[:, :, :3].copy()
rgb[al == 0] = (255, 0, 255)
Image.fromarray(rgb, "RGBA").resize((w * 2, h * 2), Image.NEAREST).save(
    os.path.join(OUT, "map_rgb.png"))
Image.fromarray(al, "L").resize((w * 2, h * 2), Image.NEAREST).save(
    os.path.join(OUT, "map_only_alpha.png"))
print(f"\n-> map_alpha_rgba.png / map_rgb.png / map_only_alpha.png en {OUT}")
