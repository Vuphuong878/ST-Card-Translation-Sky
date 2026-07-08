import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as acornParse } from 'acorn';
import { extractCJKTokens, reinsertTranslations, repairScriptSyntaxCorruption } from '../surgical';

/**
 * Regression cho v1.43.0 — "dịch regex/HTML làm VỠ code JS".
 * Gốc bug: token CJK nằm TRONG chuỗi ('1. …') hoặc văn xuôi đánh số bị nhầm là dot-notation/
 * object-key → reinsert bọc ['bản dịch'] chèn dấu ' vào giữa chuỗi → SyntaxError, <script> sập.
 * Bộ test này khoá lại 2 tầng: (1) detector KHÔNG bọc prose-trong-chuỗi; (2) lưới acorn TỰ VÁ.
 */

/** parse thử bằng acorn; trả về true nếu cú pháp JS hợp lệ. */
function jsOk(code: string): boolean {
  try { acornParse(code, { ecmaVersion: 'latest' }); return true; }
  catch { return false; }
}

/** Dịch mọi token CJK sang 1 chuỗi tiếng Việt cố định rồi ghép lại (mô phỏng surgicalTranslate). */
function translateAll(src: string, vi: string): string {
  const tokens = extractCJKTokens(src);
  for (const t of tokens) t.translated = vi;
  return reinsertTranslations(src, tokens);
}

describe('extractCJKTokens + reinsertTranslations — không phá cú pháp', () => {
  it('CJK TRONG chuỗi string (văn xuôi đánh số) → thay chữ thuần, KHÔNG bọc [\'…\']', () => {
    const src = "let s = '';\ns += '1. 世界时局';";
    const out = translateAll(src, 'Thế cục');
    expect(out).toContain("'1. Thế cục'");   // giữ nguyên trong chuỗi
    expect(out).not.toContain("['");           // KHÔNG có bracket-wrap phá chuỗi
    expect(jsOk(out)).toBe(true);              // cú pháp còn lành
  });

  it('dot-notation THẬT (obj.状态) → vẫn chuyển sang bracket-notation hợp lệ', () => {
    const src = 'const obj = {}; obj.状态 = 1;';
    const out = translateAll(src, 'Trạng thái');
    expect(out).toContain("['Trạng thái']");   // dịch tên có dấu → bracket cho đúng JS
    expect(out).not.toContain('obj.Trạng');    // không để dot + tên có dấu (sẽ vỡ)
    expect(jsOk(out)).toBe(true);
  });

  it('object-key có dấu → bọc nháy, cú pháp lành', () => {
    const src = 'const m = { 状态: 1 };';
    const out = translateAll(src, 'Trạng thái');
    expect(jsOk(out)).toBe(true);
  });

  it('CJK trong template literal ${obj.CJK} → giữ wrap (không nhầm là prose)', () => {
    const src = 'const x = `${obj.状态}`;';
    const out = translateAll(src, 'Trạng thái');
    expect(jsOk(out)).toBe(true);
  });
});

describe('repairScriptSyntaxCorruption — hợp đồng cơ bản', () => {
  it('không có <script> → trả nguyên văn, repaired = 0', () => {
    const r = repairScriptSyntaxCorruption('<div>a</div>', '<div>b</div>');
    expect(r.repaired).toBe(0);
    expect(r.text).toBe('<div>b</div>');
  });

  it('số <script> gốc ≠ bản dịch → bỏ qua an toàn (repaired = 0)', () => {
    const orig = '<script>var a=1;</script><script>var b=2;</script>';
    const trans = '<script>var a=1;</script>';
    const r = repairScriptSyntaxCorruption(orig, trans);
    expect(r.repaired).toBe(0);
  });

  it('bản dịch đã lành → không đụng (repaired = 0)', () => {
    const orig = "<script>var a = '你好';</script>";
    const trans = "<script>var a = 'Xin chào';</script>";
    const r = repairScriptSyntaxCorruption(orig, trans);
    expect(r.repaired).toBe(0);
    expect(jsOk(trans.replace(/<\/?script>/g, ''))).toBe(true);
  });
});

// ─── Test tích hợp trên CARD LỖI THẬT (chỉ chạy khi file fixture còn ở dev_data) ───
// Đây là đúng cặp file user đưa: bản gốc (JS lành) vs bản dịch lỗi (JS vỡ). v1.43.0 vá 19 chỗ.
const RAW = fileURLToPath(new URL('../../../dev_data/Mở Đầu-raw.html', import.meta.url));
const BROKEN = fileURLToPath(new URL('../../../dev_data/Mở đầu- dịch lỗi.html', import.meta.url));
const haveFixtures = existsSync(RAW) && existsSync(BROKEN);

describe.skipIf(!haveFixtures)('repairScriptSyntaxCorruption — fixture card lỗi thật', () => {
  it('vá được ≥1 script vỡ và mọi <script> parse sạch sau khi vá', () => {
    const original = readFileSync(RAW, 'utf8');
    const broken = readFileSync(BROKEN, 'utf8');
    const { text, repaired } = repairScriptSyntaxCorruption(original, broken);
    expect(repaired).toBeGreaterThan(0);

    // Sau khi vá: mọi <script> mà bản GỐC parse được thì bản vá cũng phải parse được.
    const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const origBodies: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(original)) !== null) if (m[1].trim()) origBodies.push(m[1]);
    re.lastIndex = 0;
    const fixedBodies: string[] = [];
    while ((m = re.exec(text)) !== null) if (m[1].trim()) fixedBodies.push(m[1]);

    for (let i = 0; i < fixedBodies.length; i++) {
      if (origBodies[i] && jsOk(origBodies[i])) {
        expect(jsOk(fixedBodies[i]), `script #${i + 1} vẫn vỡ sau khi vá`).toBe(true);
      }
    }
  });
});
