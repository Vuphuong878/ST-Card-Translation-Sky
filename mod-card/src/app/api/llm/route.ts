import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { systemPrompt, userPrompt, config } = body;

    if (!config || !config.apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const result = await callLLM(systemPrompt, userPrompt, config);
    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error('LLM API Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
