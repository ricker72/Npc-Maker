"""Prueba decisiva del trazado de bytes de una hoja .bmp.lzma.

1) tamaño descomprimido vs. (cabecera + h * paso) para 32/24/16/8 bpp
2) volcado de la cabecera BMP y de los primeros bytes
3) ¿el 4º byte de cada grupo de 4 es siempre 0xff? (trazado desalineado)
4) desplazamiento de bytes correcto = el que da MENOS colores únicos
"""
import os
import sys
from collections import Counter

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from appearances import load_appearances, sprite_index  # noqa: E402
from tibia_assets import SpriteRepository, decompress_cip_lzma  # noqa: E402

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
repo = SpriteRepository(ASSETS)
apps = load_appearances(ASSETS)


def pick(app_id, look, group=0):
    info = apps[app_id][look]["groups"][group]["spriteInfo"]
    return info["spriteIds"][0]


def probe(tag, sprite_id):
    entry = repo.sheet_for(sprite_id)
    with open(os.path.join(ASSETS, entry["file"]), "rb") as fh:
        raw = fh.read()
    u = decompress_cip_lzma(raw)
    offbits = int.from_bytes(u[10:14], "little")
    hdr = int.from_bytes(u[14:18], "little")
    w, h = (int.from_bytes(u[18 + i * 4:22 + i * 4], "little", signed=True) for i in range(2))
    planes, bpp = int.from_bytes(u[26:28], "little"), int.from_bytes(u[28:30], "little")
    comp = int.from_bytes(u[30:34], "little")
    imgsize = int.from_bytes(u[34:38], "little")
    print(f"\n=== {tag}: sprite {sprite_id} hoja {entry['file'][:14]}.. type={entry['spritetype']}")
    print(f"  crudo={len(raw)} descomprimido={len(u)} offbits={offbits} hdrsize={hdr} "
          f"{w}x{h} planes={planes} bpp={bpp} comp={comp} imagesize={imgsize}")
    print(f"  14+hdr={14 + hdr}  máscaras BI_BITFIELDS en 54..66: "
          f"{u[54:66].hex(' ')}")
    body = len(u) - offbits
    print(f"  cuerpo={body}  cuerpo/h={body / h:.4f} bytes/fila  "
          f"(/w={body / h / w:.4f} bytes/px)")
    for cand in (32, 24, 16, 8):
        paso = ((w * cand + 31) // 32) * 4
        for off in (offbits, 14 + hdr, 14 + hdr + 12, 54, 66):
            falta = len(u) - off
            if falta == h * paso or abs(falta - h * paso) < 4 * h:
                print(f"    ENCAJE: bpp={cand} offset={off} paso={paso} "
                      f"dif={falta - h * paso}")
    zona = u[offbits:offbits + 4096]
    print("  primeros bytes:", u[:32].hex(" "))
    print("  bytes 32..64:", u[32:64].hex(" "))
    for m in (3, 4):
        cols = [Counter(list(zona[i::m])).most_common(3) for i in range(m)]
        print(f"  patrón cada {m} bytes: " + " | ".join(str(col[:2]) for col in cols))
    print(f"  máscara alfa (bytes 66..70): {u[66:70].hex(' ')}  resto cabecera: "
          f"{u[70:122].hex(' ')}")
    cuerpo = np.frombuffer(u[offbits:offbits + w * h * 4], dtype=np.uint8).reshape(h, w, 4)
    for ch in range(4):
        top = Counter(cuerpo[:, :, ch].ravel().tolist()).most_common(4)
        print(f"  canal {ch}: valores más freq = {top}")
    negr = (cuerpo[:, :, 0] == 0) & (cuerpo[:, :, 1] == 0) & (cuerpo[:, :, 2] == 0)
    print(f"  píxeles negros puros: {int(negr.sum())}/{w * h} = "
          f"{100 * negr.mean():.1f}%   (candidatos a color clave)")
    base = u[offbits:]
    print("  colores únicos según desplazamiento (menor = correcto):")
    for delta in range(0, 9):
        v = np.frombuffer(base[delta:], dtype=np.uint8)
        v = v[:len(v) // 4 * 4].reshape(-1, 4)
        uniq = np.unique(v, axis=0).shape[0]
        col3 = np.ascontiguousarray(v[:, :3])
        uniq3 = np.unique(col3, axis=0).shape[0]
        print(f"    d={delta}: píxeles={len(v)} RGBA únicos={uniq} RGB únicos={uniq3} "
              f"4º byte más freq={Counter(base[delta + 3::4].tolist()).most_common(2)}")


probe("look 136 (outfit tipo 3)", pick(2, 136))
probe("look 58 (outfit tipo 0)", pick(2, 58))
probe("item 2148", pick(1, 2148))
