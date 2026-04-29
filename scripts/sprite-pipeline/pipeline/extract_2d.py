# ======== 2D 纹理抽取（D-08 平面项分支）========
# INPUT:  Unity AssetBundle 路径（sssekai 解密后的 .unity3d）
# OUTPUT: 透明 RGBA PIL.Image / PNG 文件
# POS:    scripts/sprite-pipeline/pipeline/extract_2d.py
# 备注：sekai bundle 头部 Unity 版本被剥离，必须显式给 UnityPy 设置 fallback。
#       2022.3.21f1 与 sssekai 默认值一致。

from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple

import UnityPy
from PIL import Image

# Sekai 资源使用 Unity 2022.3.21f1（自 JP 3.6.0 起）；
# bundle header 没有写版本号，UnityPy 需要显式 fallback。
UnityPy.config.FALLBACK_UNITY_VERSION = "2022.3.21f1"


def _iter_tex_envs(tex_envs):
    """m_TexEnvs 在不同 UnityPy 版本里可能是 dict 或 list[tuple]，统一成 (name, env) 迭代。"""
    if tex_envs is None:
        return
    items = tex_envs.items() if hasattr(tex_envs, "items") else tex_envs
    for entry in items:
        if isinstance(entry, tuple) and len(entry) == 2:
            yield entry[0], entry[1]
        else:
            # list 元素可能是带属性的对象
            name = getattr(entry, "name", None) or getattr(entry, "first", None)
            value = getattr(entry, "value", None) or getattr(entry, "second", None)
            if name is not None and value is not None:
                yield name, value


def _read_main_tex(material) -> Optional[Image.Image]:
    sp = getattr(material, "m_SavedProperties", None)
    if sp is None:
        return None
    for name, env in _iter_tex_envs(getattr(sp, "m_TexEnvs", None)):
        if name != "_MainTex":
            continue
        tex_pptr = getattr(env, "m_Texture", None)
        if tex_pptr is None or tex_pptr.m_PathID == 0:
            return None
        try:
            tex = tex_pptr.read()
        except Exception:
            return None
        img = getattr(tex, "image", None)
        if img is not None:
            return img.convert("RGBA")
    return None


def extract_main_texture(bundle_path: Path) -> Image.Image:
    """从 bundle 中抽取主纹理。优先 Material._MainTex，否则回退第一个 Texture2D。"""
    env = UnityPy.load(str(bundle_path))

    # 1) 优先：任意 Material 的 _MainTex
    for obj in env.objects:
        if obj.type.name != "Material":
            continue
        try:
            mat = obj.read()
        except Exception:
            continue
        img = _read_main_tex(mat)
        if img is not None:
            return img

    # 2) 回退：bundle 中第一个含图像的 Texture2D
    for obj in env.objects:
        if obj.type.name != "Texture2D":
            continue
        try:
            tex = obj.read()
        except Exception:
            continue
        img = getattr(tex, "image", None)
        if img is not None:
            return img.convert("RGBA")

    raise ValueError(f"no texture in bundle: {bundle_path}")


def extract_to_png(
    bundle_path: Path,
    out_path: Path,
    target_size: Optional[Tuple[int, int]] = None,
) -> Tuple[int, int]:
    """抽取主纹理并写 PNG。target_size 给定时按 LANCZOS 重采样。返回最终像素尺寸。"""
    img = extract_main_texture(bundle_path)
    if target_size is not None:
        img = img.resize(target_size, Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="PNG", optimize=True)
    return img.size
