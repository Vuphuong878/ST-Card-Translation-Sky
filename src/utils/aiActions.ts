// ═══════════════════════════════════════════════════════════════════════════════
// AI Actions Engine — Parse & Execute structured actions from AI responses
// ═══════════════════════════════════════════════════════════════════════════════

import type { CharacterCard, CharacterBookEntry, RegexScript, TavernHelperScript } from '../types/card';
import { generateUUID, injectCustomTavernHelperScript } from './mvuGenerator';
import { injectFunction as regexInjectFunction } from './regexInjector';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionType =
  | 'CREATE_ENTRY'
  | 'EDIT_ENTRY'
  | 'DELETE_ENTRY'
  | 'CREATE_REGEX'
  | 'EDIT_REGEX'
  | 'PATCH_REGEX_REPLACE'
  | 'DELETE_REGEX'
  | 'INJECT_FUNCTION'
  | 'CREATE_TAVERN_HELPER'
  | 'VIEW_FULL_REGEX'
  | 'RUN_SCRIPT';

export interface AiAction {
  action: ActionType;
  params: Record<string, any>;
  reasoning?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  newCard?: CharacterCard;
  /** For VIEW_FULL_REGEX — content to feed back to AI */
  viewContent?: string;
  /** For RUN_SCRIPT — script code that needs user confirmation before execution */
  pendingScript?: {
    code: string;
    language: string;
    description: string;
  };
}

export interface ParsedResponse {
  /** Text content for chat display (with action blocks stripped) */
  textContent: string;
  /** Extracted actions to execute */
  actions: AiAction[];
}

// ─── Parse AI Actions from Response ───────────────────────────────────────────

const ACTION_BLOCK_RE = /<AI_ACTION>\s*([\s\S]*?)\s*<\/AI_ACTION>/gi;

/**
 * Parse structured action blocks from an AI response string.
 *
 * AI embeds actions in `<AI_ACTION>{ ... }</AI_ACTION>` blocks.
 * Everything outside those blocks is returned as `textContent` for display.
 */
export function parseAiActions(response: string): ParsedResponse {
  const actions: AiAction[] = [];
  let textContent = response;

  // Extract all action blocks
  let match: RegExpExecArray | null;
  const regex = new RegExp(ACTION_BLOCK_RE.source, ACTION_BLOCK_RE.flags);

  while ((match = regex.exec(response)) !== null) {
    const rawJson = match[1].trim();
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed.action === 'string') {
        actions.push({
          action: parsed.action as ActionType,
          params: parsed.params || {},
          reasoning: parsed.reasoning,
        });
      }
    } catch (err) {
      console.warn('[aiActions] Failed to parse action block:', rawJson, err);
    }
  }

  // Strip action blocks from display text
  textContent = response.replace(ACTION_BLOCK_RE, '').trim();

  // Clean up multiple consecutive newlines left by removal
  textContent = textContent.replace(/\n{3,}/g, '\n\n');

  return { textContent, actions };
}

// ─── Execute Actions ──────────────────────────────────────────────────────────

/**
 * Execute a single AI action against the card.
 * Returns a new card (immutable update) on success.
 */
export function executeAction(
  action: AiAction,
  card: CharacterCard,
): ActionResult {
  try {
    switch (action.action) {
      case 'CREATE_ENTRY':
        return executeCreateEntry(action.params, card);
      case 'EDIT_ENTRY':
        return executeEditEntry(action.params, card);
      case 'DELETE_ENTRY':
        return executeDeleteEntry(action.params, card);
      case 'CREATE_REGEX':
        return executeCreateRegex(action.params, card);
      case 'EDIT_REGEX':
        return executeEditRegex(action.params, card);
      case 'PATCH_REGEX_REPLACE':
        return executePatchRegexReplace(action.params, card);
      case 'DELETE_REGEX':
        return executeDeleteRegex(action.params, card);
      case 'INJECT_FUNCTION':
        return executeInjectFunction(action.params, card);
      case 'CREATE_TAVERN_HELPER':
        return executeCreateTavernHelper(action.params, card);
      case 'VIEW_FULL_REGEX':
        return executeViewFullRegex(action.params, card);
      case 'RUN_SCRIPT':
        return executeRunScript(action.params);
      default:
        return { success: false, message: `Action không xác định: ${action.action}` };
    }
  } catch (err: any) {
    return { success: false, message: `Lỗi thực thi ${action.action}: ${err.message}` };
  }
}

// ─── Action Implementations ───────────────────────────────────────────────────

function ensureCardStructure(card: CharacterCard): CharacterCard {
  const c = JSON.parse(JSON.stringify(card)) as CharacterCard;
  if (!c.data) c.data = {};
  if (!c.data.extensions) c.data.extensions = {};
  if (!c.data.character_book) c.data.character_book = { entries: [] };
  if (!Array.isArray(c.data.character_book.entries)) c.data.character_book.entries = [];
  if (!Array.isArray(c.data.extensions.regex_scripts)) c.data.extensions.regex_scripts = [];
  return c;
}

/** CREATE_ENTRY — Create a new lorebook entry */
function executeCreateEntry(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { keys, comment, content, position, constant, name, secondary_keys, enabled, insertion_order } = params;
  if (!content && !keys) {
    return { success: false, message: 'CREATE_ENTRY cần ít nhất keys hoặc content' };
  }

  const c = ensureCardStructure(card);

  const newEntry: CharacterBookEntry = {
    id: Date.now(),
    keys: Array.isArray(keys) ? keys : (typeof keys === 'string' ? keys.split(',').map((k: string) => k.trim()).filter(Boolean) : []),
    secondary_keys: Array.isArray(secondary_keys) ? secondary_keys : [],
    comment: comment || 'Tạo từ Trợ lý AI',
    content: content || '',
    name: name || '',
    enabled: enabled !== false,
    insertion_order: insertion_order ?? 10,
    position: position || 'before_char',
    constant: constant ?? false,
    selective: true,
  };

  c.data!.character_book!.entries.push(newEntry);

  return {
    success: true,
    message: `Đã tạo Lorebook entry "${newEntry.comment}" với ${newEntry.keys.length} keys`,
    newCard: c,
  };
}

/** EDIT_ENTRY — Edit an existing lorebook entry */
function executeEditEntry(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { entryIndex, field, newValue } = params;
  if (entryIndex === undefined || !field) {
    return { success: false, message: 'EDIT_ENTRY cần entryIndex và field' };
  }

  const c = ensureCardStructure(card);
  const entries = c.data!.character_book!.entries;

  if (entryIndex < 0 || entryIndex >= entries.length) {
    return { success: false, message: `Entry index ${entryIndex} không hợp lệ (có ${entries.length} entries)` };
  }

  const entry = entries[entryIndex];
  const oldValue = (entry as any)[field];

  if (field === 'keys' || field === 'secondary_keys') {
    (entry as any)[field] = Array.isArray(newValue) ? newValue : String(newValue).split(',').map((k: string) => k.trim());
  } else {
    (entry as any)[field] = newValue;
  }

  return {
    success: true,
    message: `Đã sửa lorebook[${entryIndex}].${field} (${typeof oldValue === 'string' ? oldValue.slice(0, 30) : '...'} → ${typeof newValue === 'string' ? newValue.slice(0, 30) : '...'})`,
    newCard: c,
  };
}

/** DELETE_ENTRY — Delete a lorebook entry */
function executeDeleteEntry(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { entryIndex } = params;
  if (entryIndex === undefined) {
    return { success: false, message: 'DELETE_ENTRY cần entryIndex' };
  }

  const c = ensureCardStructure(card);
  const entries = c.data!.character_book!.entries;

  if (entryIndex < 0 || entryIndex >= entries.length) {
    return { success: false, message: `Entry index ${entryIndex} không hợp lệ` };
  }

  const removed = entries.splice(entryIndex, 1)[0];
  return {
    success: true,
    message: `Đã xóa lorebook entry "${removed.comment || removed.name || `#${entryIndex}`}"`,
    newCard: c,
  };
}

/** CREATE_REGEX — Create a new regex script */
function executeCreateRegex(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { scriptName, findRegex, replaceString, placement, disabled, markdownOnly, promptOnly, runOnEdit, substituteRegex } = params;
  if (!findRegex) {
    return { success: false, message: 'CREATE_REGEX cần ít nhất findRegex' };
  }

  // Validate regex syntax
  try {
    const match = findRegex.match(/^\/(.+)\/([gimsuy]*)$/);
    if (match) {
      new RegExp(match[1], match[2]);
    } else {
      new RegExp(findRegex);
    }
  } catch (err: any) {
    return { success: false, message: `Regex không hợp lệ: ${err.message}` };
  }

  const c = ensureCardStructure(card);

  const newRegex: RegexScript = {
    scriptName: scriptName || 'Regex Script mới',
    findRegex,
    replaceString: replaceString || '',
    placement: Array.isArray(placement) ? placement : ['1'],
    disabled: disabled ?? false,
    markdownOnly: markdownOnly ?? false,
    promptOnly: promptOnly ?? false,
    runOnEdit: runOnEdit ?? true,
    substituteRegex: substituteRegex ?? true,
    minDepth: 0,
    maxDepth: 0,
  };

  c.data!.extensions!.regex_scripts!.push(newRegex);

  return {
    success: true,
    message: `Đã tạo regex script "${newRegex.scriptName}" (find: ${findRegex.slice(0, 40)})`,
    newCard: c,
  };
}

/** EDIT_REGEX — Edit an existing regex script field */
function executeEditRegex(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { scriptIndex, field, newValue } = params;
  if (scriptIndex === undefined || !field) {
    return { success: false, message: 'EDIT_REGEX cần scriptIndex và field' };
  }

  const c = ensureCardStructure(card);
  const scripts = c.data!.extensions!.regex_scripts!;

  if (scriptIndex < 0 || scriptIndex >= scripts.length) {
    return { success: false, message: `Script index ${scriptIndex} không hợp lệ (có ${scripts.length} scripts)` };
  }

  // Validate if editing findRegex
  if (field === 'findRegex' && typeof newValue === 'string') {
    try {
      const match = newValue.match(/^\/(.+)\/([gimsuy]*)$/);
      if (match) {
        new RegExp(match[1], match[2]);
      } else {
        new RegExp(newValue);
      }
    } catch (err: any) {
      return { success: false, message: `Regex mới không hợp lệ: ${err.message}` };
    }
  }

  const script = scripts[scriptIndex];
  const oldValue = (script as any)[field];
  (script as any)[field] = newValue;

  return {
    success: true,
    message: `Đã sửa regex[${scriptIndex}].${field} ("${script.scriptName}")`,
    newCard: c,
  };
}

/** PATCH_REGEX_REPLACE — Find/replace within a regex's replaceString */
function executePatchRegexReplace(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { scriptIndex, find, replace, appendToEnd, prependToStart } = params;
  if (scriptIndex === undefined) {
    return { success: false, message: 'PATCH_REGEX_REPLACE cần scriptIndex' };
  }

  const c = ensureCardStructure(card);
  const scripts = c.data!.extensions!.regex_scripts!;

  if (scriptIndex < 0 || scriptIndex >= scripts.length) {
    return { success: false, message: `Script index ${scriptIndex} không hợp lệ` };
  }

  const script = scripts[scriptIndex];
  let result = script.replaceString || '';

  if (find && replace !== undefined) {
    // Find/replace mode
    const count = (result.match(new RegExp(escapeRegex(find), 'g')) || []).length;
    if (count === 0) {
      return { success: false, message: `Không tìm thấy "${find.slice(0, 50)}" trong replaceString của regex[${scriptIndex}]` };
    }
    result = result.replace(find, replace);
  } else if (appendToEnd) {
    result = result + appendToEnd;
  } else if (prependToStart) {
    result = prependToStart + result;
  } else {
    return { success: false, message: 'PATCH_REGEX_REPLACE cần find+replace hoặc appendToEnd hoặc prependToStart' };
  }

  script.replaceString = result;

  return {
    success: true,
    message: `Đã patch replaceString của regex[${scriptIndex}] ("${script.scriptName}")`,
    newCard: c,
  };
}

/** DELETE_REGEX — Delete a regex script */
function executeDeleteRegex(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { scriptIndex } = params;
  if (scriptIndex === undefined) {
    return { success: false, message: 'DELETE_REGEX cần scriptIndex' };
  }

  const c = ensureCardStructure(card);
  const scripts = c.data!.extensions!.regex_scripts!;

  if (scriptIndex < 0 || scriptIndex >= scripts.length) {
    return { success: false, message: `Script index ${scriptIndex} không hợp lệ` };
  }

  const removed = scripts.splice(scriptIndex, 1)[0];
  return {
    success: true,
    message: `Đã xóa regex script "${removed.scriptName}"`,
    newCard: c,
  };
}

/** INJECT_FUNCTION — Inject a JS function into a regex's replaceString */
function executeInjectFunction(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { scriptIndex, functionCode, insertPosition } = params;
  if (scriptIndex === undefined || !functionCode) {
    return { success: false, message: 'INJECT_FUNCTION cần scriptIndex và functionCode' };
  }

  const c = ensureCardStructure(card);
  const scripts = c.data!.extensions!.regex_scripts!;

  if (scriptIndex < 0 || scriptIndex >= scripts.length) {
    return { success: false, message: `Script index ${scriptIndex} không hợp lệ` };
  }

  const script = scripts[scriptIndex];
  const replaceStr = script.replaceString || '';

  // Use the regex injector engine
  const injectionResult = regexInjectFunction(replaceStr, functionCode, {
    position: insertPosition || 'auto',
    wrapInScript: true,
    validateSyntax: true,
  });

  if (!injectionResult.success) {
    return { success: false, message: `Inject thất bại: ${injectionResult.error}` };
  }

  script.replaceString = injectionResult.result;

  return {
    success: true,
    message: `Đã inject function vào regex[${scriptIndex}] ("${script.scriptName}")`,
    newCard: c,
  };
}

/** CREATE_TAVERN_HELPER — Create a new TavernHelper script */
function executeCreateTavernHelper(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { name, content, info } = params;
  if (!content) {
    return { success: false, message: 'CREATE_TAVERN_HELPER cần content' };
  }

  const c = ensureCardStructure(card);

  const newScript: TavernHelperScript = {
    name: name || 'Script mới từ AI',
    content,
    enabled: true,
    info: info || 'Tạo bởi Trợ lý AI',
  };

  if (!c.data!.extensions) c.data!.extensions = {};
  injectCustomTavernHelperScript(c.data!.extensions, newScript);

  return {
    success: true,
    message: `Đã tạo TavernHelper script "${newScript.name}"`,
    newCard: c,
  };
}

/** VIEW_FULL_REGEX — Return full replaceString content for AI to analyze */
function executeViewFullRegex(params: Record<string, any>, card: CharacterCard): ActionResult {
  const { scriptIndex } = params;
  if (scriptIndex === undefined) {
    return { success: false, message: 'VIEW_FULL_REGEX cần scriptIndex' };
  }

  const scripts = card.data?.extensions?.regex_scripts || [];
  if (scriptIndex < 0 || scriptIndex >= scripts.length) {
    return { success: false, message: `Script index ${scriptIndex} không hợp lệ` };
  }

  const script = scripts[scriptIndex];
  const fullContent = [
    `=== REGEX SCRIPT #${scriptIndex}: "${script.scriptName}" ===`,
    `findRegex: ${script.findRegex}`,
    `disabled: ${script.disabled}`,
    `placement: ${JSON.stringify(script.placement)}`,
    `markdownOnly: ${script.markdownOnly}`,
    `promptOnly: ${script.promptOnly}`,
    `runOnEdit: ${script.runOnEdit}`,
    `substituteRegex: ${script.substituteRegex}`,
    `--- replaceString (full, ${(script.replaceString || '').length} chars) ---`,
    script.replaceString || '(empty)',
    `--- trimStrings ---`,
    JSON.stringify(script.trimStrings || []),
  ].join('\n');

  return {
    success: true,
    message: `Đã lấy full nội dung regex[${scriptIndex}]`,
    viewContent: fullContent,
  };
}

/** RUN_SCRIPT — Return script for user confirmation before execution */
function executeRunScript(params: Record<string, any>): ActionResult {
  const { code, language, description } = params;
  if (!code) {
    return { success: false, message: 'RUN_SCRIPT cần code' };
  }

  return {
    success: true,
    message: `Script "${description || 'AI Script'}" đang chờ xác nhận từ người dùng`,
    pendingScript: {
      code,
      language: language || 'javascript',
      description: description || 'Script được tạo bởi AI',
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a human-readable summary of an action for the confirmation UI.
 */
export function describeAction(action: AiAction): {
  title: string;
  type: 'create' | 'edit' | 'delete' | 'view' | 'run';
  color: string;
  icon: string;
  details: string[];
} {
  switch (action.action) {
    case 'CREATE_ENTRY':
      return {
        title: 'Tạo Lorebook Entry',
        type: 'create',
        color: '#6366f1',
        icon: '📖',
        details: [
          `Keys: ${(action.params.keys || []).join(', ')}`,
          `Comment: ${action.params.comment || '(mặc định)'}`,
          `Content: ${(action.params.content || '').slice(0, 100)}${(action.params.content || '').length > 100 ? '...' : ''}`,
        ],
      };
    case 'CREATE_REGEX':
      return {
        title: 'Tạo Regex Script',
        type: 'create',
        color: '#a855f7',
        icon: '🔧',
        details: [
          `Tên: ${action.params.scriptName || 'Regex Script mới'}`,
          `Find: ${action.params.findRegex || '(chưa có)'}`,
          `Replace: ${(action.params.replaceString || '').slice(0, 80)}...`,
        ],
      };
    case 'EDIT_REGEX':
      return {
        title: `Sửa Regex #${action.params.scriptIndex}`,
        type: 'edit',
        color: '#f59e0b',
        icon: '✏️',
        details: [
          `Trường: ${action.params.field}`,
          `Giá trị mới: ${String(action.params.newValue).slice(0, 100)}`,
        ],
      };
    case 'PATCH_REGEX_REPLACE':
      return {
        title: `Patch Regex #${action.params.scriptIndex}`,
        type: 'edit',
        color: '#f59e0b',
        icon: '🩹',
        details: [
          action.params.find ? `Tìm: "${action.params.find.slice(0, 50)}"` : '',
          action.params.replace !== undefined ? `Thay: "${String(action.params.replace).slice(0, 50)}"` : '',
          action.params.appendToEnd ? 'Thêm vào cuối' : '',
        ].filter(Boolean),
      };
    case 'INJECT_FUNCTION':
      return {
        title: `Inject Function → Regex #${action.params.scriptIndex}`,
        type: 'edit',
        color: '#10b981',
        icon: '💉',
        details: [
          `Code: ${(action.params.functionCode || '').slice(0, 80)}...`,
          `Vị trí: ${action.params.insertPosition || 'auto'}`,
        ],
      };
    case 'DELETE_REGEX':
      return {
        title: `Xóa Regex #${action.params.scriptIndex}`,
        type: 'delete',
        color: '#ef4444',
        icon: '🗑️',
        details: [],
      };
    case 'DELETE_ENTRY':
      return {
        title: `Xóa Entry #${action.params.entryIndex}`,
        type: 'delete',
        color: '#ef4444',
        icon: '🗑️',
        details: [],
      };
    case 'EDIT_ENTRY':
      return {
        title: `Sửa Entry #${action.params.entryIndex}`,
        type: 'edit',
        color: '#f59e0b',
        icon: '✏️',
        details: [
          `Trường: ${action.params.field}`,
        ],
      };
    case 'CREATE_TAVERN_HELPER':
      return {
        title: 'Tạo TavernHelper Script',
        type: 'create',
        color: '#10b981',
        icon: '⚙️',
        details: [
          `Tên: ${action.params.name || 'Script mới'}`,
        ],
      };
    case 'VIEW_FULL_REGEX':
      return {
        title: `Xem full Regex #${action.params.scriptIndex}`,
        type: 'view',
        color: '#3b82f6',
        icon: '👁',
        details: [],
      };
    case 'RUN_SCRIPT':
      return {
        title: 'Chạy Script',
        type: 'run',
        color: '#ef4444',
        icon: '▶️',
        details: [
          `Ngôn ngữ: ${action.params.language || 'javascript'}`,
          `Mô tả: ${action.params.description || 'Script từ AI'}`,
        ],
      };
    default:
      return {
        title: action.action,
        type: 'view',
        color: '#6b7280',
        icon: '❓',
        details: [],
      };
  }
}
