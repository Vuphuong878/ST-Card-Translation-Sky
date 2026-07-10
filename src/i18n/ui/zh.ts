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
};

export default ui;
