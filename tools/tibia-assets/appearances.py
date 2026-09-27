"""Parser del protobuf ProtoAppearances (appearances-*.dat) del cliente Tibia.

Esquema oficial (otclient/src/protobuf/appearances.proto):
  Appearances { object=1, outfit=2, effect=3, missile=4, special_meaning_ids=5 }
  Appearance  { id=1, frame_group=2 (repeated), flags=3, name=4, description=5 }
  FrameGroup  { fixed_frame_group=1, id=2, sprite_info=3 }
  SpriteInfo  { pattern_width=1, pattern_height=2, pattern_depth=3, layers=4,
                sprite_id=5 (repeated), animation=6, bounding_square=7, is_opaque=8 }
  SpriteAnimation { default_start_phase=1, synchronized=2, random_start_phase=3,
                    loop_type=4, loop_count=5, sprite_phase=6 (repeated) }
  SpritePhase { duration_min=1, duration_max=2 }

FIXED_FRAME_GROUP: 0 = OUTFIT_IDLE, 1 = OUTFIT_MOVING, 2 = OBJECT_INITIAL
"""
import os

from tibia_assets import decode_utf8, find_appearances_file, parse_fields

FIELD_OBJECT, FIELD_OUTFIT, FIELD_EFFECT, FIELD_MISSILE = 1, 2, 3, 4

LOOP_TYPE = {-1: "pingpong", 0: "infinite", 1: "counted"}
FRAME_GROUP_NAME = {0: "idle", 1: "moving", 2: "initial"}


def _parse_sprite_phase(raw):
    phase = {"durationMin": 0, "durationMax": 0}
    for f, wt, v in parse_fields(raw, 0, len(raw)):
        if f == 1 and wt == 0:
            phase["durationMin"] = v
        elif f == 2 and wt == 0:
            phase["durationMax"] = v
    return phase


def _parse_animation(raw):
    anim = {
        "defaultStartPhase": 0,
        "synchronized": False,
        "randomStartPhase": False,
        "loopType": "infinite",
        "loopCount": 0,
        "phases": [],
    }
    for f, wt, v in parse_fields(raw, 0, len(raw)):
        if f == 1 and wt == 0:
            anim["defaultStartPhase"] = v
        elif f == 2 and wt == 0:
            anim["synchronized"] = bool(v)
        elif f == 3 and wt == 0:
            anim["randomStartPhase"] = bool(v)
        elif f == 4 and wt == 0:
            anim["loopType"] = LOOP_TYPE.get(v if v < 2 ** 31 else v - 2 ** 32, "infinite")
        elif f == 5 and wt == 0:
            anim["loopCount"] = v
        elif f == 6 and wt == 2:
            anim["phases"].append(_parse_sprite_phase(v))
    return anim


def _parse_sprite_info(raw):
    info = {
        "patternWidth": 1,
        "patternHeight": 1,
        "patternDepth": 1,
        "layers": 1,
        "spriteIds": [],
        "boundingSquare": 0,
        "isOpaque": False,
        "animation": None,
        "boundingBoxes": [],
    }
    for f, wt, v in parse_fields(raw, 0, len(raw)):
        if f == 1 and wt == 0:
            info["patternWidth"] = v
        elif f == 2 and wt == 0:
            info["patternHeight"] = v
        elif f == 3 and wt == 0:
            info["patternDepth"] = v
        elif f == 4 and wt == 0:
            info["layers"] = v
        elif f == 5 and wt == 0:
            info["spriteIds"].append(v)
        elif f == 6 and wt == 2:
            info["animation"] = _parse_animation(v)
        elif f == 7 and wt == 0:
            info["boundingSquare"] = v
        elif f == 8 and wt == 0:
            info["isOpaque"] = bool(v)
        elif f == 9 and wt == 2:
            box = {}
            for bf, bwt, bv in parse_fields(v, 0, len(v)):
                if bwt == 0:
                    box[{1: "x", 2: "y", 3: "width", 4: "height"}.get(bf, str(bf))] = bv
            info["boundingBoxes"].append(box)
    return info


def _parse_frame_group(raw):
    group = {"fixedFrameGroup": 2, "id": 0, "spriteInfo": None}
    for f, wt, v in parse_fields(raw, 0, len(raw)):
        if f == 1 and wt == 0:
            group["fixedFrameGroup"] = v
        elif f == 2 and wt == 0:
            group["id"] = v
        elif f == 3 and wt == 2:
            group["spriteInfo"] = _parse_sprite_info(v)
    group["name"] = FRAME_GROUP_NAME.get(group["fixedFrameGroup"], str(group["fixedFrameGroup"]))
    return group


# Máscaras de color de los outfits (layer de "color mask" del cliente 12+).
COLOR_MARKERS = {
    (255, 255, 0): "head",
    (255, 0, 0): "body",
    (0, 255, 0): "legs",
    (0, 0, 255): "feet",
}


def _parse_appearance(raw):
    app = {"id": None, "name": None, "description": None, "groups": {}, "light": None}
    for f, wt, v in parse_fields(raw, 0, len(raw)):
        if f == 1 and wt == 0:
            app["id"] = v
        elif f == 2 and wt == 2:
            group = _parse_frame_group(v)
            app["groups"][group["fixedFrameGroup"]] = group
        elif f == 4 and wt == 2:
            app["name"] = decode_utf8(v)
        elif f == 5 and wt == 2:
            app["description"] = decode_utf8(v)
        elif f == 3 and wt == 2:
            # AppearanceFlags: solo interesa la luz (campo 23) y algún booleano útil.
            for ff, fwt, fv in parse_fields(v, 0, len(v)):
                if ff == 23 and fwt == 2:
                    light = {}
                    for lf, lwt, lv in parse_fields(fv, 0, len(fv)):
                        if lf == 1 and lwt == 0:
                            light["brightness"] = lv
                        elif lf == 2 and lwt == 0:
                            light["color"] = lv
                    app["light"] = light
    return app


def load_appearances(assets_dir):
    """Devuelve {campo: {id: apariencia}} con object/outfit/effect/missile."""
    with open(os.path.join(assets_dir, find_appearances_file(assets_dir)), "rb") as fh:
        blob = fh.read()
    result = {FIELD_OBJECT: {}, FIELD_OUTFIT: {}, FIELD_EFFECT: {}, FIELD_MISSILE: {}}
    for field, wt, value in parse_fields(blob, 0, len(blob)):
        if wt == 2 and field in result:
            app = _parse_appearance(value)
            if app["id"] is not None:
                result[field][app["id"]] = app
    return result


def sprite_index(phase, depth, y, x, layer, pattern_w, pattern_h, pattern_d, layers):
    """Orden canónico del cliente: fases al exterior y capa al final."""
    return ((((phase * pattern_d + depth) * pattern_h + y) * pattern_w + x) * layers + layer)
