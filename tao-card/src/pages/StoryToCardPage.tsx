import { useState } from 'react';
import { Loader2, ScanLine, Sparkles, User, Wand2 } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useCardStore } from '../store/cardStore';
import { useToastStore } from '../store/toastStore';
import {
  scanCharacters, generateCardFromStory,
  type ScannedCharacter, type GeneratedStoryCard, type StoryCardOptions,
} from '../lib/ai/storyToCard';

/**
 * "Tạo thẻ từ truyện" (mảnh #4 — pipeline mô-đun, học từ 小玉写卡器):
 * dán truyện → quét nhân vật → chọn → sinh thẻ theo mô-đun → áp dụng vào dự án hiện tại.
 */
export function StoryToCardPage() {
  const settings = useSettingsStore();
  const updateCard = useCardStore((s) => s.updateCard);
  const toast = useToastStore();

  const [story, setStory] = useState('');
  const [opts, setOpts] = useState<StoryCardOptions>({ detail: 'vừa phải', nsfw: false });
  const [scanning, setScanning] = useState(false);
  const [roster, setRoster] = useState<ScannedCharacter[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [manualName, setManualName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [card, setCard] = useState<GeneratedStoryCard | null>(null);

  const profile = settings.profiles.find((p) => p.id === settings.activeProfileId);

  const requireApi = () => {
    if (!profile?.apiKey) { toast.error('Chưa cấu hình API. Vào Cài đặt.'); return false; }
    return true;
  };

  const runScan = async () => {
    if (!requireApi()) return;
    if (!story.trim()) { toast.error('Dán nội dung truyện trước.'); return; }
    setScanning(true); setRoster([]); setCard(null);
    try {
      const chars = await scanCharacters(story, profile!, settings.generationParams);
      if (chars.length === 0) toast.error('Không quét được nhân vật. Thử lại hoặc nhập tên thủ công.');
      setRoster(chars);
      if (chars[0]) setSelected(chars[0].name);
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setScanning(false); }
  };

  const runGenerate = async () => {
    if (!requireApi()) return;
    const name = (manualName.trim() || selected).trim();
    if (!name) { toast.error('Chọn nhân vật hoặc nhập tên thủ công.'); return; }
    if (!story.trim()) { toast.error('Cần có nội dung truyện.'); return; }
    setGenerating(true); setCard(null);
    try {
      const c = await generateCardFromStory(story, name, profile!, settings.generationParams, opts);
      setCard(c);
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setGenerating(false); }
  };

  const applyToCard = () => {
    if (!card) return;
    updateCard((c) => {
      if (card.name) c.data.name = card.name;
      c.data.description = card.description;
      if (card.scenario) c.data.scenario = card.scenario;
      if (card.firstMes) c.data.first_mes = card.firstMes;
    });
    toast.success('Đã áp dụng vào thẻ hiện tại. Xem tab Card Editor.');
  };

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Tạo thẻ từ truyện</h1>
        <span className="text-xs text-muted-foreground">Quét nhân vật → sinh thẻ theo mô-đun</span>
      </div>

      {/* 01 — Truyện + tùy chọn */}
      <section className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2"><ScanLine className="w-4 h-4" /> 01 · Dán truyện</div>
        <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={8}
          className="settings-input text-sm resize-y w-full" placeholder="Dán chương truyện / tiểu thuyết. AI sẽ quét nhân vật rồi tạo thẻ." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="text-xs">Mức chi tiết
            <select value={opts.detail} onChange={(e) => setOpts({ ...opts, detail: e.target.value as StoryCardOptions['detail'] })} className="settings-input text-xs mt-1 w-full">
              <option value="ngắn gọn">Ngắn gọn</option>
              <option value="vừa phải">Vừa phải</option>
              <option value="chi tiết">Chi tiết</option>
            </select>
          </label>
          <label className="text-xs">Nhân vật thành {'{{user}}'}
            <input value={opts.userReplaceName ?? ''} onChange={(e) => setOpts({ ...opts, userReplaceName: e.target.value })} className="settings-input text-xs mt-1 w-full" placeholder="tên (tùy chọn)" />
          </label>
          <label className="text-xs">Quan hệ với {'{{user}}'}
            <input value={opts.relationship ?? ''} onChange={(e) => setOpts({ ...opts, relationship: e.target.value })} className="settings-input text-xs mt-1 w-full" placeholder="vd: chủ - tớ" />
          </label>
          <label className="text-xs flex items-end gap-2 pb-1">
            <input type="checkbox" checked={!!opts.nsfw} onChange={(e) => setOpts({ ...opts, nsfw: e.target.checked })} /> NSFW
          </label>
        </div>
        <button onClick={runScan} disabled={scanning}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-white"
          style={{ background: scanning ? '#3a3352' : '#7c6af0', border: 'none', cursor: scanning ? 'default' : 'pointer' }}>
          {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang quét...</> : <><ScanLine className="w-4 h-4" /> Quét nhân vật</>}
        </button>
      </section>

      {/* 02 — Chọn nhân vật */}
      {(roster.length > 0 || manualName) && (
        <section className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <div className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4" /> 02 · Chọn nhân vật</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {roster.map((c) => (
              <button key={c.name} onClick={() => { setSelected(c.name); setManualName(''); }}
                className="text-left p-2.5 rounded-lg border"
                style={{ borderColor: selected === c.name && !manualName ? '#7c6af0' : '#2a2a3e', background: selected === c.name && !manualName ? 'rgba(124,106,240,0.1)' : 'transparent' }}>
                <div className="text-sm font-semibold">{c.name}{c.aliases.length > 0 && <span className="text-xs text-muted-foreground"> ({c.aliases.join(', ')})</span>}</div>
                {c.brief && <div className="text-xs text-muted-foreground mt-0.5">{c.brief}</div>}
              </button>
            ))}
          </div>
          <input value={manualName} onChange={(e) => setManualName(e.target.value)} className="settings-input text-sm w-full"
            placeholder="…hoặc nhập tên thủ công (bỏ qua quét)" />
          <button onClick={runGenerate} disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-white"
            style={{ background: generating ? '#3a3352' : '#a855f7', border: 'none', cursor: generating ? 'default' : 'pointer' }}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo thẻ...</> : <><Sparkles className="w-4 h-4" /> Tạo thẻ nhân vật</>}
          </button>
        </section>
      )}

      {/* 03 — Kết quả */}
      {card && (
        <section className="rounded-xl border border-primary/40 bg-muted/20 p-4 space-y-3">
          <div className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> 03 · Thẻ đã tạo: {card.name}</div>
          {([['Mô tả (basic + persona)', card.description], ['Bối cảnh', card.scenario], ['Lời chào', card.firstMes]] as const)
            .filter(([, v]) => v)
            .map(([label, v]) => (
              <div key={label} className="rounded-lg border border-border/60 p-2.5">
                <div className="text-xs font-bold text-primary mb-1">{label}</div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ maxHeight: 200, overflowY: 'auto' }}>{v}</div>
              </div>
            ))}
          <button onClick={applyToCard} className="px-4 py-2 rounded-md font-semibold text-white" style={{ background: '#22c55e', border: 'none', cursor: 'pointer' }}>
            Áp dụng vào thẻ hiện tại
          </button>
        </section>
      )}
    </div>
  );
}
