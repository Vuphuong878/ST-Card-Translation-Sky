// ═══════════════════════════════════════════════════════════════════════════════
// LƯỚI AN TOÀN CÚ PHÁP <script> — util DÙNG CHUNG (một nguồn sự thật)
//
// Trước đây logic "trích thân <script> + parse acorn" bị lặp ở surgical.ts (để TỰ VÁ) và
// cardHealth.ts (để CẢNH BÁO). Gom về đây: surgical dùng jsParseError (cần VỊ TRÍ lỗi để vá),
// cardHealth dùng isJsSyntaxOk (chỉ cần đúng/sai). Parse KHÔNG chạy code nên an toàn.
// ═══════════════════════════════════════════════════════════════════════════════
import { parse as acornParse } from 'acorn';

/** Lấy thân mọi <script>…</script> (bỏ khối rỗng). */
export function extractScriptBodies(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) if (m[1].trim()) out.push(m[1]);
  return out;
}

/** Trả về lỗi cú pháp JS (kèm VỊ TRÍ) nếu có, hoặc null nếu parse sạch. */
export function jsParseError(code: string): { pos: number; msg: string } | null {
  try {
    acornParse(code, { ecmaVersion: 'latest' });
    return null;
  } catch (e: unknown) {
    const err = e as { pos?: number; message?: string };
    return { pos: typeof err?.pos === 'number' ? err.pos : -1, msg: String(err?.message || e) };
  }
}

/** Cú pháp JS có hợp lệ không (đúng/sai). */
export function isJsSyntaxOk(code: string): boolean {
  return jsParseError(code) === null;
}

/**
 * Đếm số <script> vỡ cú pháp trong 1 đoạn HTML — dùng để CẢNH BÁO (không tự sửa).
 * Trả về { total, broken, brokenIndices }.
 */
export function checkHtmlScripts(html: string): { total: number; broken: number; brokenIndices: number[] } {
  const bodies = extractScriptBodies(html);
  const brokenIndices: number[] = [];
  bodies.forEach((b, i) => { if (!isJsSyntaxOk(b)) brokenIndices.push(i); });
  return { total: bodies.length, broken: brokenIndices.length, brokenIndices };
}
