// ─── App version ───
// BUMP `APP_VERSION` on every fix so builds are distinguishable in the UI (shown in the
// sidebar header). Use the patch number for small fixes; keep `APP_VERSION_NOTE` to a one-line
// summary of the most recent change (shown on hover).
export const APP_VERSION = '1.66.0';
export const APP_VERSION_NOTE = 'MỚI 2 thứ: (1) CHUNK THÍCH ỨNG THEO SỐ LANE — field văn bản RẤT LỚN sẽ tự chia NHỎ hơn (tới sàn 8K/phần) khi pool còn dư nhiều lane, để phủ nhiều lane hơn & dịch song song nhanh hơn (trước đây 1 field 148K chỉ ~10 phần ⇒ tối đa 10 lane dù có 72 lane); không áp cho code/regex (chia nhỏ dễ vỡ). (2) PANEL LUỒNG hiện "▶ N" = số call ĐANG CHẠY trên mỗi lane (kèm RPM nhỏ bên cạnh) — trước đây chỉ hiện RPM cửa sổ 60s nên call chạy >60s làm lane trông như 0/17 rảnh rỗi dù vẫn đang chạy; giờ nhìn ▶ là biết bận/rảnh ngay. | 1.65: HEDGE chunk chậm. | 1.64.4: Re-translate All dịch lại từ đầu. | 1.64: 🚀 Dịch siêu tốc + đèn đỏ lane lỗi.';
