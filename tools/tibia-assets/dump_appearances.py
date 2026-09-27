"""Volcado genérico (wire format) de appearances-*.dat para confirmar la estructura real."""
import os
import struct

ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"
APPEARANCES = "appearances-2dfa943b548472a1ddc7bc5afe97945bc75e14f1f41d74f728f8e622f5dae7e2.dat"


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


def parse_fields(buf, start, end):
    """Devuelve [(campo, wiretype, valor)] para el rango dado."""
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
            raise ValueError(f"wiretype no soportado {wt}")
        fields.append((field, wt, value))
    return fields


def try_message(data):
    try:
        sub = parse_fields(data, 0, len(data))
    except Exception:  # noqa: BLE001
        return None
    return sub if data else None


def decode_string(data):
    if len(data) >= 2 and data[-1] == 0:
        try:
            return data[:-1].decode("utf-8")
        except UnicodeDecodeError:
            return None
    return None


blob = open(os.path.join(ASSETS, APPEARANCES), "rb").read()
top = parse_fields(blob, 0, len(blob))

print("=== campos de nivel superior (Appearances) ===")
counts = {}
for field, wt, value in top:
    counts.setdefault(field, []).append(value)
for field in sorted(counts):
    print(f"  campo {field}: {len(counts[field])} entradas")

names = {1: "object", 2: "outfit", 3: "effect", 4: "missile", 5: "special_meaning_ids"}

for field in (1, 2):
    label = names.get(field, str(field))
    print(f"\n=== primeras 6 entradas de campo {field} ({label}) ===")
    for raw in counts.get(field, [])[:6]:
        entry = parse_fields(raw, 0, len(raw))
        detail = []
        for f, wt, v in entry:
            if f == 1 and wt == 0:
                detail.append(f"id={v}")
            elif f == 2 and wt == 2:
                fg = parse_fields(v, 0, len(v))
                fg_desc = []
                for gf, gwt, gv in fg:
                    if gf == 1 and gwt == 0:
                        fg_desc.append(f"fixed_frame_group={gv}")
                    elif gf == 2 and gwt == 0:
                        fg_desc.append(f"frameGroupId={gv}")
                    elif gf == 3 and gwt == 2:
                        si = parse_fields(gv, 0, len(gv))
                        parts = []
                        sprite_ids = []
                        anim = None
                        for sf, swt, sv in si:
                            if sf in (1, 2, 3, 4, 7, 8) and swt == 0:
                                parts.append(f"{sf}={sv}")
                            elif sf == 5 and swt == 0:
                                sprite_ids.append(sv)
                            elif sf == 6 and swt == 2:
                                anim = parse_fields(sv, 0, len(sv))
                        fg_desc.append("sprite_info{" + ",".join(parts) + "} sprites=" + str(len(sprite_ids)))
                        if anim:
                            aphases = [av for af, awt, av in anim if af == 6]
                            other = {af: av for af, awt, av in anim if af != 6}
                            fg_desc.append(f"animation{other} phases={len(aphases)}")
                detail.append("frameGroup{" + "; ".join(fg_desc) + "}")
            elif f == 3 and wt == 2:
                detail.append(f"flags({len(v)}B)")
            elif f in (4, 5) and wt == 2:
                text = decode_string(v)
                detail.append(f"name={text!r}" if f == 4 else f"description={text!r}")
            else:
                detail.append(f"f{f}wt{wt}")
        print("  - " + " | ".join(detail))
