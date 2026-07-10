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
};

export default ui;
