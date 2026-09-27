"""Deduce el orden de almacenamiento de los sprites de un look (sin aplicar índice)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances  # noqa: E402
from tibia_assets import SpriteRepository, write_png  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, ".tmp-inspect")

repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)


def render_order(look_id, group_id, name, cols=8):
    info = apps[2][look_id]["groups"][group_id]["spriteInfo"]
    ids = info["spriteIds"]
    tile = repo.sprite_meta(ids[0])["tile"]
    rows = (len(ids) + cols - 1) // cols
    cw, ch = cols * tile, rows * tile
    canvas = bytearray(cw * ch * 4)
    for i, sprite_id in enumerate(ids):
        rgba = repo.sprite_rgba(sprite_id)
        ox, oy = (i % cols) * tile, (i // cols) * tile
        for y in range(tile):
            for x in range(tile):
                p = (y * tile + x) * 4
                if not rgba[p + 3]:
                    continue
                d = ((oy + y) * cw + ox + x) * 4
                canvas[d:d + 4] = rgba[p:p + 4]
    path = os.path.join(OUT, name)
    size = write_png(path, cw, ch, bytes(canvas))
    print(f"=> {name} {cw}x{ch} ({size} B) sprites={len(ids)} tile={tile} "
          f"pattern={info['patternWidth']}x{info['patternHeight']}x{info['patternDepth']} layers={info['layers']}")


render_order(136, 0, "order136_idle.png")
render_order(136, 1, "order136_moving.png", cols=16)
render_order(368, 1, "order368_moving.png", cols=8)
render_order(1, 1, "order1_moving.png", cols=4)
