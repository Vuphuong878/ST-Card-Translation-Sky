import React, { useState } from 'react';
import { useApp } from '../storeContext';
import { scanProxyModels } from '../utils/ai';
import { X, Eye, EyeOff, ShieldCheck, Cpu, Sliders, Info, Search } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'connection' | 'behavior'>('connection');
  
  // Local toggles for key visibility
  const [showApiKey, setShowApiKey] = useState(false);
  const [showProxyKey, setShowProxyKey] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [manualModelInput, setManualModelInput] = useState('');

  if (!isOpen) return null;

  const handleScanModels = async () => {
    setIsScanning(true);
    try {
      const models = await scanProxyModels(settings.proxyUrl, settings.proxyKey);
      if (models.length > 0) {
        setSettings(prev => ({
          ...prev,
          customModels: Array.from(new Set([...prev.customModels, ...models]))
        }));
        addToast(`Đã quét thành công ${models.length} mô hình!`, "success");
      } else {
        addToast("Không lấy được model list — nhập tay.", "warning");
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Không lấy được model list — nhập tay.";
      addToast(errMsg, "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddManualModel = () => {
    if (!manualModelInput.trim()) return;
    setSettings(prev => ({
      ...prev,
      customModels: Array.from(new Set([...prev.customModels, manualModelInput.trim()])),
      selectedModel: manualModelInput.trim()
    }));
    addToast(`Đã thêm mô hình: ${manualModelInput}`, "success");
    setManualModelInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-panel border border-theme-border w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-theme-border bg-gray-900/40">
          <div className="flex items-center gap-2">
            <Sliders className="text-purple-400" size={18} />
            <h2 className="font-bold text-gray-200 text-sm sm:text-base">Cấu hình Cài đặt ST Studio</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs Selector */}
        <div className="flex border-b border-theme-border/60 bg-gray-950/40 text-xs font-bold text-gray-400">
          <button
            onClick={() => setActiveTab('connection')}
            className={`flex-1 py-3 border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'connection'
                ? 'border-purple-400 text-purple-400 bg-purple-500/[0.02]'
                : 'border-transparent hover:text-gray-200'
            }`}
          >
            <ShieldCheck size={14} />
            Kết nối API
          </button>
          <button
            onClick={() => setActiveTab('behavior')}
            className={`flex-1 py-3 border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'behavior'
                ? 'border-purple-400 text-purple-400 bg-purple-500/[0.02]'
                : 'border-transparent hover:text-gray-200'
            }`}
          >
            <Cpu size={14} />
            Hành vi AI
          </button>
        </div>

        {/* Modal Content Viewport */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-gray-300">
          
          {/* TAB 1: CONNECTION SETTINGS */}
          {activeTab === 'connection' && (
            <div className="space-y-5">
              
              {/* API Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-400">Phương thức kết nối</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-900 p-1 rounded-xl border border-theme-border">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, useProxy: false }))}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      !settings.useProxy
                        ? 'bg-purple-500 text-white shadow-md shadow-purple-500/10'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Natively (Gemini Trực Tiếp)
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, useProxy: true }))}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      settings.useProxy
                        ? 'bg-purple-500 text-white shadow-md shadow-purple-500/10'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Dùng Proxy Trung Gian
                  </button>
                </div>
              </div>

              {/* API INPUTS based on toggle */}
              {!settings.useProxy ? (
                // Direct Gemini API Key
                <div className="space-y-2">
                  <label htmlFor="settings-api-key" className="block text-xs font-semibold text-gray-400">Google Gemini API Key</label>
                  <div className="relative">
                    <input
                      id="settings-api-key"
                      type={showApiKey ? "text" : "password"}
                      value={settings.apiKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Nhập API Key của Google Gemini..."
                      className="w-full bg-gray-900 border border-theme-border rounded-xl px-3 py-2.5 pr-10 text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 flex items-start gap-1">
                    <Info size={12} className="text-purple-400 flex-shrink-0 mt-0.5" />
                    Nhận API Key miễn phí tại Google AI Studio. Dữ liệu được lưu trữ an toàn trong LocalStorage của bạn.
                  </p>
                </div>
              ) : (
                // Proxy Endpoint Configs
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="settings-proxy-url" className="block text-xs font-semibold text-gray-400">URL Proxy</label>
                    <input
                      id="settings-proxy-url"
                      type="text"
                      value={settings.proxyUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, proxyUrl: e.target.value }))}
                      placeholder="Ví dụ: https://proxy.com/v1"
                      className="w-full bg-gray-900 border border-theme-border rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="settings-proxy-key" className="block text-xs font-semibold text-gray-400">Proxy Key</label>
                    <div className="relative">
                      <input
                        id="settings-proxy-key"
                        type={showProxyKey ? "text" : "password"}
                        value={settings.proxyKey}
                        onChange={(e) => setSettings(prev => ({ ...prev, proxyKey: e.target.value }))}
                        placeholder="Nhập Token hoặc Password ủy quyền..."
                        className="w-full bg-gray-900 border border-theme-border rounded-xl px-3 py-2.5 pr-10 text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-400"
                      />
                      <button
                        onClick={() => setShowProxyKey(!showProxyKey)}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                      >
                        {showProxyKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Scan Model Button */}
                  <button
                    onClick={handleScanModels}
                    disabled={isScanning}
                    className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-purple-300 font-semibold text-xs py-2 rounded-xl border border-theme-border transition flex items-center justify-center gap-1.5"
                  >
                    <Search size={14} />
                    {isScanning ? 'Đang quét...' : '🔍 Quét Danh Sách Mô Hình từ Proxy'}
                  </button>
                </div>
              )}

              {/* Models selection radio lists */}
              <div className="space-y-3 bg-gray-900/40 p-4 rounded-xl border border-theme-border">
                <label className="block text-xs font-semibold text-gray-400">Chọn mô hình hoạt động (Model selection)</label>
                
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {settings.customModels.map(model => (
                    <label 
                      key={model} 
                      className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-xs font-mono transition ${
                        settings.selectedModel === model
                          ? 'border-purple-500 bg-purple-500/[0.05] text-purple-400'
                          : 'border-theme-border bg-gray-900/40 hover:bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ai-model"
                        value={model}
                        checked={settings.selectedModel === model}
                        onChange={() => setSettings(prev => ({ ...prev, selectedModel: model }))}
                        className="text-purple-500 focus:ring-purple-400 bg-gray-900 border-theme-border"
                      />
                      <span className="truncate">{model}</span>
                    </label>
                  ))}
                </div>

                {/* Add Custom model input manual */}
                <div className="flex gap-2 mt-2 pt-2 border-t border-theme-border/50">
                  <input
                    type="text"
                    value={manualModelInput}
                    onChange={(e) => setManualModelInput(e.target.value)}
                    placeholder="Nhập thủ công model..."
                    className="flex-1 bg-gray-900 border border-theme-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={handleAddManualModel}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    Thêm model
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BEHAVIOR SETTINGS */}
          {activeTab === 'behavior' && (
            <div className="space-y-5 animate-fade-in">
              
              {/* Temperature slider for chat session */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-gray-400">
                  <label htmlFor="settings-temp">Nhiệt độ (Temperature của Trình Thiết Kế)</label>
                  <span className="text-purple-400 font-mono font-bold">{settings.temperature}</span>
                </div>
                <input
                  id="settings-temp"
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-400 bg-gray-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-gray-500">Áp dụng cho chính mô hình ST Studio đang trò chuyện với bạn.</p>
              </div>

              {/* Max tokens */}
              <div className="space-y-2">
                <label htmlFor="settings-max-tokens" className="block text-xs font-semibold text-gray-400">Mức giới hạn Tokens xuất ra (Max Tokens)</label>
                <select
                  id="settings-max-tokens"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  className="w-full bg-gray-900 border border-theme-border rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
                >
                  <option value="1024">1024 Tokens</option>
                  <option value="2048">2048 Tokens</option>
                  <option value="4096">4096 Tokens</option>
                  <option value="8192">8192 Tokens (Tiêu chuẩn)</option>
                  <option value="16384">16384 Tokens (16k)</option>
                  <option value="32768">32768 Tokens (32k)</option>
                  <option value="65536">65536 Tokens (65k - Tối đa cho Gemini)</option>
                </select>
              </div>

              {/* Keep context */}
              <div className="flex items-center justify-between p-3.5 bg-gray-900/50 rounded-xl border border-theme-border">
                <div className="space-y-0.5 pr-4">
                  <label htmlFor="settings-keep-context" className="text-xs font-semibold text-gray-200">Bảo toàn Ngữ cảnh Hội thoại</label>
                  <p className="text-[10px] text-gray-500">
                    Khi bật, toàn bộ lịch sử trò chuyện sẽ được gửi đi để AI nắm bắt cấu trúc preset cũ. Khi tắt, chỉ tin nhắn cuối cùng được gửi (tiết kiệm token).
                  </p>
                </div>
                <input
                  id="settings-keep-context"
                  type="checkbox"
                  checked={settings.keepContext}
                  onChange={(e) => setSettings(prev => ({ ...prev, keepContext: e.target.checked }))}
                  className="w-4 h-4 rounded text-purple-400 bg-gray-900 border-theme-border focus:ring-purple-400"
                />
              </div>

              {/* System prompt custom addition */}
              <div className="space-y-2">
                <label htmlFor="settings-sysprompt-add" className="block text-xs font-semibold text-gray-400">Chỉ thị hệ thống bổ sung (System Prompt addition)</label>
                <textarea
                  id="settings-sysprompt-add"
                  rows={4}
                  value={settings.systemPromptAddition}
                  onChange={(e) => setSettings(prev => ({ ...prev, systemPromptAddition: e.target.value }))}
                  placeholder="Thêm hướng dẫn riêng để ép AI viết theo phong cách cá nhân của bạn..."
                  className="w-full bg-gray-900 border border-theme-border rounded-xl p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400 resize-y"
                />
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-950/40 border-t border-theme-border/60 flex justify-end">
          <button
            onClick={onClose}
            className="bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-purple-500/10"
          >
            Hoàn tất cấu hình
          </button>
        </div>

      </div>
    </div>
  );
};
