"""Sinh bộ testcase cho 4 module (chạy lại được, kết quả cố định nhờ seed).

    python3 tools/gen_testcases.py

Mỗi testcase là một file JSON trong testcases/<module>/:
  id, module, group, title, desc, input (đúng thân request của API, có thể dán thẳng vào giao diện),
  expect: {status, opt?, opt_source?, feasible?}

Giá trị tối ưu `opt` KHÔNG lấy từ solver của hệ thống. Nó đến từ một trong ba nguồn độc lập:
  - "vét cạn": đoạn vét cạn viết riêng trong file này (chỉ cho cỡ nhỏ);
  - "công thức": đáp án đã biết theo lý thuyết (xem từng trường hợp);
  - "dựng sẵn": instance được dựng từ lời giải đã biết (ví dụ bin packing chia đúng tải trọng).
Cỡ lớn không có `opt` thì chỉ kiểm tra tính hợp lệ, cận dưới và thứ hạng giữa các thuật toán.
"""
from __future__ import annotations

import itertools
import json
import random
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "testcases"
CASES: list[dict] = []


def add(module, group, num, title, desc, inp, **expect):
    expect.setdefault("status", 200)
    CASES.append(dict(id=f"{module}-{group}{num:02d}", module=module, group=group, title=title, desc=desc,
                      input=inp, expect=expect))


GROUPS = {"T": "thuong", "N": "nho", "B": "bien", "D": "dac-biet", "L": "lon"}


# ───────────────────────── Module 1: thuê bến (tô màu) ─────────────────────────
def ships1(iv):
    return [dict(name=f"Tàu {i + 1}", s=s, e=e) for i, (s, e) in enumerate(iv)]


def brute1(iv, pairs, F, r):
    """Vét cạn mọi cách chia tàu vào hợp đồng (phân hoạch tập), trả chi phí nhỏ nhất."""
    n = len(iv)
    adj = [set() for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            if iv[i][0] < iv[j][1] and iv[j][0] < iv[i][1]:
                adj[i].add(j)
                adj[j].add(i)
    for a, b in pairs:
        if a != b:
            adj[a].add(b)
            adj[b].add(a)
    best = [float("inf")]
    groups: list[list[int]] = []

    def cost():
        return sum(F + r * (max(iv[i][1] for i in g) - min(iv[i][0] for i in g)) for g in groups)

    def rec(i):
        if i == n:
            best[0] = min(best[0], cost())
            return
        for g in groups:
            if not any(u in adj[i] for u in g):
                g.append(i)
                rec(i + 1)
                g.pop()
        groups.append([i])
        rec(i + 1)
        groups.pop()

    rec(0)
    return best[0]


def max_overlap(iv):
    ev = sorted([(s, 1) for s, _ in iv] + [(e, -1) for _, e in iv])
    cur = best = 0
    for _, d in ev:
        cur += d
        best = max(best, cur)
    return best


def rand_iv(rng, n, lo=0, hi=24, dmin=1, dmax=6, step=0.5):
    out = []
    for _ in range(n):
        s = round(rng.uniform(lo, hi - dmin) / step) * step
        d = max(dmin, round(rng.uniform(dmin, dmax) / step) * step)
        out.append((s, s + d))
    return out


def m1(group, num, title, desc, iv, F, r, pairs=(), opt=None, src="vét cạn", **extra):
    pairs = [list(p) for p in pairs]
    if opt is None and group != "L" and len(iv) <= 10:
        opt, src = brute1(iv, pairs, F, r), "vét cạn"
    inp = dict(ships=ships1(iv), pairs=pairs, F=F, r=r)
    ex = dict(extra)
    if opt is not None:
        ex.update(opt=opt, opt_source=src)
    add("m1", group, num, title, desc, inp, **ex)


def gen_m1():
    rng = random.Random(112)
    base = json.load(open(ROOT / "testcases" / "co-ban.json")) if (ROOT / "testcases" / "co-ban.json").exists() else None
    # --- thường
    if base:
        iv = [(x["s"], x["e"]) for x in base["ships"]]
        m1("T", 1, "Mẫu cơ bản (7 tàu, 1 cặp ràng buộc)", "Ví dụ chính dùng trong report; có một cặp tàu bị cấm chung hợp đồng.",
           iv, base["F"], base["r"], base["pairs"])
    b2 = json.load(open(ROOT / "testcases" / "bon-ket-qua-khac-nhau.json")) if (ROOT / "testcases" / "bon-ket-qua-khac-nhau.json").exists() else None
    if b2:
        iv = [(x["s"], x["e"]) for x in b2["ships"]]
        m1("T", 2, "Bốn thuật toán cho bốn kết quả khác nhau", "Bộ dữ liệu làm lộ rõ khác biệt giữa tham lam, tham lam theo chi phí, DSATUR và quay lui.",
           iv, b2["F"], b2["r"], b2["pairs"])
    m1("T", 3, "6 tàu ngẫu nhiên, không ràng buộc thêm", "Dữ liệu ngẫu nhiên (seed 112), F=300, r=20.", rand_iv(rng, 6), 300, 20)
    m1("T", 4, "8 tàu ngẫu nhiên, 3 cặp ràng buộc", "Thêm 3 cặp bị cấm chung hợp đồng ngoài ràng buộc thời gian.",
       rand_iv(rng, 8), 200, 15, [(0, 3), (2, 5), (4, 7)])
    m1("T", 5, "10 tàu ngẫu nhiên", "Cỡ vừa đủ để vét cạn kiểm chứng đáp án.", rand_iv(rng, 10, dmax=8), 100, 10, [(1, 6)])
    # --- nhỏ
    m1("N", 1, "2 tàu rời nhau", "Hai tàu không chồng giờ, F lớn nên gộp một hợp đồng.", [(0, 2), (5, 7)], 100, 5)
    m1("N", 2, "3 tàu chồng giờ hoàn toàn", "Cả ba cùng cập lúc: cần 3 hợp đồng.", [(1, 5), (2, 6), (3, 7)], 50, 10)
    m1("N", 3, "4 tàu nối chuỗi", "Tàu i chồng tàu i+1: hai hợp đồng luân phiên là đủ.", [(0, 4), (3, 7), (6, 10), (9, 13)], 80, 8)
    m1("N", 4, "5 tàu hỗn hợp", "Có cả cặp chồng giờ lẫn cặp rời nhau.", [(0, 3), (2, 6), (7, 9), (8, 12), (13, 15)], 60, 12)
    # --- biên
    m1("B", 1, "Chỉ 1 tàu", "Cỡ nhỏ nhất cho phép: một hợp đồng.", [(8, 12)], 100, 10)
    m1("B", 2, "Hai tàu chạm đầu mút (rời = đến)", "Tàu 1 rời đúng lúc tàu 2 đến: không tính là chồng, được chung hợp đồng.", [(8, 12), (12, 16)], 100, 10)
    m1("B", 3, "Hai tàu chồng sát 0,5 giờ", "Chồng giờ rất ít vẫn bắt buộc 2 hợp đồng.", [(8, 12), (11.5, 16)], 100, 10)
    iv = rand_iv(rng, 12)
    m1("B", 4, "F = 0", "Không phí cố định: gộp không lợi, đáp án = r × tổng thời gian cập (mỗi tàu một hợp đồng cũng tối ưu).",
       iv, 0, 7, opt=7 * sum(e - s for s, e in iv), src="công thức")
    iv = rand_iv(rng, 15)
    m1("B", 5, "r = 0", "Chỉ tính phí cố định: đáp án = F × số tàu chồng nhau nhiều nhất (đồ thị khoảng: χ = ω).",
       iv, 40, 0, opt=40 * max_overlap(iv), src="công thức")
    m1("B", 6, "F = 0 và r = 0", "Mọi phương án đều chi phí 0.", rand_iv(rng, 6), 0, 0, opt=0, src="công thức")
    m1("B", 7, "Tàu qua đêm (giờ > 24)", "Giờ rời 30 nghĩa là 06:00 hôm sau; giao diện hiển thị +1d.", [(22, 30), (23, 27), (28, 33), (0, 5)], 100, 10)
    m1("B", 8, "Giờ lẻ 0,25", "Kiểm tra sai số dấu phẩy động khi cộng/so sánh giờ lẻ.", [(8.25, 10.75), (10.75, 12.25), (9.5, 11.5), (12.25, 14.75)], 75, 12.5)
    m1("B", 9, "F rất lớn so với r", "F = 10000, r = 1: gom tối đa, mọi hợp đồng thừa đều đắt.", rand_iv(rng, 9), 10000, 1)
    # --- đặc biệt
    m1("D", 1, "10 tàu trùng giờ hoàn toàn", "Đồ thị đầy đủ K10: bắt buộc 10 hợp đồng.", [(8, 12)] * 10, 100, 10)
    m1("D", 2, "10 tàu nối đuôi không chồng", "Không có xung đột: gom về 1 hợp đồng khi F lớn.", [(2 * i, 2 * i + 2) for i in range(10)], 500, 3)
    m1("D", 3, "Chu trình lẻ C5 do ràng buộc thêm", "5 tàu rời nhau nhưng 5 cặp cấm tạo chu trình lẻ: cần 3 hợp đồng. Đồ thị không còn là đồ thị khoảng.",
       [(3 * i, 3 * i + 2) for i in range(5)], 100, 5, [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0)])
    m1("D", 4, "Cặp ràng buộc lặp, đảo chiều và tự thân", "Cặp [0,1], [1,0] trùng nhau, [2,2] là cặp tự thân: phải được bỏ qua mà không lỗi.",
       [(0, 2), (3, 5), (6, 8), (9, 11)], 100, 5, [(0, 1), (1, 0), (2, 2), (0, 1)])
    m1("D", 5, "Mọi cặp bị cấm (K6 do ràng buộc)", "6 tàu rời nhau nhưng 15 cặp đều bị cấm: 6 hợp đồng.", [(3 * i, 3 * i + 2) for i in range(6)], 100, 5,
       list(itertools.combinations(range(6), 2)))
    m1("D", 6, "Cùng giờ đến, khác giờ rời", "Nhiều tàu trùng giờ đến: kiểm tra thứ tự phá hoà.", [(8, 9), (8, 12), (8, 10), (8, 11), (12, 14)], 100, 10)
    # --- lớn
    m1("L", 1, "30 tàu ngẫu nhiên", "Cỡ vừa, vẫn thấy rõ khác biệt thuật toán; quay lui có thể chạm giới hạn thời gian.", rand_iv(rng, 30, hi=48, dmax=8), 100, 10, [(0, 9), (4, 17), (8, 21)])
    iv = rand_iv(rng, 100, hi=72, dmax=10)
    m1("L", 2, "100 tàu, r = 0", "Đáp án đã biết theo công thức F × ω.", iv, 60, 0, opt=60 * max_overlap(iv), src="công thức")
    iv = rand_iv(rng, 100, hi=72, dmax=10)
    m1("L", 3, "100 tàu, F = 0", "Đáp án đã biết = r × tổng thời gian cập.", iv, 0, 4, opt=4 * sum(e - s for s, e in iv), src="công thức")
    m1("L", 4, "200 tàu (tối đa), ngẫu nhiên", "Cỡ tối đa cho phép; kiểm tra thời gian phản hồi và kích thước kết quả.", rand_iv(rng, 200, hi=96, dmax=12), 150, 12)
    iv = [(3 * i, 3 * i + 2) for i in range(200)]
    m1("L", 5, "200 tàu nối đuôi, F lớn", "Không có xung đột: 1 hợp đồng, chi phí F + r × (giờ rời cuối − giờ đến đầu).", iv, 5000, 1,
       opt=5000 + 1 * (iv[-1][1] - iv[0][0]), src="công thức")


# ───────────────────────── Module 2: phân công đội ─────────────────────────
def mk_ships2(rows):
    return [dict(name=f"T{i + 1}", s=s, e=e, need=list(nd)) for i, (s, e, nd) in enumerate(rows)]


def mk_teams2(rows):
    return [dict(name=f"Đội {j + 1}", skills=list(sk), rate=r) for j, (sk, r) in enumerate(rows)]


def brute2(ships, teams, pairs):
    """Vét cạn: gán từng tàu cho một đội đủ kỹ năng, không trùng giờ/cặp cấm. None nếu vô nghiệm."""
    n, m = len(ships), len(teams)
    ok = [[set(sh["need"]) <= set(t["skills"]) for t in teams] for sh in ships]
    ex = {frozenset(p) for p in pairs if p[0] != p[1]}

    def conf(a, b):
        A, B = ships[a], ships[b]
        return (A["s"] < B["e"] and B["s"] < A["e"]) or frozenset((a, b)) in ex

    best = [None]
    asg = [-1] * n

    def rec(i, cost):
        if best[0] is not None and cost >= best[0]:
            return
        if i == n:
            best[0] = cost
            return
        for j in range(m):
            if ok[i][j] and not any(asg[k] == j and conf(i, k) for k in range(i)):
                asg[i] = j
                rec(i + 1, cost + teams[j]["rate"] * (ships[i]["e"] - ships[i]["s"]))
                asg[i] = -1

    rec(0, 0)
    return best[0]


def m2(group, num, title, desc, srows, trows, pairs=(), opt="auto", src="vét cạn", **extra):
    ships, teams, pairs = mk_ships2(srows), mk_teams2(trows), [list(p) for p in pairs]
    ex = dict(extra)
    if opt == "auto":
        opt = brute2(ships, teams, pairs) if len(ships) <= 8 and len(teams) <= 5 else None
    if opt is not None or "feasible" in ex:
        if opt is None and ex.get("feasible") is False:
            ex["opt"] = None
        elif opt is not None:
            ex.update(opt=opt, opt_source=src, feasible=True)
    if opt is None and "feasible" not in ex and len(ships) <= 8 and len(teams) <= 5:
        ex["feasible"] = False
    add("m2", group, num, title, desc, dict(ships=ships, teams=teams, pairs=pairs), **ex)


B, L = ["boc"], ["boc", "lanh"]


def mk_teams_rows(m):
    return [(L if j % 2 == 0 else B, 100 + 10 * j) for j in range(m)]


def gen_m2():
    rng = random.Random(212)
    teams4 = [(B, 100), (B, 90), (L, 130), (B, 160)]
    sample = [(6, 10, B), (8, 14, L), (11, 15, B), (13, 18, B), (15, 19, L), (16, 22, B)]
    m2("T", 1, "Mẫu chính (6 tàu, 4 đội)", "Ví dụ dùng trong report: tham lam và quay lui cùng được 3060, cao hơn cận dưới 3010 (cận dưới không đạt được vì các đội rẻ bị trùng giờ).", sample, teams4)
    m2("T", 2, "Có cặp ràng buộc thêm", "Hai tàu bị cấm chung đội dù không trùng giờ.", sample, teams4, [(0, 2), (3, 5)])
    rows = [(round(rng.uniform(0, 20)), 0, rng.choice([B, L])) for _ in range(7)]
    rows = [(s, s + rng.choice([2, 3, 4, 5]), nd) for s, _, nd in rows]
    m2("T", 3, "7 tàu ngẫu nhiên, 4 đội", "Dữ liệu ngẫu nhiên (seed 212).", rows, teams4)
    rows = [(s, s + rng.choice([2, 3, 4]), rng.choice([B, L])) for s in (rng.randint(0, 24) for _ in range(8))]
    m2("T", 4, "8 tàu ngẫu nhiên, 5 đội", "Cỡ lớn nhất còn vét cạn kiểm chứng được.", rows, teams4 + [(L, 120)])
    # nhỏ
    m2("N", 1, "1 tàu, 1 đội", "Cỡ nhỏ nhất.", [(8, 12, B)], [(B, 100)])
    m2("N", 2, "2 tàu trùng giờ, 2 đội", "Phải dùng hai đội khác nhau.", [(8, 12, B), (9, 13, B)], [(B, 100), (B, 120)])
    m2("N", 3, "3 tàu rời nhau, 1 đội", "Một đội đảm nhận tất cả, chi phí = đơn giá × tổng giờ.", [(0, 2, B), (3, 5, B), (6, 9, B)], [(B, 50)])
    # biên
    m2("B", 1, "Tàu nối đuôi (rời = đến)", "Không tính là trùng giờ: cùng một đội nhận được cả hai.", [(8, 12, B), (12, 16, B)], [(B, 100), (B, 300)])
    m2("B", 2, "Chồng sát 0,5 giờ", "Trùng giờ rất ít vẫn phải khác đội.", [(8, 12, B), (11.5, 16, B)], [(B, 100), (B, 300)])
    m2("B", 3, "Đơn giá bằng 0", "Một đội miễn phí: chi phí tối ưu bằng 0 nếu một mình đảm nhận được.", [(0, 2, B), (3, 5, B)], [(B, 0), (B, 10)])
    m2("B", 4, "Các đội cùng đơn giá", "Nhiều nghiệm tối ưu, thuật toán phải xử lý hoà.", [(0, 4, B), (1, 5, B), (2, 6, B)], [(B, 100)] * 3)
    m2("B", 5, "Số đội đúng bằng số tàu chồng nhau", "Mọi tàu trùng giờ và vừa đủ đội: vô nghiệm nếu thiếu đúng 1 đội.", [(0, 4, B)] * 3, [(B, 100)] * 3)
    # đặc biệt
    m2("D", 1, "Vô nghiệm: thiếu kỹ năng", "Tàu cần kỹ năng 'lanh' nhưng không đội nào có.", [(0, 4, L), (5, 8, B)], [(B, 100), (B, 80)], feasible=False)
    m2("D", 2, "Vô nghiệm: thiếu đội", "3 tàu trùng giờ nhưng chỉ có 2 đội.", [(0, 4, B)] * 3, [(B, 100), (B, 80)], feasible=False)
    m2("D", 3, "Đội rẻ nhất bị tranh nhiều", "Đội rẻ nhất chỉ nhận được một tàu trong khoảng trùng giờ; các tàu còn lại phải sang đội đắt hơn.",
       [(0, 6, B), (1, 7, B), (2, 8, B), (10, 12, B)], [(B, 50), (B, 80), (L, 200)])
    m2("D", 4, "Tham lam theo giờ đến bị trượt nghiệm", "Tàu đến sớm chiếm đội duy nhất có 'lanh', tàu đến sau cần đúng đội đó: chiến lược 'khó trước' mới có nghiệm.",
       [(0, 4, B), (2, 6, L)], [(L, 100), (B, 150)])
    m2("D", 5, "Đội 'lạnh' rẻ hơn đội thường", "Kỹ năng nhiều hơn không có nghĩa là đắt hơn; tham lam theo giờ đến chiếm sai đội nên không gán đủ tàu, quay lui vẫn tìm ra nghiệm.", [(0, 3, B), (1, 4, L), (5, 8, L)], [(B, 100), (L, 60)])
    # lớn
    def rand2(n, m, span, tag):
        rows = []
        for _ in range(n):
            s = rng.randint(0, span)
            rows.append((s, s + rng.choice([2, 3, 4, 6]), rng.choice([B, B, L])))
        trows = [(L if j % 2 == 0 else B, rng.choice([80, 90, 100, 120, 150])) for j in range(m)]
        return rows, trows

    rows, trows = rand2(20, 6, 60, "")
    m2("L", 1, "20 tàu, 6 đội", "Cỡ vừa: quay lui có thể hết thời gian.", rows, trows, opt=None)
    # tuần tự: đáp án = cận dưới (mỗi tàu một đội rẻ nhất đủ kỹ năng)
    rows = [(4 * i, 4 * i + 3, rng.choice([B, L])) for i in range(60)]
    ships, teams = mk_ships2(rows), mk_teams2(teams4)
    lbv = sum(min(t["rate"] * (sh["e"] - sh["s"]) for t in teams if set(sh["need"]) <= set(t["skills"])) for sh in ships)
    m2("L", 2, "60 tàu nối đuôi (tối đa)", "Không tàu nào trùng giờ nên đáp án = tổng chi phí rẻ nhất từng tàu = cận dưới.", rows, teams4, opt=lbv, src="công thức")
    rows, trows = rand2(40, 12, 90, "")
    m2("L", 3, "40 tàu, 12 đội", "Cỡ lớn, nhiều đội: kiểm tra tốc độ và kích thước phản hồi.", rows, trows, opt=None)
    rows = [(0, 8, B)] * 7 + [(10 + 3 * i, 12 + 3 * i, B) for i in range(25)]
    m2("L", 4, "32 tàu, vô nghiệm do 7 tàu cùng cập, chỉ 6 đội", "Điều kiện cần (khớp hai phía) phát hiện vô nghiệm ngay mà không phải duyệt 6^32 cách.",
       rows, mk_teams_rows(6), feasible=False)


# ───────────────────────── Module 3: cái túi 0/1 ─────────────────────────
def opt_knap(items, W):
    """DP một chiều viết riêng (độc lập với backend/knapsack.py)."""
    best = [0.0] * (W + 1)
    for it in items:
        for w in range(W, it["w"] - 1, -1):
            best[w] = max(best[w], best[w - it["w"]] + it["v"])
    return best[W]


def brute_knap(items, W):
    n, best = len(items), 0.0
    for mask in range(1 << n):
        sw = sv = 0
        for i in range(n):
            if mask >> i & 1:
                sw += items[i]["w"]
                sv += items[i]["v"]
        if sw <= W:
            best = max(best, sv)
    return best


def m3(group, num, title, desc, rows, W, opt=None, src=None):
    items = [dict(name=f"Y{i + 1}", w=w, v=v) for i, (w, v) in enumerate(rows)]
    if opt is None:
        if len(items) <= 16:
            opt, src = brute_knap(items, W), "vét cạn"
            assert opt == opt_knap(items, W), "DP độc lập lệch vét cạn"
        else:
            opt, src = opt_knap(items, W), "DP độc lập"
    add("m3", group, num, title, desc, dict(items=items, W=W), opt=opt, opt_source=src)


def gen_m3():
    rng = random.Random(312)
    m3("T", 1, "Mẫu chính (4 yêu cầu, quỹ 8 giờ)", "Ví dụ dùng trong report: tham lam theo giá trị/giờ được 100, tối ưu 110.",
       [(3, 40), (4, 50), (5, 70), (2, 30)], 8)
    m3("T", 2, "Mẫu kinh điển 3 vật", "Giá trị 60/100/120, khối lượng 10/20/30, quỹ 50: đáp án 220.", [(10, 60), (20, 100), (30, 120)], 50)
    m3("T", 3, "10 yêu cầu ngẫu nhiên", "Dữ liệu ngẫu nhiên (seed 312).", [(rng.randint(1, 12), rng.randint(5, 90)) for _ in range(10)], 30)
    m3("T", 4, "14 yêu cầu ngẫu nhiên", "Cỡ lớn nhất còn vét cạn kiểm chứng.", [(rng.randint(1, 15), rng.randint(5, 120)) for _ in range(14)], 40)
    m3("N", 1, "1 yêu cầu vừa quỹ", "Lấy được.", [(5, 40)], 8)
    m3("N", 2, "2 yêu cầu, chỉ lấy được một", "Tổng trọng lượng vượt quỹ.", [(6, 30), (6, 50)], 8)
    m3("N", 3, "3 yêu cầu lấy hết", "Tổng trọng lượng ≤ quỹ.", [(2, 10), (3, 20), (1, 5)], 10)
    m3("B", 1, "Quỹ = 0", "Không lấy được gì (mọi w ≥ 1): đáp án 0.", [(1, 10), (2, 20)], 0)
    m3("B", 2, "Yêu cầu có w đúng bằng quỹ", "Biên w = W: vẫn lấy được.", [(10, 100), (4, 30), (6, 50)], 10)
    m3("B", 3, "Mọi yêu cầu đều quá nặng", "Mọi w > W: đáp án 0, DP không có ô 'lấy' nào.", [(9, 90), (12, 100), (15, 150)], 8)
    m3("B", 4, "Giá trị bằng 0", "Yêu cầu giá trị 0 không bao giờ cần lấy; không được làm hỏng truy vết.", [(3, 0), (4, 25), (2, 0)], 6)
    m3("B", 5, "Số ô DP đúng bằng giới hạn 4000", "n = 20, W = 199: n×(W+1) = 4000, đúng mức tối đa cho phép.",
       [(rng.randint(5, 60), rng.randint(10, 200)) for _ in range(20)], 199)
    m3("D", 1, "Cùng giá trị/giờ (hoà)", "Mọi yêu cầu cùng tỉ lệ: nhiều nghiệm tối ưu.", [(2, 20), (3, 30), (5, 50), (4, 40)], 7)
    m3("D", 2, "Bẫy tham lam", "Yêu cầu tỉ lệ cao nhất chiếm quỹ làm mất cơ hội ghép hai yêu cầu cân hơn.", [(1, 10), (6, 33), (6, 33)], 12)
    m3("D", 3, "Giá trị lẻ (số thập phân)", "Giá trị có phần thập phân, so sánh dùng sai số.", [(2, 3.5), (3, 4.25), (4, 6.75), (5, 7.1)], 8)
    m3("D", 4, "Nhiều yêu cầu trùng hệt nhau", "6 yêu cầu giống nhau, quỹ chỉ đủ 3.", [(4, 10)] * 6, 12)
    m3("L", 1, "20 yêu cầu, quỹ 120", "Cỡ vừa, đáp án từ DP độc lập.", [(rng.randint(3, 40), rng.randint(10, 250)) for _ in range(20)], 120)
    m3("L", 2, "25 yêu cầu (tối đa), quỹ 150", "Cỡ tối đa cho phép: quay lui hưởng lợi từ cận trên.", [(rng.randint(3, 45), rng.randint(10, 300)) for _ in range(25)], 150)
    m3("L", 3, "25 yêu cầu tương quan mạnh (khó cho cận trên)", "Giá trị ≈ trọng lượng + nhiễu nhỏ: cận trên yếu, quay lui phải duyệt nhiều.",
       [(w, w * 10 + rng.randint(0, 3)) for w in (rng.randint(5, 40) for _ in range(25))], 150)


# ───────────────────────── Module 4: xếp container (bin packing) ─────────────────────────
def brute4(ws, C):
    """Vét cạn độc lập: số thùng ít nhất (n ≤ 10)."""
    ws = sorted(ws, reverse=True)
    best = [len(ws)]
    loads: list[float] = []

    def rec(i):
        if len(loads) >= best[0]:
            return
        if i == len(ws):
            best[0] = len(loads)
            return
        seen = set()
        for b in range(len(loads)):
            if loads[b] + ws[i] <= C + 1e-9 and round(loads[b], 9) not in seen:
                seen.add(round(loads[b], 9))
                loads[b] += ws[i]
                rec(i + 1)
                loads[b] -= ws[i]
        loads.append(ws[i])
        rec(i + 1)
        loads.pop()

    rec(0)
    return best[0]


def m4(group, num, title, desc, ws, C, opt=None, src=None, shuffle=None):
    ws = list(ws)
    if opt is None and len(ws) <= 10:
        opt, src = brute4(ws, C), "vét cạn"
    inp = dict(items=[dict(name=f"C{i + 1}", w=w) for i, w in enumerate(ws)], C=C)
    ex = {}
    if opt is not None:
        ex.update(opt=opt, opt_source=src)
    add("m4", group, num, title, desc, inp, **ex)


def perfect(rng, bins, C, parts):
    """Dựng sẵn: chia mỗi thùng đúng tải trọng C thành `parts` mảnh -> số thùng tối ưu = bins."""
    ws = []
    for _ in range(bins):
        cuts = sorted(rng.sample(range(1, C), parts - 1))
        ws += [b - a for a, b in zip([0] + cuts, cuts + [C])]
    rng.shuffle(ws)
    return ws


def gen_m4():
    rng = random.Random(412)
    m4("T", 1, "Mẫu chính (8 lô, tải 30)", "Ví dụ dùng trong report: cận dưới 3 thùng, FFD đạt 3.", [14, 12, 10, 9, 8, 7, 6, 4], 30)
    m4("T", 2, "8 lô ngẫu nhiên", "Dữ liệu ngẫu nhiên (seed 412).", [rng.randint(3, 20) for _ in range(8)], 25)
    m4("T", 3, "10 lô ngẫu nhiên", "Cỡ lớn nhất còn vét cạn kiểm chứng.", [rng.randint(4, 24) for _ in range(10)], 30)
    m4("N", 1, "1 lô", "Cần đúng 1 thùng.", [7], 10)
    m4("N", 2, "2 lô vừa một thùng", "Tổng ≤ tải trọng.", [4, 5], 10)
    m4("N", 3, "3 lô, mỗi lô hơn nửa thùng", "Không ghép được cặp nào: 3 thùng.", [6, 7, 8], 10)
    m4("B", 1, "Mọi lô đúng bằng tải trọng", "w = C: mỗi lô một thùng.", [10, 10, 10, 10], 10)
    m4("B", 2, "Hai lô cộng đúng bằng tải trọng", "Ghép được đúng khít, kiểm tra dấu ≤.", [3, 7, 4, 6, 5, 5], 10)
    m4("B", 3, "Mọi lô rất nhỏ", "Tất cả vào 1 thùng.", [1] * 9, 10)
    m4("B", 4, "Số thập phân gây sai số (0,1 + 0,2 + 0,3)", "0,1 + 0,2 + 0,3 = 0,6000000000000001 trong dấu phẩy động: phải vẫn vừa thùng 0,6.", [0.1, 0.2, 0.3], 0.6)
    m4("B", 5, "Khối lượng bằng 0,01 (rất nhỏ)", "Kiểm tra lô cực nhẹ: gộp hết một thùng.", [0.01] * 8, 1)
    m4("D", 1, "Bẫy First-Fit", "Thứ tự nhập kém làm First-Fit dùng nhiều thùng hơn FFD/BFD.", [3, 3, 4, 4, 6, 6, 7, 7], 10)
    m4("D", 2, "Lô nhỏ xen kẽ, tổng khít tải trọng", "Nhiều lô nhỏ xen kẽ: kiểm tra các heuristic có bám được tối ưu khi tổng khít tải trọng.", [5, 5, 4, 4, 3, 3, 3, 3], 12)
    m4("D", 3, "Nhiều lô cùng khối lượng", "Kiểm tra bỏ qua đối xứng khi quay lui.", [5] * 9, 12)
    m4("D", 4, "Hai nhóm kích thước", "Lô lớn và lô nhỏ xen kẽ: ghép lớn + nhỏ khít thùng.", [7, 3, 7, 3, 7, 3, 7, 3], 10)
    ws = perfect(rng, 6, 30, 3)
    m4("L", 1, "18 lô dựng sẵn (tối ưu = 6)", "Chia 6 thùng đúng tải trọng 30 thành 3 mảnh rồi xáo trộn: tối ưu biết trước là 6 = cận dưới.", ws, 30, opt=6, src="dựng sẵn")
    ws = perfect(rng, 15, 100, 4)
    m4("L", 2, "60 lô dựng sẵn (tối ưu = 15)", "Cỡ tối đa: 15 thùng × 4 mảnh. Heuristic có thể dư 1–2 thùng; quay lui chạm giới hạn thời gian.", ws, 100, opt=15, src="dựng sẵn")
    m4("L", 3, "60 lô ngẫu nhiên", "Cỡ tối đa, khối lượng ngẫu nhiên: không có đáp án biết trước, chỉ kiểm hợp lệ và so sánh với cận dưới.",
       [rng.randint(5, 60) for _ in range(60)], 100)
    m4("L", 4, "40 lô, mỗi lô > C/3", "Mỗi thùng chứa tối đa 2 lô: bài toán gần với ghép cặp.", [rng.randint(35, 65) for _ in range(40)], 100)


# ───────────────────────── ghi file ─────────────────────────
def main():
    gen_m1()
    gen_m2()
    gen_m3()
    gen_m4()
    for sub in ("m1-thue-ben", "m2-phan-cong", "m3-quy-gio-cong", "m4-xep-container"):
        shutil.rmtree(OUT / sub, ignore_errors=True)
    dirs = {"m1": "m1-thue-ben", "m2": "m2-phan-cong", "m3": "m3-quy-gio-cong", "m4": "m4-xep-container"}
    for c in CASES:
        c["group"] = GROUPS[c["group"]]
        d = OUT / dirs[c["module"]]
        d.mkdir(parents=True, exist_ok=True)
        with open(d / f"{c['id']}.json", "w", encoding="utf-8") as f:
            json.dump(c, f, ensure_ascii=False, indent=1)
    from collections import Counter
    cnt = Counter((c["module"], c["group"]) for c in CASES)
    print(len(CASES), "testcase")
    for k in sorted(cnt):
        print(" ", k, cnt[k])


if __name__ == "__main__":
    main()
