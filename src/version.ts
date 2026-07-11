// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.65.0';
export const APP_VERSION_NOTE = 'MỚI: HEDGE chống chunk chậm "kéo lê". Khi dịch 1 field lớn chia nhiều chunk SONG SONG, nếu 1 chunk chạy quá lâu (>150s — nghi proxy/lane nghẽn) thì hệ thống tự BẮN THÊM 1 bản dự phòng trên LANE KHÁC (provider đang rảnh), lấy bản nào xong trước và HUỶ bản kia. Trước đây provider khác cứ "đứng đợi" vì mọi chunk đã phát hết, chunk kẹt (400s+) không được chạy lại trên lane rảnh → cả field treo theo chunk chậm nhất. Chỉ hedge 1 lần/chunk và chỉ khi vượt ngưỡng nên chunk bình thường không tốn call kép. | 1.64.4: Re-translate All dịch lại TỪ ĐẦU thật (sửa stale-closure). | 1.64.3: ô Gốc/Dịch cao bằng nhau. | 1.64.2: hết giật màn hình. | 1.64: 🚀 Dịch siêu tốc + đèn đỏ lane lỗi.';
