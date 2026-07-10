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

  // ─── Nút Cập nhật (rail + modal) ───
  updRailUpdate: 'Update',
  updRailNew: 'New version',
  updTitleCheck: 'Check for updates',
  updTitleHasUpdate: '{count} new update(s) — click to view',
  updTitleError: 'Check failed: {error}',
  updModalUpdating: 'Updating…',
  updModalDone: 'Update complete',
  updModalHasUpdate: '{count} new update(s)',
  updModalCheckFailed: 'Could not check for updates',
  updModalLatest: 'You are up to date',
  updModalSub: 'Current: v{version} · one update covers all 5 tools',
  updNoNewCommits: 'No new commits. You are on the latest version.',
  updHelp1: 'How to fix: open the install folder and run',
  updHelp2: 'once, then restart. If you never ran',
  updHelp3: '(you downloaded a ZIP), the update button cannot work.',
  updPreparing: 'Preparing…',
  updLater: 'Later',
  updNow: 'Update now',
  updClose: 'Close',
  updReload: 'Reload page',
  updErrCheck: 'Could not check for updates.',
  updErrApi: 'Could not reach the update-check API (is the dev server running?).',
  updErrPrefix: 'Error',

  // ─── App.tsx (sidebar) ───
  appCompareCards: '🔀 Compare Cards',
  appRegexManager: '⚡ Regex Manager',
  appAiCompanion: '🔮 AI Assistant',

  // ─── FileUpload ───
  fuDiscordNormalised: '🔧 Normalised the Discord link back to the original image (cdn, dropped webp/resize) so the card data survives',
  fuUrlError: '❌ Link load failed: {msg} (possibly CORS)',
  fuUrlPlaceholder: 'Paste a card link (JSON/PNG)…',
  fuLoad: 'Load',
  fuUpdateOriginal: 'Update original',

  // ─── CardRenamePanel ───
  crToastRenamed: 'Card renamed',
  crButtonTitle: 'Rename card (character name / file name)',
  crButton: 'Rename',
  crCharName: 'Character name (shown in SillyTavern)',
  crCharNamePh: 'e.g. Tô Huyền',
  crCharNameHint1: 'Updates both',
  crCharNameHint2: 'and',
  crCharNameHint3: '. The name field is also marked done so it will not be overwritten on export.',
  crFileName: 'File name on export',
  crFileNameExt: '(extension {ext})',
  crFileNameHint: 'Only changes the downloaded file name — does NOT affect the character name inside.',
  crCancel: 'Cancel',
  crSave: 'Save',

  // ─── ActiveCallsPanel ───
  acRunning: 'Running threads: {count}',
  acPeak: 'Peak: {count} threads',
  acCompleted: '✓ {count} calls done',
  acSecondary: '(extra)',

  // ─── UpdateButton ───
  ubErrPrefix: 'Error',
  ubUpdateTitle: 'Update the app',
  ubDowngradeTitle: 'Downgrade version',
  ubDowngradeConfirm: 'DANGER:\n\nThis will DOWNGRADE the app by one commit (git reset --hard HEAD~1) and DISCARD all of your uncommitted changes.\n\nAre you sure you want to continue?',
  ubDowngradeBtnTitle: 'Downgrade version (back one commit)',
  ubUpdateBtnTitle: 'Update the app (latest version)',
  ubPreparing: 'Preparing…',
  ubReload: 'Reload page',

  // ─── PresetPromptViewer ───
  ppvEnabledHint: '● Enabled = applied automatically when translating',
  ppvDirty: '● Unsaved',
  ppvSaveFallback: 'Save',
  ppvTogglePromptOff: 'Disable prompt (it will not be applied when translating)',
  ppvTogglePromptOn: 'Enable prompt (it will be applied when translating)',
  ppvEdit: 'Edit',
  ppvPromptName: 'Prompt name',
  ppvContent: 'Content ({count} characters)',
  ppvCancel: 'Cancel',
  ppvApply: 'Apply',

  // ─── ExternalLinkTab ───
  eltFieldLabel: 'Translate external link',
  eltToastMissing: 'Please fill in the GitHub Token, Repo and File name',
  eltToastPublished: 'Published to GitHub successfully!',
  eltToastPushErr: 'GitHub push failed: ',
  eltToastNetErr: 'Network error: ',
  eltTitle: 'Translate External Link (Custom Code)',
  eltSubtitle: 'Paste external HTML/JS code here. It is translated like a Regex, then it can be published straight to GitHub.',
  eltSourceLabel: 'Original content (paste the code here)',
  eltCancelTranslate: 'Cancel',
  eltTranslate: 'Translate',
  eltClear: 'Clear',
  eltErrPrefix: 'Error:',
  eltResultLabel: 'Translated result',
  eltPublishTitle: 'Publish to GitHub & create an embed link',
  eltGuideTitle: 'How to get these values:',
  eltGuidePat1: 'GitHub PAT:',
  eltGuidePat2: 'Get one at',
  eltGuidePatLink: 'Settings > Developer settings > Personal access tokens',
  eltGuidePat3: '. (Create a new token and',
  eltGuidePat4: 'grant the scope ',
  eltGuidePat5: ').',
  eltGuideRepo1: 'Repository:',
  eltGuideRepo2: 'Your account name and repository name. E.g. if the link is',
  eltGuideRepo3: 'then enter',
  eltGuideBranch1: 'Branch:',
  eltGuideBranch2: 'The branch name, usually',
  eltGuideBranchOr: 'or',
  eltGuidePeriod: '.',
  eltPatLabel: 'GitHub PAT (repo scope)',
  eltFileLabel: 'File name (e.g. scripts/ui.js)',
  eltCommitLabel: 'Commit message',
  eltPublishBtn: 'Publish file',
  eltCdnReady: 'CDN link is ready!',
  eltJsTag: 'Javascript tag:',
  eltCssTag: 'CSS tag:',
  eltPreviewTitle: 'HTML preview (original & translated)',
  eltSampleContent: 'Sample content',
};

export default ui;
export type UiKeys = typeof ui;
