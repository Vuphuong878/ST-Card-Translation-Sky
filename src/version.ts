// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.64.1';
export const APP_VERSION_NOTE = 'SỬA: nút "Re-translate All" trước đây chỉ gọi lại Start — mà app giữ field đã dịch + cache đĩa tự khôi phục ⇒ hoá "Continue" trá hình, dịch tiếp từ chỗ cũ (88/123). Nay bấm nút sẽ HỎI XÁC NHẬN rồi xoá sạch bản dịch cũ (cả cache đĩa + từ điển biến MVU) và dịch lại TỪ ĐẦU thật sự. | 1.64: nút "🚀 Dịch siêu tốc" — gom entry ngắn chung 1 call (đi model phụ/flash, ≤12 entry & 10K ký tự/lô), entry dài >8K để riêng (model chính/pro); + đèn đỏ lane lỗi: lane fail (429/5xx/timeout) nghỉ 15s, panel hiện "⚠ lỗi ×N", ≥5 lần tô đỏ đậm. | 1.63: sửa bug #3 TavernHelper 148KB "nằm im". | 1.62: nút 🐞 Báo lỗi. | 1.61+1.60: sửa Verify báo oan. | 1.59: retry đẩy xuống model phụ. | 1.58: bộ gác chữ Hán sót.';
