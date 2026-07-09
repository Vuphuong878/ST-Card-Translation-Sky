/**
 * src/lib/mvuzod/gameUiValidator.ts — "Cơ chế regex XỊN" cho Game UI Studio
 * ──────────────────────────────────────────────────────────────────────────────
 * Chuỗi kiểm DETERMINISTIC chạy sau mỗi lần AI ghi regex. Kết quả (issues, tiếng Việt +
 * gợi ý sửa) được bơm NGƯỢC cho AI tự sửa ở vòng sau → regex được CHỨNG MINH match
 * trước khi giao cho user, không còn cảnh "nhìn đẹp mà không ăn".
 *
 * THUẦN (không đụng DOM/AI) để test được. Phần "render thật" (V3) do component chạy iframe;
 * validator chỉ trả HTML-đã-thế qua buildRenderableHtml().
 *
 *   V1 — Cú pháp: findRegex compile được, JS trong replaceString parse sạch, field enum đúng.
 *   V2 — MATCH THẬT: findRegex phải match sampleOutput + đủ mọi nhóm $1..$9 mà replaceString dùng.
 *   V4 — KHỚP SCHEMA: biến MVU trong replaceString phải tồn tại trong schema (chống bịa biến).
 */

import { isJsSyntaxOk, extractScriptBodies } from '../scriptSafety';
import { autoFixGameHtml } from './gameHtmlFixer';
import type { RegexScript } from '../../types/regex.types';
import type { MVUZODSchema, MVUZODField } from '../../types/mvuzod.types';

export type DraftScript = Omit<RegexScript, 'id'>;

export interface ValidationIssue {
  level: 'error' | 'warn';
  code:
    | 'REGEX_SYNTAX' | 'SCRIPT_SYNTAX' | 'PLACEMENT' | 'MEANINGLESS_FLAGS' | 'HTML_QUALITY'
    | 'NO_SAMPLE' | 'NO_MATCH' | 'MISSING_GROUP' | 'UNKNOWN_VAR' | 'EDIT_MISMATCH';
  message: string;      // tiếng Việt, kèm gợi ý sửa
  scriptIndex?: number; // script nào trong regexDraft
}

export interface ValidationReport {
  ok: boolean;          // true = không còn issue mức 'error'
  issues: ValidationIssue[];
}

/** Tách "/pattern/flags" (hoặc plain literal) → RegExp. Trả null nếu cú pháp sai. */
export function parseFindRegex(findRegex: string): { re: RegExp; source: string; flags: string } | null {
  if (!findRegex) return null;
  const m = findRegex.match(/^\/([\s\S]+)\/([gimsuy]*)$/);
  const source = m ? m[1] : findRegex;
  const flags = m ? m[2] : '';
  try {
    return { re: new RegExp(source, flags), source, flags };
  } catch {
    return null;
  }
}

/** Các nhóm $1..$9 mà replaceString THAM CHIẾU (bỏ $$ escape). */
function referencedGroups(replaceString: string): number[] {
  const out = new Set<number>();
  const re = /\$(\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(replaceString)) !== null) {
    // Bỏ qua "$$1" (escape của ký tự $)
    if (replaceString[m.index - 1] === '$') continue;
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 9) out.add(n);
  }
  return [...out];
}

const VAR_TOKEN_RES = [
  /getvar::([\w.\-]+)/g,
  /\{\{\s*getvar::([\w.\-]+)\s*\}\}/g,
  /stat_data\.([\w]+)/g,
  /stat_data\[['"]([^'"\]]+)['"]\]/g,
  /_\.get\([^,]+,\s*['"]([^'"]+)['"]/g,
];

/** Rút các biến MVU mà replaceString tham chiếu (leaf name). */
function referencedVars(replaceString: string): string[] {
  const out = new Set<string>();
  for (const re of VAR_TOKEN_RES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(replaceString)) !== null) {
      const raw = m[1];
      // lấy đoạn cuối của đường dẫn (a.b.c → c) để so khớp mềm với tên biến trong schema
      const leaf = raw.split(/[.\[\]']/).filter(Boolean).pop();
      if (leaf) out.add(leaf);
    }
  }
  return [...out];
}

/** Gom TẤT CẢ tên biến hợp lệ từ schema (label + leaf path + full path) để kiểm V4. */
export function collectSchemaVarNames(schema?: MVUZODSchema | null): string[] {
  const out = new Set<string>();
  const walk = (fields?: MVUZODField[]) => {
    for (const f of fields || []) {
      if (f.label) out.add(f.label);
      const leaf = (f.path || '').split('/').filter(Boolean).pop();
      if (leaf) out.add(leaf);
      if (f.path) out.add(f.path.replace(/^\//, ''));
      if (f.children?.length) walk(f.children);
    }
  };
  walk(schema?.fields);
  return [...out];
}

/** Đưa 1 đoạn sampleOutput quanh chỗ gần khớp để AI thấy vì sao trượt. */
function sampleHint(sampleOutput: string): string {
  const s = sampleOutput.trim();
  return s.length > 220 ? s.slice(0, 220) + '…' : s;
}

/**
 * Thế $1..$n bằng capture THẬT (match findRegex trên sampleOutput) vào replaceString → HTML để
 * component đưa vào iframe probe (V3). Trả null nếu không match được (không dựng preview được).
 */
export function buildRenderableHtml(script: DraftScript, sampleOutput: string): string | null {
  const parsed = parseFindRegex(script.findRegex);
  if (!parsed || !sampleOutput) return null;
  const m = sampleOutput.match(parsed.re);
  if (!m) return null;
  let html = script.replaceString;
  html = html.replace(/\$(\d)/g, (whole, d: string) => {
    const n = parseInt(d, 10);
    return m[n] != null ? m[n] : whole;
  });
  html = html.replace(/\{\{\s*match\s*\}\}/g, m[0]);
  return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export function validateRegexDraft(
  scripts: DraftScript[],
  sampleOutput: string,
  schemaVarNames: string[] = [],
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const push = (level: ValidationIssue['level'], code: ValidationIssue['code'], message: string, scriptIndex?: number) =>
    issues.push({ level, code, message, scriptIndex });

  if (scripts.length === 0) {
    return { ok: false, issues: [{ level: 'error', code: 'NO_MATCH', message: 'Chưa có regex script nào — AI cần tạo ít nhất 1 script.' }] };
  }

  const schemaSet = new Set(schemaVarNames.map((s) => s.toLowerCase()));

  scripts.forEach((s, i) => {
    // ─── V1a: findRegex compile ───
    const parsed = parseFindRegex(s.findRegex);
    if (!parsed) {
      push('error', 'REGEX_SYNTAX', `Script #${i + 1} "${s.scriptName}": findRegex "${(s.findRegex || '').slice(0, 60)}" SAI cú pháp — không biên dịch được. Kiểm tra dấu ngoặc/escape hoặc dạng /pattern/flags.`, i);
    }

    // ─── V1b: JS trong replaceString ───
    for (const body of extractScriptBodies(s.replaceString || '')) {
      if (!isJsSyntaxOk(body)) {
        push('error', 'SCRIPT_SYNTAX', `Script #${i + 1} "${s.scriptName}": <script> trong replaceString VỠ cú pháp JS → nạp vào SillyTavern sẽ liệt nút. Sửa lại JS.`, i);
        break;
      }
    }

    // ─── V1c: chất lượng HTML (soft, chỉ WARN — replaceString thường là FRAGMENT widget nên
    //          không chấm điểm như 1 document đầy đủ; JS-parse ở V1b mới là chốt chặn cứng) ───
    if ((s.replaceString || '').includes('<')) {
      try {
        const q = autoFixGameHtml(s.replaceString).qualityScore;
        if (q === 'F') push('warn', 'HTML_QUALITY', `Script #${i + 1} "${s.scriptName}": cấu trúc HTML yếu (điểm F) — kiểm tra thẻ đóng/mở, nên có container bao ngoài.`, i);
      } catch { /* autoFixGameHtml choke trên placeholder → bỏ qua */ }
    }

    // ─── V1d: field enum ───
    const badPlace = (s.placement || []).filter((p) => p < 1 || p > 5);
    if (badPlace.length) push('error', 'PLACEMENT', `Script #${i + 1} "${s.scriptName}": placement ${JSON.stringify(badPlace)} không hợp lệ — chỉ được dùng 1..5 (2=AI Output dùng ~90% ca render widget).`, i);
    if ((s.placement || []).length === 0) push('error', 'PLACEMENT', `Script #${i + 1} "${s.scriptName}": placement RỖNG — phải có ít nhất 1 vị trí (thường là [2] = AI Output).`, i);
    if (s.markdownOnly && s.promptOnly) push('error', 'MEANINGLESS_FLAGS', `Script #${i + 1} "${s.scriptName}": markdownOnly=true VÀ promptOnly=true là VÔ NGHĨA. Render widget → dùng markdownOnly=true, promptOnly=false.`, i);

    // ─── V2: MATCH THẬT ───
    if (!sampleOutput || !sampleOutput.trim()) {
      push('warn', 'NO_SAMPLE', 'Chưa có <sample_output> — hãy cung cấp đoạn văn AI mẫu (có status block đúng format) để CHỨNG MINH regex match được.');
    } else if (parsed) {
      const m = sampleOutput.match(parsed.re);
      if (!m) {
        push('error', 'NO_MATCH', `Script #${i + 1} "${s.scriptName}": findRegex KHÔNG match sampleOutput → regex vô dụng. (Mẹo: status block nhiều dòng thường cần flag "s"/dotAll, vd /…/s). Sample đang có: "${sampleHint(sampleOutput)}"`, i);
      } else {
        for (const g of referencedGroups(s.replaceString || '')) {
          if (m[g] == null || m[g] === '') {
            push('error', 'MISSING_GROUP', `Script #${i + 1} "${s.scriptName}": replaceString dùng $${g} nhưng regex KHÔNG có nhóm capture #${g} (hoặc nhóm rỗng). Thêm ngoặc ( ) cho nhóm ${g} hoặc bỏ $${g}.`, i);
          }
        }
      }
    }

    // ─── V4: KHỚP SCHEMA ───
    if (schemaSet.size > 0) {
      for (const v of referencedVars(s.replaceString || '')) {
        if (!schemaSet.has(v.toLowerCase())) {
          push('warn', 'UNKNOWN_VAR', `Script #${i + 1} "${s.scriptName}": tham chiếu biến "${v}" KHÔNG có trong schema → có thể bịa. Dùng đúng tên biến trong schema hoặc bỏ.`, i);
        }
      }
    }
  });

  return { ok: !issues.some((x) => x.level === 'error'), issues };
}

/** Serialize report thành XML để bơm ngược cho AI tự sửa (ẩn khỏi user). */
export function reportToXml(report: ValidationReport): string {
  const lines = ['<validation_report>'];
  for (const it of report.issues) {
    lines.push(`  <issue level="${it.level}" code="${it.code}"${it.scriptIndex != null ? ` script="${it.scriptIndex}"` : ''}>${escapeXml(it.message)}</issue>`);
  }
  lines.push(`  <verdict>${report.ok ? 'PASS' : 'FAIL — sửa các issue mức error rồi gửi lại (edit_component/set_regex)'}</verdict>`);
  lines.push('</validation_report>');
  return lines.join('\n');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
