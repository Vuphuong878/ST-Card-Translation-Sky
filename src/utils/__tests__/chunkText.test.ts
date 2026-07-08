import { describe, it, expect } from 'vitest';
import { chunkText } from '../apiClient';

/**
 * chunkText cắt entry lớn thành nhiều phần để dịch SONG SONG rồi ghép lại. Bất biến quan trọng
 * nhất: KHÔNG mất/nuốt/thêm ký tự (join các chunk == văn bản gốc) — nếu vỡ bất biến này, bản dịch
 * ghép lại sẽ thiếu chữ. Ngoài ra: text ngắn → 1 chunk; HARD_CAP 15k luôn được tôn trọng.
 */
describe('chunkText', () => {
  it('text ngắn hơn ngưỡng → đúng 1 chunk, y nguyên', () => {
    expect(chunkText('xin chào')).toEqual(['xin chào']);
    expect(chunkText('')).toEqual(['']);
  });

  it('không mất ký tự — join(chunks) === text (văn xuôi nhiều dòng)', () => {
    const text = Array.from({ length: 500 }, (_, i) => `Đây là dòng số ${i} trong một đoạn dài.`).join('\n');
    const chunks = chunkText(text, 400);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe(text);            // bất biến cốt lõi: không rơi rụng
    expect(chunks.every((c) => c.length > 0)).toBe(true);
  });

  it('HARD_CAP 15.000 — maxChars quá lớn vẫn bị kẹp về 15k', () => {
    const text = 'a'.repeat(20000);                // không có ranh giới an toàn → hard cut tại cap
    const chunks = chunkText(text, 999999);
    expect(chunks.join('')).toBe(text);
    expect(chunks[0].length).toBe(15000);          // chunk đầu đúng bằng HARD_CAP
  });

  it('maxChars mặc định = 15.000 khi không truyền', () => {
    const text = 'b'.repeat(15000);
    expect(chunkText(text)).toEqual([text]);       // đúng 15k → vẫn 1 chunk (≤ cap)
    expect(chunkText('b'.repeat(15001)).length).toBeGreaterThan(1); // 15k+1 → phải chia
  });

  it('mỗi chunk không vượt quá 1.5× maxChars (giới hạn overflow-rescue)', () => {
    const text = ('Câu văn tiếng Việt bình thường. '.repeat(2000));
    const max = 500;
    const chunks = chunkText(text, max);
    expect(chunks.join('')).toBe(text);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(Math.floor(max * 1.5));
  });
});
