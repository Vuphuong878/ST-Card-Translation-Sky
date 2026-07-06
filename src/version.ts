// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.22.1';
export const APP_VERSION_NOTE = '[Fix Mod Card] Trước đây call AI KHÔNG có timeout + KHÔNG retry → 1 call treo là kẹt cả pipeline (user báo "không thấy response, treo"). Nay: timeout 180s/call (treo thì hủy) + AUTO-RETRY 3 lần (backoff 1-2-4s, xoay key mỗi lần) cho lỗi tạm thời (timeout/429/5xx/rỗng). (Dịch Card vốn đã có sẵn.)';
