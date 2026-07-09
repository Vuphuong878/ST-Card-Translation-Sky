import { describe, it, expect } from 'vitest';
import { findKeywordTriggeredEntries } from '../ragContext';
import type { TranslationField } from '../../types/card';

function mk(o: Partial<TranslationField>): TranslationField {
  return {
    path: 'p', label: 'L', group: 'lorebook', original: '', translated: '', status: 'pending', retries: 0,
    ...o,
  } as unknown as TranslationField;
}

// entry 2: keyword "李明" + nội dung đã dịch; entry 5: keyword "洛阳" chưa dịch xong.
const baseFields = () => [
  mk({ path: 'data.character_book.entries[2].keys', group: 'lorebook_keys', original: '李明' }),
  mk({ path: 'data.character_book.entries[2].content', group: 'lorebook', original: '李明是主角', translated: 'Lý Minh là nhân vật chính', status: 'done' }),
  mk({ path: 'data.character_book.entries[5].keys', group: 'lorebook_keys', original: '洛阳' }),
  mk({ path: 'data.character_book.entries[5].content', group: 'lorebook', original: '洛阳城', translated: '', status: 'pending' }),
];

describe('findKeywordTriggeredEntries', () => {
  it('text nhắc keyword của entry khác (đã dịch) → kéo content entry đó vào', () => {
    const r = findKeywordTriggeredEntries('Hôm nay 李明 đi chợ.', baseFields());
    expect(r).toHaveLength(1);
    expect(r[0].path).toBe('data.character_book.entries[2].content');
  });

  it('keyword của entry CHƯA dịch xong → không kéo (không có bản dịch để tham chiếu)', () => {
    const r = findKeywordTriggeredEntries('Đến 洛阳 rồi.', baseFields());
    expect(r).toHaveLength(0);
  });

  it('text không chứa keyword nào → rỗng', () => {
    expect(findKeywordTriggeredEntries('Một ngày bình thường.', baseFields())).toEqual([]);
  });

  it('bỏ qua entry của CHÍNH field hiện tại (excludeEntryIdx)', () => {
    // đang dịch chính entry 2 mà text có "李明" → không tự kéo lại
    const r = findKeywordTriggeredEntries('李明', baseFields(), '2');
    expect(r).toHaveLength(0);
  });

  it('nhiều keyword trong 1 field (ngăn bởi dấu phẩy) đều khớp được', () => {
    const fields = [
      mk({ path: 'data.character_book.entries[3].keys', group: 'lorebook_keys', original: '王芳, 芳芳' }),
      mk({ path: 'data.character_book.entries[3].content', group: 'lorebook', original: 'x', translated: 'Vương Phương…', status: 'done' }),
    ];
    expect(findKeywordTriggeredEntries('gặp 芳芳', fields)).toHaveLength(1);
  });

  it('text quá ngắn / rỗng → rỗng', () => {
    expect(findKeywordTriggeredEntries('', baseFields())).toEqual([]);
  });
});
