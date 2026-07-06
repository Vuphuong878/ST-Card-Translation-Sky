// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.30.0';
export const APP_VERSION_NOTE = '[Dịch Card + Tạo Card] 4 fix theo báo lỗi client: (1) Ngưỡng model phụ nay đo bằng SỐ KÝ TỰ (trước quy đổi token ≈ ký tự/4 nên entry 2200 ký tự vẫn lọt ngưỡng 800 → dùng nhầm flash). (2) Làm rõ nút "Sửa nhanh" (hàm app, không AI) vs "AI Sửa" (gọi AI) trong Kiểm Tra Lỗi. (3) MVUZOD Studio: Import/Paste nay nhận cả Zod schema .js (registerMvuSchema / z.object), không chỉ JSON. (4) Entry [initvar] nhúng vào card nay có disable=true để ST tắt thật (cần kiểm tra lại trong ST).';
