import itertools
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from assign import Model, solve_assign  # noqa: E402
from binpack import lower_bound, solve_binpack  # noqa: E402
from knapsack import solve_knapsack  # noqa: E402

SHIPS = [("T1", 6, 10, []), ("T2", 8, 14, ["lanh"]), ("T3", 11, 15, []), ("T4", 13, 18, []), ("T5", 15, 19, ["lanh"]), ("T6", 16, 22, [])]
TEAMS = [("Đội 1", ["boc"], 100), ("Đội 2", ["boc"], 90), ("Đội 3", ["boc", "lanh"], 130), ("Đội 4", ["boc"], 160)]


def sample_assign():
    ships = [dict(name=n, s=s, e=e, need=["boc"] + nd) for n, s, e, nd in SHIPS]
    teams = [dict(name=n, skills=sk, rate=r) for n, sk, r in TEAMS]
    return ships, teams


def brute_assign(M):
    best = float("inf")
    for combo in itertools.product(range(M.m), repeat=M.n):
        if all(M.ok[i][j] for i, j in enumerate(combo)) and not any(
                M.conf[a][b] and combo[a] == combo[b] for a in range(M.n) for b in range(a + 1, M.n)):
            best = min(best, M.total(list(combo)))
    return best


def test_assign_sample_matches_design():
    ships, teams = sample_assign()
    out = solve_assign(ships, teams, [])
    g = out["results"]["greedy"]
    # thiết kế: sau 4 tàu tổng 2.000, cuối cùng 3.060, cận dưới 3.010
    assert g["steps"][4]["total"] == 2000 and g["steps"][4]["assign"][:4] == [1, 2, 1, 0]
    assert g["cost"] == 3060 and out["lb"] == 3010
    t4 = g["steps"][4]["cands"]
    assert [c["status"] for c in t4] == ["chosen", "blocked", "blocked", "ok"]
    assert t4[1]["reason"] == {"t": "time", "ship": 2} and t4[2]["reason"] == {"t": "time", "ship": 1}
    assert out["results"]["bt"]["cost"] == brute_assign(Model([dict(s, ) for s in ships], teams, []))


def test_assign_bt_equals_brute_force():
    rnd = random.Random(7)
    for _ in range(120):
        n, m = rnd.randint(2, 6), rnd.randint(1, 3)
        ships = []
        for i in range(n):
            s = rnd.randint(0, 10)
            ships.append(dict(name=f"S{i}", s=s, e=s + rnd.randint(1, 6), need=rnd.sample(["a", "b"], rnd.randint(0, 1))))
        teams = [dict(name=f"D{j}", skills=rnd.sample(["a", "b"], rnd.randint(1, 2)), rate=rnd.randint(1, 9)) for j in range(m)]
        pairs = [[0, 1]] if n > 1 and rnd.random() < .3 else []
        M = Model(ships, teams, pairs)
        out = solve_assign(ships, teams, pairs)
        bf = brute_assign(M)
        bt = out["results"]["bt"]
        if bf == float("inf"):
            assert not bt["feasible"]
        else:
            assert bt["feasible"] and abs(bt["cost"] - bf) < 1e-9 and bt["optimal"]
            for k in ("greedy", "hard"):
                r = out["results"][k]
                if r["feasible"]:
                    assert r["cost"] >= bf - 1e-9
                    assert all(not (M.conf[a][b] and r["assign"][a] == r["assign"][b]) for a in range(n) for b in range(a + 1, n))


ITEMS = [("Sửa cẩu RTG", 3, 40), ("Tiếp nhiên liệu", 4, 50), ("Bốc dỡ thêm", 5, 70), ("Kiểm định an toàn", 2, 30)]


def test_knapsack_sample_matches_design():
    out = solve_knapsack([dict(name=n, w=w, v=v) for n, w, v in ITEMS], 8)["results"]
    assert out["greedy"]["value"] == 100 and out["dp"]["value"] == 110 and out["bt"]["value"] == 110
    assert out["dp"]["take"] == [True, False, True, False]
    assert out["dp"]["dp"][3] == [0, 0, 0, 40, 50, 70, 70, 90, 110]
    assert out["dp"]["dp"][2] == [0, 0, 0, 40, 50, 50, 50, 90, 90]


def test_knapsack_random():
    rnd = random.Random(3)
    for _ in range(150):
        n = rnd.randint(1, 8)
        W = rnd.randint(0, 20)
        items = [dict(name=f"I{i}", w=rnd.randint(1, 9), v=rnd.randint(0, 30)) for i in range(n)]
        bf = max(sum(items[i]["v"] for i in range(n) if m >> i & 1) for m in range(1 << n)
                 if sum(items[i]["w"] for i in range(n) if m >> i & 1) <= W)
        res = solve_knapsack(items, W)["results"]
        assert res["dp"]["value"] == bf == res["bt"]["value"]
        assert res["greedy"]["value"] <= bf
        for k in ("dp", "bt", "greedy"):
            tk = res[k]["take"]
            assert sum(it["w"] for it, t in zip(items, tk) if t) <= W
            assert sum(it["v"] for it, t in zip(items, tk) if t) == res[k]["value"]


def brute_bins(ws, C):
    best = len(ws)

    def rec(i, loads):
        nonlocal best
        if len(loads) >= best:
            return
        if i == len(ws):
            best = len(loads)
            return
        for b in range(len(loads)):
            if loads[b] + ws[i] <= C:
                loads[b] += ws[i]
                rec(i + 1, loads)
                loads[b] -= ws[i]
        loads.append(ws[i])
        rec(i + 1, loads)
        loads.pop()

    rec(0, [])
    return best


def test_binpack_sample_matches_design():
    ws = [14, 12, 10, 9, 8, 7, 6, 4]
    out = solve_binpack([dict(name=f"C{i + 1}", w=w) for i, w in enumerate(ws)], 30)
    assert out["lb"] == 3
    ffd = out["results"]["ffd"]
    assert ffd["used"] == 3 and ffd["steps"][5]["loads"] == [26, 27] and ffd["steps"][5]["cands"][0]["status"] == "blocked"
    assert ffd["steps"][5]["cands"][1]["status"] == "chosen"
    assert out["results"]["bt"]["used"] == 3


def test_binpack_random():
    rnd = random.Random(11)
    for _ in range(150):
        n = rnd.randint(1, 8)
        C = rnd.randint(8, 20)
        ws = [rnd.randint(1, C) for _ in range(n)]
        items = [dict(name=f"C{i}", w=w) for i, w in enumerate(ws)]
        res = solve_binpack(items, C)["results"]
        bf = brute_bins(ws, C)
        assert res["bt"]["used"] == bf and res["bt"]["optimal"]
        assert bf >= lower_bound(items, C)
        for k in ("ff", "ffd", "bfd"):
            assert res[k]["used"] >= bf
            flat = sorted(i for b in res[k]["bins"] for i in b)
            assert flat == list(range(n))
            assert all(sum(ws[i] for i in b) <= C for b in res[k]["bins"])
        flat = sorted(i for b in res["bt"]["bins"] for i in b)
        assert flat == list(range(n))


def test_api_modules():
    from fastapi.testclient import TestClient
    from server import app
    c = TestClient(app)
    ships, teams = sample_assign()
    r = c.post("/api/assign", json=dict(ships=ships, teams=teams))
    assert r.status_code == 200 and r.json()["results"]["greedy"]["cost"] == 3060
    assert c.post("/api/knapsack", json=dict(items=[dict(name="a", w=0, v=1)], W=5)).status_code == 422
    assert c.post("/api/binpack", json=dict(items=[dict(name="a", w=40)], C=30)).status_code == 422
    r = c.post("/api/knapsack", json=dict(items=[dict(name=n, w=w, v=v) for n, w, v in ITEMS], W=8))
    assert r.status_code == 200 and r.json()["results"]["dp"]["value"] == 110
