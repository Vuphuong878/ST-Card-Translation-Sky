/**
 * Context Builder — RAG-like system for ST Studio AI Chat
 * 
 * Serializes the current project state (prompts, regexes, params, recent actions)
 * into structured text that gets injected into the AI system prompt,
 * so the AI understands what exists and what was recently changed.
 */

import { Project, ActionLogEntry } from '../types';

// ─── Project State Snapshot ─────────────────────────────────────────────────

export function buildProjectContext(
  project: Project,
  actionLog: ActionLogEntry[]
): string {
  const lines: string[] = [];

  lines.push(`[TRẠNG THÁI DỰ ÁN HIỆN TẠI — "${project.name}"]`);
  lines.push('');

  // ── Prompt Blocks (full content) ──
  const prompts = project.preset.prompts;
  lines.push(`📋 PROMPT BLOCKS (${prompts.length} blocks):`);
  if (prompts.length === 0) {
    lines.push('  (chưa có prompt block nào)');
  } else {
    prompts.forEach((p, i) => {
      const status = p.enabled ? '✅' : '❌';
      const role = p.role.toUpperCase();
      if (p.marker) {
        lines.push(`  ${i + 1}. ${status} "${p.name}" [${p.identifier}] — (marker/anchor block, role=${role})`);
      } else {
        lines.push(`  ${i + 1}. ${status} "${p.name}" [${p.identifier}] role=${role}, depth=${p.injection_depth}, order=${p.injection_order}`);
        lines.push(`     Nội dung đầy đủ:`);
        lines.push(`     """${p.content || '(trống)'}"""`);
      }
    });
  }
  lines.push('');

  // ── Regex Scripts ──
  const regexes = project.regexes;
  lines.push(`🔧 REGEX SCRIPTS (${regexes.length} scripts):`);
  if (regexes.length === 0) {
    lines.push('  (chưa có regex script nào)');
  } else {
    regexes.forEach((r, i) => {
      const status = r.disabled ? '❌' : '✅';
      const placementLabels = r.placement.map(p => {
        if (p === 1) return 'user_input';
        if (p === 2) return 'ai_output';
        return `placement_${p}`;
      }).join(', ');
      lines.push(`  ${i + 1}. ${status} "${r.scriptName}" [${r.id}]`);
      lines.push(`     findRegex: ${r.findRegex}`);
      lines.push(`     replaceString: ${r.replaceString.substring(0, 300)}${r.replaceString.length > 300 ? '...(cắt bớt)' : ''}`);
      lines.push(`     placement: [${placementLabels}], markdownOnly=${r.markdownOnly}, promptOnly=${r.promptOnly}`);
    });
  }
  lines.push('');

  // ── Parameters ──
  const p = project.preset;
  lines.push(`⚙️ THÔNG SỐ PRESET:`);
  lines.push(`  temperature=${p.temperature}, top_p=${p.top_p}, top_k=${p.top_k}, top_a=${p.top_a}, min_p=${p.min_p}`);
  lines.push(`  frequency_penalty=${p.frequency_penalty}, presence_penalty=${p.presence_penalty}, repetition_penalty=${p.repetition_penalty}`);
  lines.push(`  max_context=${p.openai_max_context}, max_tokens=${p.openai_max_tokens}`);
  lines.push(`  wrap_in_quotes=${p.wrap_in_quotes}, names_behavior=${p.names_behavior}, stream=${p.stream_openai}`);
  if (p.impersonation_prompt) {
    lines.push(`  impersonation_prompt: "${p.impersonation_prompt}"`);
  }
  if (p.continue_nudge_prompt) {
    lines.push(`  continue_nudge_prompt: "${p.continue_nudge_prompt}"`);
  }
  lines.push('');

  // ── Recent Actions ──
  const recentActions = actionLog.slice(-15);
  if (recentActions.length > 0) {
    lines.push('📝 HÀNH ĐỘNG GẦN NHẤT:');
    recentActions.forEach(a => {
      const ago = formatTimeAgo(a.timestamp);
      const typeLabel = getActionLabel(a.type);
      lines.push(`  - [${ago}] ${typeLabel}: "${a.itemName}"${a.details ? ` — ${a.details}` : ''}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Intent Analysis & Reference Resolution ────────────────────────────────

export interface ResolvedReference {
  type: 'prompt' | 'regex';
  name: string;
  id: string;
  fullContent: string;
}

/**
 * Analyze user message to find references to existing prompts/regexes
 * and resolve them to inject full context.
 * 
 * Handles patterns like:
 * - "prompt vừa tạo" / "prompt mới thêm" → last added prompt
 * - "regex đầu tiên" / "prompt thứ 2" → by index
 * - "prompt Đạo Diễn" / "regex Suy Nghĩ" → by name match
 */
export function resolveReferences(
  message: string,
  project: Project,
  actionLog: ActionLogEntry[]
): ResolvedReference[] {
  const refs: ResolvedReference[] = [];
  const msg = message.toLowerCase();

  // Pattern 1: "vừa tạo" / "vừa thêm" / "mới tạo" / "mới thêm"
  if (/(?:vừa|mới)\s*(?:tạo|thêm|viết|tạo xong)/.test(msg)) {
    // Find the most recent add action
    const recentAdd = [...actionLog]
      .reverse()
      .find(a => a.type === 'prompt_added' || a.type === 'regex_added');
    
    if (recentAdd) {
      if (recentAdd.type === 'prompt_added') {
        const prompt = project.preset.prompts.find(p => p.identifier === recentAdd.itemId);
        if (prompt) {
          refs.push({
            type: 'prompt',
            name: prompt.name,
            id: prompt.identifier,
            fullContent: prompt.content || ''
          });
        }
      } else {
        const regex = project.regexes.find(r => r.id === recentAdd.itemId);
        if (regex) {
          refs.push({
            type: 'regex',
            name: regex.scriptName,
            id: regex.id,
            fullContent: `findRegex: ${regex.findRegex}\nreplaceString: ${regex.replaceString}`
          });
        }
      }
    }
  }

  // Pattern 2: "prompt đầu tiên" / "prompt cuối" / "prompt thứ N"
  const indexMatch = msg.match(/prompt\s*(?:thứ\s*(\d+)|đầu\s*(?:tiên)?|cuối(?:\s*cùng)?)/);
  if (indexMatch) {
    const prompts = project.preset.prompts;
    let idx = -1;
    if (indexMatch[1]) {
      idx = parseInt(indexMatch[1]) - 1;
    } else if (/đầu/.test(indexMatch[0])) {
      idx = 0;
    } else if (/cuối/.test(indexMatch[0])) {
      idx = prompts.length - 1;
    }
    if (idx >= 0 && idx < prompts.length) {
      const p = prompts[idx];
      if (!refs.find(r => r.id === p.identifier)) {
        refs.push({
          type: 'prompt',
          name: p.name,
          id: p.identifier,
          fullContent: p.content || ''
        });
      }
    }
  }

  // Pattern 3: "regex đầu tiên" / "regex cuối" / "regex thứ N"
  const regexIndexMatch = msg.match(/regex\s*(?:thứ\s*(\d+)|đầu\s*(?:tiên)?|cuối(?:\s*cùng)?)/);
  if (regexIndexMatch) {
    const regexes = project.regexes;
    let idx = -1;
    if (regexIndexMatch[1]) {
      idx = parseInt(regexIndexMatch[1]) - 1;
    } else if (/đầu/.test(regexIndexMatch[0])) {
      idx = 0;
    } else if (/cuối/.test(regexIndexMatch[0])) {
      idx = regexes.length - 1;
    }
    if (idx >= 0 && idx < regexes.length) {
      const r = regexes[idx];
      if (!refs.find(ref => ref.id === r.id)) {
        refs.push({
          type: 'regex',
          name: r.scriptName,
          id: r.id,
          fullContent: `findRegex: ${r.findRegex}\nreplaceString: ${r.replaceString}`
        });
      }
    }
  }

  // Pattern 4: Name matching — search for prompt/regex names mentioned in message
  project.preset.prompts.forEach(p => {
    const nameClean = p.name.replace(/[🎭🗝️📋🌙🔮💀⚔️🗓️]/g, '').trim().toLowerCase();
    if (nameClean.length > 2 && msg.includes(nameClean)) {
      if (!refs.find(r => r.id === p.identifier)) {
        refs.push({
          type: 'prompt',
          name: p.name,
          id: p.identifier,
          fullContent: p.content || ''
        });
      }
    }
  });

  project.regexes.forEach(r => {
    const nameClean = r.scriptName.toLowerCase();
    if (nameClean.length > 2 && msg.includes(nameClean)) {
      if (!refs.find(ref => ref.id === r.id)) {
        refs.push({
          type: 'regex',
          name: r.scriptName,
          id: r.id,
          fullContent: `findRegex: ${r.findRegex}\nreplaceString: ${r.replaceString}`
        });
      }
    }
  });

  return refs;
}

/**
 * Build additional context text for explicitly referenced items
 */
export function buildReferencedContext(refs: ResolvedReference[]): string {
  if (refs.length === 0) return '';

  const lines: string[] = [];
  lines.push('[ITEMS ĐƯỢC NHẮC ĐẾN TRONG YÊU CẦU — NỘI DUNG ĐẦY ĐỦ]:');
  refs.forEach(ref => {
    lines.push(`▸ ${ref.type === 'prompt' ? 'Prompt Block' : 'Regex Script'}: "${ref.name}" [${ref.id}]`);
    lines.push(ref.fullContent);
    lines.push('---');
  });
  return lines.join('\n');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function getActionLabel(type: string): string {
  switch (type) {
    case 'prompt_added': return '➕ Thêm prompt';
    case 'prompt_updated': return '✏️ Sửa prompt';
    case 'prompt_deleted': return '🗑️ Xóa prompt';
    case 'regex_added': return '➕ Thêm regex';
    case 'regex_updated': return '✏️ Sửa regex';
    case 'regex_deleted': return '🗑️ Xóa regex';
    case 'params_updated': return '⚙️ Cập nhật thông số';
    default: return type;
  }
}
