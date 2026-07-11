// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.69.0';
export const APP_VERSION_NOTE = 'AUDIT ĐỢT 3 — khử code đúp (không đổi hành vi dịch): (1) Gom toàn bộ hàm đếm/lọc CJK về utils/cjk.ts — trước đây stripUrlsForCjkCheck bị ĐÚP 3 NƠI và regex đếm CJK đúp 2 nơi; tiện thể sửa typo ở bản apiClient khiến không strip được đường dẫn tương đối ./x khi đếm chữ Hán sót. (2) Trích logic CHIA LÔ lorebook (batch) thành utils/batchSplit.ts dùng chung cho cả pipeline Dịch lẫn Mod — trước đây đúp nguyên khối ~200 dòng ở 2 nơi, sửa 1 nơi quên nơi kia (bản Mod đã lệch). +14 test mới (154 tổng). | 1.68: UI phân tầng Cơ bản/Nâng cao + preset lên đầu. | 1.67: gỡ knob chết + đa luồng strategy single + default batch. | 1.66: chunk thích ứng + panel ▶. | 1.65: HEDGE. | 1.64: 🚀 Dịch siêu tốc + đèn đỏ lane.';
