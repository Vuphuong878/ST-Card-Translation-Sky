// ═══════════════════════════════════════════════════════════════════════════════
// LƯỚI AN TOÀN CÚ PHÁP — Mod Card viết lại <script>/JS, nếu AI trả code vỡ cú pháp thì
// nạp vào SillyTavern sẽ liệt nút. Ở đây chỉ CẢNH BÁO (không tự sửa code sáng tạo của AI).
//
// Dùng `new Function(code)` để BIÊN DỊCH thử (KHÔNG chạy) — bắt lỗi cú pháp, 0 phụ thuộc
// (khác Dịch Card dùng acorn; Mod Card là Next.js không có acorn). Đủ để cảnh báo.
// ═══════════════════════════════════════════════════════════════════════════════

/** Cú pháp JS có hợp lệ không? new Function biên dịch thân hàm, ném lỗi nếu sai cú pháp. */
export function isJsSyntaxOk(code: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    new Function(code);
    return true;
  } catch (e) {
    // Chỉ coi là "vỡ" khi đúng là SyntaxError; lỗi khác (ReferenceError…) không xảy ra vì không chạy.
    return !(e instanceof SyntaxError);
  }
}

/** Lấy thân mọi <script>…</script> (bỏ khối rỗng). */
export function extractScriptBodies(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) if (m[1].trim()) out.push(m[1]);
  return out;
}

/**
 * Kiểm cú pháp 1 đoạn code JS (hoặc HTML chứa <script>). Trả về gốc-lành-mà-bản-mới-vỡ để cảnh báo.
 * Chỉ dùng cho JS THUẦN — KHÔNG dùng cho EJS (`<% %>`) vì EJS không phải JS hợp lệ.
 */
export function scriptBrokeByMod(originalJs: string, moddedJs: string): boolean {
  const origBodies = originalJs.includes('<script') ? extractScriptBodies(originalJs) : [originalJs];
  const modBodies = moddedJs.includes('<script') ? extractScriptBodies(moddedJs) : [moddedJs];
  if (origBodies.length !== modBodies.length) return false; // khác cấu trúc → không kết luận
  for (let i = 0; i < modBodies.length; i++) {
    if (modBodies[i].trim() && isJsSyntaxOk(origBodies[i]) && !isJsSyntaxOk(modBodies[i])) return true;
  }
  return false;
}
