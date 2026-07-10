# 🎴 SillyTavern Multitools

**Tiếng Việt** | [English](README.en.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

> **Bộ 5 công cụ giúp dịch & làm thẻ nhân vật SillyTavern — chạy hoàn toàn trên máy bạn.**
> Kết hợp của **Guillichan × Sky**.

Dành cho **dịch giả** và người làm card: dịch thẻ sang Tiếng Việt bằng AI mà **không làm vỡ code, regex, lorebook hay macro** `{{char}}` `{{user}}`.

Mọi thứ chạy trên máy bạn — **API key không gửi đi đâu cả**, không qua máy chủ trung gian nào.

---

## 📦 Trong bộ có gì?

Mở app lên, bên trái là thanh chuyển giữa 5 công cụ. **Đổi qua lại thoải mái — việc đang chạy KHÔNG bị ngắt.**

| | Công cụ | Dùng để làm gì |
|---|---|---|
| 🌐 | **Dịch Card** | Dịch thẻ nhân vật sang Tiếng Việt. *Đây là công cụ chính.* |
| 🃏 | **Tạo Card** | Tạo thẻ mới từ truyện, làm Lorebook, Regex, biến MVU/ZOD, giao diện game. |
| 🎛️ | **Tạo Preset** | Tạo / chỉnh Preset & Regex Script cho SillyTavern bằng cách chat với AI. |
| 🛠️ | **Mod Card** | Sửa / mở rộng một thẻ có sẵn theo yêu cầu của bạn (viết thêm, đào sâu…). |
| 🔍 | **Trích Card** | Đọc truyện → tự trích ra nhân vật & Lorebook. |

---

## 🚀 Cài đặt lần đầu (làm 1 lần duy nhất)

### Bước 1 — Cài 2 phần mềm nền
- **[Node.js](https://nodejs.org/)** — chọn bản **20 trở lên** (tải về, cài như phần mềm bình thường, cứ Next → Next).
- **[Git](https://git-scm.com/downloads)** — cài mặc định, không cần đổi gì.

> Cài xong nên **khởi động lại máy** một lần cho chắc.

### Bước 2 — Tải mã nguồn về
Mở **Command Prompt** (bấm phím Windows → gõ `cmd` → Enter), rồi dán từng dòng:

```bash
cd C:\
git clone https://github.com/kubi2811/ST-Card-Translation-Sky.git
```

### Bước 3 — Chạy
Vào thư mục vừa tải, **bấm đúp file `start.bat`**.

- Lần đầu sẽ **tự cài thư viện** (hơi lâu, vài phút — cứ để yên, đừng tắt).
- Xong sẽ tự mở trình duyệt ở **http://localhost:5173**.
- Có vài **cửa sổ đen nhỏ** hiện ra — đó là 3 công cụ phụ đang chạy. **Đừng tắt chúng.**

> Những lần sau chỉ cần bấm đúp **`start.bat`** là xong.

---

## 🔄 Cập nhật phiên bản mới

**Cách 1 (dễ nhất):** trong app, bấm nút **"Cập nhật"** ở cột trái → chờ xong → **tắt hẳn app rồi chạy lại `start.bat`** (không phải chỉ bấm F5).

**Cách 2:** bấm đúp file **`update.bat`**.

<details>
<summary>⚠️ Nếu bấm Cập nhật bị lỗi / kẹt — bấm vào đây</summary>

<br>

Mở **Command Prompt** ngay trong thư mục cài đặt, chạy lần lượt:

```bash
git fetch origin main
git reset --hard origin/main
npm install
```

Rồi chạy lại `start.bat`. Cách này **luôn được**, và **không làm mất** thẻ đang dịch, tiến trình, hay file trong `dev_data`.

</details>

---

## 📖 Dịch một thẻ — 5 bước

### 1️⃣ Nhập API Key
Cột trái, mục **API Configuration**:
- Chọn nhà cung cấp: **Gemini / OpenAI / Claude / DeepSeek / Qwen**, hoặc proxy riêng của bạn.
- Dán **API Key**. Dán được **nhiều key** (mỗi key một dòng) → chạy nhanh hơn nhiều.
- Chọn **Model** → bấm **Test Connection** → thấy báo xanh là ngon.

> 💡 Càng nhiều key + nhiều nhà cung cấp → càng nhiều luồng chạy song song → dịch càng nhanh. App **tự canh đúng giới hạn RPM**, không lo bị khoá.

### 2️⃣ Nạp thẻ
Mục **Character Card**: **kéo–thả** file `.json` hoặc `.png` vào ô, hoặc **dán link** thẻ rồi bấm **Tải**.

### 3️⃣ Chọn phần muốn dịch
Tích các nhóm: Cốt lõi, Lời mở đầu, Lorebook, Từ khoá, Regex, Script… (để mặc định bật hết là ổn).

### 4️⃣ Bấm **Dịch**
- Xem tiến trình chạy trực tiếp. **Tạm dừng** hoặc **Dừng** bất cứ lúc nào.
- Tiến trình **tự lưu** — lỡ đóng tab, mở lại vẫn còn.

### 5️⃣ Kiểm tra & Xuất
- Bấm **Kiểm Tra Lỗi Dịch** → app tự rà: chỗ chưa dịch, HTML/JSON hỏng, macro bị mất, biến MVU lệch… Có nút **Sửa nhanh** (tức thì, không tốn API) và **AI Sửa** (cho lỗi khó).
- Bấm **Xuất** → tải về `.json` hoặc `.png` (nhúng lại đúng ảnh thẻ gốc) → bỏ thẳng vào SillyTavern là dùng được.

---

## ✨ Những thứ đáng giá cho dịch giả

### 🔪 Dịch "phẫu thuật" — không làm vỡ thẻ
App **chỉ dịch phần chữ**, giữ nguyên tuyệt đối HTML/CSS/JS, regex, đường link, biến, và macro `{{char}}` `{{user}}`. Đây chính là thứ hay làm hỏng thẻ nhất khi dịch tay hoặc dùng AI thường.

### ⚡ Đa luồng — nhanh hơn nhiều lần
Nhiều key × nhiều nhà cung cấp = nhiều luồng chạy cùng lúc. Luồng nào xong là **nhận mục mới chạy tiếp ngay**, không phải ngồi chờ mục chậm. Vẫn **đúng giới hạn RPM**, không bị lỗi 429.

### 🔀 So Sánh Card + Gộp thông minh ⭐ *(rất đáng dùng)*

**Tình huống:** bạn dịch xong một thẻ, rồi **tác giả update bản gốc**. Trước đây phải dịch lại cả thẻ từ đầu.

Bây giờ bấm **"🔀 So Sánh Card"** (nút ngay trên mục Character Card) → nạp 3 file:

| Ô | Là gì |
|---|---|
| **Card Raw** | Bản gốc **cũ** |
| **Card Đã Dịch** | Bản **đã dịch** trước đây |
| **Card Final** | Bản gốc **mới** (tác giả vừa update) |

Bấm **"Gộp thông minh"** → app tự so từng mục:
- Mục **không đổi** → **lấy lại bản dịch cũ** (regex/code giữ nguyên → **không đẻ lỗi**).
- Mục **mới hoặc bị sửa** → chừa lại để dịch.

Xem trước ngay trên màn hình (♻ xanh = tái dùng, ✏️ vàng = cần dịch) kèm bộ đếm **"Tái dùng 100 · Cần dịch 10"**. Rồi bấm **"Đưa sang Dịch Card"** → chỉ dịch đúng 10 mục mới. **Tiết kiệm cực nhiều thời gian.**

> Ngoài ra, màn So Sánh còn cho bạn xem 3 phiên bản cạnh nhau theo từng mục, **sửa & lưu trực tiếp**, và lọc **"chỉ hiện chỗ khác nhau"**.

### 🧠 Nhớ & nhất quán
- **Từ điển riêng (Glossary)** — ép AI dịch tên riêng, thuật ngữ đúng ý bạn.
- **Bộ nhớ dịch** — câu giống nhau thì dịch giống nhau.
- **Đồng bộ biến MVU / EJS** — tên biến trong code và trong lorebook luôn khớp nhau.

---

## 🧰 4 công cụ còn lại

<details>
<summary><b>🃏 Tạo Card</b> — làm thẻ mới từ đầu</summary>

<br>

Tạo thẻ từ truyện, sinh Lorebook hàng loạt, phòng thí nghiệm Regex, EJS Studio, và **MVUZOD Studio** (thiết kế biến số, giá trị khởi tạo, luật cập nhật, và **Game UI** — chat với AI để nó viết giao diện game, tự kiểm regex chạy đúng trước khi giao).

</details>

<details>
<summary><b>🎛️ Tạo Preset</b> — làm Preset & Regex</summary>

<br>

Chat với AI để thiết kế **Preset JSON** và **Regex Script JSON** cho SillyTavern, xem trước rồi tải về.

</details>

<details>
<summary><b>🛠️ Mod Card</b> — sửa / mở rộng thẻ có sẵn</summary>

<br>

Đưa thẻ vào + viết yêu cầu (ví dụ *"đổi bối cảnh"*, *"viết thêm 3 phần"*), AI sẽ phân tích rồi sửa từng phần. Có **chế độ Mở rộng / đào sâu**, xem **bảng so sánh trước–sau**; mục quá lớn thì **tự chia phần** để không bị cắt cụt.

</details>

<details>
<summary><b>🔍 Trích Card</b> — đọc truyện, trích ra nhân vật</summary>

<br>

Dán truyện dài vào, app tự chia đoạn để quét, trích ra **nhân vật + Lorebook**, rồi xuất thành file dùng được ngay.

</details>

---

## ❓ Lỗi thường gặp

**Bấm Cập nhật báo lỗi, không update được**
→ Xem mục [Cập nhật](#-cập-nhật-phiên-bản-mới) ở trên, dùng 3 lệnh tay.

**App báo `Failed to resolve import ...`**
→ Bản mới có thêm thư viện. Tắt hẳn app rồi chạy lại **`start.bat`** (nó tự cài). Vẫn lỗi thì chạy `npm install` trong thư mục cài đặt.

**Nạp thẻ xong app đơ vài giây**
→ Thẻ có Regex Script rất nặng (hàng trăm KB). Bình thường, cứ chờ. Nếu không cần dịch script thì bỏ tick nhóm **Regex** ở bước 3.

**Không kết nối được API / báo lỗi CORS**
→ Kiểm tra lại Base URL & Key, thử bật **CORS Proxy**, hoặc bấm **Test Connection** để xem lỗi cụ thể.

**Gemini báo lỗi 524 / timeout khi mở rộng một mục khổng lồ**
→ Một lượt gọi quá dài nên proxy hết giờ chờ. Dùng **"Chế độ Mở rộng"** cho cả mục (app tự chia phần), hoặc chọn một khối nhỏ hơn để đào sâu.

**Mấy cửa sổ đen nhỏ khi chạy `start.bat` là gì?**
→ Là 3 công cụ phụ (Tạo Card / Tạo Preset / Mod Card). **Đừng tắt** — tắt là mấy tool đó không vào được.

---

## 🔒 Riêng tư

- Chạy **100% trên máy bạn**. API key lưu trong trình duyệt của bạn, **không gửi về bất kỳ máy chủ nào** của chúng tôi.
- Thẻ và bản dịch cũng nằm trên máy bạn.

---

## 🛠 Dành cho người kỹ thuật

Vite + React + TypeScript · Zustand · Next.js (Mod Card) · Vitest.

```bash
npm install        # cài thư viện
npm run dev        # chạy Hub (cổng 5173)
npm run test:run   # chạy test
npm run build      # build production
```

Cổng: Hub/Dịch Card `5173` · Tạo Card `5174` · Tạo Preset `5175` · Mod Card `5176` · Trích Card (file tĩnh, không cần cổng).

Lịch sử thay đổi: xem [CHANGELOG.md](CHANGELOG.md).

---

## 📝 Giấy phép

MIT
