/**
 * SillyTavern Macro Resolver
 * Processes ST macro syntax ({{setvar::}}, {{getvar::}}, {{char}}, etc.)
 * before injecting preset prompts into the translation pipeline.
 */

export interface MacroContext {
  /** Character name from card */
  charName?: string;
  /** User name (defaults to "User") */
  userName?: string;
  /** Pre-seeded variables */
  initialVars?: Record<string, string>;
}

/**
 * Resolve SillyTavern macros in a prompt string.
 * 
 * Supported macros:
 * - {{setvar::name::value}}  → store variable, remove from output
 * - {{addvar::name::value}}  → add numeric value to variable, remove from output
 * - {{incvar::name}}         → increment variable by 1, remove from output
 * - {{decvar::name}}         → decrement variable by 1, remove from output
 * - {{getvar::name}}         → replace with stored value
 * - {{char}}                 → character name
 * - {{user}}                 → user name
 * - {{Char}}                 → character name (uppercase alias)
 * - {{User}}                 → user name (uppercase alias)
 * - {{roll::NdM}}            → replace with "NdM" (keep dice notation, AI doesn't need resolved value)
 * - {{random::min::max}}     → replace with midpoint (for predictable behavior)
 * - {{newline}}              → \n
 * - {{trim}}                 → remove (formatting macro)
 * - {{noop}}                 → remove (no-op macro)
 * - {{// comment}}           → remove (comment macro)
 * 
 * Unrecognized macros are left as-is to avoid breaking anything.
 */
export function resolveMacros(text: string, ctx: MacroContext = {}): string {
  const vars: Record<string, string> = { ...(ctx.initialVars || {}) };
  const charName = ctx.charName || '{{char}}';
  const userName = ctx.userName || 'User';

  // Process in order (top to bottom) so setvar before getvar works
  let result = text;

  // Pass 1: Process setvar/addvar/incvar/decvar (side-effect macros — remove from output)
  // These need to be processed first to populate the vars map
  result = result.replace(/\{\{setvar::([^:}]+)::([^}]*)\}\}/gi, (_match, name: string, value: string) => {
    vars[name.trim()] = value.trim();
    return '';
  });

  result = result.replace(/\{\{addvar::([^:}]+)::([^}]*)\}\}/gi, (_match, name: string, value: string) => {
    const existing = parseFloat(vars[name.trim()] || '0');
    const add = parseFloat(value.trim()) || 0;
    vars[name.trim()] = String(existing + add);
    return '';
  });

  result = result.replace(/\{\{incvar::([^}]+)\}\}/gi, (_match, name: string) => {
    const existing = parseFloat(vars[name.trim()] || '0');
    vars[name.trim()] = String(existing + 1);
    return '';
  });

  result = result.replace(/\{\{decvar::([^}]+)\}\}/gi, (_match, name: string) => {
    const existing = parseFloat(vars[name.trim()] || '0');
    vars[name.trim()] = String(existing - 1);
    return '';
  });

  // Pass 2: Resolve getvar (may reference vars set above)
  // Run multiple passes in case of nested/chained getvar
  for (let i = 0; i < 3; i++) {
    const before = result;
    result = result.replace(/\{\{getvar::([^}]+)\}\}/gi, (_match, name: string) => {
      const key = name.trim();
      return vars[key] ?? `{{getvar::${key}}}`;
    });
    if (result === before) break;
  }

  // Pass 3: Simple substitution macros
  result = result.replace(/\{\{char\}\}/gi, charName);
  result = result.replace(/\{\{user\}\}/gi, userName);
  result = result.replace(/\{\{newline\}\}/gi, '\n');
  result = result.replace(/\{\{trim\}\}/gi, '');
  result = result.replace(/\{\{noop\}\}/gi, '');

  // Comment macros: {{// anything}}
  result = result.replace(/\{\{\/\/[^}]*\}\}/g, '');

  // Random: replace with midpoint for deterministic behavior
  result = result.replace(/\{\{random::(\d+)::(\d+)\}\}/gi, (_match, min: string, max: string) => {
    const mid = Math.floor((parseInt(min) + parseInt(max)) / 2);
    return String(mid);
  });

  // Roll: keep as notation (AI should understand "2d6" etc.)
  result = result.replace(/\{\{roll::([^}]+)\}\}/gi, (_match, dice: string) => dice.trim());

  // Clean up empty lines left by removed macros
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

/**
 * Extract character name from a card object.
 */
export function getCharNameFromCard(card: any): string | undefined {
  if (!card) return undefined;
  return card.data?.name || card.name || undefined;
}
