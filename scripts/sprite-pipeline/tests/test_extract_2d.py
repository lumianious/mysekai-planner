# ======== 2D 抽取单元测试 ========
# INPUT:  tests/fixtures/sample_2d_bundle.unity3d
# OUTPUT: pytest 报告
# POS:    scripts/sprite-pipeline/tests/test_extract_2d.py

from PIL import Image

from pipeline.extract_2d import extract_main_texture, extract_to_png


def test_extract_returns_rgba_pil(sample_2d_bundle_path):
    img = extract_main_texture(sample_2d_bundle_path)
    assert img.mode == "RGBA"
    assert img.size[0] > 0 and img.size[1] > 0


def test_known_bundle(sample_2d_bundle_path, tmp_path):
    out = tmp_path / "out.png"
    size = extract_to_png(sample_2d_bundle_path, out)
    assert out.exists() and out.stat().st_size > 0
    img = Image.open(out)
    assert img.mode == "RGBA"
    assert img.size == size


def test_target_size_resamples(sample_2d_bundle_path, tmp_path):
    out = tmp_path / "resized.png"
    size = extract_to_png(sample_2d_bundle_path, out, target_size=(128, 128))
    assert size == (128, 128)
    assert Image.open(out).size == (128, 128)
