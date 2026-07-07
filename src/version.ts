// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.36.4';
export const APP_VERSION_NOTE = '[Trích Card] HOTFIX: sửa lỗi trang bị treo khi tải (import truyện xong không hiện nội dung / không đếm ký tự). Nguyên nhân: hằng số trần luồng khai báo kiểu const bị gọi quá sớm lúc khởi tạo (TDZ) → sập toàn bộ init. Nay inline thẳng, không còn lỗi. Ai đang dùng 1.36.2/1.36.3 nên cập nhật ngay.';
