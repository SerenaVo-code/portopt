"""Chạy toàn bộ bộ testcase trong testcases/ gọi thẳng các hàm giải và kiểm bằng bộ kiểm tra độc lập (tools/run_testcases.py)."""
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.join(ROOT, "tools"))
sys.path.insert(0, os.path.join(ROOT, "backend"))

import pytest  # noqa: E402

import run_testcases as R  # noqa: E402
from assign import Model, hall_violation  # noqa: E402

CASES = R.load_cases()


def test_suite_is_big_enough():
    by = {}
    for c in CASES:
        by.setdefault((c["module"], c["group"]), 0)
        by[(c["module"], c["group"])] += 1
    for m in ("m1", "m2", "m3", "m4"):
        for g in R.GROUP_ORDER:
            assert by.get((m, g), 0) >= 3, (m, g)
    assert len(CASES) >= 80


@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_case(case):
    row = R.run_case(case)
    assert row["pass"], "; ".join(row["errors"])


def test_hall_violation_detects_and_accepts():
    ships = [dict(name=f"T{i}", s=0, e=4, need=["boc"]) for i in range(3)]
    teams = [dict(name="A", skills=["boc"], rate=1), dict(name="B", skills=["boc"], rate=1)]
    assert hall_violation(Model(ships, teams, [])) is not None
    teams.append(dict(name="C", skills=["boc"], rate=1))
    assert hall_violation(Model(ships, teams, [])) is None
    # đủ số đội nhưng thiếu kỹ năng: 2 tàu cùng cần 'lanh', chỉ 1 đội có
    ships2 = [dict(name="X", s=0, e=4, need=["lanh"]), dict(name="Y", s=1, e=5, need=["lanh"])]
    teams2 = [dict(name="A", skills=["lanh", "boc"], rate=1), dict(name="B", skills=["boc"], rate=1)]
    assert hall_violation(Model(ships2, teams2, [])) is not None
