/**
 * CompareCardsPanel — So Sánh Card: mở 3 phiên bản cùng 1 card cạnh nhau, sửa & xuất.
 * ──────────────────────────────────────────────────────────────────────────────
 * 3 cột: Card Raw / Card Đã Dịch / Card Final. Mỗi entry gióng thẳng hàng theo `path`,
 * nhóm theo loại (core, lorebook, mở đầu, regex, MVU…). Sửa từng ô → Lưu ghi thẳng vào card
 * (trong bộ nhớ) → Xuất JSON/PNG. Hoàn toàn tách biệt với phiên dịch chính (không đụng store card).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  X, Upload, Save, Download, Trash2, ChevronDown, ChevronRight,
  Search, AlertTriangle, FileJson, Image as ImageIcon, Columns3,
} from 'lucide-react';
import { useStore } from '../store';
import { parseCardFile, type ParsedCard } from '../utils/parseCardFile';
import { buildCompareGroups, valuesDiffer } from '../utils/compareCards';
import { extractTranslatableFields, setNestedValue, DEFAULT_FIELD_GROUPS } from '../utils/cardFields';
import { embedCharaToPNG } from '../utils/pngHandler';
import type { CharacterCard, FieldGroup, TranslationField } from '../types/card';

export default function CompareCardsPanelDefault(props: Props) {
  return <CompareCardsPanel {...props} />;
}

interface Props { onClose: () => void; }

type SlotId = 'raw' | 'translated' | 'final';
const SLOT_ORDER: { id: SlotId; name: string; color: string }[] = [
  { id: 'raw', name: 'Card Raw', color: '#9ca3af' },
  { id: 'translated', name: 'Card Đã Dịch', color: 'var(--accent-primary)' },
  { id: 'final', name: 'Card Final', color: '#22c55e' },
];

interface Slot {
  parsed: ParsedCard | null;
  fields: TranslationField[];
  valueByPath: Map<string, string>;
  edits: Record<string, string>;
}
const emptySlot = (): Slot => ({ parsed: null, fields: [], valueByPath: new Map(), edits: {} });

const ALL_GROUP_IDS: FieldGroup[] = DEFAULT_FIELD_GROUPS.map((g) => g.id);
const stem = (name: string) => name.replace(/\.(json|png)$/i, '');

function triggerDownload(href: string, filename: string, revoke = false) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1500);
}

export function CompareCardsPanel({ onClose }: Props) {
  const addToast = useStore((s) => s.addToast);
  const [slots, setSlots] = useState<Record<SlotId, Slot>>({
    raw: emptySlot(), translated: emptySlot(), final: emptySlot(),
  });
  const [collapsed, setCollapsed] = useState<Set<FieldGroup>>(new Set());
  const [diffOnly, setDiffOnly] = useState(false);
  const [query, setQuery] = useState('');

  const patchSlot = useCallback((id: SlotId, patch: Partial<Slot>) => {
    setSlots((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  // ─── Import 1 card vào 1 slot ───
  const importFile = useCallback(async (id: SlotId, file: File) => {
    try {
      const parsed = await parseCardFile(file);
      const fields = extractTranslatableFields(parsed.card, ALL_GROUP_IDS);
      const valueByPath = new Map(fields.map((f) => [f.path, f.original]));
      patchSlot(id, { parsed, fields, valueByPath, edits: {} });
      addToast('success', `Đã nạp ${SLOT_ORDER.find((s) => s.id === id)?.name}: ${fields.length} mục`);
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : String(e));
    }
  }, [addToast, patchSlot]);

  const removeSlot = useCallback((id: SlotId) => {
    const dirty = Object.keys(slots[id].edits).length;
    if (dirty > 0 && !window.confirm(`Còn ${dirty} ô chưa lưu ở cột này. Gỡ card vẫn tiếp tục?`)) return;
    patchSlot(id, { ...emptySlot() });
  }, [slots, patchSlot]);

  // ─── Sửa 1 ô ───
  const editCell = useCallback((id: SlotId, path: string, value: string) => {
    setSlots((prev) => ({ ...prev, [id]: { ...prev[id], edits: { ...prev[id].edits, [path]: value } } }));
  }, []);

  // ─── Lưu 1 ô (ghi thẳng vào card) ───
  const saveCell = useCallback((id: SlotId, path: string) => {
    setSlots((prev) => {
      const slot = prev[id];
      if (!slot.parsed || !(path in slot.edits)) return prev;
      const val = slot.edits[path];
      setNestedValue(slot.parsed.card as unknown as Record<string, unknown>, path, val);
      const valueByPath = new Map(slot.valueByPath); valueByPath.set(path, val);
      const edits = { ...slot.edits }; delete edits[path];
      return { ...prev, [id]: { ...slot, valueByPath, edits } };
    });
  }, []);

  // ─── Lưu tất cả ô của 1 cột ───
  const saveAll = useCallback((id: SlotId) => {
    setSlots((prev) => {
      const slot = prev[id];
      if (!slot.parsed) return prev;
      const valueByPath = new Map(slot.valueByPath);
      for (const [p, v] of Object.entries(slot.edits)) {
        setNestedValue(slot.parsed.card as unknown as Record<string, unknown>, p, v);
        valueByPath.set(p, v);
      }
      return { ...prev, [id]: { ...slot, valueByPath, edits: {} } };
    });
    addToast('success', 'Đã lưu tất cả chỉnh sửa của cột.');
  }, [addToast]);

  // Áp mọi edit còn lại thẳng vào card object (đồng bộ, cho export) rồi dọn state.
  const flushEdits = useCallback((slot: Slot): CharacterCard | null => {
    if (!slot.parsed) return null;
    for (const [p, v] of Object.entries(slot.edits)) {
      setNestedValue(slot.parsed.card as unknown as Record<string, unknown>, p, v);
    }
    return slot.parsed.card;
  }, []);

  const exportJson = useCallback((id: SlotId) => {
    const slot = slots[id];
    const card = flushEdits(slot);
    if (!card || !slot.parsed) return;
    const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' });
    triggerDownload(URL.createObjectURL(blob), `${stem(slot.parsed.fileName)}.json`, true);
    saveAll(id);
  }, [slots, flushEdits, saveAll]);

  const exportPng = useCallback(async (id: SlotId) => {
    const slot = slots[id];
    if (!slot.parsed?.dataUrl) return;
    const card = flushEdits(slot);
    if (!card) return;
    try {
      const dataUrl = await embedCharaToPNG(slot.parsed.dataUrl, JSON.stringify(card));
      triggerDownload(dataUrl, `${stem(slot.parsed.fileName)}.png`);
      saveAll(id);
    } catch (e) {
      addToast('error', `Xuất PNG lỗi: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [slots, flushEdits, saveAll, addToast]);

  // ─── Dữ liệu hiển thị ───
  const loadedSlots = SLOT_ORDER.filter((s) => slots[s.id].parsed);
  const groups = useMemo(
    () => buildCompareGroups(loadedSlots.map((s) => slots[s.id].fields)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots.raw.fields, slots.translated.fields, slots.final.fields],
  );

  const effective = (id: SlotId, path: string): string | undefined => {
    const slot = slots[id];
    if (path in slot.edits) return slot.edits[path];
    return slot.valueByPath.has(path) ? slot.valueByPath.get(path) : undefined;
  };
  const isDirty = (id: SlotId, path: string) =>
    path in slots[id].edits && slots[id].edits[path] !== slots[id].valueByPath.get(path);

  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    return groups.map((g) => ({
      ...g,
      entries: g.entries.filter((e) => {
        if (q && !e.label.toLowerCase().includes(q) && !e.path.toLowerCase().includes(q)) return false;
        if (diffOnly && !valuesDiffer(SLOT_ORDER.map((s) => effective(s.id, e.path)))) return false;
        return true;
      }),
    })).filter((g) => g.entries.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, q, diffOnly, slots]);

  const totalDirty = SLOT_ORDER.reduce((n, s) => n + Object.keys(slots[s.id].edits).length, 0);
  const handleClose = () => {
    if (totalDirty > 0 && !window.confirm(`Còn ${totalDirty} ô chưa lưu (sẽ mất khi đóng). Đóng?`)) return;
    onClose();
  };

  const gridCols = '200px repeat(3, minmax(0, 1fr))';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
        <Columns3 size={18} color="var(--accent-primary)" />
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>So Sánh Card</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>3 phiên bản cạnh nhau · sửa & xuất từng entry</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm entry…"
              style={{ padding: '5px 8px 5px 26px', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '150px' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} />
            Chỉ hiện khác nhau
          </label>
          {totalDirty > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--accent-warning)' }}>
              <AlertTriangle size={13} /> {totalDirty} ô chưa lưu
            </span>
          )}
          <button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.75rem' }}>
            <X size={14} /> Đóng
          </button>
        </div>
      </div>

      {/* Column headers (sticky) */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
        <div style={{ padding: '10px 12px', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, alignSelf: 'center' }}>ENTRY</div>
        {SLOT_ORDER.map((s) => (
          <SlotHeader key={s.id} slotDef={s} slot={slots[s.id]}
            onImport={(f) => importFile(s.id, f)} onRemove={() => removeSlot(s.id)}
            onSaveAll={() => saveAll(s.id)} onExportJson={() => exportJson(s.id)} onExportPng={() => exportPng(s.id)} />
        ))}
      </div>

      {/* Grid body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loadedSlots.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
            Nạp ít nhất 1 card ở các cột trên để bắt đầu so sánh.<br />
            <span style={{ fontSize: '0.72rem' }}>Kéo-thả hoặc bấm để chọn file .json / .png cho từng cột (Raw / Đã Dịch / Final).</span>
          </div>
        ) : visibleGroups.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Không có entry nào khớp bộ lọc.</div>
        ) : (
          visibleGroups.map((g) => {
            const isCollapsed = collapsed.has(g.group);
            return (
              <div key={g.group}>
                {/* Group header */}
                <div onClick={() => setCollapsed((prev) => { const n = new Set(prev); n.has(g.group) ? n.delete(g.group) : n.add(g.group); return n; })}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', position: 'sticky', top: 0, zIndex: 2 }}>
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>{g.label}</span>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>({g.entries.length})</span>
                </div>
                {/* Rows */}
                {!isCollapsed && g.entries.map((e) => (
                  <div key={e.path} style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-secondary)', wordBreak: 'break-word', borderRight: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 600 }}>{e.label}</div>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '2px' }}>{e.path}</div>
                    </div>
                    {SLOT_ORDER.map((s) => (
                      <CompareCell key={s.id}
                        loaded={!!slots[s.id].parsed}
                        present={slots[s.id].valueByPath.has(e.path) || (e.path in slots[s.id].edits)}
                        value={effective(s.id, e.path) ?? ''}
                        dirty={isDirty(s.id, e.path)}
                        onChange={(v) => editCell(s.id, e.path, v)}
                        onSave={() => saveCell(s.id, e.path)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Column header with import + actions ───
function SlotHeader({ slotDef, slot, onImport, onRemove, onSaveAll, onExportJson, onExportPng }: {
  slotDef: { id: SlotId; name: string; color: string };
  slot: Slot;
  onImport: (f: File) => void; onRemove: () => void;
  onSaveAll: () => void; onExportJson: () => void; onExportPng: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const dirty = Object.keys(slot.edits).length;

  if (!slot.parsed) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onImport(f); }}
        style={{ margin: '8px', padding: '14px 10px', border: `1.5px dashed ${drag ? slotDef.color : 'var(--border-default)'}`, borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer', background: drag ? 'rgba(124,106,240,0.06)' : 'transparent' }}>
        <Upload size={16} color={slotDef.color} />
        <div style={{ fontWeight: 700, fontSize: '0.76rem', marginTop: '4px', color: slotDef.color }}>{slotDef.name}</div>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Kéo-thả / bấm chọn .json / .png</div>
        <input ref={inputRef} type="file" accept=".json,.png" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.currentTarget.value = ''; }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 10px', borderLeft: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: slotDef.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '0.76rem', color: slotDef.color }}>{slotDef.name}</span>
        <button onClick={onRemove} title="Gỡ card" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <Trash2 size={13} />
        </button>
      </div>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: '2px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={slot.parsed.fileName}>
        {slot.parsed.fileName}{dirty > 0 ? ` · ${dirty} chưa lưu` : ''}
      </div>
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        <button onClick={onSaveAll} disabled={dirty === 0} title="Lưu mọi chỉnh sửa của cột này vào card"
          style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 7px', fontSize: '0.63rem', borderRadius: 'var(--radius-sm)', border: 'none', background: dirty > 0 ? 'var(--accent-primary)' : 'var(--bg-elevated)', color: dirty > 0 ? '#fff' : 'var(--text-muted)', cursor: dirty > 0 ? 'pointer' : 'default' }}>
          <Save size={11} /> Lưu tất cả
        </button>
        <button onClick={onExportJson} title="Xuất card này ra JSON"
          style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 7px', fontSize: '0.63rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <FileJson size={11} /> JSON
        </button>
        {slot.parsed.isPng && (
          <button onClick={onExportPng} title="Xuất card này ra PNG (giữ ảnh gốc)"
            style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 7px', fontSize: '0.63rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <ImageIcon size={11} /> PNG
          </button>
        )}
      </div>
    </div>
  );
}

// ─── One editable cell ───
function CompareCell({ loaded, present, value, dirty, onChange, onSave }: {
  loaded: boolean; present: boolean; value: string; dirty: boolean;
  onChange: (v: string) => void; onSave: () => void;
}) {
  if (!loaded) {
    return <div style={{ padding: '8px 12px', fontSize: '0.66rem', color: 'var(--text-muted)', fontStyle: 'italic', borderLeft: '1px solid var(--border-subtle)' }}>(chưa nạp card)</div>;
  }
  if (!present) {
    return <div style={{ padding: '8px 12px', fontSize: '0.66rem', color: 'var(--text-muted)', fontStyle: 'italic', borderLeft: '1px solid var(--border-subtle)' }}>(không có mục này)</div>;
  }
  return (
    <div style={{ padding: '6px 8px', borderLeft: '1px solid var(--border-subtle)', position: 'relative', background: dirty ? 'rgba(240,196,106,0.06)' : 'transparent' }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSave(); } }}
        spellCheck={false}
        style={{
          width: '100%', minHeight: '58px', maxHeight: '320px', resize: 'vertical',
          padding: '6px 8px', fontSize: '0.7rem', lineHeight: 1.45, fontFamily: 'var(--font-mono, monospace)',
          borderRadius: 'var(--radius-sm)', border: `1px solid ${dirty ? 'var(--accent-warning)' : 'var(--border-subtle)'}`,
          background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
        }}
      />
      {dirty && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: 'var(--accent-warning)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-warning)' }} /> chưa lưu
          </span>
          <button onClick={onSave} title="Lưu vào card (Ctrl+Enter)"
            style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto', padding: '2px 8px', fontSize: '0.6rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-success, #22c55e)', color: '#fff', cursor: 'pointer' }}>
            <Save size={10} /> Lưu
          </button>
        </div>
      )}
    </div>
  );
}
