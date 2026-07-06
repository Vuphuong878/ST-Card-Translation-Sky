/**
 * Bọc localStorage.setItem an toàn với quota/exception.
 * Nếu vượt quota (~5MB) hoặc bị chặn (private mode…), chỉ log warning
 * thay vì ném QuotaExceededError làm vỡ luồng React.
 */
export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[safeStorage] setItem failed (quota?)', key, e);
  }
}
