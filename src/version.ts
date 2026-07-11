// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.68.0';
export const APP_VERSION_NOTE = 'AUDIT ĐỢT 2 — giao diện phân tầng Cơ bản/Nâng cao: (1) 3 nút preset (⚡ Dịch nhẹ / 📖 Dịch đầy đủ / 🚀 Dịch siêu tốc) được đưa LÊN ĐẦU mục Cấu hình dịch trong khung nổi bật — bấm 1 nút là đủ config, không phải mò xuống giữa sidebar nữa. (2) Toàn bộ setting chuyên sâu (Model Routing, Custom Schema, Custom Prompt, Chunk Size, RAG, Translation Memory, Dịch phẫu thuật, CSS CJK, Chiến lược B/C) gấp vào nút "⚙ Cài đặt nâng cao" — mặc định đóng, nhớ trạng thái. (3) CORS Proxy + Expert Mode dời vào mục Advanced Settings của phần API. Tầng cơ bản giờ chỉ còn: API key/model → preset → nhóm trường → Start. | 1.67: gỡ 2 knob chết + đa luồng cho chiến lược Từng-entry + default Hàng loạt. | 1.66: chunk thích ứng + panel ▶. | 1.65: HEDGE. | 1.64: 🚀 Dịch siêu tốc + đèn đỏ lane.';
