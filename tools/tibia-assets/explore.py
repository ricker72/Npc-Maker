"""Exploración de los assets reales de Tibia 15.33 (fase 1: formatos y nombres)."""
import json
import lzma
import os
import struct

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"

with open(os.path.join(ASSETS, "catalog-content.json"), encoding="utf-8") as fh:
    catalog = json.load(fh)

print("=== entradas por tipo ===")
types = {}
for entry in catalog:
    types.setdefault(entry["type"], []).append(entry)
for t, items in types.items():
    print(f"  {t}: {len(items)}")

print("\n=== un ejemplo por spritetype (descomprimido) ===")
seen = {}
for entry in types["sprite"]:
    st = entry["spritetype"]
    if st in seen:
        continue
    seen[st] = entry
    raw = lzma.open(os.path.join(ASSETS, entry["file"]), "rb").read()
    head = raw[:16]
    info = f"spritetype={st} ids={entry['firstspriteid']}..{entry['lastspriteid']} bytes={len(raw)} magic={head[:8]!r}"
    if raw[:2] == b"BM":
        size, _, _, off = struct.unpack_from("<III", raw, 2)
        off = struct.unpack_from("<I", raw, 10)[0]
        w, h = struct.unpack_from("<ii", raw, 18)
        bpp = struct.unpack_from("<H", raw, 28)[0]
        comp = struct.unpack_from("<I", raw, 30)[0]
        info += f" | BMP {w}x{h} bpp={bpp} comp={comp} dataOffset={off} fileSize={size}"
    print("  " + info)

print("\n=== nombres dentro de appearances .dat ===")
ap = [e for e in types["appearances"]][0]["file"]
blob = open(os.path.join(ASSETS, ap), "rb").read()
print(f"  archivo: {ap} ({len(blob)} bytes)")
for name in ["Citizen", "Hunter", "Dragon", "Demon", "Amazon", "Warrior", "Widow Queen",
             "Racing Bird", "Golden Outfit", "Vampire Lord", "Noblewoman"]:
    idx = blob.find(name.encode())
    print(f"  {name:<14} offset={idx}")
    if idx > 0:
        print(f"      contexto: {blob[max(0, idx - 8):idx + len(name) + 4]!r}")
