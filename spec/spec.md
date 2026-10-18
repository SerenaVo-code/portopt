# Đặc tả: Demo điều phối cảng cho hãng tàu

## 1. Bối cảnh và mục tiêu
Demo được xây dựng từ góc nhìn của hãng tàu thuê bến, phù hợp với bối cảnh hoạt động của ONE. Một hãng có n tàu cần cập cảng trong các khoảng thời gian xác định. Vì hãng thuê bến theo hợp đồng thay vì sở hữu bến, cần quyết định số hợp đồng và cách phân tàu vào từng hợp đồng sao cho tổng chi phí thấp nhất. Demo mở rộng bối cảnh này thêm ba quyết định tại cảng: phân công đội phục vụ, lựa chọn công việc tăng ca trong giới hạn quỹ giờ và xếp container lên tàu.

## 2. Bốn module
Mỗi module có cùng quy trình sử dụng: nhập dữ liệu, chọn thuật toán, theo dõi từng bước, xem kết quả và so sánh các thuật toán.

### Module 1. Thuê bến (tô màu đồ thị khoảng)
- **Input:** n tàu (tên, giờ đến s, giờ rời e, s < e), danh sách cặp tàu cấm chung hợp đồng (ràng buộc phụ), phí cố định F ≥ 0, đơn giá giờ r ≥ 0.
- **Mô hình:** mỗi tàu tương ứng với một đỉnh và mỗi hợp đồng tương ứng với một màu. Hai tàu không thể dùng chung hợp đồng nếu thời gian của chúng giao nhau (s_i < e_j và s_j < e_i) hoặc nếu chúng nằm trong một cặp bị cấm.
- **Chi phí một hợp đồng:** F + r × (giờ rời cuối − giờ đến đầu), tính cả giờ trống giữa các tàu.
- **Output:** cách gán tàu vào hợp đồng có tổng chi phí nhỏ nhất.
- **Cận dưới:** ω·F + r·Σ(e − s), với ω là số tàu cùng neo nhiều nhất.
- **Thuật toán:** tham lam theo giờ đến, tham lam chọn hợp đồng tăng ít tiền nhất, DSATUR, quay lui có bỏ nhánh.
- **Giới hạn:** 1 đến 200 tàu.

### Module 2. Phân công đội phục vụ
- **Input:** n tàu (tên, s, e, danh sách kỹ năng cần), m đội (tên, kỹ năng, đơn giá giờ), cặp tàu cấm chung đội.
- **Ràng buộc:** mỗi tàu một đội có đủ kỹ năng; hai tàu trùng giờ hoặc bị cấm không chung đội.
- **Chi phí:** Σ đơn giá đội × (e − s).
- **Output:** cách gán tàu vào các đội với tổng chi phí thấp nhất, hoặc kết luận vô nghiệm kèm lý do.
- **Thuật toán:** tham lam theo giờ đến, tham lam tàu khó trước (ít đội đủ kỹ năng nhất), quay lui có bỏ nhánh. Có bước kiểm tra trước điều kiện cần (khớp hai phía theo từng thời điểm) để chứng minh vô nghiệm nhanh.
- **Giới hạn:** 1 đến 60 tàu, 1 đến 12 đội.

### Module 3. Quỹ giờ công (cái túi 0/1)
- **Input:** n yêu cầu tăng ca (tên, số giờ w nguyên ≥ 1, giá trị v ≥ 0), quỹ giờ W nguyên.
- **Output:** tập yêu cầu được chọn sao cho tổng giờ không vượt W và tổng giá trị là lớn nhất.
- **Thuật toán:** tham lam theo giá trị/giờ (cố ý để thấy nó sai), quy hoạch động có truy vết, quay lui với cận trên nới lỏng phân số.
- **Giới hạn:** 1 đến 25 yêu cầu, 0 ≤ W ≤ 200, n·(W+1) ≤ 2500.

### Module 4. Xếp container
- **Input:** n lô (tên, khối lượng w), tải trọng một tàu C, 0 < w ≤ C.
- **Output:** cách xếp các lô lên tàu sao cho tải trọng mỗi tàu không vượt C và tổng số tàu được sử dụng là nhỏ nhất.
- **Cận dưới:** ⌈Σw / C⌉.
- **Thuật toán:** First-Fit, First-Fit giảm dần, Best-Fit giảm dần, quay lui có bỏ nhánh.
- **Giới hạn:** 1 đến 60 lô.

## 3. Hợp đồng bước (chung)
Mỗi thuật toán trả về `{key, name, steps[], cost|value|bins, optimal, nodes, truncated, ms}`. Mỗi phần tử trong `steps` gồm `kind` (ví dụ `info`, `assign`, `back`, `prune`, `found`, `done`), nội dung tiếng Việt trong `msg` và trạng thái cần thiết để giao diện dựng lại màn hình. Các bước của thuật toán quay lui còn có `best` (phương án tốt nhất hiện có) và `depth`.

## 4. Tiêu chí chấp nhận
- A1. Với testcase có đáp án tham chiếu, kết quả quay lui không được kém hơn đáp án đó; nếu thuật toán hoàn tất việc tìm kiếm thì kết quả phải bằng đáp án tham chiếu.
- A2. Mọi lời giải phải thỏa các ràng buộc của bài toán, theo xác nhận của checker độc lập.
- A3. Chạy cùng một đầu vào nhiều lần phải cho cùng kết quả, kể cả với quay lui.
- A4. Khi người dùng chuyển bước, chạy tự động hoặc kéo thanh trượt, trạng thái hiển thị phải khớp với thông điệp của bước tương ứng.
- A5. Mỗi module phải có ít nhất một bộ dữ liệu mẫu có thể chạy trực tiếp.
