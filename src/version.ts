// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.31.0';
export const APP_VERSION_NOTE = '[Trích Card] Full pool đa-provider như Dịch Card: mỗi CẤU HÌNH API = 1 provider, bật "🔀 Gộp vào POOL" ở ≥2 cấu hình → engine rải call round-robin, CHẠY SONG SONG nhiều provider (quét nhân vật / tạo thẻ hàng loạt / trích Lorebook). Mỗi provider: đa-key (xoay vòng) + model chính/phụ theo NGƯỠNG KÝ TỰ + RPM riêng (rate-limit tách theo provider+model). 1 cấu hình = như cũ.';
