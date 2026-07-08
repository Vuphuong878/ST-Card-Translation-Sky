// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.39.0';
export const APP_VERSION_NOTE = '[Dịch Card] Chế độ Lorebook "Hàng loạt" nay dịch TỪNG MỤC SONG SONG (mỗi mục 1 request) thay vì gộp nhiều mục/1 call — hết lỗi AI trộn thứ tự / dịch đè / retry cả nhóm (#6,#7). Tốc độ đến từ đa luồng RPM (#1). Bỏ ô "Số mục mỗi đợt" (#10). Nút Dừng/Hủy nay chặn task nền set lại trạng thái + quét dọn nhiều lần → dừng hẳn, không dịch nền, không kẹt "đang dịch" (#2).';
