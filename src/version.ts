// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.41.0';
export const APP_VERSION_NOTE = '[Dịch Card] Mục/entry LỚN (>15k ký tự) nay được CẮT thành nhiều phần ~15k rồi dịch SONG SONG qua pool đa-luồng (thay vì 1 call rất lâu & kém chính xác) — vd entry 90k → ~6 phần chạy cùng lúc, ghép lại + kiểm mối nối. Giao diện hiện rõ "🔗 Mục lớn — chia N phần, đang dịch song song (đã xong X/N)". Các phần vẫn dùng chung ngân sách RPM (không vượt 429), Dừng vẫn hủy sạch, có resume nếu lỗi giữa chừng.';
