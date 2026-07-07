// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.36.2';
export const APP_VERSION_NOTE = '[Trích Card] Số luồng song song = ĐÚNG tổng RPM của model đang dùng (bỏ trần 20, trần cứng 64). Vd flash RPM 17 × 3 key = 51 luồng bắn cùng lúc. Thêm cơ chế CHỜ NHỊP: khi hết quota RPM trong phút thì lane chờ thay vì bắn bừa → luồng cao mà vẫn không vượt RPM (tránh 429). Bước Quét chỉ tính RPM model phụ (flash); model chính vẫn dùng làm dự phòng.';
