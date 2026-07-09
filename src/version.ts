// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.48.0';
export const APP_VERSION_NOTE = '[Lưới an toàn cú pháp dùng chung] Gom logic "parse <script> bằng acorn" (trước lặp ở surgical + sức khoẻ thẻ của Dịch Card) về 1 util chung scriptSafety.ts — 1 nguồn sự thật, ít lỗi hơn. Mod Card nay cũng CẢNH BÁO khi script JS sau khi mod bị vỡ cú pháp (nạp vào ST dễ liệt nút) — hiện danh sách script nghi vỡ để kiểm tay, KHÔNG tự sửa code sáng tạo của AI. 53 test xanh.';
