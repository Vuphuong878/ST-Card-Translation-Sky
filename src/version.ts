// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.37.0';
export const APP_VERSION_NOTE = '[Dịch Card] Đa luồng chạy TỐI ĐA RPM: số luồng song song nay = tổng ngân sách RPM toàn pool — mỗi provider, mỗi API KEY đóng góp (RPM chính + RPM phụ). Vd config chính 4 key + provider phụ 2 key (mỗi key 5+20 rpm) → ~150 luồng. Thêm key vào cấu hình chính giờ chạy hết công suất. Bỏ ô "Số batch gửi song song" (tự tính). pickLane vẫn chờ đúng nhịp RPM nên không 429.';
