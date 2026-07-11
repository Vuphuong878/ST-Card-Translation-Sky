import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT_DIR = "d:/Documents/GitHub/ST-Card-Translation-Sky";

// LLM API calling wrapper
async function callLLM(
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  apiUrl?: string
): Promise<string> {
  let responseText = "";
  const cleanUrl = (apiUrl || "").replace(/\/+$/, "");

  if (provider === "openai" || provider === "custom") {
    const endpoint = cleanUrl ? `${cleanUrl}/chat/completions` : "https://api.openai.com/v1/chat/completions";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${provider === "custom" ? "Custom LLM" : "OpenAI"} Error: ${res.status} - ${err}`);
    }

    const data = await res.json();
    responseText = data.choices?.[0]?.message?.content || "";
  } else if (provider === "anthropic") {
    const endpoint = cleanUrl ? `${cleanUrl}/messages` : "https://api.anthropic.com/v1/messages";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
        max_tokens: 8192,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic Error: ${res.status} - ${err}`);
    }

    const data = await res.json();
    responseText = data.content?.[0]?.text || "";
  } else if (provider === "google") {
    const baseUrl = cleanUrl || "https://generativelanguage.googleapis.com/v1beta";
    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nNội dung cần dịch:\n${userContent}` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Gemini Error: ${res.status} - ${err}`);
    }

    const data = await res.json();
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  return responseText.trim();
}

// Flat paths parser for JSON walk
interface JsonLeaf {
  path: (string | number)[];
  value: string;
}

function walkJson(obj: any, currentPath: (string | number)[] = []): JsonLeaf[] {
  let leaves: JsonLeaf[] = [];
  if (obj === null || obj === undefined) return leaves;

  if (typeof obj === "string") {
    const trimmed = obj.trim();
    // Don't translate pure numeric values, color codes, or exact template parameters
    const isTranslatable =
      trimmed.length > 0 &&
      isNaN(Number(trimmed)) &&
      !trimmed.startsWith("#") &&
      !/^\$\{[a-zA-Z0-9_.-]+\}$/.test(trimmed);

    if (isTranslatable) {
      leaves.push({ path: currentPath, value: obj });
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      leaves = leaves.concat(walkJson(obj[i], [...currentPath, i]));
    }
  } else if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      leaves = leaves.concat(walkJson(obj[key], [...currentPath, key]));
    }
  }

  return leaves;
}

function setJsonLeafValue(obj: any, pathArray: (string | number)[], value: string) {
  let curr = obj;
  for (let i = 0; i < pathArray.length - 1; i++) {
    curr = curr[pathArray[i]];
  }
  curr[pathArray[pathArray.length - 1]] = value;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileName,
      content,
      fileType,
      sourceLang,
      targetLang,
      variables = [],
      customPrompt = "",
      apiKey,
      provider,
      model,
      apiUrl,
      saveToWorkspace = true,
      workspaceSessionName = "",
      chunkSize = 20,
    } = body;

    if (!content) {
      return NextResponse.json({ error: "Missing file content" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    // Build system variables preservation instructions
    const preservationRule =
      variables.length > 0
        ? `\n\nQUY TẮC CỰC KỲ QUAN TRỌNG: Các biến số, nhãn thẻ hoặc placeholder sau tồn tại trong văn bản. Bạn PHẢI GIỮ NGUYÊN BẢN CHÚNG CHÍNH XÁC (không dịch, không sửa chữ hoa/thường, không đổi vị trí ký tự hay thêm bớt dấu cách):\n${variables
            .map((v: string) => `- ${v}`)
            .join("\n")}`
        : "";

    const systemPrompt = `Bạn là một biên dịch viên chuyên nghiệp dịch từ ${sourceLang} sang ${targetLang}.

QUY TẮC BẮT BUỘC:
1. KHÔNG ĐƯỢC dịch các biến số, nhãn code, thẻ hệ thống, hoặc các cụm từ tiếng Anh chuyên ngành đóng vai trò làm placeholder (ví dụ: 'timing', 'type', 'value0', 'value1', v.v.).
2. Tuyệt đối giữ nguyên cấu trúc và nội dung của các placeholder nằm trong dấu ngoặc nhọn hoặc dấu ngoặc kép (ví dụ: {timing}, {{type}}, \${value0}).
3. Nếu toàn bộ chuỗi gốc chỉ gồm các thẻ, biến hoặc ký tự Latin/số (không chứa tiếng Trung), hãy giữ nguyên chuỗi đó mà không dịch.

Phong cách và hướng dẫn dịch bổ sung:
${customPrompt || "Dịch tự nhiên, lưu loát, phù hợp với ngữ cảnh ngữ pháp."}
${preservationRule}

YÊU CẦU: Không viết lời giải thích, không bọc markdown codeblock trừ phi văn bản gốc là markdown. Chỉ trả về phần kết quả dịch.`;

    // ─────────────────────────────────────────────────────────────────────────
    // CASE A: Flat String Array — Mortal UI Dictionary batch
    // Client controls batch size (how many lines per request) and concurrency
    // (how many requests run in parallel). Backend ALWAYS makes exactly ONE
    // LLM call per request with the full array. Fallback to per-item only
    // when LLM returns wrong number of items.
    // ─────────────────────────────────────────────────────────────────────────
    if (fileType === "string-array") {
      let inputArray: string[];
      try {
        inputArray = JSON.parse(content);
        if (!Array.isArray(inputArray)) throw new Error("Not an array");
      } catch (e: any) {
        return NextResponse.json({ error: `Invalid string-array format: ${e.message}` }, { status: 400 });
      }

      if (inputArray.length === 0) {
        return NextResponse.json({ success: true, translated: "[]", savedPath: "" });
      }

      const resultArray: string[] = new Array(inputArray.length).fill("");

      const batchPrompt = `${systemPrompt}

Dưới đây là mảng JSON gồm ${inputArray.length} mục cần dịch từ ${sourceLang} sang ${targetLang}.
Hãy trả về ĐÚNG MỘT mảng JSON với ĐÚNG ${inputArray.length} chuỗi đã dịch theo thứ tự tương ứng.
KHÔNG thêm bất kỳ giải thích nào — chỉ trả về mảng JSON.`;

      try {
        const responseText = await callLLM(provider, model, apiKey, batchPrompt, JSON.stringify(inputArray), apiUrl);
        const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const translated = JSON.parse(cleanText);

        if (Array.isArray(translated) && translated.length === inputArray.length) {
          // Perfect — use all returned translations
          for (let j = 0; j < inputArray.length; j++) {
            resultArray[j] = String(translated[j] ?? inputArray[j]);
          }
        } else {
          // Count mismatch — fallback to per-item individually
          for (let j = 0; j < inputArray.length; j++) {
            try {
              const singleRes = await callLLM(provider, model, apiKey, systemPrompt, inputArray[j], apiUrl);
              resultArray[j] = singleRes.trim() || inputArray[j];
            } catch {
              resultArray[j] = inputArray[j]; // keep original on failure
            }
          }
        }
      } catch {
        // Total failure — fallback to per-item individually
        for (let j = 0; j < inputArray.length; j++) {
          try {
            const singleRes = await callLLM(provider, model, apiKey, systemPrompt, inputArray[j], apiUrl);
            resultArray[j] = singleRes.trim() || inputArray[j];
          } catch {
            resultArray[j] = inputArray[j];
          }
        }
      }

      return NextResponse.json({
        success: true,
        translated: JSON.stringify(resultArray),
        savedPath: "",
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CASE B: JSON File — used by "Dịch Tệp Biến" tab
    // ─────────────────────────────────────────────────────────────────────────
    let translatedContent = "";

    if (fileType === "json") {
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(content);
      } catch (e: any) {
        return NextResponse.json({ error: `Invalid JSON format: ${e.message}` }, { status: 400 });
      }

      const leaves = walkJson(parsedJson);

      if (leaves.length === 0) {
        translatedContent = content; // Nothing to translate
      } else {
        // Chunk translatable leaves (e.g. 20 leaves per prompt call)
        const currentChunkSize = Number(chunkSize) || 20;
        for (let i = 0; i < leaves.length; i += currentChunkSize) {
          const chunk = leaves.slice(i, i + currentChunkSize);
          const valuesToTranslate = chunk.map((c) => c.value);

          const jsonPrompt = `${systemPrompt}\n\nYêu cầu: Hãy dịch mảng JSON chứa các chuỗi sau và trả về kết quả dưới dạng mảng các chuỗi dịch chính xác theo thứ tự, giữ nguyên cấu trúc JSON (định dạng mảng string). KHÔNG viết thêm bất kỳ từ giải thích nào ngoài mảng JSON này.`;

          const responseText = await callLLM(
            provider,
            model,
            apiKey,
            jsonPrompt,
            JSON.stringify(valuesToTranslate),
            apiUrl
          );

          // Try parsing response array
          try {
            // strip code block delimiters if LLM added them
            const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            const translatedArray = JSON.parse(cleanText);

            if (Array.isArray(translatedArray) && translatedArray.length === chunk.length) {
              for (let j = 0; j < chunk.length; j++) {
                setJsonLeafValue(parsedJson, chunk[j].path, translatedArray[j]);
              }
            } else {
              // Fallback: translate individually if array mismatch
              for (let j = 0; j < chunk.length; j++) {
                const singleRes = await callLLM(provider, model, apiKey, systemPrompt, chunk[j].value, apiUrl);
                setJsonLeafValue(parsedJson, chunk[j].path, singleRes);
              }
            }
          } catch (e) {
            // Fallback: translate individually
            for (let j = 0; j < chunk.length; j++) {
              try {
                const singleRes = await callLLM(provider, model, apiKey, systemPrompt, chunk[j].value, apiUrl);
                setJsonLeafValue(parsedJson, chunk[j].path, singleRes);
              } catch (err: any) {
                // Keep original value if translation failed
              }
            }
          }
        }
        translatedContent = JSON.stringify(parsedJson, null, 2);
      }
    } else {
      // ─── CASE C: Text / Markdown / HTML ───
      // Split content by paragraphs
      const paragraphs = content.split("\n\n");
      const chunks: string[] = [];
      let currentChunk = "";

      for (const p of paragraphs) {
        if ((currentChunk + "\n\n" + p).length > 2500) {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = p;
        } else {
          currentChunk = currentChunk ? currentChunk + "\n\n" + p : p;
        }
      }
      if (currentChunk) chunks.push(currentChunk);

      const translatedChunks: string[] = [];
      for (const chunk of chunks) {
        const transRes = await callLLM(provider, model, apiKey, systemPrompt, chunk, apiUrl);
        translatedChunks.push(transRes);
      }

      translatedContent = translatedChunks.join("\n\n");
    }

    // Save translation output locally if requested
    let savedPath = "";
    if (saveToWorkspace && workspaceSessionName) {
      const targetFolder = path.join(ROOT_DIR, "workspace", workspaceSessionName);
      savedPath = path.join(targetFolder, fileName);

      fs.mkdirSync(targetFolder, { recursive: true });
      fs.writeFileSync(savedPath, translatedContent, "utf8");
    }

    return NextResponse.json({
      success: true,
      translated: translatedContent,
      savedPath: savedPath ? path.relative(ROOT_DIR, savedPath).replace(/\\/g, "/") : "",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
