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
};

export default ui;
