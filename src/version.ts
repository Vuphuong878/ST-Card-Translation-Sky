// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.52.0';
export const APP_VERSION_NOTE = '[Dịch Card] "Bảo vệ CSS khỏi CJK": (1) SỬA lỗi "Giữ nguyên" vẫn bị dịch — bản cũ chỉ chặn CJK ngay sau dấu "(" và phải có phần đuôi, nên sót drop-shadow(商), blur(商), 10px trước CJK…; nay chặn CJK ở BẤT KỲ đâu trong ngoặc hàm → giữ nguyên đúng như chọn. (2) ĐỔI MẶC ĐỊNH sang "Dịch (Translate)" cho người mới (cấu hình đã lưu giữ nguyên). Thêm 7 test khoá lại.';
