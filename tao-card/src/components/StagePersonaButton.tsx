import { useState } from 'react';
import { Sparkles, X, Loader2, Wand2 } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';
import { generateStagePersona, formatStagePersona, type StagePersona } from '../lib/ai/personaStages';

/**
 * Nút "Sinh persona theo giai đoạn" (học từ 小玉写卡器).
 * Sinh persona chia 3 giai đoạn quan hệ + xuyên suốt, rồi cho chèn/thay vào ô Mô tả.
 * Self-contained: không đụng luồng sinh sẵn có của tao-card.
 */
export default function StagePersonaButton({
  currentDescription,
  onInsert,
}: {
  currentDescription: string;
  onInsert: (text: string) => void;
}) {
  const settings = useSettingsStore();
  const toast = useToastStore();
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StagePersona | null>(null);
  const [userReplaceName, setUserReplaceName] = useState('');
  const [relationship, setRelationship] = useState('');

  const activeProfile = settings.profiles.find((p) => p.id === settings.activeProfileId);

  const openModal = () => {
    setSeed(currentDescription?.trim() || '');
    setResult(null);
    setOpen(true);
  };

  const run = async () => {
    if (!activeProfile?.apiKey) { toast.error('Chưa cấu hình API. Vào Settings.'); return; }
    if (!seed.trim()) { toast.error('Nhập tư liệu nhân vật (hoặc mô tả có sẵn) trước.'); return; }
    setLoading(true);
    setResult(null);
    try {
      const r = await generateStagePersona(seed, activeProfile, settings.generationParams, {
        userReplaceName: userReplaceName.trim() || undefined,
        relationship: relationship.trim() || undefined,
      });
      if (!r.early && !r.middle && !r.close) {
        toast.error('AI không trả về đúng định dạng. Thử lại hoặc đổi model.');
      }
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const insert = (mode: 'append' | 'replace') => {
    if (!result) return;
    const text = formatStagePersona(result);
    onInsert(mode === 'replace' ? text : (currentDescription ? currentDescription.trimEnd() + '\n\n' + text : text));
    toast.success(mode === 'replace' ? 'Đã thay Mô tả' : 'Đã chèn vào Mô tả');
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
        style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)' }}
        title="Sinh persona chia theo giai đoạn quan hệ (học từ 小玉写卡器)"
      >
        <Sparkles className="w-3.5 h-3.5" /> Persona theo giai đoạn
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#14141c', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 12, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', color: '#e8e6f0' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a3e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wand2 className="w-4 h-4" style={{ color: '#c084fc' }} />
              <span style={{ fontWeight: 700, flex: 1 }}>Sinh persona theo giai đoạn quan hệ</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#9b98ae', cursor: 'pointer' }}><X className="w-4 h-4" /></button>
            </div>

            <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#9b98ae', marginBottom: 4 }}>Tư liệu nhân vật (tên, ngoại hình, tính cách, quá khứ, quan hệ với {'{{user}}'}...)</div>
                <textarea value={seed} onChange={(e) => setSeed(e.target.value)} rows={5}
                  className="settings-input text-sm resize-y" style={{ width: '100%' }} disabled={loading}
                  placeholder="Dán mô tả nhân vật / trích đoạn truyện. AI sẽ chia persona theo 3 giai đoạn thân thiết + nét xuyên suốt." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#9b98ae', marginBottom: 4 }}>Nhân vật đóng vai {'{{user}}'} (tùy chọn)</div>
                  <input value={userReplaceName} onChange={(e) => setUserReplaceName(e.target.value)} disabled={loading}
                    className="settings-input text-sm" style={{ width: '100%' }}
                    placeholder="Tên nhân vật sẽ thành {{user}}" />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#9b98ae', marginBottom: 4 }}>Quan hệ với {'{{user}}'} (tùy chọn)</div>
                  <input value={relationship} onChange={(e) => setRelationship(e.target.value)} disabled={loading}
                    className="settings-input text-sm" style={{ width: '100%' }}
                    placeholder="vd: thanh mai trúc mã, chủ - tớ..." />
                </div>
              </div>

              <button onClick={run} disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold"
                style={{ background: loading ? '#3a3352' : '#a855f7', color: 'white', border: 'none', cursor: loading ? 'default' : 'pointer' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang sinh...</> : <><Sparkles className="w-4 h-4" /> Sinh persona</>}
              </button>

              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {([['Sơ giao (0–30)', result.early], ['Quen thân (31–70)', result.middle], ['Thân mật (71–100)', result.close], ['Xuyên suốt', result.common]] as const)
                    .filter(([, v]) => v)
                    .map(([label, v]) => (
                      <div key={label} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid #2a2a3e', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c084fc', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#d7d4e4' }}>{v}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {result && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a3e', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => insert('append')} className="px-3 py-1.5 rounded-md text-sm" style={{ background: 'transparent', color: '#c8c5d8', border: '1px solid #2a2a3e', cursor: 'pointer' }}>Chèn vào Mô tả</button>
                <button onClick={() => insert('replace')} className="px-3 py-1.5 rounded-md text-sm font-semibold" style={{ background: '#a855f7', color: 'white', border: 'none', cursor: 'pointer' }}>Thay Mô tả</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
