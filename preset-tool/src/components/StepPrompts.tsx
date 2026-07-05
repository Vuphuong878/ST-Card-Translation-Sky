import React, { useState } from 'react';
import { useApp } from '../storeContext';
import { PromptBlock } from '../types';
import { Plus, Trash2, Edit3, Save, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';

export const StepPrompts: React.FC = () => {
  const { 
    activeProject, 
    addPromptBlock, 
    updatePromptBlock, 
    deletePromptBlock,
    reorderPrompts,
    addToast
  } = useApp();

  const prompts = activeProject.preset.prompts;

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PromptBlock>>({});

  // Adding state
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState<Omit<PromptBlock, 'identifier'>>({
    name: '',
    role: 'system',
    system_prompt: true,
    content: '',
    enabled: true,
    injection_position: 0,
    injection_depth: 4,
    injection_order: 100,
    forbid_overrides: false,
  });

  const handleStartEdit = (p: PromptBlock) => {
    setEditingId(p.identifier);
    setEditForm({ ...p });
  };

  const handleSaveEdit = () => {
    if (editingId) {
      if (!editForm.name?.trim()) {
        addToast("Tên prompt không được để trống!", "warning");
        return;
      }
      updatePromptBlock(editingId, editForm);
      setEditingId(null);
      addToast("Đã lưu prompt block thành công.", "success");
    }
  };

  const handleAddPrompt = () => {
    if (!newForm.name.trim()) {
      addToast("Tên prompt không được để trống!", "warning");
      return;
    }
    addPromptBlock(newForm);
    setIsAdding(false);
    setNewForm({
      name: '',
      role: 'system',
      system_prompt: true,
      content: '',
      enabled: true,
      injection_position: 0,
      injection_depth: 4,
      injection_order: 100,
      forbid_overrides: false,
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= prompts.length) return;
    
    const reorderedIds = [...prompts.map(p => p.identifier)];
    const temp = reorderedIds[index];
    reorderedIds[index] = reorderedIds[targetIndex];
    reorderedIds[targetIndex] = temp;
    reorderPrompts(reorderedIds);
  };

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      
      {/* Step Header */}
      <div className="flex justify-between items-center bg-theme-panel border border-theme-border rounded-xl p-4">
        <div>
          <h3 className="text-sm font-semibold text-purple-400">📝 Quản lý danh sách các Prompt Blocks</h3>
          <p className="text-xs text-gray-400 mt-1">
            Preset của bạn hiện chứa <span className="text-purple-400 font-bold">{prompts.length}</span> khối lệnh. AI có thể chèn các chỉ thị này ở các vị trí, độ sâu khác nhau trong context.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition"
        >
          <Plus size={14} />
          Thêm Block mới
        </button>
      </div>

      {/* Add New Prompt Form */}
      {isAdding && (
        <div className="bg-theme-panel border border-purple-500/30 rounded-xl p-5 space-y-4 animate-fade-in">
          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">🌟 Tạo Prompt Block Mới</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="add-p-name" className="block text-xs font-semibold text-gray-400">Tên Prompt</label>
              <input
                id="add-p-name"
                type="text"
                value={newForm.name}
                onChange={(e) => setNewForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ví dụ: 📜 Luật Hội Thoại, 🚫 Chống Metagame..."
                className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label htmlFor="add-p-role" className="block text-xs font-semibold text-gray-400">Vai trò (Role)</label>
                <select
                  id="add-p-role"
                  value={newForm.role}
                  onChange={(e) => setNewForm(prev => ({ ...prev, role: e.target.value as PromptBlock['role'] }))}
                  className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
                >
                  <option value="system">System (Hệ thống)</option>
                  <option value="user">User (Người chơi)</option>
                  <option value="assistant">Assistant (AI)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="add-p-order" className="block text-xs font-semibold text-gray-400">Thứ tự tiêm (Order)</label>
                <input
                  id="add-p-order"
                  type="number"
                  value={newForm.injection_order}
                  onChange={(e) => setNewForm(prev => ({ ...prev, injection_order: parseInt(e.target.value) || 100 }))}
                  className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <label htmlFor="add-p-pos" className="block text-xs font-semibold text-gray-400">Vị trí tiêm (Pos)</label>
              <select
                id="add-p-pos"
                value={newForm.injection_position}
                onChange={(e) => setNewForm(prev => ({ ...prev, injection_position: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-900 border border-theme-border rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
              >
                <option value="0">Trước (Before)</option>
                <option value="1">Sau (After)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="add-p-depth" className="block text-xs font-semibold text-gray-400">Độ sâu tiêm (Depth)</label>
              <input
                id="add-p-depth"
                type="number"
                value={newForm.injection_depth}
                onChange={(e) => setNewForm(prev => ({ ...prev, injection_depth: parseInt(e.target.value) || 4 }))}
                className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="add-p-sysprompt"
                type="checkbox"
                checked={newForm.system_prompt}
                onChange={(e) => setNewForm(prev => ({ ...prev, system_prompt: e.target.checked }))}
                className="w-4 h-4 rounded text-purple-400 bg-gray-900 border-theme-border"
              />
              <label htmlFor="add-p-sysprompt" className="text-xs text-gray-300 font-semibold cursor-pointer">System Prompt</label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="add-p-forbid"
                type="checkbox"
                checked={newForm.forbid_overrides}
                onChange={(e) => setNewForm(prev => ({ ...prev, forbid_overrides: e.target.checked }))}
                className="w-4 h-4 rounded text-purple-400 bg-gray-900 border-theme-border"
              />
              <label htmlFor="add-p-forbid" className="text-xs text-gray-300 font-semibold cursor-pointer">Cấm ghi đè</label>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="add-p-content" className="block text-xs font-semibold text-gray-400">Nội dung chỉ thị (Content)</label>
            <textarea
              id="add-p-content"
              rows={4}
              value={newForm.content}
              onChange={(e) => setNewForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Nhập nội dung chỉ thị chi tiết cho mô hình..."
              className="w-full bg-gray-900 border border-theme-border rounded-lg p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400 resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-theme-border/50 pt-3">
            <button
              onClick={() => setIsAdding(false)}
              className="text-xs font-semibold text-gray-400 hover:text-gray-200 px-3 py-2 rounded-lg transition"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleAddPrompt}
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
            >
              Hoàn tất thêm
            </button>
          </div>
        </div>
      )}

      {/* Prompts Cards List */}
      <div className="space-y-4">
        {prompts.map((p, index) => {
          const isEditing = editingId === p.identifier;
          const isMarker = p.marker === true;

          return (
            <div 
              key={p.identifier}
              className={`bg-theme-panel border rounded-xl overflow-hidden transition-all ${
                isEditing 
                  ? 'border-purple-500 shadow-md shadow-purple-500/10' 
                  : p.enabled 
                    ? 'border-theme-border hover:border-purple-500/40' 
                    : 'border-theme-border/40 opacity-60'
              }`}
            >
              {/* Card Header Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-900/45 border-b border-theme-border/50 gap-3">
                <div className="flex items-center gap-3">
                  {/* Reordering indicators */}
                  <div className="flex flex-col gap-0.5">
                    <button 
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="text-gray-500 hover:text-purple-400 disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      disabled={index === prompts.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="text-gray-500 hover:text-purple-400 disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-gray-900 border border-purple-500/40 rounded px-2 py-0.5 text-xs text-purple-400 font-bold focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-200 text-xs sm:text-sm">{p.name}</span>
                        {isMarker && (
                          <span className="bg-purple-950/60 text-purple-300 border border-purple-800/40 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                            Anchor Hệ Thống
                          </span>
                        )}
                        {!isMarker && p.system_prompt && (
                          <span className="bg-gray-800 text-gray-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                            System
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Secondary tags */}
                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-500 mt-1 font-mono">
                      <span>ID: {p.identifier}</span>
                      <span>•</span>
                      <span>Role: {p.role}</span>
                      <span>•</span>
                      <span>Vị trí: {p.injection_position === 0 ? 'Before' : 'After'}</span>
                      <span>•</span>
                      <span>Độ sâu: {p.injection_depth}</span>
                      <span>•</span>
                      <span>Order: {p.injection_order}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Enabled switch */}
                  <button
                    onClick={() => updatePromptBlock(p.identifier, { enabled: !p.enabled })}
                    className={`p-1.5 rounded-lg border transition ${
                      p.enabled 
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20' 
                        : 'bg-gray-900 border-theme-border text-gray-500 hover:text-gray-300'
                    }`}
                    title={p.enabled ? "Tắt prompt block" : "Bật prompt block"}
                  >
                    {p.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>

                  {/* Edit/Save Toggle */}
                  {isEditing ? (
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1 bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Save size={12} />
                      Lưu
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="p-1.5 rounded-lg border border-theme-border text-gray-400 hover:text-purple-400 hover:border-purple-500/20 transition"
                      title="Sửa prompt"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}

                  {/* Delete button (block marker system prompts cannot be deleted for safety) */}
                  {!isMarker && (
                    <button
                      onClick={() => {
                        if (confirm(`Bạn chắc chắn muốn xóa Prompt Block "${p.name}" chứ?`)) {
                          deletePromptBlock(p.identifier);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-theme-border text-gray-500 hover:text-red-400 hover:border-red-500/20 transition"
                      title="Xóa prompt block"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body - Content editor */}
              {!isMarker && (
                <div className="p-4 bg-gray-950/20">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Vị trí chèn</label>
                          <select
                            value={editForm.injection_position}
                            onChange={(e) => setEditForm(prev => ({ ...prev, injection_position: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-900 border border-theme-border rounded px-2 py-1 text-gray-300 focus:outline-none"
                          >
                            <option value="0">Before (Trước)</option>
                            <option value="1">After (Sau)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Độ sâu chèn</label>
                          <input
                            type="number"
                            value={editForm.injection_depth}
                            onChange={(e) => setEditForm(prev => ({ ...prev, injection_depth: parseInt(e.target.value) || 4 }))}
                            className="w-full bg-gray-900 border border-theme-border rounded px-2 py-1 text-gray-300 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Thứ tự chèn</label>
                          <input
                            type="number"
                            value={editForm.injection_order}
                            onChange={(e) => setEditForm(prev => ({ ...prev, injection_order: parseInt(e.target.value) || 100 }))}
                            className="w-full bg-gray-900 border border-theme-border rounded px-2 py-1 text-gray-300 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Quy định</label>
                          <div className="flex items-center gap-1.5 mt-2">
                            <input
                              id={`edit-forbid-${p.identifier}`}
                              type="checkbox"
                              checked={editForm.forbid_overrides}
                              onChange={(e) => setEditForm(prev => ({ ...prev, forbid_overrides: e.target.checked }))}
                              className="rounded text-purple-400 bg-gray-900 border-theme-border w-3.5 h-3.5"
                            />
                            <label htmlFor={`edit-forbid-${p.identifier}`} className="text-[10px] text-gray-400 font-semibold cursor-pointer">Khóa ghi đè</label>
                          </div>
                        </div>
                      </div>
                      
                      <textarea
                        rows={6}
                        value={editForm.content || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full bg-gray-900 border border-theme-border rounded-lg p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400 resize-y"
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap line-clamp-6 bg-gray-900/20 border border-theme-border/30 rounded-lg p-3 overflow-y-auto max-h-40">
                      {p.content || <span className="italic text-gray-600">Nội dung trống...</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
