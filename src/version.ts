// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.43.0';
export const APP_VERSION_NOTE = '[Dịch Card] FIX TRIỆT ĐỂ dịch regex/HTML làm VỠ code JS (nút bấm liệt): tìm ra thủ phạm là bộ dịch nhầm văn xuôi "1. …" / chữ trong chuỗi thành đường dẫn biến → chèn dấu [\'  \'] phá cú pháp. Sửa 2 tầng: (1) CHẶN GỐC — nhận diện đúng văn xuôi/trong chuỗi, không bọc ký tự nữa; (2) LƯỚI AN TOÀN — sau khi dịch tự PARSE cú pháp <script> (acorn), nếu gốc lành mà bản dịch vỡ thì TỰ VÁ đúng chỗ hỏng tới khi cú pháp lành. Đã test trên đúng card lỗi của user: vá 19 chỗ, script chạy lại được.';
