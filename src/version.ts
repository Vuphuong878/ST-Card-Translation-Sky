// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.47.0';
export const APP_VERSION_NOTE = '[Đợt 5/6] Bộ nhớ dịch (dedupe) — NHANH HƠN: trong cùng 1 thẻ, nếu nhiều trường có nội dung gốc TRÙNG Y HỆT (cùng nhóm + loại) thì chỉ dịch 1 lần rồi tái dùng cho các bản sao, khỏi tốn thêm lượt gọi AI (log "♻️ Tái dùng bản dịch…"). An toàn tuyệt đối vì chỉ copy giữa 2 trường giống hệt nhau. Khác với "Bộ nhớ dịch xuyên thẻ" (IndexedDB) sẵn có — cái đó là GỢI Ý mềm cho trường dài giữa các thẻ; cái mới này là bỏ hẳn lượt gọi cho trường trùng trong CÙNG thẻ (kể cả trường ngắn). Tôn trọng tuỳ chọn "Bỏ qua trường đã dịch".';
