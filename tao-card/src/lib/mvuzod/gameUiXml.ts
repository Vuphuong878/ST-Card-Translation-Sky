/**
 * src/lib/mvuzod/gameUiXml.ts — Parse XML khoan dung cho output của Game UI agent (thuần, CÓ TEST).
 * ──────────────────────────────────────────────────────────────────────────────
 * Tách khỏi gameUiAgent.ts để test được mà không kéo theo store/callAI. Chấp nhận XML lỏng
 * (thiếu tag đóng, có/không CDATA) — Gemini không phải lúc nào cũng đóng tag chuẩn.
 */
import type { RegexPlacement } from '../../types/regex.types';
import type { DraftScript } from './gameUiValidator';

export function stripCdata(s: string): string {
  const m = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return m ? m[1] : s;
}

/** Lấy nội dung trong <name>…</name> (đầu tiên). Thiếu tag đóng → lấy tới hết chuỗi. */
export function tagInner(text: string, name: string): string | null {
  const closed = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(text);
  if (closed) return closed[1];
  const open = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*)`, 'i').exec(text);
  return open ? open[1] : null;
}

export function tagAttr(attrs: string, attr: string): string {
  const m = attrs.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : '';
}

/** Mọi khối <name …>…</name>, trả về {attrs, inner}. */
export function allBlocks(text: string, name: string): { attrs: string; inner: string }[] {
  const re = new RegExp(`<${name}((?:\\s[^>]*)?)>([\\s\\S]*?)</${name}>`, 'gi');
  const out: { attrs: string; inner: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push({ attrs: m[1] || '', inner: m[2] });
  return out;
}

export function hasDoneTag(text: string): boolean {
  return /<done\s*\/?>/i.test(text);
}

function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Áp 1 cặp search/replace lên html: khớp NGUYÊN VĂN trước; trượt thì khớp MỀM
 * (bỏ khác biệt khoảng trắng giữa các token — chống lệch thụt đầu dòng/newline).
 */
export function applyOneEdit(html: string, search: string, replace: string): { html: string; ok: boolean } {
  const idx = html.indexOf(search);
  if (idx >= 0) return { html: html.slice(0, idx) + replace + html.slice(idx + search.length), ok: true };
  const tokens = search.trim().split(/\s+/).filter(Boolean).map(escapeRegex);
  if (tokens.length) {
    try {
      const re = new RegExp(tokens.join('\\s+'));
      const m = re.exec(html);
      if (m) return { html: html.slice(0, m.index) + replace + html.slice(m.index + m[0].length), ok: true };
    } catch { /* pattern lỗi → coi như trượt */ }
  }
  return { html, ok: false };
}

/** Rút mọi cặp <search>…</search><replace>…</replace> trong 1 edit_component. */
export function extractSearchReplacePairs(inner: string): { search: string; replace: string }[] {
  const re = /<search(?:\s[^>]*)?>([\s\S]*?)<\/search>\s*<replace(?:\s[^>]*)?>([\s\S]*?)<\/replace>/gi;
  const out: { search: string; replace: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) out.push({ search: stripCdata(m[1]), replace: stripCdata(m[2]) });
  return out;
}

/** Dựng DraftScript từ 1 khối <set_regex>. replaceString lấy từ component (fromComponent) nếu có. */
export function parseSetRegex(inner: string, components: Record<string, { html: string }>): DraftScript | null {
  const findRegex = (tagInner(inner, 'findRegex') || '').trim();
  if (!findRegex) return null;
  const fromComponent = (tagInner(inner, 'fromComponent') || '').trim();
  const inlineReplace = tagInner(inner, 'replaceString');
  const replaceString = fromComponent && components[fromComponent]
    ? components[fromComponent].html
    : (inlineReplace ? stripCdata(inlineReplace).trim() : '');
  const placement = (tagInner(inner, 'placement') || '2')
    .split(/[,\s]+/).map((x) => parseInt(x, 10)).filter((n) => !isNaN(n)) as RegexPlacement[];
  const boolTag = (n: string, def: boolean) => {
    const v = tagInner(inner, n);
    return v == null ? def : /true/i.test(v);
  };
  return {
    scriptName: (tagInner(inner, 'scriptName') || 'Game UI Script').trim(),
    findRegex,
    replaceString,
    trimStrings: [],
    placement: placement.length ? placement : [2 as RegexPlacement],
    disabled: false,
    markdownOnly: boolTag('markdownOnly', true),
    promptOnly: boolTag('promptOnly', false),
    runOnEdit: false,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: null,
  };
}
