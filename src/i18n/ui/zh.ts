/**
 * src/i18n/ui/zh.ts — 简体中文 cho các chuỗi vốn HARDCODE trong JSX.
 */
import type { UiKeys } from './en';

const ui: UiKeys = {
  // ─── Hub shell ───
  langLabel: '语言',
  hubMadeBy: '✦ 出品',

  // Rail (5 个工具)
  railTranslate: '翻译卡',
  railCardCreator: '创建卡',
  railPreset: '创建预设',
  railModCard: '改卡',
  railExtract: '提取卡',

  // Toolbar
  toolbarHintReady: '空白？点「重新载入」。',
  toolbarHintWaiting: '正在等待服务器启动…',
  toolbarReload: '重新载入',
  toolbarNewTab: '新标签页',
  toolbarOpenNewTab: '在新标签页打开',

  // 等待服务器: "正在等待 <b>工具名</b> 服务器启动 (url)…"
  hubWaitPrefix: '正在等待',
  hubWaitSuffix: '服务器启动',
  hubFirstRunHint: '首次运行 start.bat 可能需要约 30 秒来安装依赖。',

  // ─── 更新按钮（侧栏 + 弹窗）───
  updRailUpdate: '更新',
  updRailNew: '有新版本',
  updTitleCheck: '检查更新',
  updTitleHasUpdate: '有 {count} 个新更新 —— 点击查看',
  updTitleError: '检查失败：{error}',
  updModalUpdating: '正在更新…',
  updModalDone: '更新完成',
  updModalHasUpdate: '有 {count} 个新更新',
  updModalCheckFailed: '无法检查更新',
  updModalLatest: '已是最新版本',
  updModalSub: '当前版本：v{version} · 一次更新覆盖全部 5 个工具',
  updNoNewCommits: '没有新提交。你已是最新版本。',
  updHelp1: '解决方法：打开安装目录，运行',
  updHelp2: '一次，然后重启。如果你从未运行过',
  updHelp3: '（而是下载了 ZIP），更新按钮将无法工作。',
  updPreparing: '正在准备…',
  updLater: '稍后',
  updNow: '立即更新',
  updClose: '关闭',
  updReload: '重新载入页面',
  updErrCheck: '无法检查更新。',
  updErrApi: '无法调用更新检查 API（开发服务器没在运行？）。',
  updErrPrefix: '错误',
};

export default ui;
