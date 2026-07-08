// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.41.1';
export const APP_VERSION_NOTE = '[Dịch Card] Dịch "phẫu thuật" (surgical — dùng cho regex/code, bắt & dịch chữ Trung trong code mà không đụng cấu trúc) nay chạy TỐI ĐA RPM: bỏ giới hạn cứng 4 luồng → số batch song song = tổng RPM mọi key×provider (tối thiểu 4), giãn khởi động 2000ms→150ms. Card nhiều regex/code dịch nhanh hơn nhiều; vẫn gate RPM (không 429), ghép theo id nên chất lượng không đổi, Dừng vẫn hủy sạch.';
