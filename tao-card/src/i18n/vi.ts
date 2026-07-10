/**
 * tao-card/src/i18n/vi.ts — Tiếng Việt.
 * ⚠️ Mỗi value là BẢN SAO NGUYÊN VĂN chuỗi đang hiển thị hôm nay.
 *    Bấm VI ⇒ giao diện GIỐNG HỆT trước khi có i18n.
 */
import type { CardUiKeys } from './en';

const t: CardUiKeys = {
  // ─── AppShell ───
  loadingPage: 'Đang tải trang...',

  // ─── Sidebar ───
  navAutoCreator: 'Auto Creator',
  navStoryToCard: 'Tạo thẻ từ truyện',
  navSettings: 'Cài đặt',
  navCardEditor: 'Card Editor',
  navLorebook: 'Lorebook',
  navRegexLab: 'Regex Lab',
  navMvuzod: 'MVUZOD',
  navEjsStudio: 'EJS Studio',
  navWiki: 'Wiki Collector',
  sbNewProject: 'Tạo project mới',
  sbConfirmDelete: 'Bạn có chắc chắn muốn xóa dự án này?',
  sbDeleteProject: 'Xóa dự án',
  sbNoProject: 'Chưa có project nào.',
  sbPressPlus: 'Nhấn + để tạo mới.',

  // ─── TopBar ───
  tbFormatV2: 'Character Card V2 (chuyển đổi)',
  tbFormatUnknown: 'Không xác định',
  tbConfirmPull: 'Bạn có muốn kéo (pull) phiên bản mới nhất từ GitHub?',
  tbConfirmReset: 'Bạn có muốn lùi (reset) về phiên bản trước đó 1 commit?',
  tbUpdateOk: 'Thành công!\n\n',
  tbUpdateErr: 'Lỗi:\n\n',
  tbNoServer: 'Không thể kết nối đến server nội bộ. Vui lòng đảm bảo bạn đang chạy Vite server.\nLỗi: ',
  tbSaving: '● Đang lưu...',
  tbSaved: '● Đã lưu {time}',
  tbNoPngData: 'Không tìm thấy dữ liệu character card trong file PNG này.',
  tbSnapshotBeforeImport: 'Trước import {name}',
  tbImportOk: 'Import thành công: {format}{warnings}',
  tbImportErr: 'Lỗi import không xác định.',
  tbExportPngErr: 'Lỗi xuất file PNG.',
  tbProjectMgmt: 'Quản lý dự án',
  tbCurrentProjectName: 'Tên dự án hiện tại',
  tbProjectNamePh: 'Nhập tên dự án...',
  tbSwitchProject: 'Chuyển dự án ({count})',
  tbCreateProject: 'Tạo dự án mới',
  tbExportFile: 'Xuất file',
  tbExportWizardDesc: 'Wizard đầy đủ: inject MVUZOD + validate + export',
  tbExportPngDesc: 'Xuất ảnh PNG kèm dữ liệu nhân vật',
  tbExportV3: 'Card V3 (đầy đủ)',
  tbExportV3Desc: 'File .json hoàn chỉnh cho SillyTavern',
  tbExportLorebookDesc: 'Chỉ xuất lorebook entries',
  tbExportCharOnly: 'Nhân vật (không lorebook)',
  tbExportCharOnlyDesc: 'Card nhẹ, không có lorebook',
  tbUndo: 'Hoàn tác (Ctrl+Z)',
  tbConfirmWipe: 'BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ DỮ LIỆU?\n\nViệc này sẽ XÓA TẤT CẢ các dự án, nhân vật, lịch sử chat và thiết lập API. Không thể khôi phục!',
  tbWipeErr: 'Lỗi khi xóa db:',
  tbWipeTitle: 'Xóa toàn bộ dữ liệu',
  tbUpdateTitle: 'Cập nhật (GitHub pull)',
  tbDowngradeTitle: 'Hạ bản 1 commit (GitHub reset)',
  tbGuideTitle: 'Hướng dẫn sử dụng',

  // ─── ErrorBoundary ───
  ebTitle: 'Đã xảy ra lỗi',
  ebUnknown: 'Lỗi không xác định',
  ebRetry: 'Thử lại',

  // ─── CopilotDrawer ───
  cdOpen: 'Mở Copilot',
  cdWelcome: 'Chào bạn! Tôi là AI Copilot.',
  cdAsk: 'Hỏi bất kỳ điều gì về card của bạn.',
  cdInputPh: 'Nhập yêu cầu...',
  cdNeedProxy: 'Cài đặt AI proxy trước khi sử dụng.',

  // ─── AICallMonitor ───
  amRunning: '{count} luồng AI đang chạy',
  amPeak: 'cao điểm {peak} · ✓ {done}',

  // ─── MVUZODPage ───
  mzTabSchemaDesc: 'Tạo/chỉnh sửa Zod schema',
  mzTabInitvarDesc: 'Giá trị biến khởi tạo',
  mzTabVarlist: 'Biến số',
  mzTabVarlistDesc: 'Tạo entry hiển thị biến',
  mzTabUpdateDesc: 'Tạo update rules + output format',
  mzTabScriptDesc: 'Preview scripts đầu ra',
  mzTabGameDesc: 'Preview giao diện game',
  mzTabPlaygroundDesc: 'Test biến + JSON Patch',
  mzNeedSchema: 'Cần tạo Schema trước',
};

export default t;
