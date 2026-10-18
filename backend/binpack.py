"""Module 4: xếp các lô container lên ít tàu nhất (bài toán đóng thùng - bin packing).

Lô i nặng w[i] tấn, mỗi tàu chịu tối đa C tấn. Cần dùng ít tàu nhất.
Cận dưới = ⌈tổng khối lượng / C⌉.

Nguồn (đánh số theo mục "Nguồn tham khảo" trong README):
  - First-Fit, First-Fit Decreasing, Best-Fit Decreasing: Johnson và cộng sự 1974 [7]; bài toán là bin packing [8].
  - Cận dưới ⌈Σw / C⌉ (cận L1): Martello và Toth 1990 [6].
  - Quay lui + cắt nhánh (bỏ qua thùng cùng tải, cắt khi chạm cận dưới) theo khung quay lui của bài giảng CS112 [1];
    phần cài đặt và thông điệp từng bước: tự thiết kế.
"""
from __future__ import annotations

import math
import time

from solver import EPS, STEP_CAP, fm

BT_MAX_NODES = 400_000
BT_DEADLINE_S = 1.5


def lower_bound(items, C):
    return max(1, math.ceil(sum(i["w"] for i in items) / C - 1e-9)) if items else 0


def _cands(items, bins, loads, C, x, chosen=-1, new_chosen=False, pruned=(), tried=()):
    out = []
    for b, ld in enumerate(loads):
        fits = ld + items[x]["w"] <= C + EPS
        if not fits:
            st = "blocked"
        elif b == chosen:
            st = "chosen"
        elif b in pruned:
            st = "pruned"
        elif b in tried:
            st = "tried"
        else:
            st = "ok"
        out.append(dict(bin=b, load=ld, free=C - ld, after=ld + items[x]["w"], status=st))
    out.append(dict(bin=len(loads), load=0, free=C, after=items[x]["w"], status="chosen" if new_chosen else "new"))
    return out


def _run_fit(items, C, order, mode, label):
    bins: list[list[int]] = []
    loads: list[float] = []
    steps = [dict(kind="info", x=-1, line=1, bins=[], loads=[], cands=[], used=0,
                  msg=f"{label}: thứ tự xét " + ", ".join(items[i]["name"] for i in order) + ".")]
    for p, x in enumerate(order):
        w = items[x]["w"]
        fits = [b for b in range(len(loads)) if loads[b] + w <= C + EPS]
        if fits:
            if mode == "ff":
                b = fits[0]
                why = "tàu đầu tiên còn đủ chỗ"
            else:
                b = min(fits, key=lambda q: (C - loads[q] - w, q))
                why = "tàu vừa khít nhất (còn ít chỗ trống nhất sau khi xếp)"
            cs = _cands(items, bins, loads, C, x, chosen=b)
            bins[b].append(x)
            loads[b] += w
            msg = f"{items[x]['name']} ({fm(w)} t): xếp vào Tàu {b + 1}, {why}. Tải Tàu {b + 1} còn {fm(loads[b])}/{fm(C)} t."
            line = 4
        else:
            cs = _cands(items, bins, loads, C, x, new_chosen=True)
            bins.append([x])
            loads.append(w)
            b = len(bins) - 1
            msg = f"{items[x]['name']} ({fm(w)} t): không tàu nào còn đủ chỗ, mở Tàu {b + 1}."
            line = 5
        steps.append(dict(kind="place", x=x, pos=p, line=line, bins=[bb[:] for bb in bins], loads=loads[:],
                          cands=cs, used=len(bins), chosen=b, msg=msg))
    steps.append(dict(kind="done", x=-1, line=0, bins=[bb[:] for bb in bins], loads=loads[:], cands=[], used=len(bins),
                      msg=f"Xong. Dùng {len(bins)} tàu, cận dưới {lower_bound(items, C)}."))
    return dict(steps=steps, bins=bins, used=len(bins), order=order, optimal=len(bins) <= lower_bound(items, C), ms=0.0)


def run_ff(items, C):
    return _run_fit(items, C, list(range(len(items))), "ff", "First-fit giữ nguyên thứ tự nhập")


def run_ffd(items, C):
    order = sorted(range(len(items)), key=lambda i: (-items[i]["w"], i))
    return _run_fit(items, C, order, "ff", "First-fit giảm dần")


def run_bfd(items, C):
    order = sorted(range(len(items)), key=lambda i: (-items[i]["w"], i))
    return _run_fit(items, C, order, "bf", "Best-fit giảm dần")


def run_bt(items, C):
    n = len(items)
    order = sorted(range(n), key=lambda i: (-items[i]["w"], i))
    lb = lower_bound(items, C)
    cap = max(300, min(STEP_CAP, 300_000 // max(n, 1)))
    st = dict(best=n, best_bins=[[i] for i in range(n)], nodes=0, stop=n <= lb, timed_out=False)  # khởi đầu: mỗi lô một tàu
    bins: list[list[int]] = []
    loads: list[float] = []
    steps: list[dict] = []
    t0 = time.perf_counter()

    def push(**kw):
        if len(steps) < cap:
            kw["bins"] = [b[:] for b in bins]
            kw["loads"] = loads[:]
            kw["best"] = st["best"]
            kw["used"] = len(bins)
            steps.append(kw)

    push(kind="info", x=-1, line=1, cands=[], lb=lb,
         msg=f"Quay lui: xếp lô nặng trước, mỗi lô thử từng tàu còn vừa rồi thử mở tàu mới. "
             f"Khởi đầu mỗi lô một tàu ({n} tàu), cận dưới {lb}. Bỏ nhánh khi số tàu không thể ít hơn phương án tốt nhất hiện có.")

    def rec(p):
        if st["stop"]:
            return
        st["nodes"] += 1
        if st["nodes"] > BT_MAX_NODES or time.perf_counter() - t0 > BT_DEADLINE_S:
            st["timed_out"] = st["stop"] = True
            return
        if p == n:
            if len(bins) < st["best"]:
                st["best"], st["best_bins"] = len(bins), [b[:] for b in bins]
                push(kind="found", x=-1, line=2, cands=[], msg=f"Xếp đủ {n} lô bằng {len(bins)} tàu: phương án tốt nhất hiện có.")
                if len(bins) <= lb:
                    st["stop"] = True
            return
        x = order[p]
        w = items[x]["w"]
        tried: list[int] = []
        seen_loads: set[float] = set()
        for b in range(len(bins)):
            if loads[b] + w > C + EPS:
                continue
            if loads[b] in seen_loads:  # hai tàu cùng tải: thử một tàu là đủ
                continue
            seen_loads.add(loads[b])
            cs = _cands(items, bins, loads, C, x, chosen=b, tried=tried)
            bins[b].append(x)
            loads[b] += w
            push(kind="place", x=x, pos=p, line=4, chosen=b, cands=cs,
                 msg=f"Thử xếp {items[x]['name']} ({fm(w)} t) vào Tàu {b + 1}.")
            rec(p + 1)
            bins[b].pop()
            loads[b] -= w
            tried.append(b)
            if st["stop"]:
                return
        if len(bins) + 1 < st["best"]:
            bins.append([x])
            loads.append(w)
            push(kind="place", x=x, pos=p, line=5, chosen=len(bins) - 1,
                 cands=_cands(items, bins[:-1], loads[:-1], C, x, new_chosen=True, tried=tried),
                 msg=f"Thử mở Tàu {len(bins)} cho {items[x]['name']} ({fm(w)} t).")
            rec(p + 1)
            bins.pop()
            loads.pop()
        else:
            push(kind="prune", x=x, pos=p, line=5, cands=[],
                 msg=f"Bỏ nhánh mở tàu mới cho {items[x]['name']}: {len(bins) + 1} tàu không tốt hơn phương án tốt nhất hiện có ({st['best']}).")

    rec(0)
    bins[:] = st["best_bins"]
    loads[:] = [sum(items[i]["w"] for i in b) for b in bins]
    msg = f"Xong. Dùng {st['best']} tàu, cận dưới {lb}." + (" (dừng sớm vì chạm cận dưới)" if st["stop"] and not st["timed_out"] else "") \
        + (" (chạm giới hạn thời gian, chưa chắc tối ưu)" if st["timed_out"] else "")
    steps.append(dict(kind="done", x=-1, line=0, cands=[], bins=[b[:] for b in bins], loads=loads[:], used=len(bins),
                      best=st["best"], msg=msg))
    return dict(steps=steps, bins=[b[:] for b in st["best_bins"]], used=st["best"], order=order,
                optimal=not st["timed_out"], ms=(time.perf_counter() - t0) * 1000, truncated=len(steps) > cap)


def solve_binpack(items, C):
    res = {}
    for key, fn in (("ff", run_ff), ("ffd", run_ffd), ("bfd", run_bfd), ("bt", run_bt)):
        t0 = time.perf_counter()
        r = fn(items, C)
        r["ms"] = r["ms"] or (time.perf_counter() - t0) * 1000
        res[key] = r
    return dict(results=res, C=C, lb=lower_bound(items, C), total=sum(i["w"] for i in items), n=len(items))
