// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.55.6';
export const APP_VERSION_NOTE = 'So Sánh Card có "🔀 GỘP THÔNG MINH": khi tác giả update card đã dịch, bấm Gộp → tự so Raw (gốc cũ) vs Final (gốc mới): entry KHÔNG đổi thì TÁI DÙNG bản dịch cũ (từ Card Đã Dịch), entry mới/đổi thì chừa để dịch. Xem trước ngay ở cột Final (♻ tái dùng xanh / ✏️ cần dịch vàng) + đếm "tái dùng X · cần dịch Y". Rồi bấm "➡️ Đưa sang Dịch Card": card Final sang màn dịch với X mục ĐÃ DỊCH (khoá) + Y mục CHỜ DỊCH → bấm Dịch chỉ chạy Y mục mới. Tiết kiệm thời gian + đỡ vỡ regex (regex không đổi giữ nguyên bản cũ). Deterministic (không tốn AI), so sánh bảo thủ (thà dịch lại còn hơn tái dùng nhầm).';
