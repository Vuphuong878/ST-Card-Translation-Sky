// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.43.1';
export const APP_VERSION_NOTE = '[Nội bộ · Đợt 1/6] Thêm bộ TEST TỰ ĐỘNG cho phần lõi Dịch Card (vitest) để khoá lại mọi bug đã sửa gần đây — KHÔNG đổi hành vi app. 26 test cho: chunkText (không mất ký tự khi chia phần), computePoolConcurrency (công thức luồng = Σ RPM×key + trần 512), lưới vá cú pháp surgical (regression đúng card lỗi thật của user — vá 19 chỗ, mọi <script> parse sạch), phát hiện chữ Hán sót + dựng từ điển tên entry. Đã kiểm test có tác dụng: tắt thử guard v1.43.0 → test đỏ đúng chỗ.';
