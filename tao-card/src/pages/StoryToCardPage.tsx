import { useState } from 'react';
import { Loader2, ScanLine, Sparkles, User, Wand2, Users, BookOpen, Settings2, Merge, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useCardStore } from '../store/cardStore';
import { useToastStore } from '../store/toastStore';
import { usePersistedState } from '../lib/usePersistedState';
import { DEFAULT_ENTRY_EXT, type LorebookEntry } from '../types/lorebook.types';
import {
  scanCharacters, generateCardFromStory, generateCardsForMany,
  type ScannedCharacter, type GeneratedStoryCard, type StoryCardOptions, type StoryCardTemplate,
  type BatchCardResult, type WorldEntry,
} from '../lib/ai/storyToCard';

/**
 * "Tạo thẻ từ truyện" — pipeline mô-đun học từ 小玉写卡器.
 * Dán truyện → quét nhân vật (chunk cho truyện dài) → chọn 1 hoặc NHIỀU nhân vật
 * → sinh thẻ theo mô-đun (+ tuỳ chọn world entries) → áp dụng vào dự án hiện tại.
 */
export function StoryToCardPage() {
  const settings = useSettingsStore();
  const updateCard = useCardStore((s) => s.updateCard);
  const addEntry = useCardStore((s) => s.addEntry);
  const getNextEntryId = useCardStore((s) => s.getNextEntryId);
  const toast = useToastStore();

  // Persist inputs + outputs qua localStorage → F5 / đóng tab / đổi tab không mất việc.
  const [story, setStory] = usePersistedState('s2c.story', '');
  const [opts, setOpts] = usePersistedState<StoryCardOptions>('s2c.opts', { detail: 'vừa phải', nsfw: false, template: 'chuẩn', splitByStage: true, autoContinue: true });
  // Tuỳ chọn quét
  const [chunkSize, setChunkSize] = usePersistedState('s2c.chunkSize', 40000);
  const [maxChunks, setMaxChunks] = usePersistedState('s2c.maxChunks', 12);
  const [includeIdentity, setIncludeIdentity] = usePersistedState('s2c.includeIdentity', true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [scanProg, setScanProg] = useState<{ d: number; t: number } | null>(null);
  const [roster, setRoster] = usePersistedState<ScannedCharacter[]>('s2c.roster', []);
  const [checked, setChecked] = usePersistedState<string[]>('s2c.checked', []);
  const [manualName, setManualName] = usePersistedState('s2c.manualName', '');

  const [generating, setGenerating] = useState(false);
  const [batchProg, setBatchProg] = useState<{ d: number; t: number; name: string } | null>(null);
  const [card, setCard] = usePersistedState<GeneratedStoryCard | null>('s2c.card', null);
  const [batch, setBatch] = usePersistedState<BatchCardResult[]>('s2c.batch', []);

  const profile = settings.profiles.find((p) => p.id === settings.activeProfileId);
  const set = (patch: Partial<StoryCardOptions>) => setOpts((o) => ({ ...o, ...patch }));

  const clearWork = () => {
    if (!confirm('Xoá toàn bộ truyện, roster và thẻ đã tạo trong trang này?')) return;
    setStory(''); setRoster([]); setChecked([]); setManualName(''); setCard(null); setBatch([]);
  };

  const requireApi = () => {
    if (!profile?.apiKey) { toast.error('Chưa cấu hình API. Vào Cài đặt.'); return false; }
    return true;
  };

  const toggleCheck = (name: string) => setChecked((prev) =>
    prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);

  const runScan = async () => {
    if (!requireApi()) return;
    if (!story.trim()) { toast.error('Dán nội dung truyện trước.'); return; }
    setScanning(true); setRoster([]); setCard(null); setBatch([]); setChecked([]); setScanProg({ d: 0, t: 1 });
    try {
      const chars = await scanCharacters(story, profile!, settings.generationParams, {
        chunkSize, maxChunks, includeIdentity,
        onProgress: (d, t) => setScanProg({ d, t }),
      });
      if (chars.length === 0) toast.error('Không quét được nhân vật. Thử lại hoặc nhập tên thủ công.');
      setRoster(chars);
      if (chars[0]) setChecked([chars[0].name]);
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setScanning(false); setScanProg(null); }
  };

  // Gộp các mục đang tick thành 1 nhân vật (union bí danh) — cho khi quét tách nhầm 1 người ra nhiều mục.
  const mergeChecked = () => {
    const names = [...checked];
    if (names.length < 2) { toast.error('Tick ít nhất 2 mục để gộp.'); return; }
    const picks = roster.filter((c) => checked.includes(c.name));
    const primary = picks[0];
    const mergedAliases = Array.from(new Set(picks.flatMap((c) => [c.name, ...c.aliases]).filter((a) => a !== primary.name)));
    const mergedBrief = picks.map((c) => c.brief).filter(Boolean).sort((a, b) => b.length - a.length)[0] || '';
    const merged: ScannedCharacter = { name: primary.name, aliases: mergedAliases, brief: mergedBrief };
    setRoster((r) => [merged, ...r.filter((c) => !checked.includes(c.name))]);
    setChecked([primary.name]);
    toast.success(`Đã gộp ${names.length} mục vào "${primary.name}".`);
  };

  const targets = (): string[] => {
    const arr = [...checked];
    if (manualName.trim()) arr.push(manualName.trim());
    return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
  };

  const runGenerate = async () => {
    if (!requireApi()) return;
    const names = targets();
    if (names.length === 0) { toast.error('Tick nhân vật hoặc nhập tên thủ công.'); return; }
    if (!story.trim()) { toast.error('Cần có nội dung truyện.'); return; }
    setGenerating(true); setCard(null); setBatch([]);
    try {
      if (names.length === 1) {
        const c = await generateCardFromStory(story, names[0], profile!, settings.generationParams, opts);
        setCard(c);
      } else {
        setBatchProg({ d: 0, t: names.length, name: '' });
        const res = await generateCardsForMany(story, names, profile!, settings.generationParams, opts, undefined,
          (d, t, name) => setBatchProg({ d, t, name }));
        setBatch(res);
        const ok = res.filter((r) => r.card).length;
        toast.success(`Tạo xong ${ok}/${names.length} thẻ.`);
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setGenerating(false); setBatchProg(null); }
  };

  const applyEntries = (entries: WorldEntry[]) => {
    entries.forEach((we) => {
      const id = getNextEntryId();
      const entry: LorebookEntry = {
        id, keys: we.keys.length ? we.keys : ['lore'], secondary_keys: [],
        comment: we.keys[0] || `Lore #${id}`, content: we.content,
        constant: false, selective: true, insertion_order: 100, enabled: true,
        position: 'before_char', use_regex: true,
        extensions: { ...DEFAULT_ENTRY_EXT, display_index: id },
      };
      addEntry(entry);
    });
    toast.success(`Đã thêm ${entries.length} entry vào Lorebook.`);
  };

  const applyToCard = (c: GeneratedStoryCard) => {
    updateCard((card) => {
      if (c.name) card.data.name = c.name;
      card.data.description = c.description;
      if (c.scenario) card.data.scenario = c.scenario;
      if (c.firstMes) card.data.first_mes = c.firstMes;
    });
    if (c.worldEntries.length) applyEntries(c.worldEntries);
    toast.success('Đã áp dụng vào thẻ hiện tại. Xem tab Card Editor.');
  };

  const multi = checked.length + (manualName.trim() ? 1 : 0) > 1;

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Wand2 className="w-5 h-5 text-primary shrink-0" />
        <h1 className="text-lg font-bold shrink-0">Tạo thẻ từ truyện</h1>
        <span className="text-xs text-muted-foreground truncate min-w-0 hidden sm:inline">Quét nhân vật (chunk) → sinh thẻ theo mô-đun</span>
        <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-2 shrink-0">
          <span title="Truyện, roster và thẻ được tự lưu — F5 không mất">💾 tự lưu</span>
          {(story || roster.length > 0 || card || batch.length > 0) && (
            <button onClick={clearWork} className="inline-flex items-center gap-1 hover:text-red-400" title="Xoá việc trong trang này">
              <Trash2 className="w-3.5 h-3.5" /> Xoá
            </button>
          )}
        </span>
      </div>

      {/* 01 — Truyện + tùy chọn */}
      <section className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2"><ScanLine className="w-4 h-4" /> 01 · Dán truyện</div>
        <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={8}
          className="settings-input text-sm resize-y w-full" placeholder="Dán chương truyện / tiểu thuyết. Truyện dài sẽ được chia đoạn để quét, không lo vượt context." />
        <div className="text-xs text-muted-foreground">{story.length.toLocaleString()} ký tự{chunkSize > 0 && story.length > chunkSize ? ` · ~${Math.min(Math.ceil(story.length / chunkSize), maxChunks)} đoạn quét` : ''}</div>

        {/* Tuỳ chọn thẻ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="text-xs">Mức chi tiết
            <select value={opts.detail} onChange={(e) => set({ detail: e.target.value as StoryCardOptions['detail'] })} className="settings-input text-xs mt-1 w-full">
              <option value="ngắn gọn">Ngắn gọn</option>
              <option value="vừa phải">Vừa phải</option>
              <option value="chi tiết">Chi tiết</option>
            </select>
          </label>
          <label className="text-xs">Mẫu thiết kế
            <select value={opts.template} onChange={(e) => set({ template: e.target.value as StoryCardTemplate })} className="settings-input text-xs mt-1 w-full">
              <option value="chuẩn">Chuẩn</option>
              <option value="nhập vai đậm">Nhập vai đậm</option>
              <option value="súc tích">Súc tích</option>
              <option value="tối giản">Tối giản</option>
            </select>
          </label>
          <label className="text-xs">Nhân vật thành {'{{user}}'}
            <input value={opts.userReplaceName ?? ''} onChange={(e) => set({ userReplaceName: e.target.value })} className="settings-input text-xs mt-1 w-full" placeholder="tên (tùy chọn)" />
          </label>
          <label className="text-xs">Quan hệ với {'{{user}}'}
            <input value={opts.relationship ?? ''} onChange={(e) => set({ relationship: e.target.value })} className="settings-input text-xs mt-1 w-full" placeholder="vd: chủ - tớ" />
          </label>
        </div>

        {/* #3 — Thiết lập bổ sung cho {{user}}, chỉ hiện khi có thay {{user}} */}
        {opts.userReplaceName?.trim() && (
          <label className="text-xs block">Thiết lập bổ sung cho {'{{user}}'} (trải nghiệm chung, xưng hô, ràng buộc…)
            <textarea value={opts.userSetup ?? ''} onChange={(e) => set({ userSetup: e.target.value })} rows={2}
              className="settings-input text-xs mt-1 w-full resize-y" placeholder="vd: {{user}} là người kế thừa gia tộc, luôn được nhân vật gọi bằng 'thiếu gia'…" />
          </label>
        )}

        {/* Toggles */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!opts.nsfw} onChange={(e) => set({ nsfw: e.target.checked })} /> NSFW</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={opts.splitByStage !== false} onChange={(e) => set({ splitByStage: e.target.checked })} /> Chia theo giai đoạn</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!opts.omitEmptyFields} onChange={(e) => set({ omitEmptyFields: e.target.checked })} /> Lược bỏ trường không có trong truyện</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!opts.autoContinue} onChange={(e) => set({ autoContinue: e.target.checked })} /> Tự viết tiếp khi bị cắt</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!opts.withWorldEntries} onChange={(e) => set({ withWorldEntries: e.target.checked })} /> Kèm world/lore entries</label>
        </div>

        {/* Nâng cao: chunk + scan */}
        <button onClick={() => setShowAdvanced((v) => !v)} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <Settings2 className="w-3.5 h-3.5" /> {showAdvanced ? 'Ẩn' : 'Hiện'} tuỳ chọn nâng cao
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            <label className="text-xs">Kích thước đoạn quét (ký tự, 0 = toàn văn)
              <input type="number" min={0} step={5000} value={chunkSize} onChange={(e) => setChunkSize(Math.max(0, +e.target.value || 0))} className="settings-input text-xs mt-1 w-full" />
            </label>
            <label className="text-xs">Giới hạn số đoạn quét
              <input type="number" min={1} max={50} value={maxChunks} onChange={(e) => setMaxChunks(Math.max(1, +e.target.value || 1))} className="settings-input text-xs mt-1 w-full" />
            </label>
            <label className="text-xs flex items-end gap-2 pb-1">
              <input type="checkbox" checked={includeIdentity} onChange={(e) => setIncludeIdentity(e.target.checked)} /> Kèm mô tả danh tính khi quét
            </label>
            <label className="text-xs md:col-span-3 block">Thiết lập bổ sung chung cho thẻ
              <input value={opts.extraNotes ?? ''} onChange={(e) => set({ extraNotes: e.target.value })} className="settings-input text-xs mt-1 w-full" placeholder="yêu cầu riêng cho mọi thẻ tạo ra…" />
            </label>
          </div>
        )}

        <button onClick={runScan} disabled={scanning}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-white"
          style={{ background: scanning ? '#3a3352' : '#7c6af0', border: 'none', cursor: scanning ? 'default' : 'pointer' }}>
          {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang quét{scanProg && scanProg.t > 1 ? ` ${scanProg.d}/${scanProg.t} đoạn` : ''}...</> : <><ScanLine className="w-4 h-4" /> Quét nhân vật</>}
        </button>
      </section>

      {/* 02 — Chọn nhân vật (đa chọn) */}
      {(roster.length > 0 || manualName) && (
        <section className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <div className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> 02 · Chọn nhân vật {checked.length > 0 && <span className="text-xs text-primary">({checked.length} đã chọn)</span>}</span>
            {roster.length > 0 && (
              <div className="flex items-center gap-3 text-xs font-normal">
                <button onClick={() => setChecked(roster.map((c) => c.name))} className="text-muted-foreground hover:text-foreground">Chọn hết</button>
                <button onClick={() => setChecked([])} className="text-muted-foreground hover:text-foreground">Bỏ chọn</button>
                {checked.length >= 2 && <button onClick={mergeChecked} className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300"><Merge className="w-3.5 h-3.5" /> Gộp mục đã chọn</button>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {roster.map((c) => {
              const on = checked.includes(c.name);
              return (
                <button key={c.name} onClick={() => toggleCheck(c.name)}
                  className="text-left p-2.5 rounded-lg border flex gap-2"
                  style={{ borderColor: on ? '#7c6af0' : '#2a2a3e', background: on ? 'rgba(124,106,240,0.1)' : 'transparent' }}>
                  <input type="checkbox" readOnly checked={on} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold">{c.name}{c.aliases.length > 0 && <span className="text-xs text-muted-foreground"> ({c.aliases.join(', ')})</span>}</div>
                    {c.brief && <div className="text-xs text-muted-foreground mt-0.5">{c.brief}</div>}
                  </div>
                </button>
              );
            })}
          </div>
          <input value={manualName} onChange={(e) => setManualName(e.target.value)} className="settings-input text-sm w-full"
            placeholder="…hoặc nhập tên thủ công (thêm vào danh sách tạo)" />
          <button onClick={runGenerate} disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-white"
            style={{ background: generating ? '#3a3352' : '#a855f7', border: 'none', cursor: generating ? 'default' : 'pointer' }}>
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {batchProg ? `Đang tạo ${batchProg.d}/${batchProg.t}${batchProg.name ? ` · ${batchProg.name}` : ''}` : 'Đang tạo thẻ...'}</>
              : <><Sparkles className="w-4 h-4" /> {multi ? `Tạo ${checked.length + (manualName.trim() ? 1 : 0)} thẻ (song song)` : 'Tạo thẻ nhân vật'}</>}
          </button>
        </section>
      )}

      {/* 03 — Kết quả đơn */}
      {card && <CardResult card={card} onApply={() => applyToCard(card)} onApplyEntries={applyEntries} />}

      {/* 03 — Kết quả hàng loạt */}
      {batch.length > 0 && (
        <div className="space-y-3">
          {batch.map((b) => b.card
            ? <CardResult key={b.name} card={b.card} onApply={() => applyToCard(b.card!)} onApplyEntries={applyEntries} />
            : <div key={b.name} className="rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-sm">❌ <b>{b.name}</b>: {b.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

function CardResult({ card, onApply, onApplyEntries }: {
  card: GeneratedStoryCard;
  onApply: () => void;
  onApplyEntries: (e: WorldEntry[]) => void;
}) {
  return (
    <section className="rounded-xl border border-primary/40 bg-muted/20 p-4 space-y-3">
      <div className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Thẻ: {card.name}</div>
      {([['Mô tả (basic + persona)', card.description], ['Bối cảnh', card.scenario], ['Lời chào', card.firstMes]] as const)
        .filter(([, v]) => v)
        .map(([label, v]) => (
          <div key={label} className="rounded-lg border border-border/60 p-2.5">
            <div className="text-xs font-bold text-primary mb-1">{label}</div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ maxHeight: 200, overflowY: 'auto' }}>{v}</div>
          </div>
        ))}
      {card.worldEntries.length > 0 && (
        <div className="rounded-lg border border-border/60 p-2.5">
          <div className="text-xs font-bold text-primary mb-1 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {card.worldEntries.length} world entries</div>
          <ul className="text-xs space-y-1" style={{ maxHeight: 160, overflowY: 'auto' }}>
            {card.worldEntries.map((e, i) => (
              <li key={i}><span className="text-amber-400">[{e.keys.join(', ')}]</span> {e.content.slice(0, 120)}{e.content.length > 120 ? '…' : ''}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onApply} className="px-4 py-2 rounded-md font-semibold text-white" style={{ background: '#22c55e', border: 'none', cursor: 'pointer' }}>
          Áp dụng vào thẻ hiện tại
        </button>
        {card.worldEntries.length > 0 && (
          <button onClick={() => onApplyEntries(card.worldEntries)} className="px-4 py-2 rounded-md font-semibold" style={{ background: 'transparent', color: '#fbbf24', border: '1px solid #fbbf24', cursor: 'pointer' }}>
            Chỉ thêm entries vào Lorebook
          </button>
        )}
      </div>
    </section>
  );
}
