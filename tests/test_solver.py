import itertools
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from solver import Graph, solve_all, run_bt, run_best, run_greedy, run_dsatur  # noqa: E402

BASIC = [(0, 3), (17, 20), (8, 15), (10, 18), (15, 22), (20, 29), (1, 9), (0, 7)]
EXTRA = [(13, 21), (23, 29), (15, 23), (19, 22), (15, 19), (0, 3), (1, 5), (7, 14)]


def mk(iv):
    return [dict(name=f"Tàu {i + 1}", s=s, e=e) for i, (s, e) in enumerate(iv)]


def valid(G, col):
    return all(c >= 0 for c in col) and all(col[u] != col[v] for v in range(G.n) for u in G.adj[v])


def brute(G):
    best = float("inf")

    def rec(i, col, used):
        nonlocal best
        if i == G.n:
            best = min(best, G.cost(col))
            return
        for k in range(used + 1):
            if any(col[u] == k for u in G.adj[i] if u < i):
                continue
            col[i] = k
            rec(i + 1, col, max(used, k + 1))
            col[i] = -1

    rec(0, [-1] * G.n, 0)
    return best


def test_samples_match_reference():
    r = solve_all(mk(BASIC), [], 100, 10)["results"]
    assert (r["greedy"]["nBerths"], r["greedy"]["cost"]) == (3, 1000)
    assert (r["best"]["nBerths"], r["best"]["cost"]) == (4, 940)
    assert (r["bt"]["nBerths"], r["bt"]["cost"]) == (4, 940)
    r = solve_all(mk(EXTRA), [[2, 4], [3, 7]], 100, 10)["results"]
    assert [r[k]["cost"] for k in ("greedy", "best", "dsatur", "bt")] == [1000, 960, 880, 860] or \
        r["bt"]["cost"] == 860


def test_bt_equals_bruteforce_and_all_valid():
    rnd = random.Random(7)
    for _ in range(300):
        n = rnd.randint(2, 8)
        iv = []
        for _ in range(n):
            s = rnd.randint(0, 20)
            iv.append((s, s + rnd.randint(1, 8)))
        ships = mk(iv)
        pairs = [[a, b] for a, b in itertools.combinations(range(n), 2) if rnd.random() < 0.12]
        F, r = rnd.choice([0, 50, 100]), rnd.choice([0, 5, 10])
        G = Graph(ships, pairs, F, r)
        bt = run_bt(G)
        assert abs(bt["cost"] - brute(G)) < 1e-6
        for fn in (run_greedy, run_best, run_dsatur, run_bt):
            res = fn(G)
            assert valid(G, res["col"])
            assert res["cost"] >= bt["cost"] - 1e-6 or fn is run_bt
            assert res["steps"][-1]["kind"] == "done" and res["steps"][-1]["col"] == res["col"]


def test_large_instance_is_bounded():
    rnd = random.Random(1)
    iv = [(s := rnd.randint(0, 200), s + rnd.randint(1, 20)) for _ in range(60)]
    out = solve_all(mk(iv), [], 100, 10)
    assert len(out["results"]["bt"]["steps"]) <= 3002
    assert out["results"]["bt"]["ms"] < 4000


def test_api():
    from fastapi.testclient import TestClient
    from server import app
    c = TestClient(app)
    body = dict(ships=mk(BASIC), pairs=[], F=100, r=10)
    j = c.post("/api/solve", json=body).json()
    assert j["results"]["bt"]["cost"] == 940
    bad = dict(body, F=-1)
    assert c.post("/api/solve", json=bad).status_code == 422


def test_step_details():
    r = solve_all(mk([(6, 9), (8, 11), (9.5, 13), (10, 14), (13.5, 17), (15, 19), (18, 21)]), [[1, 4]], 500, 40)["results"]
    s5 = r["best"]["steps"][5]  # Tàu 5
    by_k = {c["k"]: c for c in s5["cands"]}
    assert s5["line"] == 8 and s5["cost"] == 2220
    assert by_k[0]["status"] == "chosen" and by_k[0]["delta"] == 160
    assert by_k[1]["status"] == "blocked" and by_k[1]["reason"] == dict(t="extra", ship=1)
    assert by_k[2]["status"] == "blocked" and by_k[2]["reason"] == dict(t="time", ship=3)
    assert by_k[3]["new"] and by_k[3]["delta"] == 640 and by_k[3]["status"] == "ok"
    dead = [s for s in r["bt"]["steps"] if s["kind"] == "dead"][0]
    assert dead["cost"] == 2440 and dead["best"] == 2580 and dead["line"] == 6
    sts = {c["k"]: c for c in dead["cands"]}
    assert sts[0]["status"] == "blocked"
    assert [sts[k]["bound"] for k in (1, 2, 3)] == [2840, 2600, 3060]
    assert all(c["status"] == "pruned" for k, c in sts.items() if k)
    for key in r:
        for s in r[key]["steps"]:
            assert "cost" in s and "line" in s
