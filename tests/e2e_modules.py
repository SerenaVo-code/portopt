"""E2E cho 3 module mới (cần server chạy: mặc định http://localhost:8000 khi đã build frontend).
Chạy: /usr/bin/python3 tests/e2e_modules.py [URL]
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"


def goto_mod(pg, k):
    pg.click(f"[data-testid=mod-{k}]")
    pg.wait_for_selector(f"[data-m={k}] [data-testid=run]")


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL)
    pg.wait_for_selector("[data-m=berth] [data-testid=stepview]")

    # Tổng quan
    pg.click("[data-testid=mod-overview]")
    assert "phủ chương trình học" in pg.inner_text("main.ov").lower()
    pg.screenshot(path="/tmp/s_overview.png", full_page=True)

    # Module 2
    goto_mod(pg, "assign")
    m = "[data-m=assign] "
    pg.wait_for_selector(m + "[data-testid=lanes]")
    pg.click(m + "button[aria-label='Về đầu']")
    for _ in range(4):
        pg.click(m + "[data-testid=next]")
    txt = pg.inner_text(m + "[data-testid=band]")
    assert "T4" in txt and "2.000" in txt, txt
    dec = pg.inner_text(m + "[data-testid=decision]")
    assert "trùng giờ với T3" in dec and "trùng giờ với T2" in dec, dec
    pg.screenshot(path="/tmp/s_assign.png", full_page=True)
    pg.click(m + "[data-testid=tab-compare]")
    cmp = pg.inner_text(m + "[data-testid=compare]")
    assert "3.060" in cmp and "TỐI ƯU" in cmp, cmp
    pg.click(m + "[data-testid=tab-matrix]")
    pg.wait_for_selector(m + "[data-testid=matrix]")
    pg.click(m + "[data-testid=tab-steps]")
    pg.click(m + "[data-testid=algo-bt]")
    pg.click(m + "button[aria-label='Về đầu']")
    for _ in range(6):
        pg.click(m + "[data-testid=next]")
    pg.screenshot(path="/tmp/s_assign_bt.png", full_page=True)
    # lấy tàu từ module 1
    pg.click(m + "[data-testid=from-berth]")
    pg.click(m + "[data-testid=run]")
    pg.wait_for_selector(m + "[data-testid=lanes]")

    # Module 3
    goto_mod(pg, "knap")
    m = "[data-m=knap] "
    pg.wait_for_selector(m + "[data-testid=dp]")
    pg.click(m + "button[aria-label='Về đầu']")
    for _ in range(27):
        pg.click(m + "[data-testid=next]")
    band = pg.inner_text(m + "[data-testid=band]")
    assert "dp[3][8]" in band and "110" in band, band
    pg.screenshot(path="/tmp/s_knap.png", full_page=True)
    pg.click(m + "button[aria-label='Về cuối']")
    pg.click(m + "[data-testid=tab-compare]")
    cmp = pg.inner_text(m + "[data-testid=compare]")
    assert "100" in cmp and "110" in cmp and "KHÔNG TỐI ƯU" in cmp, cmp
    pg.click(m + "[data-testid=tab-steps]")
    pg.click(m + "[data-testid=algo-greedy]")
    pg.click(m + "[data-testid=algo-bt]")
    pg.click(m + "button[aria-label='Về đầu']")
    for _ in range(5):
        pg.click(m + "[data-testid=next]")
    pg.screenshot(path="/tmp/s_knap_bt.png", full_page=True)

    # Module 4
    goto_mod(pg, "bins")
    m = "[data-m=bins] "
    pg.wait_for_selector(m + "[data-testid=holds]")
    pg.click(m + "button[aria-label='Về đầu']")
    for _ in range(5):
        pg.click(m + "[data-testid=next]")
    dec = pg.inner_text(m + "[data-testid=decision]")
    assert "vượt tải trọng 4 t" in dec, dec
    pg.screenshot(path="/tmp/s_bins.png", full_page=True)
    pg.click(m + "[data-testid=algo-bt]")
    pg.click(m + "button[aria-label='Về đầu']")
    for _ in range(4):
        pg.click(m + "[data-testid=next]")
    pg.screenshot(path="/tmp/s_bins_bt.png", full_page=True)
    pg.click(m + "[data-testid=tab-compare]")
    assert "3 tàu" in pg.inner_text(m + "[data-testid=compare]")
    assert not errs, errs
    b.close()
print("E2E MODULES OK")
