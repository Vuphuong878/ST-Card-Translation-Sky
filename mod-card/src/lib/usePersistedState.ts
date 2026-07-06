'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * useState nhưng tự lưu/khôi phục qua localStorage — để F5 / đóng tab / mở lại KHÔNG mất việc.
 *
 * - Khởi tạo bằng `initial` (an toàn SSR, không lệch hydrate).
 * - Sau khi mount mới đọc localStorage (nếu có) và nạp vào; `hydrated` là useState nên hiệu ứng
 *   ghi chỉ bật LẠI ở render kế tiếp — tránh lỡ ghi đè `initial` lên giá trị vừa nạp.
 */
export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setState(JSON.parse(raw) as T);
    } catch { /* dữ liệu hỏng — dùng initial */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return; // chưa nạp xong → chưa ghi, khỏi đè initial lên giá trị đã lưu
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch { /* quota/khả dụng — bỏ qua (vd thẻ có avatar base64 quá lớn) */ }
  }, [key, state, hydrated]);

  return [state, setState];
}
