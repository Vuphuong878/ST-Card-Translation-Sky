// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.34.0';
export const APP_VERSION_NOTE = '[Trích Card] Model riêng cho QUÉT vs TẠO THẺ: thêm toggle "⚡ Quét bằng model phụ (flash)" ở bước 3 → bước Quét dùng model PHỤ (flash) cho nhanh/rẻ, bước Tạo thẻ vẫn dùng model chính (pro). Tận dụng model chính/phụ mỗi provider trong Pool; vẫn giữ nguyên đa-luồng + đa-provider. Đặt Model phụ = flash cho từng provider ở mục Pool đa-luồng.';
