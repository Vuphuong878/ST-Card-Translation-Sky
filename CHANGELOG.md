# Changelog — SillyTavern Multitools

> Cách cập nhật: mở thư mục cài đặt, chạy `git pull origin main`, rồi **tắt hẳn và chạy lại `start.bat`** (không chỉ F5).

## v1.20.0 — Đa provider (Dịch Card)
- **Cấu hình nhiều provider**: mỗi provider có bộ **key riêng** + **model chính/phụ** + **RPM sửa tự do** + **ngưỡng token**.
- Engine **rải call đều, chạy song song** nhiều provider → dịch nhanh hơn nhiều. Mỗi provider có RPM + xoay key **độc lập** (không đụng nhau); hết quota 1 key thì tự nhảy key kế của đúng provider đó.
- **Model phụ theo token**: entry ngắn hơn ngưỡng → dùng model phụ cho nhanh.
- **Chất lượng giữ như 1 provider** (tên riêng/biến vẫn nhất quán toàn card).
- Panel "Luồng đang chạy" hiện **RPM tách theo từng provider**. Cấu hình **tự lưu**.

## v1.19.2 — Chọn trường bỏ dịch trước khi Start (Dịch Card)
- Nút **"Xem/chọn trường (bỏ dịch)"**: liệt kê mọi trường **trước khi dịch** để **bỏ tick** trường muốn **tự dịch tay** (không gọi API) — gõ bản dịch thẳng vào ô.

## v1.19.1 — UI luồng chạy trực quan (Dịch Card)
- Panel "Luồng đang chạy" hiện thêm **% hoàn thành tổng** + **badge provider** (Gemini/OpenAI/Claude) cho mỗi call.

## v1.19.0 — EJS chạy đa luồng (Dịch Card)
- Card EJS bự (nghìn keyword) trước bị **sót, phải chạy 2–3 lần**. Nay **chia lô nhỏ + chạy song song + tự dịch lại phần sót** → xong trong 1 lượt, nhanh hơn.

## v1.18.2 — Sửa nút Cập nhật báo nhầm
- Nút Cập nhật trước báo nhầm **"đã mới nhất"** dù không kiểm tra được. Nay **báo đúng lý do** (chưa cấu hình git / lỗi mạng / tải ZIP) + cách xử lý.

## v1.18.1 — Sửa cột cấu hình bị cắt
- Cột cấu hình (Chiến Lược A/B/C) bị **cắt mất phần đáy** dưới header → đã sửa, thấy đủ.

## v1.18.0 — Không mất việc khi F5/tắt tab
- **Mod Card** và trang **Tạo thẻ từ truyện** nay **tự lưu** — F5 / đóng tab / mở lại không mất việc.

## v1.17.0 — Dễ nhìn hơn (toàn bộ 5 app)
- **Làm sáng chữ mờ** khó đọc; **phóng to** chữ/nút/logo nhỏ (header, thanh công cụ, rail).

## v1.16.0 — Header chung + đồng nhất giao diện
- Thêm **header "Silly Tavern Multitools"** trên cả 5 app.
- **Đồng nhất font (Inter) + cỡ chữ** giữa 5 app.

## v1.15.0 — Thêm app thứ 5 "Trích Card"
- Công cụ **trích xuất thẻ nhân vật** (NovalCard) thêm vào hub.

## v1.14.0 — "Tạo thẻ từ truyện" đầy đủ (Tạo Card)
- Quét truyện dài (chia đoạn), chọn **nhiều nhân vật** tạo hàng loạt, **thay {{user}}** vào 1 nhân vật + thiết lập bổ sung, mẫu thẻ, world entries, lọc bỏ entry vụn vặt.

## v1.13.1 — Nút Cập nhật
- Chuyển nút **Cập nhật** xuống dưới danh sách app + tạo hiệu ứng **neon** nổi bật.
