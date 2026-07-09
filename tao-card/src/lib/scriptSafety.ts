// ═══════════════════════════════════════════════════════════════════════════════
// LƯỚI AN TOÀN CÚ PHÁP — Tạo Card sinh game HTML có <script>. autoFixGameHtml đã lo phần
// CẤU TRÚC (thẻ đóng/mở, type=module…) nhưng KHÔNG kiểm cú pháp JS. Ở đây kiểm cú pháp JS
// bằng `new Function` (biên dịch thử, KHÔNG chạy — 0 phụ thuộc) để CẢNH BÁO nếu script vỡ.
// ═══════════════════════════════════════════════════════════════════════════════

/** Cú pháp JS có hợp lệ không? new Function biên dịch thân hàm, ném SyntaxError nếu sai. */
export function isJsSyntaxOk(code: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    new Function(code);
    return true;
  } catch (e) {
    return !(e instanceof SyntaxError);
  }
}

/** Lấy thân mọi <script>…</script> (bỏ khối rỗng + script type=application/json…). */
export function extractScriptBodies(html: string): string[] {
  const out: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '';
    // bỏ qua script KHÔNG phải JS (json/importmap…) — chúng không cần đúng cú pháp JS.
    if (/type\s*=\s*["'](?!.*(?:javascript|module))[^"']*["']/i.test(attrs)) continue;
    if (m[2].trim()) out.push(m[2]);
  }
  return out;
}

/** Đếm số <script> vỡ cú pháp trong HTML — để CẢNH BÁO (không tự sửa). */
export function checkHtmlScripts(html: string): { total: number; broken: number } {
  const bodies = extractScriptBodies(html);
  let broken = 0;
  for (const b of bodies) if (!isJsSyntaxOk(b)) broken++;
  return { total: bodies.length, broken };
}
