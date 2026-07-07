// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.36.1';
export const APP_VERSION_NOTE = '[Trích Card] Sửa: số luồng song song giờ bám theo RPM của model đang dùng (RPM cao → nhiều luồng hơn). Trước đây kẹt cứng ở (provider × key × model) nên đặt RPM 17 cho flash vẫn chỉ chạy 4 luồng; nay lên tới ~RPM (trần 20). Áp cho cả Quét (model phụ/flash) lẫn Tạo thẻ.';
