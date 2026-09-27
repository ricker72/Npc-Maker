"""Analiza el campo 2 (outfit) de appearances.dat y su emparejamiento con los nombres ya
existentes en la app (src/data/outfits.json y src/data/mounts.json)."""
import json
import os
import struct

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS = r"C:\Users\samatha\AppData\Local\Tibia\packages\Tibia\assets"


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
            raise ValueError(f"wiretype {wt}")
        fields.append((field, wt, value))
    return fields


def summarize_sprite_info(raw):
    parts = {}
    sprite_ids = []
    anim = []
    for f, wt, v in parse_fields(raw, 0, len(raw)):
        if f == 5 and wt == 0:
            sprite_ids.append(v)
        elif f == 6 and wt == 2:
            anim = parse_fields(v, 0, len(v))
        elif wt == 0:
            parts[f] = v
    phases = [av for af, awt, av in anim if af == 6]
    return {
        "pattern": (parts.get(1, 1), parts.get(2, 1), parts.get(3, 1)),
        "layers": parts.get(4, 1),
        "boundingSquare": parts.get(7, 0),
        "opaque": bool(parts.get(8, 0)),
        "spriteCount": len(sprite_ids),
        "spriteIds": sprite_ids,
        "frames": len(phases),
        "durations": [(parse_fields(ph, 0, len(ph))[0][2] if parse_fields(ph, 0, len(ph)) else 0) for ph in phases],
        "animMode": {f: v for f, wt, v in anim if f != 6},
    }


blob = open(os.path.join(ASSETS, [f for f in os.listdir(ASSETS) if f.startswith("appearances-")][0]), "rb").read()
entries = {}
names_found = 0
for field, wt, value in parse_fields(blob, 0, len(blob)):
    if field != 2 or wt != 2:
        continue
    look_id = None
    groups = []
    name = None
    for f, fwt, v in parse_fields(value, 0, len(value)):
        if f == 1 and fwt == 0:
            look_id = v
        elif f == 2 and fwt == 2:
            groups.append(parse_fields(v, 0, len(v)))
        elif f == 4 and fwt == 2:
            try:
                name = v.decode("utf-8")
                names_found += 1
            except UnicodeDecodeError:
                name = None
    info = {"id": look_id, "name": name, "groups": {}}
    for g in groups:
        gid, si = 0, None
        for f, fwt, v in g:
            if f == 1 and fwt == 0:
                gid = v
            elif f == 3 and fwt == 2:
                si = summarize_sprite_info(v)
        if si:
            info["groups"][gid] = si
    entries[look_id] = info

ids = sorted(entries)
print(f"looks totales (campo 2): {len(ids)} | con campo 'name': {names_found}")
print(f"rango de ids: {ids[0]}..{ids[-1]}")

with open(os.path.join(ROOT, "src", "data", "outfits.json"), encoding="utf-8") as fh:
    outfits = json.load(fh)
with open(os.path.join(ROOT, "src", "data", "mounts.json"), encoding="utf-8") as fh:
    mounts = json.load(fh)

print(f"\nnombres legacy: {len(outfits)} outfits, {len(mounts)} mounts")
missing_outfits = [o for o in outfits if o["lookType"] not in entries]
missing_mounts = [m for m in mounts if m["clientId"] not in entries]
print(f"outfits legacy SIN apariencia 15.33: {len(missing_outfits)} -> {[o['lookType'] for o in missing_outfits][:20]}")
print(f"mounts legacy SIN apariencia 15.33: {len(missing_mounts)} -> {[m['clientId'] for m in missing_mounts][:20]}")

print("\n=== ejemplos de looks conocidos ===")
for sample in [128, 136, 368, 369, 1000, 1001]:
    e = entries.get(sample)
    if not e:
        print(f"  id={sample}: NO existe")
        continue
    g0 = e["groups"].get(0)
    g1 = e["groups"].get(1)
    desc = []
    if g0:
        desc.append(f"idle: {g0['pattern'][0]}x{g0['pattern'][1]} dirs, {g0['spriteCount']} sprites")
    if g1:
        desc.append(
            f"moving: {g1['pattern'][0]}x{g1['pattern'][1]} dirs, {g1['frames']} fases, "
            f"{g1['spriteCount']} sprites, dur={g1['durations'][:4]}, bs={g1['boundingSquare']}"
        )
    print(f"  id={sample}: " + " | ".join(desc) + f" | grupos={sorted(e['groups'])}")

print("\n=== ids de mounts legacy presentes (primeros 12) ===")
present = [m["clientId"] for m in mounts if m["clientId"] in entries]
print(f"  {len(present)}/{len(mounts)} presentes")
print("  " + str(present[:12]))
max_mount = max(present) if present else 0
print(f"  mount con id máximo: {max_mount}")
print(f"  looks con id <= {max_mount}: {len([i for i in ids if i <= max_mount])}")
print(f"  looks con id > {max_mount}: {len([i for i in ids if i > max_mount])}")
