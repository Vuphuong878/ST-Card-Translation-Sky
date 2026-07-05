/**
 * zodCodeParser.ts — Parse Zod code text → MVUZODSchema
 *
 * Reverse-engineers the output of schemaToZodCode() back into MVUZODSchema.
 * Handles: z.object, z.string, z.coerce.number, z.boolean, z.array,
 *          z.record, z.enum, .prefault(), .transform(clamp), .describe(),
 *          safeString(), nested objects.
 *
 * Heuristic parser — không dùng AST, dùng balanced-brace extraction
 * + regex matching. Đủ tốt cho output của app và hầu hết card thực tế.
 */

import type { MVUZODSchema, MVUZODField, MVUZODConstraints } from '../../types/mvuzod.types';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if script content contains a MVU Zod schema definition
 * and extract it into MVUZODSchema.
 *
 * Returns null if no schema found or parsing fails.
 */
export function parseZodCodeToSchema(zodCode: string): MVUZODSchema | null {
  try {
    // Find the root z.object block — typically `Schema = z.object({...})`
    // or `export const Schema = z.object({...})`
    const rootMatch = zodCode.match(
      /(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*z\.object\(\{/
    );
    if (!rootMatch) return null;

    const startIdx = rootMatch.index! + rootMatch[0].length - 1; // at the opening {
    const rootBody = extractBalancedBraces(zodCode, startIdx);
    if (!rootBody) return null;

    const fields = parseObjectBody(rootBody, '');
    if (fields.length === 0) return null;

    return { version: '1.0', fields };
  } catch {
    return null;
  }
}

/**
 * Detect if a TavernHelper script looks like a MVU schema registration script.
 */
export function isMvuSchemaScript(scriptName: string, scriptContent: string): boolean {
  const nameLower = scriptName.toLowerCase();
  const namePatterns = [
    'cấu trúc biến', '变量结构', 'schema', 'zod',
    'cấu trúc', 'variable structure',
  ];
  const hasNameMatch = namePatterns.some(p => nameLower.includes(p.toLowerCase()));

  const hasZodObject = /z\.object\(\{/.test(scriptContent);
  const hasMvuImport = /(?:registerMvuSchema|mvu_zod|MVU|MagVarUpdate)/i.test(scriptContent);
  const hasSchemaExport = /(?:export\s+)?(?:const|let|var)\s+\w*[Ss]chema\s*=/.test(scriptContent);

  // Script is MVU schema if:
  // 1. Name matches AND has z.object
  // 2. Has MVU import AND has z.object AND has Schema export
  return (hasNameMatch && hasZodObject) || (hasMvuImport && hasZodObject && hasSchemaExport);
}

// ═══════════════════════════════════════════════════════════════════════════
// BALANCED BRACE EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract content between matching braces starting at position `start`.
 * Returns the content INSIDE the braces (without outer { }).
 */
function extractBalancedBraces(input: string, start: number): string | null {
  if (input[start] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let strChar = '';

  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === strChar) { inStr = false; continue; }
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) return input.substring(start + 1, i);
      }
    }
  }
  return null;
}

/**
 * Extract content between matching parentheses starting at position `start`.
 */
function extractBalancedParens(input: string, start: number): string | null {
  if (input[start] !== '(') return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let strChar = '';

  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === strChar) { inStr = false; continue; }
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
      if (ch === '(') depth++;
      if (ch === ')') {
        depth--;
        if (depth === 0) return input.substring(start + 1, i);
      }
    }
  }
  return null;
}

/**
 * Extract content between matching brackets starting at position `start`.
 * Exported (currently unused internally) so the strict build doesn't flag it as dead.
 */
export function extractBalancedBrackets(input: string, start: number): string | null {
  if (input[start] !== '[') return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let strChar = '';

  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === strChar) { inStr = false; continue; }
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
      if (ch === '[') depth++;
      if (ch === ']') {
        depth--;
        if (depth === 0) return input.substring(start + 1, i);
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP-LEVEL FIELD SPLITTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Split top-level key-value pairs in a z.object body.
 * Uses character-by-character scanning to properly handle nested
 * braces, parens, brackets, strings, and comments.
 *
 * Returns array of { key, valueExpr } where valueExpr is the full
 * Zod chain for that field.
 */
function splitObjectEntries(body: string): Array<{ key: string; valueExpr: string }> {
  const entries: Array<{ key: string; valueExpr: string }> = [];

  let i = 0;
  const len = body.length;

  while (i < len) {
    // Skip whitespace and newlines
    while (i < len && /\s/.test(body[i])) i++;
    if (i >= len) break;

    // Skip line comments
    if (body[i] === '/' && body[i + 1] === '/') {
      while (i < len && body[i] !== '\n') i++;
      continue;
    }

    // Try to read a key (quoted or identifier)
    let key: string | null = null;
    let keyEnd = i;

    if (body[i] === "'" || body[i] === '"') {
      // Quoted key
      const quote = body[i];
      const closeIdx = body.indexOf(quote, i + 1);
      if (closeIdx === -1) break;
      key = body.substring(i + 1, closeIdx);
      keyEnd = closeIdx + 1;
    } else if (/[\w$]/.test(body[i])) {
      // Identifier key
      const start = i;
      while (keyEnd < len && /[\w$]/.test(body[keyEnd])) keyEnd++;
      key = body.substring(start, keyEnd);
    } else {
      // Unknown character — skip
      i++;
      continue;
    }

    // Skip whitespace after key
    while (keyEnd < len && /\s/.test(body[keyEnd])) keyEnd++;

    // Expect ':'
    if (keyEnd >= len || body[keyEnd] !== ':') {
      i = keyEnd;
      continue;
    }

    const valueStart = keyEnd + 1;

    // Scan the value expression until we find a top-level comma or end of body
    let depth = 0;
    let inStr = false;
    let esc = false;
    let strChar = '';
    let valueEnd = valueStart;

    for (let j = valueStart; j < len; j++) {
      const ch = body[j];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === strChar) { inStr = false; }
        continue;
      }

      if (ch === '"' || ch === "'" || ch === '`') {
        inStr = true;
        strChar = ch;
        continue;
      }

      if (ch === '{' || ch === '(' || ch === '[') { depth++; continue; }
      if (ch === '}' || ch === ')' || ch === ']') {
        depth--;
        if (depth < 0) {
          // Reached outer closing brace — end of body
          valueEnd = j;
          break;
        }
        continue;
      }

      if (ch === ',' && depth === 0) {
        valueEnd = j;
        break;
      }

      valueEnd = j + 1;
    }

    let valueExpr = body.substring(valueStart, valueEnd).trim();
    if (valueExpr.endsWith(',')) valueExpr = valueExpr.slice(0, -1).trim();

    if (key && valueExpr) {
      entries.push({ key, valueExpr });
    }

    // Move past the comma
    i = valueEnd;
    if (i < len && body[i] === ',') i++;
  }

  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════
// ZOD EXPRESSION PARSER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a z.object({...}) body into MVUZODField[].
 */
function parseObjectBody(body: string, parentPath: string): MVUZODField[] {
  const entries = splitObjectEntries(body);
  const fields: MVUZODField[] = [];

  for (const { key, valueExpr } of entries) {
    const path = parentPath ? `${parentPath}/${key}` : `/${key}`;
    const field = parseZodExpr(key, path, valueExpr);
    if (field) fields.push(field);
  }

  return fields;
}

/**
 * Parse a single Zod expression (e.g. "z.coerce.number().transform(...).prefault(50)")
 * into an MVUZODField.
 */
function parseZodExpr(key: string, path: string, expr: string): MVUZODField | null {
  const trimmed = expr.trim();
  const constraints: MVUZODConstraints = {};
  let type: MVUZODField['type'] = 'string';
  let defaultValue: unknown = '';
  let children: MVUZODField[] | undefined;

  // ─── z.object({...}) ───
  const objectMatch = trimmed.match(/^z\.object\(\{/);
  if (objectMatch) {
    type = 'object';
    const braceIdx = trimmed.indexOf('{');
    const body = extractBalancedBraces(trimmed, braceIdx);
    if (body) {
      children = parseObjectBody(body, path);
    }
    defaultValue = {};

    // Check for .transform() after the closing })
    const afterObj = trimmed.substring(trimmed.lastIndexOf('})') + 2);
    parseChainedMethods(afterObj, constraints);

    return { path, type, label: key, defaultValue, constraints, children };
  }

  // ─── z.record(...) ───
  const recordMatch = trimmed.match(/^z\.record\(/);
  if (recordMatch) {
    type = 'record';
    defaultValue = {};

    // Extract record args
    const parenIdx = trimmed.indexOf('(', 8);
    const parenContent = extractBalancedParens(trimmed, parenIdx);
    if (parenContent) {
      // Parse key schema describe
      const describeMatch = parenContent.match(/z\.string\(\)\.describe\('([^']+)'\)/);
      if (describeMatch) {
        constraints.describe = describeMatch[1];
      }

      // Parse enum key schema
      const enumKeyMatch = parenContent.match(/z\.enum\(\[([^\]]+)\]\)/);
      if (enumKeyMatch) {
        constraints.enumValues = extractStringArray(enumKeyMatch[1]);
      }

      // Parse value schema — check for z.object in record value
      const valueObjMatch = parenContent.match(/,\s*z\.object\(\{/);
      if (valueObjMatch) {
        const valueObjStart = parenContent.indexOf('{', valueObjMatch.index!);
        const valueBody = extractBalancedBraces(parenContent, valueObjStart);
        if (valueBody) {
          children = parseObjectBody(valueBody, `${path}/_child`);
        }
      }
    }

    // Parse chained methods after z.record(...)
    const afterRecord = getAfterBalancedParens(trimmed, parenIdx);
    parseChainedMethods(afterRecord, constraints);

    // Check for .transform(pickBy/takeRight)
    const transformMatch = trimmed.match(/\.transform\(([^)]*(?:\([^)]*\))*[^)]*)\)/);
    if (transformMatch) {
      const tBody = transformMatch[1];
      if (tBody.includes('pickBy')) constraints.transform = 'pickBy';
      else if (tBody.includes('takeRight')) constraints.transform = 'takeRight';
      else {
        constraints.transform = 'custom';
        constraints.transformExpr = tBody;
      }
    }

    return { path, type, label: key, defaultValue, constraints, children };
  }

  // ─── z.enum([...]) ───
  const enumMatch = trimmed.match(/^z\.enum\(\[([^\]]+)\]\)/);
  if (enumMatch) {
    type = 'string';
    constraints.enumValues = extractStringArray(enumMatch[1]);
    defaultValue = constraints.enumValues[0] ?? '';

    const afterEnum = trimmed.substring(enumMatch[0].length);
    parseChainedMethods(afterEnum, constraints);
    if (constraints.prefault !== undefined) defaultValue = constraints.prefault;

    return { path, type, label: key, defaultValue, constraints };
  }

  // ─── z.array(z.string()) ───
  if (trimmed.startsWith('z.array(')) {
    type = 'array';
    defaultValue = [];

    const afterArray = getAfterBalancedParens(trimmed, trimmed.indexOf('('));
    parseChainedMethods(afterArray, constraints);

    return { path, type, label: key, defaultValue, constraints };
  }

  // ─── z.boolean() ───
  if (trimmed.startsWith('z.boolean()')) {
    type = 'boolean';
    defaultValue = false;

    const afterBool = trimmed.substring('z.boolean()'.length);
    parseChainedMethods(afterBool, constraints);
    if (constraints.prefault !== undefined) defaultValue = constraints.prefault;

    return { path, type, label: key, defaultValue, constraints };
  }

  // ─── z.coerce.number() ───
  if (trimmed.startsWith('z.coerce.number()')) {
    type = 'number';
    constraints.coerce = true;
    defaultValue = 0;

    const afterNum = trimmed.substring('z.coerce.number()'.length);
    parseChainedMethods(afterNum, constraints);
    if (constraints.prefault !== undefined) defaultValue = constraints.prefault;

    return { path, type, label: key, defaultValue, constraints };
  }

  // ─── z.number() ───
  if (trimmed.startsWith('z.number()')) {
    type = 'number';
    defaultValue = 0;

    const afterNum = trimmed.substring('z.number()'.length);
    parseChainedMethods(afterNum, constraints);
    if (constraints.prefault !== undefined) defaultValue = constraints.prefault;

    return { path, type, label: key, defaultValue, constraints };
  }

  // ─── z.string() ───
  if (trimmed.startsWith('z.string()')) {
    type = 'string';
    defaultValue = '';

    const afterStr = trimmed.substring('z.string()'.length);
    parseChainedMethods(afterStr, constraints);
    if (constraints.prefault !== undefined) defaultValue = constraints.prefault;

    return { path, type, label: key, defaultValue, constraints };
  }

  // ─── safeString() — custom helper used in some cards ───
  if (trimmed.startsWith('safeString()')) {
    type = 'string';
    defaultValue = '';

    const afterSafe = trimmed.substring('safeString()'.length);
    parseChainedMethods(afterSafe, constraints);
    if (constraints.prefault !== undefined) defaultValue = constraints.prefault;

    return { path, type, label: key, defaultValue, constraints };
  }

  // ─── z.preprocess(...) — another safeString variant ───
  if (trimmed.startsWith('z.preprocess(')) {
    type = 'string';
    defaultValue = '';

    // Look for chained methods after the preprocess close
    const afterPreprocess = getAfterBalancedParens(trimmed, trimmed.indexOf('('));
    parseChainedMethods(afterPreprocess, constraints);
    if (constraints.prefault !== undefined) defaultValue = constraints.prefault;

    return { path, type, label: key, defaultValue, constraints };
  }

  // ─── Fallback: unknown expression ───
  // Try to detect type from the expression
  if (/number/i.test(trimmed)) {
    type = 'number';
    defaultValue = 0;
  } else if (/boolean/i.test(trimmed)) {
    type = 'boolean';
    defaultValue = false;
  }

  parseChainedMethods(trimmed, constraints);
  if (constraints.prefault !== undefined) defaultValue = constraints.prefault;

  return { path, type, label: key, defaultValue, constraints };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAINED METHOD PARSER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse chained methods like .prefault(), .transform(), .describe()
 * from a string like ".transform(v => _.clamp(v, 0, 100)).prefault(50)"
 */
function parseChainedMethods(chain: string, constraints: MVUZODConstraints): void {
  if (!chain) return;

  // .prefault(...)
  const prefaultMatch = chain.match(/\.prefault\(([^)]*(?:\([^)]*\))*[^)]*)\)/);
  if (prefaultMatch) {
    const val = prefaultMatch[1].trim();
    constraints.prefault = parseLiteralValue(val);
  }

  // .describe('...')
  const describeMatch = chain.match(/\.describe\('([^']+)'\)/);
  if (describeMatch) {
    constraints.describe = describeMatch[1];
  }

  // .transform(v => _.clamp(v, min, max))
  const clampMatch = chain.match(/\.transform\(\s*(?:v|\w+)\s*=>\s*_\.clamp\(\s*(?:v|\w+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*\)/);
  if (clampMatch) {
    constraints.clamp = [parseInt(clampMatch[1]), parseInt(clampMatch[2])];
  } else {
    // Check for other transforms
    const transformMatch = chain.match(/\.transform\(([^)]*(?:\([^)]*\))*[^)]*)\)/);
    if (transformMatch && !clampMatch) {
      const tBody = transformMatch[1];
      if (tBody.includes('pickBy')) {
        constraints.transform = 'pickBy';
      } else if (tBody.includes('takeRight')) {
        constraints.transform = 'takeRight';
      } else if (tBody.includes('clamp')) {
        // More complex clamp pattern
        const clampNums = tBody.match(/(-?\d+)\s*,\s*(-?\d+)/);
        if (clampNums) {
          constraints.clamp = [parseInt(clampNums[1]), parseInt(clampNums[2])];
        }
      } else {
        constraints.transform = 'custom';
        constraints.transformExpr = tBody;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a literal JS value string: number, string, boolean, array, object
 */
function parseLiteralValue(val: string): unknown {
  const v = val.trim();

  // Empty object/array
  if (v === '{}') return {};
  if (v === '[]') return [];

  // Boolean
  if (v === 'true') return true;
  if (v === 'false') return false;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(v)) return parseFloat(v);

  // String (quoted)
  const strMatch = v.match(/^'([^']*)'$/) ?? v.match(/^"([^"]*)"$/);
  if (strMatch) return strMatch[1];

  // Fallback
  return v;
}

/**
 * Extract string values from enum array text: "'A', 'B', 'C'" → ['A', 'B', 'C']
 */
function extractStringArray(text: string): string[] {
  const result: string[] = [];
  const pattern = /'([^']+)'|"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    result.push(m[1] ?? m[2]);
  }
  return result;
}

/**
 * Get text after the balanced parentheses starting at `start`.
 */
function getAfterBalancedParens(input: string, start: number): string {
  if (start < 0 || input[start] !== '(') return '';
  let depth = 0;
  let inStr = false;
  let esc = false;
  let strChar = '';

  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === strChar) { inStr = false; continue; }
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
      if (ch === '(') depth++;
      if (ch === ')') {
        depth--;
        if (depth === 0) return input.substring(i + 1);
      }
    }
  }
  return '';
}
