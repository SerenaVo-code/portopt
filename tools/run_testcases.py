"""Chạy toàn bộ testcase trong testcases/*/ (gọi thẳng các hàm giải, không qua API) và kiểm tra kết quả bằng bộ kiểm tra viết riêng.

    python3 tools/run_testcases.py            # in tóm tắt, ghi testcases/RESULTS.md và results.json
    python3 tools/run_testcases.py --quiet    # chỉ in dòng tổng

Bộ kiểm tra KHÔNG tin các cờ `optimal`/`feasible` của solver. Nó tự tính lại từ lời giải:
  - hợp lệ: không có hai tàu xung đột chung hợp đồng/đội; đủ kỹ năng; tải ≤ sức chứa; mỗi lô đúng một lần;
  - chi phí/giá trị/số thùng được tính lại và phải trùng với con số solver báo;
  - đối chiếu với `expect.opt` (vét cạn, công thức hoặc dựng sẵn) và cận dưới;
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from assign import solve_assign  # noqa: E402
from binpack import solve_binpack  # noqa: E402
from knapsack import solve_knapsack  # noqa: E402
from solver import solve_all  # noqa: E402

EPS = 1e-6
SOLVE = {
    "m1": lambda i: solve_all(i["ships"], i["pairs"], i["F"], i["r"]),
    "m2": lambda i: solve_assign(i["ships"], i["teams"], i["pairs"]),
    "m3": lambda i: solve_knapsack(i["items"], i["W"]),
    "m4": lambda i: solve_binpack(i["items"], i["C"]),
}
MODULE_NAME = {"m1": "Thuê bến (tô màu đồ thị)", "m2": "Phân công đội (gán việc)",
               "m3": "Quỹ giờ công (cái túi 0/1)", "m4": "Xếp container (bin packing)"}
ALGO_NAME = {"greedy": "Tham lam", "best": "Tham lam chi phí", "dsatur": "DSATUR", "bt": "Quay lui",
             "hard": "Khó trước", "dp": "QHĐ", "ff": "FF", "ffd": "FFD", "bfd": "BFD"}
GROUP_ORDER = ["thuong", "nho", "bien", "dac-biet", "lon"]
GROUP_LABEL = {"thuong": "Thông thường", "nho": "Dữ liệu nhỏ", "bien": "Biên", "dac-biet": "Đặc biệt",
               "lon": "Dữ liệu lớn", "khong-hop-le": "Không hợp lệ"}


def num(x):
    x = round(x, 4)
    return str(int(x)) if x == int(x) else str(x)


# ───────────── bộ kiểm tra từng module (độc lập với solver) ─────────────
def check_m1(inp, out, ex):
    ships, pairs, F, r = inp["ships"], inp["pairs"], inp["F"], inp["r"]
    n = len(ships)
    bad = {frozenset(p) for p in pairs if p[0] != p[1]}
    errs, info = [], {}
    ev = sorted([(s["s"], 1) for s in ships] + [(s["e"], -1) for s in ships])
    cur = om = 0
    for _, d in ev:
        cur += d
        om = max(om, cur)
    lbc = om * F + r * sum(s["e"] - s["s"] for s in ships)
    for k, res in out["results"].items():
        col = res["col"]
        if len(col) != n or min(col) < 0:
            errs.append(f"{ALGO_NAME[k]}: chưa gán đủ tàu")
            continue
        for i in range(n):
            for j in range(i + 1, n):
                over = ships[i]["s"] < ships[j]["e"] and ships[j]["s"] < ships[i]["e"]
                if col[i] == col[j] and (over or frozenset((i, j)) in bad):
                    errs.append(f"{ALGO_NAME[k]}: tàu {i + 1} và {j + 1} xung đột nhưng chung hợp đồng")
        cost = 0.0
        for c in set(col):
            g = [ships[i] for i in range(n) if col[i] == c]
            cost += F + r * (max(x["e"] for x in g) - min(x["s"] for x in g))
        if abs(cost - res["cost"]) > EPS:
            errs.append(f"{ALGO_NAME[k]}: chi phí báo {num(res['cost'])} nhưng tính lại {num(cost)}")
        if cost < lbc - EPS:
            errs.append(f"{ALGO_NAME[k]}: chi phí {num(cost)} thấp hơn cận dưới {num(lbc)}")
        info[k] = (cost, res["ms"])
    if errs:
        return errs, info, None
    costs = {k: v[0] for k, v in info.items()}
    bt = out["results"]["bt"]
    if costs["bt"] > min(costs.values()) + EPS:
        errs.append(f"Quay lui ({num(costs['bt'])}) kém hơn heuristic tốt nhất ({num(min(costs.values()))})")
    opt = ex.get("opt")
    note = ""
    if opt is not None:
        if min(costs.values()) < opt - EPS:
            errs.append(f"có thuật toán ({num(min(costs.values()))}) thấp hơn tối ưu đã biết {num(opt)}")
        if bt["exhausted"] and abs(costs["bt"] - opt) > EPS:
            errs.append(f"Quay lui duyệt hết nhưng {num(costs['bt'])} ≠ tối ưu {num(opt)}")
        elif not bt["exhausted"]:
            gap = costs["bt"] - opt
            note = "BT chạm giới hạn thời gian, " + ("vẫn đạt tối ưu" if abs(gap) <= EPS else f"lệch {num(gap)} so với tối ưu")
        if len(ships) <= 10 and abs(costs["bt"] - opt) > EPS:
            errs.append(f"cỡ nhỏ nhưng Quay lui {num(costs['bt'])} ≠ tối ưu {num(opt)}")
    elif not bt["exhausted"]:
        note = "BT chạm giới hạn thời gian (không có đáp án tham chiếu)"
    return errs, info, note


def check_m2(inp, out, ex):
    ships, teams, pairs = inp["ships"], inp["teams"], inp["pairs"]
    n = len(ships)
    extra = {frozenset(p) for p in pairs if p[0] != p[1]}
    errs, info = [], {}
    for k, res in out["results"].items():
        a = res["assign"]
        if all(j >= 0 for j in a):
            for i in range(n):
                if not set(ships[i]["need"]) <= set(teams[a[i]]["skills"]):
                    errs.append(f"{ALGO_NAME[k]}: {ships[i]['name']} giao cho đội thiếu kỹ năng")
                for j in range(i + 1, n):
                    over = ships[i]["s"] < ships[j]["e"] and ships[j]["s"] < ships[i]["e"]
                    if a[i] == a[j] and (over or frozenset((i, j)) in extra):
                        errs.append(f"{ALGO_NAME[k]}: {ships[i]['name']} và {ships[j]['name']} trùng giờ/bị cấm nhưng chung đội")
            cost = sum(teams[a[i]]["rate"] * (ships[i]["e"] - ships[i]["s"]) for i in range(n))
            if abs(cost - res["cost"]) > EPS:
                errs.append(f"{ALGO_NAME[k]}: chi phí báo {num(res['cost'])} nhưng tính lại {num(cost)}")
            if out["lb"] is not None and cost < out["lb"] - EPS:
                errs.append(f"{ALGO_NAME[k]}: chi phí {num(cost)} thấp hơn cận dưới {num(out['lb'])}")
            info[k] = (cost, res["ms"])
        else:
            if res["feasible"]:
                errs.append(f"{ALGO_NAME[k]}: báo feasible nhưng còn tàu chưa gán")
            info[k] = (None, res["ms"])
    if errs:
        return errs, info, None
    note = ""
    bt = out["results"]["bt"]
    opt, feas = ex.get("opt"), ex.get("feasible")
    if feas is False:
        for k, (c, _) in info.items():
            if c is not None:
                errs.append(f"{ALGO_NAME[k]}: có nghiệm dù bài toán vô nghiệm")
        if not bt["optimal"]:
            errs.append("Quay lui không kết luận được vô nghiệm")
        else:
            note = "vô nghiệm, đã phát hiện đúng"
    else:
        if info["bt"][0] is None:
            errs.append("Quay lui không tìm được nghiệm dù bài toán có nghiệm")
        else:
            for k, (c, _) in info.items():
                if c is not None and c < info["bt"][0] - EPS and bt["optimal"]:
                    errs.append(f"{ALGO_NAME[k]} ({num(c)}) tốt hơn Quay lui đã duyệt hết ({num(info['bt'][0])})")
            if opt is not None:
                if bt["optimal"] and abs(info["bt"][0] - opt) > EPS:
                    errs.append(f"Quay lui {num(info['bt'][0])} ≠ tối ưu {num(opt)}")
                if any(c is not None and c < opt - EPS for c, _ in info.values()):
                    errs.append("có thuật toán thấp hơn tối ưu đã biết")
                if not bt["optimal"]:
                    gap = info["bt"][0] - opt
                    note = "BT chạm giới hạn thời gian, " + ("vẫn đạt tối ưu" if abs(gap) <= EPS else f"lệch {num(gap)} so với tối ưu")
            elif not bt["optimal"]:
                note = "BT chạm giới hạn thời gian (không có đáp án tham chiếu)"
        for k, (c, _) in info.items():
            if c is None and k != "bt":
                note = (note + "; " if note else "") + f"{ALGO_NAME[k]} không gán được hết"
    return errs, info, note


def check_m3(inp, out, ex):
    items, W = inp["items"], inp["W"]
    errs, info = [], {}
    for k, res in out["results"].items():
        t = res["take"]
        hrs = sum(it["w"] for it, x in zip(items, t) if x)
        val = sum(it["v"] for it, x in zip(items, t) if x)
        if hrs > W:
            errs.append(f"{ALGO_NAME[k]}: tổng giờ {hrs} vượt quỹ {W}")
        if abs(val - res["value"]) > EPS:
            errs.append(f"{ALGO_NAME[k]}: giá trị báo {num(res['value'])} nhưng tính lại {num(val)}")
        info[k] = (val, res["ms"])
    if errs:
        return errs, info, None
    opt = ex["opt"]
    if abs(info["dp"][0] - opt) > EPS:
        errs.append(f"QHĐ {num(info['dp'][0])} ≠ tối ưu {num(opt)}")
    if out["results"]["dp"]["dp"][len(items)][W] != out["results"]["dp"]["value"]:
        errs.append("ô dp[n][W] không khớp giá trị QHĐ báo")
    if info["greedy"][0] > opt + EPS:
        errs.append("tham lam vượt tối ưu (vô lý)")
    bt = out["results"]["bt"]
    note = ""
    if bt["optimal"] and abs(info["bt"][0] - opt) > EPS:
        errs.append(f"Quay lui duyệt hết nhưng {num(info['bt'][0])} ≠ tối ưu {num(opt)}")
    if not bt["optimal"]:
        note = "BT chạm giới hạn thời gian, " + ("vẫn đạt tối ưu" if abs(info["bt"][0] - opt) <= EPS else f"lệch {num(opt - info['bt'][0])}")
    if info["greedy"][0] < opt - EPS:
        note = (note + "; " if note else "") + f"tham lam thiếu {num(opt - info['greedy'][0])}"
    return errs, info, note


def check_m4(inp, out, ex):
    items, C = inp["items"], inp["C"]
    n = len(items)
    errs, info = [], {}
    for k, res in out["results"].items():
        flat = sorted(x for b in res["bins"] for x in b)
        if flat != list(range(n)):
            errs.append(f"{ALGO_NAME[k]}: mỗi lô phải xuất hiện đúng một lần")
            continue
        for bi, b in enumerate(res["bins"]):
            if sum(items[x]["w"] for x in b) > C + EPS:
                errs.append(f"{ALGO_NAME[k]}: thùng {bi + 1} quá tải")
        if len(res["bins"]) != res["used"]:
            errs.append(f"{ALGO_NAME[k]}: số thùng báo {res['used']} ≠ {len(res['bins'])}")
        if res["used"] < out["lb"]:
            errs.append(f"{ALGO_NAME[k]}: {res['used']} thùng ít hơn cận dưới {out['lb']}")
        info[k] = (res["used"], res["ms"])
    if errs:
        return errs, info, None
    lb_true = math.ceil(sum(i["w"] for i in items) / C - 1e-9)
    if out["lb"] != lb_true:
        errs.append(f"cận dưới báo {out['lb']} ≠ ⌈tổng/C⌉ = {lb_true}")
    opt = ex.get("opt")
    bt = out["results"]["bt"]
    note = ""
    if info["bt"][0] > min(v[0] for v in info.values()):
        errs.append("Quay lui dùng nhiều thùng hơn heuristic tốt nhất")
    if opt is not None:
        if min(v[0] for v in info.values()) < opt:
            errs.append(f"có thuật toán ({min(v[0] for v in info.values())}) ít thùng hơn tối ưu đã biết {opt}")
        if bt["optimal"] and info["bt"][0] != opt:
            errs.append(f"Quay lui duyệt hết nhưng {info['bt'][0]} ≠ tối ưu {opt}")
        if not bt["optimal"]:
            note = "BT chạm giới hạn thời gian, " + ("vẫn đạt tối ưu" if info["bt"][0] == opt else f"hơn tối ưu {info['bt'][0] - opt} thùng")
    elif not bt["optimal"]:
        note = "BT chạm giới hạn thời gian (không có đáp án tham chiếu)"
    return errs, info, note


CHECK = {"m1": check_m1, "m2": check_m2, "m3": check_m3, "m4": check_m4}


def size_of(c):
    i = c["input"]
    m = c["module"]
    if m == "m1":
        return f"{len(i.get('ships', []))} tàu"
    if m == "m2":
        return f"{len(i.get('ships', []))} tàu × {len(i.get('teams', []))} đội"
    if m == "m3":
        return f"{len(i.get('items', []))} yêu cầu, W={i.get('W')}"
    return f"{len(i.get('items', []))} lô, C={num(i['C']) if isinstance(i.get('C'), (int, float)) else i.get('C')}"


def run_case(c):
    """Gọi thẳng hàm giải của module rồi kiểm tra kết quả."""
    t0 = time.perf_counter()
    out = SOLVE[c["module"]](c["input"])
    wall = (time.perf_counter() - t0) * 1000
    row = dict(id=c["id"], module=c["module"], group=c["group"], title=c["title"], size=size_of(c),
               wall_ms=round(wall, 1), errors=[], note="", algos={})
    errs, info, note = CHECK[c["module"]](c["input"], out, c["expect"])
    row["errors"] += errs
    row["note"] = note or ""
    row["algos"] = {k: dict(result=v[0], ms=round(v[1], 2)) for k, v in info.items()}
    row["pass"] = not row["errors"]
    return row


def load_cases():
    cases = []
    for p in sorted((ROOT / "testcases").glob("m*/*.json")):
        cases.append(json.load(open(p, encoding="utf-8")))
    return cases


def run_all():
    cases = load_cases()
    return [run_case(c) for c in cases], cases


def result_str(module, algos):
    parts = []
    for k, v in algos.items():
        parts.append(f"{ALGO_NAME[k]} {num(v['result']) if v['result'] is not None else '—'}")
    return "; ".join(parts)


def write_report(rows, cases):
    by_id = {c["id"]: c for c in cases}
    npass = sum(r["pass"] for r in rows)
    L = ["# Kết quả chạy bộ testcase", "",
         f"Tổng: **{npass}/{len(rows)}** testcase đạt. Sinh tự động bởi `tools/run_testcases.py` từ các file trong `testcases/`.", "",
         "Cách đọc: *Kết quả* là chi phí (module 1, 2), giá trị (module 3) hoặc số thùng (module 4) mà mỗi thuật toán trả về, "
         "đã được tính lại độc lập. *Tối ưu tham chiếu* lấy từ vét cạn, công thức hoặc instance dựng sẵn, không lấy từ solver.", ""]
    for m in ("m1", "m2", "m3", "m4"):
        mr = [r for r in rows if r["module"] == m]
        L += [f"## {MODULE_NAME[m]}", "", "| Nhóm | Số testcase | Đạt |", "|---|---|---|"]
        for g in GROUP_ORDER:
            gr = [r for r in mr if r["group"] == g]
            if gr:
                L.append(f"| {GROUP_LABEL[g]} | {len(gr)} | {sum(r['pass'] for r in gr)} |")
        L += ["", "| ID | Nhóm | Cỡ | Tiêu đề | Tối ưu tham chiếu | Kết quả từng thuật toán | Thời gian lớn nhất (ms) | Đạt | Ghi chú |", "|---|---|---|---|---|---|---|---|---|"]
        for r in mr:
            ex = by_id[r["id"]]["expect"]
            opt = f"{num(ex['opt'])} ({ex['opt_source']})" if ex.get("opt") is not None else ("vô nghiệm" if ex.get("feasible") is False else "—")
            mx = max([v["ms"] for v in r["algos"].values()], default=0)
            res = result_str(m, r["algos"]) if r["algos"] else "—"
            note = "; ".join(r["errors"]) if r["errors"] else r["note"]
            L.append(f"| {r['id']} | {GROUP_LABEL[r['group']]} | {r['size']} | {r['title']} | {opt} | {res} | {mx:g} | {'✔' if r['pass'] else '✘'} | {note} |")
        L.append("")
    (ROOT / "testcases" / "RESULTS.md").write_text("\n".join(L), encoding="utf-8")
    (ROOT / "testcases" / "results.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    quiet = "--quiet" in sys.argv
    rows, cases = run_all()
    write_report(rows, cases)
    npass = sum(r["pass"] for r in rows)
    if not quiet:
        for r in rows:
            if not r["pass"]:
                print("FAIL", r["id"], r["title"], "|", "; ".join(r["errors"]))
    print(f"{npass}/{len(rows)} testcase đạt")
    return 0 if npass == len(rows) else 1


if __name__ == "__main__":
    sys.exit(main())
