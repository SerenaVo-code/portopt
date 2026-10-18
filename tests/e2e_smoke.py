"""Kiểm tra giao diện end-to-end bằng Playwright (cần backend :8000 và frontend :5173 đang chạy).
Chạy: pip install playwright && playwright install chromium && python tests/e2e_smoke.py
"""
import os
import sys
import tempfile
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_selector("[data-testid=stepview]")
    pg.click("[data-testid=tab-timeline]")
    pg.wait_for_selector("[data-testid=timeline]")
    assert pg.inner_text("[data-testid=kpi-cost]").startswith("2.700")
    pg.click("[data-testid=tab-compare]")
    txt = pg.inner_text("[data-testid=compare]")
    assert "2.580" in txt and "2.840" in txt
    pg.click("[data-testid=algo-bt]")
    pg.click("[data-testid=tab-graph]")
    pg.wait_for_selector("[data-testid=graph]")
    pg.click("[data-testid=tab-steps]")
    pg.click("button[aria-label='Về đầu']")
    for _ in range(18):
        pg.click("[data-testid=next]")
    txt = pg.inner_text("[data-testid=stepview]")
    assert "BỎ NHÁNH" in txt and "2.580" in txt
    pg.screenshot(path=os.path.join(tempfile.gettempdir(), "e2e.png"), full_page=True)
    assert not errs, errs
    b.close()
print("E2E OK")
