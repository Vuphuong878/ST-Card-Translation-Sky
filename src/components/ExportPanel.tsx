import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { useT } from '../i18n/useLocale';
import { Download, AlertTriangle, Image as ImageIcon, KeyRound, Code, Activity, FileText, XCircle, Info } from 'lucide-react';
import { embedCharaToPNG } from '../utils/pngHandler';
import { cardToWorldbook } from '../utils/worldbookParser';
import { setNestedValue } from '../utils/cardFields';
import { scanFieldsHealth, buildTranslationReport, type HealthSeverity } from '../utils/cardHealth';
import type { ExportKeyMode } from '../types/card';

const KEY_MODE_OPTIONS: { value: ExportKeyMode; labelEn: string; labelVi: string; desc: string }[] = [
  { value: 'merge', labelEn: 'Merge (Both)', labelVi: 'Gộp (Cả hai)', desc: '原Key + 译Key' },
  { value: 'translated_only', labelEn: 'Translated Only', labelVi: 'Chỉ bản dịch', desc: '译Key only' },
  { value: 'original_only', labelEn: 'Original Only', labelVi: 'Chỉ bản gốc', desc: '原Key only' },
];

export default function ExportPanel() {
  const { card, fields, cardFileName, originalImage, _pngArrayBuffer, translationConfig, setTranslationConfig, phase, saveTranslationCache, locale, contentType, originalWorldbook, setJumpToFieldPath } = useStore();
  const { getExportCard } = useTranslation();
  const t = useT();
  const isWorldbook = contentType === 'worldbook';

  const doneCount = fields.filter((f) => f.status === 'done').length;
  const hasLorebookKeys = fields.some(f => f.group === 'lorebook_keys');

  // 🩺 Sức khoẻ thẻ — quét nội dung bản dịch (script vỡ / chữ Hán sót / thuật ngữ chưa áp) chứ không chỉ trạng thái trường.
  const health = useMemo(() => scanFieldsHealth(fields, translationConfig.glossary), [fields, translationConfig.glossary]);
  const [showIssues, setShowIssues] = useState(false);

  const handleExportReport = () => {
    const md = buildTranslationReport(fields, cardFileName || 'card', health);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const baseName = (cardFileName || 'card').replace(/\.(json|png)$/i, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_bao-cao-dich.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    // Auto-save translation cache before export
    saveTranslationCache();

    const exportCard = getExportCard();
    if (!exportCard) return;

    // If worldbook mode, convert back to worldbook format
    let exportData: unknown;
    if (isWorldbook && originalWorldbook) {
      exportData = cardToWorldbook(exportCard, originalWorldbook);
    } else {
      exportData = exportCard;
    }

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Generate filename
    const baseName = cardFileName.replace(/\.json$/i, '');
    const langSuffix = translationConfig.targetLanguage === 'Tiếng Việt'
      ? 'vi'
      : translationConfig.targetLanguage === 'English'
        ? 'en'
        : translationConfig.targetLanguage === '日本語'
          ? 'ja'
          : translationConfig.targetLanguage === '한국어'
            ? 'ko'
            : translationConfig.targetLanguage.slice(0, 2).toLowerCase();
    const fileName = `${baseName}_${langSuffix}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPng = async () => {
    if (!originalImage) return;
    // Auto-save translation cache
    saveTranslationCache();

    const exportCard = getExportCard();
    if (!exportCard) return;

    try {
      const json = JSON.stringify(exportCard);
      // Prefer _pngArrayBuffer if available (especially after reload), fallback to originalImage
      const imageData = _pngArrayBuffer || originalImage;
      const dataUrl = await embedCharaToPNG(imageData, json);
      
      const baseName = cardFileName.replace(/\.(json|png)$/i, '');
      const langSuffix = translationConfig.targetLanguage === 'Tiếng Việt' ? 'vi' : 'translated';
      const fileName = `${baseName}_${langSuffix}.png`;

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      a.click();
    } catch (e) {
      console.error('Failed to export PNG:', e);
      alert('Failed to export PNG');
    }
  };

  // Reconstruct translated regex scripts
  const translatedRegexes = useMemo(() => {
    if (!card || !card.data || !card.data.extensions || !card.data.extensions.regex_scripts) {
      return [];
    }
    const originalRegexScripts = card.data.extensions.regex_scripts;
    
    // Find all fields in group 'regex' with status === 'done' and non-empty translated content
    const doneRegexFields = fields.filter(
      (f) => f.group === 'regex' && f.status === 'done' && f.translated
    );
    
    if (doneRegexFields.length === 0) return [];
    
    // Group fields by script index
    const fieldsByScriptIndex: Record<number, typeof doneRegexFields> = {};
    for (const field of doneRegexFields) {
      const match = field.path.match(/^data\.extensions\.regex_scripts\[(\d+)\]\.(.+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (!fieldsByScriptIndex[idx]) {
          fieldsByScriptIndex[idx] = [];
        }
        fieldsByScriptIndex[idx].push(field);
      }
    }
    
    // Reconstruct
    const results = [];
    for (const idxStr of Object.keys(fieldsByScriptIndex)) {
      const idx = parseInt(idxStr, 10);
      const originalScript = originalRegexScripts[idx];
      if (!originalScript) continue;
      
      const cloned = JSON.parse(JSON.stringify(originalScript));
      const scriptFields = fieldsByScriptIndex[idx];
      for (const field of scriptFields) {
        const match = field.path.match(/^data\.extensions\.regex_scripts\[(\d+)\]\.(.+)$/);
        if (match) {
          const relativePath = match[2];
          setNestedValue(cloned, relativePath, field.translated);
        }
      }
      results.push({
        index: idx,
        scriptName: cloned.scriptName || `Regex Script ${idx}`,
        script: cloned,
      });
    }
    return results;
  }, [card, fields]);

  // Reconstruct translated TavernHelper scripts
  const translatedTavernHelpers = useMemo(() => {
    if (!card || !card.data || !card.data.extensions) {
      return [];
    }
    const doneTavernHelperFields = fields.filter(
      (f) => f.group === 'tavern_helper' && f.status === 'done' && f.translated
    );
    
    if (doneTavernHelperFields.length === 0) return [];
    
    const fieldsByScript: Record<string, { key: string; scriptIndex: number; fields: typeof doneTavernHelperFields }> = {};
    
    for (const field of doneTavernHelperFields) {
      let key = '';
      let scriptIndex = -1;
      
      // Pattern 1: Tuple format
      const matchTuple = field.path.match(/^data\.extensions\.([a-zA-Z0-9_]+)\[\d+\]\[1\]\[(\d+)\]\.(.+)$/);
      if (matchTuple) {
        key = matchTuple[1];
        scriptIndex = parseInt(matchTuple[2], 10);
      } else {
        // Pattern 2: scripts array format
        const matchScripts = field.path.match(/^data\.extensions\.([a-zA-Z0-9_]+)\.scripts\[(\d+)\]\.(.+)$/);
        if (matchScripts) {
          key = matchScripts[1];
          scriptIndex = parseInt(matchScripts[2], 10);
        } else {
          // Pattern 3: direct array format
          const matchDirect = field.path.match(/^data\.extensions\.([a-zA-Z0-9_]+)\[(\d+)\]\.(.+)$/);
          if (matchDirect && matchDirect[1] !== 'regex_scripts') {
            key = matchDirect[1];
            scriptIndex = parseInt(matchDirect[2], 10);
          }
        }
      }
      
      if (key && scriptIndex !== -1) {
        const id = `${key}_${scriptIndex}`;
        if (!fieldsByScript[id]) {
          fieldsByScript[id] = { key, scriptIndex, fields: [] };
        }
        fieldsByScript[id].fields.push(field);
      }
    }
    
    const results = [];
    for (const id of Object.keys(fieldsByScript)) {
      const { key, scriptIndex, fields: scriptFields } = fieldsByScript[id];
      const extData = card.data.extensions[key];
      if (!extData) continue;
      
      let originalScript: any = null;
      if (Array.isArray(extData)) {
        const tupleEntry = extData.find(
          (item: any) => Array.isArray(item) && item[0] === 'scripts' && Array.isArray(item[1])
        );
        if (tupleEntry) {
          originalScript = tupleEntry[1][scriptIndex];
        } else {
          originalScript = extData[scriptIndex];
        }
      } else if (extData && typeof extData === 'object' && 'scripts' in extData && Array.isArray((extData as any).scripts)) {
        originalScript = (extData as any).scripts[scriptIndex];
      }
      
      if (!originalScript) continue;
      
      const cloned = JSON.parse(JSON.stringify(originalScript));
      for (const field of scriptFields) {
        let relPath = '';
        const matchT = field.path.match(/^data\.extensions\.([a-zA-Z0-9_]+)\[\d+\]\[1\]\[(\d+)\]\.(.+)$/);
        if (matchT) relPath = matchT[3];
        else {
          const matchS = field.path.match(/^data\.extensions\.([a-zA-Z0-9_]+)\.scripts\[(\d+)\]\.(.+)$/);
          if (matchS) relPath = matchS[3];
          else {
            const matchD = field.path.match(/^data\.extensions\.([a-zA-Z0-9_]+)\[(\d+)\]\.(.+)$/);
            if (matchD) relPath = matchD[3];
          }
        }
        
        if (relPath) {
          setNestedValue(cloned, relPath, field.translated);
        }
      }
      results.push({
        key,
        index: scriptIndex,
        name: cloned.name || `TavernHelper Script ${scriptIndex}`,
        script: cloned,
      });
    }
    return results;
  }, [card, fields]);

  if (!card || fields.length === 0) return null;

  const handleExportSingleRegex = (script: any, name: string) => {
    const json = JSON.stringify(script, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const baseName = cardFileName.replace(/\.(json|png)$/i, '');
    const cleanName = name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9-]/g, '_');
    const fileName = `${baseName}_regex_${cleanName}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAllRegex = () => {
    const scripts = translatedRegexes.map(r => r.script);
    const json = JSON.stringify(scripts, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const baseName = cardFileName.replace(/\.(json|png)$/i, '');
    const fileName = `${baseName}_regex_all.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSingleTavernHelper = (script: any, name: string) => {
    const json = JSON.stringify(script, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const baseName = cardFileName.replace(/\.(json|png)$/i, '');
    const cleanName = name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9-]/g, '_');
    const fileName = `${baseName}_th_${cleanName}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAllTavernHelper = () => {
    const scripts = translatedTavernHelpers.map(t => t.script);
    const json = JSON.stringify(scripts, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const baseName = cardFileName.replace(/\.(json|png)$/i, '');
    const fileName = `${baseName}_th_all.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card fade-in" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{t.stepExport}</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {doneCount}/{fields.length} {t.fieldsTranslated}
        </span>
      </div>

      {/* 🩺 Sức khoẻ thẻ — kiểm nội dung TRƯỚC khi xuất (script vỡ / chữ Hán sót / trường lỗi) */}
      <div
        style={{
          padding: '10px 12px',
          background: health.ok ? 'rgba(80, 200, 120, 0.06)' : 'rgba(240, 100, 100, 0.07)',
          border: `1px solid ${health.ok ? 'rgba(80,200,120,0.25)' : 'rgba(240,100,100,0.3)'}`,
          borderRadius: 'var(--radius-md)',
          marginBottom: '12px',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: health.issues.length ? '8px' : 0 }}>
          <Activity size={15} style={{ flexShrink: 0, color: health.ok ? 'var(--accent-success)' : 'var(--accent-danger)' }} />
          <span style={{ fontWeight: 600, color: health.ok ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {health.ok
              ? (locale === 'vi' ? 'Sức khoẻ thẻ: an toàn để xuất' : 'Card health: safe to export')
              : (locale === 'vi'
                  ? `Sức khoẻ thẻ: còn ${health.issues.filter(i => i.severity === 'error').length} vấn đề nặng nên sửa trước khi xuất`
                  : `Card health: ${health.issues.filter(i => i.severity === 'error').length} serious issue(s) to fix before export`)}
          </span>
        </div>

        {/* Chỉ số nhanh */}
        {(health.counts.error > 0 || health.counts.brokenScripts > 0 || health.counts.residualCjkCode > 0 || health.counts.residualCjkText > 0 || health.counts.pending > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {health.counts.error > 0 && <span>❌ {health.counts.error} trường lỗi</span>}
            {health.counts.pending > 0 && <span>⏳ {health.counts.pending} chưa xong</span>}
            {health.counts.brokenScripts > 0 && <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>💥 {health.counts.brokenScripts} script vỡ</span>}
            {health.counts.residualCjkCode > 0 && <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>🈲 {health.counts.residualCjkCode} chữ Hán trong code</span>}
            {health.counts.residualCjkText > 0 && <span>🔤 {health.counts.residualCjkText} trường còn chữ Hán</span>}
            {health.counts.glossaryUnapplied > 0 && <span>📖 {health.counts.glossaryUnapplied} trường lệch thuật ngữ</span>}
          </div>
        )}

        {/* Danh sách chi tiết (thu gọn) */}
        {health.issues.length > 0 && (
          <>
            <button
              onClick={() => setShowIssues(v => !v)}
              style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {showIssues ? '▾ Ẩn chi tiết' : `▸ Xem chi tiết (${health.issues.length})`}
            </button>
            {showIssues && (
              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '220px', overflow: 'auto' }}>
                {health.issues.slice(0, 60).map((iss, idx) => (
                  <div
                    key={idx}
                    onClick={() => setJumpToFieldPath(iss.path)}
                    title={locale === 'vi' ? 'Bấm để nhảy tới trường này ở bảng Field bên dưới' : 'Click to jump to this field below'}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', borderRadius: 'var(--radius-sm)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(124,106,240,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <IssueIcon severity={iss.severity} />
                    <span><b>{iss.label}</b> — {iss.detail} <span style={{ color: 'var(--text-muted)', fontSize: '0.64rem' }}>{iss.path}</span> <span style={{ color: 'var(--accent-primary)', fontSize: '0.64rem' }}>↪ tới</span></span>
                  </div>
                ))}
                {health.issues.length > 60 && (
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>… và {health.issues.length - 60} vấn đề nữa (xem đầy đủ trong báo cáo).</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lorebook Key Mode Selector */}
      {hasLorebookKeys && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
            marginBottom: '6px',
          }}>
            <KeyRound size={13} />
            {locale === 'vi' ? 'Chế độ xuất từ khóa Lorebook' : 'Lorebook Key Export Mode'}
          </div>
          <div style={{
            display: 'flex', gap: '4px',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px',
            border: '1px solid var(--border-subtle)',
          }}>
            {KEY_MODE_OPTIONS.map(opt => {
              const isActive = translationConfig.exportKeyMode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTranslationConfig({ exportKeyMode: opt.value })}
                  style={{
                    flex: 1,
                    padding: '5px 4px',
                    fontSize: '0.7rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                    background: isActive ? 'rgba(124,106,240,0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(124,106,240,0.25)' : '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    lineHeight: 1.3,
                    textAlign: 'center',
                  }}
                  title={opt.desc}
                >
                  {locale === 'vi' ? opt.labelVi : opt.labelEn}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {translationConfig.exportKeyMode === 'merge'
              ? (locale === 'vi' ? 'Giữ từ khóa gốc + thêm từ khóa đã dịch (khuyến nghị)' : 'Keep original + add translated keywords (recommended)')
              : translationConfig.exportKeyMode === 'translated_only'
                ? (locale === 'vi' ? 'Chỉ giữ từ khóa đã dịch, xóa từ khóa gốc' : 'Keep only translated keywords, remove originals')
                : (locale === 'vi' ? 'Giữ nguyên từ khóa gốc, bỏ qua bản dịch' : 'Keep original keywords unchanged, ignore translations')
            }
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={phase === 'translating' || doneCount === 0}
          style={{ width: '100%' }}
        >
          <Download size={16} />
          {t.downloadJson}
        </button>

        {originalImage && !isWorldbook && (
          <button
            className="btn btn-secondary"
            onClick={handleExportPng}
            disabled={phase === 'translating' || doneCount === 0}
            style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <ImageIcon size={16} />
            {t.downloadPng || 'Download PNG'}
          </button>
        )}

        {/* 📄 Báo cáo dịch — tổng quan + danh sách vấn đề (Markdown tải về) */}
        <button
          className="btn btn-secondary"
          onClick={handleExportReport}
          disabled={fields.length === 0}
          style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          title={locale === 'vi' ? 'Tải file .md tổng hợp: đã dịch/lỗi/bỏ qua + script vỡ + chữ Hán sót' : 'Download a .md summary report'}
        >
          <FileText size={15} />
          {locale === 'vi' ? 'Xuất báo cáo dịch (.md)' : 'Export translation report (.md)'}
        </button>
      </div>

      {/* Script Export Section */}
      {(translatedRegexes.length > 0 || translatedTavernHelpers.length > 0) && (
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
            <Code size={15} style={{ color: 'var(--accent-primary)' }} />
            {locale === 'vi' ? 'Xuất Script đã Dịch/Mod' : 'Export Translated/Modded Scripts'}
          </div>
          
          {translatedRegexes.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Regex Scripts ({translatedRegexes.length})</span>
                {translatedRegexes.length > 1 && (
                  <button
                    onClick={handleExportAllRegex}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(124, 106, 240, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    title={locale === 'vi' ? 'Xuất toàn bộ regex thành file JSON mảng' : 'Export all regex as a single JSON array file'}
                  >
                    <Download size={11} />
                    {locale === 'vi' ? 'Tải tất cả' : 'Download all'}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                {translatedRegexes.map((item) => (
                  <div 
                    key={`regex-${item.index}`} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '6px 10px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid var(--border-subtle)',
                      transition: 'border-color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(124, 106, 240, 0.3)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                  >
                    <span 
                      style={{ 
                        fontSize: '0.7rem', 
                        color: 'var(--text-primary)', 
                        fontWeight: 500,
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap', 
                        maxWidth: '220px' 
                      }} 
                      title={item.scriptName}
                    >
                      {item.scriptName}
                    </span>
                    <button
                      onClick={() => handleExportSingleRegex(item.script, item.scriptName)}
                      style={{ 
                        padding: '4px 8px', 
                        cursor: 'pointer', 
                        background: 'rgba(124, 106, 240, 0.1)', 
                        border: '1px solid rgba(124, 106, 240, 0.2)', 
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(124, 106, 240, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(124, 106, 240, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(124, 106, 240, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(124, 106, 240, 0.2)';
                      }}
                      title={locale === 'vi' ? 'Tải Regex JSON' : 'Download Regex JSON'}
                    >
                      <Download size={11} />
                      JSON
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {translatedTavernHelpers.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>TavernHelper Scripts ({translatedTavernHelpers.length})</span>
                {translatedTavernHelpers.length > 1 && (
                  <button
                    onClick={handleExportAllTavernHelper}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(124, 106, 240, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    title={locale === 'vi' ? 'Xuất toàn bộ TavernHelper thành file JSON mảng' : 'Export all TavernHelper as a single JSON array file'}
                  >
                    <Download size={11} />
                    {locale === 'vi' ? 'Tải tất cả' : 'Download all'}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                {translatedTavernHelpers.map((item) => (
                  <div 
                    key={`th-${item.key}-${item.index}`} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '6px 10px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid var(--border-subtle)',
                      transition: 'border-color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(124, 106, 240, 0.3)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                  >
                    <span 
                      style={{ 
                        fontSize: '0.7rem', 
                        color: 'var(--text-primary)', 
                        fontWeight: 500,
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap', 
                        maxWidth: '220px' 
                      }} 
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    <button
                      onClick={() => handleExportSingleTavernHelper(item.script, item.name)}
                      style={{ 
                        padding: '4px 8px', 
                        cursor: 'pointer', 
                        background: 'rgba(124, 106, 240, 0.1)', 
                        border: '1px solid rgba(124, 106, 240, 0.2)', 
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(124, 106, 240, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(124, 106, 240, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(124, 106, 240, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(124, 106, 240, 0.2)';
                      }}
                      title={locale === 'vi' ? 'Tải TavernHelper JSON' : 'Download TavernHelper JSON'}
                    >
                      <Download size={11} />
                      JSON
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Icon nhỏ theo mức độ vấn đề trong danh sách sức khoẻ thẻ. */
function IssueIcon({ severity }: { severity: HealthSeverity }) {
  if (severity === 'error') return <XCircle size={12} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-danger)' }} />;
  if (severity === 'warning') return <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-warning)' }} />;
  return <Info size={12} style={{ flexShrink: 0, marginTop: 1, color: 'var(--text-muted)' }} />;
}
