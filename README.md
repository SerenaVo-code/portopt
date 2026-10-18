# Demo điều phối cảng

Project demo điều phối cảng gồm bốn module, giao diện React/Vite, backend FastAPI, testcase và kiểm thử tự động. Thư mục gốc này là project chạy được; mã ứng dụng nằm trực tiếp trong `backend/` và `frontend/`.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `spec/` | Nguyên tắc và đặc tả bốn module. |
| `backend/` | API FastAPI và các bộ giải. |
| `frontend/` | Giao diện React/Vite. |
| `tests/` | Kiểm thử pytest và các kịch bản trình duyệt. |
| `testcases/` | Dữ liệu kiểm tra độc lập; kết quả ở `testcases/RESULTS.md`. |
| `tools/` | Trình chạy và công cụ tạo testcase. |
| `PROMPTS.md`, `PROMPT_DECISION_HISTORY.md` | Prompt, phản hồi và phân biệt nguồn quyết định theo ghi chép hiện có. |
| `SCRIPT.md`, `docs/Kich-ban-demo-CS112.docx`, `docs/Kich-ban-demo-CS112.srt` | Kịch bản prompt và kịch bản video/phụ đề demo. |
| `docs/ui-reference/` | Ảnh giao diện tham khảo do người học cung cấp; lịch sử prompt có ghi chú hồi tưởng về yêu cầu AI tham khảo các thiết kế này. |
| `LOG.md` | Nhật ký kỹ thuật và kết quả kiểm tra. |

## Cài đặt và chạy

Tại thư mục gốc, chạy `npm run setup` để cài backend và frontend, sau đó chạy `npm run dev`. Backend dùng cổng 8000; giao diện Vite dùng cổng 5173 và chuyển tiếp `/api` sang backend.

Chạy kiểm thử bằng `npm test`. Chạy toàn bộ bộ testcase bằng `python tools/run_testcases.py`.

Kết quả gần nhất được ghi nhận trong `testcases/RESULTS.md`. Bộ testcase hiện có 88 ca; pytest hiện có 102 bài. Các số này phản ánh mã nguồn gốc đang có trong thư mục gốc.
