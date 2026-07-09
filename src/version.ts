// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.55.3';
export const APP_VERSION_NOTE = 'TĂNG TỐC Dịch Card (đa luồng): bỏ "rào chắn đợt". Trước đây mở N luồng rồi PHẢI CHỜ CẢ ĐỢT xong mới sang đợt kế — 1 entry chậm (entry khổng lồ) làm N-1 luồng còn lại ngồi không. Nay chuyển sang POOL LIÊN TỤC: luồng nào xong là KÉO entry kế NGAY, không đợi ai → thời gian ≈ entry chậm nhất thay vì cộng dồn theo đợt. Áp cho lorebook + Mod; regex trước chạy tuần tự nay cũng song song. RPM vẫn tuyệt đối an toàn (mỗi call vẫn qua bộ gate RPM cũ), nút Dừng/Tạm dừng nhạy hơn. +10 test chứng minh straggler không chặn.';
