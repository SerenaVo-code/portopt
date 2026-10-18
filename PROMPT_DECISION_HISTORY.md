# Lịch sử prompt và ghi chú nguồn

Tài liệu này ghi nhận phần đóng góp và bối cảnh cần thiết để đọc lịch sử prompt trong [`PROMPTS.md`](PROMPTS.md). Các câu được người dùng xác nhận trực tiếp được tách khỏi phần hồi tưởng và khỏi các số liệu đo được trong project. Không bổ sung lời thoại nguyên văn nếu không có trong bản lưu.

## Bổ sung hồi tưởng về thiết kế UI

Người học nhớ đã yêu cầu Claude Code tham khảo các thiết kế giao diện do mình chuẩn bị khi xây dựng UI. Ý này được ghi lại từ xác nhận hiện tại của người học; không còn nguyên văn prompt hoặc dấu thời gian để trích dẫn. Vì vậy đây là hồi tưởng, không phải log prompt gốc.

Các ảnh người học cung cấp đã được thêm vào `docs/ui-reference/`: ảnh tổng quan và các màn hình phân công đội, quỹ giờ công, xếp container. Ảnh chỉ là tài liệu tham khảo trực quan. Không có ảnh riêng của module thuê bến trong bộ ảnh nhận được. Không suy diễn từ hình ảnh thành yêu cầu mới cho project.

## Đóng góp do người học xác nhận

- Người học viết prompt và xác định hướng sản phẩm, yêu cầu, các quyết định sản phẩm.
- Người học tham gia soạn testcase.
- Người học yêu cầu AI tham khảo thiết kế UI đã chuẩn bị.

Đây là các đóng góp được người học xác nhận trong hội thoại. Chi tiết câu chữ lịch sử chỉ được coi là nguyên văn khi xuất hiện dưới dạng trích dẫn trong `PROMPTS.md`.

## Trạng thái project gốc

Project hiện chạy từ thư mục gốc với `backend/`, `frontend/`, `tests/` và `testcases/`. Trạng thái kiểm tra mới nhất được ghi trong [`LOG.md`](LOG.md): 88/88 testcase, 102 pytest, frontend build và E2E Playwright đạt. Các con số lịch sử khác trong `PROMPTS.md` được giữ như ghi chép cũ và không thay thế kết quả hiện tại.
