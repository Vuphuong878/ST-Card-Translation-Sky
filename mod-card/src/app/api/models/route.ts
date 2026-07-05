import { NextRequest, NextResponse } from 'next/server';
import { parseKeys } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, customUrl } = body;
    // Multi-key: quét model chỉ dùng key ĐẦU TIÊN (không gửi cả chuỗi nhiều key).
    const apiKey = parseKeys(body.apiKey)[0] || (body.apiKey || '');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (provider === 'openai') {
      const baseUrl = customUrl ? customUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
      const res = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Proxy returned error: ${err}` }, { status: res.status });
      }

      const data = await res.json();
      // Parse OpenAI models format
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      return NextResponse.json({ models });
    } else if (provider === 'gemini') {
      const baseUrl = customUrl ? customUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com';
      const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`, {
        method: 'GET'
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Gemini returned error: ${err}` }, { status: res.status });
      }

      const data = await res.json();
      const models = data.models?.map((m: { name: string }) => m.name.replace('models/', '')) || [];
      return NextResponse.json({ models });
    } else {
      // Anthropic does not have a simple models list endpoint in public API without CORS
      // Just return standard static ones
      return NextResponse.json({ 
        models: [
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ] 
      });
    }

  } catch (error: unknown) {
    console.error('Scan models error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
