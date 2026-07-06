// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.29.1';
export const APP_VERSION_NOTE = '[Dịch Card][Hiệu năng] Giới hạn mảng log giữ trong bộ nhớ ở 800 dòng. Trước đây dịch card lớn gọi addLog hàng nghìn lần, mảng phình vô hạn → mỗi lần thêm phải copy + lọc cả mảng (O(n²)) làm app GIẬT DẦN về cuối + ăn RAM. Nay bounded → mượt đều từ đầu tới cuối.';
