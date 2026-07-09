// ═══════════════════════════════════════════════════════════════════════════════
// SỨC KHOẺ THẺ — quét nhanh bản dịch TRƯỚC KHI XUẤT để bắt lỗi "chết người" mà bảng
// trạng thái trường (done/error) KHÔNG thấy: <script> vỡ cú pháp (nút bấm liệt trong
// SillyTavern), chữ Hán còn sót trong field code, trường lỗi/chưa dịch.
//
// Thuần tuý (không gọi API, không đụng store) → dễ test + dùng lại cho báo cáo dịch.
// Tái dùng `checkCodeFieldForCjk` (mvuValidator) cho CJK-trong-code, acorn cho parse JS.
// ═══════════════════════════════════════════════════════════════════════════════
import { parse as acornParse } from 'acorn';
import { checkCodeFieldForCjk } from './mvuValidator';
import type { TranslationField } from '../types/card';

/** Ideograph CJK (Trung/Nhật/Hàn) — dùng để phát hiện chữ chưa dịch còn sót. */
const CJK_IDEOGRAPH = /[一-鿿㐀-䶿぀-ヿ가-힯]/g;

export type HealthSeverity = 'error' | 'warning' | 'info';
export type HealthKind =
  | 'field_error'        // trường dịch lỗi
  | 'field_pending'      // trường chưa dịch xong
  | 'broken_script'      // <script> gốc lành mà bản dịch vỡ cú pháp → nút bấm liệt
  | 'residual_cjk_code'  // chữ Hán còn trong field code (json_patch/initvar/controller)
  | 'residual_cjk_text'; // chữ Hán còn sót trong văn bản đã "done" (có thể là tên riêng cố ý)

export interface HealthIssue {
  severity: HealthSeverity;
  kind: HealthKind;
  label: string;
  path: string;
  detail: string;
}

export interface HealthReport {
  counts: {
    total: number;
    done: number;
    error: number;
    pending: number;
    skipped: number;
    brokenScripts: number;
    residualCjkCode: number;
    residualCjkText: number;
  };
  issues: HealthIssue[];
  /** true = không còn vấn đề mức 'error' → an toàn để xuất. */
  ok: boolean;
}

/** Bao nhiêu ký tự CJK còn sót trong 1 field 'done' thì mới coi là đáng chú ý (giảm nhiễu
 *  tên riêng để nguyên có chủ đích). */
const RESIDUAL_TEXT_THRESHOLD = 3;

function jsParses(code: string): boolean {
  try { acornParse(code, { ecmaVersion: 'latest' }); return true; }
  catch { return false; }
}

/** Lấy thân mọi <script>…</script> (bỏ khối rỗng). */
function scriptBodies(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) if (m[1].trim()) out.push(m[1]);
  return out;
}

const CODE_ENTRY_TYPES = new Set(['json_patch', 'initvar', 'controller']);

/** Quét toàn bộ trường → báo cáo sức khoẻ (đếm + danh sách vấn đề đã sắp theo mức độ). */
export function scanFieldsHealth(fields: TranslationField[]): HealthReport {
  const issues: HealthIssue[] = [];
  let brokenScripts = 0, residualCjkCode = 0, residualCjkText = 0;
  let done = 0, error = 0, pending = 0, skipped = 0;

  for (const f of fields) {
    if (f.status === 'done') done++;
    else if (f.status === 'error') error++;
    else if (f.status === 'pending' || f.status === 'translating') pending++;
    else if (f.status === 'skipped' || f.status === 'ignored') skipped++;

    if (f.status === 'error') {
      issues.push({ severity: 'error', kind: 'field_error', label: f.label, path: f.path,
        detail: f.error || 'Dịch lỗi.' });
    } else if (f.status === 'pending' || f.status === 'translating') {
      issues.push({ severity: 'warning', kind: 'field_pending', label: f.label, path: f.path,
        detail: 'Chưa dịch xong.' });
    }

    const trans = f.translated;
    if (!trans) continue;

    // ─── <script> vỡ cú pháp DO DỊCH (gốc lành → bản dịch vỡ) ───
    const orig = f.original || '';
    if (trans.includes('<script') && orig.includes('<script')) {
      const ob = scriptBodies(orig);
      const tb = scriptBodies(trans);
      if (ob.length === tb.length) {
        for (let i = 0; i < tb.length; i++) {
          if (jsParses(ob[i]) && !jsParses(tb[i])) {
            brokenScripts++;
            issues.push({ severity: 'error', kind: 'broken_script', label: f.label, path: f.path,
              detail: `Script #${i + 1} vỡ cú pháp JS (nút bấm sẽ liệt trong SillyTavern).` });
          }
        }
      }
    }

    // ─── Chữ Hán còn trong field CODE (json_patch/initvar/controller) ───
    if (f.entryType && CODE_ENTRY_TYPES.has(f.entryType)) {
      const chk = checkCodeFieldForCjk(trans, f.entryType);
      if (!chk.valid) {
        residualCjkCode++;
        issues.push({ severity: 'error', kind: 'residual_cjk_code', label: f.label, path: f.path,
          detail: `Còn chữ Hán trong code: "…${chk.residual}…"` });
      }
    } else if (f.status === 'done') {
      // ─── Chữ Hán còn sót trong VĂN BẢN đã done (info: có thể tên riêng cố ý) ───
      const matches = trans.match(CJK_IDEOGRAPH);
      if (matches && matches.length >= RESIDUAL_TEXT_THRESHOLD) {
        residualCjkText++;
        issues.push({ severity: 'info', kind: 'residual_cjk_text', label: f.label, path: f.path,
          detail: `Còn ${matches.length} ký tự Hán chưa dịch (kiểm tra xem có phải tên riêng giữ nguyên không).` });
      }
    }
  }

  // Sắp xếp: error → warning → info (để danh sách hiển thị cái quan trọng trước).
  const rank: Record<HealthSeverity, number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return {
    counts: { total: fields.length, done, error, pending, skipped, brokenScripts, residualCjkCode, residualCjkText },
    issues,
    ok: !issues.some((i) => i.severity === 'error'),
  };
}

/** Dựng "báo cáo dịch" dạng Markdown (tải về được) — tổng quan + danh sách vấn đề. */
export function buildTranslationReport(
  fields: TranslationField[],
  cardName: string,
  report?: HealthReport
): string {
  const h = report ?? scanFieldsHealth(fields);
  const c = h.counts;
  const now = new Date().toLocaleString('vi-VN');
  const lines: string[] = [];
  lines.push(`# Báo cáo dịch — ${cardName}`);
  lines.push(`*Tạo lúc: ${now}*`);
  lines.push('');
  lines.push('## Tổng quan');
  lines.push(`- Tổng số trường: **${c.total}**`);
  lines.push(`- Đã dịch: **${c.done}** · Lỗi: **${c.error}** · Chưa xong: **${c.pending}** · Bỏ qua/tự dịch: **${c.skipped}**`);
  lines.push('');
  lines.push('## Sức khoẻ thẻ');
  lines.push(`- Script vỡ cú pháp: **${c.brokenScripts}**`);
  lines.push(`- Chữ Hán còn trong field code: **${c.residualCjkCode}**`);
  lines.push(`- Trường còn chữ Hán (văn bản): **${c.residualCjkText}**`);
  lines.push(`- Trạng thái: ${h.ok ? '✅ **An toàn để xuất**' : '⚠️ **Còn vấn đề nặng — nên sửa trước khi xuất**'}`);

  const bySev = (s: HealthSeverity) => h.issues.filter((i) => i.severity === s);
  const section = (title: string, arr: HealthIssue[]) => {
    if (arr.length === 0) return;
    lines.push('');
    lines.push(`## ${title} (${arr.length})`);
    for (const i of arr) lines.push(`- **${i.label}** \`${i.path}\` — ${i.detail}`);
  };
  section('❌ Lỗi nặng (nên sửa trước khi xuất)', bySev('error'));
  section('⚠️ Cảnh báo', bySev('warning'));
  section('ℹ️ Ghi chú', bySev('info'));

  return lines.join('\n');
}
