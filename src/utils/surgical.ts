export interface CJKToken {
  id: number;
  text: string;
  start: number;
  end: number;
  translated?: string;
}

/**
 * Extracts segments of CJK text, avoiding code brackets and braces.
 */
export function extractCJKTokens(text: string): CJKToken[] {
  const tokens: CJKToken[] = [];
  // Match CJK blocks optionally joined by safe non-code characters (spaces, letters, numbers, hyphens, periods, slashes, etc.)
  const regex = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]+(?:[ \tA-Za-z0-9.\-_/!?%~]+[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]+)*/g;
  
  let match;
  let id = 1;
  while ((match = regex.exec(text)) !== null) {
    const hasIdeograph = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/.test(match[0]);
    if (hasIdeograph) {
      // Skip CJK tokens that appear inside CSS function calls
      // Check the context before this match for CSS function patterns: func-name(
      const contextBefore = text.slice(Math.max(0, match.index - 80), match.index);
      const isCssFunction = /[a-zA-Z-]+\s*\(\s*$/.test(contextBefore);
      // Also check if surrounded by CSS property syntax: { ... property: value ... }
      const contextAfter = text.slice(match.index + match[0].length, Math.min(text.length, match.index + match[0].length + 30));
      const isCssValue = isCssFunction && /^\s*[\d\s,.)px%ems]+/.test(contextAfter);
      
      if (isCssValue) {
        // Skip this token — it's inside a CSS function call (e.g. drop-shadow(商 10px ...))
        continue;
      }

      tokens.push({
        id: id++,
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  return tokens;
}

/**
 * Reinserts translated tokens back into the original string safely by iterating in reverse.
 */
export function reinsertTranslations(original: string, tokens: CJKToken[]): string {
  let result = original;
  // Sort by start index descending to avoid offsetting issues
  const sortedTokens = [...tokens].sort((a, b) => b.start - a.start);
  
  for (const token of sortedTokens) {
    if (token.translated) {
      result = result.slice(0, token.start) + token.translated + result.slice(token.end);
    }
  }
  return result;
}

/**
 * Verifies if structural integrity of code has been broken during translation.
 */
export function verifySurgicalResult(original: string, translated: string): boolean {
  // Check if backticks count matches
  const countChar = (str: string, char: string) => (str.match(new RegExp(`\\${char}`, 'g')) || []).length;
  
  if (countChar(original, '`') !== countChar(translated, '`')) return false;
  if (countChar(original, '{') !== countChar(translated, '{')) return false;
  if (countChar(original, '}') !== countChar(translated, '}')) return false;
  if (countChar(original, '<') !== countChar(translated, '<')) return false;
  if (countChar(original, '>') !== countChar(translated, '>')) return false;
  
  return true;
}

import { extractTranslationFromResponse } from './masterPrompt';
import type { ProxySettings, GlossaryEntry } from '../types/card';

/**
 * Sanitize structural characters from LLM translated text.
 * Prevents verification failures caused by LLM adding < > { } ` to translations.
 */
function sanitizeTranslatedText(text: string): string {
  return text
    .replace(/[<>{}`]/g, '')
    .trim();
}

/**
 * Parse a batch of LLM response lines into id-text pairs.
 */
function parseBatchResponse(rawResult: string): { id?: number; text: string }[] {
  const parsed = extractTranslationFromResponse(rawResult);
  const cleanedResult = parsed.translation || rawResult;
  const lines = cleanedResult.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const results: { id?: number; text: string }[] = [];
  for (const line of lines) {
    const matchLine = line.match(/^(?:[^\d#]*#?\s*)(\d+)[\t \.\:\-\]\)]+(.+)$/);
    if (matchLine) {
      results.push({ id: parseInt(matchLine[1], 10), text: matchLine[2].trim() });
    } else {
      results.push({ text: line });
    }
  }
  return results;
}

/**
 * Apply parsed translations to a batch of tokens, sanitizing structural chars.
 */
function applyBatchTranslations(batch: CJKToken[], parsedTranslations: { id?: number; text: string }[]): number {
  let matched = 0;

  const cleanTranslation = (token: CJKToken, raw: string): string => {
    let t = raw;
    if (t.startsWith(token.text)) {
      t = t.substring(token.text.length).trim();
      t = t.replace(/^[\s\:\-\=\>\t\(\)\[\]\{\}]+/, '').trim();
    }
    const parenthesized = `(${token.text})`;
    if (t.endsWith(parenthesized)) t = t.substring(0, t.length - parenthesized.length).trim();
    const bracketed = `[${token.text}]`;
    if (t.endsWith(bracketed)) t = t.substring(0, t.length - bracketed.length).trim();
    return sanitizeTranslatedText(t);
  };

  if (parsedTranslations.length === batch.length) {
    // Positional mapping (most robust if line count matches)
    for (let idx = 0; idx < batch.length; idx++) {
      const cleaned = cleanTranslation(batch[idx], parsedTranslations[idx].text);
      if (cleaned) {
        batch[idx].translated = cleaned;
        matched++;
      }
    }
  } else {
    // Match strictly by ID
    for (const p of parsedTranslations) {
      if (p.id !== undefined) {
        const token = batch.find(t => t.id === p.id);
        if (token) {
          const cleaned = cleanTranslation(token, p.text);
          if (cleaned) {
            token.translated = cleaned;
            matched++;
          }
        }
      }
    }
  }
  return matched;
}

/**
 * The main surgical translation orchestrator.
 * @param strictVerification If false, accept results even if structural verification fails slightly (for replaceString with no fallback)
 */
export async function surgicalTranslate(
  text: string,
  config: ProxySettings,
  targetLang: string,
  signal?: AbortSignal,
  glossary?: GlossaryEntry[],
  mvuDictionary?: Record<string, string>,
  strictVerification: boolean = true
): Promise<{ translated: string; success: boolean; fallbackTriggered: boolean }> {
  const { callProvider } = await import('./apiClient');
  const tokens = extractCJKTokens(text);
  
  if (tokens.length === 0) {
    return { translated: text, success: true, fallbackTriggered: false };
  }

  // 1. Apply local glossary / MVU dictionary translations first to save API tokens
  for (const token of tokens) {
    const trimmed = token.text.trim();
    
    // Check MVU dictionary
    if (mvuDictionary && mvuDictionary[trimmed]) {
      token.translated = mvuDictionary[trimmed];
      continue;
    }
    
    // Check Glossary
    if (glossary) {
      const match = glossary.find(g => g.source.trim() === trimmed);
      if (match && match.target.trim()) {
        token.translated = match.target.trim();
        continue;
      }
    }
  }
  
  // Only send tokens that weren't translated locally
  const pendingTokens = tokens.filter(t => !t.translated);
  
  // Deduplicate tokens by text to avoid sending duplicates to LLM and save tokens
  const uniquePendingMap = new Map<string, CJKToken>();
  for (const token of pendingTokens) {
    if (!uniquePendingMap.has(token.text)) {
      uniquePendingMap.set(token.text, token); // Keep the first token as representative
    }
  }
  const uniquePendingTokens = Array.from(uniquePendingMap.values());

  if (uniquePendingTokens.length === 0) {
    const reinserted = reinsertTranslations(text, tokens);
    return { translated: reinserted, success: true, fallbackTriggered: false };
  }

  // Adaptive batch sizing: bigger batches for bigger jobs to reduce API calls
  const BATCH_SIZE = uniquePendingTokens.length > 2000 ? 300 :
                     uniquePendingTokens.length > 500 ? 200 :
                     uniquePendingTokens.length > 100 ? 120 : 80;
  const MAX_RETRIES = 2;
  const tokenBatches: CJKToken[][] = [];
  for (let i = 0; i < uniquePendingTokens.length; i += BATCH_SIZE) {
    tokenBatches.push(uniquePendingTokens.slice(i, i + BATCH_SIZE));
  }

  console.log(`[surgicalTranslate] Extracted ${tokens.length} tokens (${uniquePendingTokens.length} unique pending, ${tokens.length - pendingTokens.length} local-resolved), ${tokenBatches.length} batches × ${BATCH_SIZE} planned`);
  
  let glossaryPrompt = '';
  if (glossary && glossary.length > 0) {
    const terms = glossary
      .filter(g => g.source.trim() && g.target.trim())
      .map(g => `  "${g.source}" → "${g.target}"`)
      .join('\n');
    if (terms) {
      glossaryPrompt = `\n\nMANDATORY GLOSSARY (use these translations exactly):\n${terms}`;
    }
  }
  
  let mvuPrompt = '';
  if (mvuDictionary && Object.keys(mvuDictionary).length > 0) {
    const terms = Object.entries(mvuDictionary)
      .filter(([k, v]) => k && v && k !== v)
      .map(([k, v]) => `  "${k}" → "${v}"`)
      .join('\n');
    if (terms) {
      mvuPrompt = `\n\nMVU VARIABLE MAPPINGS (use these translations exactly):\n${terms}`;
    }
  }

  const isVietnamese = targetLang.toLowerCase().includes('việt') || targetLang.toLowerCase().includes('vietnamese');
  const langRules = isVietnamese
    ? `
VIETNAMESE-SPECIFIC RULES:
- Chinese proper nouns (人名, 地名, 国名, 官职) → MUST use Hán Việt (Sino-Vietnamese reading). Examples: 清河 → Thanh Hà, 慕容冲 → Mộ Dung Xung, 洛阳 → Lạc Dương, 东晋 → Đông Tấn, 前秦 → Tiền Tần.
- Dynasty/era names → Hán Việt. Examples: 永嘉 → Vĩnh Gia, 太元 → Thái Nguyên, 建元 → Kiến Nguyên.
- Titles/positions → Hán Việt. Examples: 太守 → Thái thú, 刺史 → Thứ sử, 将军 → Tướng quân.
- Use natural Vietnamese roleplay pronouns (ta, ngươi, hắn, nàng).
- Maintain literary/classical Vietnamese tone for historical content.`
    : '';

  const systemPrompt = `You are a professional CJK-to-${targetLang} translation engine specialized in game/roleplay character cards.
You MUST translate ALL items completely. Do NOT skip any item.
The source text is from a historical Chinese roleplay card containing proper nouns (人名, 地名, 朝代), game mechanics, and narrative descriptions.

INPUT FORMAT: Lines formatted as "#{id}\t{CJK text}"
OUTPUT FORMAT: Return ONLY "#{id}\t{translated text}" for EACH input line. One line per item.

CRITICAL RULES:
1. Translate EVERY item. Zero untranslated Chinese characters allowed in output.
2. Keep output format exactly: #{id}\t{translated text}
3. Do NOT output any markdown, explanations, or conversational text.
4. Do NOT use < > \` { } in your translations.
5. Output ALL items — do NOT truncate or summarize even if the list is long.
${langRules}${glossaryPrompt}${mvuPrompt}`;

  try {
    const processBatch = async (batch: CJKToken[], label: string): Promise<void> => {
      const payload = batch.map(t => `#${t.id}\t${t.text}`).join('\n');
      
      let matched = 0;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const rawResult = await callProvider(config, systemPrompt, payload, signal);
          const parsedTranslations = parseBatchResponse(rawResult);
          matched = applyBatchTranslations(batch, parsedTranslations);

          if (matched >= batch.length * 0.5) {
            console.log(`[surgicalTranslate] ${label}: ${matched}/${batch.length} tokens matched${attempt > 0 ? ` (retry ${attempt})` : ''}`);
            break;
          } else if (attempt < MAX_RETRIES) {
            console.warn(`[surgicalTranslate] ${label}: only ${matched}/${batch.length} matched, retrying (${attempt + 1}/${MAX_RETRIES})...`);
          } else {
            console.warn(`[surgicalTranslate] ${label}: ${matched}/${batch.length} matched after ${MAX_RETRIES} retries`);
          }
        } catch (err) {
          if (attempt < MAX_RETRIES) {
            console.warn(`[surgicalTranslate] ${label}: error on attempt ${attempt + 1}, retrying...`, err);
          } else {
            console.error(`[surgicalTranslate] ${label}: failed after ${MAX_RETRIES} retries:`, err);
          }
        }
      }
    };

    for (let batchIdx = 0; batchIdx < tokenBatches.length; batchIdx++) {
      const batch = tokenBatches[batchIdx];
      await processBatch(batch, `Batch ${batchIdx + 1}/${tokenBatches.length}`);
      
      // Sub-batch recovery: if many tokens in this batch are still untranslated, split and retry
      const untranslated = batch.filter(t => !t.translated || t.translated.trim() === '');
      if (untranslated.length > 5 && untranslated.length > batch.length * 0.2) {
        console.log(`[surgicalTranslate] Batch ${batchIdx + 1}: ${untranslated.length} tokens still untranslated, splitting into sub-batches...`);
        const SUB_BATCH_SIZE = 50;
        for (let si = 0; si < untranslated.length; si += SUB_BATCH_SIZE) {
          const subBatch = untranslated.slice(si, si + SUB_BATCH_SIZE);
          await processBatch(subBatch, `Batch ${batchIdx + 1} sub ${Math.floor(si / SUB_BATCH_SIZE) + 1}`);
        }
      }
    }
    
    // Build a cache of successful translations from unique tokens (and local glossary matches)
    const translationCache: Record<string, string> = {};
    for (const token of tokens) {
      if (token.translated && token.translated !== token.text && token.translated.trim() !== '') {
        translationCache[token.text] = token.translated;
      }
    }

    // Apply translations to all tokens, filling missing ones from cache or keeping original
    for (const token of tokens) {
      if (!token.translated || token.translated.trim() === '') {
        if (translationCache[token.text]) {
          token.translated = translationCache[token.text];
        } else {
          token.translated = token.text;
        }
      }
    }
    
    const reinserted = reinsertTranslations(text, tokens);
    const isValid = verifySurgicalResult(text, reinserted);
    
    const translatedCount = tokens.filter(t => t.translated !== t.text).length;
    const missedCount = tokens.filter(t => t.translated === t.text).length;
    console.log(`[surgicalTranslate] Complete: ${translatedCount}/${tokens.length} tokens translated, ${missedCount} remained original, verification=${isValid ? 'PASS' : 'FAIL'}`);

    if (isValid) {
      if (missedCount > 0) {
        console.warn(`[surgicalTranslate] ${missedCount} tokens could not be translated:`, tokens.filter(t => t.translated === t.text).map(m => m.text).slice(0, 20));
      }
      return { translated: reinserted, success: true, fallbackTriggered: false };
    } else if (!strictVerification) {
      // Lenient mode: accept the result even if verification fails (for replaceString with no fallback)
      console.warn(`[surgicalTranslate] Verification failed but strictVerification=false, accepting result with ${translatedCount} translations applied`);
      return { translated: reinserted, success: true, fallbackTriggered: false };
    } else {
      console.warn('[surgicalTranslate] Verification FAILED (strict mode). Falling back to normal translation.');
      return { translated: text, success: false, fallbackTriggered: true };
    }
  } catch (err) {
    console.error('[surgicalTranslate] Fatal error:', err);
    return { translated: text, success: false, fallbackTriggered: true };
  }
}
