"""¿Están los sprites almacenados rotados o cizallados? Mide el bbox mínimo."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)


def alpha_grid(sprite_id, size):
    rgba = repo.sprite_rgba(sprite_id)
    return [[1 if rgba[(y * size + x) * 4 + 3] else 0 for x in range(size)] for y in range(size)]


def bbox_area(grid, w, h):
    xs = [x for y in range(h) for x in range(w) if grid[y][x]]
    ys = [y for y in range(h) for x in range(w) if grid[y][x]]
    if not xs:
        return None
    return (max(xs) - min(xs) + 1) * (max(ys) - min(ys) + 1), \
           (max(xs) - min(xs) + 1, max(ys) - min(ys) + 1)


def rotate_grid(grid, size, degrees):
    rad = math.radians(degrees)
    cos, sin = math.cos(rad), math.sin(rad)
    out = [[0] * size for _ in range(size)]
    c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            # rotación inversa (mapea destino -> origen)
            sx = int(round(cos * (x - c) - sin * (y - c) + c))
            sy = int(round(sin * (x - c) + cos * (y - c) + c))
            if 0 <= sx < size and 0 <= sy < size:
                out[y][x] = grid[sy][sx]
    return out


def shear_grid(grid, size, factor):
    out = [[0] * size for _ in range(size)]
    for y in range(size):
        shift = int(round(factor * y))
        for x in range(size):
            sx = x - shift
            if 0 <= sx < size:
                out[y][x] = grid[y][sx]
    return out


info = apps[2][136]["groups"][1]["spriteInfo"]
size = repo.sprite_meta(info["spriteIds"][0])["tile"]
idx = sprite_index(2, 0, 0, 2, 0, info["patternWidth"], info["patternHeight"],
                   info["patternDepth"], info["layers"])
grid = alpha_grid(info["spriteIds"][idx], size)
base = bbox_area(grid, size, size)
print(f"look 136 sprite {info['spriteIds'][idx]} (tile {size}) bbox original = {base[1]} "
      f"área={base[0]}")

print("\n--- mejores rotaciones (menor área de bbox) ---")
results = []
for deg in range(-90, 91, 3):
    res = bbox_area(rotate_grid(grid, size, deg), size, size)
    if res:
        results.append((res[0], deg, res[1]))
results.sort()
for area, deg, box in results[:6]:
    print(f"   {deg:+4d}° -> bbox={box} área={area}")

print("\n--- mejores cizalladuras (menor área de bbox) ---")
results = []
for i in range(-200, 201, 5):
    f = i / 100
    res = bbox_area(shear_grid(grid, size, f), size, size)
    if res:
        results.append((res[0], f, res[1]))
results.sort()
for area, f, box in results[:6]:
    print(f"   {f:+.2f} px/fila -> bbox={box} área={area}")
