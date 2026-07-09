import type { TranslationField } from '../types/card';

// ═══════════════════════════════════════════════════════════════════════════════
// BỘ NHỚ DỊCH CẤP-THẺ (dedupe): nhiều trường có nội dung gốc TRÙNG Y HỆT (boilerplate,
// key lặp, câu mẫu lặp) → chỉ cần dịch 1 lần rồi TÁI DÙNG cho các bản sao, tiết kiệm call.
//
// An toàn tuyệt đối: chỉ tái dùng giữa 2 trường GIỐNG HỆT cả (a) nội dung gốc, (b) nhóm field,
// (c) loại entry — nên bản dịch copy sang luôn đúng ngữ cảnh (không thể tạo bản dịch sai).
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tìm 1 trường KHÁC đã dịch xong (`done`, có `translated`) mà nội dung gốc + nhóm + loại
 * trùng khớp hoàn toàn với `target` → có thể copy thẳng bản dịch của nó, khỏi gọi AI.
 * Trả về undefined nếu không có (target sẽ được dịch bình thường).
 */
export function findReusableTwin(
  fields: TranslationField[],
  target: TranslationField
): TranslationField | undefined {
  const orig = target.original?.trim();
  if (!orig) return undefined;
  return fields.find(
    (o) =>
      o.path !== target.path &&
      o.status === 'done' &&
      !!o.translated &&
      o.original === target.original &&
      o.group === target.group &&
      o.entryType === target.entryType
  );
}
