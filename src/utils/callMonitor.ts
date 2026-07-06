/* ─── Live AI Call Monitor ───
 * A tiny pub/sub registry that tracks every in-flight AI request so the UI can
 * show, in real time: which model is translating which entry, how many requests
 * are running concurrently (threads), and which API key each one is using.
 *
 * callProvider() (apiClient.ts) is the single chokepoint for all AI calls, so it
 * registers each call here on start and removes it on finish. React components
 * subscribe via useSyncExternalStore.
 */

export interface ActiveCall {
  id: string;
  /** The model actually used for this call (after primary/secondary routing). */
  model: string;
  /** Provider used for this call (openai / anthropic / google / custom). */
  provider?: string;
  /** Human label for which API key is used, e.g. "Key #2". */
  keyLabel: string;
  /** What this call is translating, e.g. "lorebook[3].content" or "MVU vars 26-50". */
  label: string;
  startedAt: number;
}

type Listener = () => void;

const _active = new Map<string, ActiveCall>();
const _listeners = new Set<Listener>();
let _snapshot: ActiveCall[] = [];
let _completed = 0;
/** Peak number of concurrent in-flight calls observed this run. */
let _peakConcurrency = 0;

function _emit() {
  _snapshot = Array.from(_active.values());
  if (_active.size > _peakConcurrency) _peakConcurrency = _active.size;
  _listeners.forEach((l) => l());
}

export const CallMonitor = {
  start(call: ActiveCall) {
    _active.set(call.id, call);
    _emit();
  },
  end(id: string) {
    if (_active.delete(id)) {
      _completed++;
      _emit();
    }
  },
  /** Reset counters at the start of a translation run (active calls are left intact). */
  reset() {
    _completed = 0;
    _peakConcurrency = _active.size;
    _emit();
  },
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  },
  /** Stable snapshot for useSyncExternalStore — same reference until the next change. */
  getSnapshot(): ActiveCall[] {
    return _snapshot;
  },
  getCompleted(): number {
    return _completed;
  },
  getPeakConcurrency(): number {
    return _peakConcurrency;
  },
};
