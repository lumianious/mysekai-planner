# ======== 输出尺寸数学测试（SPRT-04）========
# INPUT:  无
# OUTPUT: pytest 报告
# POS:    scripts/sprite-pipeline/tests/test_output_dimensions.py
# 编辑器 TILE_SIZE = 32（src/utils/grid.ts），管线 4× 过采样 -> 128。

from pipeline.config import TILE_PX


def expected_canvas_px(grid_w: int, grid_d: int) -> tuple[int, int]:
    return (grid_w * TILE_PX, grid_d * TILE_PX)


def test_canvas_is_grid_times_tile_px():
    assert expected_canvas_px(1, 1) == (128, 128)
    assert expected_canvas_px(3, 2) == (384, 256)
    assert expected_canvas_px(5, 5) == (640, 640)


def test_tile_px_is_4x_editor_tile_size():
    assert TILE_PX == 128
