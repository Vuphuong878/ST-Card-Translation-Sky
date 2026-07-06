'use client';

import { useMemo, useState } from 'react';
import { CardV3 } from '@/types/card';
import { LLMConfig } from '@/lib/llm';
import { ModOrchestrator, extractSections, applyModification } from '@/lib/orchestrator';

/**
 * Đào sâu 1 PHẦN NHỎ trong 1 section (vd mở rộng chi tiết block <Appearance> trong Mô tả).
 * Tự chứa: chọn section → nêu phần cần đào sâu + yêu cầu → xem trước → áp vào thẻ.
 */
export default function SubExpandPanel({ card, llmConfig, onApplied }: {
  card: CardV3;
  llmConfig: LLMConfig;
  onApplied: (newCard: CardV3) => void;
}) {
  const sections = useMemo(() => extractSections(card).filter(s => !s.is_code), [card]);
  const [sectionId, setSectionId] = useState(sections[0]?.section_id || '');
  const [subMarker, setSubMarker] = useState('');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const section = sections.find(s => s.section_id === sectionId);

  const expand = async () => {
    if (!llmConfig.apiKey) { setError('Chưa cấu hình API Key ở tab Cài đặt.'); return; }
    if (!section) { setError('Chọn 1 section.'); return; }
    if (!subMarker.trim()) { setError('Nêu phần cần đào sâu (vd: <Appearance> hoặc "Ngoại hình").'); return; }
    setLoading(true); setError(''); setResult('');
    try {
      const out = await new ModOrchestrator(llmConfig).expandSubSection(card, section.content, subMarker.trim(), instruction.trim());
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  const apply = () => {
    if (!section || !result) return;
    onApplied(applyModification(card, section.field_path, result));
    setResult('');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-amber-300">
      <h2 className="text-lg font-extrabold text-gray-950 mb-1">🔬 Đào sâu 1 phần</h2>
      <p className="text-xs text-gray-700 font-semibold mb-2">
        Mở rộng chi tiết đúng MỘT phần trong 1 section (vd block ngoại hình), giữ nguyên phần còn lại.
      </p>

      <label className="block text-xs font-bold text-gray-800 mb-1">Chọn section</label>
      <select value={sectionId} onChange={e => { setSectionId(e.target.value); setResult(''); }}
        className="w-full text-sm border-2 border-gray-300 rounded p-1.5 bg-gray-50 text-gray-950 font-medium mb-2">
        {sections.map(s => <option key={s.section_id} value={s.section_id}>{s.label}</option>)}
      </select>

      <input value={subMarker} onChange={e => setSubMarker(e.target.value)}
        placeholder='Phần cần đào sâu — vd: <Appearance>  hoặc  "Ngoại hình"'
        className="w-full text-sm border-2 border-gray-300 rounded p-1.5 bg-gray-50 text-gray-950 mb-2" />

      <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={2}
        placeholder="Yêu cầu thêm (tuỳ chọn) — vd: tả kỹ trang phục, sẹo, khí chất…"
        className="w-full text-sm border-2 border-gray-300 rounded p-1.5 bg-gray-50 text-gray-950 mb-2" />

      <div className="flex items-center gap-2">
        <button onClick={expand} disabled={loading}
          className="px-3 py-1.5 rounded-md text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50">
          {loading ? 'Đang đào sâu…' : '🔬 Đào sâu'}
        </button>
        {result && (
          <button onClick={apply} className="px-3 py-1.5 rounded-md text-sm font-bold text-white bg-green-600 hover:bg-green-700">
            ✅ Áp dụng
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600 font-semibold mt-2">{error}</p>}

      {result && (
        <div className="mt-2">
          <div className="text-xs font-bold text-gray-700 mb-1">Xem trước (có thể sửa trước khi áp):</div>
          <textarea value={result} onChange={e => setResult(e.target.value)} rows={8}
            className="w-full text-xs border border-gray-300 rounded p-2 bg-gray-50 text-gray-900 font-mono" />
        </div>
      )}
    </div>
  );
}
