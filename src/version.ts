// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.54.0';
export const APP_VERSION_NOTE = '[Mod Card] SỬA lỗi entry QUÁ LỚN mod/mở rộng là lỗi "chả làm được gì": trước đây gửi cả entry (vd quy tắc dài ~115k ký tự) trong 1 call → output AI bị CẮT CỤT → kết quả vỡ. Nay entry narrative lớn tự CHIA PHẦN (~8k ký tự/phần, cắt ở ranh giới đoạn/dòng, không mất nội dung), mod/mở rộng TỪNG PHẦN (đưa đuôi phần trước làm context giữ mạch) rồi GHÉP lại; hiện tiến độ "phần i/N". Code KHÔNG chia (tránh vỡ). Nút Dừng vẫn cắt được giữa các phần.';
