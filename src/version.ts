// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.18.2';
export const APP_VERSION_NOTE = '[Fix Cập nhật] Nút Cập nhật báo nhầm "đã mới nhất" khi thực ra không kiểm tra được (upstream chưa set / fetch lỗi / tải ZIP). Nay: fallback origin/main + BÁO ĐÚNG lỗi thật kèm cách xử lý. update dùng "git pull origin main".';
