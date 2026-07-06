# Changelog — SillyTavern Multitools

> Cách cập nhật: mở thư mục cài đặt, chạy `git pull origin main`, rồi **tắt hẳn và chạy lại `start.bat`** (không chỉ F5).

## v1.31.1 — Trích Card: thiết kế lại UI pool cho dễ dùng
Bỏ cách quản lý pool bằng "gộp nhiều Cấu hình API" (rối). Nay:
- **Nút "➕ Thêm provider"** → mở **popup đầy đủ** (tên, định dạng, Base URL, đa-key, model chính + RPM, model phụ + RPM, ngưỡng ký tự) → **Lưu** hiện thành **1 dòng** "Provider 2/3…" với chấm xanh (đủ) / đỏ (thiếu).
- **Bấm vào dòng** để mở lại popup **sửa**; mỗi dòng có nút **Xóa**.
- **Provider 1** = cấu hình chính phía trên (model phụ/RPM/ngưỡng của P1 chỉnh ngay trong mục Pool).
- Engine đa-luồng (round-robin, rate-limit, model chính/phụ, đa-key) **giữ nguyên** — đã test lại trên trình duyệt: thêm/sửa/xóa provider, round-robin P1→P2, xoay key, trạng thái pool cập nhật đúng.

## v1.31.0 — Trích Card: full pool đa-provider + đa luồng (như Dịch Card)
Trước đây Trích Card chỉ có **đa-key**. Nay có **đầy đủ** như Dịch Card:
- **Đa provider chạy song song:** mỗi **Cấu hình API** (hệ chuyển đổi sẵn có) = 1 provider. Vào mục **"🔀 Pool đa-luồng"**, bật **"Gộp cấu hình NÀY vào POOL"** ở **≥2 cấu hình** → engine rải call **round-robin**, chạy **song song** nhiều provider. Áp cho: **quét nhân vật**, **tạo thẻ hàng loạt**, **trích Lorebook** (3 bước nặng nhất).
- **Model chính/phụ theo NGƯỠNG KÝ TỰ:** mỗi provider đặt được model phụ (rẻ/nhanh) + ngưỡng ký tự — entry ngắn hơn ngưỡng → tự dùng model phụ.
- **RPM riêng mỗi provider** (× số key), rate-limit trượt 60s tách theo (provider, model) → không đụng hạn mức nhau; **đa-key xoay vòng** theo từng provider.
- **Số luồng song song** tự tính theo tổng (provider × key). Chỉ 1 cấu hình → chạy tuần tự có stream như cũ.
- *Kỹ thuật:* toàn bộ call giờ resolve "lane" (provider+model+key) mỗi lần gọi; continuation dùng cờ per-call (an toàn khi song song). Engine đã test round-robin/threshold/rate-limit/runPool trên trình duyệt.

## v1.30.0 — 4 fix theo báo lỗi client (Dịch Card + Tạo Card)
**Dịch Card:**
- **Ngưỡng model phụ đo bằng SỐ KÝ TỰ** (không phải token). Trước đây path đa-provider quy đổi token ≈ ký tự/4, nên đặt ngưỡng 800 thì entry ~2.200 ký tự (~550 token) vẫn lọt → bị dịch bằng model phụ (flash) ngoài ý muốn. Nay so thẳng số ký tự; nhãn đổi thành "Ngưỡng ký tự".
- **Làm rõ 2 nút sửa** trong Kiểm Tra Lỗi Dịch: 🟢 **Sửa nhanh** = hàm của app (tức thì, KHÔNG tốn API); 🟣 **AI Sửa** = gọi AI cho lỗi phức tạp (tốn quota). Thêm dòng chú thích + tooltip cho từng nút.

**Tạo Card (MVUZOD Studio):**
- **Import/Paste nhận cả Zod schema `.js`** (định dạng gốc `import { registerMvuSchema }...; export const Schema = z.object({...})`), không chỉ JSON. Trước đây dán file schema `.js` báo lỗi "Unexpected token 'z'"; file input cũng chỉ hiện `.json`. Nay tự nhận diện Zod-code → parse đúng (đã test 2 file mẫu ra 17 fields), và mở rộng chọn `.js/.ts/.txt`.
- **Entry `[initvar]` nhúng vào card có `disable=true`** (field ST-native). Trước chỉ đặt `enabled=false` mà thiếu `disable`, khiến SillyTavern coi entry là **bật**. *(Cần kiểm tra lại trong ST để xác nhận.)*

## v1.29.1 — Dịch Card: chống giật khi dịch card lớn (giới hạn log)
- Mảng log trong bộ nhớ trước đây **phình vô hạn** (mỗi field/chunk/retry thêm 1 dòng → hàng nghìn dòng với card lớn). Mỗi lần thêm phải copy + lọc cả mảng → **O(n²)**, khiến app **giật dần** về cuối lượt dịch và ăn RAM. Nay **giữ tối đa 800 dòng gần nhất** (panel vốn chỉ hiển thị 300 dòng cuối) → mượt đều, RAM ổn định.

## v1.29.0 — Dịch Card: gọn hiển thị lỗi 5xx + tự retry (không skip)
Sửa 2 vấn đề user báo khi proxy trả lỗi **524 (Cloudflare timeout)**:
- **Hiển thị lỗi bị xổ dài:** trước đây nhồi nguyên trang HTML lỗi của Cloudflare vào dòng lỗi → xổ dài cả màn hình. Nay message lỗi HTTP được **rút gọn ở nguồn** (trang HTML → chỉ lấy tiêu đề, vd `524: A timeout occurred`), cộng **line-clamp 3 dòng** + tooltip đầy đủ khi rê chuột.
- **Gặp 524 là skip luôn, không thử lại:** trước đây chỉ field lớn (chia chunk) mới auto-retry ở cấp field; field nhỏ gặp lỗi tạm thời là bỏ qua ngay. Nay **mọi lỗi tạm thời** (5xx/timeout/mất mạng) đều **tự thử lại** (kể cả field nhỏ), có log rõ + **backoff tăng dần** để proxy/CDN kịp hồi.

## v1.28.0 — Dịch Card: quy tắc phiên âm tên riêng tiếng Hàn (áp cho A/B/C)
Theo yêu cầu client (PhatSiz), bổ sung **quy tắc phiên âm DANH TỪ RIÊNG** đầy đủ 4 nhóm, đặc biệt **tiếng Hàn** (trước đây thiếu):
- **Trung** → âm Hán Việt cho tên riêng (vd 李明 → Lý Minh), không dùng Pinyin.
- **Nhật** → Romaji (vd 田中 → Tanaka), không dùng Hán Việt.
- **Hàn (MỚI)** → Standard Revised Romanization (vd 金泰亨 → Kim Tae-hyung, 濟州島 → Đảo Jeju, 仁川 → Incheon), **không** dùng Hán Việt kể cả khi viết bằng Hanja.
- **Tây/Fantasy** phiên âm sang CJK (vd 维拉→Vera, 亚瑟→Arthur) → khôi phục chữ Latin gốc.

Áp dụng cho **cả 3 chiến lược dịch**: **A** (dịch chính), **B** (Sync MVU — dịch tên biến), **C** (Sync EJS — dịch tên entry/keyword). Gom 4 rule vào 1 hằng số dùng chung (`PROPER_NOUN_RULES`) để về sau sửa 1 nơi là đồng bộ mọi chiến lược.

## v1.27.0 — Audit: củng cố bảo mật + độ bền (không đổi tính năng)
Rà soát toàn bộ Project + 5 app, sửa các điểm rủi ro/nợ kỹ thuật:
- **Bảo mật dev-server (chống CSRF):** các endpoint gây side-effect (`/api/update`, `/api/downgrade`, `/api/dump-config`, `/api/debug-log`, `/api/progress/save|delete`, `/api-proxy/custom`) nay **chỉ chấp nhận request same-origin**. Trước đây một website bất kỳ đang mở trong cùng trình duyệt có thể lén gọi `git reset --hard` (mất việc chưa commit) — nay bị chặn.
- **Chống vỡ khi tràn localStorage:** bọc an toàn mọi `localStorage.setItem` (chat dài / file đính kèm lớn vượt ~5MB trước đây ném lỗi làm **vỡ giao diện**, nay chỉ cảnh báo nhẹ và tiếp tục).
- **Vệ sinh repo:** gỡ thư mục rác `_dev-scratch/` (19 file) khỏi git + thêm vào `.gitignore`.
- **Build:** gỡ 1 cảnh báo `INEFFECTIVE_DYNAMIC_IMPORT` (bỏ dynamic-import thừa của `apiClient` trong `aiVerify`); cảnh báo còn lại ở `surgical` là do circular-dep, giữ nguyên có chủ đích.

## v1.26.0 — Hub tự quét cập nhật 30' + fix export nhiều nhân vật + tooltip nút
- **Hub tự kiểm tra cập nhật mỗi 30 phút**: nếu có commit mới hơn lần bạn đã bỏ qua → tự bật popup báo. Không làm phiền lặp lại cùng một bản; không đè lúc đang cập nhật.
- **[Trích Card] Fix xuất thẻ nhiều nhân vật** (feedback PhatSiz): trước đây tạo 39 nhân vật 1 lượt thì cả 39 bị **nhồi hết vào ô Mô tả** của 1 thẻ. Nay **mỗi nhân vật thành 1 mục Lorebook riêng**, kích hoạt theo **tên + tên gốc + biệt danh**, để test/bật từng nhân vật độc lập. Ô Mô tả dùng bối cảnh chung (nếu có) hoặc ghi chú danh sách. Thẻ 1 nhân vật giữ nguyên như cũ.
- **[Trích Card] Tooltip chú thích 6 nút "Nội dung cần tạo"**: mỗi nút có icon **ⓘ** — rê chuột hoặc bấm để xem giải thích nút đó tạo ra gì (gồm cả "Quần tượng nhân vật phụ").

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
