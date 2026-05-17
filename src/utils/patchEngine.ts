/**
 * Patch Engine — Parse AI patch output and apply find/replace patches.
 *
 * Instead of having the AI regenerate entire regex content, Patch Mode
 * asks the AI to output only the changes as <<<FIND>>>/<<<REPLACE>>>/<<<END>>>
 * blocks. This engine parses those blocks and applies them to the original.
 *
 * Benefits:
 *   - Dramatically fewer output tokens (only changed parts)
 *   - Less risk of AI corrupting code structure
 *   - Faster processing for large regex fields
 */

export interface PatchEntry {
  find: string;
  replace: string;
}

export interface PatchResult {
  result: string;
  applied: number;
  failed: string[];
  totalPatches: number;
}

/**
 * Parse AI response in <<<FIND>>>/<<<REPLACE>>>/<<<END>>> format.
 *
 * Handles edge cases:
 *   - AI wrapping output in markdown code fences
 *   - Extra whitespace around delimiters
 *   - Empty FIND or REPLACE blocks
 *   - <<<NO_CHANGES>>> sentinel
 */
export function parsePatchOutput(aiOutput: string): PatchEntry[] {
  if (!aiOutput || !aiOutput.trim()) return [];

  // Check for <<<NO_CHANGES>>> sentinel
  if (/<<<\s*NO_CHANGES\s*>>>/.test(aiOutput)) return [];

  // Strip markdown code fences if AI wrapped the output
  let cleaned = aiOutput;
  cleaned = cleaned.replace(/^```[\s\S]*?\n/, '');
  cleaned = cleaned.replace(/\n```\s*$/, '');

  const patches: PatchEntry[] = [];

  // Primary regex: capture content between <<<FIND>>>, <<<REPLACE>>>, <<<END>>>
  // Uses lazy matching ([\s\S]*?) to handle multi-line content
  const blockRegex = /<<<\s*FIND\s*>>>\s*\n([\s\S]*?)\n<<<\s*REPLACE\s*>>>\s*\n([\s\S]*?)\n<<<\s*END\s*>>>/g;

  let match;
  while ((match = blockRegex.exec(cleaned)) !== null) {
    const find = match[1];
    const replace = match[2];

    // Skip empty FIND blocks (would match everything)
    if (!find || !find.trim()) continue;

    patches.push({ find, replace: replace ?? '' });
  }

  // Fallback: try without trailing newline before <<<END>>> (AI sometimes omits it)
  if (patches.length === 0) {
    const fallbackRegex = /<<<\s*FIND\s*>>>\s*\n?([\s\S]*?)<<<\s*REPLACE\s*>>>\s*\n?([\s\S]*?)<<<\s*END\s*>>>/g;
    while ((match = fallbackRegex.exec(cleaned)) !== null) {
      const find = match[1]?.trim();
      const replace = match[2]?.trimEnd() ?? '';
      if (!find) continue;
      patches.push({ find, replace });
    }
  }

  return patches;
}

/**
 * Apply an ordered list of find/replace patches to the original text.
 *
 * Each patch replaces ONLY the first occurrence of `find` in the text.
 * Patches are applied sequentially — later patches see the result of earlier ones.
 *
 * Returns detailed stats: how many applied, which failed (find not found).
 */
export function applyPatches(original: string, patches: PatchEntry[]): PatchResult {
  let result = original;
  let applied = 0;
  const failed: string[] = [];

  for (const patch of patches) {
    const idx = result.indexOf(patch.find);
    if (idx !== -1) {
      // Replace only the first occurrence (safer than replaceAll)
      result = result.slice(0, idx) + patch.replace + result.slice(idx + patch.find.length);
      applied++;
    } else {
      // Try trimmed version as fallback (AI might add/remove trailing whitespace)
      const trimmedFind = patch.find.trim();
      const trimmedIdx = result.indexOf(trimmedFind);
      if (trimmedIdx !== -1) {
        result = result.slice(0, trimmedIdx) + patch.replace + result.slice(trimmedIdx + trimmedFind.length);
        applied++;
      } else {
        const preview = patch.find.slice(0, 80).replace(/\n/g, '\\n');
        failed.push(preview + (patch.find.length > 80 ? '...' : ''));
      }
    }
  }

  return { result, applied, failed, totalPatches: patches.length };
}

/**
 * Validate that the patched result hasn't broken structural integrity.
 *
 * Checks bracket/tag balance to catch cases where a patch accidentally
 * split an HTML tag, CSS block, or JS expression.
 */
export function validatePatchResult(original: string, patched: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  const count = (str: string, char: string) => {
    let c = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === char) c++;
    }
    return c;
  };

  // Check bracket balance (compare original vs patched)
  const brackets: [string, string][] = [['{', '}'], ['<', '>'], ['[', ']'], ['(', ')']];

  for (const [open, close] of brackets) {
    const origBalance = count(original, open) - count(original, close);
    const patchBalance = count(patched, open) - count(patched, close);

    if (origBalance !== patchBalance) {
      warnings.push(
        `Bracket imbalance: '${open}${close}' balance shifted from ${origBalance} to ${patchBalance}`
      );
    }
  }

  // Check that backtick count hasn't changed dramatically
  const origBackticks = count(original, '`');
  const patchBackticks = count(patched, '`');
  if (Math.abs(origBackticks - patchBackticks) > 2) {
    warnings.push(`Backtick count changed: ${origBackticks} → ${patchBackticks}`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
