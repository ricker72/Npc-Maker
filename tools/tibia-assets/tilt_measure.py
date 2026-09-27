"""Mide el ángulo exacto de la rotación de almacenamiento (nube de puntos, rápido)."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)


def cell_points(app_id, look, group, phase, z, y, x):
    info = apps[app_id][look]["groups"][group]["spriteInfo"]
    i = sprite_index(phase, z, y, x, 0, info["patternWidth"], info["patternHeight"],
                     info["patternDepth"], info["layers"])
    sid = info["spriteIds"][i]
    rgba = repo.sprite_rgba(sid)
    tile = repo.sprite_meta(sid)["tile"]
    pts = [(x2 - tile / 2.0, y2 - tile / 2.0)
           for y2 in range(tile) for x2 in range(tile)
           if rgba[(y2 * tile + x2) * 4 + 3]]
    return sid, tile, pts


def tilt_of(points, deg):
    """Pendiente (en grados) del centroide por fila tras rotar `deg` grados."""
    rad = math.radians(deg)
    cos, sin = math.cos(rad), math.sin(rad)
    rows = {}
    xs, ys = [], []
    for px, py in points:
        nx = cos * px - sin * py
        ny = sin * px + cos * py
        acc = rows.setdefault(int(round(ny)), [0.0, 0])
        acc[0] += nx
        acc[1] += 1
        xs.append(nx)
        ys.append(ny)
    data = [(v[0] / v[1], k) for k, v in rows.items() if v[1] >= 2]
    if len(data) < 8:
        return None
    k = len(data)
    sy = sum(d[1] for d in data)
    sx = sum(d[0] for d in data)
    syy = sum(d[1] * d[1] for d in data)
    sxy = sum(d[0] * d[1] for d in data)
    den = k * syy - sy * sy
    if den == 0:
        return None
    slope = (k * sxy - sx * sy) / den
    bbox = (int(max(xs) - min(xs)) + 1, int(max(ys) - min(ys)) + 1)
    return math.degrees(math.atan(slope)), bbox[0] * bbox[1], bbox


cases = [
    ("look136 idle f0 x0", (2, 136, 0, 0, 0, 0, 0)),
    ("look136 mov  f2 x2", (2, 136, 1, 2, 0, 0, 2)),
    ("look58  idle f0 x0", (2, 58, 0, 0, 0, 0, 0)),
    ("look 6  idle f0 x0", (2, 6, 0, 0, 0, 0, 0)),
]
for name, args in cases:
    sid, tile, pts = cell_points(*args)
    if len(pts) < 40:
        print(f"\n### {name} sprite={sid}: solo {len(pts)} px, se omite")
        continue
    print(f"\n### {name}  sprite={sid} tile={tile} px={len(pts)}")
    res = []
    for deg in range(-75, 76, 1):
        out = tilt_of(pts, deg)
        if out:
            res.append((abs(out[0]), deg, out))
    res.sort()
    for _, deg, out in res[:4]:
        print(f"   rot {deg:+3d} -> residuo={out[0]:+6.3f} bbox={out[2]}")
    base = tilt_of(pts, 0)
    print(f"   sin     -> residuo={base[0]:+6.3f} bbox={base[1]}")
