import React, { useState } from 'react';
import { useApp } from '../storeContext';
import { scanProxyModels } from '../utils/ai';
import { X, Eye, EyeOff, ShieldCheck, Cpu, Sliders, Info, Search } from 'lucide-react';
import { t, fmt } from '../i18n';

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
        addToast(fmt(t.smToastScanOk, { count: models.length }), "success");
      } else {
        addToast(t.smToastScanFail, "warning");
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : t.smToastScanFail;
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
    addToast(fmt(t.smToastAddModel, { name: manualModelInput }), "success");
    setManualModelInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-panel border border-theme-border w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-theme-border bg-gray-900/40">
          <div className="flex items-center gap-2">
            <Sliders className="text-purple-400" size={18} />
            <h2 className="font-bold text-gray-200 text-sm sm:text-base">{t.smTitle}</h2>
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
            {t.smApiTab}
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
            {t.smBehaviourTab}
          </button>
        </div>

        {/* Modal Content Viewport */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-gray-300">
          
          {/* TAB 1: CONNECTION SETTINGS */}
          {activeTab === 'connection' && (
            <div className="space-y-5">
              
              {/* API Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-400">{t.smConnMethod}</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-900 p-1 rounded-xl border border-theme-border">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, useProxy: false }))}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      !settings.useProxy
                        ? 'bg-purple-500 text-white shadow-md shadow-purple-500/10'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {t.smNative}
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, useProxy: true }))}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      settings.useProxy
                        ? 'bg-purple-500 text-white shadow-md shadow-purple-500/10'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {t.smProxy}
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
                      placeholder={t.smGeminiKeyPh}
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
                    {t.smGeminiKeyHint}
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
                      placeholder={t.smProxyUrlPh}
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
                        placeholder={t.smProxyTokenPh}
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
                    {isScanning ? t.smScanning : t.smScanBtn}
                  </button>
                </div>
              )}

              {/* Models selection radio lists */}
              <div className="space-y-3 bg-gray-900/40 p-4 rounded-xl border border-theme-border">
                <label className="block text-xs font-semibold text-gray-400">{t.smModelSelect}</label>
                
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
                    placeholder={t.smManualModelPh}
                    className="flex-1 bg-gray-900 border border-theme-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={handleAddManualModel}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    {t.smAddModel}
                  </button>
                </div>
              </div>

              {/* Provider phụ (xoay vòng qua nhiều account) */}
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-300">{t.smExtraProviders}</label>
                  <button
                    onClick={() => setSettings(p => ({ ...p, extraProviders: [...(p.extraProviders || []), { enabled: true, useProxy: p.useProxy, apiKey: '', proxyUrl: p.proxyUrl, proxyKey: '', selectedModel: '' }] }))}
                    className="text-xs text-purple-400 font-bold hover:text-purple-300">{t.smAdd}</button>
                </div>
                <p className="text-[11px] text-gray-500 mb-2 leading-snug">{t.smExtraProvidersHint}</p>
                {(settings.extraProviders || []).map((e, i) => {
                  const upd = (patch: Partial<typeof e>) => setSettings(p => ({ ...p, extraProviders: (p.extraProviders || []).map((x, idx) => idx === i ? { ...x, ...patch } : x) }));
                  const del = () => setSettings(p => ({ ...p, extraProviders: (p.extraProviders || []).filter((_, idx) => idx !== i) }));
                  const inp = "w-full text-xs bg-gray-900 border border-gray-600 rounded px-2 py-1 text-gray-100 placeholder-gray-500";
                  return (
                    <div key={i} className="border border-gray-700 rounded-lg p-2 mb-2 space-y-1.5 bg-gray-800/40">
                      <div className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={e.enabled} onChange={ev => upd({ enabled: ev.target.checked })} />
                        <span className="font-bold text-gray-300">Provider #{i + 2}</span>
                        <label className="flex items-center gap-1 ml-2 text-gray-400 cursor-pointer"><input type="checkbox" checked={e.useProxy} onChange={ev => upd({ useProxy: ev.target.checked })} /> Proxy</label>
                        <button onClick={del} className="ml-auto text-red-400 font-bold hover:text-red-300">{t.smRemove}</button>
                      </div>
                      {e.useProxy ? (
                        <>
                          <input value={e.proxyUrl} onChange={ev => upd({ proxyUrl: ev.target.value })} placeholder="Proxy URL (…/v1)" className={inp} />
                          <input type="password" value={e.proxyKey} onChange={ev => upd({ proxyKey: ev.target.value })} placeholder="Proxy Key" className={inp} />
                        </>
                      ) : (
                        <input type="password" value={e.apiKey} onChange={ev => upd({ apiKey: ev.target.value })} placeholder="Gemini API Key" className={inp} />
                      )}
                      <input value={e.selectedModel} onChange={ev => upd({ selectedModel: ev.target.value })} placeholder="Model (vd gemini-2.5-flash)" className={inp} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BEHAVIOR SETTINGS */}
          {activeTab === 'behavior' && (
            <div className="space-y-5 animate-fade-in">
              
              {/* Temperature slider for chat session */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-gray-400">
                  <label htmlFor="settings-temp">{t.smDesignerTemp}</label>
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
                <p className="text-[10px] text-gray-500">{t.smDesignerTempHint}</p>
              </div>

              {/* Max tokens */}
              <div className="space-y-2">
                <label htmlFor="settings-max-tokens" className="block text-xs font-semibold text-gray-400">{t.smMaxTokens}</label>
                <select
                  id="settings-max-tokens"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  className="w-full bg-gray-900 border border-theme-border rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-400"
                >
                  <option value="1024">1024 Tokens</option>
                  <option value="2048">2048 Tokens</option>
                  <option value="4096">4096 Tokens</option>
                  <option value="8192">{t.smTokens8k}</option>
                  <option value="16384">16384 Tokens (16k)</option>
                  <option value="32768">32768 Tokens (32k)</option>
                  <option value="65536">{t.smTokens64k}</option>
                </select>
              </div>

              {/* Keep context */}
              <div className="flex items-center justify-between p-3.5 bg-gray-900/50 rounded-xl border border-theme-border">
                <div className="space-y-0.5 pr-4">
                  <label htmlFor="settings-keep-context" className="text-xs font-semibold text-gray-200">{t.smKeepContext}</label>
                  <p className="text-[10px] text-gray-500">
                    {t.smKeepContextHint}
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
                <label htmlFor="settings-sysprompt-add" className="block text-xs font-semibold text-gray-400">{t.smSysPromptAdd}</label>
                <textarea
                  id="settings-sysprompt-add"
                  rows={4}
                  value={settings.systemPromptAddition}
                  onChange={(e) => setSettings(prev => ({ ...prev, systemPromptAddition: e.target.value }))}
                  placeholder={t.smSysPromptAddPh}
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
            {t.smDone}
          </button>
        </div>

      </div>
    </div>
  );
};
