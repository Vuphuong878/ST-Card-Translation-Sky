/**
 * src/i18n/ui/en.ts — English cho các chuỗi vốn HARDCODE trong JSX (khác bộ `locales/*`).
 * Đây là NGUỒN của kiểu `UiKeys`: vi.ts / zh.ts phải có ĐÚNG cùng tập key, thiếu là lỗi biên dịch.
 *
 * Bộ này tra theo `uiLang` TRỰC TIẾP (vi | en | zh) — KHÁC bộ `locales/*` (tra theo resolveLocale).
 * Mỗi đợt migrate một app sẽ bổ sung key vào đây. Đợt 1: vỏ Hub.
 */
const ui = {
  // ─── Hub shell ───
  langLabel: 'Language',
  hubMadeBy: '✦ Made by',

  // Rail (thanh chuyển 5 công cụ)
  railTranslate: 'Translate Card',
  railCardCreator: 'Create Card',
  railPreset: 'Create Preset',
  railModCard: 'Mod Card',
  railExtract: 'Extract Card',

  // Toolbar của iframe tool
  toolbarHintReady: 'Blank? Click Reload.',
  toolbarHintWaiting: 'Waiting for the server to start…',
  toolbarReload: 'Reload',
  toolbarNewTab: 'New tab',
  toolbarOpenNewTab: 'Open in new tab',

  // Màn chờ server (ghép: {prefix} <b>Tên tool</b> {suffix} (url)… )
  hubWaitPrefix: 'Waiting for the',
  hubWaitSuffix: 'server to start',
  hubFirstRunHint: 'The first run of start.bat may take ~30s to install dependencies.',
};

export default ui;
export type UiKeys = typeof ui;
