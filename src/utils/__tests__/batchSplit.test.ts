import { describe, it, expect } from 'vitest';
import { splitLorebookBatches } from '../batchSplit';
import type { TranslationField } from '../../types/card';

// Hàm chia lô CHUNG cho pipeline Dịch + Mod (audit đợt 3 — khử code đúp).
const mk = (over: Partial<TranslationField> = {}): TranslationField => ({
  path: over.path || `p${Math.random()}`,
  label: 'x',
  original: over.original ?? 'a'.repeat(100),
  translated: over.translated ?? '',
  status: 'pending',
  group: 'lorebook',
  ...over,
} as TranslationField);

const BASE = { batchSize: 5, maxBatchChars: 65536, mvuEnabled: false };

describe('splitLorebookBatches — hành vi pipeline DỊCH', () => {
  it('standard: chia theo batchSize, không mất field', () => {
    const fields = Array.from({ length: 12 }, () => mk());
    const r = splitLorebookBatches(fields, BASE);
    expect(r.batches.flat()).toHaveLength(12);
    for (const b of r.batches) expect(b.length).toBeLessThanOrEqual(5);
    expect(r.prefer.every(p => p === false)).toBe(true);
  });

  it('entry dài > isolateChars → 1 lô riêng (để dịch chunk)', () => {
    const big = mk({ original: 'a'.repeat(20000) });
    const fields = [mk(), big, mk()];
    const r = splitLorebookBatches(fields, { ...BASE, isolateChars: 16000 });
    const solo = r.batches.find(b => b.length === 1 && b[0] === big);
    expect(solo).toBeTruthy();
    expect(r.batches.flat()).toHaveLength(3);
  });

  it('softCharCap: lô ≥ softMinCount field và sắp vượt trần mềm → chốt lô sớm', () => {
    // 5 field × 9000 chars, soft 30000, min 3 → 3 field đầu (27000) rồi chốt
    const fields = Array.from({ length: 5 }, () => mk({ original: 'a'.repeat(9000) }));
    const r = splitLorebookBatches(fields, { ...BASE, softCharCap: 30000, softMinCount: 3 });
    expect(r.batches[0]).toHaveLength(3);
    expect(r.batches.flat()).toHaveLength(5);
  });

  it('MVU: schema (initvar/controller/mvu_logic) LUÔN 1 field/lô và xếp TRƯỚC narrative', () => {
    const fields = [
      mk({ entryType: 'narrative' }), mk({ entryType: 'initvar' }),
      mk({ entryType: 'narrative' }), mk({ entryType: 'controller' }),
    ];
    const r = splitLorebookBatches(fields, { ...BASE, mvuEnabled: true });
    // 2 lô đầu là schema 1-1
    expect(r.batches[0]).toHaveLength(1);
    expect(['initvar', 'controller']).toContain(r.batches[0][0].entryType);
    expect(r.batches[1]).toHaveLength(1);
    expect(r.summary).toContain('initvar:1');
    expect(r.batches.flat()).toHaveLength(4);
  });

  it('smartPacking: entry ngắn gộp (prefer=true), schema vẫn 1-1 (prefer=false)', () => {
    const fields = [
      mk({ entryType: 'initvar', original: 'a'.repeat(50) }),
      mk({ entryType: 'narrative', original: 'a'.repeat(200) }),
      mk({ entryType: 'narrative', original: 'a'.repeat(300) }),
      mk({ entryType: 'narrative', original: 'a'.repeat(400) }),
    ];
    const r = splitLorebookBatches(fields, { ...BASE, mvuEnabled: true, smartPacking: true });
    const schemaIdx = r.batches.findIndex(b => b[0].entryType === 'initvar');
    expect(r.prefer[schemaIdx]).toBe(false);
    const packedIdx = r.batches.findIndex(b => b.length === 3);
    expect(packedIdx).toBeGreaterThanOrEqual(0);
    expect(r.prefer[packedIdx]).toBe(true);
  });

  it('model routing: field khác model không chung lô', () => {
    const a = mk(); const b = mk();
    const r = splitLorebookBatches([a, b], { ...BASE, getModelKey: (f) => (f === a ? 'pro' : 'flash') });
    expect(r.batches).toHaveLength(2);
  });
});

describe('splitLorebookBatches — hành vi pipeline MOD', () => {
  it('dùng getLength = translated||original (bản mod đã dài hơn vẫn đếm đúng)', () => {
    // maxBatchChars 1000; translated dài 800 → 2 field không chung lô dù original ngắn
    const f1 = mk({ original: 'a'.repeat(10), translated: 'b'.repeat(800) });
    const f2 = mk({ original: 'a'.repeat(10), translated: 'b'.repeat(800) });
    const r = splitLorebookBatches([f1, f2], {
      batchSize: 5, maxBatchChars: 1000, mvuEnabled: false,
      getLength: (f) => (f.translated || f.original).length,
    });
    expect(r.batches).toHaveLength(2);
  });

  it('mod không isolate/soft/smart: 1 nhóm nhét tuần tự đơn thuần', () => {
    const fields = Array.from({ length: 7 }, () => mk());
    const r = splitLorebookBatches(fields, { batchSize: 3, maxBatchChars: 65536, mvuEnabled: false });
    expect(r.batches.map(b => b.length)).toEqual([3, 3, 1]);
  });
});
