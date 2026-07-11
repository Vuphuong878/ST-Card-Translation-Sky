// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.62.0';
export const APP_VERSION_NOTE = 'MỚI: nút "🐞 Báo lỗi" ở header (trên cùng bên phải, cạnh nút đổi ngôn ngữ) — bấm mở file Excel báo lỗi (OneDrive) ở tab mới để mọi người ghi bug. Có i18n VI/EN/中文. | 1.61: sửa nốt 2 báo oan ở Kiểm tra lỗi dịch — countCJK không đếm dấu ngoặc 【】《》 là "chữ Hán"; code_splice so độ sâu ngoặc { } với BẢN GỐC thay vì với 0 (fragment vốn lệch). Verify trên card báo lỗi: 6 issue → 1. | 1.60: sửa bug #2 — check "Template Literal" ghép ${A} gốc với ${B} bất kỳ ở bản dịch rồi báo dịch sai; nay trích ${...} cân bằng ngoặc, chỉ soi biến JS thuần bị mất hẳn. | 1.59: retry đẩy xuống model phụ (flash) cho nhanh. | 1.58: bộ gác chữ Hán sót chống field "DONE" mà vẫn tiếng Trung. | 1.57: nút "⚡ Dịch nhẹ". | Trước đó: Dịch Card + Tạo Preset + Mod Card dịch XONG EN + 中文; nút đổi ngôn ngữ VI/EN/中文 ở header.';
