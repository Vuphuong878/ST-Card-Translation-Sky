/**
 * src/i18n/ui/vi.ts — Tiếng Việt cho các chuỗi vốn HARDCODE trong JSX.
 *
 * ⚠️ QUY TẮC BẤT BIẾN: mỗi value ở đây phải là **BẢN SAO NGUYÊN VĂN** chuỗi đang hiển thị
 * hôm nay (không sửa chính tả, không đổi hoa/thường, giữ nguyên dấu … → ✦ và khoảng trắng).
 * Mục tiêu: bấm "VI" ⇒ giao diện GIỐNG HỆT trước khi có i18n. User cũ không bỡ ngỡ.
 */
import type { UiKeys } from './en';

const ui: UiKeys = {
  // ─── Hub shell ───
  langLabel: 'Ngôn ngữ',
  hubMadeBy: '✦ Kết hợp của',

  // Rail (thanh chuyển 5 công cụ) — nguyên văn từ flows.ts
  railTranslate: 'Dịch Card',
  railCardCreator: 'Tạo Card',
  railPreset: 'Tạo Preset',
  railModCard: 'Mod Card',
  railExtract: 'Trích Card',

  // Toolbar của iframe tool
  toolbarHintReady: 'Nếu trống → bấm Tải lại.',
  toolbarHintWaiting: 'Đang chờ server khởi động…',
  toolbarReload: 'Tải lại',
  toolbarNewTab: 'Tab mới',
  toolbarOpenNewTab: 'Mở tab mới',

  // Màn chờ server: "Đang chờ server <b>Tên</b> khởi động (url)…"
  hubWaitPrefix: 'Đang chờ server',
  hubWaitSuffix: 'khởi động',
  hubFirstRunHint: 'Lần đầu chạy start.bat có thể mất ~30s để cài đặt.',

  // ─── Nút Cập nhật (rail + modal) — nguyên văn từ HubUpdateButton ───
  updRailUpdate: 'Cập nhật',
  updRailNew: 'Có bản mới',
  updTitleCheck: 'Kiểm tra cập nhật',
  updTitleHasUpdate: 'Có {count} cập nhật mới — bấm để xem',
  updTitleError: 'Không kiểm tra được: {error}',
  updModalUpdating: 'Đang cập nhật…',
  updModalDone: 'Cập nhật xong',
  updModalHasUpdate: 'Có {count} cập nhật mới',
  updModalCheckFailed: 'Không kiểm tra được cập nhật',
  updModalLatest: 'Đã là bản mới nhất',
  updModalSub: 'Bản hiện tại: v{version} · cập nhật 1 lần cho cả 5 tool',
  updNoNewCommits: 'Không có commit mới. Bạn đang ở bản mới nhất.',
  updHelp1: 'Cách xử lý: mở thư mục cài đặt, chạy',
  updHelp2: 'một lần rồi khởi động lại. Nếu chưa từng',
  updHelp3: '(tải ZIP) thì nút cập nhật không hoạt động được.',
  updPreparing: 'Đang chuẩn bị…',
  updLater: 'Để sau',
  updNow: 'Cập nhật ngay',
  updClose: 'Đóng',
  updReload: 'Tải lại trang',
  updErrCheck: 'Không kiểm tra được cập nhật.',
  updErrApi: 'Không gọi được API kiểm tra cập nhật (server dev chưa chạy?).',
  updErrPrefix: 'Lỗi',

  // ─── App.tsx (sidebar) ───
  appCompareCards: '🔀 So Sánh Card',
  appRegexManager: '⚡ Regex Manager',
  appAiCompanion: '🔮 Trợ Lý AI',

  // ─── FileUpload ───
  fuDiscordNormalised: '🔧 Đã chuẩn hoá link Discord về ảnh gốc (cdn, bỏ webp/resize) để giữ dữ liệu thẻ',
  fuUrlError: '❌ Lỗi tải link: {msg} (có thể do CORS)',
  fuUrlPlaceholder: 'Nhập link card (JSON/PNG)...',
  fuLoad: 'Tải',
  fuUpdateOriginal: 'Cập nhật bản gốc',

  // ─── CardRenamePanel ───
  crToastRenamed: 'Đã đổi tên card',
  crButtonTitle: 'Đổi tên card (tên nhân vật / tên file)',
  crButton: 'Đổi tên',
  crCharName: 'Tên nhân vật (hiển thị trong SillyTavern)',
  crCharNamePh: 'VD: Tô Huyền',
  crCharNameHint1: 'Cập nhật cả',
  crCharNameHint2: 'và',
  crCharNameHint3: '. Field tên cũng được đánh dấu xong để không bị ghi đè khi xuất.',
  crFileName: 'Tên file khi xuất',
  crFileNameExt: '(đuôi {ext})',
  crFileNameHint: 'Chỉ đổi tên file tải về — KHÔNG ảnh hưởng tên nhân vật bên trong.',
  crCancel: 'Huỷ',
  crSave: 'Lưu',

  // ─── ActiveCallsPanel ───
  acRunning: 'Luồng đang chạy: {count}',
  acPeak: 'Cao điểm: {count} luồng',
  acCompleted: '✓ {count} call xong',
  acSecondary: '(phụ)',

  // ─── UpdateButton ───
  ubErrPrefix: 'Lỗi',
  ubUpdateTitle: 'Cập nhật ứng dụng',
  ubDowngradeTitle: 'Hạ cấp phiên bản',
  ubDowngradeConfirm: 'CẢNH BÁO NGUY HIỂM:\n\nHành động này sẽ HẠ CẤP phiên bản ứng dụng xuống 1 commit (git reset --hard HEAD~1) và XÓA SẠCH toàn bộ thay đổi chưa commit của bạn.\n\nBạn có chắc chắn muốn tiếp tục không?',
  ubDowngradeBtnTitle: 'Hạ cấp phiên bản (Trở lại 1 commit)',
  ubUpdateBtnTitle: 'Cập nhật ứng dụng (Bản mới nhất)',
  ubPreparing: 'Đang chuẩn bị thực hiện...',
  ubReload: 'Tải lại trang',

  // ─── PresetPromptViewer ───
  ppvEnabledHint: '● Bật = tự động áp dụng khi dịch',
  ppvDirty: '● Chưa lưu',
  ppvSaveFallback: 'Lưu',
  ppvTogglePromptOff: 'Tắt prompt (sẽ không áp dụng khi dịch)',
  ppvTogglePromptOn: 'Bật prompt (sẽ áp dụng khi dịch)',
  ppvEdit: 'Chỉnh sửa',
  ppvPromptName: 'Tên prompt',
  ppvContent: 'Nội dung ({count} ký tự)',
  ppvCancel: 'Hủy',
  ppvApply: 'Áp dụng',

  // ─── ExternalLinkTab ───
  eltFieldLabel: 'Dịch link ngoài',
  eltToastMissing: 'Vui lòng điền đủ GitHub Token, Repo và Tên File',
  eltToastPublished: 'Đã xuất bản lên GitHub thành công!',
  eltToastPushErr: 'Lỗi đẩy lên GitHub: ',
  eltToastNetErr: 'Lỗi mạng: ',
  eltTitle: 'Dịch Link Ngoài (Custom Code)',
  eltSubtitle: 'Dán code HTML/JS bên ngoài vào đây. Cơ chế dịch như Regex, sau đó có thể đăng thẳng lên GitHub.',
  eltSourceLabel: 'Nội dung gốc (Dán code vào đây)',
  eltCancelTranslate: 'Hủy dịch',
  eltTranslate: 'Dịch',
  eltClear: 'Xóa',
  eltErrPrefix: 'Lỗi:',
  eltResultLabel: 'Kết quả đã dịch',
  eltPublishTitle: 'Đăng lên GitHub & Tạo Link Nhúng',
  eltGuideTitle: 'Hướng dẫn lấy thông số:',
  eltGuidePat1: 'GitHub PAT:',
  eltGuidePat2: 'Lấy tại',
  eltGuidePatLink: 'Settings > Developer settings > Personal access tokens',
  eltGuidePat3: '. (Tạo Token mới và',
  eltGuidePat4: 'chọn quyền ',
  eltGuidePat5: ').',
  eltGuideRepo1: 'Repository:',
  eltGuideRepo2: 'Tên tài khoản và tên kho lưu trữ. VD: link là',
  eltGuideRepo3: 'thì điền',
  eltGuideBranch1: 'Branch:',
  eltGuideBranch2: 'Tên nhánh, thường là',
  eltGuideBranchOr: 'hoặc',
  eltGuidePeriod: '.',
  eltPatLabel: 'GitHub PAT (Quyền repo)',
  eltFileLabel: 'Tên File (VD: scripts/ui.js)',
  eltCommitLabel: 'Nội dung Commit',
  eltPublishBtn: 'Đăng File',
  eltCdnReady: 'Link CDN đã sẵn sàng!',
  eltJsTag: 'Thẻ Javascript:',
  eltCssTag: 'Thẻ CSS:',
  eltPreviewTitle: 'Xem trước giao diện HTML (Gốc & Dịch)',
  eltSampleContent: 'Nội dung mẫu',
};

export default ui;
