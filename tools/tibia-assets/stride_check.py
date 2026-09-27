"""Diagnóstico del stride real del BMP descomprimido (posible shear de 1 px por fila)."""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tibia_assets import Bitmap, SpriteRepository, decompress_cip_lzma  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)

for label, entry in [("spritetype 3 (36 sprites)", next(e for e in repo.sheet_entries if e["spritetype"] == 3)),
                     ("spritetype 0 (144 sprites)", next(e for e in repo.sheet_entries if e["spritetype"] == 0))]:
    raw = open(os.path.join(ASSETS, entry["file"]), "rb").read()
    bmp = decompress_cip_lzma(raw)
    bitmap = Bitmap(bmp)
    count = entry["lastspriteid"] - entry["firstspriteid"] + 1

    bi_size_image = struct.unpack_from("<I", bmp, 34)[0]
    colors_used = struct.unpack_from("<I", bmp, 46)[0]
    print(f"\n=== {label} ===")
    print(f"  archivo comprimido: {len(raw)} B | BMP descomprimido: {len(bmp)} B")
    print(f"  cabecera: headerSize={bitmap.header_size} {bitmap.width}x{bitmap.height} bpp={bitmap.bpp} "
          f"compression={bitmap.compression} bottomUp={bitmap.bottom_up} dataOffset={bitmap.data_offset} "
          f"biSizeImage={bi_size_image} colorsUsed={colors_used}")
    print(f"  sprites en el rango: {count}")
    print(f"  mi stride calculado: {bitmap._row_size} (width*4 = {bitmap.width * 4})")
    for stride in range(bitmap.width * 4, bitmap.width * 4 + 12):
        usado = bitmap.data_offset + stride * bitmap.height
        print(f"    stride={stride}: dataOffset+stride*altura = {usado} "
              f"{'<-- COINCIDE con el tamaño del BMP' if usado == len(bmp) else ''}")

    # Estima el desplazamiento horizontal óptimo entre filas consecutivas (detector de shear)
    print("  desplazamiento óptimo entre filas consecutivas (región con contenido):")
    def alpha(x, y):
        return 1 if bitmap.pixel(x, y)[3] else 0
    for y in range(100, 130, 4):
        best, best_score = None, None
        for shift in range(-3, 4):
            score = sum(1 for x in range(4, 380) if alpha(x, y) != alpha(x + shift, y + 1))
            if best_score is None or score < best_score:
                best, best_score = shift, score
        print(f"    fila {y}: shift={best:+d} (diferencia={best_score})")
