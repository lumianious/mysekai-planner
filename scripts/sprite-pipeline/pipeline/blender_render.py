# ======== Blender 顶视图正交渲染（D-04 / 3D 分支）========
# INPUT:  --asset <path>（.glb 或 .unity3d） --out <png> --tile-w W --tile-d D
# OUTPUT: 透明背景 RGBA PNG，分辨率 = W*128 × D*128
# POS:    scripts/sprite-pipeline/pipeline/blender_render.py
# 调用：blender --background --python blender_render.py -- --asset ... --out ... --tile-w ... --tile-d ...
# 备注：sssekai_blender_io 在 --background 下不可用时退出码 2，pilot.py 据此判断回退路径。

import argparse
import math
import sys


TILE_PX = 128


# ======== 引擎选择（Pitfall 1：Eevee 命名因 Blender 版本而异）========
def _select_engine(scene, preferred: str) -> str:
    """按优先级尝试设置渲染引擎；不可用时静默跳到下一个。
    Blender 4.2 之前是 BLENDER_EEVEE，4.2+ 引入 BLENDER_EEVEE_NEXT，
    Blender 5.0 起统一回 BLENDER_EEVEE_NEXT (Eevee Next 已成默认)。CYCLES 保底。"""
    if preferred == "eevee_next":
        candidates = ["BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"]
    elif preferred == "eevee":
        candidates = ["BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES"]
    else:
        candidates = ["CYCLES", "BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"]
    for engine in candidates:
        try:
            scene.render.engine = engine
            return engine
        except Exception:
            continue
    raise RuntimeError(f"no compatible render engine available; tried {candidates}")


# ======== 资源导入：先尝试 sssekai 插件，回退 GLB ========
def _import_asset(asset_path: str) -> None:
    import bpy

    p = asset_path.lower()
    if p.endswith(".glb") or p.endswith(".gltf"):
        bpy.ops.import_scene.gltf(filepath=asset_path)
        return

    # .unity3d / sssekai bundle path
    try:
        bpy.ops.sssekai.import_unity(filepath=asset_path)
    except (RuntimeError, AttributeError):
        # 插件在 headless 下未注册 / 调用面失败：信号化退出
        print("[FALLBACK] sssekai_blender_io unavailable in headless", file=sys.stderr)
        sys.exit(2)


# ======== 场景清理 ========
def _wipe_scene() -> None:
    import bpy

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for collection in [bpy.data.meshes, bpy.data.materials, bpy.data.textures, bpy.data.images]:
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


# ======== 计算导入对象的 AABB ========
def _scene_aabb():
    import bpy
    from mathutils import Vector

    mins = [math.inf, math.inf, math.inf]
    maxs = [-math.inf, -math.inf, -math.inf]
    found = False
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            for i in range(3):
                mins[i] = min(mins[i], world[i])
                maxs[i] = max(maxs[i], world[i])
        found = True
    if not found:
        raise RuntimeError("no mesh in imported scene")
    return Vector(mins), Vector(maxs)


# ======== 顶视图正交相机 ========
def _setup_camera_and_light(tile_w: int, tile_d: int):
    import bpy
    from mathutils import Vector

    mins, maxs = _scene_aabb()
    center = (mins + maxs) * 0.5
    size_xy = max(maxs.x - mins.x, maxs.y - mins.y)
    # PILOT-FINDINGS Q3 → Wave 3 fix: Unity 模型坐标（米级）与 fixture.gridSize（格）
    # 不可直接比较；渲 ortho_scale 必须只用 AABB。grid_w / grid_d 决定输出像素分辨率，
    # 不影响相机缩放。1×1 微件取下界 0.4m 以避免极端裁切。
    ortho_scale = max(size_xy, 0.4) * 1.15

    bpy.ops.object.camera_add(
        location=(center.x, center.y, maxs.z + max(size_xy, 0.5) + 5),
        rotation=(0, 0, 0),
    )
    cam = bpy.context.object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = ortho_scale
    bpy.context.scene.camera = cam

    bpy.ops.object.light_add(
        type="SUN",
        location=(center.x, center.y, maxs.z + max(size_xy, 0.5) + 10),
    )
    sun = bpy.context.object
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(45), math.radians(20), 0)


# ======== 渲染配置 ========
def _configure_render(scene, width: int, height: int) -> None:
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True


# ======== 入口 ========
def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--tile-w", type=int, required=True)
    parser.add_argument("--tile-d", type=int, required=True)
    parser.add_argument("--engine", default="eevee_next", choices=["eevee_next", "eevee", "cycles"])
    args = parser.parse_args(argv)

    import bpy

    _wipe_scene()
    _import_asset(args.asset)

    chosen = _select_engine(bpy.context.scene, args.engine)
    print(f"[engine] {chosen}", file=sys.stderr)

    _setup_camera_and_light(args.tile_w, args.tile_d)
    _configure_render(
        bpy.context.scene,
        width=args.tile_w * TILE_PX,
        height=args.tile_d * TILE_PX,
    )
    bpy.context.scene.render.filepath = args.out
    bpy.ops.render.render(write_still=True)
    return 0


if __name__ == "__main__":
    # blender --background --python <this> -- <args>
    if "--" in sys.argv:
        idx = sys.argv.index("--")
        cli_args = sys.argv[idx + 1 :]
    else:
        cli_args = sys.argv[1:]
    sys.exit(main(cli_args))
