import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Sparkles, AlertTriangle, Info, Copy, Code, Sliders, Play } from 'lucide-react';
import { extractZodSchemas } from '../utils/zodSchemaEngine';

interface SchemaField {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'enum' | 'record';
  defaultValue: string;
  description: string;
  minLimit: string;
  maxLimit: string;
  enumValues: string;
}

interface StageItem {
  label: string;
  threshold: number;
  entryName: string;
}

export default function MvuEjsToolkit({ 
  card, 
  updateCard, 
  addToast 
}: { 
  card: any; 
  updateCard: (card: any) => void; 
  addToast: (level: 'success' | 'error' | 'info', msg: string) => void; 
}) {
  const [activeSubTab, setActiveSubTab] = useState<'designer' | 'statusbar' | 'multistage'>('designer');

  // --- Designer State ---
  const [fields, setFields] = useState<SchemaField[]>([]);

  // Load existing Zod Schema from card on mount
  useEffect(() => {
    if (card) {
      const schemas = extractZodSchemas(card);
      if (schemas.length > 0 && schemas[0].fields) {
        const loadedFields = schemas[0].fields.map(f => {
          let fieldType: SchemaField['type'] = 'string';
          if (f.type === 'number') fieldType = 'number';
          else if (f.type === 'boolean') fieldType = 'boolean';
          else if (f.type === 'enum') fieldType = 'enum';
          else if (f.type === 'object' || f.type === 'array') fieldType = 'record';

          return {
            name: f.name,
            type: fieldType,
            defaultValue: String(f.defaultValue !== undefined ? f.defaultValue : ''),
            description: f.description || '',
            minLimit: String(f.constraints?.min !== undefined ? f.constraints.min : ''),
            maxLimit: String(f.constraints?.max !== undefined ? f.constraints.max : ''),
            enumValues: f.constraints?.enumValues ? f.constraints.enumValues.join(', ') : ''
          };
        });
        setFields(loadedFields);
      } else {
        // Fallback default variables
        setFields([
          { name: 'hp', type: 'number', defaultValue: '100', description: 'Máu hiện tại', minLimit: '0', maxLimit: '100', enumValues: '' },
          { name: 'trang_thai', type: 'string', defaultValue: 'Bình thường', description: 'Trạng thái cơ thể', minLimit: '', maxLimit: '', enumValues: '' }
        ]);
      }
    }
  }, [card]);

  const addField = () => {
    setFields([
      ...fields,
      { name: '', type: 'number', defaultValue: '', description: '', minLimit: '', maxLimit: '', enumValues: '' }
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateFieldProp = (index: number, prop: keyof SchemaField, val: string) => {
    const next = [...fields];
    next[index] = { ...next[index], [prop]: val };
    setFields(next);
  };

  const compileZodSchema = (fieldsList: SchemaField[]): string => {
    let code = `import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';\n\n`;
    code += `export const Schema = z.object({\n`;
    fieldsList.forEach(f => {
      if (!f.name.trim()) return;
      let line = `  ${f.name}: `;
      if (f.type === 'number') {
        line += `z.coerce.number()`;
      } else if (f.type === 'string') {
        line += `z.string()`;
      } else if (f.type === 'boolean') {
        line += `z.boolean()`;
      } else if (f.type === 'enum') {
        const vals = (f.enumValues || '').split(',').map((v: string) => v.trim()).filter(Boolean);
        const valStr = vals.map((v: string) => `'${v}'`).join(', ');
        line += `z.enum([${valStr}])`;
      } else if (f.type === 'record') {
        line += `z.record(z.string(), z.object({\n`;
        line += `    mo_ta: z.string().prefault(''),\n`;
        line += `    so_luong: z.coerce.number().prefault(1)\n`;
        line += `  }))`;
      }
      
      if (f.description) {
        line += `.describe('${f.description.replace(/'/g, "\\'")}')`;
      }
      
      if (f.defaultValue !== undefined && f.defaultValue !== '') {
        let defValStr = '';
        if (f.type === 'number') {
          defValStr = String(Number(f.defaultValue) || 0);
        } else if (f.type === 'boolean') {
          defValStr = String(f.defaultValue === 'true');
        } else {
          defValStr = `'${f.defaultValue.replace(/'/g, "\\'")}'`;
        }
        line += `.prefault(${defValStr})`;
      }
      
      if (f.type === 'number' && (f.minLimit !== '' || f.maxLimit !== '')) {
        const min = f.minLimit !== '' ? Number(f.minLimit) : 0;
        const max = f.maxLimit !== '' ? Number(f.maxLimit) : 100;
        line += `.transform(v => _.clamp(v, ${min}, ${max}))`;
      }
      
      code += line + ',\n';
    });
    code += `});\n\n`;
    code += `$(() => {\n  registerMvuSchema(Schema);\n});`;
    return code;
  };

  const handleInjectSchema = () => {
    if (!card) return;
    if (fields.some(f => !f.name.trim())) {
      addToast('error', 'Tên trường không được để trống.');
      return;
    }
    const compiledCode = compileZodSchema(fields);
    const newCard = JSON.parse(JSON.stringify(card));
    
    let tavernHelper = newCard.data.extensions.tavern_helper;
    if (!tavernHelper) {
      newCard.data.extensions.tavern_helper = { scripts: [] };
      tavernHelper = newCard.data.extensions.tavern_helper;
    }

    const scriptObj = {
      name: "Cấu trúc Biến (MVU Zod Schema)",
      content: compiledCode,
      enabled: true
    };

    if (Array.isArray(tavernHelper)) {
      const scriptsTuple = tavernHelper.find(item => Array.isArray(item) && item[0] === 'scripts');
      if (scriptsTuple && Array.isArray(scriptsTuple[1])) {
        const idx = scriptsTuple[1].findIndex((s: any) => s.name === scriptObj.name || s.content?.includes('registerMvuSchema'));
        if (idx !== -1) {
          scriptsTuple[1][idx] = scriptObj;
        } else {
          scriptsTuple[1].push(scriptObj);
        }
      } else {
        const idx = tavernHelper.findIndex((s: any) => s.name === scriptObj.name || s.content?.includes('registerMvuSchema'));
        if (idx !== -1) {
          tavernHelper[idx] = scriptObj;
        } else {
          tavernHelper.push(scriptObj);
        }
      }
    } else if (tavernHelper.scripts && Array.isArray(tavernHelper.scripts)) {
      const idx = tavernHelper.scripts.findIndex((s: any) => s.name === scriptObj.name || s.content?.includes('registerMvuSchema'));
      if (idx !== -1) {
        tavernHelper.scripts[idx] = scriptObj;
      } else {
        tavernHelper.scripts.push(scriptObj);
      }
    } else {
      newCard.data.extensions.tavern_helper = { scripts: [scriptObj] };
    }

    updateCard(newCard);
    addToast('success', 'Đã tích hợp MVU Zod Schema thành công!');
  };

  // --- Status Bar State ---
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [fieldColors, setFieldColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const initialSelected: Record<string, boolean> = {};
    const initialLabels: Record<string, string> = {};
    const initialColors: Record<string, string> = {};
    
    fields.forEach(f => {
      initialSelected[f.name] = true;
      initialLabels[f.name] = f.name === 'hp' ? '🩸 Máu' : f.name === 'mp' ? '⚡ Năng Lực' : `💖 ${f.name}`;
      initialColors[f.name] = f.name === 'hp' ? '#ff4d4d' : f.name === 'mp' ? '#3b82f6' : '#eab308';
    });
    
    setSelectedFields(initialSelected);
    setFieldLabels(initialLabels);
    setFieldColors(initialColors);
  }, [fields]);

  const handleInjectStatusBar = () => {
    if (!card) return;
    const activeFields = fields.filter(f => selectedFields[f.name]);
    if (activeFields.length === 0) {
      addToast('error', 'Hãy chọn ít nhất 1 trường chỉ số để hiển thị.');
      return;
    }

    let ejsContent = `@@render_after\n@@iframe Trạng thái của nhân vật (Click để xem)\n@@if !is_user && !is_system\n<html>\n<head>\n  <style>\n    body { font-family: system-ui, sans-serif; color: #e2e8f0; margin: 0; padding: 12px; background: #0f172a; }\n    .stat-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }\n    .stat-card { border: 1px solid rgba(255,255,255,0.06); padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }\n    .stat-label { font-size: 0.72rem; color: #94a3b8; font-weight: 500; }\n    .stat-value { font-size: 1.1rem; font-weight: 700; }\n  </style>\n</head>\n<body>\n  <div class="stat-container">\n`;

    activeFields.forEach(f => {
      const label = fieldLabels[f.name] || f.name;
      const color = fieldColors[f.name] || '#a855f7';
      const defVal = f.defaultValue || '0';
      ejsContent += `    <div class="stat-card" style="border-top: 3px solid ${color};">\n`;
      ejsContent += `      <span class="stat-label">${label}</span>\n`;
      if (f.type === 'number') {
        ejsContent += `      <span class="stat-value" style="color: ${color};"><%= getvar('stat_data.${f.name}', { defaults: ${defVal} }) %></span>\n`;
      } else {
        ejsContent += `      <span class="stat-value" style="color: ${color};"><%= getvar('stat_data.${f.name}', { defaults: '${defVal}' }) %></span>\n`;
      }
      ejsContent += `    </div>\n`;
    });

    ejsContent += `  </div>\n</body>\n</html>`;

    const newCard = JSON.parse(JSON.stringify(card));
    if (!newCard.data.character_book) {
      newCard.data.character_book = { entries: [] };
    }
    const entries = newCard.data.character_book.entries || [];

    const entryComment = "[GENERATE:AFTER] - Status Bar UI";
    const newEntry = {
      id: entries.length > 0 ? Math.max(...entries.map((e: any) => e.id || 0)) + 1 : 1,
      name: entryComment,
      comment: entryComment,
      content: ejsContent,
      keys: [], 
      enabled: true,
      constant: false,
      selective: false,
      position: 100, 
      order: 100
    };

    const idx = entries.findIndex((e: any) => e.comment === entryComment || e.name === entryComment);
    if (idx !== -1) {
      entries[idx] = newEntry;
    } else {
      entries.push(newEntry);
    }

    updateCard(newCard);
    addToast('success', 'Đã chèn Thanh Trạng Thái vào Lorebook thành công!');
  };

  // --- MultiStage State ---
  const [controllerVar, setControllerVar] = useState('quan_he.hao_cam');
  const [stagesList, setStagesList] = useState<StageItem[]>([
    { label: 'Xa lạ', threshold: 0, entryName: 'NhanVat_GiaiDoan_XaLa' },
    { label: 'Quen thuộc', threshold: 30, entryName: 'NhanVat_GiaiDoan_QuenThuoc' },
    { label: 'Thân thiết', threshold: 60, entryName: 'NhanVat_GiaiDoan_ThanThiet' }
  ]);
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newStageThreshold, setNewStageThreshold] = useState('');

  const addStage = () => {
    if (!newStageLabel.trim() || newStageThreshold === '') return;
    const threshold = Number(newStageThreshold);
    // Create clean key representation
    const cleanLabel = newStageLabel.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '');
    const entryName = `NhanVat_GiaiDoan_${cleanLabel}`;
    
    setStagesList([...stagesList, { label: newStageLabel.trim(), threshold, entryName }]);
    setNewStageLabel('');
    setNewStageThreshold('');
  };

  const removeStage = (index: number) => {
    setStagesList(stagesList.filter((_, i) => i !== index));
  };

  const handleInjectMultiStage = () => {
    if (!card) return;
    if (stagesList.length === 0) {
      addToast('error', 'Hãy thêm ít nhất một giai đoạn.');
      return;
    }

    const sortedStages = [...stagesList].sort((a, b) => a.threshold - b.threshold);
    let controllerContent = `<%_\nif (typeof val === 'undefined') var val = getvar('stat_data.${controllerVar}', { defaults: 0 });\n_%>\n\n`;
    
    for (let i = 0; i < sortedStages.length; i++) {
      const stage = sortedStages[i];
      const nextStage = sortedStages[i + 1];
      
      const condition = nextStage 
        ? `val >= ${stage.threshold} && val < ${nextStage.threshold}`
        : `val >= ${stage.threshold}`;
      
      const ifType = i === 0 ? 'if' : 'else if';
      controllerContent += `<%_ ${ifType} (${condition}) { _%>\n<%- await getwi('${stage.entryName}') %>\n`;
    }
    controllerContent += `<%_ } _%>`;

    const newCard = JSON.parse(JSON.stringify(card));
    if (!newCard.data.character_book) {
      newCard.data.character_book = { entries: [] };
    }
    const entries = newCard.data.character_book.entries || [];
    let currentMaxId = entries.length > 0 ? Math.max(...entries.map((e: any) => e.id || 0)) : 0;

    const controllerComment = `[Controller] - Đa Giai Đoạn (${controllerVar})`;
    const controllerEntry = {
      id: ++currentMaxId,
      name: controllerComment,
      comment: controllerComment,
      content: controllerContent,
      keys: ['*'], 
      enabled: true,
      constant: false,
      selective: false,
      position: 10,
      order: 10
    };

    const cIdx = entries.findIndex((e: any) => e.comment === controllerComment || e.name === controllerComment);
    if (cIdx !== -1) {
      entries[cIdx] = controllerEntry;
    } else {
      entries.push(controllerEntry);
    }

    sortedStages.forEach(stage => {
      const stageEntry = {
        id: ++currentMaxId,
        name: stage.entryName,
        comment: `Giai đoạn: ${stage.label} (Hệ thống tự tạo)`,
        content: `[MÔ TẢ GIAI ĐOẠN ${stage.label.toUpperCase()}]\n(Điền thông tin và phản ứng của nhân vật khi đạt chỉ số ở đây...)`,
        keys: [],
        enabled: false, 
        constant: false,
        selective: false,
        position: 10,
        order: 10
      };

      const sIdx = entries.findIndex((e: any) => e.name === stage.entryName);
      if (sIdx !== -1) {
        entries[sIdx] = {
          ...stageEntry,
          content: entries[sIdx].content || stageEntry.content
        };
      } else {
        entries.push(stageEntry);
      }
    });

    updateCard(newCard);
    addToast('success', `Đã tự tạo 1 Controller và ${sortedStages.length} entry giai đoạn thành công!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Subtabs header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '14px', flexShrink: 0 }}>
        <button
          onClick={() => setActiveSubTab('designer')}
          style={{
            flex: 1, padding: '8px 4px', fontSize: '0.78rem', background: 'transparent', border: 'none',
            borderBottom: activeSubTab === 'designer' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeSubTab === 'designer' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeSubTab === 'designer' ? 600 : 400, cursor: 'pointer'
          }}
        >
          Schema Designer
        </button>
        <button
          onClick={() => setActiveSubTab('statusbar')}
          style={{
            flex: 1, padding: '8px 4px', fontSize: '0.78rem', background: 'transparent', border: 'none',
            borderBottom: activeSubTab === 'statusbar' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeSubTab === 'statusbar' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeSubTab === 'statusbar' ? 600 : 400, cursor: 'pointer'
          }}
        >
          Status Bar UI
        </button>
        <button
          onClick={() => setActiveSubTab('multistage')}
          style={{
            flex: 1, padding: '8px 4px', fontSize: '0.78rem', background: 'transparent', border: 'none',
            borderBottom: activeSubTab === 'multistage' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeSubTab === 'multistage' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeSubTab === 'multistage' ? 600 : 400, cursor: 'pointer'
          }}
        >
          Đa Giai Đoạn
        </button>
      </div>

      {/* Subtab contents */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* --- DESIGNER TAB --- */}
        {activeSubTab === 'designer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '8px 10px', background: 'rgba(99,102,241,0.06)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
              <Info size={16} style={{ flexShrink: 0, color: 'var(--accent-primary)', marginTop: '1px' }} />
              <span>Thiết kế lược đồ MVU Zod 4. Hệ thống sẽ tự ép kiểu, xử lý an toàn trị số và đưa vào TavernHelper.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fields.map((f, i) => (
                <div key={i} style={{ border: '1px solid var(--border-default)', borderRadius: '6px', padding: '10px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Tên trường (VD: hp)"
                      value={f.name}
                      onChange={e => updateFieldProp(i, 'name', e.target.value)}
                      style={{ flex: 1, padding: '5px 8px', fontSize: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                    />
                    <select
                      value={f.type}
                      onChange={e => updateFieldProp(i, 'type', e.target.value as any)}
                      style={{ padding: '5px', fontSize: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }}
                    >
                      <option value="number">Số (Number)</option>
                      <option value="string">Chữ (String)</option>
                      <option value="boolean">Bật/Tắt (Boolean)</option>
                      <option value="enum">Lựa chọn (Enum)</option>
                      <option value="record">Túi đồ (Record)</option>
                    </select>
                    <button
                      onClick={() => removeField(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Mặc định (VD: 100)"
                      value={f.defaultValue}
                      onChange={e => updateFieldProp(i, 'defaultValue', e.target.value)}
                      style={{ flex: 1, padding: '4px 6px', fontSize: '0.72rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      placeholder="Chú thích biến"
                      value={f.description}
                      onChange={e => updateFieldProp(i, 'description', e.target.value)}
                      style={{ flex: 2, padding: '4px 6px', fontSize: '0.72rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }}
                    />
                  </div>

                  {f.type === 'number' && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Giới hạn trị số:</span>
                      <input
                        type="number"
                        placeholder="Min"
                        value={f.minLimit}
                        onChange={e => updateFieldProp(i, 'minLimit', e.target.value)}
                        style={{ width: '60px', padding: '3px 5px', fontSize: '0.7rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={f.maxLimit}
                        onChange={e => updateFieldProp(i, 'maxLimit', e.target.value)}
                        style={{ width: '60px', padding: '3px 5px', fontSize: '0.7rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }}
                      />
                    </div>
                  )}

                  {f.type === 'enum' && (
                    <input
                      type="text"
                      placeholder="Các giá trị (Cách nhau bằng dấu phẩy, VD: Xa lạ, Quen thuộc)"
                      value={f.enumValues}
                      onChange={e => updateFieldProp(i, 'enumValues', e.target.value)}
                      style={{ padding: '4px 6px', fontSize: '0.72rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={addField}
                style={{
                  flex: 1, padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Plus size={14} /> Thêm Biến Mới
              </button>
              <button
                onClick={handleInjectSchema}
                style={{
                  flex: 1, padding: '7px 10px', background: 'var(--accent-primary)', border: 'none',
                  borderRadius: '6px', color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Check size={14} /> Tích Hợp Schema
              </button>
            </div>
          </div>
        )}

        {/* --- STATUS BAR TAB --- */}
        {activeSubTab === 'statusbar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '8px 10px', background: 'rgba(234,179,8,0.06)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
              <Info size={16} style={{ flexShrink: 0, color: 'var(--accent-warning)', marginTop: '1px' }} />
              <span>Thiết kế thanh hiển thị chỉ số trực quan ở cuối tin nhắn. Sử dụng hộp iframe chống xung đột CSS.</span>
            </div>

            {fields.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Vui lòng định nghĩa hoặc tải schema ở tab Thiết Kế trước.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fields.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '8px 10px' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedFields[f.name]}
                      onChange={e => setSelectedFields({ ...selectedFields, [f.name]: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{f.name}</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Nhãn hiển thị (VD: HP)"
                      value={fieldLabels[f.name] || ''}
                      onChange={e => setFieldLabels({ ...fieldLabels, [f.name]: e.target.value })}
                      style={{ width: '100px', padding: '3px 6px', fontSize: '0.72rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }}
                    />

                    <input
                      type="color"
                      value={fieldColors[f.name] || '#ffffff'}
                      onChange={e => setFieldColors({ ...fieldColors, [f.name]: e.target.value })}
                      style={{ width: '32px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                  </div>
                ))}

                <button
                  onClick={handleInjectStatusBar}
                  style={{
                    width: '100%', padding: '8px', background: 'var(--accent-primary)', border: 'none',
                    borderRadius: '6px', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px'
                  }}
                >
                  <Sparkles size={14} /> Chèn Status Bar Vào Lorebook
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- MULTISTAGE TAB --- */}
        {activeSubTab === 'multistage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '8px 10px', background: 'rgba(168,85,247,0.06)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
              <Info size={16} style={{ flexShrink: 0, color: 'var(--accent-secondary)', marginTop: '1px' }} />
              <span>Tạo bộ chuyển trạng thái nhân vật tự động. Một entry Controller sẽ điều phối nạp các entry Giai đoạn dựa trên mốc chỉ số.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Chỉ số điều khiển (Ví dụ: quan_he.hao_cam)</label>
                <input
                  type="text"
                  value={controllerVar}
                  onChange={e => setControllerVar(e.target.value)}
                  style={{ padding: '6px', fontSize: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>Danh sách các giai đoạn nhân vật</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                  {stagesList.map((stage, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '6px 10px' }}>
                      <div style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600 }}>{stage.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mốc: {stage.threshold}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage.entryName}</div>
                      <button
                        onClick={() => removeStage(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px', border: '1px dashed var(--border-default)', borderRadius: '6px' }}>
                  <input
                    type="text"
                    placeholder="Tên giai đoạn"
                    value={newStageLabel}
                    onChange={e => setNewStageLabel(e.target.value)}
                    style={{ flex: 2, padding: '4px 6px', fontSize: '0.72rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="number"
                    placeholder="Mốc"
                    value={newStageThreshold}
                    onChange={e => setNewStageThreshold(e.target.value)}
                    style={{ flex: 1, width: '60px', padding: '4px 6px', fontSize: '0.72rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={addStage}
                    style={{
                      padding: '5px 8px', background: 'var(--accent-secondary)', border: 'none', borderRadius: '4px',
                      color: 'white', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Thêm
                  </button>
                </div>
              </div>

              <button
                onClick={handleInjectMultiStage}
                style={{
                  width: '100%', padding: '8px', background: 'var(--accent-primary)', border: 'none',
                  borderRadius: '6px', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px'
                }}
              >
                <Code size={14} /> Khởi Tạo Đa Giai Đoạn Vào Lorebook
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
