// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.54.1';
export const APP_VERSION_NOTE = '[QUAN TRỌNG] SỬA nút CẬP NHẬT bị kẹt mãi ("Your local changes to package-lock.json would be overwritten"): mỗi lần cập nhật, npm install tự sửa package-lock.json (file được track) → lần "git pull" sau bị từ chối → không update được nữa. Nay đổi sang "git fetch + git reset --hard origin/main" → đồng bộ CỨNG về GitHub, luôn chạy được (dữ liệu user không-track như thẻ/cache/progress vẫn giữ). LƯU Ý: máy đang kẹt phải chạy TAY 1 lần "git fetch origin main && git reset --hard origin/main" rồi khởi động lại — sau đó nút Cập nhật tự chạy mãi.';
