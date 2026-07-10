import React from 'react';
import { useApp } from '../storeContext';
import { SillyTavernPreset } from '../types';
import { t } from '../i18n';

export const StepParameters: React.FC = () => {
  const { activeProject, updatePresetParams } = useApp();
  const preset = activeProject.preset;

  const handleChange = (key: keyof SillyTavernPreset, value: string | number | boolean) => {
    updatePresetParams({ [key]: value });
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Parameter Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Basic Sampling Parameters */}
        <div className="bg-theme-panel border border-theme-border rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider border-b border-theme-border pb-2">
            {t.spSampling}
          </h3>
          
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-400">
              <label htmlFor="param-temp">{t.spTemp}</label>
              <span className="text-purple-400 font-mono font-bold">{preset.temperature}</span>
            </div>
            <input
              id="param-temp"
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={preset.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full accent-purple-400 bg-gray-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-gray-500">{t.spTempHint}</p>
          </div>

          {/* Repetition Penalty */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-400">
              <label htmlFor="param-rep-penalty">{t.spRepPenalty}</label>
              <span className="text-purple-400 font-mono font-bold">{preset.repetition_penalty}</span>
            </div>
            <input
              id="param-rep-penalty"
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={preset.repetition_penalty}
              onChange={(e) => handleChange('repetition_penalty', parseFloat(e.target.value))}
              className="w-full accent-purple-400 bg-gray-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-gray-500">{t.spRepPenaltyHint}</p>
          </div>

          {/* Top P & Top K */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="param-top-p" className="block text-xs font-semibold text-gray-400">Top P</label>
              <input
                id="param-top-p"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={preset.top_p}
                onChange={(e) => handleChange('top_p', parseFloat(e.target.value))}
                className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="param-top-k" className="block text-xs font-semibold text-gray-400">Top K</label>
              <input
                id="param-top-k"
                type="number"
                min="0"
                max="500"
                value={preset.top_k}
                onChange={(e) => handleChange('top_k', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Top A & Min P */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="param-top-a" className="block text-xs font-semibold text-gray-400">Top A</label>
              <input
                id="param-top-a"
                type="number"
                step="0.05"
                value={preset.top_a}
                onChange={(e) => handleChange('top_a', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="param-min-p" className="block text-xs font-semibold text-gray-400">Min P</label>
              <input
                id="param-min-p"
                type="number"
                step="0.01"
                value={preset.min_p}
                onChange={(e) => handleChange('min_p', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>
        </div>

        {/* Context & Limits */}
        <div className="bg-theme-panel border border-theme-border rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider border-b border-theme-border pb-2">
            {t.spContextTokens}
          </h3>
          
          <div className="space-y-2">
            <label htmlFor="param-max-context" className="block text-xs font-semibold text-gray-400">{t.spMaxContext}</label>
            <input
              id="param-max-context"
              type="number"
              value={preset.openai_max_context}
              onChange={(e) => handleChange('openai_max_context', parseInt(e.target.value) || 32000)}
              className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-sm text-purple-400 font-mono font-bold focus:outline-none focus:border-purple-400"
            />
            <p className="text-[10px] text-gray-500">{t.spMaxContextHint}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="param-max-tokens" className="block text-xs font-semibold text-gray-400">{t.spMaxTokens}</label>
            <input
              id="param-max-tokens"
              type="number"
              value={preset.openai_max_tokens}
              onChange={(e) => handleChange('openai_max_tokens', parseInt(e.target.value) || 65536)}
              className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-sm text-purple-400 font-mono font-bold focus:outline-none focus:border-purple-400"
            />
            <p className="text-[10px] text-gray-500">{t.spMaxTokensHint}</p>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-theme-border/50">
            <div className="space-y-0.5">
              <label htmlFor="param-unlock-context" className="text-xs font-semibold text-gray-300">{t.spUnlockContext}</label>
              <p className="text-[10px] text-gray-500">{t.spUnlockContextHint}</p>
            </div>
            <input
              id="param-unlock-context"
              type="checkbox"
              checked={preset.max_context_unlocked}
              onChange={(e) => handleChange('max_context_unlocked', e.target.checked)}
              className="w-4 h-4 rounded text-purple-400 focus:ring-purple-400 bg-gray-800 border-theme-border"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-theme-border/50">
            <div className="space-y-0.5">
              <label htmlFor="param-stream" className="text-xs font-semibold text-gray-300">{t.spStream}</label>
              <p className="text-[10px] text-gray-500">{t.spStreamHint}</p>
            </div>
            <input
              id="param-stream"
              type="checkbox"
              checked={preset.stream_openai}
              onChange={(e) => handleChange('stream_openai', e.target.checked)}
              className="w-4 h-4 rounded text-purple-400 focus:ring-purple-400 bg-gray-800 border-theme-border"
            />
          </div>
        </div>
      </div>

      {/* Prompts Nudges & Formatting Blocks */}
      <div className="bg-theme-panel border border-theme-border rounded-xl p-5 space-y-6">
        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider border-b border-theme-border pb-2">
          {t.spNudges}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Impersonation Prompt */}
          <div className="space-y-2">
            <label htmlFor="param-impersonation" className="block text-xs font-semibold text-gray-400">{t.spImpersonation}</label>
            <textarea
              id="param-impersonation"
              rows={4}
              value={preset.impersonation_prompt}
              onChange={(e) => handleChange('impersonation_prompt', e.target.value)}
              className="w-full bg-gray-900 border border-theme-border rounded-lg p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400 resize-y"
              placeholder={t.spImpersonationPh}
            />
            <p className="text-[10px] text-gray-500">{t.spImpersonationHint}</p>
          </div>

          {/* Continue Nudge Prompt */}
          <div className="space-y-2">
            <label htmlFor="param-continue-nudge" className="block text-xs font-semibold text-gray-400">{t.spContinueNudge}</label>
            <textarea
              id="param-continue-nudge"
              rows={4}
              value={preset.continue_nudge_prompt}
              onChange={(e) => handleChange('continue_nudge_prompt', e.target.value)}
              className="w-full bg-gray-900 border border-theme-border rounded-lg p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400 resize-y"
              placeholder={t.spContinueNudgePh}
            />
            <p className="text-[10px] text-gray-500">{t.spContinueNudgeHint}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scenario Format */}
          <div className="space-y-2">
            <label htmlFor="param-scenario-fmt" className="block text-xs font-semibold text-gray-400">{t.spScenarioFmt}</label>
            <input
              id="param-scenario-fmt"
              type="text"
              value={preset.scenario_format}
              onChange={(e) => handleChange('scenario_format', e.target.value)}
              className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Personality Format */}
          <div className="space-y-2">
            <label htmlFor="param-personality-fmt" className="block text-xs font-semibold text-gray-400">{t.spPersonalityFmt}</label>
            <input
              id="param-personality-fmt"
              type="text"
              value={preset.personality_format}
              onChange={(e) => handleChange('personality_format', e.target.value)}
              className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* World Info Format */}
          <div className="space-y-2">
            <label htmlFor="param-wi-fmt" className="block text-xs font-semibold text-gray-400">{t.spWiFmt}</label>
            <input
              id="param-wi-fmt"
              type="text"
              value={preset.wi_format}
              onChange={(e) => handleChange('wi_format', e.target.value)}
              className="w-full bg-gray-900 border border-theme-border rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
