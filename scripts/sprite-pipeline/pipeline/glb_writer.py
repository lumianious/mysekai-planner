# ======== Unity AssetBundle -> GLB（Option B 回退桩）========
# INPUT:  Unity AssetBundle 路径
# OUTPUT: GLB 文件（一 mesh + 一 diffuse + 一 PBR Material）
# POS:    scripts/sprite-pipeline/pipeline/glb_writer.py
# 备注：仅在 sssekai_blender_io 在 --background 下不可用时才需实现；
#       Wave 2 pilot 决定是否启用。当前为 stub。

from pathlib import Path


def unity_bundle_to_glb(bundle_path: Path, out_glb: Path) -> None:
    """Stub — Wave 3 will implement using pygltflib if Wave 2 pilot proves the
    sssekai_blender_io addon does not register under `blender --background`.
    """
    raise NotImplementedError(
        "glb_writer is a Wave 3 fallback; pilot must confirm sssekai_blender_io "
        "is unavailable in headless mode before this stub is fleshed out."
    )
