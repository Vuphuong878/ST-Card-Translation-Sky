// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.47.1';
export const APP_VERSION_NOTE = '[Đợt 6/6 · Nội bộ] Dọn cấu hình chết: bỏ 2 field cấu hình thừa "Số batch gửi song song" + "Số mục mỗi đợt (lorebook)" khỏi type/store/i18n (đã bỏ khỏi UI + engine từ trước; đa luồng RPM tự lo). KHÔNG đổi hành vi. Việc tách nhỏ các file lõi quá lớn (apiClient/useTranslation ~4k dòng) tạm HOÃN — rủi ro cao, nên làm riêng một phiên có kiểm thử kỹ, không gộp vào cuối đợt này. Hoàn tất kế hoạch 6 đợt rà soát & nâng cấp.';
