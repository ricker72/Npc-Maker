"""Diagnóstico: tamaño y formato real de las hojas de sprites + dónde están los nombres."""
import json
import lzma
import os
import struct

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
with open(os.path.join(ASSETS, "catalog-content.json"), encoding="utf-8") as fh:
    catalog = json.load(fh)
sprites = [e for e in catalog if e["type"] == "sprite"]

print("=== tamaños en disco por spritetype ===")
by_type = {}
for e in sprites:
    st = e["spritetype"]
    size = os.path.getsize(os.path.join(ASSETS, e["file"]))
    by_type.setdefault(st, []).append(size)
for st, sizes in sorted(by_type.items()):
    sizes.sort()
    print(f"  spritetype={st}: n={len(sizes)} min={sizes[0]} max={sizes[-1]} total_MB={sum(sizes)/1048576:.1f}")

print("\n=== cabeceras crudas (primeros 32 bytes) ===")
for st, example in sorted({e["spritetype"]: e for e in sprites}.items()):
    path = os.path.join(ASSETS, example["file"])
    raw = open(path, "rb").read(32)
    print(f"  spritetype={st} ({os.path.getsize(path)} bytes) -> {raw.hex(' ')}")

print("\n=== prueba de descompresión ===")
for st, example in sorted({e["spritetype"]: e for e in sprites}.items()):
    path = os.path.join(ASSETS, example["file"])
    data = open(path, "rb").read()
    for label, fn in [
        ("FORMAT_AUTO", lambda d: lzma.decompress(d)),
        ("FORMAT_ALONE", lambda d: lzma.LZMADecompressor(lzma.FORMAT_ALONE).decompress(d)),
    ]:
        try:
            out = fn(data)
            print(f"  spritetype={st} {label}: OK {len(out)} bytes, magic={out[:8]!r}")
        except Exception as exc:  # noqa: BLE001
            print(f"  spritetype={st} {label}: ERROR {type(exc).__name__}: {exc}")

print("\n=== ¿hay nombres de outfits en algún .dat? ===")
names = ["Hunter", "Amazon", "Demon", "Widow Queen", "Golden Outfit", "Citizen"]
dat_files = [e["file"] for e in catalog if e["type"] in ("appearances", "staticdata", "staticmapdata", "map", "proficiencies")]
for fname in dat_files:
    path = os.path.join(ASSETS, fname)
    blob = open(path, "rb").read()
    hits = []
    for n in names:
        for enc, label in ((("utf-8"), "utf8"), ("utf-16-le", "utf16")):
            if blob.find(n.encode(enc)) >= 0:
                hits.append(f"{n}({label})")
    print(f"  {fname.split('-')[0]:<16} {len(blob):>9} bytes -> {', '.join(hits) if hits else 'sin coincidencias'}")
