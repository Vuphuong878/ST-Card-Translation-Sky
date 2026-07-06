// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.32.2';
export const APP_VERSION_NOTE = '[Trích Card] Tăng retry + tối ưu bộ lọc NSFW: (1) retry 3→6 lượt; nay THỬ LẠI cả khi TIMEOUT ("quá hạn" trước đây không khớp nên bỏ luôn) và khi response RỖNG do bộ lọc an toàn chặn — qua pool sẽ đổi lane/model nên dễ lọt. (2) Framing prompt quét/trích Lorebook thành "trích xuất siêu dữ liệu trung lập, không từ chối" → giảm bị chặn NSFW. Lỗi không sửa được (sai key, HTTP 400) vẫn dừng ngay, không phí lượt.';
