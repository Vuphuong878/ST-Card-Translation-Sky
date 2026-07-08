/**
 * Persistent state for the "AI Sinh theo Batch" run, so switching page/tab in the card
 * tool does NOT lose the in-progress generation or its logs. The run loop lives in the
 * BatchGeneratorPanel callback but reads/writes THIS store (not component state), so it
 * survives the panel unmounting on navigation; the panel just re-subscribes on remount.
 */
import { create } from 'zustand';
import type { BatchProgress } from '../lib/ai/batchGenerator';

interface BatchRunState {
  isRunning: boolean;
  isPaused: boolean;
  stopped: boolean;
  /** Hủy call AI ĐANG chạy khi bấm Dừng (không chỉ dừng giữa các đợt). Đọc .signal trong ctx. */
  abort: AbortController | null;
  progress: BatchProgress | null;
  logs: string[];

  setIsRunning: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  setStopped: (v: boolean) => void;
  setProgress: (p: BatchProgress | null) => void;
  addLog: (msg: string) => void;
  /** Clear logs + progress and arm a fresh run (isRunning stays as set by caller). */
  beginRun: () => void;
}

export const useBatchRunStore = create<BatchRunState>((set, get) => ({
  isRunning: false,
  isPaused: false,
  stopped: false,
  abort: null,
  progress: null,
  logs: [],

  setIsRunning: (v) => set({ isRunning: v }),
  setPaused: (v) => set({ isPaused: v }),
  // Dừng = vừa bật cờ (cắt vòng lặp giữa các đợt) VỪA abort (cắt call AI đang chạy tức thì).
  setStopped: (v) => { set({ stopped: v }); if (v) get().abort?.abort(new DOMException('Đã dừng', 'AbortError')); },
  setProgress: (p) => set({ progress: p }),
  addLog: (msg) => set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
  beginRun: () => set({ logs: [], progress: null, stopped: false, isPaused: false, abort: new AbortController() }),
}));
