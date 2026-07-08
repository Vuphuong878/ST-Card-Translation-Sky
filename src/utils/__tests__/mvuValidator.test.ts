import { describe, it, expect } from 'vitest';
import { checkCodeFieldForCjk, buildEntryNameDictionary } from '../mvuValidator';

/**
 * Hai helper thuần dùng cho "sức khoẻ thẻ" (B4 sau này dựa vào): phát hiện chữ Hán còn sót trong
 * field code, và dựng từ điển tên entry (gốc→Việt) để đồng bộ tên toàn thẻ.
 */
describe('checkCodeFieldForCjk', () => {
  it('field không phải code → luôn valid (bỏ qua)', () => {
    expect(checkCodeFieldForCjk('还有中文', 'narrative')).toEqual({ valid: true });
    expect(checkCodeFieldForCjk('还有中文', undefined)).toEqual({ valid: true });
  });

  it('field code sạch (không CJK) → valid', () => {
    expect(checkCodeFieldForCjk('{ "hp": 100 }', 'json_patch').valid).toBe(true);
  });

  it('field code còn CJK → invalid + trả đoạn residual quanh chữ Hán', () => {
    const r = checkCodeFieldForCjk('const x = "还有中文";', 'initvar');
    expect(r.valid).toBe(false);
    expect(r.residual).toContain('还');
  });

  it('nhận diện CJK ở cả initvar / controller / json_patch', () => {
    expect(checkCodeFieldForCjk('武力', 'controller').valid).toBe(false);
    expect(checkCodeFieldForCjk('武力', 'initvar').valid).toBe(false);
    expect(checkCodeFieldForCjk('武力', 'json_patch').valid).toBe(false);
  });
});

describe('buildEntryNameDictionary', () => {
  const f = (path: string, original: string, translated: string, status = 'done') => ({ path, original, translated, status });

  it('gom tên entry đã dịch (character_book.entries[N].name) thành dict gốc→Việt', () => {
    const dict = buildEntryNameDictionary([
      f('character_book.entries[0].name', '西晋', 'Tây Tấn'),
      f('character_book.entries[1].name', '洛阳', 'Lạc Dương'),
    ]);
    expect(dict).toEqual({ '西晋': 'Tây Tấn', '洛阳': 'Lạc Dương' });
  });

  it('bỏ qua field chưa dịch / không đổi / không phải .name', () => {
    const dict = buildEntryNameDictionary([
      f('character_book.entries[0].name', '西晋', 'Tây Tấn', 'pending'), // chưa xong
      f('character_book.entries[1].name', '同', '同'),                    // không đổi
      f('character_book.entries[2].content', '内容', 'Nội dung'),         // không phải .name
      f('description', '西晋', 'Tây Tấn'),                                // sai path
    ]);
    expect(dict).toEqual({});
  });
});
