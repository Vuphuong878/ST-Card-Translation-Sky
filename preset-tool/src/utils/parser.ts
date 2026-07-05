/**
 * Utility to extract, parse, and identify JSON structures from AI Markdown responses
 */

export interface ExtractedJSON {
  type: 'preset' | 'prompt' | 'prompts' | 'regex' | 'unknown';
  data: unknown;
  name: string;
}

export function extractJSONsFromText(text: string): ExtractedJSON[] {
  const results: ExtractedJSON[] = [];
  if (!text) return results;

  // 1. Try to find JSON blocks using markdown code fences
  //    Use a greedy approach: find ```json then capture until the next ``` that is NOT inside the JSON
  const markdownRegex = /```json\s*([\s\S]*?)```/g;
  let match;
  let index = 1;

  while ((match = markdownRegex.exec(text)) !== null) {
    const jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr);
      results.push(classifyAndBuildJSON(parsed, index++));
    } catch {
      // If the simple match failed, try to find balanced JSON within the captured block
      const balanced = extractBalancedJSON(jsonStr);
      for (const bJson of balanced) {
        try {
          const parsed = JSON.parse(bJson);
          results.push(classifyAndBuildJSON(parsed, index++));
        } catch {
          // skip
        }
      }
    }
  }

  // 2. Fallback: If no code fences found, use bracket-counting to find top-level JSON objects/arrays
  if (results.length === 0 && (text.includes('{') || text.includes('['))) {
    const balanced = extractBalancedJSON(text);
    let fallbackIndex = 1;
    for (const bJson of balanced) {
      if (bJson.length < 20) continue;
      try {
        const parsed = JSON.parse(bJson);
        results.push(classifyAndBuildJSON(parsed, fallbackIndex++));
        if (results.length >= 3) break;
      } catch {
        // skip
      }
    }
  }

  return results;
}

/**
 * Extract balanced JSON objects/arrays from text using bracket counting.
 * Properly handles nested {} and [] inside JSON string values (e.g., CSS inside replaceString).
 */
function extractBalancedJSON(text: string): string[] {
  const results: string[] = [];
  let i = 0;

  while (i < text.length) {
    // Find the start of a JSON object or array
    if (text[i] === '{' || text[i] === '[') {
      let depth = 1;
      let j = i + 1;
      let inString = false;
      let escape = false;

      while (j < text.length && depth > 0) {
        const ch = text[j];

        if (escape) {
          escape = false;
          j++;
          continue;
        }

        if (ch === '\\' && inString) {
          escape = true;
          j++;
          continue;
        }

        if (ch === '"' && !escape) {
          inString = !inString;
        } else if (!inString) {
          if (ch === '{' || ch === '[') depth++;
          else if (ch === '}' || ch === ']') depth--;
        }

        j++;
      }

      if (depth === 0) {
        const candidate = text.substring(i, j);
        // Only consider substantial candidates that look like JSON
        if (candidate.length >= 20 && (candidate.includes('"') || candidate.includes(':'))) {
          results.push(candidate);
        }
      }

      i = j;
    } else {
      i++;
    }
  }

  return results;
}

function classifyAndBuildJSON(data: unknown, index: number): ExtractedJSON {
  if (!data || typeof data !== 'object') {
    return { type: 'unknown', data, name: `JSON Mẫu #${index}` };
  }

  const obj = data as Record<string, unknown>;

  // 1. Check if it is a SillyTavern Preset
  if (
    ('prompts' in obj && Array.isArray(obj.prompts)) ||
    ('temperature' in obj && 'impersonation_prompt' in obj)
  ) {
    return {
      type: 'preset',
      data: obj,
      name: typeof obj['SPreset'] === 'string' ? obj['SPreset'] : `Preset ST Tối ưu #${index}`
    };
  }

  // 2. Check if it is a SillyTavern Regex Script
  if ('findRegex' in obj && 'replaceString' in obj) {
    return {
      type: 'regex',
      data: obj,
      name: typeof obj['scriptName'] === 'string' ? obj['scriptName'] : `Regex Script #${index}`
    };
  }

  // 3. Check if it is a Prompt Block or array of Prompt Blocks
  if (Array.isArray(obj)) {
    const looksLikePrompts = (obj as unknown[]).every(item => 
      item && typeof item === 'object' && ('role' in item || 'system_prompt' in item || 'injection_depth' in item)
    );
    if (looksLikePrompts) {
      return {
        type: 'prompts',
        data: obj,
        name: `Danh sách ${obj.length} Prompt Blocks`
      };
    }
  } else {
    if ('role' in obj || 'system_prompt' in obj || 'injection_depth' in obj || 'injection_order' in obj) {
      return {
        type: 'prompt',
        data: obj,
        name: typeof obj['name'] === 'string' ? obj['name'] : `Prompt Block #${index}`
      };
    }
  }

  return {
    type: 'unknown',
    data: obj,
    name: `Dữ liệu JSON #${index}`
  };
}

/**
 * Perform manual highlighting for JSON structure (simple custom colorizer)
 * Key = cyan, String = amber, Number = green, Boolean = purple
 */
export function highlightJSON(json: object | string): string {
  let jsonString = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
  
  // Escape HTML entities to prevent rendering issues
  jsonString = jsonString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Regex rules for JSON highlighting
  const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

  return jsonString.replace(regex, (match) => {
    let cls = 'text-green-400'; // Default: Numbers
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-cyan-400'; // Keys
      } else {
        cls = 'text-amber-300'; // Strings
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-purple-400'; // Booleans
    } else if (/null/.test(match)) {
      cls = 'text-gray-400 font-semibold'; // Nulls
    }
    return `<span class="${cls}">${match}</span>`;
  });
}
