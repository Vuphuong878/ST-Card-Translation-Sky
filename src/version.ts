// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.23.0';
export const APP_VERSION_NOTE = '[Dịch Card] Quản lý Regex: gộp Quét+Sửa thành 1 nút "Quét & Sửa Regex (AI)" chạy 4 giai đoạn — (1) quét+lập plan có thinking (xử lý ca đặc biệt map/tiếng Trung) → (2) chia CHUNK deterministic phủ hết + so sánh gốc↔dịch SONG SONG nhiều chunk → (3) sửa chỉ phần lỗi (dấu thừa/format, validate ngoặc+regex) → (4) kiểm mốc chunk chống sót. Output XML (hết vỡ JSON).';
