// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.32.0';
export const APP_VERSION_NOTE = '[Trích Card] (1) Fix bug thay {{user}}: trước đây chỉ dặn AI (lúc được lúc không), nay THAY DETERMINISTIC sau khi sinh — mọi lần xuất hiện của tên nhân vật (+biệt danh) đổi thành {{user}} ở cả header/key/thân thẻ, không thay lẹm chữ dính. (2) Bước 3 (Quét nhân vật) nay có toggle NSFW/Jailbreak/Gomorrah (đồng bộ 2 chiều với bước 4) + prompt quét áp NSFW → quét truyện NSFW không bị bỏ sót nhân vật.';
