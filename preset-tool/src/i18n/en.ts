/**
 * preset-tool/src/i18n/en.ts — English. NGUỒN của kiểu `PresetUiKeys`.
 * vi.ts / zh.ts phải có ĐÚNG cùng tập key (TypeScript ép) — thiếu là lỗi biên dịch.
 *
 * ⚠️ TUYỆT ĐỐI KHÔNG đưa vào đây (đã rà — là dữ liệu/prompt, dịch vào là hỏng):
 *   - src/store.tsx : nội dung preset MẶC ĐỊNH (impersonation_prompt, block "🎭 Đạo Diễn Hệ Thống"…)
 *     → chui thẳng vào file preset mà user xuất ra.
 *   - src/utils/contextBuilder.ts : dựng context gửi cho AI.
 *   - ChatWindow: SCHEDULE_TEMPLATE, khối "[FILE PRESET MẪU ĐÍNH KÈM…]", 2 câu setInput("Tạo SillyTavern…")
 *     → đều là văn bản GỬI CHO AI, không phải nhãn giao diện.
 *   - DOMException('Người dùng đã dừng') → chuỗi logic.
 */
const en = {
  // ─── App shell ───
  settings: '⚙ Settings',
  newProjectPh: 'New project name…',
  newProjectTitle: 'Create a new project',
  importProjectTitle: 'Import a project from a JSON file',
  savedProjects: 'Saved projects ({count})',
  rename: 'Rename',
  deleteProject: 'Delete project',
  quickGuide: 'Quick guide',
  quickGuideBody: 'Double-click a project name to rename it. Chat with the AI to generate or update Presets/Regex automatically.',
  step1: '1. Parameters',
  step2: '2. Prompt Blocks',
  step3: '3. Regex Scripts',
  step4: '4. Export JSON',
  toastOnlyJson: 'Only .json files are supported!',
  toastBadJson: 'File "{name}" is not valid JSON!',

  // ─── StepParameters ───
  spSampling: '⚙️ Sampling parameters',
  spTemp: 'Temperature',
  spTempHint: 'A higher temperature increases creativity and randomness of the wording.',
  spRepPenalty: 'Repetition Penalty',
  spRepPenaltyHint: 'Reduces repetition of words or phrases already used.',
  spContextTokens: '📏 Context & token limits',
  spMaxContext: 'Max Context Size',
  spMaxContextHint: 'Context limit (Gemini 1.5/2.0/2.5 Pro supports a huge 1M–2M tokens).',
  spMaxTokens: 'Response Limit',
  spMaxTokensHint: 'Caps the length of a single AI reply.',
  spUnlockContext: 'Unlock max context',
  spUnlockContextHint: 'Bypass the default hard limit.',
  spStream: 'Stream data from the API',
  spStreamHint: 'Text appears live in real time.',
  spNudges: '📝 Supporting text blocks & nudges (System Nudges)',
  spImpersonation: 'Impersonation Prompt',
  spImpersonationPh: 'Prompt instructing how to impersonate the player…',
  spImpersonationHint: 'Applies when the AI speaks/acts on behalf of the player (Impersonate).',
  spContinueNudge: 'Continue Nudge Prompt',
  spContinueNudgePh: 'Prompt nudging the AI to continue…',
  spContinueNudgeHint: 'Forces the AI to continue from an unfinished line without breaking the scene structure.',
  spScenarioFmt: 'Scenario Format',
  spPersonalityFmt: 'Personality Format',
  spWiFmt: 'WI Format',

  // ─── SettingsModal ───
  smTitle: 'ST Studio settings',
  smApiTab: 'API connection',
  smBehaviourTab: 'AI behaviour',
  smConnMethod: 'Connection method',
  smNative: 'Natively (Gemini direct)',
  smProxy: 'Use a proxy',
  smGeminiKeyPh: 'Enter your Google Gemini API Key…',
  smGeminiKeyHint: 'Get a free API Key at Google AI Studio. Your data is stored safely in your browser LocalStorage.',
  smProxyUrlPh: 'e.g. https://proxy.com/v1',
  smProxyTokenPh: 'Enter your authorisation token or password…',
  smScanning: 'Scanning…',
  smScanBtn: '🔍 Scan the model list from the proxy',
  smModelSelect: 'Model selection',
  smManualModelPh: 'Type a model manually…',
  smAddModel: 'Add model',
  smExtraProviders: '🔀 Extra providers (round-robin)',
  smAdd: '+ Add',
  smExtraProvidersHint: 'Round-robins calls together with the main provider → spreads the rate limit across accounts. (Chat is sequential, so this does not speed things up in parallel.)',
  smRemove: 'Remove',
  smDesignerTemp: 'Temperature (of the Designer model)',
  smDesignerTempHint: 'Applies to the ST Studio model you are chatting with.',
  smMaxTokens: 'Max output tokens',
  smTokens8k: '8192 Tokens (standard)',
  smTokens64k: '65536 Tokens (65k — Gemini max)',
  smKeepContext: 'Keep conversation context',
  smKeepContextHint: 'When on, the whole chat history is sent so the AI understands the previous preset structure. When off, only the last message is sent (saves tokens).',
  smSysPromptAdd: 'System Prompt addition',
  smSysPromptAddPh: 'Add your own instructions to force the AI to write in your personal style…',
  smDone: 'Finish configuration',
  smToastScanOk: 'Successfully scanned {count} models!',
  smToastScanFail: 'Could not fetch the model list — enter it manually.',
  smToastAddModel: 'Model added: {name}',
};

export default en;
export type PresetUiKeys = typeof en;
