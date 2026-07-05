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

/**
 * Basic abstract LLM caller.
 * Needs to be implemented with actual SDKs or fetch calls.
 */
export const callLLM = async (
  systemPrompt: string,
  userPrompt: string,
  config: LLMConfig
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error("API Key is required");
  }

  // Round-robin sang key kế nếu nhập nhiều key.
  const key = pickKey(config.apiKey);
  const cfg: LLMConfig = key === config.apiKey ? config : { ...config, apiKey: key };

  console.log(`Calling ${cfg.provider} with model ${cfg.model}...`);

  if (cfg.provider === 'openai') {
    return await callOpenAI(systemPrompt, userPrompt, cfg);
  } else if (cfg.provider === 'anthropic') {
    return await callAnthropic(systemPrompt, userPrompt, cfg);
  } else if (cfg.provider === 'gemini') {
    return await callGemini(systemPrompt, userPrompt, cfg);
  }

  throw new Error("Unsupported provider");
};

const callOpenAI = async (system: string, user: string, config: LLMConfig) => {
  const baseUrl = config.customUrl ? config.customUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
  const res = await fetch(`${baseUrl}/chat/completions`, {
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
    throw new Error(`OpenAI API error: ${err}`);
  }
  
  const data = await res.json();
  return data.choices[0].message.content;
};

const callAnthropic = async (system: string, user: string, config: LLMConfig) => {
  const baseUrl = config.customUrl ? config.customUrl.replace(/\/$/, '') : 'https://api.anthropic.com';
  const res = await fetch(`${baseUrl}/v1/messages`, {
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
    throw new Error(`Anthropic API error: ${err}`);
  }

  const data = await res.json();
  return data.content[0].text;
};

const callGemini = async (system: string, user: string, config: LLMConfig) => {
  const model = config.model || 'gemini-1.5-pro-latest';
  const baseUrl = config.customUrl ? config.customUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com';
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
  
  const res = await fetch(url, {
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
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
};
