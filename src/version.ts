// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.42.1';
export const APP_VERSION_NOTE = '[Dịch Card] SỬA nút Dừng/Hủy không dừng được: khi 1 call bị proxy treo (không trả dữ liệu), vòng đọc stream (reader.read()) kẹt vô hạn và lệnh Dừng native không cắt được → call treo cả trăm giây, bấm Dừng/Hủy không ăn. Nay mỗi lần đọc stream được RACE với tín hiệu Dừng → bấm Dừng/Hủy là ngắt NGAY cả call đang treo (áp cho cả OpenAI-compat, Gemini, Anthropic). Gồm cả giai đoạn Chiến lược B/C (dựng từ điển MVU/EJS).';
