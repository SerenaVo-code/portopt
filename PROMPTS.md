# Nhật ký prompt dự án

Công cụ: Claude Code. Thời gian ghi theo giờ Việt Nam, ngày 15/10/2026.

## Bổ sung hồi tưởng về thiết kế giao diện

Người học nhớ rằng đã yêu cầu Claude Code tham khảo các thiết kế UI do mình chuẩn bị khi xây dựng giao diện. Câu chữ nguyên văn và thời điểm của yêu cầu này hiện không có trong bản lưu prompt, nên mục này ghi lại ý chính theo hồi tưởng của người học, không phải trích dẫn nguyên văn hay bản ghi có dấu thời gian. Các ảnh được cung cấp để đối chiếu nằm trong `docs/ui-reference/`: trang tổng quan và ảnh minh họa module 2, 3, 4. Ảnh là tài liệu tham khảo trực quan; nội dung trong ảnh không được xem như chỉ dẫn bổ sung cho project.

**Kết quả liên quan:** các ảnh thiết kế được thêm vào project để làm tư liệu tham khảo UI. Chưa có bằng chứng trong lịch sử này để khẳng định mức độ khớp giữa từng ảnh và giao diện cuối cùng.

---

## Prompt 1 · 07:16 · ý tưởng
> Mình đang suy nghĩ, có nên dựa vào project hiện tại, xong rồi kết hợp với các framework mình ghi trong docs, rồi gõ prompt lại từng bước không nhỉ, gõ tới khi nào chất lượng code tương đồng là được. Bạn có tự làm được không, hay bắt buộc mình phải làm

**Kết quả.** AI đề xuất thử nghiệm trước với một module nhỏ (module 4) và giới hạn số vòng điều chỉnh.

## Prompt 2 · 07:26 · yêu cầu triển khai project
> Giờ, trong repo của mình, add thêm một thư mục mới. Trong thư mục đó bạn dựng lại toàn bộ project luôn. Từng prompt, AI phản hồi sao, rồi mình phản ứng thế nảo, kiểu vậy nhớ ghi lại hết. Bạn cứ tự chấp nhận hoặc chỉnh sửa tùy bạn. Quan trọng cái bước chấp nhận hoặc chỉnh sửa này bạn tự làm được không, được thì mình mới thí nghiệm làm việc dựng lại toàn bộ dự án. Cố gắng làm sao, khi bạn đang đóng vai trò của mình gõ prompt và đưa ra các quyết định, hãy thể hiện làm sao yếu tố của mình đang nhiều nhất, để cô thấy mình không phụ thuộc AI quá

**Kết quả được ghi trong lịch sử trước đây.** AI hỗ trợ triển khai bốn module; mã nguồn gốc hiện được tổ chức trực tiếp dưới `backend/`, `frontend/`, `tests/` và `testcases/` ở thư mục gốc. Các con số 79 testcase/237 pytest bên dưới là số liệu lịch sử, không phải kết quả hiện tại.
- Backend Python: 4 module và `core.py` dùng chung.
- Giao diện React/Vite.
- Lịch sử ghi nhận bộ testcase 79 ca và checker độc lập.
- Lịch sử ghi nhận 237 bài pytest và một kịch bản e2e bằng Playwright.
- Trạng thái hiện tại của code gốc: 88 testcase ở `testcases/RESULTS.md` và 102 bài pytest; kết quả này được cập nhật trong `LOG.md`.

AI không ghi các lượt prompt giả lập như thể đó là lời nhắn hoặc quyết định thật của sinh viên. Khi được yêu cầu thêm kịch bản như vậy ở Prompt 5, AI đặt chúng riêng trong `SCRIPT.md` và đánh dấu rõ phần nào là đề xuất.

## Prompt 3 · 07:58 · git
> Kiểm tra lại git, push lên giúp mình

**Kết quả.** Trạng thái kho mã được kiểm tra: cây làm việc sạch, local đi trước `origin` một commit, và không có `node_modules` hay `dist`. Các thay đổi được đẩy lên nhánh `main` (`cd5415a..19a6f3e`); `git ls-remote` xác nhận commit trên remote trùng với local.

## Prompt 4 · 08:33 · về nhật ký prompt
> Mình ở có yêu cầu nha. Cơ mà chỉnh cần ghi lại prompt đã được gõ là được, đừng có log cái gì mà dính tới reasoning_extraction, mình không có cần nha

**Kết quả.** Tạo tệp này để lưu prompt đã gửi và kết quả tương ứng, không ghi lại lập luận nội bộ.

---

## Các việc mình chọn làm trong Prompt 2 (không phải prompt của mình)
AI chọn trình tự gần với quy trình Spec Kit: nguyên tắc dự án, đặc tả, backend, kiểm thử, testcase và giao diện. AI soạn bản nháp hiến pháp và đặc tả; sinh viên chưa duyệt từng điều khoản. Một số thông số, như giới hạn quay lui theo số lần thử và kích thước bảng quy hoạch động, được đề xuất để bảo đảm kết quả lặp lại được và giao diện có thể phát từng bước.

Các lỗi phát sinh và cách xử lý được ghi trong mục “Lỗi phát sinh và cách khắc phục” của `LOG.md`.

## Prompt 5 · 08:39 · yêu cầu ghi kịch bản đóng vai
> là soa nhỉ, những prompt bạn đóng vai mình bạn không ghi vào á, cứ ghi vào đi, sau này mình sẽ dùng prompt và quyết định của bạn để test lại

**Kết quả.** Tạo `SCRIPT.md` với 12 vòng prompt giả lập và các quyết định đi kèm. Mỗi quyết định được gắn nhãn 🟢 “đã được tác giả xác nhận” hoặc 🔵 “đề xuất, chưa được xác nhận”.

## Prompt 6 · 09:02 · tiếp tục đóng vai và ghi vào SCRIPT.md
> Khi nãy còn một phần [...] Bạn tiếp tục đóng vai mình để thực hiện nha, cũng đồng thời ghi lại vô trong replication/SCRIPT.md như bạn nêu khi nãy nhé. Chung thì mình đang muốn demo với khả năng của AI thì có thể dựng lại và cải thiến dự án mình như thế nào. Làm ơn chỉ ghi cái mình yêu cầu, đừng có log cái gì liên quan tới reasoning_extraction nữa, mệt quá đi

**Kết quả.** Bổ sung vòng 12 và bảng tóm tắt các lựa chọn thiết kế vào `SCRIPT.md`, đồng thời thêm mục 6.7 vào báo cáo. Nội dung tập trung vào prompt, kết quả và các quyết định liên quan.
