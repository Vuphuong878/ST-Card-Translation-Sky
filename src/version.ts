// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.18.1';
export const APP_VERSION_NOTE = '[Fix UI] Dịch Card: cột cấu hình (Chiến Lược A/B/C) bị CẮT 54px ở đáy do dùng 100vh trong khi có header Hub — sửa thành calc(100vh - var(--hub-header-h)), đáy không còn mất. + header trang "Tạo thẻ từ truyện" thêm flex-wrap chống tràn khi hẹp.';
