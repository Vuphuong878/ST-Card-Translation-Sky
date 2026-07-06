'use client';

import { LLMConfig } from '@/lib/llm';

const PROVIDERS: { value: LLMConfig['provider']; label: string }[] = [
  { value: 'gemini', label: 'Google (Gemini)' },
  { value: 'openai', label: 'OpenAI Compatible' },
  { value: 'anthropic', label: 'Anthropic' },
];

/**
 * Cấu hình các provider PHỤ chạy SONG SONG với provider chính. Engine rải call round-robin →
 * nhiều provider cùng lúc cho các bước mod. Mỗi provider có key/model riêng.
 */
export default function ExtraProvidersPanel({ providers, onChange }: {
  providers: LLMConfig[];
  onChange: (next: LLMConfig[]) => void;
}) {
  const update = (i: number, patch: Partial<LLMConfig>) => onChange(providers.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  const remove = (i: number) => onChange(providers.filter((_, idx) => idx !== i));
  const add = () => onChange([...providers, { provider: 'gemini', apiKey: '', model: '', customUrl: '' }]);

  return (
    <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/40">
      <h3 className="text-sm font-extrabold text-gray-950 mb-1">🔀 Provider bổ sung (chạy song song)</h3>
      <p className="text-[11px] text-gray-700 mb-2 leading-snug">
        Thêm provider phụ → engine rải call round-robin với provider chính, chạy nhiều provider cùng lúc. Dùng model tốt tương đương để giữ chất lượng.
      </p>

      <div className="flex flex-col gap-2">
        {providers.map((p, i) => (
          <div key={i} className="border border-gray-300 rounded-md p-2 bg-white flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-800">Provider #{i + 2}</span>
              <button onClick={() => remove(i)} className="ml-auto text-xs text-red-600 hover:underline font-bold">Xoá</button>
            </div>
            {/* 2 field / hàng */}
            <div className="grid grid-cols-2 gap-2">
              <select value={p.provider} onChange={e => update(i, { provider: e.target.value as LLMConfig['provider'] })}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-950 font-medium">
                {PROVIDERS.map(pr => <option key={pr.value} value={pr.value}>{pr.label}</option>)}
              </select>
              <input value={p.customUrl || ''} onChange={e => update(i, { customUrl: e.target.value })} placeholder="Base URL (nếu proxy)"
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-950" />
            </div>
            <input value={p.apiKey} onChange={e => update(i, { apiKey: e.target.value })} placeholder="API Key" type="password"
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-950" />
            <input value={p.model} onChange={e => update(i, { model: e.target.value })} placeholder="Model (vd gemini-2.5-flash)"
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-950" />
          </div>
        ))}
      </div>

      <button onClick={add} className="mt-2 w-full text-xs font-bold text-indigo-700 border border-dashed border-indigo-400 rounded-md py-1.5 hover:bg-indigo-100">
        + Thêm provider
      </button>
    </div>
  );
}
