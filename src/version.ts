// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.29.0';
export const APP_VERSION_NOTE = '[Dịch Card] Sửa lỗi hiển thị + retry khi proxy trả lỗi 5xx (vd 524 Cloudflare): (1) message lỗi HTTP nay được rút gọn (trang HTML lỗi chỉ lấy tiêu đề, không còn xổ dài cả màn hình) + line-clamp 3 dòng. (2) Lỗi TẠM THỜI (5xx/timeout/mất mạng) nay TỰ THỬ LẠI ở cấp field kể cả field nhỏ (trước đây field nhỏ gặp 524 là skip luôn), có log + backoff tăng dần.';
