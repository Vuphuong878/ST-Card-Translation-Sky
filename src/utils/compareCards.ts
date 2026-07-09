/**
 * src/utils/compareCards.ts — Gióng hàng & nhóm entry của nhiều card để SO SÁNH (thuần, có test).
 * ──────────────────────────────────────────────────────────────────────────────
 * 3 card là 3 phiên bản của cùng 1 card → dùng `TranslationField.path` làm KHÓA gióng hàng.
 * Union path của mọi slot đã nạp, gom theo FieldGroup (thứ tự DEFAULT_FIELD_GROUPS), sort ổn định.
 */
import type { FieldGroup, TranslationField } from '../types/card';
import { DEFAULT_FIELD_GROUPS } from './cardFields';

export interface CompareEntry {
  path: string;
  label: string;
  group: FieldGroup;
}
export interface CompareGroup {
  group: FieldGroup;
  label: string;
  entries: CompareEntry[];
}

/** Nhãn tiếng Việt cho từng nhóm (fallback về label gốc nếu thiếu). */
const GROUP_LABEL_VI: Partial<Record<FieldGroup, string>> = {
  core: 'Cốt lõi (tên, mô tả, tính cách, bối cảnh)',
  messages: 'Lời mở đầu & hội thoại mẫu',
  system: 'System Prompt',
  creator: 'Ghi chú tác giả',
  lorebook: 'Lorebook (nội dung entry)',
  lorebook_keys: 'Từ khoá Lorebook',
  depth_prompt: 'Depth Prompt',
  tavern_helper: 'Script TavernHelper (MVU…)',
  regex: 'Regex Scripts',
};

/** Thứ tự nhóm theo DEFAULT_FIELD_GROUPS (ổn định, dễ đọc). */
const GROUP_ORDER: FieldGroup[] = DEFAULT_FIELD_GROUPS.map((g) => g.id);

/** So path kiểu tự nhiên để `entries[2]` đứng trước `entries[10]`. */
function comparePathNatural(a: string, b: string): number {
  const ax = a.replace(/\[(\d+)\]/g, (_, n) => `[${String(n).padStart(6, '0')}]`);
  const bx = b.replace(/\[(\d+)\]/g, (_, n) => `[${String(n).padStart(6, '0')}]`);
  return ax < bx ? -1 : ax > bx ? 1 : 0;
}

/**
 * Union tất cả path của các slot, gom theo nhóm. Giữ label+group của lần GẶP ĐẦU (ưu tiên slot trái).
 * @param perSlotFields mảng field của từng slot đã nạp (bỏ qua slot rỗng trước khi gọi, hoặc truyền []).
 */
export function buildCompareGroups(perSlotFields: TranslationField[][]): CompareGroup[] {
  const byPath = new Map<string, CompareEntry>();
  for (const fields of perSlotFields) {
    for (const f of fields) {
      if (!byPath.has(f.path)) {
        byPath.set(f.path, { path: f.path, label: f.label, group: f.group });
      }
    }
  }

  const groupsMap = new Map<FieldGroup, CompareEntry[]>();
  for (const entry of byPath.values()) {
    const arr = groupsMap.get(entry.group) || [];
    arr.push(entry);
    groupsMap.set(entry.group, arr);
  }

  const out: CompareGroup[] = [];
  // Nhóm theo thứ tự chuẩn trước…
  for (const g of GROUP_ORDER) {
    const entries = groupsMap.get(g);
    if (entries && entries.length) {
      entries.sort((a, b) => comparePathNatural(a.path, b.path));
      out.push({ group: g, label: GROUP_LABEL_VI[g] || g, entries });
      groupsMap.delete(g);
    }
  }
  // …rồi mọi nhóm lạ còn sót (an toàn nếu FieldGroup mở rộng về sau).
  for (const [g, entries] of groupsMap) {
    entries.sort((a, b) => comparePathNatural(a.path, b.path));
    out.push({ group: g, label: GROUP_LABEL_VI[g] || g, entries });
  }
  return out;
}

/**
 * Các giá trị của cùng 1 entry giữa các slot có KHÁC nhau không?
 * undefined = slot thiếu entry đó. Bỏ qua slot undefined; nếu còn ≤1 giá trị thực → coi như không khác.
 */
export function valuesDiffer(values: (string | undefined)[]): boolean {
  const present = values.filter((v): v is string => v !== undefined);
  if (present.length <= 1) return false;
  const first = present[0];
  return present.some((v) => v !== first);
}
