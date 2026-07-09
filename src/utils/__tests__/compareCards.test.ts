import { describe, it, expect } from 'vitest';
import { buildCompareGroups, valuesDiffer, planMerge } from '../compareCards';
import type { FieldGroup, TranslationField } from '../../types/card';

const f = (path: string, group: FieldGroup, label = path): TranslationField => ({
  path, label, group, original: '', translated: '', status: 'pending', retries: 0,
});

describe('compareCards — buildCompareGroups', () => {
  it('union path của các slot lệch nhau, gom đủ không trùng', () => {
    const slotA = [f('data.name', 'core'), f('data.character_book.entries[0].content', 'lorebook')];
    const slotB = [f('data.name', 'core'), f('data.character_book.entries[1].content', 'lorebook')];
    const groups = buildCompareGroups([slotA, slotB]);

    const core = groups.find((g) => g.group === 'core');
    const lore = groups.find((g) => g.group === 'lorebook');
    expect(core?.entries.map((e) => e.path)).toEqual(['data.name']); // trùng path → 1
    expect(lore?.entries.map((e) => e.path)).toEqual([
      'data.character_book.entries[0].content',
      'data.character_book.entries[1].content',
    ]);
  });

  it('nhóm theo thứ tự chuẩn: core trước lorebook', () => {
    const slot = [f('data.character_book.entries[0].content', 'lorebook'), f('data.name', 'core')];
    const groups = buildCompareGroups([slot]);
    expect(groups.map((g) => g.group)).toEqual(['core', 'lorebook']);
  });

  it('sort path tự nhiên: entries[2] trước entries[10]', () => {
    const slot = [
      f('data.character_book.entries[10].content', 'lorebook'),
      f('data.character_book.entries[2].content', 'lorebook'),
      f('data.character_book.entries[1].content', 'lorebook'),
    ];
    const [lore] = buildCompareGroups([slot]);
    expect(lore.entries.map((e) => e.path)).toEqual([
      'data.character_book.entries[1].content',
      'data.character_book.entries[2].content',
      'data.character_book.entries[10].content',
    ]);
  });

  it('có nhãn tiếng Việt cho nhóm', () => {
    const [core] = buildCompareGroups([[f('data.name', 'core')]]);
    expect(core.label).toContain('Cốt lõi');
  });

  it('mảng rỗng → không nhóm', () => {
    expect(buildCompareGroups([])).toEqual([]);
    expect(buildCompareGroups([[]])).toEqual([]);
  });
});

describe('compareCards — valuesDiffer', () => {
  it('mọi giá trị giống → false', () => {
    expect(valuesDiffer(['a', 'a', 'a'])).toBe(false);
  });
  it('có giá trị khác → true', () => {
    expect(valuesDiffer(['a', 'b', 'a'])).toBe(true);
  });
  it('chỉ 1 slot có giá trị (còn lại thiếu) → false', () => {
    expect(valuesDiffer(['a', undefined, undefined])).toBe(false);
  });
  it('2 slot có, giống nhau, 1 thiếu → false', () => {
    expect(valuesDiffer(['a', undefined, 'a'])).toBe(false);
  });
  it('2 slot có, khác nhau → true', () => {
    expect(valuesDiffer(['a', undefined, 'b'])).toBe(true);
  });
});

describe('compareCards — planMerge (Gộp thông minh)', () => {
  const M = (o: Record<string, string>) => new Map(Object.entries(o));

  it('entry KHÔNG đổi + có bản dịch cũ → TÁI DÙNG', () => {
    const raw = M({ 'a': '你好', 'b': '世界' });
    const dich = M({ 'a': 'Xin chào', 'b': 'Thế giới' });
    const final = M({ 'a': '你好', 'b': '世界' });
    const p = planMerge(raw, dich, final);
    expect(p.counts).toEqual({ reused: 2, changed: 0, total: 2 });
    expect(p.reused.get('a')).toBe('Xin chào');
    expect(p.reused.get('b')).toBe('Thế giới');
  });

  it('entry ĐỔI (tác giả sửa) → CẦN DỊCH, không tái dùng', () => {
    const raw = M({ 'a': '你好' });
    const dich = M({ 'a': 'Xin chào' });
    const final = M({ 'a': '你好世界' }); // tác giả sửa
    const p = planMerge(raw, dich, final);
    expect(p.changed.has('a')).toBe(true);
    expect(p.reused.size).toBe(0);
  });

  it('entry MỚI (không có trong Raw) → CẦN DỊCH', () => {
    const raw = M({ 'a': '你好' });
    const dich = M({ 'a': 'Xin chào' });
    const final = M({ 'a': '你好', 'c': '新内容' }); // c là mới
    const p = planMerge(raw, dich, final);
    expect(p.reused.has('a')).toBe(true);
    expect(p.changed.has('c')).toBe(true);
    expect(p.counts).toEqual({ reused: 1, changed: 1, total: 2 });
  });

  it('KHÔNG đổi nhưng THIẾU bản dịch cũ → CẦN DỊCH (không thể tái dùng)', () => {
    const raw = M({ 'a': '你好' });
    const dich = M({}); // Đã Dịch thiếu 'a'
    const final = M({ 'a': '你好' });
    const p = planMerge(raw, dich, final);
    expect(p.changed.has('a')).toBe(true);
    expect(p.reused.size).toBe(0);
  });

  it('KHÔNG đổi nhưng bản dịch cũ RỖNG → CẦN DỊCH', () => {
    const p = planMerge(M({ 'a': '你好' }), M({ 'a': '   ' }), M({ 'a': '你好' }));
    expect(p.changed.has('a')).toBe(true);
  });

  it('chỉ khác CRLF/LF → coi như KHÔNG đổi (vẫn tái dùng)', () => {
    const raw = M({ 'a': 'dòng 1\r\ndòng 2' });
    const dich = M({ 'a': 'line 1\nline 2' });
    const final = M({ 'a': 'dòng 1\ndòng 2' }); // chỉ khác xuống dòng
    const p = planMerge(raw, dich, final);
    expect(p.reused.has('a')).toBe(true);
  });

  it('bảo thủ: chỉ khác khoảng trắng đuôi → coi là ĐỔI (an toàn, thà dịch lại)', () => {
    const raw = M({ 'a': '你好' });
    const dich = M({ 'a': 'Xin chào' });
    const final = M({ 'a': '你好 ' }); // thêm 1 space đuôi
    const p = planMerge(raw, dich, final);
    expect(p.changed.has('a')).toBe(true);
  });

  it('entry bị XOÁ ở Final (còn ở Raw) → bỏ qua, không tính', () => {
    const raw = M({ 'a': '你好', 'b': '世界' });
    const dich = M({ 'a': 'Xin chào', 'b': 'Thế giới' });
    const final = M({ 'a': '你好' }); // b bị xoá
    const p = planMerge(raw, dich, final);
    expect(p.counts.total).toBe(1);
    expect(p.reused.has('b')).toBe(false);
    expect(p.changed.has('b')).toBe(false);
  });
});
