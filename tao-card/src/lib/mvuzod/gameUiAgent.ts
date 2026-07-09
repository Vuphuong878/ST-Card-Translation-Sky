/**
 * src/lib/mvuzod/gameUiAgent.ts — Trái tim Game UI Studio (agent loop + validate-fix)
 * ──────────────────────────────────────────────────────────────────────────────
 * 1 lượt user → gọi AI (XML out) → áp action vào store → KIỂM 4 tầng → nếu lỗi thì bơm report
 * ngược cho AI TỰ SỬA (tối đa MAX_FIX_ROUNDS) → lặp tới khi <done/> hoặc MAX_LOOPS.
 * Tối ưu Gemini 3.1 Pro: max_tokens ≥ 60k (chống output cắt cụt — lý do #1 bản cũ vỡ), ít call to.
 */
import { v4 as uuidv4 } from 'uuid';
import { callAI } from '../ai/client';
import type { ProxyProfile, GenerationParams, ChatMessage } from '../../types';
import type { MVUZODSchema } from '../../types/mvuzod.types';
import type { RegexPlacement } from '../../types/regex.types';
import { useGameStudioStore, type StudioActionSummary } from '../../store/gameStudioStore';
import { buildGameUiSystemPrompt } from '../../prompts/gameUiStudioPrompt';
import {
  validateRegexDraft, collectSchemaVarNames, reportToXml,
  type DraftScript, type ValidationIssue,
} from './gameUiValidator';

const MAX_LOOPS = 6;
const MAX_FIX_ROUNDS = 3;
const MIN_OUTPUT_TOKENS = 60000;

export interface GameUiAgentDeps {
  schema: MVUZODSchema | null | undefined;
  profile: ProxyProfile;
  params: GenerationParams;
  signal: AbortSignal;
}

// ─── XML helpers (khoan dung, chấp nhận thiếu tag đóng; strip CDATA) ───
function stripCdata(s: string): string {
  const m = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return m ? m[1] : s;
}
function tagInner(text: string, name: string): string | null {
  const closed = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(text);
  if (closed) return closed[1];
  const open = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*)`, 'i').exec(text);
  return open ? open[1] : null;
}
function tagAttr(attrs: string, attr: string): string {
  const m = attrs.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : '';
}
function allBlocks(text: string, name: string): { attrs: string; inner: string }[] {
  const re = new RegExp(`<${name}((?:\\s[^>]*)?)>([\\s\\S]*?)</${name}>`, 'gi');
  const out: { attrs: string; inner: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push({ attrs: m[1] || '', inner: m[2] });
  return out;
}
function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Áp 1 cặp search/replace: khớp nguyên văn → nếu trượt thì khớp mềm (bỏ khác biệt khoảng trắng). */
function applyOneEdit(html: string, search: string, replace: string): { html: string; ok: boolean } {
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

function extractSearchReplacePairs(inner: string): { search: string; replace: string }[] {
  const re = /<search(?:\s[^>]*)?>([\s\S]*?)<\/search>\s*<replace(?:\s[^>]*)?>([\s\S]*?)<\/replace>/gi;
  const out: { search: string; replace: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) out.push({ search: stripCdata(m[1]), replace: stripCdata(m[2]) });
  return out;
}

function parseSetRegex(inner: string, components: Record<string, { html: string }>): DraftScript | null {
  const findRegex = (tagInner(inner, 'findRegex') || '').trim();
  if (!findRegex) return null;
  const fromComponent = (tagInner(inner, 'fromComponent') || '').trim();
  const replaceString = fromComponent && components[fromComponent]
    ? components[fromComponent].html
    : (tagInner(inner, 'replaceString') ? stripCdata(tagInner(inner, 'replaceString')!).trim() : '');
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

// ═══════════════════════════════════════════════════════════════════════════
export async function runGameUiTurn(userMessage: string, deps: GameUiAgentDeps): Promise<void> {
  const store = useGameStudioStore;
  const st = () => store.getState();
  const abortCheck = () => { if (deps.signal.aborted || st().stopped) throw new DOMException('Người dùng đã dừng', 'AbortError'); };

  st().appendMessage({ id: uuidv4(), role: 'user', content: userMessage });

  const schemaVars = collectSchemaVarNames(deps.schema);
  let loops = 0;
  let consecutiveFails = 0;
  let pendingInject: string | null = null;

  try {
    while (loops < MAX_LOOPS) {
      abortCheck();
      loops++;
      const isFix = pendingInject != null;
      st().setPhase('thinking');
      st().setStatus(isFix ? `AI tự sửa (vòng ${consecutiveFails})…` : `AI đang nghĩ (lượt ${loops})…`);

      const system = buildGameUiSystemPrompt(deps.schema, st().components, st().regexDraft, st().sampleOutput, st().validation);
      const history: ChatMessage[] = st().messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
      const messages: ChatMessage[] = [
        { role: 'system', content: system },
        ...history,
        ...(pendingInject ? [{ role: 'user' as const, content: `Kết quả kiểm tự động (ẩn với user) — hãy SỬA rồi gửi lại:\n${pendingInject}` }] : []),
      ];
      const params: GenerationParams = {
        ...deps.params,
        max_tokens: Math.max(deps.params.max_tokens || 0, MIN_OUTPUT_TOKENS),
        temperature: isFix ? 0.3 : 0.7,
        stream: false,
        useJsonResponseFormat: false,
      };

      abortCheck();
      const raw = await callAI({ profile: deps.profile, params, messages, signal: deps.signal, label: 'Game UI Studio' });
      abortCheck();
      const text = raw.text || '';

      // ─── Áp actions ───
      const actions: StudioActionSummary[] = [];
      const editIssues: ValidationIssue[] = [];

      const sample = tagInner(text, 'sample_output');
      if (sample != null) st().setSampleOutput(stripCdata(sample).trim());

      for (const b of allBlocks(text, 'write_component')) {
        const id = tagAttr(b.attrs, 'id') || 'component';
        const name = tagAttr(b.attrs, 'name') || id;
        const html = stripCdata(b.inner).trim();
        st().upsertComponent(id, name, html);
        actions.push({ kind: 'write', label: `✍️ ${id} ${(html.length / 1024).toFixed(1)}KB` });
      }

      for (const b of allBlocks(text, 'edit_component')) {
        const id = tagAttr(b.attrs, 'id');
        const comp = st().components[id];
        if (!comp) { editIssues.push({ level: 'error', code: 'EDIT_MISMATCH', message: `edit_component id="${id}" không tồn tại — dùng write_component để tạo mới, hoặc sửa đúng id.` }); continue; }
        const pairs = extractSearchReplacePairs(b.inner);
        let html = comp.html; let applied = 0;
        for (const p of pairs) {
          const r = applyOneEdit(html, p.search, p.replace);
          if (r.ok) { html = r.html; applied++; }
          else editIssues.push({ level: 'error', code: 'EDIT_MISMATCH', message: `edit_component "${id}": không tìm thấy đoạn <search> "${p.search.slice(0, 50)}…" trong component. Sao chép ĐÚNG NGUYÊN VĂN đoạn hiện có rồi gửi lại.` });
        }
        if (applied) st().upsertComponent(id, comp.name, html);
        actions.push({ kind: 'edit', label: `✏️ ${id} ${applied}/${pairs.length} chỗ sửa` });
      }

      const setRegexBlocks = allBlocks(text, 'set_regex');
      if (setRegexBlocks.length) {
        const draft = [...st().regexDraft];
        for (const b of setRegexBlocks) {
          const script = parseSetRegex(b.inner, st().components);
          if (!script) continue;
          const idx = parseInt(tagAttr(b.attrs, 'index'), 10);
          if (!isNaN(idx) && idx >= 0 && idx < draft.length) draft[idx] = script;
          else draft.push(script);
          actions.push({ kind: 'regex', label: `🔧 ${script.scriptName}` });
        }
        st().setRegexDraft(draft);
      }

      const say = (tagInner(text, 'say') || '').trim();
      st().appendMessage({ id: uuidv4(), role: 'assistant', content: say || '(đã cập nhật)', actions: actions.length ? actions : undefined });

      // ─── KIỂM ───
      st().setPhase('validating');
      const report = validateRegexDraft(st().regexDraft, st().sampleOutput, schemaVars);
      if (editIssues.length) report.issues.unshift(...editIssues);
      report.ok = !report.issues.some((x) => x.level === 'error');
      st().setValidation(report);

      const hasDone = /<done\s*\/?>/i.test(text);

      if (report.ok) {
        consecutiveFails = 0;
        pendingInject = null;
        st().appendMessage({ id: uuidv4(), role: 'system-note', content: '✅ Kiểm 4 tầng ĐẠT — regex đã chứng minh match sample.', tone: 'ok' });
        if (hasDone) break;
        // không <done/> → AI tự chia việc, lặp tiếp
      } else {
        consecutiveFails++;
        const nErr = report.issues.filter((i) => i.level === 'error').length;
        if (consecutiveFails > MAX_FIX_ROUNDS) {
          st().appendMessage({ id: uuidv4(), role: 'system-note', content: `⚠️ Còn ${nErr} lỗi sau ${MAX_FIX_ROUNDS} vòng tự sửa. Bạn kiểm/sửa tay ở tab Regex, hoặc nhắn AI làm lại.`, tone: 'error' });
          break;
        }
        pendingInject = reportToXml(report);
        st().appendMessage({ id: uuidv4(), role: 'system-note', content: `🔧 Tự sửa (vòng ${consecutiveFails}): còn ${nErr} lỗi cần vá…`, tone: 'info' });
      }
    }
  } finally {
    st().setPhase('done');
    st().setStatus(null);
  }
}
