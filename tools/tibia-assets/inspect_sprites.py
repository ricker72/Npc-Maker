"""Inspección visual: formatos de hoja, y capas/patrones reales de un outfit y un mount."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tibia_assets import (  # noqa: E402
    SpriteRepository,
    find_appearances_file,
    parse_fields,
    read_catalog,
    write_png,
)

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".tmp-inspect")
OUT = os.path.abspath(OUT)

repo = SpriteRepository(ASSETS)

print("=== metadatos de hoja por spritetype ===")
catalog = read_catalog(ASSETS)
seen = {}
for entry in catalog:
    if entry["type"] != "sprite":
        continue
    st = entry["spritetype"]
    if st in seen:
        continue
    seen[st] = entry
    sid = entry["firstspriteid"]
    meta = repo.sprite_meta(sid)
    count = entry["lastspriteid"] - entry["firstspriteid"] + 1
    print(
        f"  spritetype={st} ids={sid}..{entry['lastspriteid']} ({count} sprites) "
        f"hoja={meta['sheetW']}x{meta['sheetH']} bpp={meta['bpp']} tile={meta['tile']} "
        f"grid={meta['cols']}x{meta['rows']}"
    )

# ── looks concretos: 128 (outfit) y 368 (mount) ──
blob = open(os.path.join(ASSETS, find_appearances_file(ASSETS)), "rb").read()
looks = {}
for field, wt, value in parse_fields(blob, 0, len(blob)):
    if field != 2 or wt != 2:
        continue
    look_id, groups = None, {}
    for f, fwt, v in parse_fields(value, 0, len(value)):
        if f == 1 and fwt == 0:
            look_id = v
        elif f == 2 and fwt == 2:
            group = {}
            for gf, gwt, gv in parse_fields(v, 0, len(v)):
                if gf == 1 and gwt == 0:
                    group["gid"] = gv
                elif gf == 3 and gwt == 2:
                    info = {}
                    ids = []
                    anim = []
                    for sf, swt, sv in parse_fields(gv, 0, len(gv)):
                        if sf == 5 and swt == 0:
                            ids.append(sv)
                        elif sf == 6 and swt == 2:
                            anim = parse_fields(sv, 0, len(sv))
                        elif swt == 0:
                            info[sf] = sv
                    group["info"] = info
                    group["ids"] = ids
                    group["anim"] = anim
            if group:
                groups[group.get("gid", 0)] = group
    looks[look_id] = groups


def sprite_index(phase, z, y, x, layer, pattern_w, pattern_h, pattern_d, layers):
    """Orden canónico del cliente: fases al exterior, luego z, y, x, capa al final."""
    return ((((phase * pattern_d + z) * pattern_h + y) * pattern_w + x) * layers + layer)


for look_id in (128, 368):
    groups = looks[look_id]
    for gid in sorted(groups):
        group = groups[gid]
        info = group["info"]
        pw, ph, pd = info.get(1, 1), info.get(2, 1), info.get(3, 1)
        layers = info.get(4, 1)
        ids = group["ids"]
        phases = len([1 for f, wt, v in group["anim"] if f == 6]) or 1
        print(
            f"\nlook {look_id} grupo {gid}: pattern={pw}x{ph}x{pd} layers={layers} "
            f"phases={phases} sprites={len(ids)} (esperado={pw * ph * pd * layers * phases})"
        )

        # plancha de contacto: filas = capas, columnas = direcciones, por cada y (patrón)
        scale = 3
        tile = repo.sprite_meta(ids[0])["tile"]
        cols = pw * phases
        rows = layers * ph
        width, height = cols * tile * scale, rows * tile * scale
        canvas = bytearray(width * height * 4)
        stats = {}
        for y in range(ph):
            for phase in range(phases):
                for x in range(pw):
                    for layer in range(layers):
                        idx = sprite_index(phase, 0, y, x, layer, pw, ph, pd, layers)
                        if idx >= len(ids):
                            continue
                        sid = ids[idx]
                        rgba = repo.sprite_rgba(sid)
                        cx = (x + phase * pw) * tile * scale
                        cy = (layer + y * layers) * tile * scale
                        opaque = 0
                        colors = set()
                        for sy in range(tile):
                            for sx in range(tile):
                                p = (sy * tile + sx) * 4
                                r, g, b, a = rgba[p:p + 4]
                                if a:
                                    opaque += 1
                                    colors.add((r, g, b))
                                for dy in range(scale):
                                    for dx in range(scale):
                                        o = ((cy + sy * scale + dy) * width + (cx + sx * scale + dx)) * 4
                                        canvas[o:o + 4] = bytes((r, g, b, 255 if a else 0))
                        key = (y, layer)
                        if key not in stats:
                            stats[key] = {"opaque": opaque, "colors": len(colors), "sample": sorted(colors)[:4]}
            path = os.path.join(OUT, f"look{look_id}_group{gid}_y{y}.png")
            size = write_png(path, width, height, bytes(canvas))
            print(f"  -> {os.path.basename(path)} ({size} B, {width}x{height})")
            print(f"     stats por (y, layer): " + "; ".join(
                f"y{k[0]}L{k[1]}: px={v['opaque']} colores={v['colors']} {v['sample']}"
                for k, v in sorted(stats.items())
            ))
