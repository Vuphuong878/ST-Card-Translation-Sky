/**
 * src/utils/smartPack.ts — "Dịch siêu tốc": gom entry theo BIN-PACKING thông minh.
 * ──────────────────────────────────────────────────────────────────────────────
 * Công thức gom (theo yêu cầu user + tối ưu cho combo pro 3RPM + flash 17RPM):
 *  - Entry DÀI (> soloChars) → để RIÊNG 1 call, đi model CHÍNH (pro) — nội dung khó,
 *    cần chất lượng; và vốn dĩ 1 entry dài đã đủ 1 call.
 *  - Entry NGẮN/VỪA còn lại → sắp giảm dần rồi GOM First-Fit-Decreasing vào các "lô":
 *    mỗi lô ≤ maxCount entry và tổng ≤ charBudget ký tự → cả lô đi 1 call model PHỤ
 *    (flash) — flash RPM cao gấp mấy lần pro và dư sức dịch entry ngắn.
 *  ⇒ Số call giảm mạnh (n entry ngắn → n/maxCount call), pro rảnh cho entry dài,
 *    flash gánh số lượng — đúng sở trường từng model. Các lô vẫn chạy ĐA LUỒNG qua pool.
 *
 * charBudget mặc định 10.000 ký tự CJK: bản dịch zh→vi giãn ~2.5-3× ≈ 25-30K ký tự
 * (~12-15K token) — nằm an toàn trong trần output 65K của gemini flash/pro.
 */

export const SMART_PACK_SOLO_CHARS = 8000;    // > mức này → để riêng, đi model chính
export const SMART_PACK_CHAR_BUDGET = 10000;  // tổng ký tự tối đa của 1 lô gộp
export const SMART_PACK_MAX_COUNT = 12;       // tối đa entry / lô (nhiều quá AI dễ trộn mục)

export interface SmartPackedBatch<T> {
  batch: T[];
  /** true = lô GỘP toàn entry ngắn → ưu tiên model phụ (flash). false = entry dài đơn lẻ → model chính. */
  preferSecondary: boolean;
}

export function smartPackFields<T extends { original: string }>(
  fields: T[],
  maxCount: number = SMART_PACK_MAX_COUNT,
  charBudget: number = SMART_PACK_CHAR_BUDGET,
  soloChars: number = SMART_PACK_SOLO_CHARS,
): SmartPackedBatch<T>[] {
  const out: SmartPackedBatch<T>[] = [];
  const small: T[] = [];
  for (const f of fields) {
    if ((f.original || '').length > soloChars) out.push({ batch: [f], preferSecondary: false });
    else small.push(f);
  }
  // First-Fit-Decreasing: sắp giảm dần, nhét vào lô đầu tiên còn chỗ.
  small.sort((a, b) => (b.original || '').length - (a.original || '').length);
  const bins: { items: T[]; chars: number }[] = [];
  for (const f of small) {
    const len = (f.original || '').length;
    let placed = false;
    for (const bin of bins) {
      if (bin.items.length < maxCount && bin.chars + len <= charBudget) {
        bin.items.push(f);
        bin.chars += len;
        placed = true;
        break;
      }
    }
    if (!placed) bins.push({ items: [f], chars: len });
  }
  for (const bin of bins) out.push({ batch: bin.items, preferSecondary: true });
  return out;
}
