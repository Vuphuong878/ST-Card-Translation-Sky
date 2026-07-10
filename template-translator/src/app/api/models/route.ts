import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey, apiUrl } = body;

    if (!provider) {
      return NextResponse.json({ error: "Missing provider" }, { status: 400 });
    }

    // Default static fallback lists in case API call fails or is not supported
    const FALLBACK_MODELS: Record<string, string[]> = {
      openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
      anthropic: [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
      ],
      google: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-exp"],
    };

    if (!apiKey) {
      // Return fallbacks if no API Key provided
      return NextResponse.json({
        models: FALLBACK_MODELS[provider] || ["gpt-4o"],
        isFallback: true,
      });
    }

    const cleanUrl = (apiUrl || "").replace(/\/+$/, "");
    let fetchUrl = `${cleanUrl}/models`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (provider === "google") {
      fetchUrl = `${cleanUrl}/models?key=${apiKey}`;
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;
      if (provider === "anthropic") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      }
    }

    try {
      const res = await fetch(fetchUrl, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
      }

      const data = await res.json();
      console.log(`[Models API Response from ${provider}]:`, JSON.stringify(data));

      // Deep recursive search for any list containing model ids or names
      function findModelsInJson(obj: any): string[] {
        if (!obj || typeof obj !== "object") return [];
        
        if (Array.isArray(obj)) {
          const list: string[] = [];
          for (const item of obj) {
            if (typeof item === "string") {
              list.push(item);
            } else if (item && typeof item === "object") {
              const val = item.id || item.name;
              if (typeof val === "string") {
                list.push(val);
              }
            }
          }
          if (list.length > 0) return list;
        }
        
        for (const key of Object.keys(obj)) {
          const found = findModelsInJson(obj[key]);
          if (found.length > 0) {
            return found;
          }
        }
        return [];
      }

      let models = findModelsInJson(data);
      // Strip "models/" prefix if Google style
      models = models
        .map((m) => (m.startsWith("models/") ? m.substring(7) : m))
        .filter(Boolean);

      if (models.length > 0) {
        return NextResponse.json({ models, isFallback: false });
      }
      
      throw new Error("Không thể tìm thấy danh sách model trong phản hồi API.");
    } catch (err: any) {
      return NextResponse.json({
        error: err.message,
        models: FALLBACK_MODELS[provider] || ["gpt-4o"],
        isFallback: true,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
