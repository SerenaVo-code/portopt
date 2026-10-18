# Nhật ký kỹ thuật dự án

## Trạng thái mã nguồn

Các ghi chú này áp dụng cho project gốc ở thư mục hiện tại: backend ở `backend/`, giao diện ở `frontend/`, kiểm thử ở `tests/` và dữ liệu ở `testcases/`. Một số tài liệu cũ từng mô tả thư mục `app/` hoặc một bản dựng riêng; chúng không còn là đường dẫn để chạy project này.

## Kiểm tra trên máy hiện tại

- `npm test`: 102 bài pytest đạt.
- `python tools/run_testcases.py`: 88/88 testcase đạt; kết quả chi tiết trong `testcases/RESULTS.md`.
- `npm --prefix frontend install --no-audit --no-fund`: hoàn tất; npm có cảnh báo esbuild chưa được cấp quyền chạy install script theo cấu hình allow-scripts.
- `npm --prefix frontend run build`: build thành công.
- Chạy backend và Vite từ project gốc; API `GET /api/health` trả `{"ok":true}` và trang giao diện trả HTTP 200.
- `python tests/e2e_modules.py http://127.0.0.1:5173`: đạt. Trên Windows, cần đổi đường dẫn ảnh chụp `/tmp/` trong lúc chạy vì thư mục đó không dùng được; bộ test và mã nguồn không bị sửa.
- Demo module 1 trên giao diện xác nhận các kết quả 3400, 3340, 3000 và 2900. Kịch bản browser cho các module còn lại cũng chạy tới `E2E MODULES OK`.

## Ví dụ phù hợp để quay demo

- Module 1, `m1-T02`: Tham lam 3400; Tham lam chi phí 3340; DSATUR 3000; quay lui 2900.
- Module 2, `m2-D04`: tham lam không gán được hết; khó trước và quay lui đạt 1000. `m2-D02` là ca vô nghiệm do 3 tàu nhưng chỉ có 2 đội.
- Module 3, `m3-T02`: tham lam 160; quy hoạch động và quay lui 220.
- Module 4, `m4-D01`: First-Fit dùng 5 thùng; FFD, BFD và quay lui dùng 4.

## Hạn chế được ghi nhận trong bộ testcase

Một số ca lớn chạm giới hạn tìm kiếm; xem cột ghi chú tại `testcases/RESULTS.md`. Khi quay demo, nên dùng ca nhỏ có bước chạy quan sát được. Không mô tả kết quả heuristic là tối ưu nếu testcase không có chứng minh/đáp án tham chiếu phù hợp.
