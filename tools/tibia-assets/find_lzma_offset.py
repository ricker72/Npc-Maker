"""Localiza el offset exacto del header LZMA dentro de un .bmp.lzma del cliente."""
import lzma
import os
import struct

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
sample = "sprites-d656db403e768009060b5f328dfe2ff665683e203d064d355ab3bc7e716ce6be.bmp.lzma"
data = open(os.path.join(ASSETS, sample), "rb").read()
print(f"archivo: {len(data)} bytes")
print("primeros 48 bytes:", data[:48].hex(" "))

zeros = 0
while data[zeros] == 0:
    zeros += 1
print(f"ceros iniciales: {zeros}")
marker = data[zeros:zeros + 5]
print(f"marcador: {marker.hex(' ')}")

# varint tras el marcador
pos = zeros + 5
varint_bytes = []
while True:
    varint_bytes.append(data[pos])
    more = data[pos] & 0x80
    pos += 1
    if not more:
        break
value = 0
for shift, byte in enumerate(varint_bytes):
    value |= (byte & 0x7F) << (7 * shift)
print(f"varint={varint_bytes} -> valor={value}; header total={pos} bytes; resto={len(data) - pos}")

print("\n=== búsqueda del inicio del stream LZMA ===")
for offset in range(0, 64):
    for label, kwargs in (("ALONE", {"format": lzma.FORMAT_ALONE}), ("AUTO", {})):
        try:
            out = lzma.decompress(data[offset:], **kwargs)
        except Exception:  # noqa: BLE001
            continue
        if out[:2] == b"BM":
            w, h = struct.unpack_from("<ii", out, 18)
            bpp = struct.unpack_from("<H", out, 28)[0]
            print(
                f"  OFFSET {offset} ({label}) -> {len(out)} bytes, BMP {w}x{h} bpp={bpp}"
            )
            print(f"    header LZMA: props={data[offset]:#04x} dict={struct.unpack_from('<I', data, offset + 1)[0]} "
                  f"size_declarado={struct.unpack_from('<Q', data, offset + 5)[0]} "
                  f"(comprimido={len(data) - offset})")
            break
