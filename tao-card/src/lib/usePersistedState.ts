import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * useState tự lưu/khôi phục qua localStorage — để F5 / đóng tab / mở lại KHÔNG mất việc.
 * (Vite, không SSR nên có thể đọc localStorage ngay khi khởi tạo.)
 */
export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch { /* hỏng → dùng initial */ }
    return initial;
  });

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; } // giá trị đầu đã từ localStorage
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch { /* quota — bỏ qua */ }
  }, [key, state]);

  return [state, setState];
}
