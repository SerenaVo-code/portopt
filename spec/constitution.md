# Hiến pháp dự án (constitution)

Bảy nguyên tắc dưới đây áp dụng cho quá trình phát triển project. Nếu một thay đổi không đáp ứng nguyên tắc nào, cần điều chỉnh hoặc ghi rõ lý do ngoại lệ.

1. **Ưu tiên tính đúng đắn.** Bộ kiểm tra độc lập phải tự xác minh tính hợp lệ và tính lại chi phí hoặc giá trị của từng lời giải; không dựa vào con số do solver tự báo.
2. **Dùng chung một cấu trúc bước.** Mỗi thuật toán trả về danh sách bước theo cùng một giao diện dữ liệu. Frontend phát lại các bước đã nhận, không tính lại thuật toán.
3. **Kiểm thử hàm thuật toán.** Bộ testcase gọi trực tiếp các hàm giải, không kiểm thử API hoặc dữ liệu đầu vào sai định dạng. Đáp án tham chiếu phải được tạo độc lập với solver, chẳng hạn bằng vét cạn, công thức hoặc instance dựng sẵn.
4. **Giới hạn rõ ràng và có thể tái lập.** Quay lui dừng theo số nút hoặc số lần thử đã quy định, không dừng theo thời gian. Cùng đầu vào phải cho cùng kết quả; nếu thuật toán dừng trước khi chứng minh tối ưu, giao diện ghi “chưa chắc tối ưu”.
5. **Dùng thuật ngữ dễ hiểu.** Ưu tiên các cụm “phương án tốt nhất hiện có” và “bỏ nhánh”. Giải thích ngắn gọn các thuật ngữ kỹ thuật khác khi chúng xuất hiện.
6. **Không tự khởi chạy ứng dụng.** Môi trường không có script tự khởi động; người dùng chủ động chạy các lệnh `npm run ...`.
7. **Ghi rõ nguồn tham khảo.** Thuật toán lấy từ tài liệu cần có trích dẫn phù hợp. Các thiết kế do dự án tự thực hiện phải được nhận diện rõ.
