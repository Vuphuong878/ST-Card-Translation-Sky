# 🎭 ST Studio — SillyTavern Preset & Regex Builder

**ST Studio** là một ứng dụng web đơn trang (Single-Page App) cao cấp xây dựng trên nền tảng **React (Vite) + Tailwind CSS**, được tối ưu hóa đặc biệt bằng AI để giúp người dùng thiết kế, tùy chỉnh và kiểm thử các **SillyTavern Preset JSON** và **Regex Script JSON** một cách trực quan, nhanh chóng thông qua giao diện Chat thông minh với Google Gemini.

---

## 🌟 Tính Năng Nổi Bật (Key Features)

1. **Tích hợp Google Gemini Natively & Proxy**:
   - Gọi trực tiếp các dòng mô hình Gemini (`gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-pro`...) bằng API Key của Google AI Studio.
   - Hỗ trợ kết nối qua các cổng Proxy trung gian tùy chọn, hỗ trợ quét danh sách mô hình từ Proxy tự động chỉ với 1-click.
   - Hỗ trợ giới hạn Token đầu ra siêu khủng lên tới **65,536 Tokens (65k)** – tận dụng tối đa sức mạnh hội thoại dài hạn của Gemini Pro.

2. **Giao Diện Siêu Mượt Không Giật Lag (Debounced Smooth Performance)**:
   - Sử dụng cơ chế trì hoãn ghi đĩa thông minh (**Debounced LocalStorage Persistence** 700ms - 1000ms). Loại bỏ hoàn toàn hiện tượng đơ/giật giao diện khi kéo slider tinh chỉnh các thông số trong thời gian thực.
   - Thiết kế tối giản, loại bỏ hoàn toàn các hiệu ứng động (animations/transitions) thừa thãi giúp tiết kiệm tài nguyên phần cứng, phản hồi tức thì trong 0 giây.

3. **Quy trình làm việc 4 bước trực quan (Step-by-Step Workspace)**:
   - **Bước 1: Tham số (Parameters)**: Cấu hình nhanh các slider lấy mẫu (Temperature, Repetition Penalty, Top P, Top K, Min P, Max Context, Max Response Tokens, và định dạng Template).
   - **Bước 2: Quản lý Khối Prompts**: Tạo mới, sửa nội dung, kéo thả sắp xếp thứ tự tiêm (injection order) và bật/tắt hoạt động của từng khối Prompt (Director, Jailbreak, Chat History Anchor...).
   - **Bước 3: Quản lý Regex Scripts**: Biên tập các tập lệnh Regex (ví dụ làm đẹp box suy nghĩ AI, làm đẹp collapsible calendar widget...). Hỗ trợ cấu hình regex find, replace, placements, disabled và markdownOnly.
   - **Bước 4: Xuất bản JSON (Export & Preview)**: Trình xem cấu trúc code JSON phân loại màu cú pháp tuyệt đẹp, sao chép 1-click hoặc tải trực tiếp file `.json` được định danh chuẩn SillyTavern.

4. **Trợ Lý Chat AI Thông Minh & Live Parser**:
   - Chat trực tiếp để hướng dẫn AI sinh mã. Hệ thống tự động bóc tách các khối ` ```json ... ``` ` trong câu trả lời của AI.
   - Hỗ trợ nạp trực tiếp các Prompt blocks hoặc Regex script đơn lẻ vào ngay dự án đang làm việc mà không ghi đè mất cấu trúc cũ.

---

## 💻 Hướng Dẫn Tải Về Và Chạy Trên Máy Cục Bộ (Local Deployment)

Để chạy **ST Studio** trên máy tính cá nhân của bạn hoặc chia sẻ cho người khác cùng sử dụng, hãy làm theo các bước cực kỳ đơn giản sau:

### 📋 Yêu cầu hệ thống (Prerequisites)
Máy tính của bạn cần cài đặt sẵn:
- **Node.js** (Phiên bản khuyến nghị: từ LTS 18.x hoặc 20.x trở lên). Tải về tại: [nodejs.org](https://nodejs.org/).
- **Git** (Nếu muốn clone code bằng dòng lệnh).

### 🚀 Các bước cài đặt và khởi chạy:

Mở Terminal (Command Prompt / PowerShell trên Windows, hoặc Terminal trên macOS/Linux) và chạy chuỗi lệnh sau:

```bash
# 1. Tải mã nguồn về máy (Clone code)
git clone https://github.com/ceh51453-alt/app-t-o-preset.git

# 2. Di chuyển vào thư mục dự án
cd app-t-o-preset

# 3. Cài đặt các gói thư viện phụ thuộc (Dependencies)
npm install

# 4. Khởi chạy máy chủ phát triển cục bộ (Development Server)
npm run dev
```

Sau khi chạy lệnh thành công, terminal sẽ xuất hiện một đường dẫn cục bộ (thường là `http://localhost:5173`). 
👉 Hãy mở trình duyệt và truy cập vào **`http://localhost:5173`** để bắt đầu trải nghiệm ứng dụng **ST Studio**!

---

## 🛠 Hướng Dẫn Đóng Gói Sản Phẩm (Production Build)

Nếu bạn muốn xuất bản mã nguồn này thành các tệp HTML/CSS/JS tĩnh để đưa lên hosting (như Github Pages, Vercel, Netlify):

```bash
# Đóng gói dự án
npm run build
```
Thư mục `/dist` sẽ được sinh ra ở gốc dự án chứa toàn bộ mã nguồn web tĩnh tối ưu hóa cao, bạn chỉ cần tải thư mục này lên bất kỳ hosting nào để chạy online.

---

Chúc bạn có những trải nghiệm thiết kế kịch bản SillyTavern tuyệt vời nhất với **ST Studio**! 🎭✨
