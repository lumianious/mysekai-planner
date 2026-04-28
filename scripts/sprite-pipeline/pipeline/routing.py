# ======== 地面子类型分类（D-19：Python ↔ JS 一致）========
# INPUT:  fixture dict（来自 mysekaiFixtures.json schema）
# OUTPUT: ground subtype string 或 None；is_2d_branch 返回 bool
# POS:    scripts/sprite-pipeline/pipeline/routing.py
# 与 src/data/fixtures.ts:getGroundSubtype 必须保持同步——见 tests/test_routing.py 一致性断言

from typing import Literal, Optional

GroundSubtype = Literal["road", "color-tile", "fence", "rug"]


def get_ground_subtype(fx: dict) -> Optional[GroundSubtype]:
    if fx.get("mysekaiFixtureHandleType") == "fence":
        return "fence"
    if fx.get("mysekaiFixtureHandleType") == "road":
        return "color-tile" if fx.get("mysekaiFixtureMainGenreId") == 31 else "road"
    if fx.get("mysekaiSettableLayoutType") == "rug":
        return "rug"
    return None


def is_2d_branch(fx: dict) -> bool:
    # D-08：getGroundSubtype 真值 -> 2D 抽取
    if get_ground_subtype(fx) is not None:
        return True
    # 名称语义：floor_appearance 默认走 2D 抽取（可被 overrides.yaml 翻转）
    if fx.get("mysekaiSettableLayoutType") == "floor_appearance":
        return True
    return False


def is_outdoor(fx: dict) -> bool:
    # 户外过滤：排除 113 个 indoor-only 项
    return fx.get("mysekaiSettableSiteType") != "room"
