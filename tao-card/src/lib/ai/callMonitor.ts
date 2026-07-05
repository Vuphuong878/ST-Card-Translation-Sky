/* ─── Live AI Call Monitor ───
 * Tiny pub/sub registry tracking every in-flight AI request so the UI can show, in
 * real time, how many AI calls are running (threads), which model/key each uses, and
 * how long each has been running. callAI() is the single chokepoint for all AI calls,
 * so it registers each call here on start and removes it on finish. React components
 * subscribe via useSyncExternalStore.
 */

export interface ActiveCall {
  id: string;
  model: string;
  keyLabel: string;
  label: string;
  startedAt: number;
}

type Listener = () => void;

const _active = new Map<string, ActiveCall>();
const _listeners = new Set<Listener>();
let _snapshot: ActiveCall[] = [];
let _completed = 0;
let _peakConcurrency = 0;
let _seq = 0;

function _emit() {
  _snapshot = Array.from(_active.values());
  if (_active.size > _peakConcurrency) _peakConcurrency = _active.size;
  _listeners.forEach((l) => l());
}

export const CallMonitor = {
  /** Register a call; returns its id for end(). */
  start(call: Omit<ActiveCall, 'id'>): string {
    const id = `c${++_seq}`;
    _active.set(id, { ...call, id });
    _emit();
    return id;
  },
  end(id: string) {
    if (_active.delete(id)) {
      _completed++;
      _emit();
    }
  },
  reset() {
    _completed = 0;
    _peakConcurrency = _active.size;
    _emit();
  },
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  },
  getSnapshot(): ActiveCall[] { return _snapshot; },
  getCompleted(): number { return _completed; },
  getPeakConcurrency(): number { return _peakConcurrency; },
};
