"""Lector de los assets reales del cliente Tibia (13+/15.x).

Formato verificado empíricamente contra la instalación 15.33:
  * catalog-content.json  -> índice: sprite id range -> archivo .bmp.lzma + spritetype
  * sprites-<sha>.bmp.lzma -> cabecera CIP (N ceros + marcador 5B + varint de tamaño)
                              + LZMA "alone" con tamaño falso (hay que parchear a 0xFF..)
                              + BMP con los tiles del rango
  * appearances-<sha>.dat -> protobuf ProtoAppearances (outfits en el campo 2)
"""
import json
import lzma
import os
import struct
import zlib

# ───────────────────────────── protobuf (wire format) ─────────────────────────────


def read_varint(buf, pos):
    result = 0
    shift = 0
    while True:
        byte = buf[pos]
        pos += 1
        result |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return result, pos
        shift += 7


def parse_fields(buf, start=0, end=None):
    """[(campo, wiretype, valor)] — 0=varint, 2=bytes, 5=fixed32, 1=fixed64."""
    if end is None:
        end = len(buf)
    fields = []
    pos = start
    while pos < end:
        key, pos = read_varint(buf, pos)
        field, wt = key >> 3, key & 7
        if wt == 0:
            value, pos = read_varint(buf, pos)
        elif wt == 2:
            length, pos = read_varint(buf, pos)
            value = buf[pos:pos + length]
            pos += length
        elif wt == 5:
            value = struct.unpack_from("<I", buf, pos)[0]
            pos += 4
        elif wt == 1:
            value = struct.unpack_from("<Q", buf, pos)[0]
            pos += 8
        else:
            raise ValueError(f"wiretype no soportado: {wt}")
        fields.append((field, wt, value))
    return fields


def decode_utf8(raw):
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1", errors="replace")


# ───────────────────────────── catalog + descompresión ─────────────────────────────


def read_catalog(assets_dir):
    with open(os.path.join(assets_dir, "catalog-content.json"), encoding="utf-8") as fh:
        return json.load(fh)


def find_appearances_file(assets_dir):
    for name in os.listdir(assets_dir):
        if name.startswith("appearances-") and name.endswith(".dat"):
            return name
    raise FileNotFoundError("no se encontró appearances-*.dat")


def _skip_cip_header(data, pos=0):
    """Consume: ceros iniciales + marcador constante de 5 bytes + varint de longitud (7 bits).

    Estructura verificada en 15.33: 24 ceros | 70 0a fa 80 24 | varint(comprimido)
    -> el stream LZMA (props 5B + tamaño falso 8B + datos) empieza justo después.
    """
    while data[pos] == 0x00:
        pos += 1
    pos += 5  # primer byte no-cero + 4 restantes del marcador constante
    while data[pos] & 0x80:  # varint: mientras MSB=1
        pos += 1
    pos += 1  # último byte del varint (MSB=0)
    return pos


def decompress_cip_lzma(raw_bytes):
    """Devuelve el contenido (BMP) de un archivo .bmp.lzma del cliente."""
    pos = _skip_cip_header(raw_bytes)
    props = raw_bytes[pos:pos + 5]
    pos += 5
    pos += 8  # tamaño "falso" que escribe CIP (se descarta)
    header = props + b"\xff" * 8  # tamaño desconocido
    decoder = lzma.LZMADecompressor(format=lzma.FORMAT_ALONE)
    return decoder.decompress(header + raw_bytes[pos:])


# ───────────────────────────── BMP ─────────────────────────────


class Bitmap:
    """BMP mínimo (32/24/8/4 bpp, sin RLE) con acceso a píxeles RGBA."""

    def __init__(self, data):
        if data[:2] != b"BM":
            raise ValueError("no es un BMP")
        self.data_offset = struct.unpack_from("<I", data, 10)[0]
        self.header_size = struct.unpack_from("<I", data, 14)[0]
        self.width, raw_height = struct.unpack_from("<ii", data, 18)
        self.bpp = struct.unpack_from("<H", data, 28)[0]
        self.compression = struct.unpack_from("<I", data, 30)[0]
        self.bottom_up = raw_height > 0
        self.height = abs(raw_height)
        self.palette = []
        self._data = data
        self._row_size = ((self.width * self.bpp + 31) // 32) * 4
        # máscaras BI_BITFIELDS (compresión 3): posición real de cada canal en bytes
        self._shift = (2, 1, 0, 3)  # por defecto: BGRA
        if self.compression == 3 and self.header_size >= 40:
            masks = struct.unpack_from("<III", data, 14 + 40)
            alpha = struct.unpack_from("<I", data, 14 + 52)[0] if self.header_size >= 52 else 0
            shifts = tuple(self._mask_to_byte(mask) for mask in masks + (alpha,))
            if None not in shifts:
                self._shift = shifts
        if self.bpp <= 8:
            colors_used = struct.unpack_from("<I", data, 46)[0] or (1 << self.bpp)
            base = 14 + self.header_size
            for idx in range(colors_used):
                b, g, r = data[base + idx * 4:base + idx * 4 + 3]
                self.palette.append((r, g, b))

    @staticmethod
    def _mask_to_byte(mask):
        """Índice de byte (0..3) donde empieza una máscara de 32 bits."""
        if not mask:
            return None
        return ((mask & -mask).bit_length() - 1) // 8

    def pixel(self, x, y):
        row = (self.height - 1 - y) if self.bottom_up else y
        offset = self.data_offset + row * self._row_size
        if self.bpp == 32:
            raw = self._data[offset + x * 4:offset + x * 4 + 4]
            sr, sg, sb, sa = self._shift
            return (raw[sr], raw[sg], raw[sb], raw[sa])
        if self.bpp == 24:
            b, g, r = self._data[offset + x * 3:offset + x * 3 + 3]
            return (r, g, b, 255)
        if self.bpp == 8:
            idx = self._data[offset + x]
            r, g, b = self.palette[idx]
            return (r, g, b, 255 if idx else 0)
        if self.bpp == 4:
            byte = self._data[offset + x // 2]
            idx = (byte >> 4) if x % 2 == 0 else (byte & 0x0F)
            r, g, b = self.palette[idx]
            return (r, g, b, 255 if idx else 0)
        raise ValueError(f"bpp no soportado: {self.bpp}")

    def to_rgba(self):
        """Imagen completa como bytes RGBA (top-down). Trabaja por filas: rápido."""
        width, height = self.width, self.height
        step = width * 4
        out = bytearray(width * height * 4)
        for y in range(height):
            row = (height - 1 - y) if self.bottom_up else y
            base = self.data_offset + row * self._row_size
            dst = y * step
            if self.bpp == 32:
                src = self._data[base:base + step]
                sr, sg, sb, sa = self._shift
                out[dst:dst + step] = src[sr::4] + src[sg::4] + src[sb::4] + src[sa::4]
            elif self.bpp == 24:
                src = self._data[base:base + width * 3]
                out[dst:dst + step] = src[2::3] + src[1::3] + src[0::3] + b"\xff" * width
            else:
                for x in range(width):
                    out[dst + x * 4:dst + x * 4 + 4] = bytes(self.pixel(x, y))
        return bytes(out)

    def tile_rgba(self, col, row, tile_size):
        """Extrae un tile como bytes RGBA (fila a fila, top-down)."""
        out = bytearray()
        for y in range(row * tile_size, row * tile_size + tile_size):
            for x in range(col * tile_size, col * tile_size + tile_size):
                if x >= self.width or y >= self.height:
                    out += b"\x00\x00\x00\x00"
                else:
                    out += bytes(self.pixel(x, y))
        return bytes(out)


# ───────────────────────────── PNG ─────────────────────────────


def _png_chunk(tag, payload):
    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def write_png(path, width, height, rgba):
    """rgba: bytes RGBA de width*height*4 (top-down)."""
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filtro "None"
        raw += rgba[y * stride:(y + 1) * stride]
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + _png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _png_chunk(b"IEND", b"")
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(png)
    return len(png)


# ───────────────────────────── repositorio de sprites ─────────────────────────────


class SpriteRepository:
    """Localiza y decodifica sprites por id, descomprimiendo cada hoja una sola vez."""

    def __init__(self, assets_dir):
        self.assets_dir = assets_dir
        self.sheet_entries = [e for e in read_catalog(assets_dir) if e["type"] == "sprite"]
        self._cache = {}
        self._sheets = {}

    def sheet_for(self, sprite_id):
        for entry in self.sheet_entries:
            if entry["firstspriteid"] <= sprite_id <= entry["lastspriteid"]:
                return entry
        raise KeyError(f"sprite {sprite_id} fuera de rango")

    def _load_sheet(self, entry):
        key = entry["file"]
        if key not in self._sheets:
            raw = open(os.path.join(self.assets_dir, key), "rb").read()
            bitmap = Bitmap(decompress_cip_lzma(raw))
            count = entry["lastspriteid"] - entry["firstspriteid"] + 1
            tile = 64 if count <= 36 else 32
            if bitmap.width % tile or bitmap.height % tile:
                tile = 32 if bitmap.width % 32 == 0 else 64
            self._sheets[key] = {
                "bitmap": bitmap,
                "tile": tile,
                "cols": bitmap.width // tile,
                "rows": bitmap.height // tile,
                "first": entry["firstspriteid"],
                "spritetype": entry.get("spritetype"),
            }
        return self._sheets[key]

    def sprite_meta(self, sprite_id):
        sheet = self._load_sheet(self.sheet_for(sprite_id))
        return {
            "tile": sheet["tile"],
            "cols": sheet["cols"],
            "rows": sheet["rows"],
            "sheetW": sheet["bitmap"].width,
            "sheetH": sheet["bitmap"].height,
            "bpp": sheet["bitmap"].bpp,
            "spritetype": sheet["spritetype"],
        }

    def sprite_rgba(self, sprite_id):
        """Bytes RGBA (tile*tile*4) del sprite indicado."""
        if sprite_id in self._cache:
            return self._cache[sprite_id]
        sheet = self._load_sheet(self.sheet_for(sprite_id))
        index = sprite_id - sheet["first"]
        col = index % sheet["cols"]
        row = index // sheet["cols"]
        rgba = sheet["bitmap"].tile_rgba(col, row, sheet["tile"])
        self._cache[sprite_id] = rgba
        return rgba
