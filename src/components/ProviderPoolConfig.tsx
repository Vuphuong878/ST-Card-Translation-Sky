import { useStore } from '../store';
import { fetchModelsFromProxy } from '../utils/apiClient';
import type { AIProvider, ProviderConfig, ProxySettings } from '../types/card';
import { Plus, Trash2, Server, ChevronDown, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { useState } from 'react';

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI Compatible' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'custom', label: 'Custom / Local' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 9px', fontSize: '0.78rem', background: 'var(--bg-elevated)',
  border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
};
const lbl: React.CSSProperties = { fontSize: '0.64rem', color: 'var(--text-muted)', marginBottom: 2, display: 'block', fontWeight: 600 };
const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };

/**
 * Cấu hình các PROVIDER PHỤ (ngoài provider chính #1). Engine gộp tất cả provider đang bật → rải
 * call round-robin chạy song song. Layout 2 cột cho gọn; mỗi provider có nút "Load model" riêng.
 */
export default function ProviderPoolConfig() {
  const { providers, addProvider, updateProvider, removeProvider } = useStore();
  const [open, setOpen] = useState(true);

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'left' }}>
        <Server size={14} style={{ color: 'var(--accent-secondary)' }} />
        Provider bổ sung (chạy song song)
        <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
          {providers.length > 0 ? `${providers.filter((p) => p.enabled).length}/${providers.length} bật` : 'gộp nhiều provider để dịch nhanh hơn'}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
      </button>

      {open && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {providers.map((p, i) => (
            <ProviderCard key={p.id} p={p} index={i + 2} onChange={(patch) => updateProvider(p.id, patch)} onRemove={() => removeProvider(p.id)} />
          ))}

          <button onClick={addProvider}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', background: 'transparent', color: 'var(--accent-secondary)', border: '1px dashed var(--accent-secondary)', borderRadius: 'var(--radius-sm)', justifyContent: 'center' }}>
            <Plus size={14} /> Thêm provider
          </button>
          {providers.length === 0 && (
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Call rải đều cho provider #1 (ở trên) + các provider thêm ở đây → chạy song song. Để giữ chất lượng như 1 provider, dùng model tốt tương đương.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderCard({ p, index, onChange, onRemove }: { p: ProviderConfig; index: number; onChange: (patch: Partial<ProviderConfig>) => void; onRemove: () => void }) {
  const proxy = useStore((s) => s.proxy);
  const [models, setModels] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const keyCount = [p.apiKey, ...(p.apiKeys || [])].filter((k) => k.trim()).length;
  const listId = `models-${p.id}`;

  const scanModels = async () => {
    const firstKey = p.apiKey?.trim() || (p.apiKeys || []).find((k) => k.trim()) || '';
    if (!firstKey) { setScanMsg('Nhập API key trước.'); return; }
    setScanning(true); setScanMsg('');
    try {
      const cfg: ProxySettings = { ...proxy, provider: p.provider, proxyUrl: p.proxyUrl, apiKey: firstKey, apiKeys: p.apiKeys || [] };
      const list = await fetchModelsFromProxy(cfg);
      setModels(list);
      setScanMsg(`${list.length} model`);
      if (!p.model && list[0]) onChange({ model: list[0] });
    } catch (e) {
      setScanMsg('Lỗi: ' + (e instanceof Error ? e.message : String(e)).slice(0, 60));
    } finally { setScanning(false); }
  };

  return (
    <div style={{ border: '1px solid ' + (p.enabled ? 'var(--accent-secondary)' : 'var(--border-subtle)'), borderRadius: 'var(--radius-sm)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, background: p.enabled ? 'rgba(56,189,248,0.04)' : 'transparent' }}>
      {/* Header: bật/tắt + tên + xoá */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={p.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} title="Bật/tắt provider này trong pool" />
        <input value={p.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={`Provider #${index}`}
          style={{ ...inputStyle, flex: 1, fontWeight: 700, padding: '4px 8px' }} />
        <button onClick={onRemove} title="Xoá provider" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', display: 'flex', padding: 4 }}>
          <Trash2 size={15} />
        </button>
      </div>

      {/* Loại + Base URL (2 cột) */}
      <div style={row2}>
        <div>
          <label style={lbl}>Loại</label>
          <select value={p.provider} onChange={(e) => onChange({ provider: e.target.value as AIProvider })} style={{ ...inputStyle, cursor: 'pointer' }}>
            {PROVIDERS.map((pr) => <option key={pr.value} value={pr.value}>{pr.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Base URL</label>
          <input value={p.proxyUrl} onChange={(e) => onChange({ proxyUrl: e.target.value })} placeholder="https://…/v1" style={inputStyle} />
        </div>
      </div>

      {/* API keys */}
      <div>
        <label style={lbl}>API Key {keyCount > 0 && <span style={{ color: 'var(--accent-secondary)' }}>· {keyCount} key</span>} (mỗi dòng 1 key để xoay vòng)</label>
        <textarea
          value={[p.apiKey, ...(p.apiKeys || [])].filter(Boolean).join('\n')}
          onChange={(e) => { const keys = e.target.value.split('\n').map((k) => k.trim()).filter(Boolean); onChange({ apiKey: keys[0] || '', apiKeys: keys.slice(1) }); }}
          rows={2} placeholder="sk-...&#10;sk-..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }} />
      </div>

      {/* Nút Load model cho provider này */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={scanModels} disabled={scanning}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: scanning ? 'default' : 'pointer', background: 'var(--bg-elevated)', color: 'var(--accent-secondary)', border: '1px solid var(--accent-secondary)', borderRadius: 'var(--radius-sm)' }}>
          {scanning ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />} Load model
        </button>
        {scanMsg && <span style={{ fontSize: '0.66rem', color: scanMsg.startsWith('Lỗi') ? 'var(--accent-danger)' : 'var(--text-muted)' }}>{scanMsg}</span>}
      </div>
      <datalist id={listId}>{models.map((m) => <option key={m} value={m} />)}</datalist>

      {/* Model chính + RPM (2 cột) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
        <div>
          <label style={lbl}>Model chính</label>
          <input value={p.model} onChange={(e) => onChange({ model: e.target.value })} list={listId} placeholder="gemini-2.5-pro" style={inputStyle} />
        </div>
        <div>
          <label style={lbl}>RPM chính</label>
          <input type="number" min={1} max={1000} value={p.primaryModelRpm} onChange={(e) => onChange({ primaryModelRpm: Math.max(1, +e.target.value || 1) })} style={inputStyle} />
        </div>
      </div>

      {/* Model phụ */}
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
        <input type="checkbox" checked={p.enableSecondaryModel} onChange={(e) => onChange({ enableSecondaryModel: e.target.checked })} />
        Model phụ (tràn khi model chính hết RPM)
      </label>
      {p.enableSecondaryModel && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', gap: 8 }}>
          <div>
            <label style={lbl}>Model phụ</label>
            <input value={p.secondaryModel} onChange={(e) => onChange({ secondaryModel: e.target.value })} list={listId} placeholder="gemini-2.5-flash" style={inputStyle} />
          </div>
          <div>
            <label style={lbl}>RPM phụ</label>
            <input type="number" min={1} max={1000} value={p.secondaryModelRpm} onChange={(e) => onChange({ secondaryModelRpm: Math.max(1, +e.target.value || 1) })} style={inputStyle} />
          </div>
          <div>
            <label style={lbl} title="Entry ngắn hơn ngưỡng (số KÝ TỰ) → dùng model phụ cho nhanh (0 = tắt)">Ngưỡng ký tự</label>
            <input type="number" min={0} value={p.secondaryModelThreshold} onChange={(e) => onChange({ secondaryModelThreshold: Math.max(0, +e.target.value || 0) })} style={inputStyle} />
          </div>
        </div>
      )}
    </div>
  );
}
