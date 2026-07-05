/**
 * src/lib/ai/refinerUtils.ts — Shared utilities for AI Lorebook Refiner
 * Extracted to avoid circular dependencies between lorebookRefiner ↔ refinerPrompts
 */

/**
 * Detect system/EJS/MVU entries that should NOT be modified by AI refiner.
 * These entries contain EJS code, MVU variable rules, or initialization data.
 */
const SYSTEM_COMMENT_PATTERNS = [
  '[mvu_update]',
  '[initvar]',
  'Bộ điều khiển EJS',
  'EJS Controller',
];

const SYSTEM_CONTENT_PATTERNS = [
  '<%',             // EJS code open tag
  '%>',             // EJS code close tag
  '@@preprocessing', // EJS preprocessing directive
  'getvar(',        // TavernHelper variable read
  'setvar(',        // TavernHelper variable write
  '<UpdateVariable>', // MVU output format
  'activateEntry(',  // EJS entry control
  'setEntryEnabled(', // EJS entry control
];

export function isSystemEntry(entry: { comment: string; content: string }): boolean {
  const commentLower = entry.comment.toLowerCase();
  // Check comment patterns
  for (const pat of SYSTEM_COMMENT_PATTERNS) {
    if (commentLower.includes(pat.toLowerCase())) return true;
  }
  // Check content patterns
  for (const pat of SYSTEM_CONTENT_PATTERNS) {
    if (entry.content.includes(pat)) return true;
  }
  return false;
}
