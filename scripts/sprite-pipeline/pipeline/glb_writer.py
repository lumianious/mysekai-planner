# ======== Unity AssetBundle -> GLB（PILOT-FINDINGS Q1 Path B）========
# INPUT:  Unity AssetBundle 路径（含至少一个 Mesh + 一个 Texture2D）
# OUTPUT: 单 mesh + baseColor 贴图 + PBR Material 的最小 GLB
# POS:    scripts/sprite-pipeline/pipeline/glb_writer.py
# 备注：sssekai_blender_io 在 Blender 5.x headless 不可用（PILOT-FINDINGS Q1）。
#       本模块走 UnityPy 提取 OBJ + 主纹理 → pygltflib 装配 GLB。
#       仅取第一个非 shadow Mesh + 第一个看似主贴图的 Texture2D；忽略多 submesh / 阴影。

from __future__ import annotations

import io
import re
import struct
from pathlib import Path

import UnityPy
from PIL import Image
from pygltflib import (
    GLTF2,
    BufferFormat,
    Accessor,
    Asset,
    Buffer,
    BufferView,
    Image as GLTFImage,
    Material,
    Mesh as GLTFMesh,
    Node,
    PbrMetallicRoughness,
    Primitive,
    Sampler,
    Scene,
    Texture,
    TextureInfo,
)

UnityPy.config.FALLBACK_UNITY_VERSION = "2022.3.21f1"

# glTF accessor component types
COMP_FLOAT = 5126
COMP_USHORT = 5123
COMP_UINT = 5125

# glTF accessor types
TYPE_VEC2 = "VEC2"
TYPE_VEC3 = "VEC3"
TYPE_SCALAR = "SCALAR"

# glTF target hints
TARGET_ARRAY = 34962
TARGET_ELEMENT = 34963


# ======== OBJ 解析 ========
def _parse_obj(obj_text: str):
    """OBJ -> (positions, normals, uvs, indices)。f 行按面拆三角形（已是三角形则原样）。
    Unity OBJ 用 1-based v/vt/vn；这里展开顶点（每个 face vertex 形成一个独立顶点）以保证
    位置/UV/法线索引一一对应。"""
    raw_v: list[tuple[float, float, float]] = []
    raw_vt: list[tuple[float, float]] = []
    raw_vn: list[tuple[float, float, float]] = []
    face_lines: list[str] = []
    for line in obj_text.splitlines():
        if not line:
            continue
        if line.startswith("v "):
            parts = line.split()
            raw_v.append((float(parts[1]), float(parts[2]), float(parts[3])))
        elif line.startswith("vt "):
            parts = line.split()
            raw_vt.append((float(parts[1]), float(parts[2])))
        elif line.startswith("vn "):
            parts = line.split()
            raw_vn.append((float(parts[1]), float(parts[2]), float(parts[3])))
        elif line.startswith("f "):
            face_lines.append(line)

    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    uvs: list[tuple[float, float]] = []
    indices: list[int] = []

    def push(tok: str) -> int:
        # tok like "3/3/3" or "3//3" or "3"
        a = tok.split("/")
        vi = int(a[0]) - 1 if a[0] else 0
        ti = int(a[1]) - 1 if len(a) > 1 and a[1] else -1
        ni = int(a[2]) - 1 if len(a) > 2 and a[2] else -1
        positions.append(raw_v[vi])
        uvs.append(raw_vt[ti] if 0 <= ti < len(raw_vt) else (0.0, 0.0))
        if 0 <= ni < len(raw_vn):
            normals.append(raw_vn[ni])
        else:
            normals.append((0.0, 1.0, 0.0))
        return len(positions) - 1

    for fl in face_lines:
        toks = fl.split()[1:]
        if len(toks) < 3:
            continue
        # 三角扇展开 n-gon
        first = push(toks[0])
        prev = push(toks[1])
        for t in toks[2:]:
            cur = push(t)
            indices.extend([first, prev, cur])
            prev = cur

    return positions, normals, uvs, indices


# ======== 选 mesh / 贴图 ========
def _pick_main_mesh(env):
    """返回第一个非 shadow / 顶点最多的 Mesh。"""
    candidates = []
    for o in env.objects:
        if o.type.name != "Mesh":
            continue
        try:
            m = o.read()
        except Exception:
            continue
        name = getattr(m, "m_Name", "") or ""
        if "shadow" in name.lower():
            continue
        candidates.append(m)
    if not candidates:
        # fallback：连 shadow 都用
        for o in env.objects:
            if o.type.name == "Mesh":
                try:
                    candidates.append(o.read())
                except Exception:
                    continue
    if not candidates:
        raise RuntimeError("no Mesh in bundle")
    return candidates[0]


def _pick_main_texture(env) -> Image.Image | None:
    """优先 Material._MainTex；回退第一个不像 emi/shadow 的 Texture2D。"""
    from pipeline.extract_2d import _read_main_tex

    for o in env.objects:
        if o.type.name != "Material":
            continue
        try:
            mat = o.read()
        except Exception:
            continue
        img = _read_main_tex(mat)
        if img is not None:
            return img.convert("RGBA")

    for o in env.objects:
        if o.type.name != "Texture2D":
            continue
        try:
            tex = o.read()
        except Exception:
            continue
        name = (getattr(tex, "m_Name", "") or "").lower()
        if "shadow" in name or "emi" in name:
            continue
        img = getattr(tex, "image", None)
        if img is not None:
            return img.convert("RGBA")
    return None


# ======== glTF 装配辅助 ========
def _f32_bytes(values, components: int) -> bytes:
    flat = []
    for v in values:
        flat.extend(v[:components])
    return struct.pack(f"<{len(flat)}f", *flat)


def _idx_bytes(indices: list[int], use_uint32: bool) -> bytes:
    fmt = "<I" if use_uint32 else "<H"
    return b"".join(struct.pack(fmt, i) for i in indices)


def _aabb(values):
    xs = [v[0] for v in values]
    ys = [v[1] for v in values]
    zs = [v[2] for v in values]
    return [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)]


def _png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    return buf.getvalue()


def _flip_uv_v(uvs):
    return [(u, 1.0 - v) for u, v in uvs]


# ======== 主入口 ========
def unity_bundle_to_glb(bundle_path: Path, out_glb: Path) -> None:
    """读 bundle，挑 mesh + 主贴图，写最小 baseColor PBR GLB。失败抛 RuntimeError。"""
    env = UnityPy.load(str(bundle_path))
    mesh = _pick_main_mesh(env)

    obj_text = mesh.export()
    if not isinstance(obj_text, str):
        raise RuntimeError(f"Mesh.export() returned {type(obj_text).__name__}, expected str")
    positions, normals, uvs, indices = _parse_obj(obj_text)
    if not positions or not indices:
        raise RuntimeError(f"empty mesh after OBJ parse: v={len(positions)} f={len(indices)}")
    # glTF 用 V 翻转后的 UV（Unity / OBJ 原点在左下，glTF 原点在左上）
    uvs = _flip_uv_v(uvs)

    main_img = _pick_main_texture(env)

    # ======== 拼字节流（按 4 字节对齐）========
    chunks: list[bytes] = []
    views: list[BufferView] = []
    accessors: list[Accessor] = []
    offset = 0

    def add_view(data: bytes, target: int | None = None) -> int:
        nonlocal offset
        # padding
        pad = (-len(data)) % 4
        if pad:
            data = data + b"\x00" * pad
        chunks.append(data)
        view = BufferView(buffer=0, byteOffset=offset, byteLength=len(data) - pad if pad else len(data))
        # 让 byteLength 包含 padding 之外的真实长度（pygltflib 接受）
        view.byteLength = len(data)
        if target is not None:
            view.target = target
        views.append(view)
        idx = len(views) - 1
        offset += len(data)
        return idx

    def add_accessor(view_idx: int, comp: int, count: int, accessor_type: str,
                     mins=None, maxs=None) -> int:
        a = Accessor(
            bufferView=view_idx,
            byteOffset=0,
            componentType=comp,
            count=count,
            type=accessor_type,
        )
        if mins is not None:
            a.min = list(mins)
        if maxs is not None:
            a.max = list(maxs)
        accessors.append(a)
        return len(accessors) - 1

    pos_view = add_view(_f32_bytes(positions, 3), TARGET_ARRAY)
    pmin, pmax = _aabb(positions)
    pos_acc = add_accessor(pos_view, COMP_FLOAT, len(positions), TYPE_VEC3, pmin, pmax)

    norm_view = add_view(_f32_bytes(normals, 3), TARGET_ARRAY)
    norm_acc = add_accessor(norm_view, COMP_FLOAT, len(normals), TYPE_VEC3)

    uv_view = add_view(_f32_bytes(uvs, 2), TARGET_ARRAY)
    uv_acc = add_accessor(uv_view, COMP_FLOAT, len(uvs), TYPE_VEC2)

    use_uint32 = len(positions) > 65535
    idx_view = add_view(_idx_bytes(indices, use_uint32), TARGET_ELEMENT)
    idx_acc = add_accessor(idx_view, COMP_UINT if use_uint32 else COMP_USHORT,
                            len(indices), TYPE_SCALAR)

    # ======== 贴图（可选）========
    tex_idx_glb: int | None = None
    images: list[GLTFImage] = []
    samplers: list[Sampler] = []
    textures_l: list[Texture] = []
    if main_img is not None:
        png = _png_bytes(main_img)
        img_view = add_view(png)
        images.append(GLTFImage(bufferView=img_view, mimeType="image/png"))
        samplers.append(Sampler())  # default linear filtering, repeat wrap
        textures_l.append(Texture(sampler=0, source=0))
        tex_idx_glb = 0

    # ======== 材质 ========
    pbr = PbrMetallicRoughness(
        baseColorFactor=[1.0, 1.0, 1.0, 1.0],
        metallicFactor=0.0,
        roughnessFactor=1.0,
    )
    if tex_idx_glb is not None:
        pbr.baseColorTexture = TextureInfo(index=tex_idx_glb)
    material = Material(pbrMetallicRoughness=pbr, alphaMode="MASK", alphaCutoff=0.5)

    # ======== 装配 GLTF2 ========
    primitive = Primitive(
        attributes={"POSITION": pos_acc, "NORMAL": norm_acc, "TEXCOORD_0": uv_acc},
        indices=idx_acc,
        material=0,
        mode=4,  # TRIANGLES
    )
    gltf_mesh = GLTFMesh(primitives=[primitive])
    node = Node(mesh=0)
    scene = Scene(nodes=[0])

    bin_blob = b"".join(chunks)
    gltf = GLTF2(
        asset=Asset(generator="glb_writer.py", version="2.0"),
        scene=0,
        scenes=[scene],
        nodes=[node],
        meshes=[gltf_mesh],
        materials=[material],
        bufferViews=views,
        accessors=accessors,
        buffers=[Buffer(byteLength=len(bin_blob))],
    )
    if images:
        gltf.images = images
        gltf.samplers = samplers
        gltf.textures = textures_l

    gltf.set_binary_blob(bin_blob)
    out_glb.parent.mkdir(parents=True, exist_ok=True)
    gltf.save_binary(str(out_glb))
