// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.33.0';
export const APP_VERSION_NOTE = '[Cả 5 app] Đồng bộ retry khi API kẹt/treo/timeout: Dịch Card thêm TIMEOUT cho request dịch (proxy chết là abort→thử lại thay vì treo mãi) + maxRetries 3→5; Tạo Card nay retry cả khi CHỈ 1 key (trước phải ≥2 key mới thử lại) + bắt timeout/5xx/mạng; Preset thêm hẳn retry + timeout (trước không có); Mod Card tăng lượt + bắt thêm timeout/rỗng. Lỗi không sửa được (sai key, HTTP 400/401) vẫn dừng ngay.';
