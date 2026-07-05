'use client';

import React, { useState } from 'react';

export interface ModRule {
  id: string;
  name: string;
  type: string;
  keywords: string;
  oldTheme: string;
  newTheme: string;
  details: string;
  enabled: boolean;
}

interface ModRulesManagerProps {
  rules: ModRule[];
  onChange: (rules: ModRule[]) => void;
}

export default function ModRulesManager({ rules, onChange }: ModRulesManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentRule, setCurrentRule] = useState<ModRule | null>(null);

  const addRule = () => {
    setCurrentRule({
      id: `RULE-${Date.now()}`,
      name: '',
      type: 'semantic_transform',
      keywords: '',
      oldTheme: '',
      newTheme: '',
      details: '',
      enabled: true
    });
    setIsEditing(true);
  };

  const saveRule = () => {
    if (!currentRule) return;
    const existing = rules.findIndex(r => r.id === currentRule.id);
    const newRules = [...rules];
    if (existing >= 0) {
      newRules[existing] = currentRule;
    } else {
      newRules.push(currentRule);
    }
    onChange(newRules);
    setIsEditing(false);
  };

  const toggleRule = (id: string) => {
    const newRules = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    onChange(newRules);
  };

  const removeRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-extrabold text-gray-950">Mod Rules</h2>
        <button 
          onClick={addRule}
          className="bg-blue-600 text-white px-3 py-1.5 rounded font-bold text-sm hover:bg-blue-700"
        >
          + Thêm Rule
        </button>
      </div>

      {rules.length === 0 && !isEditing && (
        <p className="text-gray-800 font-semibold text-sm">Chưa có quy tắc mod nào được thiết lập.</p>
      )}

      <ul className="space-y-3 mb-4">
        {rules.map(rule => (
          <li key={rule.id} className="p-3 border rounded-md flex justify-between items-start bg-gray-50">
            <div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={rule.enabled} 
                  onChange={() => toggleRule(rule.id)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="font-bold text-gray-950">{rule.name || rule.id}</span>
                <span className="text-xs bg-gray-300 px-2 py-0.5 rounded text-gray-900 font-bold">{rule.type}</span>
              </div>
              <p className="text-xs text-gray-800 font-medium mt-1 line-clamp-2">{rule.details}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { setCurrentRule(rule); setIsEditing(true); }}
                className="text-blue-500 text-sm hover:underline"
              >
                Sửa
              </button>
              <button 
                onClick={() => removeRule(rule.id)}
                className="text-red-500 text-sm hover:underline"
              >
                Xóa
              </button>
            </div>
          </li>
        ))}
      </ul>

      {isEditing && currentRule && (
        <div className="mt-4 p-4 border rounded-md bg-blue-50/50">
          <h3 className="font-bold text-gray-950 mb-3">Chỉnh sửa Rule</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-950">Tên quy tắc</label>
              <input 
                type="text" 
                value={currentRule.name}
                onChange={e => setCurrentRule({...currentRule, name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-medium text-gray-900"
                placeholder="VD: Đổi Theme NTR → NTL"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-950">Theme cũ</label>
                <input 
                  type="text" 
                  value={currentRule.oldTheme}
                  onChange={e => setCurrentRule({...currentRule, oldTheme: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border font-medium text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-950">Theme mới</label>
                <input 
                  type="text" 
                  value={currentRule.newTheme}
                  onChange={e => setCurrentRule({...currentRule, newTheme: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border font-medium text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-950">Từ khóa nhận biết (cách nhau dấu phẩy)</label>
              <input 
                type="text" 
                value={currentRule.keywords}
                onChange={e => setCurrentRule({...currentRule, keywords: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border font-medium text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-950">Chi tiết thay đổi</label>
              <textarea 
                value={currentRule.details}
                onChange={e => setCurrentRule({...currentRule, details: e.target.value})}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 border font-medium text-gray-900"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
              >
                Hủy
              </button>
              <button 
                onClick={saveRule}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
