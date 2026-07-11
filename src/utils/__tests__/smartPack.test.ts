import { describe, it, expect } from 'vitest';
import { smartPackFields, SMART_PACK_SOLO_CHARS, SMART_PACK_CHAR_BUDGET, SMART_PACK_MAX_COUNT } from '../smartPack';

// "Dịch siêu tốc": entry ngắn GỘP chung 1 call (flash), entry dài để RIÊNG (pro).
const mk = (len: number) => ({ original: 'x'.repeat(len) });

describe('smartPackFields — bin-packing thông minh', () => {
  it('entry dài (> soloChars) → mỗi cái 1 lô riêng, KHÔNG đi model phụ', () => {
    const out = smartPackFields([mk(9000), mk(20000)]);
    expect(out).toHaveLength(2);
    out.forEach(p => {
      expect(p.batch).toHaveLength(1);
      expect(p.preferSecondary).toBe(false);
    });
  });

  it('entry ngắn → gộp chung 1 lô, đi model phụ', () => {
    const out = smartPackFields([mk(500), mk(800), mk(300), mk(1000)]);
    expect(out).toHaveLength(1);
    expect(out[0].batch).toHaveLength(4);
    expect(out[0].preferSecondary).toBe(true);
  });

  it('tôn trọng trần ký tự / lô (charBudget)', () => {
    // 4 entry × 4000 = 16000 > budget 10000 → phải chia ≥2 lô
    const out = smartPackFields([mk(4000), mk(4000), mk(4000), mk(4000)]);
    expect(out.length).toBeGreaterThanOrEqual(2);
    for (const p of out) {
      const total = p.batch.reduce((s, f) => s + f.original.length, 0);
      expect(total).toBeLessThanOrEqual(SMART_PACK_CHAR_BUDGET);
      expect(p.preferSecondary).toBe(true);
    }
  });

  it('tôn trọng trần số entry / lô (maxCount)', () => {
    const many = Array.from({ length: 30 }, () => mk(100));
    const out = smartPackFields(many);
    for (const p of out) expect(p.batch.length).toBeLessThanOrEqual(SMART_PACK_MAX_COUNT);
    // 30 entry nhỏ → chỉ ~3 call thay vì 30
    expect(out.length).toBeLessThanOrEqual(Math.ceil(30 / SMART_PACK_MAX_COUNT) + 1);
  });

  it('trộn dài + ngắn: dài tách riêng (pro), ngắn gộp (flash), không mất entry', () => {
    const fields = [mk(12000), mk(200), mk(9000), mk(700), mk(50)];
    const out = smartPackFields(fields);
    const totalFields = out.reduce((s, p) => s + p.batch.length, 0);
    expect(totalFields).toBe(5);
    const solo = out.filter(p => !p.preferSecondary);
    const packed = out.filter(p => p.preferSecondary);
    expect(solo).toHaveLength(2);           // 12000 + 9000
    expect(packed).toHaveLength(1);          // 200+700+50 gộp 1 lô
    expect(packed[0].batch).toHaveLength(3);
  });

  it('ranh giới: entry đúng = soloChars vẫn được coi là ngắn (gộp được)', () => {
    const out = smartPackFields([mk(SMART_PACK_SOLO_CHARS)]);
    expect(out).toHaveLength(1);
    expect(out[0].preferSecondary).toBe(true);
  });
});
