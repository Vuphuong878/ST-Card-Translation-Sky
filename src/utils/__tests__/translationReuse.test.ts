import { describe, it, expect } from 'vitest';
import { findReusableTwin } from '../translationReuse';
import type { TranslationField } from '../../types/card';

function mk(o: Partial<TranslationField>): TranslationField {
  return {
    path: 'p', label: 'L', group: 'basic', original: '', translated: '', status: 'pending', retries: 0,
    ...o,
  } as unknown as TranslationField;
}

describe('findReusableTwin', () => {
  it('tìm được trường done trùng nội dung + nhóm + loại', () => {
    const done = mk({ path: 'a', original: '开始', translated: 'Bắt đầu', status: 'done', group: 'lorebook_keys' });
    const target = mk({ path: 'b', original: '开始', status: 'pending', group: 'lorebook_keys' });
    expect(findReusableTwin([done, target], target)).toBe(done);
  });

  it('KHÔNG tái dùng nếu khác nhóm', () => {
    const done = mk({ path: 'a', original: '开始', translated: 'Bắt đầu', status: 'done', group: 'lorebook_keys' });
    const target = mk({ path: 'b', original: '开始', status: 'pending', group: 'regex' });
    expect(findReusableTwin([done, target], target)).toBeUndefined();
  });

  it('KHÔNG tái dùng nếu khác entryType', () => {
    const done = mk({ path: 'a', original: 'x', translated: 'X', status: 'done', entryType: 'narrative' });
    const target = mk({ path: 'b', original: 'x', status: 'pending', entryType: 'json_patch' });
    expect(findReusableTwin([done, target], target)).toBeUndefined();
  });

  it('KHÔNG tái dùng trường chưa done / rỗng translated / chính nó', () => {
    const pending = mk({ path: 'a', original: 'x', translated: '', status: 'pending' });
    const target = mk({ path: 'b', original: 'x', status: 'pending' });
    expect(findReusableTwin([pending, target], target)).toBeUndefined();
    // chỉ có chính nó → không tự tái dùng
    expect(findReusableTwin([target], target)).toBeUndefined();
  });

  it('nội dung gốc rỗng → không tái dùng', () => {
    const done = mk({ path: 'a', original: '', translated: 'x', status: 'done' });
    const target = mk({ path: 'b', original: '', status: 'pending' });
    expect(findReusableTwin([done, target], target)).toBeUndefined();
  });
});
