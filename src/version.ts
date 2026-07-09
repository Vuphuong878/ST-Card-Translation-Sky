// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.55.0';
export const APP_VERSION_NOTE = 'Game UI mới (Tạo Card → MVUZOD → Game UI): ĐẬP ĐI XÂY LẠI thành CHAT với AI. Nhắn ý muốn → AI viết Regex Script biến format AI xuất ra thành widget đẹp, tự chỉnh qua hội thoại (không phải regen từ đầu). Điểm ăn tiền: sau mỗi lần AI viết, hệ thống CHẠY THẬT regex lên đoạn văn mẫu để CHỨNG MINH nó match + đủ nhóm $1..$9 + biến có thật trong schema — lỗi thì AI TỰ SỬA tối đa 3 vòng trước khi giao. Có nút "⚡ Tạo nhanh (không AI)" tạo bản nền tức thì $0, nút Dừng cắt ngang, phiên giữ khi đổi tab. Tối ưu cho Gemini (context 1M, output 60k+ chống cắt cụt).';
