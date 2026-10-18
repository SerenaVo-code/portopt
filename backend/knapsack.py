"""Module 3: chọn yêu cầu dịch vụ thêm trong quỹ giờ công tăng ca có hạn (bài toán cái túi 0/1).

Yêu cầu i tốn w[i] giờ (số nguyên), mang lại giá trị v[i]. Quỹ W giờ. Chọn tập có tổng giá trị lớn nhất.

Nguồn (đánh số theo mục "Nguồn tham khảo" trong README):
  - Tham lam theo giá trị/giờ (đúng với cái túi phân số, không đúng với 0/1): bài giảng CS112 [1], CLRS §16.2 [4].
  - Quy hoạch động dp[i][w] và truy vết: bài giảng CS112 [1], Kleinberg–Tardos §6.4 [3].
  - Quay lui + cận trên bằng nới lỏng phân số: Dantzig 1957 [5].
  - Mô hình "quỹ giờ công tăng ca" và các thông điệp từng bước: tự thiết kế.
"""
from __future__ import annotations

import time

from solver import EPS, STEP_CAP, fm

BT_MAX_NODES = 400_000
BT_DEADLINE_S = 1.5


def _ratio(it):
    return it["v"] / it["w"]


def run_greedy(items, W):
    order = sorted(range(len(items)), key=lambda i: (-_ratio(items[i]), i))
    left, total = W, 0.0
    take = [False] * len(items)
    steps = [dict(kind="info", i=-1, line=1, left=left, total=0.0, take=take[:],
                  msg="Sắp yêu cầu theo giá trị/giờ giảm dần: " + ", ".join(items[i]["name"] for i in order) + ".")]
    for p, i in enumerate(order):
        it = items[i]
        if it["w"] <= left:
            take[i] = True
            left -= it["w"]
            total += it["v"]
            steps.append(dict(kind="take", i=i, pos=p, line=4, left=left, total=total, take=take[:],
                              msg=f"{it['name']} ({it['w']} giờ, giá trị {fm(it['v'])}, {_ratio(it):.1f}/giờ): còn đủ quỹ, lấy. Quỹ còn {left} giờ."))
        else:
            steps.append(dict(kind="skip", i=i, pos=p, line=5, left=left, total=total, take=take[:],
                              msg=f"{it['name']} cần {it['w']} giờ nhưng quỹ chỉ còn {left} giờ: bỏ qua."))
    steps.append(dict(kind="done", i=-1, line=0, left=left, total=total, take=take[:],
                      msg=f"Xong. Tổng giá trị {fm(total)}, dùng {W - left}/{W} giờ."))
    return dict(steps=steps, take=take, value=total, hours=W - left, optimal=None, ms=0.0)


def run_dp(items, W):
    n = len(items)
    dp = [[0.0] * (W + 1) for _ in range(n + 1)]
    steps = [dict(kind="info", i=-1, w=-1, line=1, msg="dp[i][w] = giá trị lớn nhất khi xét i yêu cầu đầu với quỹ w giờ. Hàng 0 toàn 0.")]
    for i in range(1, n + 1):
        it = items[i - 1]
        for w in range(W + 1):
            skip = dp[i - 1][w]
            tk = None
            if it["w"] <= w:
                tk = it["v"] + dp[i - 1][w - it["w"]]
            dp[i][w] = max(skip, tk) if tk is not None else skip
            took = tk is not None and tk > skip + EPS
            if tk is None:
                msg = f"dp[{i}][{w}]: {it['name']} cần {it['w']} giờ > {w}, không lấy được. Giữ dp[{i - 1}][{w}] = {fm(skip)}."
            else:
                msg = (f"dp[{i}][{w}] = max(không lấy {fm(skip)}, lấy {fm(it['v'])} + dp[{i - 1}][{w - it['w']}] = {fm(tk)}) = {fm(dp[i][w])}"
                       + (" → lấy." if took else " → không lấy."))
            steps.append(dict(kind="cell", i=i, w=w, line=6 if tk is not None else 4, skip=skip, takev=tk,
                              took=took, val=dp[i][w], msg=msg))
    # truy vết
    take = [False] * n
    w = W
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            take[i - 1] = True
            steps.append(dict(kind="trace", i=i, w=w, line=7, took=True,
                              msg=f"Truy vết dp[{i}][{w}] = {fm(dp[i][w])} ≠ dp[{i - 1}][{w}] = {fm(dp[i - 1][w])}: đã lấy {items[i - 1]['name']}, quỹ còn {w - items[i - 1]['w']}."))
            w -= items[i - 1]["w"]
        else:
            steps.append(dict(kind="trace", i=i, w=w, line=7, took=False,
                              msg=f"Truy vết dp[{i}][{w}] = dp[{i - 1}][{w}] = {fm(dp[i][w])}: không lấy {items[i - 1]['name']}."))
    value = dp[n][W]
    hours = sum(it["w"] for it, t in zip(items, take) if t)
    steps.append(dict(kind="done", i=-1, w=-1, line=0, msg=f"Xong. Tổng giá trị {fm(value)}, dùng {hours}/{W} giờ."))
    return dict(steps=steps, take=take, value=value, hours=hours, optimal=True, ms=0.0, dp=dp)


def run_bt(items, W):
    n = len(items)
    order = sorted(range(n), key=lambda i: (-_ratio(items[i]), i))
    cap = max(300, min(STEP_CAP, 300_000 // max(n, 1)))
    st = dict(best=-1.0, best_take=[False] * n, nodes=0, stop=False, timed_out=False)
    take = [False] * n
    steps: list[dict] = []
    t0 = time.perf_counter()

    def upper(p, left, val):
        b, lf = val, left
        for q in range(p, n):
            it = items[order[q]]
            if it["w"] <= lf:
                lf -= it["w"]
                b += it["v"]
            else:
                b += it["v"] * lf / it["w"]
                break
        return b

    def push(**kw):
        if len(steps) < cap:
            kw["take"] = take[:]
            kw["best"] = None if st["best"] < 0 else st["best"]
            steps.append(kw)

    push(kind="info", i=-1, line=1, left=W, total=0.0, depth=0, bound=upper(0, W, 0.0),
         msg="Quay lui: với mỗi yêu cầu (xét theo giá trị/giờ giảm dần) thử lấy rồi thử bỏ. "
             "Cận trên = giá trị hiện có + phần tốt nhất có thể thêm nếu được cắt nhỏ yêu cầu; bỏ nhánh khi cận trên không vượt phương án tốt nhất hiện có.")

    def rec(p, left, val):
        if st["stop"]:
            return
        st["nodes"] += 1
        if st["nodes"] > BT_MAX_NODES or time.perf_counter() - t0 > BT_DEADLINE_S:
            st["timed_out"] = st["stop"] = True
            return
        if val > st["best"] + EPS:
            st["best"], st["best_take"] = val, take[:]
            push(kind="found", i=-1, line=2, left=left, total=val, depth=p, bound=val,
                 msg=f"Phương án tốt nhất hiện có: giá trị {fm(val)}.")
        if p == n:
            return
        i = order[p]
        it = items[i]
        ub = upper(p, left, val)
        if ub <= st["best"] + EPS:
            push(kind="prune", i=i, pos=p, line=3, left=left, total=val, depth=p, bound=ub,
                 msg=f"Bỏ nhánh tại {it['name']}: giá trị {fm(val)}, cận trên {fm(ub)} không vượt phương án tốt nhất hiện có ({fm(st['best'])}).")
            return
        if it["w"] <= left:
            take[i] = True
            push(kind="take", i=i, pos=p, line=4, left=left - it["w"], total=val + it["v"], depth=p + 1, bound=ub,
                 msg=f"Thử lấy {it['name']} ({it['w']} giờ, +{fm(it['v'])}). Quỹ còn {left - it['w']}, cận trên {fm(ub)}.")
            rec(p + 1, left - it["w"], val + it["v"])
            take[i] = False
            if st["stop"]:
                return
        push(kind="skip", i=i, pos=p, line=5, left=left, total=val, depth=p + 1, bound=ub,
             msg=f"Thử bỏ {it['name']}. Quỹ còn {left}, giá trị {fm(val)}.")
        rec(p + 1, left, val)

    rec(0, W, 0.0)
    bt = st["best_take"]
    value = sum(it["v"] for it, t in zip(items, bt) if t)
    hours = sum(it["w"] for it, t in zip(items, bt) if t)
    take[:] = bt
    done = dict(kind="done", i=-1, line=0, left=W - hours, total=value, depth=0, bound=None, take=bt[:],
                best=value, msg=f"Xong. Tổng giá trị {fm(value)}, dùng {hours}/{W} giờ."
                + (" (chạm giới hạn thời gian, chưa chắc tối ưu)" if st["timed_out"] else ""))
    if len(steps) < cap:
        steps.append(done)
    else:
        steps.append(done)
    return dict(steps=steps, take=bt, value=value, hours=hours, optimal=not st["timed_out"],
                ms=(time.perf_counter() - t0) * 1000, truncated=len(steps) > cap)


def solve_knapsack(items, W):
    res = {}
    for key, fn in (("greedy", run_greedy), ("dp", run_dp), ("bt", run_bt)):
        t0 = time.perf_counter()
        r = fn(items, W)
        r["ms"] = r["ms"] or (time.perf_counter() - t0) * 1000
        res[key] = r
    return dict(results=res, W=W, n=len(items))
