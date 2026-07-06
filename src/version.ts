// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.27.0';
export const APP_VERSION_NOTE = '[Audit hardening] Củng cố bảo mật + độ bền theo đợt audit: (1) dev-server chặn CSRF same-origin cho các endpoint git/ghi-file/proxy (chống website khác lén gọi git reset --hard làm mất việc). (2) localStorage.setItem bọc an toàn — chat/file lớn tràn quota không còn làm vỡ giao diện. (3) Dọn rác _dev-scratch khỏi repo + gỡ 1 warning build (dynamic-import apiClient). Không đổi tính năng người dùng.';
