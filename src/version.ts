// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.51.1';
export const APP_VERSION_NOTE = '[Nội bộ · tách monolith] Tách cụm "cắt văn bản dài" (chunkText + các hàm dò ranh giới an toàn) từ apiClient.ts (4362 dòng) ra file riêng chunking.ts — apiClient còn ~3897 dòng, dễ bảo trì hơn. KHÔNG đổi hành vi: cụm này thuần tuý (chỉ xử lý chuỗi), có test chunkText phủ, re-export nên các file khác import y như cũ. Build + 53 test xanh.';
