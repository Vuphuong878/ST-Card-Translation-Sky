import { describe, it, expect } from 'vitest';
import { buildCompareGroups, valuesDiffer } from '../compareCards';
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
