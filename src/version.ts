// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.44.0';
export const APP_VERSION_NOTE = '[Đợt 2/6] Nút DỪNG giờ cắt luôn call AI ĐANG chạy (không chờ xong): (1) Mod Card — thêm hẳn nút ⏹ Dừng cho pipeline mod nhiều bước (trước đây chạy là không dừng được); (2) Tạo Card (sinh Lorebook hàng loạt) — nâng nút Dừng từ "dừng giữa các đợt" thành hủy tức thì call đang chạy. Đã rà 5 app: Dịch Card & Trích Card vốn đã cắt in-flight đúng; Tạo Preset là chat 1-lượt nên không cần. Không port "lưới vá cú pháp" sang app khác vì các app đó không có bước ghép-token dễ vỡ như Dịch Card (tránh thêm code trùng/thừa).';
