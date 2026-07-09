// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.54.2';
export const APP_VERSION_NOTE = '[QUAN TRỌNG · nối tiếp 1.54.1] SỬA lỗi "Failed to resolve import acorn…" sau khi cập nhật: start.bat/update.bat cũ chỉ chạy npm install KHI THIẾU node_modules → cập nhật xong có thư viện MỚI (acorn) nhưng không cài → app vỡ. Nay start.bat + update.bat LUÔN npm install (Hub + 3 tool con) mỗi lần chạy để thư viện luôn đồng bộ; update.bat cũng dùng fetch+reset --hard. Máy đang lỗi: chạy TAY "git fetch origin main && git reset --hard origin/main && npm install" rồi start.bat.';
