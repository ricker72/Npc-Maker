"""Lee las máscaras BI_BITFIELDS y valida el orden de canales con un sprite conocido."""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances  # noqa: E402
from tibia_assets import Bitmap, SpriteRepository, decompress_cip_lzma  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)

entry = next(e for e in repo.sheet_entries if e["spritetype"] == 0)
bmp = decompress_cip_lzma(open(os.path.join(ASSETS, entry["file"]), "rb").read())
print("=== cabecera BMP (spritetype 0) ===")
print(f"  headerSize={struct.unpack_from('<I', bmp, 14)[0]} "
      f"{struct.unpack_from('<ii', bmp, 18)[0]}x{struct.unpack_from('<ii', bmp, 18)[1]} "
      f"bpp={struct.unpack_from('<H', bmp, 28)[0]} compression={struct.unpack_from('<I', bmp, 30)[0]}")
masks = struct.unpack_from("<IIII", bmp, 54)
print(f"  máscaras R=0x{masks[0]:08X} G=0x{masks[1]:08X} B=0x{masks[2]:08X} A=0x{masks[3]:08X}")
print(f"  csType={struct.unpack_from('<I', bmp, 70)[0]} gamma=({struct.unpack_from('<I', bmp, 74)[0]},"
      f"{struct.unpack_from('<I', bmp, 78)[0]})")

bitmap = Bitmap(bmp)
print(f"  Bitmap leído: {bitmap.width}x{bitmap.height} bpp={bitmap.bpp} dataOffset={bitmap.data_offset}")

# ── sprite de la moneda de oro (item 2148) ──
info = apps[1][2148]["groups"][max(apps[1][2148]["groups"])]["spriteInfo"]
sprite_id = info["spriteIds"][0]
sheet = repo._load_sheet(repo.sheet_for(sprite_id))
index = sprite_id - sheet["first"]
col, row = index % sheet["cols"], index // sheet["cols"]
tile = sheet["tile"]
print(f"\nitem 2148 -> sprite {sprite_id} celda=({col},{row}) tile={tile} grid={sheet['cols']}x{sheet['rows']}")


def byte_map(channel, tile=32):
    """Dibuja el mapa de opacidad usando el byte `channel` como alfa."""
    x0, y0 = col * sheet["tile"], row * sheet["tile"]
    lines = []
    for y in range(tile):
        line = []
        for x in range(tile):
            px = sheet["bitmap"].pixel(x0 + x, y0 + y)
            # px = (byte0, byte1, byte2, byte3) tal como los lee Bitmap (b,g,r,a)
            raw = bytes(px)
            vals = [raw[2], raw[1], raw[0], raw[3]]  # r, g, b, a según Bitmap
            line.append("#" if vals[channel] > 128 else ".")
        lines.append("".join(line))
    return lines


for channel, name in ((3, "byte3 como alfa (lectura actual BGRA)"), (0, "byte0 como alfa (ARGB)")):
    lines = byte_map(channel)
    xs = [x for y, line in enumerate(lines) for x, ch in enumerate(line) if ch == "#"]
    ys = [y for y, line in enumerate(lines) for x, ch in enumerate(line) if ch == "#"]
    bbox = f"bbox=({min(xs)},{min(ys)})-({max(xs)},{max(ys)})" if xs else "vacío"
    print(f"\n--- {name}: {bbox} ---")
    for line in lines:
        print("   " + line)
