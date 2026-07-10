/**
 * tao-card/src/i18n/en.ts — English. NGUỒN của kiểu `CardUiKeys`.
 * vi.ts / zh.ts phải có ĐÚNG cùng tập key (TypeScript ép) — thiếu là lỗi biên dịch.
 *
 * ⚠️ Danh sách CẤM đưa vào đây: xem đầu file `i18n/index.ts`.
 */
const t = {
  // ─── AppShell ───
  loadingPage: 'Loading page...',

  // ─── Sidebar ───
  navAutoCreator: 'Auto Creator',
  navStoryToCard: 'Card from a story',
  navSettings: 'Settings',
  navCardEditor: 'Card Editor',
  navLorebook: 'Lorebook',
  navRegexLab: 'Regex Lab',
  navMvuzod: 'MVUZOD',
  navEjsStudio: 'EJS Studio',
  navWiki: 'Wiki Collector',
  sbNewProject: 'Create a new project',
  sbConfirmDelete: 'Are you sure you want to delete this project?',
  sbDeleteProject: 'Delete project',
  sbNoProject: 'No project yet.',
  sbPressPlus: 'Press + to create one.',

  // ─── TopBar ───
  tbFormatV2: 'Character Card V2 (converted)',
  tbFormatUnknown: 'Unknown',
  tbConfirmPull: 'Do you want to pull the latest version from GitHub?',
  tbConfirmReset: 'Do you want to reset back one commit?',
  tbUpdateOk: 'Success!\n\n',
  tbUpdateErr: 'Error:\n\n',
  tbNoServer: 'Could not reach the local server. Make sure the Vite server is running.\nError: ',
  tbSaving: '● Saving...',
  tbSaved: '● Saved {time}',
  tbNoPngData: 'No character-card data was found in this PNG file.',
  tbSnapshotBeforeImport: 'Before importing {name}',
  tbImportOk: 'Import successful: {format}{warnings}',
  tbImportErr: 'Unknown import error.',
  tbExportPngErr: 'Error exporting the PNG file.',
  tbProjectMgmt: 'Project management',
  tbCurrentProjectName: 'Current project name',
  tbProjectNamePh: 'Enter a project name...',
  tbSwitchProject: 'Switch project ({count})',
  tbCreateProject: 'Create a new project',
  tbExportFile: 'Export file',
  tbExportWizardDesc: 'Full wizard: inject MVUZOD + validate + export',
  tbExportPngDesc: 'Export a PNG image with the character data embedded',
  tbExportV3: 'Card V3 (full)',
  tbExportV3Desc: 'A complete .json file for SillyTavern',
  tbExportLorebookDesc: 'Export the lorebook entries only',
  tbExportCharOnly: 'Character (no lorebook)',
  tbExportCharOnlyDesc: 'A light card, without the lorebook',
  tbUndo: 'Undo (Ctrl+Z)',
  tbConfirmWipe: 'ARE YOU SURE YOU WANT TO DELETE ALL DATA?\n\nThis will DELETE EVERY project, character, chat history and API setting. It cannot be undone!',
  tbWipeErr: 'Error clearing the db:',
  tbWipeTitle: 'Delete all data',
  tbUpdateTitle: 'Update (GitHub pull)',
  tbDowngradeTitle: 'Downgrade by one commit (GitHub reset)',
  tbGuideTitle: 'User guide',

  // ─── ErrorBoundary ───
  ebTitle: 'Something went wrong',
  ebUnknown: 'Unknown error',
  ebRetry: 'Try again',

  // ─── CopilotDrawer ───
  cdOpen: 'Open Copilot',
  cdWelcome: 'Hi! I am the AI Copilot.',
  cdAsk: 'Ask me anything about your card.',
  cdInputPh: 'Type a request...',
  cdNeedProxy: 'Configure the AI proxy before using this.',

  // ─── AICallMonitor ───
  amRunning: '{count} AI threads running',
  amPeak: 'peak {peak} · ✓ {done}',

  // ─── MVUZODPage ───
  mzTabSchemaDesc: 'Create/edit the Zod schema',
  mzTabInitvarDesc: 'Initial variable values',
  mzTabVarlist: 'Variables',
  mzTabVarlistDesc: 'Create the variable-display entry',
  mzTabUpdateDesc: 'Create the update rules + output format',
  mzTabScriptDesc: 'Preview the output scripts',
  mzTabGameDesc: 'Preview the game UI',
  mzTabPlaygroundDesc: 'Test variables + JSON Patch',
  mzNeedSchema: 'You need to create a Schema first',
};

export default t;
export type CardUiKeys = typeof t;
