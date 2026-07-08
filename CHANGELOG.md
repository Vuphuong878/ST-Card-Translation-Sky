# Changelog — SillyTavern Multitools

> Cách cập nhật: mở thư mục cài đặt, chạy `git pull origin main`, rồi **tắt hẳn và chạy lại `start.bat`** (không chỉ F5).

## v1.42.2 — Hub: ghi công tác giả dưới tiêu đề
- Thêm dòng nhỏ dưới "Silly Tavern Multitools": **"✦ Kết hợp của Guillichan × Sky"** — tên hai tác giả phối màu gradient (tím→teal) khớp phong cách tiêu đề, chữ nhỏ gọn không chiếm chỗ.

## v1.42.1 — Dịch Card: sửa nút Dừng/Hủy không dừng call đang treo
- **Triệu chứng**: bấm **Tạm dừng** hoặc **Hủy** nhưng các call AI đang chạy **không dừng** (monitor thấy call treo cả trăm giây), rõ nhất ở giai đoạn **Chiến lược B/C** (dựng từ điển MVU/EJS).
- **Nguyên nhân**: khi proxy **treo** (nhận request nhưng không gửi dữ liệu về), vòng đọc stream `reader.read()` **block vô hạn** chờ dữ liệu. Lệnh abort native của fetch **không cắt được** một `read()` đang kẹt như vậy → call không kết thúc, `finally` không chạy nên vẫn hiện "đang chạy", Dừng/Hủy vô hiệu.
- **Sửa**: thêm `readChunkOrAbort()` — mỗi lần đọc stream được **RACE với tín hiệu Dừng/timeout**; ngay khi bấm Dừng/Hủy (hoặc quá giờ), read đang kẹt bị **reject tức thì** → thoát vòng, kết thúc call, giải phóng. Áp cho **cả 3** loại API (OpenAI-compat, Gemini, Anthropic). Các nút vốn đã gọi đúng `pauseTranslation`/`cancelTranslation` (abort `AbortController`); vấn đề chỉ ở chỗ read stream không phản hồi abort — nay đã xử lý.
- Giai đoạn Chiến lược B/C vốn đã bắt `AbortError` êm (chuyển "tạm dừng"/"đã hủy") nên sau fix, bấm Dừng/Hủy lúc đang dựng từ điển cũng dừng sạch.

## v1.42.0 — Tạo Card: sinh Lorebook BÁM SCHEMA biến (võ lực/trí lực…)
Client báo: sinh batch Lorebook **không dựa theo schema** — vd NPC có chỉ số võ lực/trí lực trong schema nhưng entry tạo ra chẳng liên quan.
- **Nguyên nhân**: code ĐÃ hỗ trợ inject schema (`config.schemaContext`), nhưng (1) tuỳ chọn "bám schema" trong bảng tạo tay **mặc định TẮT**, và (2) luồng **Tạo tự động** (autoCreatorPipeline) **không truyền schema** vào.
- **Sửa**:
  - Bảng tạo tay (`BatchGeneratorPanel`): tuỳ chọn bám schema **mặc định BẬT** (thẻ có schema thì tự dùng; không có thì tự bỏ qua).
  - Luồng Tạo tự động: **build + truyền `schemaContext`** từ `card.data.extensions.mvuzod.schema`.
  - Prompt mạnh hơn (`schemaContextBuilder` + `schemaAddon`): entry mô tả **NHÂN VẬT/NPC BẮT BUỘC gán giá trị cụ thể** cho các chỉ số CÓ TRONG schema (vd "Võ lực: 85, Trí lực: 60"), **dùng đúng tên biến**, không bịa biến ngoài schema, không viết code EJS.
  - Refiner đã bám schema sẵn; luồng "fill entry thiếu" (verifier) kế thừa qua `...config` nên cũng bám schema.

## v1.41.1 — Dịch Card: dịch "phẫu thuật" (surgical) chạy tối đa RPM
Surgical = cơ chế dịch cho field **regex/code**: rút riêng các đoạn chữ Trung ra dịch rồi ghép lại **theo id**, giữ nguyên 100% cấu trúc code (khác với chia chunk cho entry).
- Trước đây surgical **kẹt cứng 4 batch song song** (`PARALLEL_CONCUR = 4`) + giãn khởi động **2000ms** — dù RPM/key nhiều tới đâu cũng chỉ 4 luồng.
- Nay: `PARALLEL_CONCUR = max(4, computePoolConcurrency(config))` → **số batch song song = tổng RPM mọi key × provider** (tối thiểu 4, giữ hành vi cũ cho cấu hình nhỏ); giãn khởi động **2000ms → 150ms** (pickLane đã pace theo RPM nên không cần giãn tay 2s).
- **An toàn không đổi**: mỗi batch đi qua `callProvider → pickLane` nên vẫn **gate RPM** (không 429); các batch **độc lập**, ghép **theo id** nên kết quả không phụ thuộc thứ tự hoàn thành → chất lượng giữ nguyên; nút Dừng vẫn hủy sạch (qua `signal` sẵn có).
- Kết quả: card **nhiều regex/code** dịch **nhanh hơn nhiều** (không còn nút thắt 4 luồng), đồng bộ với cơ chế đa luồng RPM của entry.

## v1.41.0 — Dịch Card: mục/entry LỚN → cắt phần & dịch SONG SONG
Vấn đề: có card entry rất lớn, 1 call Gemini Pro **rất lâu và kém chính xác**.
- **Cắt phần cho entry lớn**: mục >**15.000 ký tự** được cắt thành nhiều phần ~15k tại **ranh giới an toàn** (không cắt giữa code/tag), rồi **dịch SONG SONG** qua pool đa-luồng và **ghép lại** (có `verifySeams` kiểm mối nối). Ví dụ entry 90k → ~6 phần chạy cùng lúc. Mục ≤15k vẫn dịch 1 lần như cũ. (Theo feedback user: 12–15k/lần call cho kết quả tốt nhất.)
- **Kết hợp đa luồng RPM**: các phần của 1 entry chia sẻ **chung ngân sách RPM** với các entry khác (qua `pickLane`/rate-limiter) → không vượt 429; tự cân giữa "nhiều entry song song" và "nhiều phần song song trong 1 entry".
- **Giao diện hiện tiến trình chia phần**: log `🔗 Mục lớn "…" (90.000 ký tự) → chia ~6 phần, dịch SONG SONG`; và ở dòng field: `🔗 Mục lớn — chia 6 phần, đang dịch SONG SONG (đã xong 3/6 phần)`. Trước đây FE chỉ hiện chi tiết chunk khi >100k nên entry 90k không thấy gì — nay bám theo số phần thật engine báo.
- **An toàn**: bấm Dừng vẫn hủy sạch mọi phần; nếu lỗi giữa chừng, các phần đã xong được lưu để **chạy tiếp** (resume) thay vì dịch lại từ đầu. Chunk size code-heavy vẫn giữ 12k cho an toàn.
- *Đánh đổi*: các phần dịch song song không thấy bản dịch của phần trước (chỉ thấy ranh giới gốc) nên thuật ngữ có thể lệch nhẹ giữa các phần — được bù bằng `verifySeams` + từ điển MVU + glossary. Đổi lại tốc độ nhanh hơn nhiều cho entry lớn.

## v1.40.2 — Dịch Card: log dễ đọc, tường minh (#8b + dò log)
- **#8b — log bộ "AI tự sửa lỗi"**: khi một bản-sửa của AI bị loại, log cũ ghi `❌ Rejected … Fix worsened severity score: 3 → 522` rất khó hiểu (dễ tưởng tool làm hỏng). Nay ghi rõ tiếng Việt, đúng bản chất **an toàn**: `🛡️ Giữ bản gốc cho "…": bản AI sửa lại còn NHIỀU LỖI HƠN bản gốc (điểm lỗi 3 → 522). KHÔNG áp dụng để không làm hỏng thẻ.` Toàn bộ lý do loại bản sửa (ngắn/dài bất thường, mất macro, lệch ngoặc, hỏng regex…) đều Việt hoá + nói rõ "giữ bản gốc". Dòng tổng kết: "đã áp dụng N bản sửa tốt · giữ nguyên M mục".
- **Dò log Dịch Card**: Việt hoá + làm rõ ~50 dòng log hay gặp — *Đang dịch / Xong lô / Đã dừng dịch / Tiếp tục / Kiểm tra lô / mục bị trống → thử lại / dịch RIÊNG từng mục*, các *Chiến lược B (đồng bộ biến MVU)* & *C (đồng bộ EJS)*, đối chiếu chéo lô, và log tổng kết "🎉 Dịch xong: X thành công, Y lỗi". (Log dev trong console giữ nguyên.)

## v1.40.1 — Tạo Card: nút Dừng cho "Tạo thẻ từ truyện" (#9.4)
- **#9.4 — Dừng hẳn**: thêm `AbortController` + nút **"■ Dừng"** (hiện khi đang quét/tạo). Truyền `signal` xuống `scanCharacters` / `generateCardFromStory` / `generateCardsForMany` → `callAI` huỷ fetch ngay, loop kết thúc, không chạy nền. Trước đây truyền `undefined` nên không dừng được.
- **#9.3 — giữ input khi đổi tab**: kiểm tra thấy trang này **đã** dùng `usePersistedState` cho toàn bộ truyện/tuỳ chọn/roster/thẻ (localStorage) — đổi tab/F5 không mất. Giữ nguyên.
- *(Còn #9.1 web-search rộng hơn + #9.2 bỏ ép JSON: cần bạn chỉ rõ thao tác/feature cụ thể để sửa đúng, tránh phá parser JSON của các phần MVU/Zod/EJS đang cần JSON — xem ghi chú khi bạn về.)*

## v1.40.0 — Tạo Card: ép tiếng Việt (#8a) + đa luồng tối đa RPM (#11)
- **#8a — Tạo thẻ từ truyện ra tiếng Việt**: truyện gốc thường tiếng Trung → model hay chép nguyên văn. Thêm `LANGUAGE_RULE` bắt buộc: TOÀN BỘ thành phẩm phải là **tiếng Việt tự nhiên**, dịch tên riêng (Hán→Hán Việt, Nhật→Romaji, Hàn→Romanization), rà soát xoá mọi chữ Hán/Kanji/Hangul sót; chỉ giữ macro `{{user}}`/`{{char}}`.
- **#11 — Đa luồng chạy tối đa RPM (Tạo Card)**: thêm `computePoolConcurrency(profile)` (= Σ pool: RPM chính+phụ × số key). Thay các trần cứng cũ (`Math.min(8/4/24/10)`) ở: tạo thẻ nhiều nhân vật, quét nhân vật, sinh Lorebook hàng loạt, refiner Lorebook, wiki scraper. `RPMLimiter` (chốt-giờ-bắt-đầu) sẵn có ở client.ts giữ không vượt 429.
- **Rà soát #11 các app khác**: Trích Card đã có (v1.36.2); Tạo Preset là chat tuần tự nên chỉ round-robin key (không có gì để song song); Mod Card là thao tác mod đơn/tuần tự theo thiết kế.

## v1.39.1 — Dịch Card: gọn giao diện API cấu hình chính (như provider)
Vì cấu hình chính nay hành xử y như 1 provider (đa key + RPM riêng), gom UI cho gọn:
- **Gộp "API Key" + "API Key Rotation" → MỘT ô** đa key: mỗi dòng hoặc dấu phẩy 1 key. Key đầu = key chính, còn lại xoay vòng; engine nhân RPM theo tổng số key (như provider). Bỏ khối "API Key Rotation" xổ ra riêng.
- **Gom phần RPM**: RPM model chính 1 hàng (kèm chú "× số key = số luồng"); khi bật Model phụ thì Model phụ / RPM phụ / Ngưỡng ký tự nằm gọn trên **1 hàng grid** (như ProviderCard).
- Không đổi logic/dữ liệu (vẫn `apiKey` + `apiKeys[]`), chỉ gọn giao diện.

## v1.39.0 — Dịch Card: Lorebook dịch từng-mục-song-song + Dừng hẳn (#2,#6,#7,#10)
- **#6/#7 — hết trộn/đè bản dịch**: chế độ Lorebook "Hàng loạt" trước đây gộp nhiều mục vào **1 call AI** rồi gán kết quả **theo chỉ số** — nếu AI trả sai thứ tự/số lượng thì mục này nhận nhầm bản dịch của mục kia ("dịch đè"), và khi 1 mục lỗi thì **retry cả nhóm** (dịch lại mục đã xong). Nay **mỗi mục là 1 request riêng**, đi qua `translateSingleField` (có khoá `inFlightPaths` chống 2 luồng ghi cùng field, chunk + resume, retry riêng từng mục). Không còn prompt gộp → không thể trộn/đè.
- **Tốc độ** vẫn cao nhờ **đa luồng RPM (#1)** dispatch nhiều mục song song (số luồng = tổng RPM mọi key × provider).
- **#10** — bỏ ô **"Số mục mỗi đợt"** (và "Số batch gửi song song" ở 1.37.0); số luồng tự tính theo RPM.
- **#2 — Dừng/Hủy dừng HẲN**: (a) đầu `translateSingleField` chặn set trạng thái "đang dịch" nếu đã bấm Dừng (tránh task nền set lại sau khi đã reset); (b) thêm bộ **quét dọn nhiều lần** trong ~2.6s sau khi Dừng/Hủy để đưa mọi mục "đang dịch" còn sót về "chờ". Đã test: sau khi Hủy, log ngừng hẳn (không dịch nền), không mục nào kẹt "đang dịch".
- Đã test live với API thật (gemini-3-flash): xác nhận per-entry (không còn "Batch translating N entries"), Hủy dừng sạch.

## v1.38.0 — Trích Card: đổi vai nhanh + cờ đệ quy mặc định + xuất LB nhân vật
- **#3 Đổi vai Chính/Phụ**: ở mục 3, **bấm vào badge vai** (★Chính / Phụ / vai?) của nhân vật để đổi qua lại — đang Chính → Phụ, còn lại → Chính. Cập nhật ngay, giữ khi sắp xếp.
- **#4 Mặc định chống đệ quy**: mọi entry Lorebook xuất ra (LB chuẩn + character_book nhúng) nay mặc định **`excludeRecursion:true`** (Non-recursable) **+ `preventRecursion:true`** (Ngăn đệ quy tiếp theo).
- **#5 Xuất Lorebook nhân vật**: thêm nút **"Tải Lorebook nhân vật .json"** ở mục 7 — xuất riêng một Lorebook chỉ gồm các nhân vật đã tạo ở mục 4 (mỗi người 1 entry, kích hoạt theo tên + tên gốc + biệt danh), **không cần** làm bước Lorebook bối cảnh/vật phẩm.

## v1.37.0 — Dịch Card: đa luồng chạy tối đa RPM (mọi key × provider)
- **Số luồng song song** nay tự tính = **tổng ngân sách RPM toàn pool**: mỗi provider (config chính + provider phụ), **mỗi API key** đóng góp `(RPM model chính + RPM model phụ)`. Ví dụ: config chính 4 key + provider phụ 2 key, mỗi key 5+20 rpm → **(5+20)×4 + (5+20)×2 = 150 luồng**.
- **Sửa**: trước đây thêm key vào *cấu hình chính* không tăng tốc vì số luồng lấy từ ô "Số batch gửi song song" (mặc định 6). Nay engine (`computePoolConcurrency`) cộng thẳng theo key×RPM → thêm key = chạy hết công suất.
- Bỏ ô nhập **"Số batch gửi song song"** (tự tính, không cần chỉnh tay). Provider = phân biệt nguồn AI (Google/Amazon…); mỗi key = nhân công suất.
- An toàn 429: `pickLane` vẫn **chờ đúng nhịp RPM** theo từng (provider, model) nên luồng cao cỡ nào cũng không vượt RPM user nhập. Trần cứng 512 chỉ để chặn gõ nhầm.
- (Áp cho cả luồng dịch Lorebook hàng loạt lẫn EJS; các mục #6/#7/#10 còn lại của batch sẽ xử lý tiếp.)

## v1.36.5 — Dịch Card: tải thẻ qua link Discord (tự sửa link webp)
- **Vấn đề**: dán link ảnh thẻ dạng `media.discordapp.net/...&format=webp&width=&height=` thì tải về là **WEBP đã resize** → Discord đã **re-encode ảnh, xoá mất chunk `tEXt` (chara/ccv3)** chứa dữ liệu thẻ trong PNG. Kể cả tải được cũng chỉ ra ảnh rỗng, không có thẻ. (Không phải lỗi app — do link proxy của Discord.)
- **Sửa**: khi phát hiện link Discord, tự **chuẩn hoá** trước khi tải: đổi host `media.discordapp.net → cdn.discordapp.com` (file gốc), **bỏ** `format/width/height/quality`, chỉ giữ chữ ký `ex/is/hm`. `cdn` trả **PNG gốc còn nguyên thẻ** và có CORS (`Access-Control-Allow-Origin: *`) nên trình duyệt tải được.
- Link không phải Discord giữ nguyên. Có ghi log khi đã chuẩn hoá.
- Đã test end-to-end: dán đúng link webp của client → nạp đủ thẻ (spec chara_card_v3, 307 mục Lorebook, 939 field dịch).

## v1.36.4 — Trích Card: HOTFIX treo trang khi tải (regression 1.36.2)
- **Triệu chứng**: import truyện xong không hiện nội dung, không đếm ký tự, các nút không phản hồi.
- **Nguyên nhân**: v1.36.2 thêm `const POOL_CONC_CAP` (top-level) đặt SAU đoạn init gọi `applyProfileToFields()→updatePoolStatus()→poolConcurrency()`. Vì `const` không được hoisted (TDZ), lúc init chạy tới đã ném `ReferenceError: Cannot access 'POOL_CONC_CAP' before initialization` → **toàn bộ init dừng** → không gắn được listener (file input, ô đếm ký tự, các nút…).
- **Sửa**: bỏ hằng số top-level, **inline thẳng số 64** trong `poolConcurrency` → hết TDZ.
- Đã test lại: load không còn lỗi console; `poolStatus` render; nhập/import văn bản đếm ký tự đúng; nút Xóa/Làm lại, Quét hoạt động.
- ⚠️ Ai đang chạy **1.36.2 hoặc 1.36.3** cập nhật ngay (2 bản đó dính lỗi này).

## v1.36.3 — Trích Card: nút "Xóa / Làm lại" ở mục 4 & 5
Theo báo cáo client (PhatSiz): bấm tạo lại thì tool chỉ *"Tiếp tục tạo — bỏ qua các mục đã tạo"* nên cứ hiện kết quả cũ, không có cách làm lại từ đầu.
- Thêm nút **"🗑 Xóa / Làm lại"** cạnh nút chính ở **mục 4 (Tạo thẻ)** và **mục 5 (Tạo Lorebook)**.
- Mục 4: reset cache đã tạo (`genDone`/`genSelKey`) + xóa ô kết quả + log → lần bấm tới tạo lại toàn bộ.
- Mục 5: reset trạng thái trích (`wbState`) + kết quả + log → tạo lại từ đoạn đầu.
- Có chặn khi đang chạy tác vụ (bấm sẽ nhắc dừng trước).

## v1.36.2 — Trích Card: mở full luồng theo RPM + chờ nhịp chống 429
- **Bỏ trần 20** → số luồng song song = **đúng tổng RPM của model đang dùng** (trần cứng 64 chỉ để chặn gõ nhầm). Mỗi API key thêm vào là cộng thẳng luồng: flash RPM 17 × 3 key → **51 luồng bắn cùng lúc**.
- Bước **Quét** chỉ tính RPM **model phụ** (flash) cho số luồng (đúng "17+17+17"); model chính vẫn được dùng làm **dự phòng** khi flash cạn quota. Bước **Tạo thẻ** dùng ngân sách chung 2 model.
- **Chờ nhịp RPM (`acquireConn`)**: khi mọi lane đã đầy quota trong 60s, lane **chờ** tới khi có slot thay vì bắn bừa. Nhờ đó luồng có thể rất cao mà **tổng call/phút vẫn không vượt RPM** → hạn chế 429. (RPM=0 = không giới hạn → chạy tự do như cũ.)

## v1.36.1 — Trích Card: số luồng song song bám theo RPM
- **Sửa lỗi kẹt 4 luồng**: `poolConcurrency` trước tính số luồng = (provider × số key × số model), **bỏ qua RPM** — nên đặt RPM 17 cho flash mà vẫn chỉ chạy 4 luồng.
- Nay số luồng = **ngân sách RPM của (các) model dùng cho tác vụ** (sàn = số lane cũ, trần 20). Ví dụ: model phụ flash RPM 17, 1 key → ~17 luồng; 2 key → chạm trần 20.
- Bước **Quét** truyền `tier` model phụ (flash) vào để số luồng phản ánh đúng lane flash; bước **Tạo thẻ** dùng ngân sách chung. RPM=0 (không đặt) → giữ hành vi cũ.

## v1.36.0 — Trích Card: sắp xếp + quét trùng lặp & tự gộp nhân vật
Theo đề xuất client (PhatSiz) cho bước 3 (Chọn nhân vật):
- **Sắp xếp danh sách**: ô chọn *Số lần xuất hiện (mặc định)* · *Tên A→Z* · *Vai (Chính→Phụ→NPC)*. Nhớ lựa chọn.
- **Quét trùng lặp tự động** (nút "🔍 Quét trùng & gợi ý gộp") — làm 2 tầng:
  1. **Deterministic** (không tốn API): gộp các nhân vật CHẮC CHẮN trùng — cùng tên gốc, cùng tên Việt, hoặc đã chung biệt danh.
  2. **AI**: gửi danh sách (tên/tên Việt/vai/mô tả) cho AI nhận diện **cùng một người dù tên khác hẳn** (biệt danh), giữ riêng các giai đoạn "(Thiếu niên)/(Trưởng thành)".
- Kết quả hiện thành **nhóm nghi trùng để bạn DUYỆT** — bấm **"Gộp nhóm"** từng nhóm, **"Gộp tất cả"**, hoặc **"Bỏ qua"**. Không tự gộp bừa.
- Gộp giữ **vai/giới tính cao nhất**, **cộng số lần xuất hiện**, tên phụ thành biệt danh; vẫn có nút **"Tách"** để hoàn tác.

## v1.35.0 — Mod Card: mod riêng Lorebook (không cần cả thẻ)
Theo yêu cầu client (*add cả card vào ST bị lag → muốn mod & xuất riêng Lorebook*):
- **Tải thẳng 1 file Lorebook** (JSON có `entries` — cả format ST `{entries:{...}}` lẫn array). Tool **tự nhận diện** card hay lorebook khi tải.
- Chạy **đầy đủ chức năng mod** trên các mục lorebook (mở rộng/đào sâu, rule, prompt tùy chỉnh, đồng bộ từ khóa).
- **Xuất RIÊNG Lorebook** (nút "⬇️ Tải Lorebook JSON") — **giữ đúng format gốc** (object/array, field `key`/`keys`, `uid` đều bảo toàn; chỉ nội dung/từ khóa được mod thay đổi) → import thẳng vào Worldbook của ST, không phải add cả thẻ.
- Có badge **"📖 Chế độ Mod LOREBOOK"** khi đang ở mode này.
- *Lưu ý:* đổi tên biến MVU-Zod cần schema (nằm trong script của thẻ) nên với lorebook rời không có sẵn — dùng mở rộng/rule/prompt tùy chỉnh (các chức năng chính) vẫn đủ.

## v1.34.0 — Trích Card: model riêng cho Quét vs Tạo thẻ
Theo yêu cầu client (*"scan bằng flash cho nhanh, model scan với tạo khác nhau"*):
- Thêm toggle **"⚡ Quét bằng model phụ (flash — nhanh)"** ở bước 3. Bật → **bước Quét** dùng **model phụ** của mỗi provider (thường là flash, nhanh & rẻ); **bước Tạo thẻ** vẫn dùng **model chính** (pro/chất lượng).
- Tận dụng đúng cặp **model chính/phụ** đã có ở mục **Pool đa-luồng** — không thêm rối. Cách dùng: đặt Model chính = model tốt, Model phụ = flash cho từng provider, bật toggle → xong.
- Vẫn giữ nguyên **đa-luồng + đa-provider + rate-limit** (engine thêm tham số `tier` để ép model phụ khi quét, fallback model chính nếu phụ hết RPM/không có).

## v1.33.1 — Trích Card: gọn lại câu log retry
- Log retry trước đây đọc kỳ (*"gặp lỗi **HTTP** Bị lọc"* — chữ "HTTP" đứng trước "Bị lọc"/"Timeout" nghe sai vì đó không phải mã HTTP). Nay gọn và đúng: **"Đoạn 3: Bị lọc → thử lại sau 4.5s (lần 3)"**. Lỗi HTTP theo mã hiện đầy đủ **"HTTP 503"**.
- Nhắc lại ý nghĩa nhãn: **Bị lọc** = API trả rỗng / bị bộ lọc an toàn chặn (thường do nội dung nhạy cảm) · **Timeout** = quá 180s không phản hồi (proxy chậm/treo) · **Lỗi mạng** = mất kết nối. Đây là log *đang thử lại*, chỉ khi hết lượt mới bỏ đoạn.

## v1.33.0 — Đồng bộ retry chống "API kẹt" cho cả 5 app
Áp cơ chế retry (như đã làm cho Trích Card) sang 4 app còn lại — API kẹt/treo/timeout/5xx thì **cứ thử lại**, lỗi không sửa được thì dừng ngay:
- **Dịch Card:** thêm **TIMEOUT** cho request dịch (OpenAI/Claude/Gemini) — proxy chết/treo sẽ bị **abort → thử lại** thay vì kẹt vĩnh viễn (trước đây fetch không có timeout nên treo là đứng luôn). `maxRetries` mặc định **3→5**. (429/5xx/rỗng vốn đã retry.)
- **Tạo Card:** trước chỉ thử lại khi có **≥2 API key**; nay **retry cả khi 1 key**, và bắt thêm timeout/504/mạng/quá tải, có backoff.
- **Preset:** trước **không có retry** nào; nay thêm hẳn **retry + timeout** (xoay provider mỗi lần thử).
- **Mod Card:** tăng lượt (3→5) + bắt thêm timeout tiếng Việt/rỗng.
- Tất cả: lỗi **không sửa được** (sai API key, HTTP 400/401) **dừng ngay**, không thử lại vô ích.

## v1.32.2 — Trích Card: tăng retry + tối ưu bộ lọc NSFW
Theo log client (đoạn bị **timeout** và đoạn bị **bộ lọc chặn (trả rỗng)** đều **fail luôn không thử lại**):
- **Timeout nay được thử lại:** trước đây thông báo timeout tiếng Việt ("Yêu cầu quá hạn…") **không khớp** điều kiện retry (chỉ khớp "timeout"/tiếng Trung) → bỏ luôn. Nay khớp → **thử lại**.
- **Response RỖNG do bộ lọc an toàn nay được thử lại:** trước đây rỗng = bỏ đoạn ngay. Nay coi là lỗi tạm thời → thử lại; vì chạy qua **pool** nên mỗi lần thử **đổi lane/model khác** → nội dung NSFW thường lọt ở model khác. `chat()` cũng ném lỗi khi content rỗng (không chỉ null) để bắt trọn trường hợp bị lọc.
- **Số lượt retry 3 → 6**, backoff ngắn lại (1.5s→tối đa 10s).
- **Framing chống-từ-chối:** prompt quét nhân vật & trích Lorebook (khi bật NSFW) đổi thành "tác vụ TRÍCH XUẤT SIÊU DỮ LIỆU trung lập, chỉ liệt kê tên/thiết lập, KHÔNG từ chối, KHÔNG chèn cảnh báo" → giảm tỉ lệ model từ chối.
- **Không phí lượt:** lỗi không sửa được (sai API key, HTTP 400/401) vẫn **dừng ngay**, không thử lại vô ích.

## v1.32.1 — Trích Card: quét kèm giới tính + phân loại vai (Chính/Phụ/NPC)
Nâng cấp nút **"Kèm mô tả danh tính khi quét"** (bước 3, theo feedback client): mỗi nhân vật quét ra nay có thêm
- **Giới tính**: badge **♂** (nam) / **♀** (nữ);
- **Vai trò/tầm quan trọng**: **★ Chính** (nhân vật trung tâm / nam–nữ chính) · **Phụ** (nhân vật phụ có vai) · **NPC** (vai mờ / người qua đường).

Hiển thị badge ngay cạnh tên trên thẻ nhân vật → **nhìn phát biết ngay ai chính ai phụ**, khỏi cần đọc truyện, để quyết định tạo thẻ chi tiết hay đơn giản (cho NPC phụ). Nhân vật xuất hiện ở nhiều đoạn thì **lấy vai cao nhất** (Chính > Phụ > NPC). Thông tin được lưu/tải cùng phiên truyện.

## v1.32.0 — Trích Card: fix thay {{user}} + NSFW/Jailbreak cho bước quét
- **Fix bug thay {{user}} không nhất quán** (lúc được lúc không): trước đây chỉ **dặn AI** thay tên nhân vật thành `{{user}}` trong prompt, AI không tuân thủ ổn định → nhiều chỗ (header, tên gốc, trong thân thẻ, thẻ nhân vật khác nhắc tới) vẫn để nguyên tên. Nay **thay DETERMINISTIC** sau khi sinh: mọi lần xuất hiện của tên (kèm biệt danh nếu khớp nhân vật đã quét) → `{{user}}`, ở **cả header + key + toàn thân thẻ + luồng Sửa**, có **biên ký tự** nên không thay lẹm phần chữ dính (vd "Trần Duyệtxyz" giữ nguyên).
- **Bước 3 (Quét nhân vật) nay có NSFW/Jailbreak/Gomorrah**: thêm 3 toggle **đồng bộ 2 chiều** với bước 4 (đổi bên nào cũng cập nhật bên kia + lưu). Prompt quét nay **áp NSFW** khi bật → quét truyện NSFW **không bỏ sót nhân vật** vì nội dung nhạy cảm. (Jailbreak/Gomorrah vốn đã áp cho bước quét qua system prompt chung, nay hiển thị/điều khiển được ngay ở bước 3.)

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
