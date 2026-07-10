/**
 * tao-card/src/i18n/zh.ts — 简体中文。Giữ nguyên placeholder {name} {count}… và emoji.
 */
import type { CardUiKeys } from './en';

const t: CardUiKeys = {
  // ─── AppShell ───
  loadingPage: '正在加载页面……',

  // ─── Sidebar ───
  navAutoCreator: 'Auto Creator',
  navStoryToCard: '从小说生成卡',
  navSettings: '设置',
  navCardEditor: 'Card Editor',
  navLorebook: 'Lorebook',
  navRegexLab: 'Regex Lab',
  navMvuzod: 'MVUZOD',
  navEjsStudio: 'EJS Studio',
  navWiki: 'Wiki Collector',
  sbNewProject: '创建新项目',
  sbConfirmDelete: '确定要删除这个项目吗？',
  sbDeleteProject: '删除项目',
  sbNoProject: '还没有项目。',
  sbPressPlus: '点 + 新建一个。',

  // ─── TopBar ───
  tbFormatV2: 'Character Card V2（已转换）',
  tbFormatUnknown: '无法识别',
  tbConfirmPull: '要从 GitHub 拉取（pull）最新版本吗？',
  tbConfirmReset: '要回退（reset）到上一个 commit 吗？',
  tbUpdateOk: '成功！\n\n',
  tbUpdateErr: '错误：\n\n',
  tbNoServer: '无法连接到本地服务器。请确认 Vite server 正在运行。\n错误：',
  tbSaving: '● 正在保存……',
  tbSaved: '● 已保存 {time}',
  tbNoPngData: '在这个 PNG 文件里没有找到角色卡数据。',
  tbSnapshotBeforeImport: '导入 {name} 之前',
  tbImportOk: '导入成功：{format}{warnings}',
  tbImportErr: '未知的导入错误。',
  tbExportPngErr: '导出 PNG 文件时出错。',
  tbProjectMgmt: '项目管理',
  tbCurrentProjectName: '当前项目名称',
  tbProjectNamePh: '输入项目名称……',
  tbSwitchProject: '切换项目（{count}）',
  tbCreateProject: '创建新项目',
  tbExportFile: '导出文件',
  tbExportWizardDesc: '完整向导：注入 MVUZOD + 校验 + 导出',
  tbExportPngDesc: '导出内嵌角色数据的 PNG 图片',
  tbExportV3: 'Card V3（完整）',
  tbExportV3Desc: '给 SillyTavern 用的完整 .json 文件',
  tbExportLorebookDesc: '只导出 lorebook 条目',
  tbExportCharOnly: '角色（不含 lorebook）',
  tbExportCharOnlyDesc: '轻量卡片，不带 lorebook',
  tbUndo: '撤销（Ctrl+Z）',
  tbConfirmWipe: '确定要删除全部数据吗？\n\n这会删除所有项目、角色、聊天记录和 API 设置，无法恢复！',
  tbWipeErr: '清除数据库时出错：',
  tbWipeTitle: '删除全部数据',
  tbUpdateTitle: '更新（GitHub pull）',
  tbDowngradeTitle: '回退一个 commit（GitHub reset）',
  tbGuideTitle: '使用指南',

  // ─── ErrorBoundary ───
  ebTitle: '出错了',
  ebUnknown: '未知错误',
  ebRetry: '重试',

  // ─── CopilotDrawer ───
  cdOpen: '打开 Copilot',
  cdWelcome: '你好！我是 AI Copilot。',
  cdAsk: '关于你的卡片，什么都可以问我。',
  cdInputPh: '输入需求……',
  cdNeedProxy: '使用前请先配置 AI 代理。',

  // ─── AICallMonitor ───
  amRunning: '{count} 个 AI 线程正在运行',
  amPeak: '峰值 {peak} · ✓ {done}',

  // ─── MVUZODPage ───
  mzTabSchemaDesc: '创建/编辑 Zod schema',
  mzTabInitvarDesc: '变量初始值',
  mzTabVarlist: '变量',
  mzTabVarlistDesc: '生成变量展示条目',
  mzTabUpdateDesc: '生成 update rules + 输出格式',
  mzTabScriptDesc: '预览输出脚本',
  mzTabGameDesc: '预览游戏界面',
  mzTabPlaygroundDesc: '测试变量 + JSON Patch',
  mzNeedSchema: '需要先创建 Schema',
};

export default t;
