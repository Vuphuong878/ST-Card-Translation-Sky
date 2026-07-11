// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.67.0';
export const APP_VERSION_NOTE = 'AUDIT ĐỢT 1 — dọn knob chết + đa luồng triệt để: (1) GỠ 2 nút CHẾT khỏi giao diện: radio "Translation Mode Field/Batch" (không code nào đọc) và ô "Số chunk song song" (engine luôn tự tính theo pool RPM). (2) Chiến lược Lorebook "Từng entry riêng" giờ cũng chạy ĐA LUỒNG qua pool (trước dịch 74 entry tuần tự từng cái) — mỗi entry vẫn 1 call riêng nên chất lượng y hệt, chỉ nhanh hơn nhiều; entry MVU-critical (initvar/controller) vẫn tuần tự để giữ đồng bộ biến. (3) Mặc định chiến lược Lorebook = Hàng loạt (đa luồng + gộp call) cho người dùng mới; preset Dịch nhẹ/đầy đủ cũng chốt batch. (4) Fix: bấm preset Dịch nhẹ rồi F5 bị mất cờ "bỏ content to" (quên lưu localStorage). | 1.66: chunk thích ứng theo lane + panel ▶ call đang chạy. | 1.65: HEDGE chunk chậm. | 1.64: 🚀 Dịch siêu tốc + đèn đỏ lane.';
