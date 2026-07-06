export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;
  model: string;
  customUrl?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

// ─── Multi-key support (giống tool Dịch) ───
// Nhập nhiều API key (mỗi dòng 1, hoặc cách nhau bằng dấu phẩy) → mỗi lần gọi luân phiên
// (round-robin) một key để rải đều rate limit / chạy nhanh hơn khi mod nhiều bước.
export const parseKeys = (raw: string): string[] =>
  (raw || '').split(/[\n,]+/).map((k) => k.trim()).filter(Boolean);
let _rr = 0;
const pickKey = (raw: string): string => {
  const keys = parseKeys(raw);
  return keys.length <= 1 ? raw.trim() : keys[(_rr++) % keys.length];
};

// ─── Chống TREO: timeout mỗi call + auto-retry ───
const REQUEST_TIMEOUT_MS = 180_000; // 3 phút/call — call treo sẽ bị abort thay vì kẹt vĩnh viễn
const MAX_RETRIES = 5; // api kẹt/timeout/5xx thì cứ thử lại (qua backoff + xoay key)
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** fetch có timeout (AbortController) — hết giờ thì abort để không treo. */
async function fetchWithTimeout(url: string, opts: RequestInit, ms = REQUEST_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Timeout: API không phản hồi sau ${Math.round(ms / 1000)}s (đã hủy để tránh treo).`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Lỗi có nên retry không: timeout/mạng/429/5xx/overload → có; 4xx khác (key sai…) → không. */
function isRetryable(err: unknown): boolean {
  const msg = String((err as Error)?.message || err);
  return /timeout|quá hạn|aborted|network|fetch failed|failed to fetch|ECONNRESET|ETIMEDOUT|socket|\b429\b|rate.?limit|quota|\b5\d\d\b|overload|quá tải|unavailable|Empty response|rỗng|bộ lọc/i.test(msg);
}

/**
 * LLM caller có TIMEOUT + AUTO-RETRY (backoff + xoay key mỗi lần) — chống kẹt khi 1 call
 * không phản hồi hoặc gặp lỗi tạm thời.
 */
export const callLLM = async (
  systemPrompt: string,
  userPrompt: string,
  config: LLMConfig
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error("API Key is required");
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Xoay sang key kế mỗi lần thử (nếu nhập nhiều key) → né 429/key hỏng.
    const key = pickKey(config.apiKey);
    const cfg: LLMConfig = key === config.apiKey ? config : { ...config, apiKey: key };
    try {
      let result: string;
      if (cfg.provider === 'openai') result = await callOpenAI(systemPrompt, userPrompt, cfg);
      else if (cfg.provider === 'anthropic') result = await callAnthropic(systemPrompt, userPrompt, cfg);
      else if (cfg.provider === 'gemini') result = await callGemini(systemPrompt, userPrompt, cfg);
      else throw new Error("Unsupported provider");

      if (!result || !result.trim()) throw new Error('Empty response from API');
      return result;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        const wait = 1000 * Math.pow(2, attempt); // 1s → 2s → 4s
        console.warn(`[callLLM] lỗi tạm thời (thử ${attempt + 1}/${MAX_RETRIES + 1}), chờ ${wait}ms rồi retry:`, (err as Error)?.message);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
};

const callOpenAI = async (system: string, user: string, config: LLMConfig) => {
  const baseUrl = config.customUrl ? config.customUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
  const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: config.maxOutputTokens || undefined,
      temperature: config.temperature !== undefined ? config.temperature : 0.2
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
};

const callAnthropic = async (system: string, user: string, config: LLMConfig) => {
  const baseUrl = config.customUrl ? config.customUrl.replace(/\/$/, '') : 'https://api.anthropic.com';
  const res = await fetchWithTimeout(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-opus-20240229',
      system: system,
      messages: [
        { role: 'user', content: user }
      ],
      max_tokens: config.maxOutputTokens || 4096,
      temperature: config.temperature !== undefined ? config.temperature : 0.2
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return data?.content?.[0]?.text ?? '';
};

const callGemini = async (system: string, user: string, config: LLMConfig) => {
  const model = config.model || 'gemini-1.5-pro-latest';
  const baseUrl = config.customUrl ? config.customUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com';
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
  
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }]
      },
      contents: [{
        role: "user",
        parts: [{ text: user }]
      }],
      generationConfig: {
        temperature: config.temperature !== undefined ? config.temperature : 0.2,
        maxOutputTokens: config.maxOutputTokens || undefined
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
};
