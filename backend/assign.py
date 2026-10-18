"""Module 2: phân công đội phục vụ cho từng lượt tàu (bài toán gán việc có ràng buộc).

Tàu i cần các kỹ năng need[i]. Đội j có kỹ năng skills[j] và đơn giá rate[j]/giờ.
Chi phí gán i cho j = rate[j] × (giờ rời − giờ đến). Một đội không phục vụ hai tàu trùng giờ
(hoặc cặp tàu bị ràng buộc thêm). Mục tiêu: tổng chi phí nhỏ nhất.

Nguồn (đánh số theo mục "Nguồn tham khảo" trong README):
  - Khung tham lam và khung quay lui try(i): bài giảng CS112 [1].
  - Kiểm tra vô nghiệm bằng khớp hai phía (hàm hall_violation): định lý Hall [9] và thuật toán
    đường tăng của Kuhn [10]. Phần áp dụng vào các tàu cùng cập một lúc là tự thiết kế.
  - Mô hình bài toán, cận dưới (mỗi tàu một đội rẻ nhất đủ kỹ năng) và thứ tự "tàu khó trước": tự thiết kế.
"""
from __future__ import annotations

import time

from solver import EPS, STEP_CAP, fm, ft

BT_MAX_NODES = 400_000
BT_DEADLINE_S = 1.5


class Model:
    def __init__(self, ships, teams, pairs):
        self.ships, self.teams = ships, teams
        self.n, self.m = len(ships), len(teams)
        self.dur = [x["e"] - x["s"] for x in ships]
        self.cost = [[t["rate"] * self.dur[i] for t in teams] for i in range(self.n)]
        self.ok = [[set(ships[i].get("need", [])) <= set(teams[j].get("skills", [])) for j in range(self.m)]
                   for i in range(self.n)]
        self.extra = {frozenset(p) for p in pairs if p[0] != p[1]}
        self.conf = [[False] * self.n for _ in range(self.n)]
        for i in range(self.n):
            for k in range(i + 1, self.n):
                if ships[i]["s"] < ships[k]["e"] and ships[k]["s"] < ships[i]["e"]:
                    self.conf[i][k] = self.conf[k][i] = True
                elif frozenset((i, k)) in self.extra:
                    self.conf[i][k] = self.conf[k][i] = True
        self.minc = [min((self.cost[i][j] for j in range(self.m) if self.ok[i][j]), default=None)
                     for i in range(self.n)]
        self.lb = None if any(c is None for c in self.minc) else sum(self.minc)

    def name(self, i):
        return self.ships[i]["name"]

    def tname(self, j):
        return self.teams[j]["name"]

    def reason(self, i, j, assign):
        if not self.ok[i][j]:
            return {"t": "skill"}
        for k in range(self.n):
            if k != i and assign[k] == j and self.conf[i][k]:
                t = "time" if (self.ships[i]["s"] < self.ships[k]["e"] and self.ships[k]["s"] < self.ships[i]["e"]) else "extra"
                return {"t": t, "ship": k}
        return None

    def cands(self, i, assign, chosen=-1, pruned=(), tried=()):
        out = []
        for j in range(self.m):
            rs = self.reason(i, j, assign)
            c = {"team": j, "cost": self.cost[i][j]}
            if rs:
                c.update(status="blocked", reason=rs)
            elif j == chosen:
                c["status"] = "chosen"
            elif j in pruned:
                c["status"] = "pruned"
            elif j in tried:
                c["status"] = "tried"
            else:
                c["status"] = "ok"
            out.append(c)
        return out

    def total(self, assign):
        return sum(self.cost[i][j] for i, j in enumerate(assign) if j >= 0)

    def why_blocked(self, rs):
        if rs["t"] == "skill":
            return "thiếu kỹ năng"
        return f"trùng giờ với {self.name(rs['ship'])}" if rs["t"] == "time" else f"ràng buộc với {self.name(rs['ship'])}"


def hall_violation(M):
    """Điều kiện cần: các tàu đang cập cùng một thời điểm phải giao được cho các đội KHÁC NHAU (khớp hai phía).
    Trả về (giờ, danh sách tàu đang cập) tại thời điểm đầu tiên không khớp được, hoặc None."""
    for i in sorted(range(M.n), key=lambda q: (M.ships[q]["s"], q)):
        t = M.ships[i]["s"]
        act = [k for k in range(M.n) if M.ships[k]["s"] <= t < M.ships[k]["e"]]
        match: dict[int, int] = {}

        def aug(k, seen):
            for j in range(M.m):
                if M.ok[k][j] and j not in seen:
                    seen.add(j)
                    if j not in match or aug(match[j], seen):
                        match[j] = k
                        return True
            return False

        for k in act:
            if not aug(k, set()):
                return t, act
    return None


def _result(M, steps, assign, optimal=None, exhausted=False, ms=0.0, truncated=False):
    feasible = all(j >= 0 for j in assign)
    cost = M.total(assign)
    return dict(steps=steps, assign=assign, cost=cost, feasible=feasible,
                optimal=(feasible and M.lb is not None and cost <= M.lb + EPS) if optimal is None else optimal,
                exhausted=exhausted, ms=ms, truncated=truncated)


def _run_greedy(M, order, label):
    assign = [-1] * M.n
    pos_txt = ", ".join(M.name(i) for i in order)
    steps = [dict(kind="info", i=-1, line=1, assign=assign[:], total=0.0, cands=[],
                  msg=f"{label}: thứ tự xét {pos_txt}.")]
    for p, i in enumerate(order):
        cs = M.cands(i, assign)
        free = [c for c in cs if c["status"] == "ok"]
        if not free:
            steps.append(dict(kind="fail", i=i, pos=p, line=4, assign=assign[:], total=M.total(assign), cands=cs,
                              msg=f"{M.name(i)}: không đội nào nhận được (thiếu kỹ năng hoặc trùng giờ). Bỏ qua, kết quả sẽ không đủ nghiệm."))
            continue
        pick = min(free, key=lambda c: (c["cost"], c["team"]))
        assign[i] = pick["team"]
        cs = M.cands(i, assign[:i] + [-1] + assign[i + 1:], chosen=pick["team"])
        blocked = [c for c in cs if c["status"] == "blocked"]
        bl = "; ".join(f"{M.tname(c['team'])} {M.why_blocked(c['reason'])}" for c in blocked)
        steps.append(dict(kind="assign", i=i, pos=p, line=5, assign=assign[:], total=M.total(assign), cands=cs,
                          msg=f"{M.name(i)} ({fm(M.dur[i])} giờ): "
                              + (f"loại {bl}. " if bl else "")
                              + f"Chọn {M.tname(pick['team'])}, chi phí {fm(pick['cost'])}, rẻ nhất trong các đội còn khả thi."))
    feas = all(j >= 0 for j in assign)
    steps.append(dict(kind="done", i=-1, line=0, assign=assign[:], total=M.total(assign), cands=[],
                      msg=("Xong. " if feas else "Chưa gán đủ tàu. ") + f"Tổng chi phí {fm(M.total(assign))}."
                          + (f" Cận dưới {fm(M.lb)}." if M.lb is not None else "")))
    return _result(M, steps, assign)


def run_greedy(M):
    order = sorted(range(M.n), key=lambda i: (M.ships[i]["s"], M.ships[i]["e"], i))
    return _run_greedy(M, order, "Tham lam theo giờ đến")


def run_hard(M):
    order = sorted(range(M.n), key=lambda i: (sum(M.ok[i]), M.ships[i]["s"], i))
    return _run_greedy(M, order, "Tham lam tàu khó trước (ít đội phù hợp nhất xếp trước)")


def run_bt(M):
    n = M.n
    order = sorted(range(n), key=lambda i: (M.ships[i]["s"], M.ships[i]["e"], i))
    rem = [0.0] * (n + 1)
    for p in range(n - 1, -1, -1):
        rem[p] = rem[p + 1] + (M.minc[order[p]] if M.minc[order[p]] is not None else 0.0)
    cap = max(300, min(STEP_CAP, 300_000 // max(n, 1)))
    assign = [-1] * n
    st = dict(best=float("inf"), best_assign=None, nodes=0, stop=False, timed_out=False)
    steps: list[dict] = []
    t0 = time.perf_counter()
    infeasible_ship = next((i for i in range(n) if M.minc[i] is None), None)

    def push(**kw):
        if len(steps) < cap:
            kw.setdefault("best", None if st["best"] == float("inf") else st["best"])
            kw["assign"] = assign[:]
            steps.append(kw)

    push(kind="info", i=-1, line=1, total=0.0, depth=0, cands=[], bound=M.lb,
         msg="Quay lui: lần lượt gán đội cho từng tàu theo giờ đến, thử đội rẻ nhất trước, "
             "bỏ nhánh khi chi phí tạm cộng phần còn lại tối thiểu không tốt hơn phương án tốt nhất hiện có.")
    if infeasible_ship is not None:
        push(kind="dead", i=infeasible_ship, line=4, total=0.0, depth=0, cands=[], bound=None,
             msg=f"{M.name(infeasible_ship)} không có đội nào đủ kỹ năng: bài toán vô nghiệm.")
        return _result(M, steps, assign, optimal=True, exhausted=True, ms=0.0)

    hv = hall_violation(M)
    if hv is not None:
        t, act = hv
        push(kind="dead", i=act[-1], line=4, total=0.0, depth=0, cands=[], bound=None,
             msg=f"Lúc {ft(t)} có {len(act)} tàu ({', '.join(M.name(k) for k in act)}) cùng cập nhưng không thể giao cho "
                 f"{len(act)} đội khác nhau (thiếu đội hoặc thiếu kỹ năng): bài toán vô nghiệm, không cần duyệt.")
        return _result(M, steps, assign, optimal=True, exhausted=True, ms=0.0)

    def rec(p, cost):
        if st["stop"]:
            return
        st["nodes"] += 1
        if st["nodes"] > BT_MAX_NODES or time.perf_counter() - t0 > BT_DEADLINE_S:
            st["timed_out"] = st["stop"] = True
            return
        if p == n:
            if cost < st["best"] - EPS:
                st["best"], st["best_assign"] = cost, assign[:]
                push(kind="found", i=-1, line=2, total=cost, depth=p, cands=[], bound=cost,
                     msg=f"Gán đủ {n} tàu, tổng chi phí {fm(cost)}: phương án tốt nhất hiện có.")
                if M.lb is not None and cost <= M.lb + EPS:
                    st["stop"] = True
            return
        i = order[p]
        cs0 = M.cands(i, assign)
        free = sorted((c for c in cs0 if c["status"] == "ok"), key=lambda c: (c["cost"], c["team"]))
        if not free:
            push(kind="dead", i=i, pos=p, line=4, total=cost, depth=p, cands=cs0, bound=None,
                 msg=f"{M.name(i)}: không đội nào nhận được, lùi lại.")
            return
        tried: list[int] = []
        pruned: list[int] = []
        for c in free:
            j = c["team"]
            new = cost + c["cost"]
            bound = new + rem[p + 1]
            if bound >= st["best"] - EPS:
                pruned.append(j)
                push(kind="dead", i=i, pos=p, line=5, total=new, depth=p, bound=bound,
                     cands=M.cands(i, assign, pruned=pruned, tried=tried),
                     msg=f"Bỏ nhánh: {M.name(i)} → {M.tname(j)}: {fm(new)} + phần còn lại tối thiểu {fm(rem[p + 1])} = {fm(bound)}, "
                         f"không tốt hơn phương án tốt nhất hiện có ({fm(st['best'])}).")
                continue
            assign[i] = j
            push(kind="assign", i=i, pos=p, line=6, total=new, depth=p + 1, bound=bound,
                 cands=M.cands(i, assign[:i] + [-1] + assign[i + 1:], chosen=j, pruned=pruned, tried=tried),
                 msg=f"Thử {M.name(i)} → {M.tname(j)} (+{fm(c['cost'])}). Tạm {fm(new)}, cận {fm(bound)}.")
            rec(p + 1, new)
            assign[i] = -1
            tried.append(j)
            if st["stop"]:
                return
            push(kind="back", i=i, pos=p, line=7, total=cost, depth=p, bound=None,
                 cands=M.cands(i, assign, pruned=pruned, tried=tried),
                 msg=f"Lùi về {M.name(i)}, thử đội khác.")

    rec(0, 0.0)
    best_assign = st["best_assign"] or [-1] * n
    cost = M.total(best_assign)
    exhausted = not st["timed_out"] and not (st["stop"])
    done = f"Xong. Tổng chi phí tốt nhất {fm(cost)}." if st["best_assign"] else "Không có cách gán hợp lệ."
    assign[:] = best_assign
    push(kind="done", i=-1, line=0, total=cost, depth=0, cands=[], bound=None,
         msg=done + (" (dừng sớm vì chạm cận dưới)" if st["stop"] and not st["timed_out"] else "")
         + (" (chạm giới hạn thời gian, chưa chắc tối ưu)" if st["timed_out"] else ""))
    if len(steps) >= cap and steps[-1]["kind"] != "done":
        steps.append(dict(kind="done", i=-1, line=0, assign=best_assign[:], total=cost, depth=0, cands=[], bound=None,
                          best=cost if st["best_assign"] else None,
                          msg="Đã cắt bớt bước hiển thị; " + done))
    ms = (time.perf_counter() - t0) * 1000
    return _result(M, steps, best_assign,
                   optimal=not st["timed_out"], exhausted=exhausted, ms=ms,
                   truncated=len(steps) >= cap)


def solve_assign(ships, teams, pairs):
    M = Model(ships, teams, pairs)
    res = {}
    for key, fn in (("greedy", run_greedy), ("hard", run_hard), ("bt", run_bt)):
        t0 = time.perf_counter()
        r = fn(M)
        r["ms"] = r["ms"] or (time.perf_counter() - t0) * 1000
        res[key] = r
    return dict(results=res, lb=M.lb, n=M.n, m=M.m, cost=M.cost)
