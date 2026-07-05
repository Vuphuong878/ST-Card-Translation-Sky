import { ChatMessage, APISettings } from '../types';

// ─── Multi-key support (giống tool Dịch) ──────────────────────────────────────
// Nhập nhiều API key (mỗi dòng 1, hoặc cách nhau bằng dấu phẩy) → mỗi lần gọi luân
// phiên (round-robin) một key để rải đều rate limit giữa các key.
export function parseKeys(raw: string): string[] {
  return (raw || '').split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
}
let _rr = 0;
function pickKey(raw: string): string {
  const keys = parseKeys(raw);
  if (keys.length <= 1) return raw.trim();
  return keys[(_rr++) % keys.length];
}

/**
 * Unified System Prompt — context-aware, supports both preset and regex work
 * 
 * The projectContext parameter contains the full project state snapshot
 * injected by contextBuilder.ts (prompts, regexes, params, recent actions).
 */
const buildSystemPrompt = (projectContext: string, referencedContext: string, customAddition: string) => `
Bạn là ST Studio, trợ lý AI chuyên nghiệp cho SillyTavern. Bạn giúp người dùng xây dựng, chỉnh sửa, và tối ưu Presets (gồm Prompt Blocks + thông số), Regex Scripts, và tất cả các thành phần trong một dự án SillyTavern.

═══════════════════════════════════
QUY TẮC QUAN TRỌNG NHẤT:
═══════════════════════════════════

1. KHÔNG MẶC ĐỊNH TẠO MỚI. Khi người dùng hỏi hoặc yêu cầu, hãy phân tích xem họ muốn:
   - TẠO MỚI (prompt/regex/preset mới) — chỉ khi nói rõ ràng "tạo", "thêm", "viết mới"
   - CHỈNH SỬA (sửa prompt/regex/thông số đang có) — khi nói "sửa", "chỉnh", "cập nhật", "thay đổi", "cải thiện"
   - TƯ VẤN / GIẢI THÍCH — khi hỏi "tại sao", "nên dùng gì", "giải thích"
   - TẠO REGEX CHO PROMPT CỤ THỂ — khi nói "tạo regex cho prompt X", hãy tham chiếu nội dung prompt đó

2. LUÔN THAM CHIẾU TRẠNG THÁI DỰ ÁN. Dưới đây là toàn bộ dữ liệu dự án hiện tại. Hãy dùng nó để:
   - Biết prompt nào đã có để không tạo trùng
   - Biết regex nào đã có để gợi ý bổ sung thay vì viết lại
   - Biết nội dung chi tiết prompt để tạo regex match chính xác
   - Biết thông số hiện tại để tư vấn chỉnh sửa phù hợp

3. KHI NGƯỜI DÙNG NHẮC "vừa tạo", "mới thêm", "ở trên", hãy xem mục [HÀNH ĐỘNG GẦN NHẤT] để biết họ đang nói đến item nào.

4. KHI TẠO REGEX CHO MỘT PROMPT, bạn PHẢI đọc nội dung đầy đủ của prompt đó (trong mục PROJECT CONTEXT hoặc ITEMS REFERENCED) để tạo regex phù hợp với cấu trúc output mà prompt đó sẽ tạo ra.

═══════════════════════════════════
DỮ LIỆU DỰ ÁN HIỆN TẠI:
═══════════════════════════════════

${projectContext}

${referencedContext ? `═══════════════════════════════════
ITEMS NGƯỜI DÙNG ĐANG NHẮC TỚI:
═══════════════════════════════════

${referencedContext}
` : ''}

═══════════════════════════════════
KIẾN THỨC CHUYÊN MÔN:
═══════════════════════════════════

【PROMPT BLOCK SCHEMA】
{
  "identifier": "chuỗi-định-danh-duy-nhất",
  "name": "Tên hiển thị",
  "system_prompt": true,
  "role": "system" | "user" | "assistant",
  "content": "Nội dung chỉ thị chi tiết...",
  "enabled": true,
  "injection_position": 0,
  "injection_depth": 4,
  "injection_order": 100,
  "forbid_overrides": false
}

【PRESET SCHEMA ĐẦY ĐỦ】
{
  "temperature": number (0-2),
  "frequency_penalty": number, "presence_penalty": number,
  "top_p": number, "top_k": number, "top_a": number, "min_p": number,
  "repetition_penalty": number,
  "openai_max_context": number, "openai_max_tokens": number,
  "wrap_in_quotes": false, "names_behavior": 0,
  "send_if_empty": "", "impersonation_prompt": "string",
  "new_chat_prompt": "", "new_group_chat_prompt": "",
  "new_example_chat_prompt": "", "continue_nudge_prompt": "string",
  "bias_preset_selected": "Default (none)",
  "max_context_unlocked": true,
  "wi_format": "{0}", "scenario_format": "{{scenario}}",
  "personality_format": "{{personality}}",
  "group_nudge_prompt": "", "stream_openai": true,
  "prompts": [ ...PromptBlock[] ]
}

【REGEX SCRIPT SCHEMA】
{
  "id": "uuid",
  "scriptName": "Tên script",
  "findRegex": "/pattern/flags",
  "replaceString": "Thay thế (có thể là HTML/CSS)",
  "trimStrings": [],
  "placement": [2],      // 1=user input, 2=AI output
  "disabled": false,
  "markdownOnly": true,   // true nếu replaceString chứa HTML render
  "promptOnly": false,    // true nếu chỉ filter trước khi gửi API
  "runOnEdit": true,
  "substituteRegex": 0,
  "minDepth": null, "maxDepth": null
}

═══════════════════════════════════
HƯỚNG DẪN OUTPUT:
═══════════════════════════════════

- Khi tạo/sửa prompt hoặc regex, PHẢI xuất JSON trong code block \`\`\`json\`\`\`.
- Nếu chỉ tạo 1 prompt block → xuất object đơn lẻ.
- Nếu tạo nhiều prompt blocks → xuất mảng.
- Nếu tạo regex → xuất object regex theo schema.
- Nếu tạo cả preset đầy đủ → xuất object preset với prompts array.
- Sau JSON, giải thích ngắn gọn bằng tiếng Việt.
- Khi tư vấn/chỉnh sửa thông số, nêu rõ giá trị hiện tại và đề xuất thay đổi.
- Khi thiết kế Regex widget HTML, viết inline CSS responsive, hỗ trợ dark theme, màu sắc cao cấp.

${customAddition}
`;

export async function callAI(
  userMessage: string,
  history: ChatMessage[],
  settings: APISettings,
  projectContext: string,
  referencedContext: string
): Promise<string> {
  const isDirect = !settings.useProxy;
  const systemPrompt = buildSystemPrompt(projectContext, referencedContext, settings.systemPromptAddition);

  // 1. DIRECT GEMINI API CALL
  if (isDirect) {
    if (!settings.apiKey) {
      throw new Error("Chưa nhập API key. Vào ⚙ Cài đặt.");
    }

    const modelName = settings.selectedModel || 'gemini-2.5-pro';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${pickKey(settings.apiKey)}`;

    // Map history to Gemini format (roles must be alternate user/model)
    const contents: { role: string; parts: { text: string }[] }[] = [];
    
    if (settings.keepContext && history.length > 0) {
      history.forEach(msg => {
        if (msg.role === 'system') return; // Gemini system instructions are separate
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: settings.temperature,
          maxOutputTokens: settings.maxTokens,
        }
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("API key không hợp lệ.");
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Lỗi API (${response.status})`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      throw new Error("AI không trả về nội dung.");
    }
    return replyText;
  } 
  
  // 2. PROXY CALL (OpenAI-compatible / Custom)
  else {
    if (!settings.proxyUrl) {
      throw new Error("Chưa nhập URL Proxy. Vào ⚙ Cài đặt.");
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.proxyKey) {
      headers['Authorization'] = `Bearer ${pickKey(settings.proxyKey)}`;
    }

    const messages = [];
    messages.push({ role: 'system', content: systemPrompt });

    if (settings.keepContext) {
      history.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    messages.push({ role: 'user', content: userMessage });

    // Handle standard OpenAI endpoint conversion
    let endpoint = settings.proxyUrl;
    if (!endpoint.endsWith('/chat/completions') && !endpoint.includes('/generateContent')) {
      // If it's a base URL, append completions path
      endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: settings.selectedModel,
        messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Proxy key không hợp lệ.");
      }
      throw new Error(`Proxy không phản hồi. Lỗi code: ${response.status}`);
    }

    const data = await response.json();
    // Support either OpenAI structure or standard response
    const replyText = data.choices?.[0]?.message?.content || data.content?.[0]?.text || data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      throw new Error("AI qua Proxy không xuất ra văn bản.");
    }
    return replyText;
  }
}

/**
 * Fetch available models from custom Proxy URL
 */
export async function scanProxyModels(proxyUrl: string, proxyKey: string): Promise<string[]> {
  if (!proxyUrl) {
    throw new Error("URL Proxy trống.");
  }

  let endpoint = proxyUrl.replace(/\/$/, '');
  if (!endpoint.endsWith('/models')) {
    endpoint = endpoint + '/models';
  }

  const headers: Record<string, string> = {};
  if (proxyKey) {
    headers['Authorization'] = `Bearer ${proxyKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error("Không thể quét danh sách model từ Proxy.");
  }

  const data = await response.json();
  if (Array.isArray(data.data)) {
    return data.data.map((m: { id?: string }) => m.id).filter(Boolean) as string[];
  }
  throw new Error("Định dạng dữ liệu model trả về không được hỗ trợ.");
}
