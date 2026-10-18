# Bộ prompt 2

Các prompt dưới đây được tổng hợp từ `SCRIPT.md`, giữ nguyên thứ tự để có thể dùng lần lượt khi làm việc trên project.

## Prompt 0 · Nguyên tắc dự án
Hãy tạo bộ nguyên tắc cho ứng dụng demo môn CS112. Các nguyên tắc gồm: kết quả được kiểm tra bằng một checker độc lập; mọi thuật toán xuất ra từng bước theo cùng một cấu trúc, còn giao diện chỉ phát lại các bước đó; bài kiểm thử chỉ nhắm vào các hàm thuật toán, không kiểm thử API hay nhóm dữ liệu đầu vào không hợp lệ; đáp án chuẩn phải được tính độc lập, không lấy từ chính bộ giải; giới hạn chạy phải rõ ràng và cho kết quả ổn định; dùng thuật ngữ tiếng Việt dễ hiểu; không tạo script tự chạy; có trích dẫn nguồn.

## Prompt 1 · Đặc tả ứng dụng
Hãy mô tả một ứng dụng demo từ góc nhìn của hãng tàu thuê dịch vụ cảng, gắn với bối cảnh ngành của ONE. Module 1: phân chia hợp đồng thuê cầu cảng cho n con tàu theo thời điểm đến và rời; mỗi hợp đồng có chi phí F + r × (thời điểm rời muộn nhất − thời điểm đến sớm nhất), bao gồm cả thời gian cầu cảng để trống; hai tàu có thời gian hoạt động chồng lấn hoặc nằm trong một cặp bị cấm thì không được dùng chung hợp đồng; mục tiêu là giảm tổng chi phí. Bổ sung ba bài toán liên quan đến cảng: phân công đội dịch vụ có đủ kỹ năng cho các lượt tàu; chọn yêu cầu làm thêm trong giới hạn tổng số giờ lao động (bài toán ba lô 0/1); và xếp các lô container lên tàu (bài toán đóng thùng). Mỗi module cần so sánh từng bước một số thuật toán.

## Prompt 2 · Làm rõ đặc tả
Hãy liệt kê những điểm chưa rõ trong đặc tả có thể làm thay đổi cách triển khai, kèm theo đề xuất xử lý cho từng điểm. Chưa bắt đầu viết mã.

## Prompt 3 · Kiến trúc
Hãy lên kế hoạch kiến trúc: backend FastAPI có một endpoint POST cho mỗi module, chạy tất cả thuật toán và trả về toàn bộ các bước; frontend React + Vite phát lại các bước đã nhận, không tự tính lại; giao diện theo phong cách Magenta Design System. Môi trường là Codespace; chỉ dùng các lệnh `npm run setup`, `npm run dev`, `npm test`.

## Prompt 4 · Chia nhỏ công việc
Hãy chia kế hoạch thành các việc nhỏ theo thứ tự phụ thuộc, mỗi việc kèm một lệnh để kiểm tra.

## Prompt 5 · Module 1: Thuê bến
Hãy triển khai module 1 với các thuật toán: tham lam theo thời điểm đến, tham lam chọn hợp đồng rẻ nhất, DSATUR và quay lui có bỏ nhánh, bắt đầu từ kết quả tham lam tốt nhất. Mỗi thuật toán cần trả về các bước gồm loại bước, thông điệp, trạng thái phân công, chi phí và bảng phương án kèm lý do loại từng lựa chọn. Cận dưới = ω·F + r·Σ(thời điểm rời − thời điểm đến). Bổ sung bài kiểm thử so sánh với vét cạn trên các dữ liệu nhỏ được tạo ngẫu nhiên.

## Prompt 6 · Module 2: Phân công đội
Hãy triển khai module 2: phân công cho mỗi lượt tàu một đội có đủ các kỹ năng cần thiết; các lượt bị chồng thời gian hoặc thuộc cặp bị cấm không được dùng chung đội; mục tiêu là giảm Σ(đơn giá × thời lượng). Dùng các thuật toán tham lam theo thời điểm đến, tham lam ưu tiên việc khó nhất và quay lui với cận chi phí còn lại. Nếu bài toán vô nghiệm, hãy chứng minh điều đó bằng cách kiểm tra khớp hai phía tại từng thời điểm, thay vì tiếp tục tìm kiếm.

## Prompt 7 · Module 3: Quỹ giờ công
Hãy triển khai module 3 dưới dạng bài toán ba lô 0/1: dùng thuật toán tham lam theo giá trị trên mỗi giờ (để cho thấy cách này có thể cho kết quả sai), quy hoạch động với một bước cho mỗi ô trong bảng và truy vết kết quả, cùng thuật toán quay lui có cận trên phân số.

## Prompt 8 · Module 4: Xếp container
Hãy triển khai module 4 dưới dạng bài toán đóng thùng với các thuật toán First-Fit, First-Fit Decreasing, Best-Fit Decreasing và quay lui. Khi quay lui, bỏ qua các thùng có cùng tải trọng và bỏ nhánh dựa trên cận dưới ⌈Σw/C⌉.

## Prompt 9 · Giao diện
Hãy xây dựng giao diện React gồm một tab cho mỗi module, trình chỉnh sửa dữ liệu, dữ liệu mẫu lấy từ các testcase, chức năng nhập và xuất JSON theo định dạng testcase, bộ chọn thuật toán, các nút Prev/Next/Auto và thanh trượt, thông điệp của từng bước, các chỉ số gồm cả “phương án tốt nhất hiện có”, bảng phương án và bảng so sánh. Module 1 cần có thêm biểu đồ Gantt và đồ thị xung đột; module 3 hiển thị bảng quy hoạch động; module 4 hiển thị các thùng theo dạng cột.

## Prompt 10 · Bộ testcase
Hãy tạo bộ testcase cho kết quả ổn định, gồm năm nhóm cho mỗi module: thông thường, nhỏ, biên, đặc biệt và lớn. Đáp án chuẩn phải được tính bằng vét cạn, công thức chính xác hoặc dữ liệu được dựng sẵn, tuyệt đối không lấy từ bộ giải. Một checker riêng cần tính lại kết quả của từng thuật toán. Trình chạy gọi trực tiếp các hàm bộ giải và ghi kết quả vào `RESULTS.md`. Mô tả testcase phải đúng với những gì thực sự xảy ra.

## Prompt 11 · Kiểm chứng
Hãy chạy toàn bộ bộ testcase ổn định cùng checker độc lập. Tóm tắt kết quả, chỉ ra những trường hợp chạm giới hạn tìm kiếm, rồi kiểm tra các bài test đơn vị và test trên trình duyệt.

## Prompt 12 · Giải thích thuật toán trên giao diện
Phần hiển thị từng bước cần giải thích thuật toán, không chỉ cho thấy trạng thái hiện tại. Hãy thêm bảng mã giả, trong đó dòng được tô sáng thay đổi theo loại bước đang xem; thêm phần chú giải có thể thu gọn cho mọi thuật ngữ chuyên môn, dùng cách gọi dễ hiểu như “phương án tốt nhất hiện có” và “bỏ nhánh”; đồng thời thêm cột độ phức tạp thuật toán vào mỗi bảng so sánh.
