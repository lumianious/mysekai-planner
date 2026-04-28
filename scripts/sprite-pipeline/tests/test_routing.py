# ======== routing 一致性测试（与 JS 实现）========
# POS:    scripts/sprite-pipeline/tests/test_routing.py

import json
from pathlib import Path

from pipeline.routing import get_ground_subtype, is_2d_branch, is_outdoor

SNAPSHOT = Path(__file__).parent / "test_routing_parity_fixtures.json"


def test_get_ground_subtype_parity_with_js():
    with open(SNAPSHOT) as f:
        cases = json.load(f)
    assert len(cases) > 0, "snapshot empty — run generate_parity_snapshot.mjs"
    mismatches = []
    for c in cases:
        actual = get_ground_subtype(c)
        expected = c["expected_ground_subtype"]
        if actual != expected:
            mismatches.append((c["id"], expected, actual))
    assert not mismatches, f"{len(mismatches)} parity mismatches: {mismatches[:5]}"


def test_is_2d_branch_covers_floor_appearance():
    fx = {
        "mysekaiSettableLayoutType": "floor_appearance",
        "mysekaiFixtureHandleType": "block",
    }
    assert is_2d_branch(fx) is True


def test_is_2d_branch_3d_default():
    fx = {
        "mysekaiSettableLayoutType": "floor",
        "mysekaiFixtureHandleType": "block",
    }
    assert is_2d_branch(fx) is False


def test_is_outdoor_excludes_room():
    assert is_outdoor({"mysekaiSettableSiteType": "home"}) is True
    assert is_outdoor({"mysekaiSettableSiteType": "room"}) is False
