// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.55.1';
export const APP_VERSION_NOTE = 'SỬA Mod Card lỗi "JSON parse failed: Unexpected token U [USER_CUSTOM_PROMPT]" ở giai đoạn Phân tích thẻ (Analyze). AI thật ra ĐÃ xuất JSON đúng (trong khối ```json ở cuối), nhưng bộ tách cũ tham lam vơ từ dấu [ ĐẦU TIÊN trong phần văn xuôi 5 bước (vd [USER_CUSTOM_PROMPT], [MODULE 1]) → dính prose lẫn JSON → vỡ. Nay tách JSON BỀN VỮNG: ưu tiên khối ```json, quét cân bằng ngoặc có hiểu chuỗi (bỏ qua [ ] nằm trong "..."). Áp cho cả 5 chỗ dùng JSON của Mod Card (Analyze, Keyword Sync, Audit, Validate).';
