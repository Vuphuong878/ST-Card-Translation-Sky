// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.64.2';
export const APP_VERSION_NOTE = 'SỬA: cứ dịch xong 1 entry là màn hình bị GIẬT XUỐNG (auto-scroll) — do log dùng scrollIntoView() nên trình duyệt kéo cả trang xuống để lộ hộp log mỗi khi có dòng log mới. Nay hộp log CHỈ tự cuộn NỘI BỘ trong khung của nó (không đụng scroll trang), và chỉ dính đáy khi bạn đang xem dòng mới nhất — cuộn lên đọc/theo dõi chỗ khác thì không bị giật nữa. | 1.64.1: nút Re-translate All giờ dịch lại TỪ ĐẦU thật (hỏi xác nhận rồi xoá bản dịch cũ). | 1.64: nút 🚀 Dịch siêu tốc (gom entry ngắn 1 call → model phụ) + đèn đỏ lane lỗi. | 1.63: sửa bug #3 TavernHelper 148KB nằm im. | 1.62: nút 🐞 Báo lỗi.';
