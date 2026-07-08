// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.42.0';
export const APP_VERSION_NOTE = '[Tạo Card] Sinh Lorebook hàng loạt nay BÁM SCHEMA biến (MVU-ZOD) của thẻ: trước đây entry sinh ra không liên quan gì tới các chỉ số trong schema (vd NPC có võ lực/trí lực nhưng entry không nhắc). Nguyên nhân: tuỳ chọn "bám schema" mặc định TẮT + luồng tạo tự động không truyền schema. Nay: mặc định BẬT (khi thẻ có schema), luồng tự động cũng truyền schema, và prompt yêu cầu entry NPC BẮT BUỘC gán giá trị cụ thể cho các chỉ số có trong schema (đúng tên biến, không bịa).';
