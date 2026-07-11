// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.64.4';
export const APP_VERSION_NOTE = 'SỬA TIẾP nút "Re-translate All": bản 1.64.1 vẫn hỏng — bấm ra "All fields are already translated" chứ không dịch lại từ đầu. Gốc rễ: sau khi xoá bản dịch, hàm dịch lại đọc TRÚNG bản chụp cũ của React (stale closure) nên vẫn thấy toàn field "đã dịch" rồi gộp lại. Nay thêm chế độ freshStart: bỏ QUA hẳn danh sách field cũ, trích lại từ thẻ (toàn "chưa dịch") và dịch từ 0/N — không còn phụ thuộc bản chụp cũ. | 1.64.3: ô Gốc/Dịch trong Field Editor cao bằng nhau. | 1.64.2: hết giật trang xuống khi dịch xong entry. | 1.64: nút 🚀 Dịch siêu tốc + đèn đỏ lane lỗi. | 1.63: sửa bug #3 TavernHelper 148KB nằm im.';
