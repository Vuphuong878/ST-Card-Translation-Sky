import { describe, it, expect } from 'vitest';
import { maskCssCjkValues, unmaskCssCjkValues } from '../apiClient';

/**
 * "Bảo vệ CSS khỏi CJK" — chế độ Giữ nguyên (preserve) phải ẩn CJK trong CSS value khỏi AI rồi
 * khôi phục nguyên văn. Bản cũ chỉ bắt CJK ngay sau "(" + phải có khoảng trắng → sót nhiều biến thể
 * (drop-shadow(商), blur(商), 10px trước CJK…) nên vẫn bị dịch. Bản mới bắt CJK bất kỳ đâu trong ngoặc.
 */

/** Ẩn CJK còn sót không? (masked text KHÔNG được còn ký tự Hán/CJK để AI khỏi dịch) */
const CJK = /[一-鿿㐀-䶿぀-ヿ가-힯]/;

function roundTrip(input: string) {
  const { maskedText, map } = maskCssCjkValues(input, 'preserve');
  return { maskedText, restored: unmaskCssCjkValues(maskedText, map, 'preserve') };
}

describe('maskCssCjkValues — preserve (Giữ nguyên)', () => {
  it('drop-shadow(商 10px) → ẩn CJK + khôi phục nguyên văn', () => {
    const src = 'filter: drop-shadow(商 10px);';
    const { maskedText, restored } = roundTrip(src);
    expect(CJK.test(maskedText)).toBe(false); // AI không thấy CJK
    expect(restored).toBe(src);               // khôi phục y hệt
  });

  it('BẢN VÁ: drop-shadow(商) [không có phần đuôi] cũng được ẩn (bản cũ sót)', () => {
    const src = 'filter: drop-shadow(商);';
    const { maskedText, restored } = roundTrip(src);
    expect(CJK.test(maskedText)).toBe(false);
    expect(restored).toBe(src);
  });

  it('BẢN VÁ: CJK KHÔNG ở đầu đối số — drop-shadow(10px 商) — cũng được ẩn', () => {
    const src = 'drop-shadow(10px 商)';
    const { maskedText, restored } = roundTrip(src);
    expect(CJK.test(maskedText)).toBe(false);
    expect(restored).toBe(src);
  });

  it('blur(商) và các hàm khác cũng được ẩn', () => {
    const { maskedText, restored } = roundTrip('blur(商)');
    expect(CJK.test(maskedText)).toBe(false);
    expect(restored).toBe('blur(商)');
  });

  it('content: "商品" (CSS string value) → ẩn + khôi phục', () => {
    const src = "a::before { content: '商品'; }";
    const { maskedText, restored } = roundTrip(src);
    expect(CJK.test(maskedText)).toBe(false);
    expect(restored).toBe(src);
  });

  it('không có CJK trong CSS → không đổi gì', () => {
    const src = 'filter: drop-shadow(10px 5px black);';
    const { maskedText, restored } = roundTrip(src);
    expect(maskedText).toBe(src);
    expect(restored).toBe(src);
  });
});

describe('maskCssCjkValues — translate (Dịch)', () => {
  it('KHÔNG ẩn gì → AI thấy CJK để dịch', () => {
    const src = 'drop-shadow(商 10px)';
    const { maskedText, map } = maskCssCjkValues(src, 'translate');
    expect(maskedText).toBe(src);            // giữ nguyên, không mask
    expect(Object.keys(map)).toHaveLength(0);
  });
});
