/* ─── Filesystem progress cache client ───
 * Persists translation progress to a JSON file in the PROJECT folder (via Vite dev-server
 * endpoints in vite.config.ts), so progress survives F5, tab close, and even switching
 * browsers — unlike browser storage which is per-browser. One file per card key.
 *
 * All calls are best-effort: if the dev server isn't running (e.g. a production build),
 * they fail silently and the app keeps working without persistence.
 */

export interface ProgressCacheEntry<T = unknown> {
  key: string;
  savedAt: number;
  data: T;
}

let _available: boolean | null = null;

/** Whether the filesystem cache endpoints are reachable (dev server running). Cached. */
export async function isFsCacheAvailable(): Promise<boolean> {
  if (_available !== null) return _available;
  try {
    const res = await fetch('/api/progress/list', { method: 'GET' });
    _available = res.ok;
  } catch {
    _available = false;
  }
  return _available;
}

export const FsCache = {
  async save(key: string, data: unknown): Promise<boolean> {
    try {
      const res = await fetch('/api/progress/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async load<T = unknown>(key: string): Promise<ProgressCacheEntry<T> | null> {
    try {
      const res = await fetch(`/api/progress/load?key=${encodeURIComponent(key)}`, { method: 'GET' });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.ok) return null;
      return { key: json.key, savedAt: json.savedAt, data: json.data as T };
    } catch {
      return null;
    }
  },

  async list(): Promise<{ key: string; savedAt: number }[]> {
    try {
      const res = await fetch('/api/progress/list', { method: 'GET' });
      if (!res.ok) return [];
      const json = await res.json();
      return json.ok ? json.items : [];
    } catch {
      return [];
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await fetch('/api/progress/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
    } catch {
      /* ignore */
    }
  },
};
