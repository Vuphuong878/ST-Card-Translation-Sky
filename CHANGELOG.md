# Changelog — SillyTavern Multitools

> Cách cập nhật: mở thư mục cài đặt, chạy `git pull origin main`, rồi **tắt hẳn và chạy lại `start.bat`** (không chỉ F5).

## v1.25.0 — Đa provider/đa key cho 3 app còn lại (Preset + Mod + Trích Card)
Hoàn tất áp logic **đa provider** (từ Dịch Card) cho **cả 5 app**:
- **Mod Card**: mục **"🔀 Provider bổ sung (chạy song song)"** trong Cài đặt — thêm provider phụ (key/model riêng) → orchestrator **rải call round-robin** nhiều provider cùng lúc cho các bước mod (mod nhiều call/lần → rải tải rõ rệt).
- **Preset**: thêm **provider phụ** trong ⚙ Cài đặt → mỗi lượt chat **xoay vòng** provider (rải rate-limit qua nhiều account). Chat tuần tự nên **tăng sức chứa**, không tăng tốc song song.
- **Trích Card**: ô API key nhận **nhiều key** (mỗi dòng hoặc cách nhau bằng dấu phẩy) → **xoay vòng key** mỗi call (kể cả nút quét model). Chạy tuần tự nên đây là cách rải quota thực tế cho app này.

## v1.24.0 — Đa provider (Tạo Card)
- Tick **"🔀 Gộp vào POOL đa-provider"** ở ≥2 profile (Cài đặt) → engine **rải call round-robin** nhiều provider cùng lúc. Mỗi profile giữ **đa-key + RPM riêng**, rate-limit **tách theo provider**. 1 profile = như cũ.

## v1.23.1 — Thiết kế lại giao diện cấu hình Provider (Dịch Card)
- Bố cục **2 field/hàng** gọn hơn, mỗi provider có nút **"🔄 Load model"** (quét model từ proxy) + gợi ý datalist. Bớt rối, dễ quan sát.

## v1.23.0 — Dịch Card: Regex — gộp Quét+Sửa thành 1 nút
- **1 nút "Quét & Sửa Regex (AI)"** chạy 4 giai đoạn: (1) quét + lập plan có **thinking** (xử lý ca đặc biệt map / tiếng Trung) → (2) chia **chunk** (phủ hết, không sót) + so sánh gốc↔dịch **song song nhiều chunk** → (3) **sửa chỉ phần lỗi** (dấu thừa/format, tự kiểm ngoặc + regex hợp lệ) → (4) **kiểm mốc chunk** chống sót.
- Output đổi sang **XML** → hết lỗi "chunk lỗi định dạng JSON".

## v1.22.1 — Fix Mod Card treo
- Call AI trong Mod Card trước **không có timeout + không retry** → 1 call đứng là treo cả pipeline. Nay: **timeout 180s/call** + **auto-retry 3 lần** (backoff, xoay key) cho lỗi tạm thời.

## v1.22.0 — Mod Card: Mở rộng/đào sâu + output XML
- **Chế độ Mở rộng/đào sâu**: thay vì làm theo nghĩa đen, AI đọc **toàn cảnh lorebook**, **bổ sung 3-4 phần** mở rộng, viết chi tiết & bám lore. Chọn mức **nhẹ / vừa / sâu**.
- **"Đào sâu 1 phần"**: mở rộng đúng **một sub-block** (vd `<Appearance>`) trong 1 section, giữ nguyên phần còn lại; xem trước/sửa rồi áp.
- **Sửa độ bền**: output mod script/entry dài chuyển từ JSON sang **XML** → hết lỗi vỡ với card bự.

## v1.21.0 — Mod Card: Mod biến MVU-Zod
- Chế độ **"Mod biến MVU-Zod"**: gom biến trong schema → AI **đổi tên/nghĩa** theo yêu cầu → duyệt bảng old→new → **áp đồng bộ** khắp schema/getvar/initvar/mvu_update (không đụng văn xuôi & runtime MVU).

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
