/**
 * mod-card/src/i18n/zh.ts — 简体中文。Giữ nguyên placeholder {count} {label} {verb}… và emoji.
 */
import type { ModUiKeys } from './en';

const zh: ModUiKeys = {
  // Header
  appSubtitle: '用 LLM 安全地自动编辑 Character Card V3',
  settingsBtn: '⚙️ LLM 设置',

  // 左栏 — 文件
  fileSection: '角色文件',
  fileLoadedPrefix: '✅ 已载入：',
  fileUnnamed: '无名',
  fileLorebookMode: '📖 LOREBOOK 改写模式（{count} 条目）→ 单独导出世界书',
  fileMvuZod: '🧬 RPG 架构：MVU-ZOD 角色卡',
  fileLoadAnother: '载入其他文件',

  // Zod 变量
  zodSection: '变量数据库（Zod）',
  zodDesc: '在 Zod Schema 中硬定义的变量：',
  zodRemapped: '已重命名 {count} 个 MVU-Zod 变量。请查看「对比 / 导出」标签页。',

  // 改写请求
  modSection: 'AI 改写请求',
  modPlaceholder: '输入自定义请求…… 例如：把角色名从 Ngân Kỳ 改成 Anh Kiệt，并把剧情改成中世纪骑士……',
  subExpandDone: '已深挖一个部分。请查看「对比 / 导出」标签页。',

  // Orchestrator
  orchSection: 'Orchestrator 控制',
  expandMode: '✨ 扩写 / 深挖模式',
  expandModeDesc: 'AI 不再逐字照做，而是通读整个世界书，补充 3-4 个扩展部分并写得更详细（紧扣 lore）。',
  expandIntensityLabel: '深挖程度：',
  intensityLight: '轻度',
  intensityMedium: '中度',
  intensityDeep: '深度',
  runBtn: '🚀 运行自动改卡',
  stopBtn: '⏹ 停止',
  scriptWarnBold: '{count} 个脚本的语法可能已损坏',
  scriptWarnRest: '（改写之后；载入 SillyTavern 可能导致按钮失效）—— 请在 Diff 表中手动检查：',

  // 标签页
  tabWorkspace: 'Workspace (Sections)',
  tabDiff: 'Diff 表（结果）',
  tabSettings: '设置',
  needCardHint: '请在左栏载入一张 JSON 角色卡以开始。',

  // 分析
  analysisTitle: '分析结果（Analysis Report）',
  analysisEmpty: '尚无分析结果。请点击「运行自动改卡」。',
  analysisReason: '原因：',
  analysisPreview: '预计修改：',

  // 结果
  resultTitle: '结果（Diff Viewer & Audit）',
  resultEmpty: '请运行「自动改卡」以在此查看结果。',
  auditTitle: '1. 一致性（Audit Score）',
  validationTitle: '2. 校验（Validation Status）',
  validationVerified: '已验证：{count} 个受保护字段。',
  suggestLabel: '建议',
  downloadLorebook: '⬇️ 下载世界书 JSON（单独）',
  downloadJson: '⬇️ 下载 JSON（已嵌回头像）',
  jsonBefore: '原始 JSON（仅显示文本字段）',
  jsonAfter: '改写后 JSON（已应用改动）',

  // 设置
  settingsTitle: '⚙️ LLM 与代理配置',
  cfgProvider: '1. 供应商（Provider）',
  cfgBaseUrl: '2. 代理地址（Proxy Base URL）',
  cfgBaseUrlPhOpenai: '例如：https://api.openrouter.ai/v1 或 https://api.openai.com/v1',
  cfgBaseUrlPhGemini: '默认（Google API）或你自己的代理 URL',
  cfgBaseUrlPhAnthropic: '默认（Anthropic API）或你自己的代理 URL',
  cfgBaseUrlHint: '留空则直接使用供应商的默认 API。',
  cfgApiKey: '3. API 密钥 / 代理密码（Proxy Password）',
  cfgApiKeyPh: '输入你的 API 密钥或代理密码',
  cfgApiKeyNote: '🔒 安全：信息仅保存在你本机浏览器中（Local Storage），除你选择的代理外，绝不会上传到任何第三方服务器。',
  cfgScanning: '🔄 正在扫描模型…',
  cfgScanBtn: '🔍 从代理扫描模型列表',
  cfgModel: '4. 选择要使用的模型',
  cfgPickFromList: '从列表选择',
  cfgTypeManually: '手动输入模型名',
  cfgModelPh: '请准确输入模型名，例如：gpt-4o、gemini-1.5-pro-latest',
  cfgRecommended: '（推荐）',
  cfgMaxTokens: '5. 最大输出 Token（Max Output）',
  cfgTemperature: '6. 创造性（Temperature）',

  // 提示
  alertNeedKeyScan: '请先输入 API 密钥再扫描。',
  alertScanFailed: '扫描模型失败',
  alertScanOk: '成功扫描到 {count} 个模型！',
  alertScanErrPrefix: '扫描模型出错：',
  alertNeedCardKey: '请先载入角色卡并在「设置」中填写 API 密钥，然后再运行。',
  alertNeedRule: '请至少添加 1 条 Rule，或输入自定义请求。',
  alertProcessErrPrefix: '处理过程中出错：',

  // 流水线状态
  stage1: '阶段 1：正在初始化与准备…',
  stage2: '阶段 2：正在调用 LLM 分析角色卡（Analyze Phase）…',
  stage3: '阶段 3：正在改写被标记为 NEEDS_MOD 的 section…',
  stage3Part: '阶段 3：{verb}「{label}」—— 第 {done}/{total} 部分（条目过大，已分段以免出错）…',
  stage3Section: '阶段 3：正在{verb} section {label}…',
  verbExpand: '扩写',
  verbMod: '改写',
  stage4Keyword: '阶段 4：正在同步关键词（Keyword Sync）…',
  stage4Audit: '阶段 4：正在评估一致性（Consistency Audit）…',
  stage5: '阶段 5：正在运行结构安全校验（Validation）…',
  stageDone: '整个改写流程已完成！结果见 Diff 表。',
  stageStopped: '⏹ 已按要求停止。',
  stageStopping: '⏹ 正在停止…',
  stageError: '流程出错。',
};

export default zh;
